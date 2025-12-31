"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  CheckCircle2,
  CalendarIcon,
  AlertCircle,
  Info,
  Clock,
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
  const isAddressComplete = address && houseNumber && neighborhood && zipCode;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 px-1">
          Escolha a forma de entrega
        </h2>

        {/* Opção de Entrega */}
        <div
          onClick={() => setOptionSelected("delivery")}
          className={cn(
            "bg-white p-6 rounded-lg border cursor-pointer transition-all",
            optionSelected === "delivery"
              ? "border-gray-200"
              : "border-gray-100 opacity-70"
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center transition-all",
                optionSelected === "delivery"
                  ? "border-[#3483fa]"
                  : "border-gray-300"
              )}
            >
              {optionSelected === "delivery" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#3483fa]" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-900">
                  Enviar no meu endereço
                </span>
                <span className="text-[#00a650] font-medium text-sm">
                  Grátis
                </span>
              </div>

              {optionSelected === "delivery" && isAddressComplete ? (
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    {address}, {houseNumber}
                  </p>
                  <p>
                    {neighborhood}, {zipCode}
                  </p>
                  <button
                    className="text-[#3483fa] text-xs font-medium mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Reset logic to trigger form
                      setAddress("");
                    }}
                  >
                    Alterar ou escolher outro endereço
                  </button>
                </div>
              ) : optionSelected === "delivery" ? (
                <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">
                        CEP
                      </Label>
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
                          className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">
                        Rua / Logradouro
                      </Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">
                        Número
                      </Label>
                      <Input
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        placeholder="Ex: 123"
                        className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      Complemento / Referência
                    </Label>
                    <Input
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Ex: Apto 101, Próximo ao mercado"
                      className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      Bairro
                    </Label>
                    <Input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                    />
                  </div>

                  {addressWarning && (
                    <Alert
                      variant="destructive"
                      className="bg-red-50 border-red-200 py-2"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-xs">
                        {addressWarning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Opção de Retirada */}
        <div
          onClick={() => setOptionSelected("pickup")}
          className={cn(
            "bg-white p-6 rounded-lg border cursor-pointer transition-all",
            optionSelected === "pickup"
              ? "border-gray-200"
              : "border-gray-100 opacity-70"
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center transition-all",
                optionSelected === "pickup"
                  ? "border-[#3483fa]"
                  : "border-gray-300"
              )}
            >
              {optionSelected === "pickup" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#3483fa]" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-900">Retirar na Loja</span>
                <span className="text-[#00a650] font-medium text-sm">
                  Grátis
                </span>
              </div>

              {optionSelected === "pickup" && (
                <div className="text-sm text-gray-500 mt-2 space-y-1">
                  <p className="font-medium text-gray-700">
                    Cesto d&aposAmore - Campina Grande
                  </p>
                  <p>R. Dr. Raif Ramalho, 350 - Jardim Tavares</p>
                  <p>Campina Grande - PB, 58402-025</p>
                  <div className="flex items-center gap-1.5 text-[#00a650] font-bold text-[10px] uppercase tracking-wider mt-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pronto para retirada após produção
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dados Pessoais & Agendamento */}
      <Card className="bg-white p-6 rounded-lg border border-gray-200 shadow-none space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <div className="p-1.5 bg-gray-50 rounded">
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="font-bold text-gray-900">Dados do Cliente</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                Seu WhatsApp
              </Label>
              <Input
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(formatPhoneNumber(e.target.value))
                }
                placeholder="(83) 99999-9999"
                className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
              />
              {customerPhone.length > 0 && !isValidPhone(customerPhone) && (
                <span className="text-[10px] text-red-500 font-bold">
                  Telefone incompleto
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                CPF ou CNPJ
              </Label>
              <Input
                value={formatDocument(userDocument)}
                onChange={(e) =>
                  setUserDocument(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000.000.000-00"
                maxLength={18}
                className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <div className="p-1.5 bg-gray-50 rounded">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="font-bold text-gray-900">Agendamento</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                Data de Entrega
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded border-gray-300",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-lg shadow-xl border-gray-200"
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
                    className="p-3 w-full min-w-[290px] rounded-lg"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                Horário Previsto
              </Label>
              <TimeSlotSelector
                slots={timeSlots}
                selectedValue={selectedTime}
                onSelect={setSelectedTime}
                disabled={isGeneratingSlots}
              />
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded border border-blue-100 flex gap-3">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 leading-relaxed">
              O horário é uma estimativa. Podem ocorrer variações dependendo da
              rota.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded border border-gray-100">
            <div className="relative flex items-center">
              <Input
                type="checkbox"
                id="isSelfRecipient"
                checked={isSelfRecipient}
                onChange={(e) => setIsSelfRecipient(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#3483fa] focus:ring-[#3483fa]"
              />
            </div>
            <Label
              htmlFor="isSelfRecipient"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Eu mesmo receberei o pedido
            </Label>
          </div>

          {!isSelfRecipient && (
            <div className="space-y-4 p-5 bg-white rounded border border-gray-200 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  Telefone do recebedor
                </Label>
                <Input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) =>
                    setRecipientPhone(formatPhoneNumber(e.target.value))
                  }
                  placeholder="(83) 99999-9999"
                  className="h-10 border-gray-300 rounded focus:ring-[#3483fa]"
                />
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="checkbox"
                  id="sendAnonymously"
                  checked={sendAnonymously}
                  onChange={(e) => setSendAnonymously(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#3483fa] focus:ring-[#3483fa]"
                />
                <Label
                  htmlFor="sendAnonymously"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Enviar como presente anônimo
                </Label>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
