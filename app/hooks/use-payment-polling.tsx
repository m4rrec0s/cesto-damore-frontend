"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApi } from "@/app/hooks/use-api";
import type { Order } from "@/app/hooks/use-api";

export type PaymentPollingStatus =
  | "idle"
  | "polling"
  | "success"
  | "failure"
  | "timeout"
  | "pending";

interface UsePaymentPollingOptions {
  orderId: string | null;
  enabled?: boolean;
  maxAttempts?: number;
  intervalMs?: number;
  onSuccess?: (order: Order) => void;
  onFailure?: (order: Order) => void;
  onTimeout?: () => void;
  onPending?: (order: Order) => void;
}

interface UsePaymentPollingReturn {
  status: PaymentPollingStatus;
  currentOrder: Order | null;
  attempts: number;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

/**
 * Hook para fazer polling do status de pagamento de um pedido
 * Verifica periodicamente se o webhook do Mercado Pago atualizou o status
 */
export function usePaymentPolling({
  orderId,
  enabled = true,
  maxAttempts = 60, // 60 tentativas = 5 minutos (a cada 5 segundos)
  intervalMs = 5000, // 5 segundos entre cada verificação
  onSuccess,
  onFailure,
  onTimeout,
  onPending,
}: UsePaymentPollingOptions): UsePaymentPollingReturn {
  const api = useApi();
  const [status, setStatus] = useState<PaymentPollingStatus>("idle");
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const checkOrderStatus = useCallback(async () => {
    if (!orderId) {
      setError("ID do pedido não fornecido");
      stopPolling();
      return;
    }

    // Se já foi aprovado, não verificar novamente
    if (status === "success") {
      stopPolling();
      return;
    }

    try {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      console.log(
        `[Payment Polling] Tentativa ${attemptsRef.current}/${maxAttempts} - Verificando pedido ${orderId}`
      );

      // Buscar pedido atualizado
      const order = await api.getOrder(orderId);

      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      setCurrentOrder(order);

      // Verificar status do pagamento através do payment vinculado ao pedido
      const paymentStatus = order.payment?.status;
      const orderStatus = order.status;

      const safePaymentId = order.payment?.id
        ? `${order.payment?.id.slice(0, 4)}...${order.payment?.id.slice(-4)}`
        : undefined;
      const safeMercadoId = order.payment?.mercado_pago_id
        ? `***${order.payment?.mercado_pago_id.slice(-4)}`
        : undefined;

      console.log(
        `[Payment Polling] 📊 Status: order=${order.id}, orderStatus=${orderStatus}, paymentStatus=${paymentStatus}, paymentId=${safePaymentId}, mercadoPagoId=${safeMercadoId}, webhookAttempts=${order.payment?.webhook_attempts}`
      );

      // ⚠️ FALLBACK: Se payment não existe mas order está PAID
      if (!order.payment && orderStatus === "PAID") {
        console.log(
          "[Payment Polling] ✅ Pedido marcado como PAGO (sem objeto payment)"
        );
        setStatus("success");
        stopPolling();
        onSuccess?.(order);
        return;
      }

      // ⚠️ FALLBACK: Se não tem payment ainda, continuar tentando
      if (!order.payment) {
        console.log("[Payment Polling] ⏳ Aguardando criação do pagamento...", {
          orderStatus,
        });
        // Continua polling
        if (attemptsRef.current >= maxAttempts) {
          console.log(
            "[Payment Polling] ⏱️ Timeout - pagamento não foi criado"
          );
          setStatus("timeout");
          stopPolling();
          onTimeout?.();
        }
        return;
      }

      // Pagamento aprovado
      if (
        paymentStatus === "APPROVED" ||
        paymentStatus === "AUTHORIZED" ||
        orderStatus === "PAID"
      ) {
        console.log("[Payment Polling] ✅ PAGAMENTO APROVADO!", {
          paymentStatus,
          orderStatus,
          orderId: order.id,
          paymentId: safePaymentId,
          mercadoPagoId: safeMercadoId,
        });
        setStatus("success");
        stopPolling();
        onSuccess?.(order);
        return;
      }

      // Pagamento rejeitado/cancelado
      if (
        paymentStatus === "REJECTED" ||
        paymentStatus === "CANCELLED" ||
        paymentStatus === "REFUNDED" ||
        orderStatus === "CANCELED"
      ) {
        console.log("[Payment Polling] ❌ Pagamento rejeitado ou cancelado");
        setStatus("failure");
        stopPolling();
        onFailure?.(order);
        return;
      }

      // Pagamento em processamento/validação
      if (
        paymentStatus === "PROCESSING" ||
        paymentStatus === "IN_PROCESS" ||
        paymentStatus === "IN_MEDIATION" ||
        orderStatus === "PROCESSING"
      ) {
        console.log("[Payment Polling] ⏳ Pagamento em validação...");
        setStatus("pending");
        onPending?.(order);
        // Continua polling
      }

      // Ainda pendente, continua verificando
      if (attemptsRef.current >= maxAttempts) {
        console.log(
          "[Payment Polling] ⏱️ Timeout - máximo de tentativas atingido"
        );
        setStatus("timeout");
        stopPolling();
        onTimeout?.();
        return;
      }

      console.log(
        `[Payment Polling] ⏳ Pagamento ainda pendente (${paymentStatus}), verificando novamente em ${
          intervalMs / 1000
        }s...`
      );
    } catch (err) {
      console.error("[Payment Polling] Erro ao verificar status:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao verificar status";
      setError(errorMessage);

      // Em caso de erro, continua tentando até o timeout
      if (attemptsRef.current >= maxAttempts) {
        setStatus("timeout");
        stopPolling();
        onTimeout?.();
      }
    }
  }, [
    orderId,
    maxAttempts,
    intervalMs,
    api,
    onSuccess,
    onFailure,
    onTimeout,
    onPending,
    stopPolling,
    status,
  ]);

  const startPolling = useCallback(() => {
    if (isPolling || !orderId) return;

    console.log(
      `[Payment Polling] 🚀 Iniciando polling para pedido ${orderId}`
    );
    setStatus("polling");
    setIsPolling(true);
    setError(null);
    attemptsRef.current = 0;
    setAttempts(0);

    // Primeira verificação imediata
    checkOrderStatus();

    // Configura verificações periódicas
    intervalRef.current = setInterval(() => {
      checkOrderStatus();
    }, intervalMs);
  }, [isPolling, orderId, intervalMs, checkOrderStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setCurrentOrder(null);
    setAttempts(0);
    setError(null);
    attemptsRef.current = 0;
  }, [stopPolling]);

  // Auto-start quando enabled e orderId são fornecidos
  useEffect(() => {
    if (enabled && orderId && status === "idle") {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, orderId, status, startPolling, stopPolling]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    currentOrder,
    attempts,
    error,
    startPolling,
    stopPolling,
    reset,
  };
}
