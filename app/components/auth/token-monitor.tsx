"use client";

import { useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useRouter } from "next/navigation";

// Função para decodificar JWT
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

// Função para verificar se o token está prestes a expirar (5 minutos antes)
function isTokenNearExpiry(token: string, minutesBefore: number = 5): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - currentTime;
  return timeUntilExpiry <= minutesBefore * 60;
}

// Função para verificar se o token está expirado
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

    // Verificar imediatamente se o token está expirado
    if (isTokenExpired(appToken)) {
      console.log("🔐 Token expirado detectado, fazendo logout automático");
      logout();
      router.push("/login?reason=token_expired");
      return;
    }

    // Configurar verificação periódica do token
    const checkTokenInterval = setInterval(() => {
      if (!appToken) {
        clearInterval(checkTokenInterval);
        return;
      }

      if (isTokenExpired(appToken)) {
        console.log("🔐 Token expirou, fazendo logout automático");
        clearInterval(checkTokenInterval);
        logout();
        router.push("/login?reason=token_expired");
      } else if (isTokenNearExpiry(appToken)) {
        console.log("⚠️ Token próximo ao vencimento");
        // Aqui você pode implementar renovação automática do token
        // ou mostrar um aviso para o usuário
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(checkTokenInterval);
  }, [appToken, logout, router, user]);

  return <>{children}</>;
}
