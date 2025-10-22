"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useCartContext } from "@/app/hooks/cart-context";
import { useApi } from "@/app/hooks/use-api";
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
  ChevronLeftIcon,
  CalendarIcon,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodePIX } from "@/app/components/QRCodePIX";
import { formatPhoneNumber, isValidPhone } from "@/app/lib/phoneMask";
import {
  CreditCardForm,
  type CreditCardData,
} from "@/app/components/credit-card-form";
import { usePaymentPolling } from "@/app/hooks/use-payment-polling";

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

interface PixPaymentData {
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  amount: number;
  expires_at: string;
  payment_id: string;
  mercado_pago_id: string;
  status: string;
  status_detail: string;
  payer_info: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

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
  additional_colors?: Record<string, string>; // Mapeia additional_id -> color_id
  additionals?: Array<{
    id: string;
    name: string;
    price: number;
    colors?: Array<{
      color_id: string;
      color_name: string;
      color_hex_code: string;
      stock_quantity: number;
    }>;
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
}

// interface OrderSummaryCardProps {
//   originalTotal: number;
//   discountAmount: number;
//   cartTotal: number;
// }

// interface CheckoutButtonProps {
//   handleFinalizePurchase: () => void;
//   isProcessing: boolean;
//   zipCode: string;
//   address: string;
//   houseNumber: string;
//   city: string;
//   state: string;
//   customerPhone: string;
//   selectedDate: Date | undefined;
//   selectedTime: string;
//   cartItems: CartItem[];
//   cartTotal: number;
//   user?: {
//     name: string;
//     email: string;
//   };
//   paymentMethod: "" | "pix" | "card";
//   shippingCost: number | null;
//   grandTotal: number;
//   isAddressServed: boolean;
//   paymentStatus: PaymentStatusType;
//   paymentError: string | null;
//   pixData: PixPaymentData | null;
//   onViewPix: () => void;
// }

const formatCustomizationValue = (custom: CartCustomization) => {
  switch (custom.customization_type) {
    case "TEXT_INPUT":
      return custom.text?.trim() || "Mensagem não informada";
    case "MULTIPLE_CHOICE":
      return (
        custom.selected_option_label ||
        custom.selected_option ||
        "Opção não selecionada"
      );
    case "ITEM_SUBSTITUTION":
      if (custom.selected_item) {
        return `${custom.selected_item.original_item} → ${custom.selected_item.selected_item}`;
      }
      return "Substituição não definida";
    case "PHOTO_UPLOAD":
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
}: ProductCardProps) => (
  <div className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
    <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
      <Image
        src={item.product.image_url || "/placeholder.svg"}
        alt={item.product.name}
        fill
        className="object-cover"
      />
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
              // Buscar cor selecionada para este adicional
              const selectedColorId = item.additional_colors?.[add.id];
              const selectedColor = selectedColorId
                ? add.colors?.find((c) => c.color_id === selectedColorId)
                : null;

              return (
                <Badge
                  key={add.id}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 bg-rose-50 text-rose-700 border-rose-200 font-medium"
                >
                  + {add.name} (+R$ {add.price.toFixed(2)})
                  {selectedColor && (
                    <span className="flex items-center gap-1 ml-1">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{
                          backgroundColor: selectedColor.color_hex_code,
                        }}
                        title={selectedColor.color_name}
                      />
                      <span className="text-[10px]">
                        {selectedColor.color_name}
                      </span>
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        )}

        {item.customizations && item.customizations.length > 0 && (
          <div className="mb-2 space-y-1.5">
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
                item.customizations,
                item.additional_colors
              )
            }
            disabled={item.quantity <= 1}
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
                item.customizations,
                item.additional_colors
              )
            }
            className="h-9 w-9 hover:bg-gray-100 text-gray-700"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            removeFromCart(
              item.product_id,
              item.additional_ids,
              item.customizations,
              item.additional_colors
            )
          }
          className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="text-right flex flex-col justify-between">
      {item.discount && item.discount > 0 ? (
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400 line-through">
            R${" "}
            {(
              item.price * item.quantity +
              (item.customization_total || 0) * item.quantity +
              (item.additionals?.reduce(
                (sum: number, add) => sum + add.price * item.quantity,
                0
              ) || 0)
            ).toFixed(2)}
          </span>
          <span className="font-bold text-gray-900 text-lg">
            R${" "}
            {(
              (item.effectivePrice ?? item.price) * item.quantity +
              (item.additionals?.reduce(
                (sum: number, add) => sum + add.price * item.quantity,
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
              (sum: number, add) => sum + add.price * item.quantity,
              0
            ) || 0)
          ).toFixed(2)}
        </span>
      )}
    </div>
  </div>
);

export default function CarrinhoPage() {
  const { user, isLoading, login } = useAuth();
  const {
    getCepInfo,
    getUser,
    createTransparentPayment,
    createCardToken,
    getCardIssuers,
  } = useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    createOrder,
    getMinPreparationHours,
    generateTimeSlots,
    getDeliveryDateBounds,
  } = useCartContext();

  // Estado da etapa do checkout
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);

  const [calendarOpen, setCalendarOpen] = useState(false);

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
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [isSelfRecipient, setIsSelfRecipient] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"" | "pix" | "card">("");
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Hook de polling de pagamento
  const { status: pollingStatus, attempts: pollingAttempts } =
    usePaymentPolling({
      orderId: currentOrderId,
      enabled: Boolean(currentOrderId && paymentStatus === "pending"),
      maxAttempts: 60, // 5 minutos
      intervalMs: 5000, // 5 segundos
      onSuccess: (order) => {
        console.log("✅ Pagamento confirmado pelo webhook!", order);
        setPaymentStatus("success");
        // Limpar localStorage
        localStorage.removeItem("pendingOrderId");
        toast.success("Pagamento confirmado! Pedido realizado com sucesso.");
        // Aguardar 2 segundos antes de redirecionar
        setTimeout(() => {
          router.push("/pedidos");
        }, 2000);
      },
      onFailure: (order) => {
        console.log("❌ Pagamento rejeitado/cancelado", order);
        setPaymentStatus("failure");
        setPaymentError(
          "Pagamento recusado. Por favor, verifique os dados e tente novamente."
        );
        toast.error("Pagamento recusado. Verifique os dados do pagamento.");
      },
      onTimeout: () => {
        console.log("⏱️ Timeout ao aguardar confirmação");
        toast.warning(
          "Ainda não recebemos a confirmação do pagamento. Você pode acompanhar o status na página de pedidos.",
          { duration: 6000 }
        );
        // Não redireciona automaticamente no timeout
      },
    });

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

  const router = useRouter();

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

  // Sincronizar telefone do destinatário quando "eu vou receber" for marcado
  useEffect(() => {
    if (isSelfRecipient) {
      setRecipientPhone(customerPhone);
    }
  }, [isSelfRecipient, customerPhone]);

  useEffect(() => {
    if (user) {
      // Preencher CEP
      if (user.zip_code && !zipCode) {
        setZipCode(user.zip_code);
      }

      // Preencher cidade
      if (user.city && !city) {
        setCity(user.city);
      }

      // Preencher estado
      if (user.state && !state) {
        setState(user.state);
      }

      // Preencher telefone formatado
      if (user.phone && !customerPhone) {
        setCustomerPhone(formatPhoneNumber(user.phone));
      }

      // Preencher endereço completo
      if (user.address && !address) {
        const addressStr = user.address;

        if (!user.zip_code && !zipCode) {
          const cepMatch = addressStr.match(/CEP:\s*(\d{8})/);
          if (cepMatch) {
            setZipCode(cepMatch[1]);
          }
        }

        const streetMatch = addressStr.match(/^([^,]+),\s*(\w+)/);
        if (streetMatch) {
          setAddress(streetMatch[1].trim());
          setHouseNumber(streetMatch[2].trim());
        } else {
          setAddress(addressStr);
        }

        const neighborhoodMatch = addressStr.match(/-\s*([^,]+),/);
        if (neighborhoodMatch) {
          setNeighborhood(neighborhoodMatch[1].trim());
        }

        if (!user.city && !user.state && !city && !state) {
          const cityStateMatch = addressStr.match(/,\s*([^/]+)\/(\w{2})/);
          if (cityStateMatch) {
            setCity(cityStateMatch[1].trim());
            setState(cityStateMatch[2].trim());
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

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
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
  const shippingOptions = useMemo(() => {
    if (!isAddressServed || !shippingRule) {
      return { pix: null, card: null };
    }
    return {
      pix: shippingRule.pix,
      card: shippingRule.card,
    };
  }, [isAddressServed, shippingRule]);
  const shippingCost = useMemo(() => {
    if (!paymentMethod || !isAddressServed || !shippingRule) {
      return null;
    }
    return shippingRule[paymentMethod];
  }, [paymentMethod, isAddressServed, shippingRule]);
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
  const grandTotal = useMemo(
    () => cartTotal + (shippingCost ?? 0),
    [cartTotal, shippingCost]
  );

  useEffect(() => {
    if (!isAddressServed && paymentMethod) {
      setPaymentMethod("");
    }
  }, [isAddressServed, paymentMethod]);

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
      <div className="min-h-screen bg-background  flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background  flex items-center justify-center p-4">
        <Card className="border-border bg-card p-8 text-center max-w-md">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Faça login para continuar</h2>
          <p className="text-muted-foreground mb-6">
            Você precisa estar logado para acessar seu carrinho e finalizar
            compras.
          </p>
          <Button asChild className="w-full bg-rose-600 hover:bg-rose-700">
            <Link href="/login">Fazer Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleCardPayment = async (cardData: CreditCardData) => {
    console.log("🔍 handleCardPayment iniciado");
    console.log("📊 Estado atual antes do pagamento:", {
      currentOrderId,
      paymentMethod,
      cartItemsCount: cartItems.length,
      localStorageOrderId: localStorage.getItem("pendingOrderId"),
    });

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Verificar múltiplas fontes possíveis do orderId
      let orderId = currentOrderId;

      console.log("🔍 Verificando currentOrderId:", orderId);

      // Se não tiver currentOrderId, tentar obter do localStorage como fallback
      if (!orderId) {
        console.log(
          "⚠️ currentOrderId está vazio, verificando localStorage..."
        );
        const storedOrderId = localStorage.getItem("pendingOrderId");
        console.log("📦 localStorage pendingOrderId:", storedOrderId);

        if (storedOrderId) {
          orderId = storedOrderId;
          setCurrentOrderId(storedOrderId);
          console.log("✅ OrderId recuperado do localStorage:", orderId);
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

      console.log("✅ OrderId confirmado:", orderId);
      console.log("💳 Processando pagamento com cartão...", {
        orderId: orderId,
        installments: cardData.installments,
      });

      // ============================================================
      // Tokenização usando API do Mercado Pago via Backend
      // Esta é a abordagem mais confiável para ambiente de produção
      // ============================================================
      let cardTokenId: string | undefined = undefined;

      try {
        console.log("💳 Criando token via backend do Mercado Pago...");
        console.log("📋 Dados do cartão para tokenização:", {
          cardNumberLength: cardData.cardNumber.replace(/\s/g, "").length,
          hasSecurityCode: !!cardData.securityCode,
          expirationMonth: cardData.expirationMonth,
          expirationYear: cardData.expirationYear,
          hasCardholderName: !!cardData.cardholderName,
          identificationType: cardData.identificationType,
          hasIdentificationNumber: !!cardData.identificationNumber,
        });

        // Criar token usando o método autenticado do useApi
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

        console.log("✅ Token criado via backend:", {
          hasToken: !!tokenData.id,
          tokenLength: tokenData.id?.length,
          firstSixDigits: tokenData.first_six_digits,
          lastFourDigits: tokenData.last_four_digits,
        });

        // Extrair token
        cardTokenId = tokenData.id;
        const bin = tokenData.first_six_digits;

        console.log("🎟️ Token extraído:", {
          cardTokenId,
          bin: bin,
          lastDigits: tokenData.last_four_digits,
        });

        if (!cardTokenId || !bin) {
          throw new Error(
            "Falha ao gerar token do cartão. Verifique os dados e tente novamente."
          );
        }

        console.log("✅ Token gerado com sucesso:", cardTokenId);

        // Buscar issuer_id usando o BIN
        console.log("🏦 Buscando emissor do cartão...");
        const issuerData = await getCardIssuers({
          bin: bin,
          paymentMethodId: "master",
        });

        console.log("✅ Emissor encontrado:", issuerData);

        const issuerId = issuerData.issuer_id;
        const paymentMethodId = issuerData.payment_method_id; // "master", "visa", etc.

        if (!issuerId) {
          console.warn("⚠️ Emissor não encontrado, continuando sem issuer_id");
        }

        // Salvar issuer_id e payment_method_id no estado
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

      console.log("📤 Enviando pagamento com os seguintes dados:");
      console.log("  - orderId:", orderId);
      console.log("  - cardToken:", cardTokenId);
      console.log("  - paymentMethodId: credit_card");
      console.log(
        "  - payment_method_id:",
        (cardData as unknown as { paymentMethodId?: string }).paymentMethodId
      );
      console.log("  - installments:", cardData.installments);
      console.log(
        "  - issuerId:",
        (cardData as unknown as { issuerId?: string }).issuerId
      );

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
        cardholderName: cardData.cardholderName, // Nome do titular
        issuer_id: (cardData as unknown as { issuerId?: string }).issuerId,
        payment_method_id: (cardData as unknown as { paymentMethodId?: string })
          .paymentMethodId,
      });

      console.log("📦 Resposta do pagamento:", paymentResponse);

      if (!paymentResponse?.success) {
        throw new Error(
          paymentResponse?.message || "Erro ao processar pagamento"
        );
      }

      const rawStatus = paymentResponse.status || "pending";
      const normalizedStatus = mapPaymentStatus(rawStatus) || "pending";

      console.log(`📊 Status do pagamento: ${rawStatus} → ${normalizedStatus}`);

      setPaymentStatus(normalizedStatus);

      if (normalizedStatus === "success") {
        toast.success("Pagamento aprovado! Pedido confirmado.");
        // Limpar localStorage
        localStorage.removeItem("pendingOrderId");
        // Aguarda 1 segundo antes de redirecionar
        setTimeout(() => {
          router.push("/pedidos");
        }, 1000);
      } else if (normalizedStatus === "pending") {
        toast.info("Pagamento em análise. Aguardando confirmação...", {
          duration: 5000,
        });
        // O hook de polling vai continuar verificando o status
      } else {
        throw new Error("Pagamento recusado. Verifique os dados do cartão.");
      }
    } catch (error) {
      console.error("❌ Erro ao processar pagamento com cartão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setPaymentError(errorMessage);

      // Se o erro for relacionado ao pedido não encontrado, limpar o localStorage
      if (errorMessage.includes("Pedido não encontrado")) {
        localStorage.removeItem("pendingOrderId");
        setCurrentOrderId(null);
      }

      toast.error(`Erro no pagamento: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizePurchase = async () => {
    if (!zipCode.trim()) {
      toast.error("Por favor, informe o CEP");
      return;
    }
    if (!address.trim()) {
      toast.error("Por favor, informe o endereço");
      return;
    }
    if (!houseNumber.trim()) {
      toast.error("Por favor, informe o número da casa");
      return;
    }
    if (!city.trim()) {
      toast.error("Por favor, informe a cidade");
      return;
    }
    if (!state.trim()) {
      toast.error("Por favor, informe o estado");
      return;
    }
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
    if (!selectedDate) {
      toast.error("Por favor, selecione uma data de entrega");
      return;
    }
    if (!selectedTime) {
      toast.error("Por favor, selecione um horário de entrega");
      return;
    }

    if (!isAddressServed) {
      toast.error("Ainda não entregamos no endereço informado.");
      return;
    }

    if (!paymentMethod) {
      toast.error("Selecione uma forma de pagamento para continuar.");
      return;
    }

    if (shippingCost === null) {
      toast.error("Não foi possível calcular o frete para este endereço.");
      return;
    }

    const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

    let finalDeliveryDate: Date | null = null;
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      finalDeliveryDate = new Date(selectedDate);
      finalDeliveryDate.setHours(hours, minutes, 0, 0);
    }

    setIsProcessing(true);
    setPaymentError(null);
    try {
      const createdOrder = await createOrder(
        user.id,
        fullAddress,
        finalDeliveryDate || undefined,
        {
          shippingCost,
          paymentMethod,
          grandTotal,
          deliveryCity: city,
          deliveryState: state,
          recipientPhone: recipientPhone.replace(/\D/g, ""), // Remove caracteres não numéricos
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

      console.log("📦 Pedido criado - OrderId:", createdOrderId);
      console.log("💾 Salvando no localStorage e state...");

      // Salvar orderId no localStorage para persistência
      localStorage.setItem("pendingOrderId", createdOrderId);

      // Definir no estado
      setCurrentOrderId(createdOrderId);

      // Verificar se foi salvo corretamente
      const savedOrderId = localStorage.getItem("pendingOrderId");
      console.log("✅ Verificação - localStorage:", savedOrderId);
      console.log("✅ Verificação - estado será:", createdOrderId);

      if (paymentMethod === "card") {
        console.log(
          "💳 Método: Cartão - Aguardando preenchimento do formulário"
        );
        // Não precisa mais abrir dialog, o formulário já está na tela
        setIsProcessing(false);
        toast.info(
          "Preencha os dados do cartão abaixo para finalizar o pagamento."
        );
        return;
      }

      if (paymentMethod === "pix") {
        const paymentResponse = await createTransparentPayment({
          orderId: createdOrderId,
          paymentMethodId: "pix",
          payerEmail: user.email || "",
          payerName: user.name || "",
          // TODO: Adicionar campo de CPF no cadastro do usuário
          // Por enquanto usando CPF de teste para desenvolvimento
          payerDocument: "12345678909",
          payerDocumentType: "CPF",
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
            "Resposta inesperada do pagamento PIX:",
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
          amount: Number(responseData.amount ?? grandTotal) || grandTotal,
          expires_at:
            responseData.expires_at ||
            responseData.expiration_date ||
            responseData.expiration_time ||
            new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          payment_id:
            responseData.payment_id ||
            paymentResponse.paymentId ||
            createdOrderId,
          mercado_pago_id:
            responseData.mercado_pago_id || paymentResponse.mercadoPagoId || "",
          status: rawStatus,
          status_detail:
            responseData.status_detail || paymentResponse.status_detail || "",
          payer_info:
            responseData.payer_info ||
            ({
              email: user.email || undefined,
              first_name: user.name || undefined,
            } as PixPaymentData["payer_info"]),
        });

        setPaymentStatus(normalizedStatus);

        // Salvar orderId no localStorage
        localStorage.setItem("pendingOrderId", createdOrderId);

        // Não precisa mais abrir dialog, o QR Code já está na tela
        toast.success(
          "Pedido criado! Escaneie o QR Code abaixo para concluir o pagamento."
        );
      }
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setCurrentOrderId(null);
      setPixData(null);
      setPaymentStatus("");
      setPaymentError(errorMessage);
      // Limpar localStorage em caso de erro
      localStorage.removeItem("pendingOrderId");
      toast.error(`Erro ao processar pedido: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const originalTotal = cartItems.reduce((sum, item) => {
    const baseTotal = (item.effectivePrice ?? item.price) * item.quantity;
    const additionalsTotal =
      item.additionals?.reduce((a, add) => a + add.price * item.quantity, 0) ||
      0;
    return sum + baseTotal + additionalsTotal;
  }, 0);

  const discountAmount = originalTotal - cartTotal;

  // Validação da etapa 1 (carrinho)
  const canProceedToStep2 = cartItems.length > 0;

  // Validação da etapa 2 (dados de entrega)
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

  const handleNextStep = () => {
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2 && canProceedToStep3) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-rose-600 transition-colors font-medium"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              <h1 className="text-xl font-bold">Finalizar Compra</h1>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
            >
              <Link href="/">Continuar Comprando</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {cartItems.length === 0 ? (
          <Card className="border-gray-100 bg-white p-12 text-center shadow-sm rounded-2xl">
            <ShoppingCart className="h-20 w-20 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione alguns produtos deliciosos do nosso catálogo!
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-xl font-bold"
            >
              Ver Produtos
            </Button>
          </Card>
        ) : (
          <>
            {/* Stepper */}
            <CheckoutStepper currentStep={currentStep} />

            {/* Etapa 1: Revisão do Carrinho */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
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
                    disabled={!canProceedToStep2}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all"
                  >
                    Prosseguir para Entrega
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 2: Dados de Localização */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
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
                          const formatted = formatPhoneNumber(e.target.value);
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
                    </div>

                    {/* Bairro */}
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

                    {/* Cidade e Estado */}
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
                                className="w-full justify-start text-left border-2 border-gray-200 hover:border-rose-300 rounded-xl py-6"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate
                                  ? selectedDate.toLocaleDateString("pt-BR")
                                  : "Selecione uma data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  if (date) {
                                    setSelectedDate(date);
                                    setSelectedTime("");
                                  }
                                  setCalendarOpen(false);
                                }}
                                disabled={isDateDisabled}
                                className="rounded-md border"
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
                              onChange={(e) => setSelectedTime(e.target.value)}
                              title="Selecione o horário de entrega"
                              aria-label="Horário de entrega"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            >
                              <option value="">Selecione um horário</option>
                              {generateTimeSlots(selectedDate).map((slot) => (
                                <option key={slot.value} value={slot.value}>
                                  {slot.label}
                                </option>
                              ))}
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
                              💳 PIX
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
                              💳 Cartão de Crédito
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
                          <span className="text-gray-600">Taxa de entrega</span>
                          <span className="font-semibold text-orange-600">
                            Informe o endereço
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Botões de Navegação */}
                <div className="flex justify-between gap-4">
                  <Button
                    onClick={handlePreviousStep}
                    variant="outline"
                    className="px-6 py-6 rounded-xl font-bold border-2"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedToStep3}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Prosseguir para Pagamento
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 3: Pagamento */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Seleção de Método de Pagamento */}
                <Card className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border-gray-100">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-6 w-6 text-rose-600" />
                    Forma de Pagamento
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={paymentMethod === "pix" ? "default" : "outline"}
                      className={`py-8 text-base font-bold transition-all rounded-xl ${
                        paymentMethod === "pix"
                          ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md border-0"
                          : "border-2 border-gray-200 hover:border-rose-300 bg-white text-gray-700"
                      }`}
                      onClick={() => {
                        setPaymentMethod("pix");
                        setPaymentError(null);
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Smartphone className="h-8 w-8" />
                        <span>PIX</span>
                        {shippingOptions.pix !== null && (
                          <span className="text-xs opacity-80">
                            {shippingOptions.pix === 0
                              ? "Frete GRÁTIS 🎉"
                              : `Frete: R$ ${shippingOptions.pix.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      className={`py-8 text-base font-bold transition-all rounded-xl ${
                        paymentMethod === "card"
                          ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md border-0"
                          : "border-2 border-gray-200 hover:border-rose-300 bg-white text-gray-700"
                      }`}
                      onClick={() => {
                        setPaymentMethod("card");
                        setPaymentError(null);
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="h-8 w-8" />
                        <span>Cartão de Crédito</span>
                        {shippingOptions.card !== null && (
                          <span className="text-xs opacity-80">
                            {shippingOptions.card === 0
                              ? "Frete GRÁTIS 🎉"
                              : `Frete: R$ ${shippingOptions.card.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    </Button>
                  </div>

                  {paymentError && (
                    <Alert className="border-red-200 bg-red-50 mt-6">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {paymentError}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>

                {/* Mostrar QR Code PIX se PIX foi selecionado E já gerado */}
                {paymentMethod === "pix" && pixData && (
                  <Card className="bg-white p-6 rounded-2xl shadow-sm border-gray-100">
                    {/* Indicador de polling */}
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
                                Verificação {pollingAttempts} de 60 • Isso pode
                                levar alguns minutos
                              </span>
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

                    {currentOrderId && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                        <span className="font-medium text-gray-700">
                          🆔 Código do pedido:
                        </span>{" "}
                        {currentOrderId}
                      </div>
                    )}

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
                  </Card>
                )}

                {/* Mostrar Formulário de Cartão se CARD foi selecionado */}
                {paymentMethod === "card" && !pixData && (
                  <Card className="bg-white p-6 rounded-2xl shadow-sm border-gray-100">
                    {/* Aviso se o pedido não foi criado ainda */}
                    {!currentOrderId &&
                      !localStorage.getItem("pendingOrderId") && (
                        <Alert className="border-amber-200 bg-amber-50 mb-6">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-900">
                            Atenção
                          </AlertTitle>
                          <AlertDescription className="text-amber-800 text-sm">
                            Clique em &ldquo;Finalizar Compra&rdquo; primeiro
                            para criar seu pedido antes de preencher os dados do
                            cartão.
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
                                Verificação {pollingAttempts} de 60 • Não feche
                                esta página
                              </span>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                    <CreditCardForm
                      onSubmit={handleCardPayment}
                      isProcessing={isProcessing}
                      defaultEmail={user?.email}
                      defaultName={user?.name}
                    />
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
                <div className="flex justify-between gap-4">
                  <Button
                    onClick={handlePreviousStep}
                    variant="outline"
                    className="px-6 py-6 rounded-xl font-bold border-2"
                    disabled={isProcessing || paymentStatus === "pending"}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Voltar
                  </Button>

                  {/* Só mostrar botão de pagamento se ainda não tiver gerado */}
                  {!pixData && !currentOrderId && (
                    <Button
                      onClick={handleFinalizePurchase}
                      disabled={isProcessing || !paymentMethod}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-12 py-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          Gerar Pagamento
                          <CheckCircle2 className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
