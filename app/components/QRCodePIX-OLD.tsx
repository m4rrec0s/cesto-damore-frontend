"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/alert";
import { Copy, ExternalLink, Clock, CheckCircle } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Textarea } from "./ui/textarea";

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
    if (seconds <= 0) return "00:00:00:00";

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const remainingSeconds = seconds % 60;

    return `${days.toString().padStart(2, "0")}:${hours
      .toString()
      .padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-4">
      {/* Header com valor */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-gray-600 font-medium">Valor a pagar</p>
        <p className="text-4xl font-bold text-gray-900">
          R$ {pixData.amount.toFixed(2).replace(".", ",")}
        </p>
      </motion.div>

      {/* Timer */}
      {timeLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert className="border-amber-200 bg-amber-50">
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-800">Expira em:</span>
                <span className="text-xl font-bold text-amber-600 tabular-nums">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* QR Code Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-gray-900">
                Escaneie o QR Code
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Use o aplicativo do seu banco
              </p>
            </div>

            {/* QR Code Image */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              {!qrImageError && pixData.qr_code_base64 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Image
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    width={240}
                    height={240}
                    sizes="240px"
                    className="w-full max-w-[240px] h-auto rounded-lg"
                    onError={() => setQrImageError(true)}
                    onLoad={() => setQrImageError(false)}
                    priority
                  />
                </motion.div>
              ) : (
                <div className="w-[240px] h-[240px] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  <div className="text-center text-gray-500 p-4">
                    <p className="text-sm font-medium">QR Code indisponível</p>
                    <p className="text-xs mt-2">Use o código PIX abaixo</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs text-gray-500 font-medium">ou</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Código PIX */}
            <div className="w-full space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 text-center">
                Copie o código PIX
              </h4>

              <div className="relative">
                <Textarea
                  value={pixData.qr_code}
                  readOnly
                  className="w-full p-3 pr-12 border border-slate-300 rounded-lg text-xs font-mono resize-none h-24 bg-slate-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  onClick={handleCopyCode}
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-slate-200"
                  disabled={copied}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3"
      >
        <Button
          onClick={handleCopyCode}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-12 text-base"
          disabled={copied}
        >
          {copied ? (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Código Copiado!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5 mr-2" />
              Copiar Código PIX
            </>
          )}
        </Button>

        {pixData.ticket_url && (
          <Button
            onClick={handleOpenTicket}
            variant="outline"
            className="w-full border-slate-300 hover:bg-slate-50 h-12 text-base"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Ver no Mercado Pago
          </Button>
        )}
      </motion.div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-gray-500 pt-2"
      >
        <p>Pagamento via PIX • Processado pelo Mercado Pago</p>
      </motion.div>
    </div>
  );
}
