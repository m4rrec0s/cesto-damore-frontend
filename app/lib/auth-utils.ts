import { toast } from "sonner";

/**
 * Obtém o token JWT do localStorage de forma segura
 * @returns O token JWT ou null se não existir ou for inválido
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token =
    localStorage.getItem("appToken") || localStorage.getItem("token");

  if (!token || token === "null" || token === "undefined") {
    console.error("Token JWT não encontrado ou inválido");
    toast.error("Sessão expirada. Faça login novamente.");
    return null;
  }

  return token;
};

/**
 * Cria headers de autenticação para requisições HTTP
 * @param additionalHeaders Headers adicionais opcionais
 * @returns Headers com Authorization Bearer token ou headers vazios se não houver token
 */
export const getAuthHeaders = (
  additionalHeaders?: Record<string, string>
): HeadersInit => {
  const token = getAuthToken();

  if (!token) {
    return additionalHeaders || {};
  }

  return {
    Authorization: `Bearer ${token}`,
    ...additionalHeaders,
  };
};

/**
 * Verifica se o usuário está autenticado
 * @returns true se houver um token válido, false caso contrário
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const token =
    localStorage.getItem("appToken") || localStorage.getItem("token");
  return !(!token || token === "null" || token === "undefined");
};

/**
 * Remove o token de autenticação (logout)
 */
export const clearAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("appToken");
    localStorage.removeItem("token");
  }
};

/**
 * Salva o token de autenticação
 * @param token O token JWT para salvar
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("appToken", token);

    localStorage.removeItem("token");
  }
};
