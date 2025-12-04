"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  CheckCircle,
  Clock,
  Smartphone,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

export interface PixData {
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
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface QRCodePIXProps {
  pixData: PixData;
  onCopyCode?: () => void;
}

export function QRCodePIX({ pixData, onCopyCode }: QRCodePIXProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [qrImageError, setQrImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calcular tempo restante
  useEffect(() => {
    if (!pixData.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(pixData.expires_at).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000)); // em segundos
      } else {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [pixData.expires_at]);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "00:00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      onCopyCode?.();

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar código:", error);
    }
  }, [pixData.qr_code, onCopyCode]);

  const handleOpenTicket = useCallback(() => {
    if (pixData.ticket_url) {
      window.open(pixData.ticket_url, "_blank");
    }
  }, [pixData.ticket_url]);

  const isExpiring = timeLeft > 0 && timeLeft < 300; // Menos de 5 minutos

  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-6 md:py-8">
      {/* Cabeçalho com Valor */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <p className="text-sm md:text-base text-gray-600 font-medium">
          Valor a pagar
        </p>
        <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
          R$ {pixData.amount.toFixed(2).replace(".", ",")}
        </p>
      </motion.div>

      {/* Timer / Alerta de Expiração */}
      {timeLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4 ${
            isExpiring
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div className={isExpiring ? "text-red-600" : "text-blue-600"}>
            <Clock className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs md:text-sm font-semibold ${
                isExpiring ? "text-red-900" : "text-blue-900"
              }`}
            >
              {isExpiring ? "Expirando em breve" : "Expira em"}
            </p>
            <p
              className={`text-lg md:text-xl font-bold tabular-nums ${
                isExpiring ? "text-red-700" : "text-blue-600"
              }`}
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Card Principal com QR Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <Card className="p-0 md:p-8 bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
          <div className="space-y-6 md:space-y-8">
            {/* Seção de QR Code */}
            <div className="space-y-4">
              <div className="text-center space-y-1 px-4 md:px-0">
                <h3 className="text-lg md:text-xl font-bold text-gray-900">
                  Escaneie o QR Code
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Com o seu banco ou app de pagamento
                </p>
              </div>

              {/* QR Code Image */}
              <div className="flex justify-center px-4 md:px-0">
                <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-200 flex items-center justify-center">
                  {!qrImageError && pixData.qr_code_base64 ? (
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      src={`data:image/png;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56"
                      onError={() => setQrImageError(true)}
                    />
                  ) : (
                    <div className="text-center space-y-2 p-4">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-xs md:text-sm text-gray-600">
                        QR Code não disponível
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="hidden md:flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-500 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Seção de Código PIX */}
            <div className="space-y-4 px-4 md:px-0">
              <h4 className="text-center text-sm md:text-base font-semibold text-gray-900">
                Copie o código PIX
              </h4>

              <div className="bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200 space-y-3">
                <p className="text-xs text-gray-600 text-center md:text-left">
                  Código (Chave)
                </p>
                <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-300">
                  <p className="text-xs md:text-sm font-mono text-gray-500 truncate">
                    {pixData.qr_code}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Botões de Ação */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 px-4 md:px-0"
      >
        <Button
          onClick={handleCopyCode}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 md:h-14 text-base md:text-lg rounded-xl transition-all shadow-md hover:shadow-lg"
          disabled={copied}
        >
          {copied ? (
            <>
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 mr-2" />
              <span className="hidden sm:inline">Código Copiado!</span>
              <span className="sm:hidden">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 md:w-6 md:h-6 mr-2" />
              <span className="hidden sm:inline">Copiar Código PIX</span>
              <span className="sm:hidden">Copiar</span>
            </>
          )}
        </Button>

        {pixData.ticket_url && (
          <Button
            onClick={handleOpenTicket}
            variant="outline"
            className="w-full border-gray-300 hover:bg-gray-50 h-12 md:h-14 text-base md:text-lg rounded-xl font-semibold"
          >
            <ExternalLink className="w-5 h-5 md:w-6 md:h-6 mr-2" />
            <span className="hidden sm:inline">Ver no Mercado Pago</span>
            <span className="sm:hidden">Mercado Pago</span>
          </Button>
        )}
      </motion.div>

      {/* Instruções */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-4 md:px-0"
      >
        <Alert className="bg-blue-50 border-blue-200">
          <Smartphone className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-xs md:text-sm text-blue-800">
            Abra o app do seu banco, escolha <strong>Pagar com PIX</strong>,
            escaneie o código acima ou copie e cole a chave.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-gray-400 pt-2"
      >
        <p>Pagamento via PIX • Processado pelo Mercado Pago</p>
      </motion.div>
    </div>
  );
}
