"use client";

import { useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useRouter } from "next/navigation";

function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenNearExpiry(token: string, minutesBefore: number = 5): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - currentTime;
  return timeUntilExpiry <= minutesBefore * 60;
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

interface TokenMonitorProps {
  children: React.ReactNode;
}

export default function TokenMonitor({ children }: TokenMonitorProps) {
  const { appToken, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!appToken || !user) return;

    if (isTokenExpired(appToken)) {
      logout();
      router.push("/login?reason=token_expired");
      return;
    }

    const checkTokenInterval = setInterval(() => {
      if (!appToken) {
        clearInterval(checkTokenInterval);
        return;
      }

      if (isTokenExpired(appToken)) {
        clearInterval(checkTokenInterval);
        logout();
        router.push("/login?reason=token_expired");
      } else if (isTokenNearExpiry(appToken)) {

      }
    }, 60000);

    return () => clearInterval(checkTokenInterval);
  }, [appToken, logout, router, user]);

  return <>{children}</>;
}
