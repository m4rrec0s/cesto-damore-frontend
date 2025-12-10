"use client";

import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Loader2,
  Lock,
  AlertCircle,
  RefreshCw,
  CreditCard,
  QrCode,
} from "lucide-react";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

// ✅ Inicializar MercadoPago globalmente FORA do componente
let mpInitialized = false;
const initializeMP = () => {
  if (MP_PUBLIC_KEY && !mpInitialized && typeof window !== "undefined") {
    try {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      mpInitialized = true;
      console.log("✅ MercadoPago SDK inicializado");
    } catch (err) {
      console.error("❌ Erro ao inicializar MercadoPago SDK:", err);
    }
  }
};

if (typeof window !== "undefined") {
  initializeMP();
}

interface MPPaymentBrickProps {
  amount: number;
  orderId: string;
  payerEmail: string;
  payerName: string;
  onSubmit: (formData: MPPaymentFormData) => Promise<void>;
  onPaymentMethodChange?: (method: "card" | "pix") => void;
  isProcessing?: boolean;
}

export interface MPPaymentFormData {
  token?: string;
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount: number;
  installments?: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
    first_name?: string;
    last_name?: string;
  };
  // PIX specific
  payment_type?: string;
}

interface PaymentBrickError {
  type?: string;
  message?: string;
  cause?: string;
}

// Mapeamento de erros do MercadoPago para mensagens amigáveis
const errorMessages: Record<string, string> = {
  cc_rejected_bad_filled_card_number:
    "Número do cartão incorreto. Verifique e tente novamente.",
  cc_rejected_bad_filled_security_code:
    "Código de segurança (CVV) incorreto. Verifique e tente novamente.",
  cc_rejected_bad_filled_date:
    "Data de validade incorreta. Verifique e tente novamente.",
  cc_rejected_bad_filled_other:
    "Verifique os dados do cartão e tente novamente.",
  cc_rejected_insufficient_amount:
    "Saldo insuficiente. Tente com outro cartão.",
  cc_rejected_max_attempts:
    "Limite de tentativas atingido. Aguarde alguns minutos.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Verifique seu extrato.",
  cc_rejected_card_disabled:
    "Cartão desabilitado. Entre em contato com seu banco.",
  cc_rejected_call_for_authorize:
    "Pagamento não autorizado. Contate seu banco.",
  cc_rejected_high_risk: "Pagamento recusado por segurança.",
  cc_rejected_other_reason: "Pagamento não autorizado. Tente outro cartão.",
};

export function MPPaymentBrick({
  amount,
  orderId,
  payerEmail,
  payerName,
  onSubmit,
  onPaymentMethodChange,
  isProcessing = false,
}: MPPaymentBrickProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [brickKey, setBrickKey] = useState(() => Date.now());
  const mountedRef = useRef(true);

  // Usar refs para valores estáveis e evitar remounts desnecessários
  const initialAmountRef = useRef(amount);
  const initialOrderIdRef = useRef(orderId);

  // Apenas atualizar se for a primeira montagem ou se brickKey mudar (retry manual)
  useEffect(() => {
    if (!initialAmountRef.current) initialAmountRef.current = amount;
    if (!initialOrderIdRef.current) initialOrderIdRef.current = orderId;
  }, [amount, orderId]);

  const stableKey = useMemo(
    () => `payment-${initialOrderIdRef.current || orderId}-${brickKey}`,
    [orderId, brickKey]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        const controller = (
          window as unknown as {
            paymentBrickController?: { unmount: () => void };
          }
        ).paymentBrickController;
        if (controller?.unmount) {
          controller.unmount();
          console.log("🧹 Payment Brick desmontado");
        }
      } catch {
        // Ignorar erros de cleanup
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    setPaymentReady(false);
    setBrickKey(Date.now());
  }, []);

  const handleOnSubmit = useCallback(
    async (formData: MPPaymentFormData) => {
      try {
        setLocalError(null);
        setIsSubmitting(true);

        if (!orderId) {
          throw new Error("Pedido não encontrado");
        }
        if (!payerEmail) {
          throw new Error("Email do pagador é obrigatório");
        }

        const nameParts = payerName.split(" ");
        const firstName = nameParts[0] || "Cliente";
        const lastName = nameParts.slice(1).join(" ") || "";

        const paymentData: MPPaymentFormData = {
          token: formData.token,
          issuer_id: formData.issuer_id,
          payment_method_id: formData.payment_method_id || "pix",
          transaction_amount: amount,
          installments: formData.installments || 1,
          payer: {
            email: formData.payer?.email || payerEmail,
            first_name: formData.payer?.first_name || firstName,
            last_name: formData.payer?.last_name || lastName,
            identification: {
              type: formData.payer?.identification?.type || "CPF",
              number: formData.payer?.identification?.number || "",
            },
          },
          payment_type: formData.payment_type,
        };

        await onSubmit(paymentData);
      } catch (_err) {
        console.error("Erro ao processar pagamento:", _err);
        if (mountedRef.current) {
          const errorMessage =
            _err instanceof Error
              ? _err.message
              : "Erro ao processar o pagamento";
          setLocalError(errorMessage);
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [amount, orderId, payerEmail, payerName, onSubmit]
  );

  const handleOnError = useCallback((error: PaymentBrickError) => {
    console.error("❌ Erro no Payment Brick:", error);
    if (!mountedRef.current) return;

    let errorMessage = "Erro no formulário de pagamento";

    if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.cause && errorMessages[error.cause]) {
      errorMessage = errorMessages[error.cause];
    } else if (error?.cause === "fields_setup_failed_after_3_tries") {
      errorMessage =
        "Não foi possível carregar o formulário. Clique em 'Tentar novamente'.";
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.type === "critical") {
      errorMessage = "Erro crítico. Recarregue a página e tente novamente.";
    }

    setLocalError(errorMessage);
    setPaymentReady(false);
  }, []);

  const handleOnReady = useCallback(() => {
    console.log("✅ Payment Brick montado com sucesso");
    if (mountedRef.current) {
      setPaymentReady(true);
      setLocalError(null);
    }
  }, []);

  const handleOnBinChange = useCallback(
    (bin: string) => {
      console.log("💳 BIN detectado:", bin);
      onPaymentMethodChange?.("card");
    },
    [onPaymentMethodChange]
  );

  if (!MP_PUBLIC_KEY) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600">
            Chave pública do Mercado Pago não configurada
          </p>
        </div>
      </div>
    );
  }

  if (!mpInitialized) {
    initializeMP();
    return (
      <div className="p-8 flex items-center justify-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        <span className="text-gray-600 font-medium">
          Carregando opções de pagamento...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5" />
          <span className="font-semibold text-lg">Pagamento Seguro</span>
        </div>
        <p className="text-rose-100 text-sm mt-1">
          Seus dados são protegidos pelo Mercado Pago
        </p>

        {/* Payment method badges */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
            <CreditCard className="h-4 w-4" />
            <span>Cartão</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
            <QrCode className="h-4 w-4" />
            <span>PIX</span>
          </div>
        </div>
      </div>

      {/* Error State */}
      {localError && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{localError}</p>
              <p className="text-sm text-red-700 mt-1">
                Verifique os dados e tente novamente.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Payment Brick */}
      {!localError && (
        <div className="p-4 sm:p-6 relative min-h-[450px]">
          <Payment
            key={stableKey}
            initialization={{
              amount: initialAmountRef.current || amount,
              payer: {
                email: payerEmail,
              },
            }}
            customization={{
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                ticket: "all",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                bankTransfer: "all" as any,
                maxInstallments: 12,
              },
              visual: {
                hideFormTitle: true,
                hidePaymentButton: false,
              },
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={handleOnSubmit as any}
            onReady={handleOnReady}
            onError={handleOnError}
            onBinChange={handleOnBinChange}
          />

          {/* Loading Overlay */}
          {(isProcessing || isSubmitting) && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl z-10">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-3" />
              <span className="text-gray-700 font-medium">
                Processando pagamento...
              </span>
              <span className="text-gray-500 text-sm mt-1">
                Por favor, aguarde
              </span>
            </div>
          )}

          {/* Initial Loading */}
          {!paymentReady && !localError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-3" />
              <span className="text-gray-600 font-medium">
                Carregando formulário...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer info */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          <span>Transação processada com segurança pelo Mercado Pago</span>
        </div>
      </div>
    </div>
  );
}
