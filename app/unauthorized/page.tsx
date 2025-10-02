"use client";

import Link from "next/link";
import { useAuth } from "../hooks/use-auth";
import { Shield, ArrowLeft, LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página. Esta área é
            restrita a administradores.
          </p>
        </div>

        {user && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Usuário atual:</strong> {user.name}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Perfil:</strong> {user.role || "Cliente"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Início
          </Link>

          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Fazer Logout
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Fazer Login
            </Link>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Se você acredita que deveria ter acesso a esta área, entre em
            contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
