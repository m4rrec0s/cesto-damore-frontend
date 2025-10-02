"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { AlertTriangle, X, RotateCcw } from "lucide-react";

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

// Função para verificar se o token está prestes a expirar
function getTokenExpiryInfo(token: string) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - currentTime;
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);

  return {
    timeUntilExpiry,
    minutesUntilExpiry,
    isNearExpiry: timeUntilExpiry <= 10 * 60, // 10 minutos
    isVeryNearExpiry: timeUntilExpiry <= 5 * 60, // 5 minutos
  };
}

export default function TokenExpiryWarning() {
  const { appToken, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expiryInfo, setExpiryInfo] =
    useState<ReturnType<typeof getTokenExpiryInfo>>(null);

  useEffect(() => {
    if (!appToken || !user) {
      setExpiryInfo(null);
      return;
    }

    const updateExpiryInfo = () => {
      const info = getTokenExpiryInfo(appToken);
      setExpiryInfo(info);

      // Reset dismissed state if token is very close to expiry
      if (info?.isVeryNearExpiry) {
        setDismissed(false);
      }
    };

    // Verificar imediatamente
    updateExpiryInfo();

    // Atualizar a cada 30 segundos quando próximo ao vencimento
    const interval = setInterval(updateExpiryInfo, 30000);

    return () => clearInterval(interval);
  }, [appToken, user]);

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      // Implementar renovação de token aqui
      // Por enquanto, vamos apenas rejeitar
      throw new Error(
        "Renovação automática não implementada. Faça login novamente."
      );
    } catch (error) {
      console.error("Erro ao renovar token:", error);
      // Redirecionar para login em caso de erro
      window.location.href = "/login?reason=token_expired";
    } finally {
      setIsRefreshing(false);
    }
  };

  // Não mostrar se não há token, usuário, info de expiração ou foi dispensado
  if (!appToken || !user || !expiryInfo || dismissed) {
    return null;
  }

  // Só mostrar se está próximo ao vencimento
  if (!expiryInfo.isNearExpiry) {
    return null;
  }

  const urgencyLevel = expiryInfo.isVeryNearExpiry ? "critical" : "warning";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-4 ${
        urgencyLevel === "critical"
          ? "bg-red-600 text-white"
          : "bg-yellow-500 text-yellow-900"
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-medium">
              {urgencyLevel === "critical"
                ? "Sessão expirando!"
                : "Aviso de sessão"}
            </span>
            <span className="ml-2">
              Sua sessão expira em {expiryInfo.minutesUntilExpiry} minuto(s).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${
              urgencyLevel === "critical"
                ? "bg-white text-red-600 hover:bg-gray-100"
                : "bg-yellow-900 text-yellow-100 hover:bg-yellow-800"
            } disabled:opacity-50`}
          >
            <RotateCcw
              className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Renovando..." : "Renovar"}
          </button>

          {!expiryInfo.isVeryNearExpiry && (
            <button
              onClick={() => setDismissed(true)}
              className={`p-1 rounded hover:bg-black/10`}
              title="Dispensar aviso"
              aria-label="Dispensar aviso de expiração"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
