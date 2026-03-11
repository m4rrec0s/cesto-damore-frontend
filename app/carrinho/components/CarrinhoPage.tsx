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
import { User, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { StepCart } from "@/app/carrinho/components/steps/StepCart";
import { StepDelivery } from "@/app/carrinho/components/steps/StepDelivery";
import { StepPayment } from "@/app/carrinho/components/steps/StepPayment";
import {
  CustomizationsReview,
  validateCustomizations,
} from "./CustomizationsReview";
import type { CustomizationInput } from "@/app/types/customization";
import { normalizeCustomizationData } from "@/app/lib/customization-serialization";

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

const STEP_PATH_MAP = {
  1: "/carrinho/itens",
  2: "/carrinho/entrega",
  3: "/carrinho/pagamento",
} as const;

const CHECKOUT_FORM_STORAGE_KEY = "checkout_form_state_v1";
const CHECKOUT_PAYMENT_TOAST_ID = "checkout-payment-status";
const CHECKOUT_FLOW_TOAST_ID = "checkout-flow-status";
const CHECKOUT_PIX_TOAST_ID = "checkout-pix-status";

const getStepFromPath = (pathname: string): 1 | 2 | 3 => {
  if (pathname.startsWith("/carrinho/pagamento")) return 3;
  if (pathname.startsWith("/carrinho/entrega")) return 2;
  return 1;
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
type CheckoutValidationIssue = {
  reason: string;
  itemName?: string;
  productName?: string;
};
type CustomizationsValidationStatus = {
  valid: boolean;
  source: "backend" | "local";
  recommendations?: string[];
  missingRequired?: CheckoutValidationIssue[];
  invalidCustomizations?: CheckoutValidationIssue[];
};
type PersistedCheckoutForm = {
  optionSelected?: "delivery" | "pickup";
  zipCode?: string;
  address?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  customerPhone?: string;
  recipientPhone?: string;
  complemento?: string;
  sendAnonymously?: boolean;
  isSelfRecipient?: boolean;
  userDocument?: string;
  selectedDate?: string | null;
  selectedTime?: string;
  paymentMethod?: "pix" | "card";
};

const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[],
): number => {
  if (!customizations || customizations.length === 0) {
    return basePrice;
  }

  const additionalCustomizations = customizations.filter(
    (c) =>
      (c.componentId && c.componentId === additionalId) ||
      (!c.componentId &&
        (c.customization_id?.includes(additionalId) ||
          c.customization_id?.endsWith(`_${additionalId}`))),
  );

  if (additionalCustomizations.length === 0) {
    return basePrice;
  }

  const adjustmentTotal = additionalCustomizations.reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0,
  );

  return basePrice + adjustmentTotal;
};

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

export default function CarrinhoPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const { user, isLoading, login } = useAuth();
  const {
    getCepInfo,
    getUser,
    updateUser,
    createTransparentPayment,
    getOrder,
    updateOrderMetadata,
    getPaymentStatus,
  } = useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    updateCustomizations,
    clearCart,
    createOrder,
    getMaxProductionTime,
    generateTimeSlots,
    getDeliveryDateBounds,
    isDateDisabledInCalendar,
  } = useCartContext();

  const {
    pendingOrder,
    hasPendingOrder,
    clearPendingOrder,
    checkPendingOrder,
  } = usePaymentManager();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [optionSelected, setOptionSelected] = useState<"delivery" | "pickup">(
    "delivery",
  );

  useEffect(() => {
    setCurrentStep(getStepFromPath(pathname));
  }, [pathname]);

  const updateStepUrl = useCallback(
    (step: 1 | 2 | 3) => {
      router.push(STEP_PATH_MAP[step], { scroll: false });
      setCurrentStep(step);
    },
    [router],
  );

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
  };

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const { minDate, maxDate } = getDeliveryDateBounds();

      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      if (normalizedDate < minDate || normalizedDate > maxDate) {
        return true;
      }

      return isDateDisabledInCalendar(date);
    },
    [getDeliveryDateBounds, isDateDisabledInCalendar],
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

  const showPaymentToast = useCallback(
    (
      type: "success" | "error" | "info" | "warning",
      message: string,
      options?: Parameters<(typeof toast)["success"]>[1],
    ) => {
      toast[type](message, { id: CHECKOUT_PAYMENT_TOAST_ID, ...options });
    },
    [],
  );

  const showFlowToast = useCallback(
    (
      type: "success" | "error" | "info" | "warning",
      message: string,
      options?: Parameters<(typeof toast)["success"]>[1],
    ) => {
      toast[type](message, { id: CHECKOUT_FLOW_TOAST_ID, ...options });
    },
    [],
  );

  const showPixToast = useCallback(
    (
      type: "success" | "error" | "info" | "warning",
      message: string,
      options?: Parameters<(typeof toast)["success"]>[1],
    ) => {
      toast[type](message, { id: CHECKOUT_PIX_TOAST_ID, ...options });
    },
    [],
  );

  useEffect(() => {
    if (confirmationState === "animating") {
      const t = setTimeout(() => {
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
  const creatingOrderRef = useRef(false);
  const lastRealtimeStatusRef = useRef<string | null>(null);
  const restoredFormRef = useRef(false);

  useEffect(() => {
    pollingStartedRef.current = false;
    sseDisconnectCountRef.current = 0;
  }, [currentOrderId]);

  useEffect(() => {
    if (typeof window === "undefined" || restoredFormRef.current) return;

    restoredFormRef.current = true;
    try {
      const raw = localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
      if (!raw) return;
      const persisted = JSON.parse(raw) as PersistedCheckoutForm;

      if (persisted.optionSelected) setOptionSelected(persisted.optionSelected);
      if (persisted.zipCode) setZipCode(persisted.zipCode);
      if (persisted.address) setAddress(persisted.address);
      if (persisted.houseNumber) setHouseNumber(persisted.houseNumber);
      if (persisted.neighborhood) setNeighborhood(persisted.neighborhood);
      if (persisted.city) setCity(persisted.city);
      if (persisted.state) setState(persisted.state);
      if (persisted.customerPhone) setCustomerPhone(persisted.customerPhone);
      if (persisted.recipientPhone) setRecipientPhone(persisted.recipientPhone);
      if (persisted.complemento) setComplemento(persisted.complemento);
      if (typeof persisted.sendAnonymously === "boolean") {
        setSendAnonymously(persisted.sendAnonymously);
      }
      if (typeof persisted.isSelfRecipient === "boolean") {
        setIsSelfRecipient(persisted.isSelfRecipient);
      }
      if (persisted.userDocument) setUserDocument(persisted.userDocument);
      if (persisted.selectedDate) {
        const parsedDate = new Date(persisted.selectedDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
      }
      if (persisted.selectedTime) setSelectedTime(persisted.selectedTime);
      if (persisted.paymentMethod) setPaymentMethod(persisted.paymentMethod);
    } catch (error) {
      console.error("Erro ao restaurar estado do checkout:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedCheckoutForm = {
      optionSelected,
      zipCode,
      address,
      houseNumber,
      neighborhood,
      city,
      state,
      customerPhone,
      recipientPhone,
      complemento,
      sendAnonymously,
      isSelfRecipient,
      userDocument,
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
      selectedTime,
      paymentMethod,
    };

    localStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(payload));
  }, [
    optionSelected,
    zipCode,
    address,
    houseNumber,
    neighborhood,
    city,
    state,
    customerPhone,
    recipientPhone,
    complemento,
    sendAnonymously,
    isSelfRecipient,
    userDocument,
    selectedDate,
    selectedTime,
    paymentMethod,
  ]);

  useEffect(() => {
    return () => {
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
    [],
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
      localStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);

      setConfirmedOrder(order);
      setConfirmationState("animating");

      showPaymentToast(
        "success",
        "Pagamento confirmado! Pedido realizado com sucesso.",
      );
    },
    [clearPendingOrder, clearCart, showPaymentToast],
  );

  const { startPolling } = usePaymentPolling({
    orderId: currentOrderId,
    enabled: Boolean(currentOrderId && paymentStatus === "pending"),
    maxAttempts: 3,
    intervalMs: 5000,
    onSuccess: handlePaymentSuccess,
    onFailure: () => {
      setPaymentStatus("failure");
      setPaymentError(
        "Pagamento recusado. Por favor, verifique os dados e tente novamente.",
      );
      showPaymentToast(
        "error",
        "Pagamento recusado. Verifique os dados do pagamento.",
      );
    },
    onTimeout: () => {
      setPaymentStatus("");
      setCurrentOrderId(null);
      setPaymentError(
        "O tempo de espera expirou. Verifique o status do seu pedido na página 'Meus Pedidos'.",
      );
      showPaymentToast(
        "warning",
        "Ainda não recebemos a confirmação do pagamento. Você pode acompanhar o status na página de pedidos.",
        { duration: 8000 },
      );
      setTimeout(() => {
        const shouldRedirect = confirm(
          "Deseja verificar o status do seu pedido agora?",
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
        error,
      );

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
    [startPolling, currentOrderId, paymentStatus],
  );

  const sseOnPaymentApproved = useCallback(
    async (data: unknown) => {
      if (paymentApprovedRef.current) {
        console.warn("⚠️ Payment already approved, returning");
        return;
      }
      paymentApprovedRef.current = true;

      disconnectSSERef.current?.();

      const orderIdFromData = (data as { orderId?: string })?.orderId;

      if (orderIdFromData) {
        try {
          const freshOrder = await getOrder(orderIdFromData);

          if (freshOrder) {
            setConfirmedOrder(freshOrder);
            setConfirmationState("animating");

            localStorage.removeItem("pendingOrderId");
            localStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);
            clearPendingOrder();
            clearCart();

            setPaymentStatus("success");

            showPaymentToast(
              "success",
              "Pagamento confirmado! Pedido realizado com sucesso.",
            );
            return;
          }
        } catch (err) {
          console.warn(
            "Não foi possível buscar pedido para exibir ticket, abrindo conceito padrão.",
            err,
          );
        }
      }

      setConfirmedOrder({
        id: orderIdFromData || null,
        total: 0,
      } as unknown as Order);
      setConfirmationState("animating");

      setPaymentStatus("success");
      localStorage.removeItem("pendingOrderId");
      localStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);
      clearPendingOrder();
      clearCart();

      showPaymentToast("success", "Pagamento confirmado! 🎉", {
        description: "Recebemos a confirmação do seu pagamento em tempo real!",
        duration: 5000,
      });
    },
    [clearCart, clearPendingOrder, getOrder, showPaymentToast],
  );

  const sseOnPaymentRejected = useCallback(
    (data: unknown) => {
      console.error("❌ Pagamento rejeitado via webhook SSE", data);
      setPaymentStatus("failure");
      setPaymentError("Pagamento rejeitado pelo Mercado Pago");
      showPaymentToast("error", "Pagamento rejeitado", {
        description: "Seu pagamento não foi aprovado. Tente novamente.",
      });
    },
    [showPaymentToast],
  );

  const sseOnPaymentPending = useCallback(
    (data: unknown) => {
      const status = (
        (data as { status?: string })?.status || ""
      ).toLowerCase();
      if (status && lastRealtimeStatusRef.current !== status) {
        lastRealtimeStatusRef.current = status;
        showPaymentToast("info", "Pagamento em processamento", {
          description:
            status === "in_process"
              ? "Seu pagamento foi recebido e está em análise."
              : "Aguardando confirmação do pagamento.",
        });
      }
      setPaymentStatus("pending");
    },
    [showPaymentToast],
  );

  const sseOnPaymentUpdate = useCallback(
    (data: unknown) => {
      const statusRaw = (
        (data as { status?: string })?.status || ""
      ).toLowerCase();
      if (!statusRaw) return;
      const normalized = mapPaymentStatus(statusRaw);

      if (normalized === "pending") {
        setPaymentStatus("pending");
      } else if (normalized === "failure") {
        setPaymentStatus("failure");
      }
    },
    [mapPaymentStatus],
  );

  const { disconnect: disconnectSSE } = useWebhookNotification({
    orderId: currentOrderId,
    enabled: Boolean(currentOrderId),
    onPaymentUpdate: sseOnPaymentUpdate,
    onPaymentApproved: sseOnPaymentApproved,
    onPaymentRejected: sseOnPaymentRejected,
    onPaymentPending: sseOnPaymentPending,
    onError: sseOnError,
    onConnected: sseOnConnected,
    onDisconnected: sseOnDisconnected,
  });

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
            login(freshUserData, storedToken);
          }
        }
      } catch (error) {
        console.error("Erro ao recarregar dados do usuário:", error);
        toast.error(
          "Erro ao recarregar dados do usuário. Faça login novamente.",
          {
            action: { label: "Login", onClick: () => router.push("/login") },
          },
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

        const streetMatch = addressStr.match(/^([^,]+),\s*(\d+)/);
        if (streetMatch) {
          setAddress(streetMatch[1].trim());
          setHouseNumber(streetMatch[2].trim());
        } else {
          const basicAddress = addressStr.split("-")[0]?.split(",")[0]?.trim();
          if (basicAddress) {
            setAddress(basicAddress);
          }
        }

        const neighborhoodMatch = addressStr.match(/-\s*([^,]+),/);
        if (neighborhoodMatch) {
          setNeighborhood(neighborhoodMatch[1].trim());
        }

        if (!user.city && !user.state && !city && !state) {
          const cityStateMatch = addressStr.match(/,\s*([^/]+)\/(\w{2})/);
          if (cityStateMatch) {
            setCity(cityStateMatch[1].trim());
            setState(cityStateMatch[2].trim().toUpperCase());
          }
        }
      }
    } else if (!user) {
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
  const [customizationsValidationStatus, setCustomizationsValidationStatus] =
    useState<CustomizationsValidationStatus | null>(null);

  useEffect(() => {
    const detect = async () => {
      setCheckingPendingOrder(true);
      try {
        if (hasPendingOrder && pendingOrder) {
          setCurrentOrderId(pendingOrder.id);

          const orderPaymentMethod = pendingOrder.payment?.payment_method;
          setPaymentMethod(
            orderPaymentMethod === "pix"
              ? "pix"
              : orderPaymentMethod === "card"
                ? "card"
                : undefined,
          );

          if (pendingOrder.delivery_address) {
            const addressStr = pendingOrder.delivery_address;
            const isPickupAddress = addressStr.includes("Retirada na Loja");

            if (!isPickupAddress) {
              const streetMatch = addressStr.match(/^([^,]+),\s*(\d+)/);
              if (streetMatch) {
                setAddress(streetMatch[1].trim());
                setHouseNumber(streetMatch[2].trim());
              } else {
                const parts = addressStr.split(",");
                if (parts.length > 0) {
                  setAddress(parts[0].trim());
                } else {
                  setAddress(addressStr);
                }
              }

              if (!streetMatch) {
                const numMatch = addressStr.match(/\b(\d{1,4}[A-Za-z\-]*)\b/);
                if (numMatch) setHouseNumber(numMatch[1]);
              }
            } else {
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
            const digits = pendingOrder.recipient_phone.replace(/\D/g, "");

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
                  new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()),
                );
                const hh = String(dt.getHours()).padStart(2, "0");
                const mm = String(dt.getMinutes()).padStart(2, "0");
                setSelectedTime(`${hh}:${mm}`);
              }
            } catch {}
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

          if (pendingOrder.payment?.status === "PENDING") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      } catch {
      } finally {
        setCheckingPendingOrder(false);
      }
    };

    detect();
  }, [hasPendingOrder, pendingOrder]);

  useEffect(() => {
    if (!hasPendingOrder) {
      try {
        disconnectSSE?.();
        localStorage.removeItem("pendingOrderId");
        setCurrentOrderId(null);
      } catch (error) {
        console.error("Erro ao limpar pedido pendente:", error);
      }
    }
  }, [hasPendingOrder, disconnectSSE]);

  const cartItems = useMemo(
    () => (Array.isArray(cart?.items) ? cart.items : []),
    [cart?.items],
  );
  const localCustomizationsValid = useMemo(
    () => validateCustomizations(cartItems),
    [cartItems],
  );
  const customizationsValid = useMemo(() => {
    const hasBackendValidation =
      Boolean(currentOrderId) &&
      customizationsValidationStatus?.source === "backend";

    if (hasBackendValidation) {
      return Boolean(customizationsValidationStatus?.valid);
    }

    return localCustomizationsValid;
  }, [
    currentOrderId,
    customizationsValidationStatus?.source,
    customizationsValidationStatus?.valid,
    localCustomizationsValid,
  ]);

  const cartTotal = cart?.total || 0;
  const isPendingPaymentExpired = useMemo(() => {
    if (!pendingOrder?.payment) return false;
    if (pendingOrder.payment.status !== "PENDING") return false;

    const paymentMethod = (
      pendingOrder.payment.payment_method || ""
    ).toLowerCase();
    // Expiration rule is specific for PIX QRCode.
    if (paymentMethod && paymentMethod !== "pix") return false;

    const createdAt =
      pendingOrder.payment.created_at ||
      pendingOrder.payment.updated_at ||
      pendingOrder.created_at;

    if (!createdAt) return false;

    const createdMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdMs)) return false;

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return Date.now() - createdMs > TWENTY_FOUR_HOURS_MS;
  }, [pendingOrder]);
  const roundMoney = useCallback((value: number) => {
    return Math.round(value * 100) / 100;
  }, []);
  const getOrderGrandTotal = useCallback(
    (order: Order | null): number | null => {
      if (!order) return null;
      if (typeof order.grand_total === "number") {
        return roundMoney(order.grand_total);
      }
      if (typeof order.total === "number") {
        const shipping =
          typeof order.shipping_price === "number" ? order.shipping_price : 0;
        const discount =
          typeof order.discount === "number" ? order.discount : 0;
        return roundMoney(order.total + shipping - discount);
      }
      return null;
    },
    [roundMoney],
  );
  const isDeliveryScheduleValid = useMemo(() => {
    if (!selectedDate || !selectedTime) return false;
    if (isDateDisabled(selectedDate)) return false;

    const slots = generateTimeSlots(selectedDate);
    if (!slots || slots.length === 0) return false;

    if (slots.some((slot) => slot.value === selectedTime)) {
      return true;
    }

    // Backward compatibility for legacy values in HH:mm format.
    const selectedParsed = new Date(selectedTime);
    const selectedFromLegacy = !Number.isNaN(selectedParsed.getTime())
      ? selectedParsed
      : (() => {
          const [h, m] = selectedTime.split(":").map(Number);
          if (Number.isNaN(h) || Number.isNaN(m)) return null;
          const legacyDate = new Date(selectedDate);
          legacyDate.setHours(h, m, 0, 0);
          return legacyDate;
        })();

    if (!selectedFromLegacy) return false;

    return slots.some((slot) => {
      const slotDate = new Date(slot.value);
      return (
        !Number.isNaN(slotDate.getTime()) &&
        slotDate.getHours() === selectedFromLegacy.getHours() &&
        slotDate.getMinutes() === selectedFromLegacy.getMinutes()
      );
    });
  }, [selectedDate, selectedTime, isDateDisabled, generateTimeSlots]);

  const acceptedCities = useMemo(() => ACCEPTED_CITIES, []);
  const normalizedCity = useMemo(() => normalizeString(city), [city]);
  const normalizedState = useMemo(() => normalizeString(state), [state]);
  const shippingRule = useMemo(
    () => (normalizedCity ? SHIPPING_RULES[normalizedCity] : undefined),
    [normalizedCity],
  );
  const isAddressServed = useMemo(
    () => Boolean(shippingRule) && normalizedState === "pb",
    [shippingRule, normalizedState],
  );
  const shippingCost = useMemo(() => {
    if (!paymentMethod) return null;

    if (optionSelected === "pickup") {
      return 0;
    }

    if (!isAddressServed || !shippingRule) {
      return null;
    }

    if (paymentMethod === "pix" && normalizedCity === "campina grande") {
      return 0;
    }

    return shippingRule[paymentMethod];
  }, [
    paymentMethod,
    isAddressServed,
    shippingRule,
    optionSelected,
    normalizedCity,
  ]);

  const pickupDiscount = useMemo(() => {
    if (optionSelected === "pickup" && paymentMethod === "pix") {
      return 10.0;
    }
    return 0;
  }, [optionSelected, paymentMethod]);

  const grandTotal = useMemo(
    () => Math.max(0, cartTotal + (shippingCost ?? 0) - pickupDiscount),
    [cartTotal, shippingCost, pickupDiscount],
  );

  const verifyOrderTotals = useCallback(
    async (options?: {
      refreshMetadata?: boolean;
      paymentMethod?: "pix" | "card";
    }): Promise<boolean> => {
      if (!currentOrderId) return false;
      try {
        if (options?.refreshMetadata && typeof shippingCost === "number") {
          const discountToApply =
            options.paymentMethod === "card" ? 0 : pickupDiscount;
          await updateOrderMetadata(currentOrderId, {
            payment_method: options.paymentMethod || undefined,
            shipping_price: shippingCost,
            discount: discountToApply,
            delivery_method: optionSelected as "delivery" | "pickup",
          });
        }

        const latestOrder = await getOrder(currentOrderId);
        const orderTotal = getOrderGrandTotal(latestOrder);
        if (orderTotal === null) {
          toast.error(
            "Não foi possível validar o valor atual do pedido. Tente novamente.",
          );
          return false;
        }

        const expectedTotal = roundMoney(grandTotal);
        if (Math.abs(orderTotal - expectedTotal) > 0.01) {
          toast.error(
            "O valor do pedido foi atualizado. Revise o carrinho antes de pagar.",
          );
          return false;
        }
        return true;
      } catch (err) {
        console.error("Erro ao validar total do pedido:", err);
        toast.error(
          "Não foi possível validar o valor do pedido. Tente novamente.",
        );
        return false;
      }
    },
    [
      currentOrderId,
      getOrder,
      getOrderGrandTotal,
      grandTotal,
      roundMoney,
      updateOrderMetadata,
      shippingCost,
      pickupDiscount,
      optionSelected,
    ],
  );

  const discountAmount = useMemo(() => {
    const originalTotal = cartItems.reduce((sum, item) => {
      const baseTotal = (item.effectivePrice ?? item.price) * item.quantity;
      const additionalsTotal =
        item.additionals?.reduce(
          (a, add) =>
            getAdditionalFinalPrice(add.id, add.price, item.customizations) *
            item.quantity,
          0,
        ) || 0;
      return sum + baseTotal + additionalsTotal;
    }, 0);
    return originalTotal - cartTotal;
  }, [cartItems, cartTotal]);

  const productSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + (item.effectivePrice ?? item.price) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const additionalsSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum +
          (item.additionals?.reduce(
            (a, add) =>
              a +
              getAdditionalFinalPrice(add.id, add.price, item.customizations) *
                item.quantity,
            0,
          ) || 0),
        0,
      ),
    [cartItems],
  );

  const buildPixDataFromStatus = useCallback(
    (
      statusData: Record<string, unknown>,
      fallbackAmount: number,
    ): PixData | null => {
      const poi = statusData.point_of_interaction as
        | Record<string, unknown>
        | undefined;
      const data = (poi?.transaction_data ||
        poi?.transactionData ||
        statusData.transaction_data ||
        statusData.data ||
        statusData) as Record<string, unknown>;

      const getString = (
        source: Record<string, unknown> | undefined,
        key: string,
      ): string | undefined => {
        if (!source) return undefined;
        const value = source[key];
        return typeof value === "string" ? value : undefined;
      };
      const getNumber = (
        source: Record<string, unknown> | undefined,
        key: string,
      ): number | undefined => {
        if (!source) return undefined;
        const value = source[key];
        return typeof value === "number" ? value : undefined;
      };

      const qrCode =
        getString(data, "qr_code") ||
        getString(data, "qrCode") ||
        getString(data, "qr_code_plain");
      const qrBase64 =
        getString(data, "qr_code_base64") || getString(data, "qrCodeBase64");
      const ticketUrl =
        getString(data, "ticket_url") || getString(data, "ticketUrl");

      if (!qrCode && !qrBase64) return null;

      const rawStatus =
        getString(statusData, "status") ||
        getString(data, "status") ||
        pendingOrder?.payment?.status ||
        "pending";

      const amount = Number(
        getNumber(data, "amount") ??
          getNumber(data, "transaction_amount") ??
          getNumber(statusData, "transaction_amount") ??
          getNumber(statusData, "amount") ??
          fallbackAmount,
      );

      return {
        qr_code: qrCode || "",
        qr_code_base64: qrBase64 || "",
        ticket_url: ticketUrl || "",
        amount: Number.isFinite(amount) ? amount : fallbackAmount,
        expires_at:
          getString(data, "expires_at") ||
          getString(data, "expiration_date") ||
          getString(data, "expiration_time") ||
          getString(statusData, "date_of_expiration") ||
          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_id:
          getString(statusData, "id") ||
          getString(data, "payment_id") ||
          pendingOrder?.payment?.id ||
          currentOrderId ||
          "",
        mercado_pago_id:
          getString(statusData, "mercado_pago_id") ||
          getString(statusData, "mercadoPagoId") ||
          pendingOrder?.payment?.mercado_pago_id ||
          "",
        status: rawStatus,
        status_detail:
          getString(data, "status_detail") ||
          getString(statusData, "status_detail") ||
          "",
        payer_info:
          (data?.payer_info as PixData["payer_info"]) ||
          ({
            id: "",
            email: user?.email || "",
            first_name: user?.name || "",
          } as PixData["payer_info"]),
      };
    },
    [
      pendingOrder?.payment?.id,
      pendingOrder?.payment?.mercado_pago_id,
      pendingOrder?.payment?.status,
      currentOrderId,
      user?.email,
      user?.name,
    ],
  );

  const tryReuseExistingPixPayment = useCallback(async (): Promise<boolean> => {
    if (!pendingOrder?.payment?.id && !pendingOrder?.payment?.mercado_pago_id) {
      return false;
    }
    if (pendingOrder?.payment?.status !== "PENDING") return false;
    if (isPendingPaymentExpired) return false;

    try {
      const paymentId =
        pendingOrder?.payment?.id || pendingOrder?.payment?.mercado_pago_id;
      if (!paymentId) return false;
      const statusResponse = await getPaymentStatus(paymentId);
      const pix = buildPixDataFromStatus(
        (statusResponse || {}) as Record<string, unknown>,
        cartTotal + (shippingCost ?? 0),
      );
      if (!pix) return false;

      setPixData(pix);
      setPaymentStatus(mapPaymentStatus(pix.status) || "pending");
      pixGeneratedForOrderRef.current = currentOrderId;
      return true;
    } catch (err) {
      console.error("Erro ao recuperar pagamento PIX pendente:", err);
      return false;
    }
  }, [
    pendingOrder?.payment?.id,
    pendingOrder?.payment?.mercado_pago_id,
    pendingOrder?.payment?.status,
    isPendingPaymentExpired,
    getPaymentStatus,
    buildPixDataFromStatus,
    cartTotal,
    shippingCost,
    mapPaymentStatus,
    currentOrderId,
  ]);

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
      if (!customizationsValid) {
        toast.error(
          "Complete as personalizações pendentes antes de gerar o pagamento.",
        );
        return;
      }
      if (!isDeliveryScheduleValid) {
        toast.error(
          "A data/horário de entrega não está mais disponível. Ajuste o agendamento.",
        );
        updateStepUrl(2);
        return;
      }
      const hasPendingPix =
        pendingOrder?.payment?.status === "PENDING" && !isPendingPaymentExpired;
      if (hasPendingPix) {
        const totalsOk = await verifyOrderTotals();
        if (!totalsOk) return;
        const reused = await tryReuseExistingPixPayment();
        if (!reused) {
          toast.error(
            "Não foi possível recuperar o PIX pendente. Tente novamente mais tarde.",
          );
        }
        return;
      }

      const totalsOk = await verifyOrderTotals({
        refreshMetadata: true,
        paymentMethod: "pix",
      });
      if (!totalsOk) return;

      setIsProcessing(true);
      setIsGeneratingPix(true);

      setPaymentError(null);

      try {
        if (!user) {
          // Save cart data before redirecting to login
          const { guestCartService } =
            await import("@/app/services/guestCartService");

          const itemsToSave = cart.items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            additionals:
              item.additional_ids || item.additionals?.map((add) => add.id),
            additionalColors: item.additional_colors,
            customizations: item.customizations,
          }));

          if (itemsToSave.length > 0) {
            guestCartService.saveGuestCart(itemsToSave);
          }

          router.push("/login");
          return;
        }

        if (typeof shippingCost === "number") {
          await updateOrderMetadata(currentOrderId, {
            payment_method: "pix",
            shipping_price: shippingCost,
            discount: pickupDiscount,
            delivery_method: optionSelected as "delivery" | "pickup",
          });
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
            paymentResponse?.message || "Erro ao gerar pagamento PIX",
          );
        }

        const responseData =
          paymentResponse.data || paymentResponse.point_of_interaction;

        if (!responseData?.qr_code) {
          console.error(
            "[v0] ❌ Resposta inesperada do pagamento PIX:",
            paymentResponse,
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
                cartTotal + (shippingCost ?? 0),
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

        showPixToast("success", "QR Code PIX gerado! Escaneie para pagar.");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        setPaymentError(errorMessage);
        showPixToast("error", `Erro ao gerar PIX: ${errorMessage}`);
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
    updateOrderMetadata,
    user,
    userDocument,
    cartTotal,
    shippingCost,
    pickupDiscount,
    mapPaymentStatus,
    router,
    optionSelected,
    cart,
    customizationsValid,
    isDeliveryScheduleValid,
    updateStepUrl,
    verifyOrderTotals,
    tryReuseExistingPixPayment,
    pendingOrder?.payment?.status,
    isPendingPaymentExpired,
    showPixToast,
  ]);

  useEffect(() => {
    if (paymentMethod === "pix" && currentStep === 3) {
      generatePixPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, currentStep]);

  useEffect(() => {
    if (!isPendingPaymentExpired) return;
    setPixData(null);
    setPaymentStatus("");
    pixGeneratedForOrderRef.current = null;
  }, [isPendingPaymentExpired]);

  const handleCardSubmit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (formData: any) => {
      if (!currentOrderId) {
        toast.error("Pedido não encontrado. Tente recarregar a página.");
        return;
      }
      if (!customizationsValid) {
        toast.error(
          "Complete as personalizações pendentes antes de prosseguir com o pagamento.",
        );
        return;
      }
      if (!isDeliveryScheduleValid) {
        toast.error(
          "A data/horário de entrega não está mais disponível. Ajuste o agendamento.",
        );
        updateStepUrl(2);
        return;
      }

      const totalsOk = await verifyOrderTotals({
        refreshMetadata: true,
        paymentMethod: "card",
      });
      if (!totalsOk) return;

      setIsProcessing(true);
      setPaymentError(null);

      try {
        if (!user) {
          router.push("/login");
          return;
        }

        if (typeof shippingCost === "number") {
          await updateOrderMetadata(currentOrderId, {
            payment_method: "card",
            shipping_price: shippingCost,
            discount: 0,
            delivery_method: optionSelected as "delivery" | "pickup",
          });
        }

        const payload = {
          orderId: currentOrderId,
          payerEmail: user.email || "",
          payerName: user.name || "",
          payerDocument:
            formData.payer?.identification?.number ||
            userDocument ||
            "00000000000",
          payerDocumentType:
            (formData.payer?.identification?.type as "CPF" | "CNPJ") || "CPF",
          paymentMethodId: "credit_card" as const,
          cardToken: formData.token,
          installments: formData.installments,
          issuer_id: String(formData.issuer_id || ""),
          payment_method_id: formData.payment_method_id,
          cardholderName: user.name || "",
        };

        console.log("💾 Payload de pagamento:", {
          orderId: payload.orderId,
          paymentMethodId: payload.paymentMethodId,
          hasCardToken: !!payload.cardToken,
          cardToken: payload.cardToken
            ? payload.cardToken.substring(0, 30) + "..."
            : "⚠️ AUSENTE",
          payment_method_id: payload.payment_method_id,
          issuer_id: payload.issuer_id,
          installments: payload.installments,
        });

        const paymentResponse = await createTransparentPayment(payload);

        if (!paymentResponse?.success) {
          throw new Error(
            paymentResponse?.message ||
              "Erro ao processar pagamento com cartão",
          );
        }

        const rawStatus = paymentResponse.status || "pending";
        const normalizedStatus = mapPaymentStatus(rawStatus) || "pending";

        if (normalizedStatus === "success") {
          const freshOrder = await getOrder(currentOrderId);

          if (freshOrder) {
            await handlePaymentSuccess(freshOrder);
          } else {
            paymentApprovedRef.current = true;
            setPaymentStatus("success");
            clearPendingOrder();
            clearCart();
            localStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);
            showPaymentToast("success", "Pagamento aprovado!");
          }
        } else if (normalizedStatus === "failure") {
          throw new Error(paymentResponse.message || "Pagamento recusado");
        } else {
          setPaymentStatus("pending");
          showPaymentToast(
            "info",
            "Pagamento em análise ou aguardando confirmação.",
          );
        }
      } catch (error) {
        console.error("❌ Erro no pagamento com cartão:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";

        let friendlyError = `Pagamento recusado: ${errorMessage}`;
        if (
          errorMessage.includes("Token") ||
          errorMessage.includes("token") ||
          errorMessage.includes("2006") ||
          errorMessage.includes("Card Token")
        ) {
          friendlyError =
            "⚠️ Erro ao processar cartão. Verifique seus dados ou tente novamente. " +
            "Se o problema persistir, use PIX para pagar.";
        } else if (
          errorMessage.includes("Chave") ||
          errorMessage.includes("chave") ||
          errorMessage.includes("key")
        ) {
          friendlyError =
            "⚠️ Erro na configuração do pagamento. Contate o suporte.";
        }

        setPaymentError(friendlyError);
        showPaymentToast("error", friendlyError);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentOrderId,
      user,
      userDocument,
      createTransparentPayment,
      updateOrderMetadata,
      shippingCost,
      optionSelected,
      clearCart,
      clearPendingOrder,
      router,
      mapPaymentStatus,
      customizationsValid,
      isDeliveryScheduleValid,
      updateStepUrl,
      verifyOrderTotals,
      getOrder,
      handlePaymentSuccess,
      showPaymentToast,
    ],
  );

  const addressWarning = useMemo(() => {
    if (!city.trim()) return null;
    if (state.trim() && normalizedState !== "pb") {
      return "Atendemos apenas endereços na Paraíba (PB).";
    }
    if (!shippingRule) {
      return `Ainda não entregamos em ${city.trim()}. Cidades atendidas: ${acceptedCities.join(
        ", ",
      )} - PB.`;
    }
    return null;
  }, [city, state, normalizedState, shippingRule, acceptedCities]);

  useEffect(() => {
    if (!isAddressServed && paymentMethod) {
      setPaymentMethod(undefined);
    }
  }, [isAddressServed, paymentMethod]);

  const handleEditCustomizations = useCallback(
    (item: CartItem) => {
      router.push(`/produto/${item.product_id}`);
    },
    [router],
  );

  const handleCustomizationUpdate = useCallback(
    (
      productId: string,
      customizations: CustomizationInput[],
      componentId?: string,
    ) => {
      const currentItems = Array.isArray(cart?.items) ? cart.items : [];
      const targetItem =
        currentItems.find((item) => {
          if (item.product_id !== productId) return false;
          if (!componentId) return true;

          return (
            item.additional_ids?.includes(componentId) ||
            item.customizations?.some(
              (customization) => customization.componentId === componentId,
            )
          );
        }) || currentItems.find((item) => item.product_id === productId);

      if (!targetItem) {
        return;
      }

      const buildCustomizationId = (
        input: CustomizationInput,
        title: string,
      ) => {
        if (input.ruleId || input.customizationRuleId) {
          const baseId = input.ruleId || input.customizationRuleId || title;
          return componentId ? `${baseId}:${componentId}` : baseId;
        }

        return componentId ? `${title}:${componentId}` : title;
      };

      const mappedCustomizations: CartCustomization[] = customizations.map(
        (customization) => {
          const rawData =
            (customization.data as Record<string, unknown> | undefined) || {};
          const data = normalizeCustomizationData(rawData);
          const title =
            (data._customizationName as string) ||
            customization.customizationType;

          if (customization.customizationType === "TEXT") {
            const text = Object.entries(data)
              .filter(([key, value]) => key !== "_customizationName" && !!value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            return {
              customization_id: buildCustomizationId(customization, title),
              componentId,
              title,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: Number(data._priceAdjustment || 0),
              text,
              data,
            };
          }

          if (customization.customizationType === "MULTIPLE_CHOICE") {
            return {
              customization_id: buildCustomizationId(customization, title),
              componentId,
              title,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: Number(data._priceAdjustment || 0),
              selected_option:
                (data.id as string) || (data.selected_option as string),
              selected_option_label:
                (data.label as string) ||
                (data.selected_option_label as string) ||
                undefined,
              label_selected:
                (data.label as string) ||
                (data.selected_option_label as string) ||
                undefined,
              data,
            };
          }

          if (customization.customizationType === "IMAGES") {
            return {
              customization_id: buildCustomizationId(customization, title),
              componentId,
              title,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: Number(data._priceAdjustment || 0),
              photos: Array.isArray(data.photos)
                ? (data.photos as CartCustomization["photos"])
                : [],
              data: normalizeCustomizationData({
                ...data,
                count: Array.isArray(data.photos) ? data.photos.length : 0,
              }),
            };
          }

          return {
            customization_id: buildCustomizationId(customization, title),
            componentId,
            title,
            customization_type: "DYNAMIC_LAYOUT",
            is_required: false,
            price_adjustment: Number(data._priceAdjustment || 0),
            selected_item_label:
              (data.selected_item_label as string) ||
              (data.label_selected as string) ||
              title,
            label_selected:
              (data.label_selected as string) ||
              (data.selected_item_label as string) ||
              title,
            text:
              (data.text as string) ||
              (data.previewUrl as string) ||
              ((data.final_artwork as { preview_url?: string } | undefined)
                ?.preview_url as string | undefined),
            additional_time: Number(data.additional_time || 0),
            fabricState: data.fabricState as string | undefined,
            data: normalizeCustomizationData(data),
          };
        },
      );

      updateCustomizations(
        productId,
        targetItem.customizations || [],
        mappedCustomizations,
        targetItem.additional_ids,
        targetItem.additional_colors,
        false,
      );
    },
    [cart?.items, updateCustomizations],
  );

  const handleCustomizationSaved = useCallback(async () => {
    await checkPendingOrder();
  }, [checkPendingOrder]);

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
        "Erro ao buscar informações do CEP. Verifique se o CEP está correto.",
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

  const canProceedToStep2 = cartItems.length > 0 && customizationsValid;

  const canProceedToStep3 = (() => {
    const commonValid =
      customerPhone.trim() !== "" &&
      isValidPhone(customerPhone) &&
      userDocument.trim().length >= 11 &&
      selectedDate !== undefined &&
      selectedTime !== "" &&
      isDeliveryScheduleValid &&
      customizationsValid;

    if (optionSelected === "pickup") {
      return commonValid;
    } else {
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
      updateStepUrl(2);
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

          showFlowToast("success", "Dados salvos com sucesso!");
        } catch (error) {
          console.error("Erro ao salvar dados do usuário:", error);
          showFlowToast(
            "warning",
            "Não foi possível salvar seus dados, mas você pode continuar.",
          );
        }
      }

      if (!currentOrderId && !hasPendingOrder) {
        if (creatingOrderRef.current) {
          console.warn(
            "⚠️ Criação de pedido já em progresso, ignorando requisição duplicada",
          );
          return;
        }

        if (optionSelected === "delivery" && !recipientPhone.trim()) {
          showFlowToast("error", "Por favor, informe o número do destinatário");
          return;
        }
        if (optionSelected === "delivery" && !isValidPhone(recipientPhone)) {
          showFlowToast(
            "error",
            "Por favor, informe um número de telefone válido para o destinatário",
          );
          return;
        }

        setIsProcessing(true);
        creatingOrderRef.current = true;
        try {
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
              grandTotal: grandTotal,
              deliveryCity: isPickup ? "Campina Grande" : city,
              deliveryState: isPickup ? "PB" : state,
              recipientPhone: normalizePhoneForBackend(recipientPhone),
              sendAnonymously,
              complement: complemento,
              deliveryMethod: optionSelected as "delivery" | "pickup",
              discount: pickupDiscount,
            },
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
                  (createdOrder as { order?: { id?: string } }).order?.id,
                );
              }
            }
            return "";
          })();

          if (!createdOrderId) {
            throw new Error("Não foi possível identificar o pedido gerado.");
          }

          setCurrentOrderId(createdOrderId);

          showFlowToast(
            "success",
            "Pedido criado! Selecione a forma de pagamento.",
          );
        } catch (error) {
          console.error("Erro ao criar pedido:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          showFlowToast("error", `Erro ao criar pedido: ${errorMessage}`);
          setIsProcessing(false);
          return;
        } finally {
          setIsProcessing(false);
          creatingOrderRef.current = false;
        }
      }

      if (currentOrderId) {
        if (updatingOrderMetadataRef.current) {
          console.warn(
            "Já há uma atualização em progresso, ignorando requisição duplicada",
          );
          return;
        }

        updatingOrderMetadataRef.current = true;
        try {
          const isPickup = optionSelected === "pickup";
          const deliveryAddress = isPickup
            ? "Retirada na Loja - R. Dr. Raif Ramalho, 350 - Jardim Tavares, Campina Grande - PB, 58402-025"
            : `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          let finalDateForBackend = finalDeliveryDate;
          if (selectedTime === "23:59") {
            finalDateForBackend = null;
          }

          await updateOrderMetadata(currentOrderId, {
            delivery_address: deliveryAddress,
            delivery_city: isPickup ? "Campina Grande" : city,
            delivery_state: isPickup ? "PB" : state,
            recipient_phone: normalizePhoneForBackend(recipientPhone),
            delivery_date: finalDateForBackend?.toISOString() || null,
            send_anonymously: sendAnonymously,
            complement: complemento,
            delivery_method: optionSelected as "delivery" | "pickup",
          });
        } catch (err) {
          console.error("Erro ao atualizar metadata do pedido pendente:", err);

          try {
            localStorage.removeItem("pendingOrderId");
            setCurrentOrderId(null);
            disconnectSSE?.();
          } catch {}
        } finally {
          updatingOrderMetadataRef.current = false;
        }
      }

      updateStepUrl(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleValidationStatusChange = (
    status: CustomizationsValidationStatus,
  ) => {
    setCustomizationsValidationStatus((prev) => {
      const sameSource = prev?.source === status.source;
      const sameValid = prev?.valid === status.valid;
      const sameRecommendations =
        JSON.stringify(prev?.recommendations || []) ===
        JSON.stringify(status.recommendations || []);
      const sameMissing =
        JSON.stringify(prev?.missingRequired || []) ===
        JSON.stringify(status.missingRequired || []);
      const sameInvalid =
        JSON.stringify(prev?.invalidCustomizations || []) ===
        JSON.stringify(status.invalidCustomizations || []);

      if (
        sameSource &&
        sameValid &&
        sameRecommendations &&
        sameMissing &&
        sameInvalid
      ) {
        return prev;
      }

      return status;
    });
  };

  const OrderSummary = () => {
    const maxProdTime = getMaxProductionTime();

    return (
      <Card className="bg-white border-0 shadow-sm rounded-lg sticky top-6 overflow-hidden">
        <div className="border-b border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900">Resumo da compra</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Produtos</span>
              <span className="text-gray-900">
                R$ {productSubtotal.toFixed(2)}
              </span>
            </div>

            {additionalsSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Adicionais</span>
                <span className="text-gray-900">
                  R$ {additionalsSubtotal.toFixed(2)}
                </span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#00a650]">Desconto</span>
                <span className="text-[#00a650]">
                  - R$ {discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Frete</span>
              <span className="text-[#00a650]">
                {shippingCost === 0
                  ? "Grátis"
                  : shippingCost === null
                    ? "-"
                    : `R$ ${shippingCost.toFixed(2)}`}
              </span>
            </div>

            {maxProdTime > 0 && (
              <div className="flex justify-between text-xs text-gray-500 italic">
                <span>Tempo de produção</span>
                <span>~{maxProdTime}h</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                R$ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {currentStep < 3 && (
            <>
              {currentStep === 1 &&
                !canProceedToStep2 &&
                cartItems.length > 0 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      ⚠️ Complete todas as personalizações obrigatórias antes de
                      continuar
                    </p>
                  </div>
                )}
              {currentStep === 2 &&
                selectedDate &&
                selectedTime &&
                !isDeliveryScheduleValid && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ O horário/data escolhidos não estão mais disponíveis.
                      Selecione um novo agendamento para continuar.
                    </p>
                  </div>
                )}
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    onClick={() =>
                      updateStepUrl((currentStep - 1) as 1 | 2 | 3)
                    }
                    variant="outline"
                    className="flex-1 py-6 rounded-lg font-bold text-base"
                  >
                    Voltar
                  </Button>
                )}
                <Button
                  onClick={handleNextStep}
                  disabled={
                    isProcessing ||
                    (currentStep === 1 && !canProceedToStep2) ||
                    (currentStep === 2 && !canProceedToStep3)
                  }
                  className="flex-1 bg-[#3483fa] hover:bg-[#2968c8] text-white py-6 rounded-lg font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Continuar a compra"
                  )}
                </Button>
              </div>
            </>
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
        <div className="min-h-screen bg-[#f5f5f5] relative">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <div key="step1" className="space-y-6">
                      <StepCart
                        cartItems={cartItems}
                        updateQuantity={updateQuantity}
                        removeFromCart={removeFromCart}
                        isProcessing={isProcessing}
                        onEditCustomizations={handleEditCustomizations}
                      />

                      {cartItems.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <CustomizationsReview
                            cartItems={cartItems}
                            orderId={currentOrderId}
                            onCustomizationUpdate={handleCustomizationUpdate}
                            onCustomizationSaved={handleCustomizationSaved}
                            onValidationStatusChange={
                              handleValidationStatusChange
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 2 && (
                    <StepDelivery
                      key="step2"
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
                      key="step3"
                      paymentMethod={paymentMethod ?? null}
                      setPaymentMethod={setPaymentMethod}
                      grandTotal={grandTotal}
                      pixData={pixData}
                      currentOrderId={currentOrderId ?? ""}
                      isGeneratingPix={isGeneratingPix}
                      isProcessing={isProcessing}
                      paymentError={paymentError}
                      handlePlaceOrder={handleNextStep}
                      handleCardSubmit={handleCardSubmit}
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

      <AnimatePresence>
        {confirmationState === "animating" && (
          <motion.div
            key="confirmation-overlay"
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
