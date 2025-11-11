"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Card } from "@/app/components/ui/card";

type PaymentStatus = "success" | "failure" | "pending" | "timeout";

interface PaymentStatusOverlayProps {
  status: PaymentStatus;
  paymentMethod?: "pix" | "credit_card" | "debit_card";
  onAnimationComplete?: () => void;
  showOverQRCode?: boolean;
}

export function PaymentStatusOverlay({
  status,
  paymentMethod = "pix",
  onAnimationComplete,
  showOverQRCode = false,
}: PaymentStatusOverlayProps) {
  const [show, setShow] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    "entering" | "visible" | "exiting"
  >("entering");

  useEffect(() => {
    // Mostra o overlay quando o status mudar
    if (status) {
      setShow(true);
      setAnimationPhase("entering");

      // Após animação de entrada
      const enterTimer = setTimeout(() => {
        setAnimationPhase("visible");

        // Para status de sucesso, após 2 segundos inicia animação de saída
        if (status === "success") {
          const exitTimer = setTimeout(() => {
            setAnimationPhase("exiting");

            // Após animação de saída, executa callback
            const completeTimer = setTimeout(() => {
              onAnimationComplete?.();
            }, 500);

            return () => clearTimeout(completeTimer);
          }, 2000);

          return () => clearTimeout(exitTimer);
        }
      }, 300);

      return () => clearTimeout(enterTimer);
    }
  }, [status, onAnimationComplete]);

  if (!show) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: CheckCircle2,
          iconColor: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "Pagamento Confirmado!",
          message:
            paymentMethod === "pix"
              ? "Seu pagamento via PIX foi confirmado com sucesso."
              : "Seu pagamento foi aprovado com sucesso.",
          pulse: true,
        };
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-yellow-500",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          title: "Validando Pagamento...",
          message:
            paymentMethod === "pix"
              ? "Aguardando confirmação do seu pagamento PIX."
              : "Estamos validando seus dados de pagamento.",
          pulse: false,
        };
      case "failure":
        return {
          icon: XCircle,
          iconColor: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          title: "Pagamento Rejeitado",
          message:
            "Não foi possível processar seu pagamento. Por favor, tente novamente.",
          pulse: false,
        };
      case "timeout":
        return {
          icon: Clock,
          iconColor: "text-orange-500",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          title: "Tempo Esgotado",
          message:
            "O tempo de espera pelo pagamento expirou. Por favor, tente novamente.",
          pulse: false,
        };
      default:
        return {
          icon: Loader2,
          iconColor: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          title: "Processando...",
          message: "Aguarde enquanto processamos seu pagamento.",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case "entering":
        return "scale-0 opacity-0";
      case "visible":
        return "scale-100 opacity-100";
      case "exiting":
        return "scale-0 opacity-0";
      default:
        return "";
    }
  };

  return (
    <div
      className={`
        ${showOverQRCode ? "absolute inset-0 z-50" : ""}
        flex items-center justify-center
        ${showOverQRCode ? "bg-white/95 backdrop-blur-sm rounded-2xl" : ""}
      `}
    >
      <Card
        className={`
          ${config.bgColor} ${config.borderColor}
          border-2 p-8 max-w-md w-full
          transition-all duration-500 ease-out
          ${getAnimationClasses()}
        `}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Ícone com animação */}
          <div
            className={`
              ${config.pulse ? "animate-pulse" : ""}
              p-4 rounded-full ${config.bgColor}
            `}
          >
            <Icon
              className={`
                ${config.iconColor} w-16 h-16
                ${status === "pending" ? "animate-spin" : ""}
                ${status === "success" ? "animate-bounce" : ""}
              `}
            />
          </div>

          {/* Título */}
          <h3 className="text-2xl font-bold text-gray-900">{config.title}</h3>

          {/* Mensagem */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {config.message}
          </p>

          {/* Status de sucesso - informação adicional */}
          {status === "success" && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200 w-full">
              <p className="text-xs text-gray-500 mb-1">
                Você será redirecionado em instantes...
              </p>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                <span className="text-sm font-medium">
                  Preparando seus pedidos
                </span>
              </div>
            </div>
          )}

          {/* Status pendente - informação adicional */}
          {status === "pending" && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Aguardando confirmação...</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
