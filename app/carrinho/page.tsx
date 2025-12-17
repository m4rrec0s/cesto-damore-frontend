"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useCartContext } from "@/app/hooks/cart-context";
import { motion, AnimatePresence, easeIn, easeOut } from "framer-motion";
import { type Order, useApi } from "@/app/hooks/use-api";
import { usePaymentManager } from "@/app/hooks/use-payment-manager";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Calendar } from "@/app/components/ui/calendar";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
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
  MapPin,
  CalendarIcon,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  XCircle,
  RefreshCcw,
  Car,
  Store,
  Info,
} from "lucide-react";
import { CustomizationsReview } from "./components/CustomizationsReview";
import { TimeSlotSelector } from "./components/TimeSlotSelector";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  isValidPhone,
  normalizePhoneForBackend,
  formatPhoneNumber,
} from "@/app/lib/phoneMask";
import { getInternalImageUrl } from "@/lib/image-helper";
import { LoadingPayment } from "@/app/components/LoadingPayment";
import { OrderConfirmationTicket } from "@/app/components/OrderConfirmationTicket";
import { usePaymentPolling } from "@/app/hooks/use-payment-polling";
import { useWebhookNotification } from "@/app/hooks/use-webhook-notification";
import { QRCodePIX, type PixData } from "@/app/components/QRCodePIX";
import {
  MPCardPaymentForm,
  type MPCardFormData,
} from "@/app/components/mp-card-payment-form";
import { PaymentMethodSelector } from "@/app/components/payment-method-selector";
import { Input } from "../components/ui/input";

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
        custom.label_selected ||
        custom.selected_option_label ||
        custom.selected_option ||
        "Opção não selecionada"
      );
    case "BASE_LAYOUT":
      // BASE_LAYOUT sempre deve retornar o label_selected
      if (custom.label_selected) return custom.label_selected;
      // Fallback se não houver label_selected
      if (custom.selected_item_label) return custom.selected_item_label;
      if (typeof custom.selected_item === "string") {
        return custom.selected_item;
      }
      if (
        custom.selected_item &&
        typeof custom.selected_item === "object" &&
        "selected_item" in custom.selected_item
      ) {
        return (
          (custom.selected_item as { selected_item?: string }).selected_item ||
          "Layout selecionado"
        );
      }
      return "Layout selecionado";
    case "IMAGES":
      return `${custom.photos?.length || 0} foto(s)`;
    default:
      return "Personalização";
  }
};
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
const ProductCard = ({
  item,
  updateQuantity,
  removeFromCart,
  isProcessing,
}: ProductCardProps) => {
  return (
    <div className="flex gap-6 py-6 border-b border-gray-100 last:border-0">
      <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <Image
          src={
            getInternalImageUrl(item.product.image_url) || "/placeholder.png"
          }
          alt={item.product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
              {item.product.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1">
              {item.product.description}
            </p>
          </div>
          <Button
            onClick={() =>
              removeFromCart(
                item.product_id,
                item.additional_ids,
                item.customizations
              )
            }
            disabled={isProcessing}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {item.additionals && item.additionals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.additionals.map((add) => {
                return (
                  <span
                    key={add.id}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium"
                  >
                    + {add.name}
                  </span>
                );
              })}
            </div>
          )}

          {item.customizations && item.customizations.length > 0 && (
            <div className="space-y-1">
              {item.customizations.map((customization, index) => (
                <div
                  key={`${customization.customization_id}-${index}`}
                  className="text-xs text-gray-600 flex items-center gap-1"
                >
                  <span className="font-medium">{customization.title}:</span>
                  <span className="truncate max-w-[200px]">
                    {formatCustomizationValue(customization)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-lg p-1">
              <Button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity - 1,
                    item.additional_ids,
                    item.customizations
                  )
                }
                disabled={isProcessing || item.quantity <= 1}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold text-gray-900">
                {item.quantity}
              </span>
              <Button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity + 1,
                    item.additional_ids,
                    item.customizations
                  )
                }
                disabled={isProcessing}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="text-right">
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
        </div>
      </div>
    </div>
  );
};

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
    setOrderMetadata,
    createOrder,
    getMinPreparationHours,
    getMaxProductionTime,
    generateTimeSlots,
    getDeliveryDateBounds,
    isDateDisabledInCalendar,
    updateCustomizations,
  } = useCartContext();

  const {
    pendingOrder,
    hasPendingOrder,
    handleCancelOrder,
    clearPendingOrder,
    isCanceling,
  } = usePaymentManager();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [optionSelected, setOptionSelected] = useState<string>("delivery");

  // Callback para atualizar customizações no carrinho (quando não há orderId)
  const handleCustomizationUpdate = useCallback(
    (
      productId: string,
      customizations: import("@/app/types/customization").CustomizationInput[]
    ) => {
      // Encontrar o item no carrinho
      const cartItem = cart.items.find((item) => item.product_id === productId);
      if (!cartItem) {
        console.warn("Item não encontrado no carrinho:", productId);
        return;
      }

      // Converter CustomizationInput[] para CartCustomization[]
      const newCartCustomizations: CartCustomization[] = customizations.map(
        (c) => {
          const data = c.data as Record<string, unknown>;
          return {
            customization_id: c.ruleId || c.customizationRuleId || "",
            customization_type:
              c.customizationType as import("@/app/hooks/use-api").CustomizationTypeValue,
            title: (data?._customizationName as string) || c.customizationType,
            is_required: true,
            price_adjustment: (data?._priceAdjustment as number) || 0,
            // Campos específicos por tipo
            text:
              c.customizationType === "TEXT"
                ? (data?.text as string)
                : undefined,
            photos:
              c.customizationType === "IMAGES"
                ? (data?.photos as CartCustomization["photos"])
                : undefined,
            // ✅ Map missed fields
            selected_option: (data?.selected_option as string) || undefined,
            selected_option_label:
              (data?.selected_option_label as string) || undefined,
            label_selected:
              (data?.label_selected as string) ||
              (data?.selected_option_label as string) ||
              undefined,
            selected_item:
              (data?.selected_item as
                | {
                    original_item: string;
                    selected_item: string;
                    price_adjustment: number;
                  }
                | undefined) || undefined,
            selected_item_label:
              (data?.selected_item_label as string) || undefined,
            additional_time: (data?.additional_time as number) || 0,
            data: data, // ✅ Store full data object
          };
        }
      );

      // Atualizar no carrinho
      updateCustomizations(
        productId,
        cartItem.customizations || [],
        newCartCustomizations,
        cartItem.additional_ids,
        cartItem.additional_colors
      );

      toast.success("Personalização atualizada no carrinho!");
    },
    [cart.items, updateCustomizations]
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
    maxAttempts: 60,
    intervalMs: 3000,
    onSuccess: handlePaymentSuccess,
    onFailure: () => {
      setPaymentStatus("failure");
      setPaymentError(
        "Pagamento recusado. Por favor, verifique os dados e tente novamente."
      );
      toast.error("Pagamento recusado. Verifique os dados do pagamento.");
    },
    onTimeout: () => {
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

  // Handler para pagamento com cartão via MP SDK (já vem tokenizado)
  const handleMPCardPayment = async (cardData: MPCardFormData) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      let orderId = currentOrderId;

      if (!orderId) {
        const storedOrderId = localStorage.getItem("pendingOrderId");
        if (storedOrderId) {
          orderId = storedOrderId;
          setCurrentOrderId(orderId);
        }
      }

      if (!orderId) {
        throw new Error("Pedido não encontrado. Por favor, tente novamente.");
      }

      // Salvar documento do pagador
      if (cardData.payer?.identification?.number) {
        setUserDocument(cardData.payer.identification.number);
      }

      // ✅ Atualizar frete no backend antes de processar pagamento
      // Isso garante que o grand_total no backend bata com o valor enviado
      if (typeof shippingCost === "number") {
        await updateOrderMetadata(orderId, {
          shipping_price: shippingCost,
        });
      }

      const paymentResponse = await createTransparentPayment({
        orderId: orderId,
        paymentMethodId: "credit_card",
        installments: cardData.installments || 1,
        payerEmail: cardData.payer.email,
        payerName: user?.name || "Cliente",
        payerDocument: cardData.payer.identification.number,
        payerDocumentType:
          cardData.payer.identification.type === "CPF" ? "CPF" : "CNPJ",
        cardToken: cardData.token,
        cardholderName: user?.name || "Cliente",
        issuer_id: cardData.issuer_id,
        payment_method_id: cardData.payment_method_id,
      });

      // Verificar se a requisição foi bem-sucedida
      if (!paymentResponse?.success) {
        throw new Error(
          paymentResponse?.message || "Erro ao processar pagamento"
        );
      }

      // Verificar o status real do pagamento retornado pelo MP
      const rawStatus =
        paymentResponse.data?.status || paymentResponse.status || "pending";
      const statusDetail =
        paymentResponse.data?.status_detail ||
        paymentResponse.status_detail ||
        "";
      const normalizedStatus = mapPaymentStatus(rawStatus) || "pending";

      console.log("📊 Status do pagamento:", {
        rawStatus,
        statusDetail,
        normalizedStatus,
      });

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
      } else if (normalizedStatus === "failure") {
        // Pagamento foi rejeitado - permitir nova tentativa
        const friendlyMessage = getFriendlyPaymentError(statusDetail);
        setPaymentError(friendlyMessage);
        toast.error(friendlyMessage);
        // Não lançar erro - apenas mostrar mensagem e permitir nova tentativa
      } else {
        throw new Error("Pagamento recusado. Verifique os dados do cartão.");
      }
    } catch (error) {
      console.error("❌ Erro ao processar pagamento MP Card:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setPaymentError(errorMessage);
      toast.error(`Erro no pagamento: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para traduzir erros do Mercado Pago para mensagens amigáveis
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
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      <Card className="bg-white p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-3 mb-8">
                          <ShoppingCart className="h-7 w-7 text-rose-600" />
                          <h2 className="text-3xl font-bold text-gray-900">
                            Seus Produtos ({cartItems.length})
                          </h2>
                        </div>
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
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      <Card className="bg-white p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-3 mb-8">
                          <MapPin className="h-7 w-7 text-rose-600" />
                          <h2 className="text-3xl font-bold text-gray-900">
                            Dados de Entrega
                          </h2>
                        </div>

                        <div className="space-y-6">
                          {/* Telefone */}
                          {/* Opção de Entrega (Delivery / Pickup) */}
                          <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-900 mb-4">
                              Como você quer receber seu pedido?
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                onClick={() => setOptionSelected("delivery")}
                                className={`
                                  relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3
                                  ${
                                    optionSelected === "delivery"
                                      ? "border-rose-500 bg-rose-50 text-rose-700 shadow-md transform scale-105"
                                      : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                  }
                                `}
                              >
                                {optionSelected === "delivery" && (
                                  <div className="absolute top-2 right-2 text-rose-500">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                )}
                                <Car
                                  className={`w-8 h-8 ${
                                    optionSelected === "delivery"
                                      ? "text-rose-600"
                                      : "text-gray-400"
                                  }`}
                                />
                                <span className="font-bold">Entrega</span>
                              </button>

                              <button
                                onClick={() => setOptionSelected("pickup")}
                                className={`
                                  relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3
                                  ${
                                    optionSelected === "pickup"
                                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-md transform scale-105"
                                      : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                                  }
                                `}
                              >
                                {optionSelected === "pickup" && (
                                  <div className="absolute top-2 right-2 text-purple-500">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                )}
                                <Store
                                  className={`w-8 h-8 ${
                                    optionSelected === "pickup"
                                      ? "text-purple-600"
                                      : "text-gray-400"
                                  }`}
                                />
                                <span className="font-bold">Retirada</span>
                                {paymentMethod === "pix" && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                    - R$ 10,00 OFF
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Se for Delivery: Mostra campos de endereço */}
                          {optionSelected === "delivery" ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                              {/* Campos de endereço existentes */}
                              <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">
                                  CEP *
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    type="text"
                                    value={zipCode}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(
                                        /\D/g,
                                        ""
                                      );
                                      setZipCode(value);
                                      if (value.length === 8)
                                        handleCepSearch(value);
                                    }}
                                    maxLength={8}
                                    placeholder="00000000"
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                  />
                                  <button
                                    onClick={() => handleCepSearch(zipCode)}
                                    disabled={
                                      isLoadingCep || zipCode.length !== 8
                                    }
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium text-sm"
                                  >
                                    {isLoadingCep ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      "Buscar"
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                  <label className="block text-sm font-bold text-gray-900 mb-2">
                                    Rua *
                                  </label>
                                  <Input
                                    placeholder="Rua. ABC"
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-gray-900 mb-2">
                                    Número *
                                  </label>
                                  <Input
                                    placeholder="001"
                                    type="text"
                                    value={houseNumber}
                                    onChange={(e) =>
                                      setHouseNumber(e.target.value)
                                    }
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">
                                  Complemento
                                </label>
                                <Input
                                  type="text"
                                  value={complemento}
                                  onChange={(e) =>
                                    setComplemento(e.target.value)
                                  }
                                  placeholder="Apto, Bloco, Ponto de referência..."
                                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">
                                  Bairro *
                                </label>
                                <Input
                                  placeholder="Jardim Tavares"
                                  type="text"
                                  value={neighborhood}
                                  onChange={(e) =>
                                    setNeighborhood(e.target.value)
                                  }
                                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-bold text-gray-900 mb-2">
                                    Cidade *
                                  </label>
                                  <Input
                                    placeholder="Campina Grande"
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-gray-900 mb-2">
                                    Estado *
                                  </label>
                                  <Input
                                    type="text"
                                    value={state}
                                    onChange={(e) =>
                                      setState(e.target.value.toUpperCase())
                                    }
                                    maxLength={2}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                  />
                                </div>
                              </div>

                              {addressWarning && (
                                <Alert
                                  variant="destructive"
                                  className="bg-red-50 border-red-200 text-red-800"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-sm font-medium">
                                    {addressWarning}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ) : (
                            // Se for Retirada: Mostra local de retirada
                            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
                              <div className="flex items-start gap-4">
                                <div className="bg-purple-100 p-3 rounded-full">
                                  <MapPin className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-purple-900 text-lg mb-1">
                                    Local de Retirada
                                  </h3>
                                  <p className="text-purple-700 font-medium">
                                    R. Dr. Raif Ramalho, 350 - Jardim Tavares,
                                    Campina Grande - PB, 58402-025
                                  </p>
                                  <p className="text-purple-600 text-sm mt-1">
                                    O endereço completo será enviado após a
                                    confirmação do pedido.
                                  </p>
                                  <div className="mt-4 flex items-center gap-2 text-sm text-purple-800 bg-white/50 p-2 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>Economize o valor do frete</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Telefone para contato (Comum a ambos) */}
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Seu Telefone (WhatsApp) *
                            </label>
                            <Input
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
                                  Telefone incompleto
                                </p>
                              )}
                          </div>

                          <Label className="block text-sm font-bold text-gray-900 mb-2 mt-4">
                            Documento (CPF ou CNPJ) *
                          </Label>
                          <Input
                            type="text"
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            value={formatDocument(userDocument)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              setUserDocument(value);
                            }}
                            maxLength={18}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all mb-6"
                          />
                          {userDocument.length > 0 &&
                            userDocument.length < 11 && (
                              <p className="text-xs text-red-600 font-medium mb-4">
                                Documento inválido (mínimo 11 dígitos)
                              </p>
                            )}

                          {optionSelected === "delivery" && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="block text-sm font-bold text-gray-900 mb-2">
                                Telefone do Destinatário *
                              </label>
                              <div className="mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Input
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
                                  <Input
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
                                        Telefone incompleto
                                      </p>
                                    )}
                                  <div className="mt-3 flex items-center gap-3">
                                    <Info className="w-5 h-5 text-purple-600" />
                                    <p className="text-sm text-gray-600">
                                      Usaremos este número apenas se tivermos
                                      problemas na entrega.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {optionSelected === "delivery" && (
                            <label className="inline-flex items-center">
                              <Input
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
                          )}
                        </div>

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
                              <strong>Tempo de preparo:</strong>{" "}
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
                                <Label className="block text-sm font-bold text-gray-900 mb-3">
                                  Horário *
                                </Label>
                                <TimeSlotSelector
                                  slots={generateTimeSlots(selectedDate)}
                                  selectedValue={selectedTime}
                                  onSelect={(value) => setSelectedTime(value)}
                                  disabled={isProcessing}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>

                      <CustomizationsReview
                        cartItems={cart.items}
                        orderId={currentOrderId}
                        onCustomizationUpdate={handleCustomizationUpdate}
                        onCustomizationSaved={() => {
                          // Recarregar dados após salvar customização
                          console.log("✅ Customização salva com sucesso!");
                        }}
                      />

                      <div className="flex justify-start gap-4">
                        <Button
                          onClick={handlePreviousStep}
                          variant="outline"
                          className="px-6 py-6 rounded-xl font-bold border-2 bg-transparent"
                          disabled={isProcessing}
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Voltar
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
                      {/* Status de sucesso */}
                      {paymentStatus === "success" ? (
                        <Card className="p-8 text-center bg-green-50 border-green-200">
                          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-bold text-green-800 mb-2">
                            Pagamento Confirmado!
                          </h3>
                          <p className="text-green-700 mb-6">
                            Seu pedido foi realizado com sucesso.
                          </p>
                          <Button
                            onClick={() => {
                              clearCart();
                              clearPendingOrder();
                              localStorage.removeItem("pendingOrderId");
                              router.push("/pedidos");
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Ver Meus Pedidos
                          </Button>
                        </Card>
                      ) : (
                        <>
                          {/* Seletor de Método de Pagamento */}
                          {!paymentMethod && !isProcessing && (
                            <Card className="p-6 bg-white border-0 shadow-lg rounded-2xl">
                              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CreditCard className="h-6 w-6 text-rose-600" />
                                Escolha a forma de pagamento
                              </h3>

                              {/* Info sobre frete */}
                              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  💡 <strong>Dica:</strong> O frete é calculado
                                  de acordo com a forma de pagamento escolhida.
                                  {shippingRule && (
                                    <span className="block mt-1">
                                      PIX:{" "}
                                      <strong>
                                        R$ {shippingRule.pix.toFixed(2)}
                                      </strong>{" "}
                                      | Cartão:{" "}
                                      <strong>
                                        R$ {shippingRule.card.toFixed(2)}
                                      </strong>
                                    </span>
                                  )}
                                </p>
                              </div>

                              <PaymentMethodSelector
                                selectedMethod={paymentMethod}
                                onMethodChange={(method) => {
                                  setPaymentMethod(method);
                                  setPaymentError(null);
                                  setPixData(null);
                                  // Tentar recuperar orderId do localStorage se não existir
                                  if (!currentOrderId) {
                                    const storedOrderId =
                                      localStorage.getItem("pendingOrderId");
                                    if (storedOrderId) {
                                      setCurrentOrderId(storedOrderId);
                                      console.log(
                                        "📦 Pedido recuperado do localStorage:",
                                        storedOrderId
                                      );
                                    }
                                  }
                                }}
                              />
                            </Card>
                          )}

                          {/* Processando */}
                          {isProcessing && (
                            <LoadingPayment paymentMethod={paymentMethod} />
                          )}

                          {/* Formulário PIX */}
                          {paymentMethod === "pix" && !isProcessing && (
                            <>
                              {pixData ? (
                                <QRCodePIX
                                  pixData={pixData}
                                  onCopyCode={() =>
                                    toast.success("Código PIX copiado!")
                                  }
                                />
                              ) : isGeneratingPix ? (
                                <Card className="p-8 text-center">
                                  <Loader2 className="h-12 w-12 animate-spin text-rose-500 mx-auto mb-4" />
                                  <p className="text-gray-600">
                                    Gerando QR Code PIX...
                                  </p>
                                </Card>
                              ) : (
                                <Card className="p-6 bg-white border-0 shadow-lg rounded-2xl">
                                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Pagamento via PIX
                                  </h3>
                                  <p className="text-gray-600 mb-4">
                                    Clique no botão abaixo para gerar o QR Code
                                    PIX.
                                  </p>
                                  <Button
                                    onClick={generatePixPayment}
                                    disabled={!currentOrderId}
                                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 py-6 text-lg font-bold"
                                  >
                                    Gerar QR Code PIX
                                  </Button>
                                </Card>
                              )}
                            </>
                          )}

                          {/* Formulário de Cartão - MercadoPago */}
                          {paymentMethod === "card" && !isProcessing && (
                            <>
                              {currentOrderId ? (
                                <MPCardPaymentForm
                                  key={grandTotal}
                                  amount={grandTotal}
                                  orderId={currentOrderId}
                                  payerEmail={user?.email || ""}
                                  payerName={user?.name || ""}
                                  onSubmit={handleMPCardPayment}
                                  isProcessing={isProcessing}
                                />
                              ) : (
                                <Card className="p-6 bg-amber-50 border-amber-200">
                                  <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div>
                                      <p className="text-amber-800 font-medium">
                                        Pedido não encontrado
                                      </p>
                                      <p className="text-sm text-amber-700 mt-1">
                                        Não foi possível carregar o formulário
                                        de pagamento. Tente voltar ao passo
                                        anterior e avançar novamente.
                                      </p>
                                      <Button
                                        onClick={() => {
                                          // Tentar recuperar do localStorage
                                          const storedOrderId =
                                            localStorage.getItem(
                                              "pendingOrderId"
                                            );
                                          if (storedOrderId) {
                                            setCurrentOrderId(storedOrderId);
                                            toast.success("Pedido recuperado!");
                                          } else {
                                            setCurrentStep(2);
                                            toast.info(
                                              "Volte a avançar para criar o pedido."
                                            );
                                          }
                                        }}
                                        className="mt-3 bg-amber-600 hover:bg-amber-700"
                                      >
                                        Tentar novamente
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </>
                          )}

                          {/* Erro */}
                          {paymentError && (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-700">
                                {paymentError}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Botão para trocar método */}
                          {paymentMethod && !isProcessing && !pixData && (
                            <Button
                              onClick={() => {
                                setPaymentMethod(undefined);
                                setPaymentError(null);
                              }}
                              variant="outline"
                              className="w-full py-4"
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Trocar forma de pagamento
                            </Button>
                          )}
                        </>
                      )}

                      {/* Botões de Navegação */}
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

                        {/* Status de espera PIX */}
                        {paymentMethod === "pix" &&
                          pixData &&
                          paymentStatus === "pending" && (
                            <Alert className="border-blue-200 bg-blue-50">
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                              <AlertDescription className="text-blue-800 text-sm">
                                Aguardando confirmação do pagamento...
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
        </div>
      )}
      {/* -- Overlay with check animation -- */}
      <AnimatePresence>
        {confirmationState === "animating" && (
          <motion.div
            className="fixed inset-0 bg-white z-50 flex items-center justify-center"
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
