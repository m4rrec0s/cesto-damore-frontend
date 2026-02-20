"use client";

import { useEffect } from "react";
import { useAuth } from "./use-auth";
import { useCartContext } from "./cart-context";
import { guestCartService } from "@/app/services/guestCartService";

/**
 * Hook que restaura o carrinho do visitante após login
 * Deve ser usado na página de login ou em um componente de redirecionamento após login
 */
export function useRestoreGuestCart() {
  const { user } = useAuth();
  const { addToCart } = useCartContext();

  useEffect(() => {
    if (user) {
      const savedCart = guestCartService.getSavedGuestCart();

      if (savedCart && savedCart.items.length > 0) {
        console.log(
          "🔄 Restaurando carrinho do visitante após login:",
          savedCart.items,
        );

        const restoreCart = async () => {
          for (const item of savedCart.items) {
            try {
              await addToCart(
                item.productId,
                item.quantity,
                item.additionals,
                item.additionalColors,
                item.customizations,
              );
            } catch (error) {
              console.error(
                `Erro ao restaurar item ${item.productId}:`,
                error,
              );
            }
          }

          // Clear the saved cart after restoring
          guestCartService.clearGuestCart();
          console.log("✅ Carrinho restaurado e limpeza concluída");
        };

        restoreCart();
      }
    }
  }, [user, addToCart]);
}
