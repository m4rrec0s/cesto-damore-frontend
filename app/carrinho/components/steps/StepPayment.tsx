"use client";

import { motion } from "framer-motion";
import { CreditCard, QrCode, ShieldCheck, Info, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { QRCodePIX, type PixData } from "@/app/components/QRCodePIX";
import { type MPPaymentFormData } from "@/app/components/mp-payment-brick";
import { MPCardPaymentForm } from "@/app/components/mp-card-payment-form";

interface StepPaymentProps {
  paymentMethod: "pix" | "card" | null;
  setPaymentMethod: (method: "pix" | "card") => void;
  grandTotal: number;
  pixData: PixData | null;
  currentOrderId: string;
  isGeneratingPix: boolean;
  isProcessing: boolean;
  paymentError: string | null;
  handlePlaceOrder: () => void;
  handleCardSubmit: (formData: MPPaymentFormData) => Promise<void>;
  payerEmail: string;
  payerName: string;
}

export const StepPayment = ({
  paymentMethod,
  setPaymentMethod,
  grandTotal,
  pixData,
  currentOrderId,
  isGeneratingPix,
  isProcessing,
  paymentError,
  handlePlaceOrder,
  handleCardSubmit,
  payerEmail,
  payerName,
}: StepPaymentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 px-1">
          Como você prefere pagar?
        </h2>

        <div className="space-y-3">
          {/* Opção PIX */}
          <div
            onClick={() => setPaymentMethod("pix")}
            className={cn(
              "bg-white p-5 rounded-lg border cursor-pointer transition-all hover:bg-gray-50",
              paymentMethod === "pix"
                ? "border-gray-200"
                : "border-gray-100 opacity-70"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  paymentMethod === "pix"
                    ? "border-[#3483fa]"
                    : "border-gray-300"
                )}
              >
                {paymentMethod === "pix" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3483fa]" />
                )}
              </div>

              <div className="p-2 bg-blue-50 rounded-lg text-[#3483fa]">
                <QrCode className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <p className="font-bold text-gray-900">Pix</p>
                <p className="text-xs text-[#00a650] font-medium">
                  Aprovação imediata
                </p>
              </div>
            </div>

            {paymentMethod === "pix" && (
              <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                {isGeneratingPix ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3483fa]" />
                    <p className="text-sm text-gray-500">
                      Gerando seu QR Code...
                    </p>
                  </div>
                ) : pixData ? (
                  <QRCodePIX pixData={pixData} />
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <p className="text-sm text-gray-500 text-center">
                      Clique no botão abaixo para gerar o seu QR Code PIX.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaceOrder();
                      }}
                      disabled={isProcessing}
                      className="bg-[#3483fa] text-white px-6 py-2 rounded font-medium hover:bg-[#2968c8] transition-colors"
                    >
                      Gerar QR Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opção Cartão */}
          <div
            onClick={() => setPaymentMethod("card")}
            className={cn(
              "bg-white p-5 rounded-lg border cursor-pointer transition-all hover:bg-gray-50",
              paymentMethod === "card"
                ? "border-gray-200"
                : "border-gray-100 opacity-70"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  paymentMethod === "card"
                    ? "border-[#3483fa]"
                    : "border-gray-300"
                )}
              >
                {paymentMethod === "card" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3483fa]" />
                )}
              </div>

              <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                <CreditCard className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <p className="font-bold text-gray-900">Cartão de Crédito</p>
                <p className="text-xs text-gray-400">Até 12x com juros</p>
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                <MPCardPaymentForm
                  amount={grandTotal}
                  orderId={currentOrderId}
                  payerEmail={payerEmail}
                  payerName={payerName}
                  onSubmit={handleCardSubmit}
                  isProcessing={isProcessing}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-800 text-sm">
          <Info className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{paymentError}</p>
        </div>
      )}

      {/* Selo de Segurança */}
      <div className="flex flex-col items-center justify-center pt-4 pb-8 space-y-3 opacity-60">
        <div className="flex items-center gap-2 text-gray-400">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Pagamento 100% Seguro
          </span>
        </div>
        <div className="text-[10px] text-gray-400 text-center max-w-[250px]">
          Suas informações são processadas de forma segura. Não armazenamos
          dados do seu cartão.
        </div>
      </div>
    </motion.div>
  );
};
