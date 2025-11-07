"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { AlertTriangle, RefreshCw, Database, Wifi } from "lucide-react";

interface DatabaseErrorFallbackProps {
  onRetry?: () => void;
  error?: string;
}

export function DatabaseErrorFallback({
  onRetry,
  error,
}: DatabaseErrorFallbackProps) {
  const isConnectionError =
    error?.includes("conexão") ||
    error?.includes("database") ||
    error?.includes("connection");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="p-8 text-center max-w-md">
        <div className="mb-6">
          {isConnectionError ? (
            <Database className="h-16 w-16 mx-auto text-red-500 mb-4" />
          ) : (
            <Wifi className="h-16 w-16 mx-auto text-rose-500 mb-4" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isConnectionError
            ? "Banco de Dados Indisponível"
            : "Erro de Conexão"}
        </h1>

        <p className="text-gray-600 mb-6">
          {isConnectionError
            ? "Não foi possível conectar ao banco de dados. O servidor pode estar temporariamente indisponível."
            : "Ocorreu um problema ao carregar os dados. Tente novamente em alguns instantes."}
        </p>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Possíveis causas:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Servidor de banco de dados parado</li>
                  <li>• Problemas de rede/conectividade</li>
                  <li>• Manutenção programada</li>
                  <li>• Limite de conexões excedido</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Se o problema persistir, entre em contato com o administrador do
            sistema.
          </p>
        </div>
      </Card>
    </div>
  );
}
