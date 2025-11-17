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
  // Controle para reconexões com backoff exponencial
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const lastConnectTimeRef = useRef<number | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: PaymentUpdateData = JSON.parse(event.data);
        console.log("📨 SSE Message received:", {
          type: data.type,
          orderId: data.orderId,
          status: data.status || null,
        });

        // Executar callback genérico
        onPaymentUpdate?.(data);

        // Executar callbacks específicos baseados no tipo
        switch (data.type) {
          case "connected":
            console.log("✅ SSE Connected to order:", data.orderId);
            setIsConnected(true);
            // Reset reconnection attempts on successful connect
            reconnectAttemptsRef.current = 0;
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current as unknown as number);
              reconnectTimeoutRef.current = null;
            }
            onConnected?.();
            break;

          case "payment_update":
            console.log("💳 Payment update:", data.status);

            // Callbacks baseados no status do pagamento
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
            console.log("ℹ️ Unknown SSE message type:", data.type);
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
      // Se a conexão foi fechada permanentemente, chamar onDisconnected
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        console.log("🔌 SSE Connection closed");
        setIsConnected(false);
        onDisconnected?.();
        return;
      }

      reconnectAttemptsRef.current += 1;
      const attempt = reconnectAttemptsRef.current;
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30000);

      console.warn(
        `🔁 SSE transient error - agendando reconexão em ${backoffMs}ms (tentativa ${attempt})`
      );

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current as unknown as number);
        reconnectTimeoutRef.current = null;
      }

      try {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
      } catch {
        /* ignore */
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
      console.log("⏸️ SSE not enabled or no orderId");
      return;
    }

    if (eventSourceRef.current) {
      console.log("ℹ️ SSE already connected");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const url = `${apiUrl}/webhooks/notifications/${orderId}`;

    console.log("🔌 Connecting to SSE for orderId:", orderId);

    try {
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("✅ SSE connection opened (onopen)");
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
      console.log("✅ SSE EventSource created");

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
        console.warn("🔁 Suppressing immediate disconnect (recent connect)");
        return;
      }
      console.log("🔌 Disconnecting SSE");
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
    console.log(
      "useWebhookNotification useEffect: orderId=",
      orderId,
      "enabled=",
      enabled
    );
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
