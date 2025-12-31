"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  CheckCircle2,
  Car,
  Store,
  Loader2,
  CalendarIcon,
  AlertCircle,
  Info,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { TimeSlotSelector } from "../TimeSlotSelector";
import { cn } from "@/app/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/app/components/ui/card";

interface StepDeliveryProps {
  optionSelected: "delivery" | "pickup";
  setOptionSelected: (val: "delivery" | "pickup") => void;
  zipCode: string;
  setZipCode: (val: string) => void;
  handleCepSearch: (cep: string) => void;
  isLoadingCep: boolean;
  address: string;
  setAddress: (val: string) => void;
  houseNumber: string;
  setHouseNumber: (val: string) => void;
  neighborhood: string;
  setNeighborhood: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  complemento: string;
  setComplemento: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  userDocument: string;
  setUserDocument: (val: string) => void;
  recipientPhone: string;
  setRecipientPhone: (val: string) => void;
  sendAnonymously: boolean;
  setSendAnonymously: (val: boolean) => void;
  isSelfRecipient: boolean;
  setIsSelfRecipient: (val: boolean) => void;
  addressWarning?: string | null;
  selectedDate?: Date;
  setSelectedDate: (val: Date | undefined) => void;
  selectedTime: string;
  setSelectedTime: (val: string) => void;
  isDateDisabled: (date: Date) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeSlots: any[];
  isGeneratingSlots: boolean;
  calendarOpen: boolean;
  setCalendarOpen: (val: boolean) => void;
  formatDocument: (val: string) => string;
  isValidPhone: (val: string) => boolean;
  formatPhoneNumber: (val: string) => string;
}

export const StepDelivery = ({
  optionSelected,
  setOptionSelected,
  zipCode,
  setZipCode,
  handleCepSearch,
  isLoadingCep,
  address,
  setAddress,
  houseNumber,
  setHouseNumber,
  neighborhood,
  setNeighborhood,
  complemento,
  setComplemento,
  customerPhone,
  setCustomerPhone,
  userDocument,
  setUserDocument,
  recipientPhone,
  setRecipientPhone,
  sendAnonymously,
  setSendAnonymously,
  isSelfRecipient,
  setIsSelfRecipient,
  addressWarning,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  isDateDisabled,
  timeSlots,
  isGeneratingSlots,
  calendarOpen,
  setCalendarOpen,
  formatDocument,
  isValidPhone,
  formatPhoneNumber,
}: StepDeliveryProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="bg-white p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-50 rounded-xl">
            <MapPin className="h-6 w-6 text-rose-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dados de Entrega
          </h2>
        </div>

        <div className="space-y-8">
          {/* Opção de Entrega */}
          <div className="space-y-4">
            <Label className="text-base font-bold text-gray-900">
              Como você quer receber seu pedido?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOptionSelected("delivery")}
                className={cn(
                  "relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3",
                  optionSelected === "delivery"
                    ? "border-rose-500 bg-rose-50 text-rose-700 shadow-md transform scale-102"
                    : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                {optionSelected === "delivery" && (
                  <div className="absolute top-2 right-2 text-rose-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <Car
                  className={cn(
                    "w-8 h-8",
                    optionSelected === "delivery"
                      ? "text-rose-600"
                      : "text-gray-400"
                  )}
                />
                <span className="font-bold">Entrega</span>
              </button>

              <button
                onClick={() => setOptionSelected("pickup")}
                className={cn(
                  "relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3",
                  optionSelected === "pickup"
                    ? "border-rose-500 bg-rose-50 text-rose-700 shadow-md transform scale-102"
                    : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                {optionSelected === "pickup" && (
                  <div className="absolute top-2 right-2 text-rose-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <Store
                  className={cn(
                    "w-8 h-8",
                    optionSelected === "pickup"
                      ? "text-rose-600"
                      : "text-gray-400"
                  )}
                />
                <span className="font-bold">Retirada</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                  FRETE GRÁTIS
                </span>
              </button>
            </div>
          </div>

          {/* Endereço ou Local de Retirada */}
          {optionSelected === "delivery" ? (
            <div className="space-y-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">CEP *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={zipCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setZipCode(val);
                        if (val.length === 8) handleCepSearch(val);
                      }}
                      maxLength={8}
                      placeholder="00000-000"
                      className="bg-white"
                    />
                    <Button
                      onClick={() => handleCepSearch(zipCode)}
                      disabled={isLoadingCep || zipCode.length !== 8}
                      variant="outline"
                      className="bg-white"
                    >
                      {isLoadingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Buscar"
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="font-bold text-gray-700">
                    Logradouro *
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Avenida..."
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Número *</Label>
                  <Input
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="123"
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">
                  Complemento / Referência
                </Label>
                <Input
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Bloco, Próximo a..."
                  className="bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Bairro *</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {addressWarning && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-xs">
                    {addressWarning}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <MapPin className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 leading-tight">
                    Nosso Endereço para Retirada
                  </h3>
                  <p className="text-sm text-rose-800 mt-1">
                    R. Dr. Raif Ramalho, 350 - Jardim Tavares
                    <br />
                    Campina Grande - PB, 58402-025
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-white px-3 py-1 rounded-full shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                    Frete Grátis na Retirada
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-gray-900">Seu WhatsApp *</Label>
              <Input
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(formatPhoneNumber(e.target.value))
                }
                placeholder="(83) 99999-9999"
              />
              {customerPhone.length > 0 && !isValidPhone(customerPhone) && (
                <span className="text-[10px] text-red-500 font-bold">
                  Telefone incompleto
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-gray-900">CPF ou CNPJ *</Label>
              <Input
                value={formatDocument(userDocument)}
                onChange={(e) =>
                  setUserDocument(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000.000.000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 space-y-6">
            <Label className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-rose-600" />
              Agendamento da Entrega
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700">
                  Data Preferencial *
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl border-gray-200",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 rounded-2xl shadow-2xl border-rose-100"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={isDateDisabled}
                      initialFocus
                      locale={ptBR}
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700">
                  Horário Previsto *
                </Label>
                <TimeSlotSelector
                  slots={timeSlots}
                  selectedValue={selectedTime}
                  onSelect={setSelectedTime}
                  disabled={isGeneratingSlots}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Nota:</strong> O horário selecionado é uma estimativa.
                Nos esforçamos para entregar dentro da janela escolhida, podendo
                haver uma variação dependendo da rota de entrega e demanda do
                dia.
              </p>
            </div>
          </div>

          {/* Opções de destinatário */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                id="isSelfRecipient"
                title="Eu mesmo receberei o pedido"
                checked={isSelfRecipient}
                onChange={(e) => setIsSelfRecipient(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <Label
                htmlFor="isSelfRecipient"
                className="text-sm font-medium cursor-pointer"
              >
                Eu mesmo receberei o pedido
              </Label>
            </div>

            {!isSelfRecipient && (
              <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-900">
                    Telefone de quem vai receber *
                  </Label>
                  <Input
                    type="tel"
                    title="Telefone do destinatário"
                    value={recipientPhone}
                    onChange={(e) =>
                      setRecipientPhone(formatPhoneNumber(e.target.value))
                    }
                    placeholder="(83) 99999-9999"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendAnonymously"
                    title="Enviar como presente anônimo"
                    checked={sendAnonymously}
                    onChange={(e) => setSendAnonymously(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <Label
                    htmlFor="sendAnonymously"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Desejo enviar como presente anônimo
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
