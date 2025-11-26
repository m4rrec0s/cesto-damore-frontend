"use client";

import { useEffect, useCallback, useRef, useState } from "react";

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
  onPaymentUpdate?: (data: PaymentUpdateData) => void;
  onPaymentApproved?: (data: PaymentUpdateData) => void;
  onPaymentRejected?: (data: PaymentUpdateData) => void;
  onPaymentPending?: (data: PaymentUpdateData) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Hook para receber notificações em tempo real via Server-Sent Events (SSE)
 * Conecta ao backend e recebe atualizações automáticas sobre o status do pagamento
 *
 * @example
 * ```tsx
 * const { isConnected } = useWebhookNotification({
 *   orderId: currentOrderId,
 *   enabled: Boolean(currentOrderId),
 *   onPaymentApproved: (data) => {
 *     console.log("✅ Pagamento aprovado!", data);
 *     setPaymentStatus("success");
 *     router.push(`/pedidos/${data.orderId}`);
 *   },
 *   onPaymentRejected: (data) => {
 *     console.log("❌ Pagamento rejeitado", data);
 *     setPaymentStatus("failure");
 *   }
 * });
 * ```
 */
export function useWebhookNotification({
  orderId,
  enabled = true,
  onPaymentUpdate,
  onPaymentApproved,
  onPaymentRejected,
  onPaymentPending,
  onError,
  onConnected,
  onDisconnected,
}: UseWebhookNotificationOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const lastConnectTimeRef = useRef<number | null>(null);

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
    ]
  );

  const handleError = useCallback(
    (event: Event) => {
      console.error("❌ SSE Error:", event);
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        onDisconnected?.();
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
      } catch {
      }

      reconnectTimeoutRef.current = window.setTimeout(() => {
        try {
          if (orderId && enabled) {
            connectRef.current?.();
          }
        } catch (err) {
          console.error("Erro na tentativa de reconexão SSE:", err);
        }
      }, backoffMs);
    },
    [onDisconnected, orderId, enabled]
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
  }, [onDisconnected]);

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
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 100);
    },
  };
}
