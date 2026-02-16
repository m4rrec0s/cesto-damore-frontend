"use client";

import React, { ReactNode, useState, useCallback } from "react";
import { CartProvider } from "@/app/hooks/cart-context";
import TokenMonitor from "../auth/token-monitor";

export default function AppWrapper({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleCartItemAdded = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  return (
    <CartProvider onCartItemAdded={handleCartItemAdded}>
      <TokenMonitor>
        <CartSheetProvider isOpen={isCartOpen} setIsOpen={setIsCartOpen}>
          {children}
        </CartSheetProvider>
      </TokenMonitor>
    </CartProvider>
  );
}

import { createContext, useContext } from "react";

interface CartSheetContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartSheetContext = createContext<CartSheetContextType | undefined>(
  undefined
);

function CartSheetProvider({
  children,
  isOpen,
  setIsOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  return (
    <CartSheetContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </CartSheetContext.Provider>
  );
}

export function useCartSheet() {
  const context = useContext(CartSheetContext);
  if (context === undefined) {
    throw new Error("useCartSheet deve ser usado dentro de CartSheetProvider");
  }
  return context;
}
