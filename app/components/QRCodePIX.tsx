"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  Calendar,
} from "lucide-react";
import Image from "next/image";

interface PixData {
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

  // Formatar tempo restante
  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  // Copiar código PIX
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

  // Abrir ticket do Mercado Pago
  const handleOpenTicket = useCallback(() => {
    if (pixData.ticket_url) {
      window.open(pixData.ticket_url, "_blank");
    }
  }, [pixData.ticket_url]);

  // Formatar data de expiração
  const formatExpirationDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }, []);

  // Status do pagamento
  const getStatusInfo = useCallback(() => {
    switch (pixData.status) {
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Clock,
          text: "Aguardando Pagamento",
        };
      case "approved":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          text: "Aprovado",
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: AlertCircle,
          text: "Rejeitado",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
          text: pixData.status || "Processando",
        };
    }
  }, [pixData.status]);

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Informações do Pagamento */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            📋 Informações do Pagamento
          </h3>

          <div className="space-y-2">
            <p className="text-2xl font-bold text-rose-600">
              💰 R$ {pixData.amount.toFixed(2).replace(".", ",")}
            </p>

            {pixData.payment_id && (
              <p className="text-sm text-gray-600">
                🆔 ID: {pixData.payment_id}
              </p>
            )}

            {pixData.mercado_pago_id && (
              <p className="text-sm text-gray-600">
                🏷️ Mercado Pago: {pixData.mercado_pago_id}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="mt-4">
            <Badge className={`${statusInfo.color} border px-3 py-1`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {statusInfo.text}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Timer de Expiração */}
      {timeLeft > 0 && (
        <Alert className="border-rose-200 bg-rose-50">
          <Clock className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800">
            <div className="flex items-center justify-between">
              <span>⏰ Tempo restante para pagamento:</span>
              <span className="font-bold text-lg text-rose-600">
                {formatTime(timeLeft)}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* QR Code */}
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">📱 QR Code PIX</h3>

          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
            {!qrImageError && pixData.qr_code_base64 ? (
              <Image
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                width={250}
                height={250}
                sizes="250px"
                className="max-w-[250px] h-auto"
                onError={() => setQrImageError(true)}
                onLoad={() => setQrImageError(false)}
              />
            ) : (
              <div className="w-[250px] h-[250px] bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">QR Code não disponível</p>
                  <p className="text-xs">Use o código PIX abaixo</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-3">
            📱 Escaneie o código QR com o seu app do banco
          </p>
        </div>
      </Card>

      {/* Código PIX para Cópia */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Código PIX</h3>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <strong>Ou copie o código PIX:</strong>
          </p>

          <div className="flex gap-2">
            <textarea
              value={pixData.qr_code}
              readOnly
              className="flex-1 p-3 border border-gray-300 rounded-md text-xs font-mono resize-none h-20 bg-gray-50"
              placeholder="Código PIX"
            />
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="px-4"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Informações do Pagador */}
      {pixData.payer_info &&
        (pixData.payer_info.email || pixData.payer_info.first_name) && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <User className="h-5 w-5 mr-2" />
              👤 Dados do Pagador
            </h3>

            <div className="space-y-2 text-sm">
              {pixData.payer_info.first_name && (
                <p className="text-blue-700">
                  📝 <strong>Nome:</strong> {pixData.payer_info.first_name}{" "}
                  {pixData.payer_info.last_name || ""}
                </p>
              )}
              {pixData.payer_info.email && (
                <p className="text-blue-700">
                  📧 <strong>Email:</strong> {pixData.payer_info.email}
                </p>
              )}
              {pixData.payer_info.id && (
                <p className="text-blue-700">
                  🆔 <strong>ID:</strong> {pixData.payer_info.id}
                </p>
              )}
            </div>
          </Card>
        )}

      {/* Informações de Expiração */}
      {pixData.expires_at && (
        <Card className="p-6 bg-purple-50 border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            📅 Informações de Expiração
          </h3>

          <p className="text-purple-700 text-sm">
            <strong>Expira em:</strong>{" "}
            {formatExpirationDate(pixData.expires_at)}
          </p>
        </Card>
      )}

      {/* Instruções */}
      <Card className="p-6 bg-violet-50 border-violet-200">
        <h3 className="text-lg font-semibold text-violet-800 mb-3">
          📱 Como pagar com PIX
        </h3>

        <ol className="text-violet-700 text-sm space-y-2 list-decimal list-inside">
          <li>Abra o app do seu banco</li>
          <li>Escolha a opção PIX</li>
          <li>Escaneie o QR Code ou copie o código</li>
          <li>Confirme o pagamento</li>
        </ol>

        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-medium">
            ⚠️ O código expira em {Math.floor(timeLeft / 60)} minutos!
          </AlertDescription>
        </Alert>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        {pixData.ticket_url && (
          <Button
            onClick={handleOpenTicket}
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver no Mercado Pago
          </Button>
        )}

        <Button
          onClick={handleCopyCode}
          className="flex-1 bg-rose-600 hover:bg-rose-700"
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
              Copiar Código PIX
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
