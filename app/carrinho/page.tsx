"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useCartContext } from "@/app/hooks/cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { type Order, useApi } from "@/app/hooks/use-api";
import { usePaymentManager } from "@/app/hooks/use-payment-manager";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  User,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  isValidPhone,
  normalizePhoneForBackend,
  formatPhoneNumber,
} from "@/app/lib/phoneMask";
import { OrderConfirmationTicket } from "@/app/components/OrderConfirmationTicket";
import { usePaymentPolling } from "@/app/hooks/use-payment-polling";
import { useWebhookNotification } from "@/app/hooks/use-webhook-notification";
import { type PixData } from "@/app/components/QRCodePIX";
import { StepCart } from "./components/steps/StepCart";
import { StepDelivery } from "./components/steps/StepDelivery";
import { StepPayment } from "./components/steps/StepPayment";

const ACCEPTED_CITIES = [
  "Campina Grande",
  "Queimadas",
  "Galante",
  "Puxinanã",
  "São José da Mata",
];

const SHIPPING_RULES: Record<string, { pix: number; card: number }> = {
  "campina grande": { pix: 0, card: 10 },
  queimadas: { pix: 15, card: 25 },
  galante: { pix: 15, card: 25 },
  puxinana: { pix: 15, card: 25 },
  "sao jose da mata": { pix: 15, card: 25 },
};

const normalizeString = (value: string) =>
  value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
    : "";

type PaymentStatusType = "" | "pending" | "success" | "failure";

type CheckoutStep = 1 | 2 | 3;

const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[]
): number => {
  if (!customizations || customizations.length === 0) {
    return basePrice;
  }

  const additionalCustomizations = customizations.filter(
    (c) =>
      c.customization_id?.includes(additionalId) ||
      c.customization_id?.endsWith(`_${additionalId}`)
  );

  if (additionalCustomizations.length === 0) {
    return basePrice;
  }

  const adjustmentTotal = additionalCustomizations.reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0
  );

  return basePrice + adjustmentTotal;
};

// Tipos para os componentes
interface CartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    description?: string;
    image_url?: string | null;
    customization_rules?: Array<{
      id: string;
      name: string;
      description?: string;
      image_url?: string | null;
    }>;
  };
  quantity: number;
  price: number;
  effectivePrice?: number;
  discount?: number;
  additional_ids?: string[];
  additionals?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  customizations?: CartCustomization[];
  customization_total?: number;
}

// Componente de Stepper Modernizado - Vertical em Mobile, Horizontal em Desktop
const CheckoutStepper = ({ currentStep }: { currentStep: CheckoutStep }) => {
  const steps = [
    {
      number: 1,
      label: "Carrinho",
      shortLabel: "Carrinho",
      icon: ShoppingCart,
    },
    { number: 2, label: "Entrega", shortLabel: "Entrega", icon: MapPin },
    { number: 3, label: "Pagamento", shortLabel: "Pagar", icon: CreditCard },
  ];

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* Container com fundo gradiente sutil */}
      <div className="bg-gradient-to-r from-white via-rose-50/30 to-white rounded-3xl p-4 sm:p-6 shadow-sm border border-rose-100/50 backdrop-blur-sm">
        {/* Layout horizontal para desktop */}
        <div className="hidden sm:flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step indicator */}
                <div className="flex flex-col items-center relative w-full">
                  {/* Número do step (pequeno, acima) */}
                  <span
                    className={`text-xs font-bold mb-2 transition-colors duration-300 ${
                      isActive
                        ? "text-rose-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    PASSO {step.number}
                  </span>

                  {/* Círculo com ícone */}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                      isCompleted
                        ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg scale-105"
                        : isActive
                        ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl ring-4 ring-rose-200 scale-110"
                        : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-7 w-7" />
                    ) : (
                      <Icon className="h-7 w-7" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`mt-3 text-sm font-bold transition-colors duration-300 ${
                      isActive
                        ? "text-rose-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Linha de conexão (horizontal) */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4 relative h-1 mb-4">
                    {/* Linha de fundo */}
                    <div className="absolute top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-gray-200 to-gray-200 rounded-full w-full" />
                    {/* Linha de progresso */}
                    <div
                      className={`absolute top-1/2 transform -translate-y-1/2 h-1 rounded-full transition-all duration-700 ${
                        currentStep > step.number
                          ? "w-full bg-gradient-to-r from-green-400 to-green-600"
                          : currentStep === step.number
                          ? "w-1/2 bg-gradient-to-r from-rose-400 to-rose-300"
                          : "w-0 bg-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Layout vertical para mobile */}
        <div className="flex sm:hidden flex-col gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number}>
                <div className="flex items-center gap-3">
                  {/* Círculo com ícone */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                      isCompleted
                        ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg"
                        : isActive
                        ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg ring-4 ring-rose-200 scale-105"
                        : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <span
                      className={`text-xs font-bold block transition-colors duration-300 ${
                        isActive
                          ? "text-rose-600"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      PASSO {step.number}
                    </span>
                    <span
                      className={`text-sm font-bold transition-colors duration-300 ${
                        isActive
                          ? "text-rose-600"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>

                {/* Linha de conexão vertical */}
                {index < steps.length - 1 && (
                  <div className="ml-6 mt-3 pl-3 border-l-2 border-gray-200 h-4">
                    <div
                      className={`absolute ml-1 mt-4 h-3 border-l-2 transition-all duration-700 ${
                        currentStep > step.number
                          ? "border-l-green-500"
                          : currentStep === step.number
                          ? "border-l-rose-400"
                          : "border-l-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Componentes funcionais para o layout responsivo

export default function CarrinhoPage() {
  const router = useRouter();
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const { user, isLoading, login } = useAuth();
  const {
    getCepInfo,
    getUser,
    updateUser,
    createTransparentPayment,
    getOrder,
    updateOrderMetadata,
  } = useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    createOrder,
    getMaxProductionTime,
    generateTimeSlots,
    getDeliveryDateBounds,
    isDateDisabledInCalendar,
  } = useCartContext();

  const { pendingOrder, hasPendingOrder, clearPendingOrder } =
    usePaymentManager();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [optionSelected, setOptionSelected] = useState<"delivery" | "pickup">(
    "delivery"
  );

  // Helper para formatar CPF/CNPJ visualmente
  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
  };

  const validateCustomizations = (items: CartItem[]): boolean => {
    return items.length > 0;
  };

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const { minDate, maxDate } = getDeliveryDateBounds();

      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      // ✅ Verificar se está fora do intervalo permitido
      if (normalizedDate < minDate || normalizedDate > maxDate) {
        return true;
      }

      // ✅ Usar função memoizada do hook (mais otimizada)
      return isDateDisabledInCalendar(date);
    },
    [getDeliveryDateBounds, isDateDisabledInCalendar]
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");

  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [complemento, setComplemento] = useState("");
  const [sendAnonymously, setSendAnonymously] = useState(false);
  const [isSelfRecipient, setIsSelfRecipient] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [userDocument, setUserDocument] = useState<string>("");
  const [confirmationState, setConfirmationState] = useState<
    "none" | "animating" | "confirmed"
  >("none");
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (confirmationState === "animating") {
      console.log(
        "🎬 ANIMATING STATE DETECTED - Starting 2.6s timer to CONFIRMED"
      );
      const t = setTimeout(() => {
        console.log("⏰ Timer fired - Transitioning to CONFIRMED");
        setConfirmationState("confirmed");
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [confirmationState]);

  const paymentApprovedRef = useRef(false);
  const disconnectSSERef = useRef<(() => void) | null>(null);
  const pollingStartedRef = useRef(false);
  const sseDisconnectCountRef = useRef(0);
  const pixGeneratedForOrderRef = useRef<string | null>(null);
  const updatingOrderMetadataRef = useRef(false);

  useEffect(() => {
    pollingStartedRef.current = false;
    sseDisconnectCountRef.current = 0;
  }, [currentOrderId]);

  // Cleanup quando componente desmontar ou usuário sair da página
  useEffect(() => {
    return () => {
      // Parar polling ao desmontar
      setCurrentOrderId(null);
      setPaymentStatus("");
      disconnectSSERef.current?.();
    };
  }, []);

  const mapPaymentStatus = useCallback(
    (status?: string | null): PaymentStatusType => {
      if (!status) return "";

      switch (status.toLowerCase()) {
        case "pending":
        case "in_process":
        case "pending_waiting_payment":
        case "pending_waiting_transfer":
        case "waiting_payment":
          return "pending";
        case "approved":
        case "authorized":
        case "accredited":
          return "success";
        case "rejected":
        case "cancelled":
        case "refunded":
        case "charged_back":
          return "failure";
        default:
          return "";
      }
    },
    []
  );

  const handlePaymentSuccess = useCallback(
    async (order: Order) => {
      if (paymentApprovedRef.current) {
        return;
      }
      paymentApprovedRef.current = true;

      setPaymentStatus("success");
      clearPendingOrder();
      clearCart();

      setConfirmedOrder(order);
      setConfirmationState("animating");

      toast.success("Pagamento confirmado! Pedido realizado com sucesso.");
    },
    [clearPendingOrder, clearCart]
  );

  const { startPolling } = usePaymentPolling({
    orderId: currentOrderId,
    enabled: Boolean(currentOrderId && paymentStatus === "pending"),
    maxAttempts: 3, // Apenas 3 tentativas (15 segundos total)
    intervalMs: 5000, // 5 segundos entre tentativas
    onSuccess: handlePaymentSuccess,
    onFailure: () => {
      setPaymentStatus("failure");
      setPaymentError(
        "Pagamento recusado. Por favor, verifique os dados e tente novamente."
      );
      toast.error("Pagamento recusado. Verifique os dados do pagamento.");
    },
    onTimeout: () => {
      // Parar o polling quando o timeout é atingido
      setPaymentStatus(""); // Resetar status para parar o polling
      setCurrentOrderId(null); // Limpar order ID para evitar restart do polling
      setPaymentError(
        "O tempo de espera expirou. Verifique o status do seu pedido na página 'Meus Pedidos'."
      );
      toast.warning(
        "Ainda não recebemos a confirmação do pagamento. Você pode acompanhar o status na página de pedidos.",
        { duration: 8000 }
      );
      setTimeout(() => {
        const shouldRedirect = confirm(
          "Deseja verificar o status do seu pedido agora?"
        );
        if (shouldRedirect) {
          router.push("/pedidos");
        }
      }, 2000);
    },
    onPending: () => {},
  });

  const handleTrackOrder = () => {
    router.push("/pedidos");
  };

  const sseOnConnected = useCallback(() => {
    sseDisconnectCountRef.current = 0;
  }, []);

  const sseOnDisconnected = useCallback(() => {
    sseDisconnectCountRef.current += 1;
    // Só iniciar polling fallback se ainda temos um pedido em progresso e SSE desconectou
    if (
      sseDisconnectCountRef.current >= 3 &&
      !pollingStartedRef.current &&
      currentOrderId &&
      paymentStatus === "pending"
    ) {
      pollingStartedRef.current = true;
      startPolling();
    }
  }, [startPolling, currentOrderId, paymentStatus]);

  const sseOnError = useCallback(
    (error: unknown) => {
      sseDisconnectCountRef.current += 1;
      console.error(
        `❌ SSE Error (${sseDisconnectCountRef.current}/3):`,
        error
      );
      // Só iniciar polling fallback se ainda temos um pedido em progresso
      if (
        sseDisconnectCountRef.current >= 3 &&
        !pollingStartedRef.current &&
        currentOrderId &&
        paymentStatus === "pending"
      ) {
        pollingStartedRef.current = true;
        startPolling();
      }
    },
    [startPolling, currentOrderId, paymentStatus]
  );

  const sseOnPaymentApproved = useCallback(
    async (data: unknown) => {
      console.log("✅ SSE PAYMENT APPROVED CALLBACK TRIGGERED", data);

      if (paymentApprovedRef.current) {
        console.warn("⚠️ Payment already approved, returning");
        return;
      }
      paymentApprovedRef.current = true;

      disconnectSSERef.current?.(); // Desconectar SSE após aprovação

      const orderIdFromData = (data as { orderId?: string })?.orderId;
      console.log("📦 Order ID from SSE data:", orderIdFromData);

      if (orderIdFromData) {
        try {
          console.log("🔄 Fetching full order from backend:", orderIdFromData);
          // Fetch the full order from the backend so we can show the confirmation ticket
          const freshOrder = await getOrder(orderIdFromData);

          if (freshOrder) {
            console.log("✅ Fresh order fetched:", freshOrder);
            console.log("🎬 Setting confirmation state to animating FIRST...");

            // Set confirmation state FIRST before clearing cart
            // This ensures the animation state is set before any context changes
            setConfirmedOrder(freshOrder);
            setConfirmationState("animating");

            console.log("🧹 Clearing cart and pending order...");
            // Then clear the cart and pending order
            localStorage.removeItem("pendingOrderId");
            clearPendingOrder();
            clearCart();

            setPaymentStatus("success");

            toast.success(
              "Pagamento confirmado! Pedido realizado com sucesso."
            );
            console.log("✅ Toast shown and animation triggered");
            return;
          }
        } catch (err) {
          console.warn(
            "Não foi possível buscar pedido para exibir ticket, abrindo conceito padrão.",
            err
          );
        }
      }

      // Fallback: if we couldn't fetch the order, show a simple confirmation UI with the orderId
      console.log(
        "📌 Using fallback confirmation with orderId:",
        orderIdFromData
      );

      setConfirmedOrder({
        id: orderIdFromData || null,
        total: 0,
      } as unknown as Order);
      setConfirmationState("animating");

      setPaymentStatus("success");
      localStorage.removeItem("pendingOrderId");
      clearPendingOrder();
      clearCart();

      toast.success("Pagamento confirmado! 🎉", {
        description: "Recebemos a confirmação do seu pagamento em tempo real!",
        duration: 5000,
      });
    },
    [clearCart, clearPendingOrder, getOrder]
  );

  const sseOnPaymentRejected = useCallback((data: unknown) => {
    console.error("❌ Pagamento rejeitado via webhook SSE", data);
    setPaymentStatus("failure");
    setPaymentError("Pagamento rejeitado pelo Mercado Pago");
    toast.error("Pagamento rejeitado", {
      description: "Seu pagamento não foi aprovado. Tente novamente.",
    });
  }, []);

  const sseOnPaymentPending = useCallback(() => {}, []);

  const sseOnPaymentUpdate = useCallback(() => {}, []);

  const { disconnect: disconnectSSE } = useWebhookNotification({
    orderId: currentOrderId,
    // SSE DESABILITADO TEMPORARIAMENTE - causando loop de requisições
    // Usar apenas polling como fallback
    enabled: false,
    onPaymentUpdate: sseOnPaymentUpdate,
    onPaymentApproved: sseOnPaymentApproved,
    onPaymentRejected: sseOnPaymentRejected,
    onPaymentPending: sseOnPaymentPending,
    onError: sseOnError,
    onConnected: sseOnConnected,
    onDisconnected: sseOnDisconnected,
  });

  // Set the ref after the hook is called
  useEffect(() => {
    disconnectSSERef.current = disconnectSSE;
  }, [disconnectSSE]);

  const refreshUserData = useCallback(async () => {
    if (user?.id) {
      try {
        const freshUserData = await getUser(user.id);

        if (freshUserData) {
          const storedToken = localStorage.getItem("appToken");
          if (storedToken) {
            localStorage.setItem("user", JSON.stringify(freshUserData));
            login(freshUserData, storedToken);
          }
        }
      } catch (error) {
        console.error("Erro ao recarregar dados do usuário:", error);
        toast.error(
          "Erro ao recarregar dados do usuário. Faça login novamente.",
          {
            action: { label: "Login", onClick: () => router.push("/login") },
          }
        );
      }
    }
  }, [user?.id, getUser, login, router]);

  const [hasRefreshedUser, setHasRefreshedUser] = useState(false);
  useEffect(() => {
    if (user?.id && !isLoading && !hasRefreshedUser) {
      refreshUserData().then(() => setHasRefreshedUser(true));
    }
  }, [user?.id, isLoading, hasRefreshedUser, refreshUserData]);

  useEffect(() => {
    if (isSelfRecipient) {
      setRecipientPhone(customerPhone);
    }
  }, [isSelfRecipient, customerPhone]);

  useEffect(() => {
    if (user) {
      if (user.zip_code && !zipCode) {
        setZipCode(user.zip_code.replace(/\D/g, ""));
      }

      if (user.city && !city) {
        setCity(user.city);
      }

      if (user.state && !state) {
        setState(user.state);
      }

      if (user.phone && !customerPhone) {
        setCustomerPhone(formatPhoneNumber(user.phone));
      }

      // Preencher documento se o usuário já tiver um cadastrado
      if (user.document && !userDocument) {
        setUserDocument(user.document.replace(/\D/g, ""));
      }

      if (user.address && !address) {
        const addressStr = user.address;

        if (!user.zip_code && !zipCode) {
          const cepMatch = addressStr.match(/CEP:\s*(\d{5}-?\d{3}|\d{8})/);
          if (cepMatch) {
            const extractedCep = cepMatch[1].replace(/\D/g, "");
            setZipCode(extractedCep);
          }
        }

        // Tentar extrair rua e número
        const streetMatch = addressStr.match(/^([^,]+),\s*(\d+)/);
        if (streetMatch) {
          setAddress(streetMatch[1].trim());
          setHouseNumber(streetMatch[2].trim());
        } else {
          // Se não conseguir extrair, colocar tudo no endereço
          const basicAddress = addressStr.split("-")[0]?.split(",")[0]?.trim();
          if (basicAddress) {
            setAddress(basicAddress);
          }
        }

        // Tentar extrair bairro
        const neighborhoodMatch = addressStr.match(/-\s*([^,]+),/);
        if (neighborhoodMatch) {
          setNeighborhood(neighborhoodMatch[1].trim());
        }

        // Tentar extrair cidade e estado se não foram preenchidos ainda
        if (!user.city && !user.state && !city && !state) {
          const cityStateMatch = addressStr.match(/,\s*([^/]+)\/(\w{2})/);
          if (cityStateMatch) {
            setCity(cityStateMatch[1].trim());
            setState(cityStateMatch[2].trim().toUpperCase());
          }
        }
      }
    } else if (!user) {
      // Limpar campos se não houver usuário
      setZipCode("");
      setAddress("");
      setHouseNumber("");
      setNeighborhood("");
      setCity("");
      setState("");
      setCustomerPhone("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [checkingPendingOrder, setCheckingPendingOrder] = useState(true);
  const [showPendingOrderBanner, setShowPendingOrderBanner] = useState(false);

  useEffect(() => {
    const detect = async () => {
      setCheckingPendingOrder(true);
      try {
        if (hasPendingOrder && pendingOrder) {
          setCurrentOrderId(pendingOrder.id);
          localStorage.setItem("pendingOrderId", pendingOrder.id);

          const orderPaymentMethod = pendingOrder.payment?.payment_method;
          setPaymentMethod(
            orderPaymentMethod === "pix"
              ? "pix"
              : orderPaymentMethod === "card"
              ? "card"
              : undefined
          );
          // Preencher campos do pedido (se houver)
          if (pendingOrder.delivery_address) {
            const addressStr = pendingOrder.delivery_address;
            const isPickupAddress = addressStr.includes("Retirada na Loja");

            if (!isPickupAddress) {
              // Tentar extrair rua e número corretamente
              const streetMatch = addressStr.match(/^([^,]+),\s*(\d+)/);
              if (streetMatch) {
                setAddress(streetMatch[1].trim());
                setHouseNumber(streetMatch[2].trim());
              } else {
                // Fallback: tentar pegar apenas a primeira parte antes da vírgula
                const parts = addressStr.split(",");
                if (parts.length > 0) {
                  setAddress(parts[0].trim());
                } else {
                  setAddress(addressStr);
                }
              }
              // Tentar extrair número se não foi pego pelo regex acima
              if (!streetMatch) {
                const numMatch = addressStr.match(/\b(\d{1,4}[A-Za-z\-]*)\b/);
                if (numMatch) setHouseNumber(numMatch[1]);
              }
            } else {
              // Se for retirada, não preencher endereço
              setAddress("");
              setHouseNumber("");
            }
          }
          if (typeof pendingOrder.complement === "string") {
            setComplemento(pendingOrder.complement || "");
          }
          if (typeof pendingOrder.send_anonymously === "boolean") {
            setSendAnonymously(Boolean(pendingOrder.send_anonymously));
          }
          if (pendingOrder.recipient_phone) {
            // Format: stored as +55XXXXXXXXXXX or 55xxxxxxxxx or only digits
            const digits = pendingOrder.recipient_phone.replace(/\D/g, "");
            // Save without country code (UI expects local number)
            const localNumber = digits.startsWith("55")
              ? digits.substring(2)
              : digits;
            setRecipientPhone(localNumber);
          }
          if (pendingOrder.delivery_city) {
            setCity(pendingOrder.delivery_city);
          }
          if (pendingOrder.delivery_state) {
            setState((pendingOrder.delivery_state || "").toUpperCase());
          }
          if (pendingOrder.delivery_date) {
            try {
              const dt = new Date(pendingOrder.delivery_date);
              if (!isNaN(Number(dt))) {
                setSelectedDate(
                  new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
                );
                const hh = String(dt.getHours()).padStart(2, "0");
                const mm = String(dt.getMinutes()).padStart(2, "0");
                setSelectedTime(`${hh}:${mm}`);
              }
            } catch {
              // ignore invalid date
            }
          }

          if (pendingOrder.user?.phone) {
            const userPhoneDigits = pendingOrder.user.phone.replace(/\D/g, "");
            const localNumber = userPhoneDigits.startsWith("55")
              ? userPhoneDigits.substring(2)
              : userPhoneDigits;
            setCustomerPhone(localNumber);
          }

          if (pendingOrder.user?.zip_code) {
            setZipCode(pendingOrder.user.zip_code.replace(/\D/g, ""));
          }

          // Mostrar banner visível para pedido pendente com pagamento PENDING
          if (pendingOrder.payment?.status === "PENDING") {
            setShowPendingOrderBanner(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            // Para outros status, apenas preencher dados sem notificação invasiva
            setShowPendingOrderBanner(false);
          }
        }
      } catch {
      } finally {
        setCheckingPendingOrder(false);
      }
    };

    detect();
  }, [hasPendingOrder, pendingOrder]);

  // Se não houver pedido pendente, desconectar o SSE e limpar pendingOrderId local
  useEffect(() => {
    if (!hasPendingOrder) {
      try {
        disconnectSSE?.();
        localStorage.removeItem("pendingOrderId");
        setCurrentOrderId(null);
      } catch {
        /* ignore */
      }
    }
  }, [hasPendingOrder, disconnectSSE]);

  const cartItems = useMemo(
    () => (Array.isArray(cart?.items) ? cart.items : []),
    [cart?.items]
  );

  const cartTotal = cart?.total || 0;

  const acceptedCities = useMemo(() => ACCEPTED_CITIES, []);
  const normalizedCity = useMemo(() => normalizeString(city), [city]);
  const normalizedState = useMemo(() => normalizeString(state), [state]);
  const shippingRule = useMemo(
    () => (normalizedCity ? SHIPPING_RULES[normalizedCity] : undefined),
    [normalizedCity]
  );
  const isAddressServed = useMemo(
    () => Boolean(shippingRule) && normalizedState === "pb",
    [shippingRule, normalizedState]
  );
  const shippingCost = useMemo(() => {
    if (!paymentMethod) return null;

    // Pickup: Frete Grátis
    if (optionSelected === "pickup") {
      return 0;
    }

    // Delivery: Validar endereço e aplicar regras
    if (!isAddressServed || !shippingRule) {
      return null;
    }
    return shippingRule[paymentMethod];
  }, [paymentMethod, isAddressServed, shippingRule, optionSelected]);

  // Desconto de Retirada (apenas PIX)
  const pickupDiscount = useMemo(() => {
    if (optionSelected === "pickup" && paymentMethod === "pix") {
      return 10.0;
    }
    return 0;
  }, [optionSelected, paymentMethod]);

  const grandTotal = useMemo(
    () => Math.max(0, cartTotal + (shippingCost ?? 0) - pickupDiscount),
    [cartTotal, shippingCost, pickupDiscount]
  );

  const discountAmount = useMemo(() => {
    const originalTotal = cartItems.reduce((sum, item) => {
      const baseTotal = (item.effectivePrice ?? item.price) * item.quantity;
      const additionalsTotal =
        item.additionals?.reduce(
          (a, add) =>
            getAdditionalFinalPrice(add.id, add.price, item.customizations) *
            item.quantity,
          0
        ) || 0;
      return sum + baseTotal + additionalsTotal;
    }, 0);
    return originalTotal - cartTotal;
  }, [cartItems, cartTotal]);

  const generatePixPayment = useCallback(async () => {
    if (
      paymentMethod === "pix" &&
      currentOrderId &&
      !pixData &&
      !isProcessing &&
      !isGeneratingPix &&
      currentStep === 3 &&
      pixGeneratedForOrderRef.current !== currentOrderId
    ) {
      setIsProcessing(true);
      setIsGeneratingPix(true);

      setPaymentError(null);

      try {
        if (!user) {
          router.push("/login");
          return;
        }

        const payload = {
          orderId: currentOrderId,
          paymentMethodId: "pix" as const,
          payerEmail: user.email || "",
          payerName: user.name || "",
          payerDocument: userDocument || "00000000000",
          payerDocumentType: "CPF" as const,
        };

        const paymentResponse = await createTransparentPayment(payload);

        if (!paymentResponse?.success) {
          throw new Error(
            paymentResponse?.message || "Erro ao gerar pagamento PIX"
          );
        }

        const responseData =
          paymentResponse.data || paymentResponse.point_of_interaction;

        if (!responseData?.qr_code) {
          console.error(
            "[v0] ❌ Resposta inesperada do pagamento PIX:",
            paymentResponse
          );
          throw new Error("Resposta inválida do servidor");
        }

        const rawStatus =
          paymentResponse.status || responseData.status || "pending";
        const normalizedStatus = mapPaymentStatus(rawStatus) || "pending";

        setPixData({
          qr_code: responseData.qr_code,
          qr_code_base64: responseData.qr_code_base64 || "",
          ticket_url: responseData.ticket_url || "",
          amount:
            Number(
              responseData.amount ??
                responseData.transaction_amount ??
                cartTotal + (shippingCost ?? 0)
            ) || cartTotal + (shippingCost ?? 0),
          expires_at:
            responseData.expires_at ||
            responseData.expiration_date ||
            responseData.expiration_time ||
            new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          payment_id:
            responseData.payment_id ||
            paymentResponse.paymentId ||
            currentOrderId,
          mercado_pago_id:
            responseData.mercado_pago_id || paymentResponse.mercadoPagoId || "",
          status: rawStatus,
          status_detail:
            responseData.status_detail || paymentResponse.status_detail || "",
          payer_info:
            responseData.payer_info ||
            ({
              id: "",
              email: user.email || "",
              first_name: user.name || "",
            } as PixData["payer_info"]),
        });

        setPaymentStatus(normalizedStatus);
        pixGeneratedForOrderRef.current = currentOrderId;

        toast.success("QR Code PIX gerado! Escaneie para pagar.");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        setPaymentError(errorMessage);
        toast.error(`Erro ao gerar PIX: ${errorMessage}`);
      } finally {
        setIsProcessing(false);
        setIsGeneratingPix(false);
      }
    } else {
    }
  }, [
    paymentMethod,
    currentOrderId,
    pixData,
    isProcessing,
    isGeneratingPix,
    currentStep,
    createTransparentPayment,
    user,
    userDocument,
    cartTotal,
    shippingCost,
    mapPaymentStatus,
    router,
  ]);

  useEffect(() => {
    if (paymentMethod === "pix" && currentStep === 3) {
      generatePixPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, currentStep]);

  const addressWarning = useMemo(() => {
    if (!city.trim()) return null;
    if (state.trim() && normalizedState !== "pb") {
      return "Atendemos apenas endereços na Paraíba (PB).";
    }
    if (!shippingRule) {
      return `Ainda não entregamos em ${city.trim()}. Cidades atendidas: ${acceptedCities.join(
        ", "
      )} - PB.`;
    }
    return null;
  }, [city, state, normalizedState, shippingRule, acceptedCities]);

  useEffect(() => {
    if (!isAddressServed && paymentMethod) {
      setPaymentMethod(undefined);
    }
  }, [isAddressServed, paymentMethod]);

  // Handler para editar customizações - redireciona para a página do produto
  const handleEditCustomizations = useCallback(
    (item: CartItem) => {
      router.push(`/produto/${item.product_id}`);
    },
    [router]
  );

  const handleCepSearch = async (cep: string) => {
    if (!cep || cep.length !== 8) {
      return;
    }

    setIsLoadingCep(true);
    try {
      const cepData = await getCepInfo(cep);
      setAddress(cepData.address);
      setNeighborhood(cepData.neighborhood);
      setCity(cepData.city);
      setState(cepData.state);
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setAddress("");
      setNeighborhood("");
      setCity("");
      setState("");
      toast.error(
        "Erro ao buscar informações do CEP. Verifique se o CEP está correto."
      );
    } finally {
      setIsLoadingCep(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rose-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando seu carrinho...</p>
        </div>
      </div>
    );
  }

  if (checkingPendingOrder) {
    return (
      <div className="min-h-screen bg-background  flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 text-rose-600 animate-spin" />
          <p className="text-sm text-gray-700 mt-3">
            Verificando pedido pendente...
          </p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Faça login para continuar</h2>
          <Button asChild className="mt-6 bg-rose-600 hover:bg-rose-700">
            <Link href="/login">Fazer Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Função para traduzir erros do Mercado Pago para mensagens amigáveis
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFriendlyPaymentError = (statusDetail: string): string => {
    const errorMap: Record<string, string> = {
      cc_rejected_bad_filled_card_number:
        "Número do cartão inválido. Verifique e tente novamente.",
      cc_rejected_bad_filled_date:
        "Data de validade inválida. Verifique e tente novamente.",
      cc_rejected_bad_filled_other:
        "Dados do cartão incorretos. Verifique e tente novamente.",
      cc_rejected_bad_filled_security_code:
        "Código de segurança (CVV) incorreto. Verifique e tente novamente.",
      cc_rejected_blacklist: "Cartão não autorizado. Tente outro cartão.",
      cc_rejected_call_for_authorize:
        "Operadora solicita autorização. Entre em contato com seu banco.",
      cc_rejected_card_disabled:
        "Cartão desabilitado. Entre em contato com seu banco.",
      cc_rejected_card_error: "Erro no cartão. Tente novamente ou use outro.",
      cc_rejected_duplicated_payment:
        "Pagamento duplicado. Aguarde alguns minutos.",
      cc_rejected_high_risk:
        "Pagamento recusado por segurança. Tente outro cartão.",
      cc_rejected_insufficient_amount:
        "Saldo insuficiente. Verifique seu limite.",
      cc_rejected_invalid_installments:
        "Número de parcelas inválido. Escolha outra opção.",
      cc_rejected_max_attempts:
        "Limite de tentativas excedido. Aguarde alguns minutos.",
      cc_rejected_other_reason:
        "Pagamento recusado pelo banco. Tente outro cartão.",
      pending_contingency: "Pagamento em processamento. Aguarde confirmação.",
      pending_review_manual: "Pagamento em análise. Aguarde confirmação.",
    };

    return (
      errorMap[statusDetail] ||
      "Pagamento recusado. Verifique os dados e tente novamente."
    );
  };

  const canProceedToStep2 = cartItems.length > 0;

  const canProceedToStep3 = (() => {
    // Validações comuns
    const commonValid =
      customerPhone.trim() !== "" &&
      isValidPhone(customerPhone) &&
      userDocument.trim().length >= 11 &&
      selectedDate !== undefined &&
      selectedTime !== "" &&
      validateCustomizations(cartItems);

    if (optionSelected === "pickup") {
      // Para pickup não precisamos validar endereço detalhado, só os contatos
      return commonValid;
    } else {
      // Para delivery precisamos de endereço completo e served
      return (
        commonValid &&
        recipientPhone.trim() !== "" &&
        isValidPhone(recipientPhone) &&
        zipCode.trim().length === 8 &&
        address.trim() !== "" &&
        houseNumber.trim() !== "" &&
        city.trim() !== "" &&
        state.trim() !== "" &&
        isAddressServed
      );
    }
  })();

  const handleNextStep = async () => {
    // Evitar múltiplas chamadas simultâneas
    if (isProcessing) {
      console.warn("Requisição em progresso, ignorando clique duplicado");
      return;
    }

    let finalDeliveryDate: Date | null = null;
    if (selectedDate && selectedTime) {
      try {
        const parsedDate = new Date(selectedTime);
        if (!isNaN(parsedDate.getTime())) {
          finalDeliveryDate = parsedDate;
        } else {
          const [hours, minutes] = selectedTime.split(":").map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            finalDeliveryDate = new Date(selectedDate);
            finalDeliveryDate.setHours(hours, minutes, 0, 0);
          }
        }
      } catch {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          finalDeliveryDate = new Date(selectedDate);
          finalDeliveryDate.setHours(hours, minutes, 0, 0);
        }
      }
    }
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2 && canProceedToStep3) {
      if (user?.id) {
        try {
          const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          await updateUser(user.id, {
            zip_code: zipCode,
            address: fullAddress,
            city,
            state,
            phone: customerPhone.replace(/\D/g, ""),
            document: userDocument.replace(/\D/g, "") || undefined,
          });

          toast.success("Dados salvos com sucesso!");
        } catch (error) {
          console.error("Erro ao salvar dados do usuário:", error);
          toast.warning(
            "Não foi possível salvar seus dados, mas você pode continuar."
          );
        }
      }

      if (!currentOrderId && !hasPendingOrder) {
        if (optionSelected === "delivery" && !recipientPhone.trim()) {
          toast.error("Por favor, informe o número do destinatário");
          return;
        }
        if (optionSelected === "delivery" && !isValidPhone(recipientPhone)) {
          toast.error(
            "Por favor, informe um número de telefone válido para o destinatário"
          );
          return;
        }

        setIsProcessing(true);
        try {
          // Se "A combinar" for selecionado (23:59), enviar null para backend
          let finalDateForBackend = finalDeliveryDate;
          if (selectedTime === "23:59") {
            finalDateForBackend = null;
          }

          const isPickup = optionSelected === "pickup";
          const deliveryAddress = isPickup
            ? "Retirada na Loja - R. Dr. Raif Ramalho, 350 - Jardim Tavares, Campina Grande - PB, 58402-025"
            : `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          const createdOrder = await createOrder(
            user.id,
            deliveryAddress,
            finalDateForBackend || undefined,
            {
              shippingCost: shippingCost || 0,
              paymentMethod: "pix",
              grandTotal: grandTotal, // Usar grandTotal calculado com desconto
              deliveryCity: isPickup ? "Campina Grande" : city,
              deliveryState: isPickup ? "PB" : state,
              recipientPhone: normalizePhoneForBackend(recipientPhone),
              sendAnonymously,
              complement: complemento,
              deliveryMethod: optionSelected as "delivery" | "pickup",
              discount: pickupDiscount,
            }
          );

          const createdOrderId = (() => {
            if (createdOrder && typeof createdOrder === "object") {
              if ("id" in createdOrder && createdOrder.id) {
                return String(createdOrder.id);
              }
              if (
                "order" in createdOrder &&
                (createdOrder as { order?: { id?: string } }).order?.id
              ) {
                return String(
                  (createdOrder as { order?: { id?: string } }).order?.id
                );
              }
            }
            return "";
          })();

          if (!createdOrderId) {
            throw new Error("Não foi possível identificar o pedido gerado.");
          }

          localStorage.setItem("pendingOrderId", createdOrderId);
          setCurrentOrderId(createdOrderId);

          toast.success("Pedido criado! Selecione a forma de pagamento.");
        } catch (error) {
          console.error("Erro ao criar pedido:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          toast.error(`Erro ao criar pedido: ${errorMessage}`);
          setIsProcessing(false);
          return;
        } finally {
          setIsProcessing(false);
        }
      }

      if (currentOrderId) {
        // Evitar múltiplas chamadas simultâneas a updateOrderMetadata
        if (updatingOrderMetadataRef.current) {
          console.warn(
            "Já há uma atualização em progresso, ignorando requisição duplicada"
          );
          return;
        }

        updatingOrderMetadataRef.current = true;
        try {
          const isPickup = optionSelected === "pickup";
          const deliveryAddress = isPickup
            ? "Retirada na Loja - R. Dr. Raif Ramalho, 350 - Jardim Tavares, Campina Grande - PB, 58402-025"
            : `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          // Se "A combinar" (23:59), tratar como null
          let finalDateForBackend = finalDeliveryDate;
          if (selectedTime === "23:59") {
            finalDateForBackend = null;
          }

          await updateOrderMetadata(currentOrderId, {
            delivery_address: deliveryAddress,
            delivery_city: isPickup ? "Campina Grande" : city,
            delivery_state: isPickup ? "PB" : state,
            recipient_phone: normalizePhoneForBackend(recipientPhone),
            delivery_date: finalDateForBackend?.toISOString() || null, // Allow null explicitamente
            send_anonymously: sendAnonymously,
            complement: complemento,
            delivery_method: optionSelected as "delivery" | "pickup",
          });
        } catch (err) {
          console.error("Erro ao atualizar metadata do pedido pendente:", err);
          // Se o pedido foi cancelado/removido no backend, remover local pending state e desconectar SSE
          try {
            localStorage.removeItem("pendingOrderId");
            setCurrentOrderId(null);
            disconnectSSE?.();
          } catch {
            // Ignore cleanup errors
          }
        } finally {
          updatingOrderMetadataRef.current = false;
        }
      }

      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const OrderSummary = () => {
    const maxProdTime = getMaxProductionTime();

    return (
      <Card className="bg-white border-0 shadow-xl rounded-3xl sticky top-6 overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-6 text-white">
          <h3 className="text-2xl font-bold">Resumo do Pedido</h3>
          <p className="text-rose-100 text-sm mt-2">
            {currentStep === 1
              ? "Revise seus itens antes de prosseguir"
              : currentStep === 2
              ? "Informe os dados de entrega"
              : "Escolha a forma de pagamento"}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Itens do carrinho com melhor layout */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Itens ({cart.items.length})
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {cart.items.map((item, idx) => (
                <div
                  key={idx}
                  className="text-sm text-gray-700 flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="truncate pr-2 flex items-center gap-2">
                    <span className="font-semibold text-rose-600 min-w-fit">
                      {item.quantity}x
                    </span>
                    <span className="text-gray-700">{item.product.name}</span>
                  </span>
                  <span className="font-semibold text-gray-900 whitespace-nowrap ml-2">
                    R${" "}
                    {(
                      (item.effectivePrice ?? item.price) * item.quantity
                    ).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-gray-200" />

          {/* Cálculos com melhor visualização */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="font-bold text-gray-900">
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-700 font-medium">💚 Desconto</span>
                <span className="text-green-700 font-bold">
                  - R$ {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {pickupDiscount > 0 && (
              <div className="flex justify-between text-sm p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-purple-700 font-medium">
                  🏷️ Desconto Retirada
                </span>
                <span className="text-purple-700 font-bold">
                  - R$ {pickupDiscount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Entrega</span>
              <span className="font-bold text-gray-900">
                {shippingCost === null
                  ? "--"
                  : shippingCost === 0
                  ? "GRÁTIS 🎁"
                  : `R$ ${shippingCost.toFixed(2)}`}
              </span>
            </div>

            {maxProdTime > 0 && (
              <div className="flex justify-between text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                <span className="text-amber-900 font-medium flex items-center gap-2">
                  ⏱️ Produção
                </span>
                <span className="font-bold text-amber-700">
                  ~{maxProdTime}h
                </span>
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className="flex justify-between text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="text-blue-900 font-medium flex items-center gap-2">
                  📅 Entrega
                </span>
                <span className="font-bold text-blue-900">
                  {selectedDate.toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          {/* Total com destaque */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold text-lg">Total</span>
              <span className="text-3xl font-bold text-rose-600">
                R$ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {currentStep < 3 && (
            <Button
              onClick={handleNextStep}
              disabled={
                isProcessing ||
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3) ||
                (currentStep === 3 && !paymentMethod)
              }
              className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white py-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : currentStep === 1 ? (
                "Checkout →"
              ) : currentStep === 2 ? (
                "Ir para Pagamento →"
              ) : (
                "Finalizar Pedido →"
              )}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      {confirmationState === "confirmed" && confirmedOrder ? (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <motion.div
            key="confirmation-ticket"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45 }}
          >
            <OrderConfirmationTicket
              order={confirmedOrder}
              onTrackOrder={handleTrackOrder}
            />
          </motion.div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* Banner para Pedido Pendente com Pagamento */}
            {showPendingOrderBanner &&
              pendingOrder?.payment?.status === "PENDING" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 lg:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg shadow-sm"
                >
                  <div className="flex items-start gap-3 lg:gap-4 justify-between flex-col lg:flex-row lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-amber-600 flex-shrink-0">
                        <svg
                          className="w-5 h-5 lg:w-6 lg:h-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-amber-900 text-sm lg:text-base">
                          Pagamento Pendente
                        </h3>
                        <p className="text-amber-700 text-xs lg:text-sm mt-1">
                          Você tem um pedido com pagamento pendente. Complete o
                          pagamento para finalizar sua compra.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setCurrentStep(3);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs lg:text-sm px-4 py-2 lg:px-6 lg:py-2 whitespace-nowrap flex-shrink-0"
                    >
                      Ir para Pagamento
                    </Button>
                  </div>
                </motion.div>
              )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                <CheckoutStepper currentStep={currentStep} />

                <AnimatePresence mode="wait">
                  {/* Etapa 1: Revisão do Carrinho */}
                  {/* Etapa 1: Revisão do Carrinho */}
                  {currentStep === 1 && (
                    <StepCart
                      cartItems={cartItems}
                      updateQuantity={updateQuantity}
                      removeFromCart={removeFromCart}
                      isProcessing={isProcessing}
                      onEditCustomizations={handleEditCustomizations}
                    />
                  )}

                  {currentStep === 2 && (
                    <StepDelivery
                      optionSelected={optionSelected}
                      setOptionSelected={setOptionSelected}
                      zipCode={zipCode}
                      setZipCode={setZipCode}
                      handleCepSearch={handleCepSearch}
                      isLoadingCep={isLoadingCep}
                      address={address}
                      setAddress={setAddress}
                      houseNumber={houseNumber}
                      setHouseNumber={setHouseNumber}
                      setNeighborhood={setNeighborhood}
                      neighborhood={neighborhood}
                      city={city}
                      setCity={setCity}
                      state={state}
                      setState={setState}
                      complemento={complemento}
                      setComplemento={setComplemento}
                      customerPhone={customerPhone}
                      setCustomerPhone={setCustomerPhone}
                      userDocument={userDocument}
                      setUserDocument={setUserDocument}
                      recipientPhone={recipientPhone}
                      setRecipientPhone={setRecipientPhone}
                      sendAnonymously={sendAnonymously}
                      setSendAnonymously={setSendAnonymously}
                      isSelfRecipient={isSelfRecipient}
                      setIsSelfRecipient={setIsSelfRecipient}
                      addressWarning={addressWarning}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      selectedTime={selectedTime}
                      setSelectedTime={setSelectedTime}
                      isDateDisabled={isDateDisabled}
                      timeSlots={generateTimeSlots(selectedDate || new Date())}
                      isGeneratingSlots={isProcessing}
                      calendarOpen={calendarOpen}
                      setCalendarOpen={setCalendarOpen}
                      formatDocument={formatDocument}
                      isValidPhone={isValidPhone}
                      formatPhoneNumber={formatPhoneNumber}
                    />
                  )}

                  {currentStep === 3 && (
                    <StepPayment
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      grandTotal={grandTotal}
                      pixData={pixData}
                      currentOrderId={currentOrderId}
                      isGeneratingPix={isGeneratingPix}
                      isProcessing={isProcessing}
                      paymentError={paymentError}
                      handlePlaceOrder={handleNextStep}
                      handleCardSubmit={generatePixPayment}
                      payerEmail={user?.email || ""}
                      payerName={user?.name || ""}
                    />
                  )}
                </AnimatePresence>
              </div>

              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="sticky top-6 focus-within:z-10"
                >
                  <OrderSummary />
                </motion.div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* -- Overlay with check animation -- */}
      <AnimatePresence>
        {confirmationState === "animating" && (
          <motion.div
            className="fixed inset-0 bg-white z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.svg
                width="140"
                height="140"
                viewBox="0 0 120 120"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                className="mx-auto"
              >
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9 }}
                />
                <motion.path
                  d="M35 62 L52 78 L88 40"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.55, delay: 0.9 }}
                />
              </motion.svg>

              <motion.p
                className="mt-6 text-2xl font-semibold text-gray-900"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
              >
                Pagamento confirmado!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
