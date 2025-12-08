"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  Lock,
  AlertCircle,
  RefreshCw,
  CreditCard,
} from "lucide-react";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

// ✅ Inicializar MercadoPago globalmente FORA do componente
let mpInitialized = false;
const initializeMP = () => {
  if (MP_PUBLIC_KEY && !mpInitialized && typeof window !== "undefined") {
    try {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      mpInitialized = true;
    } catch (err) {
      console.error("❌ Erro ao inicializar MercadoPago SDK:", err);
    }
  }
};

interface MPCardPaymentFormProps {
  amount: number;
  orderId: string;
  payerEmail: string;
  payerName: string;
  onSubmit: (formData: MPCardFormData) => Promise<void>;
  isProcessing?: boolean;
}

export interface MPCardFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface CardPaymentFormData {
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}

interface CardPaymentError {
  type?: string;
  message?: string;
  cause?: string;
}

export function MPCardPaymentForm({
  amount,
  orderId,
  payerEmail,
  payerName,
  onSubmit,
  isProcessing = false,
}: MPCardPaymentFormProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardPaymentReady, setCardPaymentReady] = useState(false);
  const [brickKey, setBrickKey] = useState(() => Date.now());
  const [isDelayedReady, setIsDelayedReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Inicializar MP se ainda não foi
    if (!mpInitialized) {
      initializeMP();
    }

    // Delay maior para garantir estabilidade do DOM
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsDelayedReady(true);
      }
    }, 800); // 800ms delay para maior estabilidade

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [brickKey]);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    setCardPaymentReady(false);
    setIsDelayedReady(false);
    setRetryCount((prev) => prev + 1);
    // Força remontagem do Brick com nova key
    setBrickKey(Date.now());
  }, []);

  const handleOnSubmit = useCallback(
    async (formData: CardPaymentFormData) => {
      try {
        setLocalError(null);
        setIsSubmitting(true);

        if (!orderId) {
          throw new Error("Pedido não encontrado");
        }
        if (!payerEmail) {
          throw new Error("Email do pagador é obrigatório");
        }
        if (!payerName) {
          throw new Error("Nome do pagador é obrigatório");
        }
        if (!formData?.token) {
          throw new Error("Token do cartão não foi gerado");
        }

        const paymentData: MPCardFormData = {
          token: formData.token || "",
          issuer_id: formData.issuer_id || "",
          payment_method_id: formData.payment_method_id || "credit_card",
          transaction_amount: amount,
          installments: formData.installments || 1,
          payer: {
            email: payerEmail,
            identification: {
              type: formData.payer?.identification?.type || "CPF",
              number: formData.payer?.identification?.number || "",
            },
          },
        };

        await onSubmit(paymentData);
      } catch (err) {
        console.error("Erro ao processar pagamento:", err);
        if (mountedRef.current) {
          const errorMessage =
            err instanceof Error
              ? err.message
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

  const handleOnError = useCallback((error: CardPaymentError) => {
    console.error("❌ Erro no CardPayment Brick:", error);

    if (!mountedRef.current) return;

    let errorMessage = "Erro no formulário de pagamento";

    if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.cause === "fields_setup_failed_after_3_tries") {
      errorMessage =
        "Não foi possível carregar o formulário. Clique em 'Tentar novamente' ou atualize a página.";
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.type === "critical") {
      errorMessage =
        "Erro crítico no formulário. Recarregue a página e tente novamente.";
    }

    setLocalError(errorMessage);
    setCardPaymentReady(false);
  }, []);

  const handleOnReady = useCallback(() => {
    if (mountedRef.current) {
      setCardPaymentReady(true);
      setLocalError(null);
    }
  }, []);

  if (!MP_PUBLIC_KEY) {
    return (
      <div className="p-6 border-red-200 bg-red-50">
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
    // Tentar inicializar novamente
    initializeMP();
    return (
      <div className="p-6 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-gray-600">
          Carregando formulário de pagamento...
        </span>
      </div>
    );
  }

  // Mostrar loading enquanto aguarda o delay
  if (!isDelayedReady) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <span className="font-semibold">Cartão de Crédito</span>
          </div>
        </div>
        <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-4" />
          <span className="text-gray-600">Preparando formulário seguro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-4 text-white">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <span className="font-semibold">Pagamento Seguro</span>
        </div>
        <p className="text-sm text-rose-100 mt-1">
          Seus dados são protegidos pelo Mercado Pago
        </p>
      </div>

      {localError && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{localError}</p>
              <p className="text-sm text-red-700 mt-1">
                {retryCount >= 2
                  ? "Se o problema persistir, tente recarregar a página ou usar PIX."
                  : "Clique em 'Tentar novamente' para recarregar o formulário."}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente {retryCount > 0 && `(${retryCount + 1})`}
          </button>
        </div>
      )}

      {!localError && (
        <div className="p-4 relative min-h-[400px]">
          <div ref={containerRef} id={`card-container-${brickKey}`}>
            <CardPayment
              key={`card-${orderId}-${brickKey}`}
              initialization={{
                amount: amount,
                payer: {
                  email: payerEmail,
                },
              }}
              customization={{
                paymentMethods: {
                  maxInstallments: 12,
                  minInstallments: 1,
                },
                visual: {
                  hideFormTitle: true,
                },
              }}
              onSubmit={handleOnSubmit}
              onReady={handleOnReady}
              onError={handleOnError}
            />
          </div>

          {(isProcessing || isSubmitting) && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded z-10">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-3" />
              <span className="text-gray-700 font-medium">
                Processando pagamento...
              </span>
              <span className="text-gray-500 text-sm mt-1">
                Por favor, aguarde
              </span>
            </div>
          )}

          {!cardPaymentReady && !localError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500 mb-2" />
              <span className="text-gray-600 text-sm">
                Carregando campos seguros...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Debug info em desenvolvimento */}
      {process.env.NODE_ENV === "development" && (
        <div className="p-2 bg-gray-100 text-xs text-gray-500 border-t">
          <p>🔑 PK: {MP_PUBLIC_KEY?.substring(0, 15)}...</p>
          <p>💰 Amount: R$ {amount?.toFixed(2)}</p>
          <p>📦 Order: {orderId}</p>
          <p>
            🔄 Retry: {retryCount} | Ready: {cardPaymentReady ? "✅" : "⏳"}
          </p>
        </div>
      )}
    </div>
  );
}
