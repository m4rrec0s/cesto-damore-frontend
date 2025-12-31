"use client";

import { motion } from "framer-motion";
import { CreditCard, Info } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { PaymentMethodSelector } from "@/app/components/payment-method-selector";
import { QRCodePIX, type PixData } from "@/app/components/QRCodePIX";
import {
  MPCardPaymentForm,
  type MPCardFormData,
} from "@/app/components/mp-card-payment-form";
import { LoadingPayment } from "@/app/components/LoadingPayment";

interface StepPaymentProps {
  paymentMethod?: "pix" | "card";
  setPaymentMethod: (val: "pix" | "card") => void;
  grandTotal: number;
  pixData: PixData | null;
  currentOrderId: string | null;
  isGeneratingPix: boolean;
  isProcessing: boolean;
  paymentError: string | null;
  handlePlaceOrder: () => void;
  handleCardSubmit: (formData: MPCardFormData) => Promise<void>;
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="bg-white p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-50 rounded-xl">
            <CreditCard className="h-6 w-6 text-rose-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Pagamento
          </h2>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-base font-bold text-gray-900">
                Como você prefere pagar?
              </label>
              <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full text-sm shadow-sm ring-1 ring-rose-100">
                Total: R$ {grandTotal.toFixed(2)}
              </span>
            </div>

            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={(method) =>
                setPaymentMethod(method as "pix" | "card")
              }
            />
          </div>

          {/* Área de Loading ou Erro */}
          {isProcessing && !pixData && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
              <LoadingPayment />
              <p className="text-rose-600 font-bold animate-pulse">
                Processando sua solicitação...
              </p>
            </div>
          )}

          {paymentError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in shake-1 duration-500">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-red-700 text-sm font-medium">
                  {paymentError}
                </p>
              </div>
            </div>
          )}

          {/* Conteúdo Dinâmico por Método */}
          {paymentMethod === "pix" && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              {!pixData ? (
                <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Gerar Código PIX
                    </h3>
                    <p className="text-sm text-gray-500 px-8">
                      Um QR Code único será gerado para o seu pedido.
                    </p>
                  </div>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isGeneratingPix || isProcessing}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 h-12 rounded-xl font-bold shadow-lg transform active:scale-95 transition-all w-full sm:w-auto"
                  >
                    {isGeneratingPix ? "Gerando..." : "Gerar PIX Agora"}
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden">
                  <QRCodePIX pixData={pixData} />
                </div>
              )}
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-gray-50 p-6 sm:p-8 rounded-3xl border border-gray-100">
                <MPCardPaymentForm
                  onSubmit={handleCardSubmit}
                  isProcessing={isProcessing}
                  amount={grandTotal}
                  orderId={currentOrderId || ""}
                  payerEmail={payerEmail}
                  payerName={payerName}
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  Seu pagamento é processado com segurança pelo Mercado Pago.
                  Não armazenamos os dados do seu cartão em nossos servidores.
                </p>
              </div>
            </div>
          )}

          {!paymentMethod && (
            <div className="py-12 text-center space-y-4 opacity-50 grayscale transition-all duration-700">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="h-10 w-10 text-gray-400" />
              </div>
              <p className="font-medium text-gray-500">
                Selecione uma forma de pagamento acima
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
