"use client";

import React, { ReactNode, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { CartProvider } from "@/app/hooks/cart-context";
import TokenMonitor from "../auth/token-monitor";
import ServerActionRecovery from "../runtime/server-action-recovery";
import { useAuth } from "@/app/hooks/use-auth";
import { usePathname } from "next/navigation";

const LOGIN_POPUP_SESSION_KEY = "cesto_login_popup_dismissed";
const LoginPopUp = dynamic(() => import("../login-pop-up"), {
  ssr: false,
  loading: () => null,
});

export default function AppWrapper({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isLoginPromptDismissed, setIsLoginPromptDismissed] = useState(false);
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  const handleCartItemAdded = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(LOGIN_POPUP_SESSION_KEY) === "1";
    setIsLoginPromptDismissed(dismissed);
  }, []);

  const closeLoginPrompt = useCallback(
    ({ persistDismiss = true }: { persistDismiss?: boolean } = {}) => {
      setIsLoginPromptOpen(false);
      if (persistDismiss && typeof window !== "undefined") {
        sessionStorage.setItem(LOGIN_POPUP_SESSION_KEY, "1");
        setIsLoginPromptDismissed(true);
      }
    },
    [],
  );

  const openLoginPrompt = useCallback(
    ({ force = false }: { force?: boolean } = {}) => {
      if (!force) {
        if (isLoading || !!user || isLoginPromptDismissed) return;
      }
      setIsLoginPromptOpen(true);
    },
    [isLoading, user, isLoginPromptDismissed],
  );

  useEffect(() => {
    if (isLoading || user || isLoginPromptDismissed) return;

    if (pathname === "/login" || pathname.startsWith("/manage")) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsLoginPromptOpen(true);
    }, 7000);

    return () => clearTimeout(timeout);
  }, [isLoading, user, pathname, isLoginPromptDismissed]);

  useEffect(() => {
    if (user) {
      setIsLoginPromptOpen(false);
    }
  }, [user]);

  return (
    <CartProvider onCartItemAdded={handleCartItemAdded}>
      <ServerActionRecovery />
      <TokenMonitor>
        <CartSheetProvider isOpen={isCartOpen} setIsOpen={setIsCartOpen}>
          <LoginPromptProvider
            isOpen={isLoginPromptOpen}
            openPrompt={openLoginPrompt}
            closePrompt={closeLoginPrompt}
          >
            {children}
            {isLoginPromptOpen ? (
              <LoginPopUp
                isVisible={isLoginPromptOpen}
                onClose={() => closeLoginPrompt()}
                onSuccess={() => closeLoginPrompt({ persistDismiss: false })}
              />
            ) : null}
          </LoginPromptProvider>
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

interface LoginPromptContextType {
  isOpen: boolean;
  openPrompt: (options?: { force?: boolean }) => void;
  closePrompt: (options?: { persistDismiss?: boolean }) => void;
}

const CartSheetContext = createContext<CartSheetContextType | undefined>(
  undefined,
);

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(
  undefined,
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

function LoginPromptProvider({
  children,
  isOpen,
  openPrompt,
  closePrompt,
}: {
  children: ReactNode;
  isOpen: boolean;
  openPrompt: (options?: { force?: boolean }) => void;
  closePrompt: (options?: { persistDismiss?: boolean }) => void;
}) {
  return (
    <LoginPromptContext.Provider value={{ isOpen, openPrompt, closePrompt }}>
      {children}
    </LoginPromptContext.Provider>
  );
}

export function useCartSheet() {
  const context = useContext(CartSheetContext);
  if (context === undefined) {
    throw new Error("useCartSheet deve ser usado dentro de CartSheetProvider");
  }
  return context;
}

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (context === undefined) {
    throw new Error(
      "useLoginPrompt deve ser usado dentro de LoginPromptProvider",
    );
  }
  return context;
}
