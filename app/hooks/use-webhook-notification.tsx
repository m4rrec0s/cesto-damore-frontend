"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useApi } from "./use-api";

interface PaymentUpdateData {
  type: "payment_update" | "payment_error" | "connected";
  orderId: string;
  status?: string;
  paymentId?: string;
  mercadoPagoId?: string;
  approvedAt?: string;
  paymentMethod?: string;
  timestamp?: string;
  error?: {
    message: string;
    code?: string;
  };
}

interface UseWebhookNotificationOptions {
  orderId: string | null;
  enabled?: boolean;
  enablePollingFallback?: boolean;
  pollingInterval?: number;
  onPaymentUpdate?: (data: PaymentUpdateData) => void;
  onPaymentApproved?: (data: PaymentUpdateData) => void;
  onPaymentRejected?: (data: PaymentUpdateData) => void;
  onPaymentPending?: (data: PaymentUpdateData) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const DEFAULT_POLLING_INTERVAL = 5000;

export function useWebhookNotification({
  orderId,
  enabled = true,
  enablePollingFallback = true,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
  onPaymentUpdate,
  onPaymentApproved,
  onPaymentRejected,
  onPaymentPending,
  onError,
  onConnected,
  onDisconnected,
}: UseWebhookNotificationOptions) {
  const api = useApi();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const lastConnectTimeRef = useRef<number | null>(null);
  const lastPaymentStatusRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  const pollOrderStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const order = await api.getOrder(orderId);

      if (!order || !order.payment) return;

      const currentStatus = order.payment.status;

      if (lastPaymentStatusRef.current === currentStatus) {
        return;
      }

      lastPaymentStatusRef.current = currentStatus;

      const paymentData: PaymentUpdateData = {
        type: "payment_update",
        orderId: order.id,
        status: currentStatus,
        paymentId: order.payment.id,
        mercadoPagoId: order.payment.mercado_pago_id || undefined,
        approvedAt: order.payment.approved_at
          ? new Date(order.payment.approved_at).toLocaleString("pt-BR")
          : undefined,
        paymentMethod: order.payment.payment_method || undefined,
        timestamp: new Date().toLocaleString("pt-BR"),
      };

      onPaymentUpdate?.(paymentData);

      if (currentStatus === "APPROVED") {
        onPaymentApproved?.(paymentData);
        stopPolling();
      } else if (
        currentStatus === "REJECTED" ||
        currentStatus === "CANCELLED"
      ) {
        onPaymentRejected?.(paymentData);
        stopPolling();
      } else if (
        currentStatus === "PENDING" ||
        currentStatus === "IN_PROCESS"
      ) {
        onPaymentPending?.(paymentData);
      }
    } catch (error) {
      console.error("❌ Erro ao fazer polling de status:", error);

    }
  }, [
    orderId,
    api,
    onPaymentUpdate,
    onPaymentApproved,
    onPaymentRejected,
    onPaymentPending,
    stopPolling,
  ]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);
    pollOrderStatus();

    pollingIntervalRef.current = window.setInterval(() => {
      pollOrderStatus();
    }, pollingInterval);
  }, [pollOrderStatus, pollingInterval]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: PaymentUpdateData = JSON.parse(event.data);

        onPaymentUpdate?.(data);

        switch (data.type) {
          case "connected":
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current as unknown as number);
              reconnectTimeoutRef.current = null;
            }
            onConnected?.();
            break;

          case "payment_update":
            if (data.status === "approved") {
              onPaymentApproved?.(data);
            } else if (
              data.status === "rejected" ||
              data.status === "cancelled"
            ) {
              onPaymentRejected?.(data);
            } else if (
              data.status === "pending" ||
              data.status === "in_process"
            ) {
              onPaymentPending?.(data);
            }
            break;

          case "payment_error":
            console.error("❌ Payment error:", data.error);
            if (data.error) {
              onError?.(data.error);
            }
            break;
          default:
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    },
    [
      onPaymentUpdate,
      onPaymentApproved,
      onPaymentRejected,
      onPaymentPending,
      onError,
      onConnected,
    ],
  );

  const handleError = useCallback(
    (event: Event) => {
      console.error("❌ SSE Error:", event);
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        onDisconnected?.();

        if (
          enablePollingFallback &&
          reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS
        ) {
          console.warn(
            `⚠️ SSE failed after ${MAX_RECONNECT_ATTEMPTS} attempts. Switching to polling fallback.`,
          );
          startPolling();
        }
        return;
      }

      reconnectAttemptsRef.current += 1;
      const attempt = reconnectAttemptsRef.current;
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30000);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current as unknown as number);
        reconnectTimeoutRef.current = null;
      }

      try {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
      } catch {}

      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          try {
            if (orderId && enabled) {
              connectRef.current?.();
            }
          } catch (err) {
            console.error("Erro na tentativa de reconexão SSE:", err);
          }
        }, backoffMs);
      } else if (enablePollingFallback) {

        console.warn(
          `⚠️ SSE reconnection limit reached. Switching to polling fallback.`,
        );
        startPolling();
      }
    },
    [onDisconnected, orderId, enabled, enablePollingFallback, startPolling],
  );

  const connect = useCallback(() => {
    if (!orderId || !enabled) {
      return;
    }

    if (eventSourceRef.current) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const url = `${apiUrl}/webhooks/notifications/${orderId}`;

    try {
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current as unknown as number);
          reconnectTimeoutRef.current = null;
        }
        onConnected?.();
      };

      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;

      eventSourceRef.current = eventSource;
      lastConnectTimeRef.current = Date.now();

      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current as unknown as number);
        reconnectTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error creating EventSource:", error);
      onError?.({
        message: "Falha ao conectar ao servidor de notificações",
      });
    }
  }, [orderId, enabled, handleMessage, handleError, onError, onConnected]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      if (
        lastConnectTimeRef.current &&
        Date.now() - lastConnectTimeRef.current < 500
      ) {
        return;
      }
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onDisconnected?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current as unknown as number);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    }

    stopPolling();
  }, [onDisconnected, stopPolling]);

  useEffect(() => {
    if (enabled && orderId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [orderId, enabled, connect, disconnect]);

  return {
    isConnected,
    isPolling,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 100);
    },
  };
}
