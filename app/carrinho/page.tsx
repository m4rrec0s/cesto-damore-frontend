"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { useCartContext } from "@/app/hooks/cart-context";
import { useApi } from "@/app/hooks/use-api";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Calendar } from "@/app/components/ui/calendar";
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
  MapPin,
  ChevronRightIcon,
  CalendarIcon,
  ShoppingCart,
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
}

interface ProductCardProps {
  item: CartItem;
  updateQuantity: (
    productId: string,
    quantity: number,
    additionalIds?: string[]
  ) => void;
  removeFromCart: (productId: string, additionalIds?: string[]) => void;
}

interface OrderSummaryCardProps {
  originalTotal: number;
  discountAmount: number;
  cartTotal: number;
}

interface DeliveryInfoCardProps {
  address: string;
  prepareAddressForEditing: () => void;
}

interface DeliveryDateCardProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedTime: (time: string) => void;
  isDateDisabled: (date: Date) => boolean;
  generateTimeSlots: (date: Date) => Array<{ value: string; label: string }>;
  getMinPreparationHours: () => number;
}

interface CustomerInfoCardProps {
  user: {
    name: string;
    email: string;
  };
}

interface CheckoutButtonProps {
  handleFinalizePurchase: () => void;
  isProcessing: boolean;
  zipCode: string;
  address: string;
  houseNumber: string;
  city: string;
  state: string;
  selectedDate: Date | undefined;
  selectedTime: string;
  cartItems: CartItem[];
  cartTotal: number;
  user?: {
    name: string;
    email: string;
  };
}

// Componentes funcionais para o layout responsivo
const ProductCard = ({
  item,
  updateQuantity,
  removeFromCart,
}: ProductCardProps) => (
  <Card className="p-4 lg:p-6">
    <div className="flex gap-3 lg:gap-4">
      <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0">
        <Image
          src={item.product.image_url || "/placeholder.svg"}
          alt={item.product.name}
          fill
          className="object-cover rounded-md"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-base lg:text-lg mb-1 lg:mb-2 line-clamp-2">
          {item.product.name}
        </h3>

        <p className="text-gray-600 text-xs lg:text-sm mb-2 lg:mb-3 line-clamp-2">
          {item.product.description}
        </p>

        {item.additionals && item.additionals.length > 0 && (
          <div className="mb-2 lg:mb-3 flex flex-wrap gap-1 lg:gap-2">
            {item.additionals.map((add) => (
              <Badge key={add.id} variant="secondary" className="text-xs">
                + {add.name} (+R$ {add.price.toFixed(2)})
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateQuantity(
                  item.product_id,
                  item.quantity - 1,
                  item.additional_ids
                )
              }
              disabled={item.quantity <= 1}
              className="w-7 h-7 lg:w-8 lg:h-8 p-0"
            >
              <Minus className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
            <span className="w-8 lg:w-12 text-center font-semibold text-sm lg:text-base">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateQuantity(
                  item.product_id,
                  item.quantity + 1,
                  item.additional_ids
                )
              }
              className="w-7 h-7 lg:w-8 lg:h-8 p-0"
            >
              <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            <div className="flex flex-col items-end">
              {item.discount && item.discount > 0 ? (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    R${" "}
                    {(
                      item.price * item.quantity +
                      (item.additionals?.reduce(
                        (sum: number, add) => sum + add.price * item.quantity,
                        0
                      ) || 0)
                    ).toFixed(2)}
                  </span>
                  <span className="text-sm lg:text-base font-semibold text-rose-600">
                    R${" "}
                    {(
                      (item.effectivePrice || item.price) * item.quantity +
                      (item.additionals?.reduce(
                        (sum: number, add) => sum + add.price * item.quantity,
                        0
                      ) || 0)
                    ).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-sm lg:text-base font-semibold text-rose-600">
                  R${" "}
                  {(
                    item.price * item.quantity +
                    (item.additionals?.reduce(
                      (sum: number, add) => sum + add.price * item.quantity,
                      0
                    ) || 0)
                  ).toFixed(2)}
                </span>
              )}
            </div>
            <Button
              title="Remover item"
              variant="ghost"
              size="sm"
              onClick={() =>
                removeFromCart(item.product_id, item.additional_ids)
              }
              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
            >
              <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

const OrderSummaryCard = ({
  originalTotal,
  discountAmount,
  cartTotal,
  // Props para agendamento
  selectedDate,
  selectedTime,
  calendarOpen,
  setCalendarOpen,
  setSelectedDate,
  setSelectedTime,
  isDateDisabled,
  generateTimeSlots,
  getMinPreparationHours,
  // Props para entrega
  address,
  prepareAddressForEditing,
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
}) => (
  <Card className="p-4 lg:p-6">
    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
      Resumo do Pedido
    </h3>

    {/* Resumo financeiro */}
    <div className="space-y-2 lg:space-y-3 mb-4">
      <div className="flex justify-between text-xs lg:text-sm">
        <span>{discountAmount > 0 ? "Subtotal dos produtos" : "Subtotal"}</span>
        <span>R$ {originalTotal.toFixed(2)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-xs lg:text-sm">
          <span className="text-green-600">Desconto aplicado</span>
          <span className="text-green-600 font-semibold">
            - R$ {discountAmount.toFixed(2)}
          </span>
        </div>
      )}
      <div className="flex justify-between text-xs lg:text-sm">
        <span>Taxa de entrega</span>
        <span>Grátis</span>
      </div>
      <hr />
      <div className="flex justify-between font-semibold text-base lg:text-lg">
        <span>Total</span>
        <span className="text-rose-600">R$ {cartTotal.toFixed(2)}</span>
      </div>
    </div>

    {/* Collapsible para informações de entrega e agendamento */}
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <span className="font-medium text-gray-900">
          Configurar Entrega e Agendamento
        </span>
        <ChevronRightIcon className="h-4 w-4 text-gray-500" />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        {/* Informações de Entrega */}
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
                      setSelectedDate(date);
                      setSelectedTime("");
                      if (date) {
                        setCalendarOpen(false);
                      }
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

/* const DeliveryInfoCard = ({
  address,
  prepareAddressForEditing,
}: DeliveryInfoCardProps) => {
  // Estas variáveis precisam ser passadas como props ou definidas aqui
  const houseNumber = "";
  const neighborhood = "";
  const city = "";
  const state = "";
  const zipCode = "";

  return (
    <Card className="p-4 lg:p-6">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3 lg:mb-4">
        <MapPin className="h-4 w-4 lg:h-5 lg:w-5" />
        Informações de Entrega
      </h3>
      <div className="text-xs lg:text-sm text-gray-500 mb-3 lg:mb-4">
        {address ? (
          <div>
            {(() => {
              const fullAddress = [address, houseNumber]
                .filter(Boolean)
                .join(", ");
              const locationInfo = [neighborhood, city, state]
                .filter(Boolean)
                .join(", ");

              return (
                <>
                  <p className="font-medium text-gray-700">{fullAddress}</p>
                  <p>{locationInfo}</p>
                  <p>CEP: {zipCode}</p>
                </>
              );
            })()}
          </div>
        ) : (
          <p>Adicionar Endereço de Entrega</p>
        )}
      </div>
      <Button
        onClick={prepareAddressForEditing}
        className="text-rose-500 hover:text-rose-600 bg-neutral-100 w-full lg:w-auto"
        variant={"ghost"}
      >
        {address ? "Editar Endereço" : "Adicionar Endereço"}{" "}
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </Card>
  );
}; */

const DeliveryDateCard = ({
  selectedDate,
  selectedTime,
  calendarOpen,
  setCalendarOpen,
  setSelectedDate,
  setSelectedTime,
  isDateDisabled,
  generateTimeSlots,
  getMinPreparationHours,
}: DeliveryDateCardProps) => (
  <Card className="p-4 lg:p-6">
    <h3 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3 lg:mb-4">
      <CalendarIcon className="h-4 w-4 lg:h-5 lg:w-5" />
      Agendamento de Entrega
    </h3>

    <div className="bg-blue-50 rounded-lg border border-blue-200 py-2 px-3 lg:px-4 mb-4">
      <div className="flex items-start gap-2 lg:gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600"
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
          <h4 className="text-xs lg:text-sm font-medium text-blue-900">
            ⏱️ Tempo de Preparo: {getMinPreparationHours()}h{" "}
            {getMinPreparationHours() > 1 ? "mínimo" : "mínima"}
          </h4>
        </div>
      </div>
    </div>

    <div className="space-y-3 lg:space-y-4">
      <div>
        <Label
          htmlFor="delivery-date"
          className="block text-xs lg:text-sm font-medium text-gray-700 mb-2"
        >
          Data de Entrega *
        </Label>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="delivery-date"
              variant="outline"
              className="w-full justify-between font-normal h-9 lg:h-10 px-3 py-2 text-xs lg:text-sm"
            >
              {selectedDate
                ? selectedDate.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Selecione uma data"}
              <CalendarIcon className="h-3 w-3 lg:h-4 lg:w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => {
                if (date && !isDateDisabled(date)) {
                  const normalizedDate = new Date(date);
                  normalizedDate.setHours(0, 0, 0, 0);

                  setSelectedDate(normalizedDate);
                  setSelectedTime("");
                  setCalendarOpen(false);
                }
              }}
              disabled={isDateDisabled}
              className="rounded-md border w-full min-w-[280px] lg:min-w-[300px]"
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && (
        <div>
          <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
            Horário de Entrega *
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            title="Selecione o horário de entrega"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs lg:text-sm"
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

      <div className="text-xs text-gray-500 bg-gray-50 p-2 lg:p-3 rounded-md">
        <p>
          <strong>Horários de funcionamento:</strong>
        </p>
        <p>• Segunda à Sexta: 7:30-12:00 e 14:00-17:00</p>
        <p>• Sábados e Domingos: 8:00-11:00</p>
      </div>
    </div>
  </Card>
);

const CustomerInfoCard = ({ user }: CustomerInfoCardProps) => (
  <Card className="p-4 lg:p-6">
    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
      Informações do Cliente
    </h3>
    <div className="space-y-1 lg:space-y-2 text-xs lg:text-sm">
      <p>
        <strong>Nome:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
    </div>
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
  selectedDate,
  selectedTime,
  cartItems,
  cartTotal,
  user,
}: CheckoutButtonProps) => (
  <div className="space-y-3">
    <Button
      onClick={handleFinalizePurchase}
      disabled={
        isProcessing ||
        !zipCode.trim() ||
        !address.trim() ||
        !houseNumber.trim() ||
        !city.trim() ||
        !state.trim() ||
        !selectedDate ||
        !selectedTime ||
        cartItems.length === 0
      }
      className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 text-sm"
      size="lg"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          Finalizar Compra - R$ {cartTotal.toFixed(2)}
        </>
      )}
    </Button>

    {/* Informações do cliente */}
    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
      <p>
        <strong>Cliente:</strong> {user?.name || "Carregando..."}
      </p>
    </div>
  </div>
);

export default function CarrinhoPage() {
  const { user, isLoading, login } = useAuth();
  const { getCepInfo, updateUser, getUser } = useApi();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    createOrder,
    createPaymentPreference,
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedTime, setSelectedTime] = useState("");

  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Faça login para continuar
          </h2>
          <p className="text-gray-600 mb-6">
            Você precisa estar logado para acessar seu carrinho e finalizar
            compras.
          </p>
          <Link
            href="/login"
            className="inline-block w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md text-center"
          >
            Fazer Login
          </Link>
        </Card>
      </div>
    );
  }

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

    const fullAddress = `${address}, ${houseNumber} - ${neighborhood}, ${city}/${state} - CEP: ${zipCode}`;

    let finalDeliveryDate: Date | null = null;
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      finalDeliveryDate = new Date(selectedDate);
      finalDeliveryDate.setHours(hours, minutes, 0, 0);
    }

    setIsProcessing(true);
    try {
      const order = await createOrder(
        user.id,
        fullAddress,
        finalDeliveryDate || undefined
      );

      const preference = await createPaymentPreference(
        user.email,
        order.id.toString()
      );

      const paymentUrl =
        preference?.init_point || preference?.sandbox_init_point;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        throw new Error("URL de pagamento não foi retornada.");
      }
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao processar pedido: ${errorMessage}`);
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
      });

      if (updatedUser) {
        toast.success("Endereço salvo com sucesso!");
      } else {
        toast.error("Erro ao salvar endereço. Tente novamente.");
      }

      await refreshUserData();

      setIsEditingAddress(false);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      alert("Erro ao salvar endereço. Tente novamente.");
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

      if (user.address) {
        const addressStr = user.address;

        if (!user.zip_code) {
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
    const baseTotal = item.price * item.quantity;
    const additionalsTotal =
      item.additionals?.reduce((a, add) => a + add.price * item.quantity, 0) ||
      0;
    return sum + baseTotal + additionalsTotal;
  }, 0);

  const discountAmount = originalTotal - cartTotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Título da página */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Carrinho</h1>

        {/* Verificação de carrinho vazio */}
        {cartItems.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione alguns produtos deliciosos do nosso catálogo!
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Continuar Comprando
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Lista de produtos - Foco principal */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, index) => (
                <ProductCard
                  key={`${item.product_id}-${index}`}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                />
              ))}
            </div>

            {/* Resumo do pedido com configurações */}
            <div className="lg:col-span-1">
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
                address={`${address}${houseNumber ? `, ${houseNumber}` : ""}${
                  neighborhood ? ` - ${neighborhood}` : ""
                }${city && state ? `, ${city}/${state}` : ""}${
                  zipCode ? ` - CEP: ${zipCode}` : ""
                }`}
                prepareAddressForEditing={prepareAddressForEditing}
              />

              {/* Botão de finalizar compra */}
              <div className="mt-4">
                <CheckoutButton
                  handleFinalizePurchase={handleFinalizePurchase}
                  isProcessing={isProcessing}
                  zipCode={zipCode}
                  address={address}
                  houseNumber={houseNumber}
                  city={city}
                  state={state}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  cartItems={cartItems}
                  cartTotal={cartTotal}
                  user={user}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog para editar endereço */}
      <Dialog open={isEditingAddress} onOpenChange={setIsEditingAddress}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Endereço de Entrega</DialogTitle>
            <DialogDescription>
              Informe o endereço para entrega dos produtos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 pr-10"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
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
    </div>
  );
}
