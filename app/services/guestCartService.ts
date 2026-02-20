/* eslint-disable @typescript-eslint/no-explicit-any */
const GUEST_CART_KEY = "guest_cart_state";
const GUEST_CUSTOMIZATIONS_KEY = "guest_customizations";

export interface GuestCartState {
  items: Array<{
    productId: string;
    quantity: number;
    additionals?: string[];
    additionalColors?: Record<string, string>;
    customizations?: any[];
  }>;
  savedAt: number;
  expiresAt: number;
}

export const guestCartService = {
  saveGuestCart: (items: any[]): void => {
    try {
      const cartState: GuestCartState = {
        items,
        savedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartState));
      console.log("✅ Carrinho do visitante salvo localmente");
    } catch (error) {
      console.warn("⚠️ Erro ao salvar carrinho local:", error);
    }
  },

  getSavedGuestCart: (): GuestCartState | null => {
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      if (!saved) return null;

      const cart: GuestCartState = JSON.parse(saved);

      // Check if expired
      if (cart.expiresAt && Date.now() > cart.expiresAt) {
        console.log("🗑️ Carrinho expirado, removendo");
        guestCartService.clearGuestCart();
        return null;
      }

      return cart;
    } catch (error) {
      console.warn("⚠️ Erro ao recuperar carrinho local:", error);
      return null;
    }
  },

  clearGuestCart: (): void => {
    try {
      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem(GUEST_CUSTOMIZATIONS_KEY);
      console.log("✅ Carrinho do visitante limpo");
    } catch (error) {
      console.warn("⚠️ Erro ao limpar carrinho local:", error);
    }
  },

  saveCustomizations: (customizations: Record<string, any>): void => {
    try {
      localStorage.setItem(
        GUEST_CUSTOMIZATIONS_KEY,
        JSON.stringify(customizations),
      );
    } catch (error) {
      console.warn("⚠️ Erro ao salvar customizações:", error);
    }
  },

  getSavedCustomizations: (): Record<string, any> | null => {
    try {
      const saved = localStorage.getItem(GUEST_CUSTOMIZATIONS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("⚠️ Erro ao recuperar customizações:", error);
      return null;
    }
  },
};
