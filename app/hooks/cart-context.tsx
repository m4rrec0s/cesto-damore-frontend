"use client";

import React, { createContext, useContext, ReactNode } from "react";
import {
  useCart,
  CartState,
  DeliveryWindow,
  TimeSlot,
  AvailableDate,
} from "./use-cart";

interface CartContextType {
  cart: CartState;
  addToCart: (
    productId: string,
    quantity?: number,
    additionals?: string[]
  ) => Promise<void>;
  removeFromCart: (productId: string, additionals?: string[]) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    additionals?: string[]
  ) => void;
  clearCart: () => void;
  createOrder: (
    userId: string,
    deliveryAddress?: string,
    deliveryDate?: Date
  ) => Promise<{ id: number; status: string; total: number }>;
  createPaymentPreference: (
    userEmail: string,
    orderId?: string
  ) => Promise<{
    init_point?: string;
    sandbox_init_point?: string;
    id: string;
  }>;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const cartHook = useCart();

  return (
    <CartContext.Provider value={cartHook}>{children}</CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
