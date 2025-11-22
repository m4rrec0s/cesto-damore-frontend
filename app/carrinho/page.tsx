"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useCartContext } from "@/app/hooks/cart-context";
// import { useCart } from "@/app/hooks/use-cart";
import { motion, AnimatePresence, easeIn, easeOut } from "framer-motion";
import { type Order, useApi } from "@/app/hooks/use-api";
import { usePaymentManager } from "@/app/hooks/use-payment-manager";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Calendar } from "@/app/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Loader2,
  AlertCircle,
  Smartphone,
  MapPin,
  CalendarIcon,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Edit2,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import { CustomizationsReview } from "./components/CustomizationsReview";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type PixData, QRCodePIX } from "@/app/components/QRCodePIX";
import { PaymentStatusOverlay } from "@/app/components/PaymentStatusOverlay";
import {
  formatPhoneNumber,
  isValidPhone,
  normalizePhoneForBackend,
} from "@/app/lib/phoneMask";
import {
  CreditCardForm,
  type CreditCardData,
} from "@/app/components/credit-card-form";
import { usePaymentPolling } from "@/app/hooks/use-payment-polling";
import { useWebhookNotification } from "@/app/hooks/use-webhook-notification";
import { PaymentMethodSelector } from "@/app/components/payment-method-selector";

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

// Tipo para as etapas do checkout
type CheckoutStep = 1 | 2 | 3;

/**
 * Calcula o preço final de um adicional considerando suas customizações
 * @param additionalId - ID do adicional
 * @param basePrice - Preço base do adicional
 * @param customizations - Array de customizações do item do carrinho
 * @returns Preço final do adicional (base + ajustes de customizações)
 */
const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[]
): number => {
  if (!customizations || customizations.length === 0) {
    return basePrice;
  }

  // Filtrar customizações que pertencem a este adicional
  // O customization_id pode ser o ruleId ou ter o formato `item_${itemId}`
  const additionalCustomizations = customizations.filter(
    (c) =>
      c.customization_id?.includes(additionalId) ||
      c.customization_id?.endsWith(`_${additionalId}`)
  );

  if (additionalCustomizations.length === 0) {
    return basePrice;
  }

  // Somar os ajustes de preço das customizações
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

interface ProductCardProps {
  item: CartItem;
  updateQuantity: (
    productId: string,
    quantity: number,
    additionalIds?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>
  ) => void;
  removeFromCart: (
    productId: string,
    additionalIds?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>
  ) => void;
  onEditCustomizations?: (item: CartItem) => void;
  isProcessing?: boolean;
}

const formatCustomizationValue = (custom: CartCustomization) => {
  switch (custom.customization_type) {
    case "TEXT":
      return custom.text?.trim() || "Mensagem não informada";
    case "MULTIPLE_CHOICE":
      return (
        custom.selected_option_label ||
        custom.selected_option ||
        "Opção não selecionada"
      );
    case "BASE_LAYOUT":
      // Se tiver um label descritivo, usar ele
      if (custom.selected_item_label) {
        return custom.selected_item_label;
      }
      // Caso contrário, tentar mostrar o nome do layout
      if (custom.selected_item) {
        if (typeof custom.selected_item === "string") {
          return "Personalização de Layout Aplicada";
        }
        return `${
          (custom.selected_item as { selected_item?: string }).selected_item ||
          "Layout Personalizado"
        }`;
      }
      return "Layout Personalizado";
    case "IMAGES":
      return `${custom.photos?.length || 0} foto(s)`;
    default:
      return "Personalização";
  }
};

// Componente de Stepper
const CheckoutStepper = ({ currentStep }: { currentStep: CheckoutStep }) => {
  const steps = [
    { number: 1, label: "Carrinho", icon: ShoppingCart },
    { number: 2, label: "Entrega", icon: MapPin },
    { number: 3, label: "Pagamento", icon: CreditCard },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-rose-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isActive ? "text-rose-600" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 rounded transition-all ${
                    currentStep > step.number ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componentes funcionais para o layout responsivo
const ProductCard = ({
  item,
  updateQuantity,
  removeFromCart,
  onEditCustomizations,
  isProcessing,
}: ProductCardProps) => {
  const layoutCustomization = item.customizations?.find(
    (c) => c.customization_type === "BASE_LAYOUT"
  );
  const previewUrl = layoutCustomization?.text;
  const hasCustomizations =
    item.customizations && item.customizations.length > 0;

  return (
    <div className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <Image
          src={item.product.image_url || "/placeholder.png"}
          alt={item.product.name}
          fill
          className="object-cover"
        />
        {previewUrl && (
          <div className="absolute bottom-0 left-0 right-0 bg-purple-600/90 text-white text-[10px] text-center py-0.5 font-semibold">
            Personalizado
            <Image
              src={previewUrl || "/placeholder.svg"}
              alt={"Preview da personalização"}
              width={40}
              height={40}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <h3 className="font-semibold text-base mb-1.5 line-clamp-2 text-gray-900">
            {item.product.name}
          </h3>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
            {item.product.description}
          </p>

          {item.additionals && item.additionals.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 lg:gap-2">
              {item.additionals.map((add) => {
                const finalPrice = getAdditionalFinalPrice(
                  add.id,
                  add.price,
                  item.customizations
                );
                return (
                  <Badge
                    key={add.id}
                    variant="secondary"
                    className="text-xs flex items-center gap-1 bg-rose-50 text-rose-700 border-rose-200 font-medium"
                  >
                    + {add.name} (+R$ {finalPrice.toFixed(2)})
                  </Badge>
                );
              })}
            </div>
          )}

          {item.customizations && item.customizations.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  Personalizações:
                </span>
                {hasCustomizations && onEditCustomizations && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditCustomizations(item)}
                    disabled={isProcessing}
                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {item.customizations.map((customization) => (
                  <div
                    key={customization.customization_id}
                    className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-rose-700">
                      {customization.title}:
                    </span>
                    <span className="flex-1 text-rose-900/80 line-clamp-2">
                      {formatCustomizationValue(customization)}
                    </span>
                    {customization.price_adjustment ? (
                      <span className="text-emerald-600 font-semibold whitespace-nowrap">
                        +R$ {customization.price_adjustment.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                updateQuantity(
                  item.product_id,
                  item.quantity - 1,
                  item.additional_ids,
                  item.customizations
                )
              }
              disabled={isProcessing || item.quantity <= 1}
              className="h-9 w-9 hover:bg-gray-100 text-gray-700"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-sm font-semibold text-gray-900">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                updateQuantity(
                  item.product_id,
                  item.quantity + 1,
                  item.additional_ids,
                  item.customizations
                )
              }
              disabled={isProcessing}
              className="h-9 w-9 hover:bg-gray-100 text-gray-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                removeFromCart(
                  item.product_id,
                  item.additional_ids,
                  item.customizations
                )
              }
              disabled={isProcessing}
              className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-right flex flex-col justify-between">
            {item.discount && item.discount > 0 ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400 line-through">
                  R${" "}
                  {(
                    (item.price ?? 0) * item.quantity +
                    (item.additionals?.reduce(
                      (sum: number, add) =>
                        sum +
                        getAdditionalFinalPrice(
                          add.id,
                          add.price,
                          item.customizations
                        ) *
                          item.quantity,
                      0
                    ) || 0)
                  ).toFixed(2)}
                </span>
                <span className="font-bold text-gray-900 text-lg">
                  R${" "}
                  {(
                    (item.effectivePrice ?? item.price) * item.quantity +
                    (item.additionals?.reduce(
                      (sum: number, add) =>
                        sum +
                        getAdditionalFinalPrice(
                          add.id,
                          add.price,
                          item.customizations
                        ) *
                          item.quantity,
                      0
                    ) || 0)
                  ).toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-gray-900 text-lg">
                R${" "}
                {(
                  (item.effectivePrice ?? item.price) * item.quantity +
                  (item.additionals?.reduce(
                    (sum: number, add) =>
                      sum +
                      getAdditionalFinalPrice(
                        add.id,
                        add.price,
                        item.customizations
                      ) *
                        item.quantity,
                    0
                  ) || 0)
                ).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CarrinhoPage() {
  const router = useRouter(); // Declare router here
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); // Declare currentOrderId here
  const { user, isLoading, login } = useAuth();
  const {
    getCepInfo,
    getUser,
    updateUser,
    createTransparentPayment,
    createCardToken,
    getCardIssuers,
    getOrder,
    updateOrderMetadata,
  } = useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setOrderMetadata,
    // updateCustomizations, // Para implementação futura de edição completa
    createOrder,
    getMinPreparationHours,
    generateTimeSlots,
    getDeliveryDateBounds,
  } = useCartContext();

  // Hook de gerenciamento de pagamento
  const {
    pendingOrder,
    hasPendingOrder,
    handleCancelOrder,
    clearPendingOrder,
    isCanceling,
  } = usePaymentManager();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  const OrderSummary = () => (
    <Card className="bg-white border shadow-lg rounded-2xl sticky top-6">
      <div className="p-6 border-b">
        <h3 className="text-xl font-bold text-gray-900">Resumo do Pedido</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxa de entrega</span>
            <span className="font-medium">
              {shippingCost === null
                ? "Calcular"
                : shippingCost === 0
                ? "GRÁTIS"
                : `R$ ${shippingCost.toFixed(2)}`}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium">Desconto</span>
              <span className="text-green-600 font-semibold">
                - R$ {discountAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-rose-600">
              R$ {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
        {paymentMethod && (
          <div className="bg-rose-50 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-2 text-rose-700 font-medium">
              {paymentMethod === "pix" ? (
                <Smartphone className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              <span className="capitalize">
                {paymentMethod === "pix" ? "PIX" : "Cartão"}
              </span>
              {shippingCost !== null && shippingCost > 0 && (
                <span className="text-xs">
                  • Frete R$ {shippingCost.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const { minDate, maxDate } = getDeliveryDateBounds();

      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      if (normalizedDate < minDate || normalizedDate > maxDate) {
        return true;
      }

      const slots = generateTimeSlots(normalizedDate);
      return !slots || slots.length === 0;
    },
    [getDeliveryDateBounds, generateTimeSlots]
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
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

  const paymentApprovedRef = useRef(false);
  const pendingPaymentToastShownRef = useRef(false);
  const disconnectSSERef = useRef<(() => void) | null>(null);
  const pollingStartedRef = useRef(false);
  const sseDisconnectCountRef = useRef(0);
  const pixGeneratedForOrderRef = useRef<string | null>(null);

  useEffect(() => {
    pollingStartedRef.current = false;
    sseDisconnectCountRef.current = 0;
  }, [currentOrderId]);

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
        console.log("⚠️ Pagamento já aprovado, ignorando polling");
        return;
      }
      paymentApprovedRef.current = true;
      console.log("✅ Pagamento confirmado pelo webhook! orderId=", order.id);

      setPaymentStatus("success");
      localStorage.removeItem("pendingOrderId");
      clearPendingOrder();
      clearCart();

      setConfirmedOrder(order);
      setShowConfirmation(true);

      toast.success("Pagamento confirmado! Pedido realizado com sucesso.");
    },
    [clearPendingOrder, clearCart]
  );

  // Hook de polling de pagamento
  const {
    status: pollingStatus,
    attempts: pollingAttempts,
    startPolling,
  } = usePaymentPolling({
    orderId: currentOrderId,
    enabled: Boolean(currentOrderId && paymentStatus === "pending"),
    maxAttempts: 60, // 5 minutos
    intervalMs: 3000, // ⚡ 3 segundos (mais agressivo)
    onSuccess: handlePaymentSuccess,
    onFailure: (order) => {
      console.log("❌ Pagamento rejeitado/cancelado orderId=", order.id);
      setPaymentStatus("failure");
      setPaymentError(
        "Pagamento recusado. Por favor, verifique os dados e tente novamente."
      );
      toast.error("Pagamento recusado. Verifique os dados do pagamento.");
    },
    onTimeout: () => {
      console.log("⏱️ Timeout ao aguardar confirmação");
      setPaymentError(
        "O tempo de espera expirou. Verifique o status do seu pedido na página 'Meus Pedidos'."
      );
      toast.warning(
        "Ainda não recebemos a confirmação do pagamento. Você pode acompanhar o status na página de pedidos.",
        { duration: 8000 }
      );
      // Oferecer opção de verificar pedidos
      setTimeout(() => {
        const shouldRedirect = confirm(
          "Deseja verificar o status do seu pedido agora?"
        );
        if (shouldRedirect) {
          router.push("/pedidos");
        }
      }, 2000);
    },
    onPending: (order) => {
      console.log(
        "⏳ Pagamento em processamento... orderId=",
        order.id,
        "attempts=",
        pollingAttempts
      );
    },
  });

  // Handler para navegar para a página de rastreamento do pedido
  const handleTrackOrder = () => {
    router.push("/pedidos");
  };

  const sseOnConnected = useCallback(() => {
    console.log(
      "✅ Conectado ao webhook SSE para receber atualizações em tempo real"
    );
    // Reset contador de desconexões quando conectar com sucesso
    sseDisconnectCountRef.current = 0;
    // Não parar polling aqui, deixar como fallback
  }, []);

  const sseOnDisconnected = useCallback(() => {
    sseDisconnectCountRef.current += 1;
    console.log(
      `Disconnected from SSE (${sseDisconnectCountRef.current}/3) - ${
        sseDisconnectCountRef.current >= 3
          ? "initiating polling fallback"
          : "retrying connection"
      }`
    );
    if (sseDisconnectCountRef.current >= 3 && !pollingStartedRef.current) {
      pollingStartedRef.current = true;
      startPolling();
    }
  }, [startPolling]);

  const sseOnError = useCallback(
    (error: unknown) => {
      sseDisconnectCountRef.current += 1;
      console.error(
        `❌ SSE Error (${sseDisconnectCountRef.current}/3):`,
        error
      );
      if (sseDisconnectCountRef.current >= 3 && !pollingStartedRef.current) {
        pollingStartedRef.current = true;
        startPolling();
      }
    },
    [startPolling]
  );

  const sseOnPaymentApproved = useCallback(
    (data: unknown) => {
      if (paymentApprovedRef.current) {
        console.log("⚠️ Pagamento já aprovado, ignorando SSE");
        return;
      }
      paymentApprovedRef.current = true;
      console.log("✅ Pagamento aprovado via webhook SSE!", data);
      setPaymentStatus("success");
      clearCart();
      clearPendingOrder();
      localStorage.removeItem("pendingOrderId");
      disconnectSSERef.current?.(); // Desconectar SSE após aprovação
      toast.success("Pagamento confirmado! 🎉", {
        description: "Recebemos a confirmação do seu pagamento em tempo real!",
        duration: 5000,
      });
      setTimeout(() => {
        const orderIdFromData = (data as { orderId?: string })?.orderId;
        if (orderIdFromData) {
          router.push(`/pedidos/${orderIdFromData}`);
        }
      }, 2000);
    },
    [clearCart, clearPendingOrder, router]
  );

  const sseOnPaymentRejected = useCallback((data: unknown) => {
    console.error("❌ Pagamento rejeitado via webhook SSE", data);
    setPaymentStatus("failure");
    setPaymentError("Pagamento rejeitado pelo Mercado Pago");
    toast.error("Pagamento rejeitado", {
      description: "Seu pagamento não foi aprovado. Tente novamente.",
    });
  }, []);

  const sseOnPaymentPending = useCallback((data: unknown) => {
    console.log("⏳ Pagamento pendente via webhook SSE", data);
  }, []);

  // 🔔 Hook de notificações webhook em tempo real (SSE)
  const sseOnPaymentUpdate = useCallback((data: unknown) => {
    console.log("🔔 SSE Message (onPaymentUpdate):", data);
  }, []);

  const { disconnect: disconnectSSE } = useWebhookNotification({
    orderId: currentOrderId,
    // Habilitar SSE enquanto houver um pedido pendente (evitar loops causados por toggles de enabled)
    enabled: Boolean(
      currentOrderId &&
        paymentStatus !== "success" &&
        paymentStatus !== "failure"
    ),
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
  useEffect(() => {
    const detect = async () => {
      setCheckingPendingOrder(true);
      try {
        if (hasPendingOrder && pendingOrder) {
          console.log("🔔 Pedido pendente detectado:", pendingOrder.id);

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
            setAddress(pendingOrder.delivery_address);
            // Tentar extrair número da casa do endereço
            const numMatch = pendingOrder.delivery_address.match(
              /\b(\d{1,4}[A-Za-z\-]*)\b/
            );
            if (numMatch) setHouseNumber(numMatch[1]);
          }
          if (typeof pendingOrder.complement === "string") {
            setComplemento(pendingOrder.complement || "");
            setOrderMetadata({
              complement: pendingOrder.complement || undefined,
            });
          }
          if (typeof pendingOrder.send_anonymously === "boolean") {
            setSendAnonymously(Boolean(pendingOrder.send_anonymously));
            setOrderMetadata({
              send_anonymously: Boolean(pendingOrder.send_anonymously),
            });
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
          // Preencher telefone do remetente (usuário) caso exista
          if (pendingOrder.user?.phone) {
            const userPhoneDigits = pendingOrder.user.phone.replace(/\D/g, "");
            const localNumber = userPhoneDigits.startsWith("55")
              ? userPhoneDigits.substring(2)
              : userPhoneDigits;
            setCustomerPhone(localNumber);
          }
          // Preencher CEP a partir do usuário, se disponível
          if (pendingOrder.user?.zip_code) {
            setZipCode(pendingOrder.user.zip_code.replace(/\D/g, ""));
          }

          // If the pending order has incomplete delivery data, force user to step 2
          const hasAllDelivery =
            pendingOrder.delivery_address &&
            pendingOrder.recipient_phone &&
            pendingOrder.delivery_city &&
            pendingOrder.delivery_state;

          if (hasAllDelivery) {
            setCurrentStep(3);
          } else {
            // Prompt user to complete missing info before proceeding to payment
            setCurrentStep(2);
            toast.info(
              "Seu pedido pendente possui informações incompletas. Complete os dados de entrega para prosseguir."
            );
          }
          window.scrollTo({ top: 0, behavior: "smooth" });

          if (pendingOrder.payment?.status === "PENDING") {
            if (!pendingPaymentToastShownRef.current) {
              toast.info("Seu pedido possui um pagamento pendente.", {
                action: {
                  label: "Ir para pagamento",
                  onClick: () => {
                    setCurrentOrderId(pendingOrder.id);
                    setCurrentStep(3);
                  },
                },
                duration: 10000,
              });
              pendingPaymentToastShownRef.current = true;
            }
          } else {
            toast.info(
              "Você tem um pedido pendente. Complete o pagamento ou cancele para criar um novo.",
              {
                duration: 5000,
              }
            );
          }
        }
      } catch {
      } finally {
        setCheckingPendingOrder(false);
      }
    };

    detect();
  }, [hasPendingOrder, pendingOrder, setOrderMetadata]);

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
    if (!paymentMethod || !isAddressServed || !shippingRule) {
      return null;
    }
    return shippingRule[paymentMethod];
  }, [paymentMethod, isAddressServed, shippingRule]);

  const grandTotal = useMemo(
    () => cartTotal + (shippingCost ?? 0),
    [cartTotal, shippingCost]
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
    console.log("[v0] 💳 Gerando PIX - verificando condições:", {
      paymentMethod,
      currentOrderId,
      pixData: !!pixData,
      isProcessing,
      isGeneratingPix,
      currentStep,
      pixGeneratedForOrder: pixGeneratedForOrderRef.current,
    });

    if (
      paymentMethod === "pix" &&
      currentOrderId &&
      !pixData &&
      !isProcessing &&
      !isGeneratingPix &&
      currentStep === 3 &&
      pixGeneratedForOrderRef.current !== currentOrderId
    ) {
      console.log("[v0] 💳 Iniciando geração PIX...", {
        orderId: currentOrderId,
        paymentMethodId: "pix",
        email: user?.email,
      });

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

        console.log("[v0] 📤 Enviando payload PIX:", payload);

        const paymentResponse = await createTransparentPayment(payload);

        console.log("[v0] 📥 Resposta PIX recebida:", {
          success: paymentResponse?.success,
          hasQrCode: !!paymentResponse?.data?.qr_code,
          status: paymentResponse?.status,
        });

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
        pixGeneratedForOrderRef.current = currentOrderId; // Marcar como gerado para este pedido

        console.log(
          "[v0] ✅ PIX gerado com sucesso para ordem:",
          currentOrderId
        );
        toast.success("QR Code PIX gerado! Escaneie para pagar.");
      } catch (error) {
        console.error("[v0] ❌ Erro ao gerar pagamento PIX:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        setPaymentError(errorMessage);
        toast.error(`Erro ao gerar PIX: ${errorMessage}`);
      } finally {
        setIsProcessing(false);
        setIsGeneratingPix(false);
      }
    } else {
      console.log("[v0] ⚠️ PIX não foi gerado - condições não atendidas");
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

  const handleEditCustomizations = useCallback((item: CartItem) => {
    toast.info(
      `Edição de personalizações: Para alterar as personalizações de "${item.product.name}", remova o item e adicione novamente ao carrinho com as novas opções.`,
      { duration: 6000 }
    );
  }, []);

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

  // Moved handleCreditCardPayment here to be accessible by the CreditCardForm component
  const handleCreditCardPayment = async (cardData: CreditCardData) => {
    setIsProcessing(true);
    setPaymentError(null);

    setUserDocument(cardData.identificationNumber);

    try {
      let orderId = currentOrderId;

      if (!orderId) {
        const storedOrderId = localStorage.getItem("pendingOrderId");

        if (storedOrderId) {
          orderId = storedOrderId;
          setCurrentOrderId(orderId); // Fix: setCurrentOrderId is declared
        }
      }

      if (!orderId) {
        console.error("❌ OrderId não encontrado. Estado atual:", {
          currentOrderId,
          paymentMethod,
          cartItems: cartItems.length,
          localStorage: localStorage.getItem("pendingOrderId"),
        });
        throw new Error(
          "Pedido não encontrado. Por favor, clique em 'Finalizar Compra' novamente antes de preencher os dados do cartão."
        );
      }

      let cardTokenId: string | undefined = undefined;

      try {
        const tokenData = await createCardToken({
          cardNumber: cardData.cardNumber.replace(/\s/g, ""),
          securityCode: cardData.securityCode.trim(),
          expirationMonth: String(cardData.expirationMonth).padStart(2, "0"),
          expirationYear: String(cardData.expirationYear),
          cardholderName: cardData.cardholderName.trim(),
          identificationType: cardData.identificationType,
          identificationNumber: cardData.identificationNumber.replace(
            /\D/g,
            ""
          ),
        });

        cardTokenId = tokenData.id;
        const bin = tokenData.first_six_digits;

        if (!cardTokenId || !bin) {
          throw new Error(
            "Falha ao gerar token do cartão. Verifique os dados e tente novamente."
          );
        }

        let detectedPaymentMethod = "master";
        const firstDigit = bin.charAt(0);

        if (firstDigit === "4") {
          detectedPaymentMethod = "visa";
        } else if (firstDigit === "5") {
          detectedPaymentMethod = "master";
        } else if (firstDigit === "3") {
          detectedPaymentMethod = "amex";
        } else if (firstDigit === "6") {
          detectedPaymentMethod = "elo";
        }

        const issuerData = await getCardIssuers({
          bin: bin,
          paymentMethodId: detectedPaymentMethod,
        });

        const issuerId = issuerData.issuer_id;
        const paymentMethodId = issuerData.payment_method_id;

        if (!issuerId) {
          console.warn("⚠️ Emissor não encontrado, continuando sem issuer_id");
        }
        (
          cardData as unknown as { issuerId?: string; paymentMethodId?: string }
        ).issuerId = issuerId;
        (
          cardData as unknown as { issuerId?: string; paymentMethodId?: string }
        ).paymentMethodId = paymentMethodId;
      } catch (tokenError: unknown) {
        console.error("Erro ao tokenizar cartão:", tokenError);
        const getMessage = (err: unknown): string => {
          if (!err || typeof err !== "object")
            return "Erro ao tokenizar o cartão. Verifique os dados.";
          const maybe = err as { message?: unknown };
          if (maybe.message && typeof maybe.message === "string")
            return maybe.message;
          return "Erro ao tokenizar o cartão. Verifique os dados.";
        };

        throw new Error(getMessage(tokenError));
      }

      const paymentResponse = await createTransparentPayment({
        orderId: orderId,
        paymentMethodId: "credit_card",
        installments: cardData.installments,
        payerEmail: cardData.email,
        payerName: cardData.cardholderName,
        payerDocument: cardData.identificationNumber,
        payerDocumentType:
          cardData.identificationType === "CPF" ? "CPF" : "CNPJ",
        cardToken: cardTokenId,
        cardholderName: cardData.cardholderName,
        issuer_id: (cardData as unknown as { issuerId?: string }).issuerId,
        payment_method_id: (cardData as unknown as { paymentMethodId?: string })
          .paymentMethodId,
      });

      if (!paymentResponse?.success) {
        throw new Error(
          paymentResponse?.message || "Erro ao processar pagamento"
        );
      }

      const rawStatus = paymentResponse.status || "pending";
      const normalizedStatus = mapPaymentStatus(rawStatus) || "pending";

      setPaymentStatus(normalizedStatus);

      if (normalizedStatus === "success") {
        toast.success("Pagamento aprovado! Pedido confirmado.");
        localStorage.removeItem("pendingOrderId");
        clearPendingOrder();
        clearCart();
        setTimeout(() => {
          router.push("/pedidos");
        }, 1000);
      } else if (normalizedStatus === "pending") {
        toast.info("Pagamento em análise. Aguardando confirmação...", {
          duration: 5000,
        });
      } else {
        throw new Error("Pagamento recusado. Verifique os dados do cartão.");
      }
    } catch (error) {
      console.error("❌ Erro ao processar pagamento com cartão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setPaymentError(errorMessage);

      if (errorMessage.includes("Pedido não encontrado")) {
        localStorage.removeItem("pendingOrderId");
        setCurrentOrderId(null);
      }

      toast.error(`Erro no pagamento: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

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

  // const discountAmount = originalTotal - cartTotal; // Replaced with useMemo version above

  const canProceedToStep2 = cartItems.length > 0;

  const canProceedToStep3 =
    zipCode.trim().length === 8 &&
    address.trim() !== "" &&
    houseNumber.trim() !== "" &&
    city.trim() !== "" &&
    state.trim() !== "" &&
    customerPhone.trim() !== "" &&
    isValidPhone(customerPhone) &&
    recipientPhone.trim() !== "" &&
    isValidPhone(recipientPhone) &&
    selectedDate !== undefined &&
    selectedTime !== "" &&
    isAddressServed;

  const handleNextStep = async () => {
    // Compute finalDeliveryDate at the beginning so it's available both for
    // creating a new order and updating an existing one
    let finalDeliveryDate: Date | null = null;
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      finalDeliveryDate = new Date(selectedDate);
      finalDeliveryDate.setHours(hours, minutes, 0, 0);
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
        if (!recipientPhone.trim()) {
          toast.error("Por favor, informe o número do destinatário");
          return;
        }
        if (!isValidPhone(recipientPhone)) {
          toast.error(
            "Por favor, informe um número de telefone válido para o destinatário"
          );
          return;
        }

        setIsProcessing(true);
        try {
          const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          // finalDeliveryDate already computed above

          const createdOrder = await createOrder(
            user.id,
            fullAddress,
            finalDeliveryDate || undefined,
            {
              shippingCost: 0,
              paymentMethod: "pix",
              grandTotal: cartTotal,
              deliveryCity: city,
              deliveryState: state,
              recipientPhone: normalizePhoneForBackend(recipientPhone),
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

      // If there's an existing pending order, update its delivery info before proceeding
      if (currentOrderId) {
        try {
          const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

          await updateOrderMetadata(currentOrderId, {
            delivery_address: fullAddress,
            delivery_city: city,
            delivery_state: state,
            recipient_phone: normalizePhoneForBackend(recipientPhone),
            delivery_date: finalDeliveryDate?.toISOString() || undefined,
            send_anonymously: sendAnonymously,
            complement: complemento,
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
        }
      }

      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as CheckoutStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: easeOut },
    },
    exit: {
      opacity: 0,
      y: -40,
      transition: { duration: 0.3, ease: easeIn },
    },
  };

  const OrderConfirmationTicket = ({
    order,
    onTrackOrder,
  }: {
    order: Order | null;
    onTrackOrder: () => void;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg mx-auto"
      >
        {/* Animação de checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <CheckCircle2
                className="w-16 h-16 text-white"
                strokeWidth={1.5}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Card do Ticket */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-b from-white to-gray-50 border-2 border-gray-100 rounded-3xl overflow-hidden shadow-2xl">
            {/* Topo do Ticket */}
            <div className="relative bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-8 text-white text-center">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-3xl font-bold"
              >
                Pedido Confirmado! 🎉
              </motion.h2>
              <p className="text-rose-100 mt-2 text-sm">
                Obrigado por sua compra
              </p>
            </div>

            {/* Separador decorativo do ticket */}
            <div className="relative h-6 bg-gray-50">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-gray-200"></div>
              </div>
            </div>

            {/* Conteúdo do Ticket */}
            <div className="px-6 py-8 space-y-6">
              {/* Número do Pedido */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center"
              >
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                  Número do Pedido
                </p>
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {order?.id?.toUpperCase() || "N/A"}
                </p>
              </motion.div>

              {/* Informações do Cliente */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3 bg-gray-50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-600" />
                    Cliente
                  </span>
                  <span className="font-semibold text-gray-900">
                    {order?.user?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-rose-600" />
                    Contato
                  </span>
                  <span className="font-semibold text-gray-900">
                    {order?.recipient_phone || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
                  <span className="text-gray-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    Endereço
                  </span>
                  <span className="font-semibold text-gray-900 text-right">
                    {order?.delivery_address || "N/A"}
                  </span>
                </div>
              </motion.div>

              {/* Resumo Financeiro */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-2 border-t border-gray-200 pt-4"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa de Entrega</span>
                  <span className="font-medium text-gray-900">
                    {order?.shipping_price === 0
                      ? "GRÁTIS"
                      : `R$ ${(order?.shipping_price || 0).toFixed(2)}`}
                  </span>
                </div>
                {order?.discount && order?.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Desconto</span>
                    <span className="text-green-600 font-semibold">
                      - R$ {order.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-200 pt-3 mt-3">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-rose-600">
                    R$ {(order?.total || 0).toFixed(2)}
                  </span>
                </div>
              </motion.div>

              {/* Status do Pedido */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200"
              >
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 mb-2 flex items-center gap-1 w-fit mx-auto">
                  <CheckCircle2 className="w-3 h-3" />
                  Pagamento Aprovado
                </Badge>
                <p className="text-xs text-blue-600 mt-2">
                  Seu pedido foi recebido e está sendo preparado
                </p>
              </motion.div>
            </div>

            {/* Separador decorativo final */}
            <div className="relative h-6 bg-gray-50">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-gray-200"></div>
              </div>
            </div>

            {/* Botão de ação */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="px-6 py-6"
            >
              <Button
                onClick={onTrackOrder}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white py-6 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Acompanhar Pedido
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {showConfirmation && confirmedOrder ? (
        <div className="py-12 px-4">
          <OrderConfirmationTicket
            order={confirmedOrder}
            onTrackOrder={handleTrackOrder}
          />
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              <CheckoutStepper currentStep={currentStep} />

              <AnimatePresence mode="wait">
                {/* Etapa 1: Revisão do Carrinho */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                      <h2 className="text-2xl font-bold mb-6 text-gray-900">
                        Seus Produtos
                      </h2>
                      <div className="space-y-4">
                        {cartItems.map((item, index) => (
                          <ProductCard
                            key={`${item.product_id}-${index}`}
                            item={item}
                            updateQuantity={updateQuantity}
                            removeFromCart={removeFromCart}
                            isProcessing={isProcessing}
                            onEditCustomizations={handleEditCustomizations}
                          />
                        ))}
                      </div>
                    </Card>

                    {/* Resumo Financeiro */}
                    <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                      <h3 className="text-xl font-bold mb-4 text-gray-900">
                        Resumo do Pedido
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            {discountAmount > 0
                              ? "Subtotal dos produtos"
                              : "Subtotal"}
                          </span>
                          <span className="font-semibold text-gray-900">
                            R$ {originalTotal.toFixed(2)}
                          </span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-green-600 font-medium">
                              Desconto aplicado
                            </span>
                            <span className="text-green-600 font-semibold">
                              - R$ {discountAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900 text-lg">
                              Total
                            </span>
                            <span className="font-bold text-rose-600 text-2xl">
                              R$ {cartTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Botão Próxima Etapa */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleNextStep}
                        disabled={isProcessing || !canProceedToStep2}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all"
                      >
                        Prosseguir para Entrega
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Etapa 2: Entrega */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-rose-600" />
                        Dados de Entrega
                      </h2>

                      <div className="space-y-5">
                        {/* Telefone */}
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            📱 Seu Telefone (WhatsApp) *
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(
                                e.target.value
                              );
                              setCustomerPhone(formatted);
                            }}
                            placeholder="+55 (XX) XXXXX-XXXX"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                          />
                          {customerPhone.length > 0 &&
                            !isValidPhone(customerPhone) && (
                              <p className="text-xs text-red-600 mt-2 font-medium">
                                ⚠️ Telefone incompleto
                              </p>
                            )}
                        </div>

                        {/* Telefone do Destinatário */}
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            🎁 Telefone do Destinatário *
                          </label>
                          <div className="mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelfRecipient}
                                onChange={(e) => {
                                  setIsSelfRecipient(e.target.checked);
                                  if (e.target.checked) {
                                    setRecipientPhone(customerPhone);
                                  }
                                }}
                                className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                              />
                              <span className="text-sm text-gray-700">
                                Eu vou receber
                              </span>
                            </label>
                          </div>
                          {!isSelfRecipient && (
                            <>
                              <input
                                type="tel"
                                value={recipientPhone}
                                onChange={(e) => {
                                  const formatted = formatPhoneNumber(
                                    e.target.value
                                  );
                                  setRecipientPhone(formatted);
                                }}
                                placeholder="+55 (XX) XXXXX-XXXX"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                              />
                              {recipientPhone.length > 0 &&
                                !isValidPhone(recipientPhone) && (
                                  <p className="text-xs text-red-600 mt-2 font-medium">
                                    ⚠️ Telefone incompleto
                                  </p>
                                )}
                              <div className="mt-3 flex items-center gap-3">
                                <label className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={sendAnonymously}
                                    onChange={(e) => {
                                      setSendAnonymously(e.target.checked);
                                      setOrderMetadata({
                                        send_anonymously: e.target.checked,
                                      });
                                    }}
                                    className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    Enviar anonimamente
                                  </span>
                                </label>
                              </div>
                            </>
                          )}
                        </div>

                        {/* CEP */}
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            📮 CEP *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={zipCode}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 8) {
                                  setZipCode(value);
                                  if (value.length === 8) {
                                    handleCepSearch(value);
                                  } else {
                                    setAddress("");
                                    setNeighborhood("");
                                    setCity("");
                                    setState("");
                                  }
                                }
                              }}
                              placeholder="00000000"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent pr-10 transition-all"
                              maxLength={8}
                            />
                            {isLoadingCep && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Endereço e Número */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              🏠 Endereço *
                            </label>
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Rua, Avenida..."
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Número *
                            </label>
                            <input
                              type="text"
                              value={houseNumber}
                              onChange={(e) => setHouseNumber(e.target.value)}
                              placeholder="123"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Complemento
                            </label>
                            <input
                              type="text"
                              value={complemento}
                              onChange={(e) => {
                                setComplemento(e.target.value);
                                setOrderMetadata({
                                  complement: e.target.value,
                                });
                              }}
                              placeholder="Apt, bloco, ponto de referência"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            🏘️ Bairro
                          </label>
                          <input
                            type="text"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            placeholder="Nome do bairro"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-3">
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              🏙️ Cidade *
                            </label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Cidade"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Estado *
                            </label>
                            <input
                              type="text"
                              value={state}
                              onChange={(e) =>
                                setState(e.target.value.toUpperCase())
                              }
                              placeholder="UF"
                              maxLength={2}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent uppercase transition-all"
                            />
                          </div>
                        </div>

                        {/* Aviso de endereço */}
                        {addressWarning && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700 text-sm">
                              {addressWarning}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Agendamento */}
                        <div className="pt-4 border-t border-gray-200">
                          <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-rose-600" />
                            Agendar Entrega
                          </h3>

                          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4">
                            <p className="text-xs text-blue-800">
                              ⏱️ <strong>Tempo de preparo:</strong>{" "}
                              {getMinPreparationHours()}h
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="block text-sm font-bold text-gray-900 mb-2">
                                Data *
                              </Label>
                              <Popover
                                open={calendarOpen}
                                onOpenChange={setCalendarOpen}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left border-2 border-gray-200 hover:border-rose-300 rounded-xl py-6 bg-transparent"
                                    disabled={isProcessing}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate
                                      ? selectedDate.toLocaleDateString("pt-BR")
                                      : "Selecione uma data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-full max-w-[400px] min-w-[300px] p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date: Date | undefined) => {
                                      if (date) {
                                        setSelectedDate(date);
                                        setSelectedTime("");
                                      }
                                      setCalendarOpen(false);
                                    }}
                                    disabled={isDateDisabled}
                                    className="rounded-md w-full border"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            {selectedDate && (
                              <div>
                                <Label className="block text-sm font-bold text-gray-900 mb-2">
                                  Horário *
                                </Label>
                                <select
                                  value={selectedTime}
                                  onChange={(e) =>
                                    setSelectedTime(e.target.value)
                                  }
                                  title="Selecione o horário de entrega"
                                  aria-label="Horário de entrega"
                                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                >
                                  <option value="">Selecione um horário</option>
                                  {generateTimeSlots(selectedDate).map(
                                    (slot) => (
                                      <option
                                        key={slot.value}
                                        value={slot.value}
                                      >
                                        {slot.label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Resumo com frete */}
                    <Card className="bg-white p-6 rounded-2xl shadow-sm border-gray-100">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">
                        Resumo do Pedido
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Subtotal dos produtos
                          </span>
                          <span className="font-semibold">
                            R$ {cartTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Mostrar opções de frete se endereço for válido */}
                        {isAddressServed && shippingRule ? (
                          <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                            <p className="text-xs font-bold text-gray-700 mb-2">
                              📦 Taxa de entrega por forma de pagamento:
                            </p>
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="flex justify-between items-center">
                                <span className="text-green-800 font-medium flex items-center gap-1">
                                  PIX
                                </span>
                                <span className="font-bold text-green-700">
                                  {shippingRule.pix === 0
                                    ? "GRÁTIS 🎉"
                                    : `R$ ${shippingRule.pix.toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex justify-between items-center">
                                <span className="text-blue-800 font-medium flex items-center gap-1">
                                  Cartão de Crédito
                                </span>
                                <span className="font-bold text-blue-700">
                                  {shippingRule.card === 0
                                    ? "GRÁTIS 🎉"
                                    : `R$ ${shippingRule.card.toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">
                              ℹ️ O valor final será calculado após selecionar a
                              forma de pagamento na próxima etapa
                            </p>
                          </div>
                        ) : (
                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Taxa de entrega
                              </span>
                              <span className="font-semibold text-rose-600">
                                Informe o endereço
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    <CustomizationsReview cartItems={cart.items} />

                    <div className="flex justify-between gap-4">
                      <Button
                        onClick={handlePreviousStep}
                        variant="outline"
                        className="px-6 py-6 rounded-xl font-bold border-2 bg-transparent"
                        disabled={isProcessing}
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Voltar
                      </Button>
                      <Button
                        onClick={handleNextStep}
                        disabled={isProcessing || !canProceedToStep3}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                      >
                        Prosseguir para Pagamento
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Etapa 3: Pagamento */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    {isProcessing && !pixData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <Card className="bg-gradient-to-br from-rose-50 to-orange-50 p-8 rounded-2xl shadow-md border border-rose-100">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              }}
                            >
                              <Loader2 className="h-12 w-12 text-rose-600" />
                            </motion.div>
                            <div className="text-center space-y-2">
                              <h3 className="text-lg font-bold text-rose-900">
                                {paymentMethod === "pix"
                                  ? "Gerando QR Code PIX..."
                                  : "Processando seu pagamento..."}
                              </h3>
                              <p className="text-sm text-rose-700">
                                {paymentMethod === "pix"
                                  ? "Aguarde enquanto geramos seu código QR"
                                  : "Validando dados do seu cartão"}
                              </p>
                            </div>

                            <div className="w-full mt-4">
                              <div className="h-1 bg-rose-200 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500"
                                  animate={{ x: ["-100%", "100%"] }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Number.POSITIVE_INFINITY,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {/* Seleção de Método de Pagamento */}
                    {!pixData && !isProcessing && (
                      <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                          <CreditCard className="h-6 w-6 text-rose-600" />
                          Forma de Pagamento
                        </h2>

                        <PaymentMethodSelector
                          selectedMethod={paymentMethod as "pix" | "card"}
                          onMethodChange={(method) => {
                            setPaymentMethod(method);
                            setPaymentError(null);
                          }}
                        />
                      </Card>
                    )}

                    {!isProcessing && paymentMethod && (
                      <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                        {paymentMethod === "pix" && pixData ? (
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">
                              Complete seu pagamento
                            </h3>
                            <QRCodePIX pixData={pixData} />
                          </div>
                        ) : paymentMethod === "card" ? (
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">
                              Dados do Cartão
                            </h3>
                            <CreditCardForm
                              onSubmit={handleCreditCardPayment}
                              isProcessing={isProcessing}
                              defaultEmail={user?.email}
                              defaultName={user?.name}
                            />
                          </div>
                        ) : null}
                      </Card>
                    )}

                    {paymentError && (
                      <Alert className="border-red-200 bg-red-50 mt-6">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          {paymentError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* PIX Payment Details */}
                    {paymentMethod === "pix" && pixData && (
                      <Card className="bg-white p-6 rounded-2xl shadow-sm border-gray-100 relative">
                        {paymentStatus === "pending" &&
                          pollingStatus === "polling" && (
                            <Alert className="border-blue-200 bg-blue-50 mb-6">
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                              <AlertDescription className="text-blue-800 text-sm">
                                <div className="flex flex-col gap-2">
                                  <span className="font-medium">
                                    Aguardando confirmação do pagamento...
                                  </span>
                                  <span className="text-xs">
                                    Verificação {pollingAttempts} de 60 • Isso
                                    pode levar alguns minutos
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!currentOrderId) {
                                        toast.error(
                                          "ID do pedido não encontrado"
                                        );
                                        return;
                                      }

                                      toast.info("Verificando pagamento...");

                                      try {
                                        const order = await getOrder(
                                          currentOrderId
                                        );

                                        if (
                                          order?.payment?.status ===
                                            "APPROVED" ||
                                          order?.payment?.status ===
                                            "AUTHORIZED" ||
                                          order?.status === "PAID"
                                        ) {
                                          setPaymentStatus("success");
                                          clearCart();
                                          clearPendingOrder();
                                          localStorage.removeItem(
                                            "pendingOrderId"
                                          );
                                          toast.success(
                                            "🎉 Pagamento confirmado!",
                                            {
                                              duration: 3000,
                                            }
                                          );
                                          setTimeout(
                                            () => router.push("/pedidos"),
                                            2000
                                          );
                                        } else if (
                                          order?.payment?.status ===
                                            "REJECTED" ||
                                          order?.payment?.status === "CANCELLED"
                                        ) {
                                          console.log(
                                            "❌ [MANUAL CHECK] Pagamento rejeitado"
                                          );
                                          setPaymentStatus("failure");
                                          toast.error(
                                            "Pagamento foi rejeitado"
                                          );
                                        } else {
                                          console.log(
                                            "⏳ [MANUAL CHECK] Pagamento ainda pendente"
                                          );
                                          toast.warning(
                                            "Pagamento ainda pendente. Continue aguardando.",
                                            {
                                              duration: 4000,
                                            }
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "❌ [MANUAL CHECK] Erro ao verificar:",
                                          error
                                        );
                                        toast.error(
                                          "Erro ao verificar pagamento"
                                        );
                                      }
                                    }}
                                    className="mt-2 text-xs"
                                  >
                                    <RefreshCcw className="h-3 w-3 mr-1" />
                                    Verificar agora
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                        {paymentStatus === "success" && (
                          <Alert className="border-green-200 bg-green-50 mb-6">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 text-sm font-medium">
                              ✅ Pagamento confirmado! Redirecionando...
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Alert de timeout */}
                        {pollingStatus === "timeout" && paymentError && (
                          <Alert className="border-orange-200 bg-orange-50 mb-6">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-900 font-semibold">
                              Tempo de Espera Expirado
                            </AlertTitle>
                            <AlertDescription className="text-orange-800 text-sm">
                              <div className="flex flex-col gap-3 mt-2">
                                <p>{paymentError}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push("/pedidos")}
                                  className="border-orange-300 hover:bg-orange-100"
                                  disabled={isProcessing}
                                >
                                  Verificar Meus Pedidos
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {currentOrderId && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                            <span className="font-medium text-gray-700">
                              🆔 Código do pedido:
                            </span>{" "}
                            {currentOrderId}
                          </div>
                        )}

                        {/* Container relativo para overlay */}
                        <div className="relative flex flex-col items-center justify-center max-w-md mx-auto">
                          <QRCodePIX
                            pixData={{
                              ...pixData,
                              payer_info: {
                                id: pixData.payer_info.id || "",
                                email: pixData.payer_info.email || "",
                                first_name: pixData.payer_info.first_name,
                                last_name: pixData.payer_info.last_name,
                              },
                            }}
                          />

                          {/* Overlay de status sobre o QR Code */}
                          {(pollingStatus === "success" ||
                            pollingStatus === "failure" ||
                            pollingStatus === "timeout" ||
                            (pollingStatus === "pending" &&
                              paymentStatus === "pending")) && (
                            <PaymentStatusOverlay
                              status={
                                pollingStatus === "success"
                                  ? "success"
                                  : pollingStatus === "failure"
                                  ? "failure"
                                  : pollingStatus === "timeout"
                                  ? "timeout"
                                  : "pending"
                              }
                              paymentMethod="pix"
                              showOverQRCode={true}
                              onAnimationComplete={() => {
                                if (pollingStatus === "success") {
                                  // Redirecionar para página de pedidos após animação
                                  router.push("/pedidos");
                                }
                              }}
                            />
                          )}
                          {/* Ações rápidas: copiar link e abrir em nova aba (melhor UX mobile) */}
                          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                            <button
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm shadow-sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    pixData.ticket_url || pixData.qr_code || ""
                                  );
                                  toast.success("Link de pagamento copiado");
                                } catch {
                                  toast.error("Não foi possível copiar o link");
                                }
                              }}
                            >
                              Copiar Link
                            </button>
                            <a
                              className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2"
                              href={
                                pixData.ticket_url || pixData.qr_code || "#"
                              }
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                // abrir em nova aba
                              }}
                            >
                              Abrir Link
                            </a>
                          </div>
                          <div className="mt-3 text-center text-xs text-gray-500">
                            <div>
                              Valor:{" "}
                              <strong>
                                R${" "}
                                {pixData.amount
                                  ? pixData.amount.toFixed(2)
                                  : "0,00"}
                              </strong>
                            </div>
                            <div>
                              Expira em:{" "}
                              {pixData.expires_at
                                ? new Date(pixData.expires_at).toLocaleString()
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Cartão de Crédito Form */}
                    {paymentMethod === "card" && !pixData && (
                      <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                        {/* Aviso se o pedido não foi criado ainda */}
                        {!currentOrderId &&
                          !localStorage.getItem("pendingOrderId") && (
                            <Alert className="border-rose-200 bg-rose-50 mb-6">
                              <AlertCircle className="h-4 w-4 text-rose-600" />
                              <AlertTitle className="text-rose-900">
                                Atenção
                              </AlertTitle>
                              <AlertDescription className="text-rose-800 text-sm">
                                Clique em &ldquo;Finalizar Compra&rdquo;
                                primeiro para criar seu pedido antes de
                                preencher os dados do cartão.
                              </AlertDescription>
                            </Alert>
                          )}

                        {paymentStatus === "pending" &&
                          pollingStatus === "polling" && (
                            <Alert className="border-blue-200 bg-blue-50 mb-6">
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                              <AlertDescription className="text-blue-800 text-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">
                                    Aguardando confirmação do pagamento...
                                  </span>
                                  <span className="text-xs">
                                    Verificação {pollingAttempts} de 60 • Não
                                    feche esta página
                                  </span>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                        <div className="max-w-md mx-auto">
                          <div className="mb-4 text-sm text-gray-700">
                            <div>
                              Valor: <strong>R$ {grandTotal.toFixed(2)}</strong>
                            </div>
                            {currentOrderId && (
                              <div className="text-xs text-gray-500 mt-1">
                                Pedido: {currentOrderId}
                              </div>
                            )}
                          </div>
                          <CreditCardForm
                            onSubmit={handleCreditCardPayment}
                            isProcessing={isProcessing}
                            defaultEmail={user?.email}
                            defaultName={user?.name}
                          />
                        </div>
                      </Card>
                    )}

                    {/* Resumo Final */}
                    <Card className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-2xl shadow-sm border-rose-200">
                      <h3 className="font-bold text-lg mb-4 text-gray-900">
                        Resumo do Pedido
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            R$ {cartTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa de entrega</span>
                          <span className="font-semibold">
                            {shippingCost === 0
                              ? "GRÁTIS"
                              : `R$ ${shippingCost?.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Forma de pagamento</span>
                          <span className="font-semibold">
                            {paymentMethod === "pix"
                              ? "PIX"
                              : paymentMethod === "card"
                              ? "Cartão de Crédito"
                              : "Não selecionado"}
                          </span>
                        </div>
                        <div className="border-t border-rose-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xl">Total</span>
                            <span className="font-bold text-rose-600 text-3xl">
                              R$ {grandTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Botões Finais */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <Button
                          onClick={handlePreviousStep}
                          variant="outline"
                          className="px-6 py-6 rounded-xl font-bold border-2 bg-transparent"
                          disabled={
                            isProcessing ||
                            paymentStatus === "pending" ||
                            isCanceling
                          }
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Voltar
                        </Button>

                        {currentOrderId && (
                          <Button
                            onClick={async () => {
                              const confirmed = window.confirm(
                                "Tem certeza que deseja cancelar esta compra? Todos os dados serão perdidos."
                              );

                              if (confirmed) {
                                const success = await handleCancelOrder();
                                if (success) {
                                  setCurrentOrderId(null);
                                  setPixData(null);
                                  setPaymentStatus("");
                                  setPaymentError(null);
                                  setPaymentMethod(undefined);
                                  setCurrentStep(1);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                  try {
                                    disconnectSSE?.();
                                  } catch {}
                                }
                              }
                            }}
                            variant="destructive"
                            className="px-6 py-6 rounded-xl font-bold"
                            disabled={
                              isProcessing ||
                              paymentStatus === "success" ||
                              isCanceling
                            }
                          >
                            {isCanceling ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Cancelando...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-5 w-5" />
                                Cancelar Compra
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {currentOrderId &&
                        paymentMethod &&
                        !pixData &&
                        paymentMethod === "pix" && (
                          <Alert className="border-blue-200 bg-blue-50">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            <AlertDescription className="text-blue-800 text-sm">
                              Gerando QR Code PIX...
                            </AlertDescription>
                          </Alert>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="sticky top-6"
              >
                <OrderSummary />
              </motion.div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
