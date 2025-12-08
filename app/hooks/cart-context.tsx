"use client";

import React, { createContext, useContext, ReactNode } from "react";
import {
  useCart,
  CartState,
  DeliveryWindow,
  TimeSlot,
  AvailableDate,
  CartCustomization,
} from "./use-cart";

interface CartContextType {
  cart: CartState;
  onCartItemAdded?: () => void;
  addToCart: (
    productId: string,
    quantity?: number,
    additionals?: string[],
    additionalColors?: Record<string, string>,
    customizations?: CartCustomization[]
  ) => Promise<void>;
  removeFromCart: (
    productId: string,
    additionals?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    additionals?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>
  ) => void;
  updateCustomizations: (
    productId: string,
    oldCustomizations: CartCustomization[],
    newCustomizations: CartCustomization[],
    additionals?: string[],
    additionalColors?: Record<string, string>
  ) => void;
  clearCart: () => void;
  createOrder: (
    userId: string,
    deliveryAddress?: string,
    deliveryDate?: Date,
    options?: {
      shippingCost?: number;
      paymentMethod?: "pix" | "card";
      grandTotal?: number;
      deliveryCity?: string;
      deliveryState?: string;
      recipientPhone?: string;
    }
  ) => Promise<unknown>;
  createOrderWithTransparentCheckout: (
    userId: string,
    deliveryAddress?: string,
    deliveryDate?: Date,
    options?: {
      shippingCost?: number;
      paymentMethod?: "pix" | "card";
      grandTotal?: number;
      deliveryCity?: string;
      deliveryState?: string;
      recipientPhone?: string;
    }
  ) => Promise<{
    order: { id: number; status: string; total: number };
    checkoutUrl: string;
    redirectToCheckout: () => void;
  }>;
  createPaymentPreference: (
    userEmail: string,
    orderId?: string
  ) => Promise<{
    init_point?: string;
    sandbox_init_point?: string;
    id: string;
  }>;
  processTransparentPayment: (
    orderId: string,
    paymentData: {
      payment_method_id: "pix" | "credit_card" | "debit_card";
      token?: string;
      issuer_id?: string;
      installments?: number;
      payer: {
        email: string;
        first_name?: string;
        last_name?: string;
        identification?: {
          type: string;
          number: string;
        };
      };
    }
  ) => Promise<unknown>;
  // Funções de entrega
  getDeliveryWindows: () => {
    weekdays: DeliveryWindow[];
    weekends: DeliveryWindow[];
  };
  isWeekend: (date: Date) => boolean;
  hasCustomItems: () => boolean;
  getMinPreparationHours: () => number;
  generateTimeSlots: (date: Date) => TimeSlot[];
  getAvailableDates: () => AvailableDate[];
  getDeliveryDateBounds: () => { minDate: Date; maxDate: Date };
  formatDate: (date: Date) => string;
  orderMetadata: Record<string, unknown>;
  setOrderMetadata: (metadata: Record<string, unknown>) => void;
  getMaxProductionTime: () => number;
  isDateDisabledInCalendar: (date: Date) => boolean;
  getProductionTimeline: () => {
    productionHours: number;
    productionEndsAt: Date;
    earliestPickupTime: Date;
    formattedProductionEnds: string;
    formattedPickup: string;
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  onCartItemAdded,
}: {
  children: ReactNode;
  onCartItemAdded?: () => void;
}) {
  const cartHook = useCart();

  // Criar um wrapper para addToCart que chama a callback
  const wrappedAddToCart: typeof cartHook.addToCart = async (...args) => {
    await cartHook.addToCart(...args);
    onCartItemAdded?.();
  };

  // Adicionar callback e wrapper ao objeto do hook
  const contextValue: CartContextType = {
    ...cartHook,
    addToCart: wrappedAddToCart,
    onCartItemAdded,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
