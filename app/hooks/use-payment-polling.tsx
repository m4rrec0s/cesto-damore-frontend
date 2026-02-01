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
  const hasTimeoutRef = useRef(false); // Previne restart após timeout

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
      const order = await api.getOrder(orderId);

      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      setCurrentOrder(order);

      const paymentStatus = order.payment?.status;
      const orderStatus = order.status;

      // const safePaymentId = order.payment?.id
      //   ? `${order.payment?.id.slice(0, 4)}...${order.payment?.id.slice(-4)}`
      //   : undefined;
      // const safeMercadoId = order.payment?.mercado_pago_id
      //   ? `***${order.payment?.mercado_pago_id.slice(-4)}`
      //   : undefined;

      if (!order.payment && orderStatus === "PAID") {
        setStatus("success");
        stopPolling();
        onSuccess?.(order);
        return;
      }

      if (!order.payment) {
        if (attemptsRef.current >= maxAttempts) {
          setStatus("timeout");
          stopPolling();
          onTimeout?.();
        }
        return;
      }

      if (
        paymentStatus === "APPROVED" ||
        paymentStatus === "AUTHORIZED" ||
        orderStatus === "PAID"
      ) {
        setStatus("success");
        stopPolling();
        onSuccess?.(order);
        return;
      }

      if (
        paymentStatus === "REJECTED" ||
        paymentStatus === "CANCELLED" ||
        paymentStatus === "REFUNDED" ||
        orderStatus === "CANCELED"
      ) {
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
        setStatus("pending");
        onPending?.(order);
        // Continua polling
      }

      // Ainda pendente, continua verificando
      if (attemptsRef.current >= maxAttempts) {
        setStatus("timeout");
        hasTimeoutRef.current = true; // Marca como com timeout para evitar restart
        stopPolling();
        onTimeout?.();
        return;
      }
    } catch (err) {
      console.error("[Payment Polling] Erro ao verificar status:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao verificar status";
      setError(errorMessage);

      if (attemptsRef.current >= maxAttempts) {
        setStatus("timeout");
        hasTimeoutRef.current = true;
        stopPolling();
        onTimeout?.();
      }
    }
  }, [
    orderId,
    maxAttempts,
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
    hasTimeoutRef.current = false; // Reset o flag de timeout
  }, [stopPolling]);

  // Auto-start quando enabled e orderId são fornecidos
  useEffect(() => {
    if (enabled && orderId && status === "idle" && !hasTimeoutRef.current) {
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
