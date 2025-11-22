"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
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
    if (seconds <= 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
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
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        {timeLeft > 0 && (
          <Alert className="border-amber-200 bg-amber-50 flex-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Tempo para pagar:</span>
                <span className="font-bold text-lg text-amber-600">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center sm:text-right">
          <p className="text-xs text-gray-600 mb-1">Valor a pagar</p>
          <p className="text-3xl font-bold text-gray-900">
            R$ {pixData.amount.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-8 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 shadow-lg">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Escaneie o QR Code
              </p>
              <p className="text-xs text-gray-500">
                com seu aplicativo bancário
              </p>
            </div>

            {/* QR Code Image */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
              {!qrImageError && pixData.qr_code_base64 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Image
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    width={280}
                    height={280}
                    sizes="280px"
                    className="max-w-[280px] h-auto rounded-lg"
                    onError={() => setQrImageError(true)}
                    onLoad={() => setQrImageError(false)}
                    priority
                  />
                </motion.div>
              ) : (
                <div className="w-[280px] h-[280px] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                  <div className="text-center text-gray-500">
                    <p className="text-sm font-medium">QR Code indisponível</p>
                    <p className="text-xs mt-2">Use o código PIX abaixo</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Ou copie o código PIX
          </h3>

          <div className="flex gap-2">
            <Textarea
              value={pixData.qr_code}
              readOnly
              className="flex-1 p-3 border border-slate-300 rounded-lg text-xs font-mono resize-none h-20 bg-slate-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="px-4 h-auto self-center bg-white hover:bg-blue-50 border-slate-300"
              disabled={copied}
            >
              {copied ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs">Copiado!</span>
                </motion.div>
              ) : (
                <motion.div className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  <span className="text-xs">Copiar</span>
                </motion.div>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 pt-4"
      >
        <Button
          onClick={handleCopyCode}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          disabled={copied}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Código Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Código
            </>
          )}
        </Button>

        {pixData.ticket_url && (
          <Button
            onClick={handleOpenTicket}
            variant="outline"
            className="flex-1 border-slate-300 hover:bg-slate-50 bg-transparent"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver no Mercado Pago
          </Button>
        )}
      </motion.div>
    </div>
  );
}
