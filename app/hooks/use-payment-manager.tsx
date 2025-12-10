"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { Order, useApi } from "./use-api";
import { toast } from "sonner";

export function usePaymentManager() {
  const { user } = useAuth();
  const { getPendingOrder, cancelOrder } = useApi();
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);

  /**
   * Verifica se há um pedido pendente de pagamento
   */
  const checkPendingOrder = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const order = await getPendingOrder(user.id);
      setPendingOrder(order);
      return order;
    } catch (error) {
      console.error(
        "Erro ao verificar pedido pendente:",
        error instanceof Error ? error.message : String(error)
      );
      setPendingOrder(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, getPendingOrder]);

  /**
   * Cancela o pedido pendente atual
   */
  const handleCancelOrder = useCallback(async () => {
    if (!pendingOrder) {
      toast.error("Nenhum pedido para cancelar");
      return false;
    }

    try {
      setIsCanceling(true);
      await cancelOrder(pendingOrder.id);

      setPendingOrder(null);

      toast.success("Pedido cancelado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao cancelar pedido:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao cancelar pedido";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsCanceling(false);
    }
  }, [pendingOrder, cancelOrder]);

  /**
   * Limpa o pedido pendente do estado (usado quando o pagamento é concluído)
   */
  const clearPendingOrder = useCallback(() => {
    setPendingOrder(null);
  }, []);

  // Verificar pedido pendente ao montar o componente
  useEffect(() => {
    checkPendingOrder();
  }, [checkPendingOrder]);

  return {
    pendingOrder,
    isLoading,
    isCanceling,
    checkPendingOrder,
    handleCancelOrder,
    clearPendingOrder,
    hasPendingOrder: !!pendingOrder,
  };
}
