"use client";

import React, {
  ReactNode,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";
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
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isLoginPromptDismissed, setIsLoginPromptDismissed] = useState(false);
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

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
    <CartProvider>
      <ServerActionRecovery />
      <TokenMonitor>
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
      </TokenMonitor>
    </CartProvider>
  );
}

interface LoginPromptContextType {
  isOpen: boolean;
  openPrompt: (options?: { force?: boolean }) => void;
  closePrompt: (options?: { persistDismiss?: boolean }) => void;
}

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(
  undefined,
);

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

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (context === undefined) {
    throw new Error(
      "useLoginPrompt deve ser usado dentro de LoginPromptProvider",
    );
  }
  return context;
}
