"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useApi } from "../hooks/use-api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface LoginPopUpProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginPopUp = ({ isVisible, onClose, onSuccess }: LoginPopUpProps) => {
  const { login, loginWithGoogle } = useAuth();
  const api = useApi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.login({ email, password });
      login(response.user, response.appToken);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Não foi possível fazer login.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível fazer login com Google.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
            <p className="mt-1 text-sm text-gray-600">
              Faça login para personalizar itens e finalizar pedidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || isGoogleLoading}
          />
          <Input
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting || isGoogleLoading}
          />
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="w-full mt-3"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || isGoogleLoading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isGoogleLoading ? "Conectando..." : "Entrar com Google"}
        </Button>

        <div className="mt-4 text-center text-sm text-gray-600">
          Ainda não tem conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Criar cadastro
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPopUp;
