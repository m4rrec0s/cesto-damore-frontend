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
  Smartphone,
  MapPin,
  ChevronRightIcon,
  CalendarIcon,
  ShoppingCart,
  ChevronLeftIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuTrigger,
// } from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { cn } from "@/app/lib/utils";
import { QRCodePIX } from "@/app/components/QRCodePIX";
import {
  formatPhoneNumber,
  isValidPhone,
  unformatPhoneNumber,
} from "@/app/lib/phoneMask";
import {
  CreditCardForm,
  type CreditCardData,
} from "@/app/components/credit-card-form";

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

interface OrderSummaryCardProps {
  originalTotal: number;
  discountAmount: number;
  cartTotal: number;
}

interface CheckoutButtonProps {
  handleFinalizePurchase: () => void;
  isProcessing: boolean;
  zipCode: string;
  address: string;
  houseNumber: string;
  city: string;
  state: string;
  customerPhone: string;
  selectedDate: Date | undefined;
  selectedTime: string;
  cartItems: CartItem[];
  cartTotal: number;
  user?: {
    name: string;
    email: string;
  };
  paymentMethod: "" | "pix" | "card";
  shippingCost: number | null;
  grandTotal: number;
  isAddressServed: boolean;
  paymentStatus: PaymentStatusType;
  paymentError: string | null;
  pixData: PixPaymentData | null;
  onViewPix: () => void;
}

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

// Componentes funcionais para o layout responsivo
const ProductCard = ({
  item,
  updateQuantity,
  removeFromCart,
}: ProductCardProps) => (
  <div className="flex gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:border-muted-foreground/20">
    <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 rounded-md overflow-hidden">
      <Image
        src={item.product.image_url || "/placeholder.svg"}
        alt={item.product.name}
        fill
        className="object-cover"
      />
    </div>

    <div className="flex flex-1 flex-col justify-between min-w-0">
      <div>
        <h3 className="font-medium text-base mb-1 line-clamp-2">
          {item.product.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
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
                  className="text-xs flex items-center gap-1"
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
          <div className="mb-2 space-y-1">
            {item.customizations.map((customization) => (
              <div
                key={customization.customization_id}
                className="flex items-start gap-2 rounded-md border border-dashed border-rose-200 bg-rose-50/70 px-2 py-1 text-xs"
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
        <div className="flex items-center gap-2 rounded-md border border-border">
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
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">
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
            className="h-8 w-8"
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
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="text-right flex flex-col justify-between">
      {item.discount && item.discount > 0 ? (
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground line-through">
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
          <span className="font-semibold">
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
        <span className="font-semibold">
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

const OrderSummaryCard = ({
  originalTotal,
  discountAmount,
  cartTotal,
  selectedDate,
  selectedTime,
  calendarOpen,
  setCalendarOpen,
  setSelectedDate,
  setSelectedTime,
  isDateDisabled,
  generateTimeSlots,
  getMinPreparationHours,
  address,
  prepareAddressForEditing,
  className,
  paymentMethod,
  setPaymentMethod,
  shippingCost,
  shippingOptions,
  grandTotal,
  isAddressServed,
  addressWarning,
  acceptedCities,
}: OrderSummaryCardProps & {
  selectedDate: Date | undefined;
  selectedTime: string;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedTime: (time: string) => void;
  isDateDisabled: (date: Date) => boolean;
  generateTimeSlots: (date: Date) => Array<{ value: string; label: string }>;
  getMinPreparationHours: () => number;
  address: string;
  prepareAddressForEditing: () => void;
  className?: string;
  paymentMethod: "" | "pix" | "card";
  setPaymentMethod: (method: "pix" | "card") => void;
  shippingCost: number | null;
  shippingOptions: { pix: number | null; card: number | null };
  grandTotal: number;
  isAddressServed: boolean;
  addressWarning?: string | null;
  acceptedCities: string[];
}) => (
  <Card className={cn("p-6 lg:p-8", className)}>
    <h3 className="text-xl font-semibold mb-6">Resumo do Pedido</h3>

    {/* Resumo financeiro */}
    <div className="space-y-3 text-sm mb-6">
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          {discountAmount > 0 ? "Subtotal dos produtos" : "Subtotal"}
        </span>
        <span className="font-medium">R$ {originalTotal.toFixed(2)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between">
          <span className="text-green-600">Desconto aplicado</span>
          <span className="text-green-600 font-medium">
            - R$ {discountAmount.toFixed(2)}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal com descontos</span>
        <span className="font-medium">R$ {cartTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Taxa de entrega</span>
        <span
          className={cn(
            "font-medium",
            shippingCost === 0 ? "font-semibold text-green-600" : "",
            !isAddressServed && address ? "text-red-600" : ""
          )}
        >
          {!address
            ? "Informe o endereço"
            : !isAddressServed
            ? "Indisponível"
            : shippingCost === null
            ? "Selecione o pagamento"
            : shippingCost === 0
            ? "GRÁTIS"
            : `R$ ${shippingCost.toFixed(2)}`}
        </span>
      </div>
      {paymentMethod && isAddressServed && shippingCost !== null && (
        <p className="text-xs text-muted-foreground">
          {paymentMethod === "pix"
            ? "Pagamento via PIX"
            : "Pagamento via Cartão de Crédito"}
          {" · "}
          {shippingCost === 0
            ? "Frete gratuito para este endereço"
            : `Frete de R$ ${shippingCost.toFixed(2)}`}
        </p>
      )}
      <div className="border-t border-border pt-3">
        <div className="flex justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">R$ {grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    {addressWarning && (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{addressWarning}</p>
        <p className="mt-2 text-xs text-red-600">
          Cidades atendidas: {acceptedCities.join(", ")} - PB.
        </p>
      </div>
    )}

    <div className="mb-6 space-y-4">
      <h4 className="text-base font-semibold">Forma de Pagamento</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={paymentMethod === "pix" ? "default" : "outline"}
          className={cn(
            "w-full justify-between gap-2 border px-3 py-2 text-sm transition",
            paymentMethod === "pix"
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "border-border hover:border-muted-foreground/20"
          )}
          onClick={() => setPaymentMethod("pix")}
          disabled={!isAddressServed}
        >
          <span>PIX</span>
          <span
            className={cn(
              "text-xs sm:text-[11px]",
              paymentMethod === "pix"
                ? "text-white/80"
                : "text-muted-foreground"
            )}
          >
            {shippingOptions.pix === null
              ? "--"
              : shippingOptions.pix === 0
              ? "Frete grátis"
              : `Frete R$ ${shippingOptions.pix.toFixed(2)}`}
          </span>
        </Button>
        <Button
          type="button"
          variant={paymentMethod === "card" ? "default" : "outline"}
          className={cn(
            "w-full justify-between gap-2 border px-3 py-2 text-sm transition",
            paymentMethod === "card"
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "border-border hover:border-muted-foreground/20"
          )}
          onClick={() => setPaymentMethod("card")}
          disabled={!isAddressServed}
        >
          <span>Cartão de Crédito</span>
          <span
            className={cn(
              "text-xs sm:text-[11px]",
              paymentMethod === "card"
                ? "text-white/80"
                : "text-muted-foreground"
            )}
          >
            {shippingOptions.card === null
              ? "--"
              : shippingOptions.card === 0
              ? "Frete grátis"
              : `Frete R$ ${shippingOptions.card.toFixed(2)}`}
          </span>
        </Button>
      </div>
      {!isAddressServed && address && (
        <p className="text-xs text-muted-foreground">
          Informe um endereço atendido para habilitar as formas de pagamento.
        </p>
      )}
    </div>

    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 data-[state=open]:bg-rose-50">
        <span>Configurar Entrega e Agendamento</span>
        <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4" />
            Informações de Entrega
          </h4>
          <div className="text-xs text-gray-500 mb-3">
            {address ? (
              <div>
                {(() => {
                  const parts = address.split(" - ");
                  const streetPart = parts[0] || "";
                  const neighborhoodPart = parts[1] || "";
                  const cityStatePart = parts[2] || "";

                  return (
                    <div>
                      <p>
                        <strong>Endereço:</strong> {streetPart}
                      </p>
                      {neighborhoodPart && (
                        <p>
                          <strong>Bairro:</strong> {neighborhoodPart}
                        </p>
                      )}
                      {cityStatePart && (
                        <p>
                          <strong>Cidade/Estado:</strong> {cityStatePart}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p>Adicionar Endereço de Entrega</p>
            )}
          </div>
          <Button
            onClick={prepareAddressForEditing}
            className="text-rose-500 hover:text-rose-600 bg-neutral-100 w-full"
            variant="ghost"
            size="sm"
          >
            {address ? "Editar Endereço" : "Adicionar Endereço"}
            <ChevronRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Agendamento de Entrega */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <CalendarIcon className="h-4 w-4" />
            Agendamento de Entrega
          </h4>

          <div className="bg-blue-50 rounded-lg border border-blue-200 py-2 px-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-4 w-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="text-xs font-medium text-blue-900">
                  ⏱️ Tempo de Preparo: {getMinPreparationHours()}h
                  {getMinPreparationHours() === 1 ? "" : ""}
                </h5>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label
                htmlFor="delivery-date"
                className="block text-xs font-medium text-gray-700 mb-2"
              >
                Data de Entrega *
              </Label>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal text-xs ${
                      !selectedDate && "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      selectedDate.toLocaleDateString("pt-BR")
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => {
                      if (!date) {
                        setSelectedDate(undefined);
                        setSelectedTime("");
                        return;
                      }

                      const normalizedDate = new Date(date);
                      normalizedDate.setHours(0, 0, 0, 0);
                      const previousTime = selectedDate
                        ? new Date(selectedDate).setHours(0, 0, 0, 0)
                        : undefined;
                      const normalizedTime = normalizedDate.getTime();
                      const hasDateChanged =
                        previousTime === undefined
                          ? true
                          : previousTime !== normalizedTime;

                      setSelectedDate(normalizedDate);

                      if (hasDateChanged) {
                        setSelectedTime("");
                      }

                      setCalendarOpen(false);
                    }}
                    disabled={isDateDisabled}
                    className="rounded-md border w-full min-w-[280px]"
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Horário de Entrega *
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  title="Selecione o horário de entrega"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
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

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
              <p>
                <strong>Horários de funcionamento:</strong>
              </p>
              <p>• Segunda à Sexta: 7:30-12:00 e 14:00-17:00</p>
              <p>• Sábados e Domingos: 8:00-11:00</p>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </Card>
);

const CheckoutButton = ({
  handleFinalizePurchase,
  isProcessing,
  zipCode,
  address,
  houseNumber,
  city,
  state,
  customerPhone,
  selectedDate,
  selectedTime,
  cartItems,
  cartTotal,
  user,
  paymentMethod,
  shippingCost,
  grandTotal,
  isAddressServed,
  paymentStatus,
  paymentError,
  pixData,
  onViewPix,
}: CheckoutButtonProps) => {
  const shippingLabel = (() => {
    if (shippingCost === null) return "defina o pagamento";
    if (shippingCost === 0) return "Grátis";
    return `R$ ${shippingCost.toFixed(2)}`;
  })();

  const paymentLabel = (() => {
    if (!paymentMethod) return "Não selecionado";
    if (paymentMethod === "pix") return "Pix";
    return "Cartão de crédito";
  })();

  const isDisabled =
    isProcessing ||
    !zipCode.trim() ||
    !address.trim() ||
    !houseNumber.trim() ||
    !city.trim() ||
    !state.trim() ||
    !customerPhone.trim() ||
    !isValidPhone(customerPhone) ||
    !selectedDate ||
    !selectedTime ||
    cartItems.length === 0 ||
    !paymentMethod ||
    shippingCost === null ||
    !isAddressServed;

  return (
    <div className="space-y-3">
      {paymentError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-xs lg:text-sm">
            {paymentError}
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus === "pending" && pixData && (
        <Alert className="border-green-200 bg-green-50">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-xs lg:text-sm flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <span>PIX gerado! Abra o QR Code para concluir o pagamento.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewPix}
              className="border-green-300 text-green-700 hover:bg-green-100 bg-transparent"
            >
              Ver QR Code
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total do pedido
          </p>
          <p className="text-lg font-semibold">R$ {grandTotal.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">
            Subtotal: R$ {cartTotal.toFixed(2)} · Frete: {shippingLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Pagamento: {paymentLabel}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {cartItems.length} {cartItems.length === 1 ? "item" : "itens"}
        </span>
      </div>

      <Button
        onClick={handleFinalizePurchase}
        disabled={isDisabled}
        className="w-full justify-center gap-2 bg-rose-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Finalizar Compra
          </>
        )}
      </Button>

      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
        <p className="flex items-center gap-2 font-medium">
          <User className="h-3 w-3" />
          {user?.name || "Carregando..."}
        </p>
        {selectedDate && selectedTime && (
          <p className="mt-1 text-muted-foreground">
            Entrega em {selectedDate.toLocaleDateString("pt-BR")} às{" "}
            {selectedTime}
          </p>
        )}
      </div>
    </div>
  );
};

export default function CarrinhoPage() {
  const { user, isLoading, login } = useAuth();
  const { getCepInfo, updateUser, getUser, createTransparentPayment } =
    useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    createOrder,
    getMinPreparationHours,
    generateTimeSlots,
    getDeliveryDateBounds,
  } = useCartContext();

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
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"" | "pix" | "card">("");
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);

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

  useEffect(() => {
    if (user && !isEditingAddress) {
      if (user.zip_code && !zipCode) {
        setZipCode(user.zip_code);
      }

      if (user.city && !city) {
        setCity(user.city);
      }

      if (user.state && !state) {
        setState(user.state);
      }

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
    }
  }, [user, zipCode, address, city, state, isEditingAddress]);

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

  const handlePaymentMethodSelection = useCallback((method: "pix" | "card") => {
    setPaymentMethod(method);
    setPixData(null);
    setPaymentStatus("");
    setPaymentError(null);
    setIsPixDialogOpen(false);
    setCurrentOrderId(null);
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
    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (!currentOrderId) {
        throw new Error("Pedido não encontrado. Tente novamente.");
      }

      const paymentResponse = await createTransparentPayment({
        orderId: currentOrderId,
        payment_method_id: "credit_card",
        installments: cardData.installments,
        payer: {
          email: cardData.email,
          first_name: cardData.cardholderName.split(" ")[0],
          last_name: cardData.cardholderName.split(" ").slice(1).join(" "),
          identification: {
            type: cardData.identificationType,
            number: cardData.identificationNumber,
          },
        },
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
        setIsCardDialogOpen(false);
        router.push("/pedidos");
      } else if (normalizedStatus === "pending") {
        toast.info("Pagamento em análise. Aguarde a confirmação.");
        setIsCardDialogOpen(false);
      } else {
        throw new Error("Pagamento recusado. Verifique os dados do cartão.");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento com cartão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setPaymentError(errorMessage);
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

      setCurrentOrderId(createdOrderId);

      if (paymentMethod === "card") {
        setIsCardDialogOpen(true);
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === "pix") {
        const paymentResponse = await createTransparentPayment({
          orderId: createdOrderId,
          payment_method_id: "pix",
          payer: {
            email: user.email || "",
            first_name: user.name || "",
          },
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
        setIsPixDialogOpen(true);
        toast.success(
          "Pedido criado! Escaneie o QR Code para concluir o pagamento."
        );
      }
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setCurrentOrderId(null);
      setPixData(null);
      setPaymentStatus("");
      setIsPixDialogOpen(false);
      setPaymentError(errorMessage);
      toast.error(`Erro ao processar pedido: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!zipCode.trim()) {
      alert("Por favor, informe o CEP");
      return;
    }
    if (!address.trim()) {
      alert("Por favor, informe o endereço");
      return;
    }
    if (!houseNumber.trim()) {
      alert("Por favor, informe o número da casa");
      return;
    }
    if (!city.trim()) {
      alert("Por favor, informe a cidade");
      return;
    }
    if (!state.trim()) {
      alert("Por favor, informe o estado");
      return;
    }

    const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

    try {
      const updatedUser = await updateUser(user.id, {
        zip_code: zipCode,
        address: fullAddress,
        city,
        state,
        phone: unformatPhoneNumber(customerPhone), // Salva sem máscara
      });

      if (updatedUser) {
        toast.success("Endereço e telefone salvos com sucesso!");
      } else {
        toast.error("Erro ao salvar informações. Tente novamente.");
      }

      await refreshUserData();

      setIsEditingAddress(false);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      alert("Erro ao salvar informações. Tente novamente.");
    }
  };

  const prepareAddressForEditing = () => {
    if (user) {
      if (user.zip_code) {
        setZipCode(user.zip_code);
      }
      if (user.city) {
        setCity(user.city);
      }
      if (user.state) {
        setState(user.state);
      }
      if (user.phone) {
        setCustomerPhone(formatPhoneNumber(user.phone));
      }

      if (user.address) {
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

        if (!user.city || !user.state) {
          const cityStateMatch = addressStr.match(/,\s*([^/]+)\/(\w{2})/);
          if (cityStateMatch) {
            if (!user.city) setCity(cityStateMatch[1].trim());
            if (!user.state) setState(cityStateMatch[2].trim());
          }
        }
      }
    }

    setIsEditingAddress(true);
  };
  const originalTotal = cartItems.reduce((sum, item) => {
    const baseTotal = (item.effectivePrice ?? item.price) * item.quantity;
    const additionalsTotal =
      item.additionals?.reduce((a, add) => a + add.price * item.quantity, 0) ||
      0;
    return sum + baseTotal + additionalsTotal;
  }, 0);

  const discountAmount = originalTotal - cartTotal;
  const formattedAddress = `${address}${houseNumber ? `, ${houseNumber}` : ""}${
    neighborhood ? ` - ${neighborhood}` : ""
  }${city && state ? `, ${city}/${state}` : ""}${
    zipCode ? ` - CEP: ${zipCode}` : ""
  }`;

  return (
    <div className="min-h-screen bg-background ">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Carrinho</h1>
              </Link>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Continuar Comprando</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {cartItems.length === 0 ? (
            <div className="lg:col-span-3">
              <Card className="border-border bg-card p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Seu carrinho está vazio
                </h2>
                <p className="text-muted-foreground mb-6">
                  Adicione alguns produtos deliciosos do nosso catálogo!
                </p>
                <Button
                  onClick={() => router.push("/")}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Continuar Comprando
                </Button>
              </Card>
            </div>
          ) : (
            <>
              {/* Main Content - Cart Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Review Cart */}
                <Card className="border-border bg-card p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      1
                    </div>
                    <h2 className="text-xl font-semibold">
                      Revise seu carrinho
                    </h2>
                  </div>

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

                {/* Step 2: Delivery Information - Only visible on mobile */}
                <div className="lg:hidden">
                  <Card className="border-border bg-card p-6">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        2
                      </div>
                      <h2 className="text-xl font-semibold">
                        Entrega e Pagamento
                      </h2>
                    </div>

                    <OrderSummaryCard
                      originalTotal={originalTotal}
                      discountAmount={discountAmount}
                      cartTotal={cartTotal}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      calendarOpen={calendarOpen}
                      setCalendarOpen={setCalendarOpen}
                      setSelectedDate={setSelectedDate}
                      setSelectedTime={setSelectedTime}
                      isDateDisabled={isDateDisabled}
                      generateTimeSlots={generateTimeSlots}
                      getMinPreparationHours={getMinPreparationHours}
                      address={formattedAddress}
                      prepareAddressForEditing={prepareAddressForEditing}
                      className="border-0 p-0 shadow-none"
                      paymentMethod={paymentMethod}
                      setPaymentMethod={handlePaymentMethodSelection}
                      shippingCost={shippingCost}
                      shippingOptions={shippingOptions}
                      grandTotal={grandTotal}
                      isAddressServed={isAddressServed}
                      addressWarning={addressWarning}
                      acceptedCities={acceptedCities}
                    />
                  </Card>
                </div>
              </div>

              {/* Order Summary Sidebar - Desktop Only */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 hidden lg:block">
                  <OrderSummaryCard
                    originalTotal={originalTotal}
                    discountAmount={discountAmount}
                    cartTotal={cartTotal}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    calendarOpen={calendarOpen}
                    setCalendarOpen={setCalendarOpen}
                    setSelectedDate={setSelectedDate}
                    setSelectedTime={setSelectedTime}
                    isDateDisabled={isDateDisabled}
                    generateTimeSlots={generateTimeSlots}
                    getMinPreparationHours={getMinPreparationHours}
                    address={formattedAddress}
                    prepareAddressForEditing={prepareAddressForEditing}
                    className="border-border bg-card"
                    paymentMethod={paymentMethod}
                    setPaymentMethod={handlePaymentMethodSelection}
                    shippingCost={shippingCost}
                    shippingOptions={shippingOptions}
                    grandTotal={grandTotal}
                    isAddressServed={isAddressServed}
                    addressWarning={addressWarning}
                    acceptedCities={acceptedCities}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-lg">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <CheckoutButton
              handleFinalizePurchase={handleFinalizePurchase}
              isProcessing={isProcessing}
              zipCode={zipCode}
              address={address}
              houseNumber={houseNumber}
              city={city}
              state={state}
              customerPhone={customerPhone}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              cartItems={cartItems}
              cartTotal={cartTotal}
              user={user}
              paymentMethod={paymentMethod}
              shippingCost={shippingCost}
              grandTotal={grandTotal}
              isAddressServed={isAddressServed}
              paymentStatus={paymentStatus}
              paymentError={paymentError}
              pixData={pixData}
              onViewPix={() => setIsPixDialogOpen(true)}
            />
          </div>
        </div>
      )}

      <Dialog open={isEditingAddress} onOpenChange={setIsEditingAddress}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Endereço de Entrega
            </DialogTitle>
            <DialogDescription className="text-base">
              Informe o endereço para entrega dos produtos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone (WhatsApp) *
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setCustomerPhone(formatted);
                }}
                placeholder="+55 (XX) XXXXX-XXXX"
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enviaremos confirmações e atualizações do pedido via WhatsApp
              </p>
              {customerPhone.length > 0 && !isValidPhone(customerPhone) && (
                <p className="text-xs text-red-500 mt-1">Telefone incompleto</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP *
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
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 pr-10"
                  maxLength={8}
                />
                {isLoadingCep && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                  </div>
                )}
              </div>
              {zipCode.length > 0 && zipCode.length < 8 && (
                <p className="text-xs text-gray-500 mt-1">
                  Digite {8 - zipCode.length} dígitos restantes
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Digite o endereço ou será preenchido após buscar o CEP"
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número *
              </label>
              <input
                type="text"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="Ex: 123, 45A, S/N"
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Digite o bairro ou será preenchido após buscar o CEP"
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Digite a cidade ou será preenchida automaticamente"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="UF"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild onClick={() => setIsEditingAddress(false)}>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                handleSaveAddress();
              }}
            >
              Salvar Endereço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription className="text-base">
              Escaneie o QR Code para concluir o pagamento do pedido
              {currentOrderId ? ` ${currentOrderId}` : ""}.
            </DialogDescription>
          </DialogHeader>

          {pixData ? (
            <div className="space-y-6">
              {currentOrderId && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <span className="font-medium text-gray-700">
                    Código do pedido:
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
            </div>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                Não encontramos informações do PIX. Gere um novo pagamento.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPixDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Pagamento com Cartão de Crédito
            </DialogTitle>
            <DialogDescription className="text-base">
              Preencha os dados do cartão para finalizar o pagamento
              {currentOrderId ? ` do pedido ${currentOrderId}` : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <CreditCardForm
              onSubmit={handleCardPayment}
              isProcessing={isProcessing}
              defaultEmail={user?.email}
              defaultName={user?.name}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsCardDialogOpen(false);
                setCurrentOrderId(null);
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
