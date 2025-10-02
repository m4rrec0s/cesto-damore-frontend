"use client";

import { useAuth } from "../../hooks/use-auth";
import { useState } from "react";
import { ChevronDown, ChevronUp, User, Shield } from "lucide-react";

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

export default function AuthStatusDebug() {
  const { appToken, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Não mostrar em produção
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const appTokenPayload = appToken ? decodeJWT(appToken) : null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("pt-BR");
  };

  const getTimeRemaining = (exp: number) => {
    const remaining = exp - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return "EXPIRADO";

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm z-40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-sm font-medium text-gray-700">Status Auth</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-3 text-xs space-y-3">
          {/* User Info */}
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-700">Usuário</div>
              <div className="text-gray-600">
                {user ? (
                  <>
                    <div>Email: {user.email}</div>
                    <div>Role: {user.role || "N/A"}</div>
                    <div>UID: {user.firebaseUId?.substring(0, 8)}...</div>
                  </>
                ) : (
                  <div className="text-red-600">Não logado</div>
                )}
              </div>
            </div>
          </div>

          {/* App Token */}
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-700">App Token</div>
              <div className="text-gray-600">
                {appToken && appTokenPayload ? (
                  <>
                    <div>Válido até: {formatDate(appTokenPayload.exp)}</div>
                    <div>Restam: {getTimeRemaining(appTokenPayload.exp)}</div>
                    <div>Role: {appTokenPayload.role || "N/A"}</div>
                  </>
                ) : (
                  <div className="text-red-600">Token ausente/inválido</div>
                )}
              </div>
            </div>
          </div>

          {/* Tokens Status */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-gray-500 text-[10px]">
              App: {appToken ? `${appToken.length} chars` : "N/A"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
