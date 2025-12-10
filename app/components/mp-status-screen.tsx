"use client";

import { StatusScreen, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

// Inicialização global
let mpInitialized = false;
const initializeMP = () => {
  if (MP_PUBLIC_KEY && !mpInitialized && typeof window !== "undefined") {
    try {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      mpInitialized = true;
    } catch (err) {
      console.error("Erro ao inicializar MercadoPago:", err);
    }
  }
};

if (typeof window !== "undefined") {
  initializeMP();
}

interface MPStatusScreenProps {
  paymentId: string;
  onContinue?: () => void;
  onError?: (error: unknown) => void;
}

type StatusType = "approved" | "pending" | "rejected" | "unknown";

const statusConfig: Record<
  StatusType,
  {
    icon: typeof CheckCircle2;
    bgColor: string;
    iconColor: string;
    title: string;
    description: string;
  }
> = {
  approved: {
    icon: CheckCircle2,
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
    title: "Pagamento Aprovado!",
    description: "Seu pedido foi confirmado com sucesso.",
  },
  pending: {
    icon: Clock,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    title: "Pagamento Pendente",
    description: "Aguardando confirmação do pagamento.",
  },
  rejected: {
    icon: XCircle,
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    title: "Pagamento Recusado",
    description: "Não foi possível processar o pagamento.",
  },
  unknown: {
    icon: AlertCircle,
    bgColor: "bg-gray-50",
    iconColor: "text-gray-500",
    title: "Status Desconhecido",
    description: "Verificando status do pagamento...",
  },
};

export function MPStatusScreen({
  paymentId,
  onContinue,
  onError,
}: MPStatusScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [status] = useState<StatusType>("unknown");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        const controller = (
          window as unknown as {
            statusScreenBrickController?: { unmount: () => void };
          }
        ).statusScreenBrickController;
        if (controller?.unmount) {
          controller.unmount();
        }
      } catch {
        // Ignorar erros de cleanup
      }
    };
  }, []);

  const handleOnReady = useCallback(() => {
    console.log("✅ StatusScreen Brick pronto");
    if (mountedRef.current) {
      setIsReady(true);
    }
  }, []);

  const handleOnError = useCallback(
    (error: unknown) => {
      console.error("❌ Erro no StatusScreen:", error);
      onError?.(error);
    },
    [onError]
  );

  if (!MP_PUBLIC_KEY || !mpInitialized) {
    initializeMP();
    return (
      <div className="p-8 flex items-center justify-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        <span className="text-gray-600">Carregando status...</span>
      </div>
    );
  }

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Custom Header */}
      <div className={`p-6 ${config.bgColor} border-b border-gray-100`}>
        <div className="flex items-center justify-center gap-3">
          <StatusIcon className={`h-10 w-10 ${config.iconColor}`} />
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
            <p className="text-gray-600 text-sm mt-1">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Status Screen Brick */}
      <div className="p-4 sm:p-6 relative min-h-[300px]">
        <StatusScreen
          initialization={{
            paymentId: paymentId,
          }}
          onReady={handleOnReady}
          onError={handleOnError}
        />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        )}
      </div>

      {/* Continue Button */}
      {onContinue && isReady && (
        <div className="px-4 sm:px-6 pb-6">
          <button
            onClick={onContinue}
            className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
