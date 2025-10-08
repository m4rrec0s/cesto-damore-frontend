"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";
import { auth } from "@/app/config/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useApi } from "@/app/hooks/use-api";

interface User {
  id: string;
  name: string;
  email: string;
  firebaseUId: string;
  image_url?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string; // Mudando para string genérica
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}

interface AuthContextType {
  user: User | null;
  appToken: string | null;
  isLoading: boolean;
  login: (userData: User, appToken: string) => void;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appToken, setAppToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    // Carregar dados do localStorage na inicialização
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedAppToken = localStorage.getItem("appToken");

      if (storedUser && storedAppToken && storedAppToken !== "undefined") {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setAppToken(storedAppToken);

          // Sincronizar com cookies para o middleware
          document.cookie = `appToken=${storedAppToken}; path=/; max-age=${
            7 * 24 * 60 * 60
          }`; // 7 dias
          document.cookie = `user=${encodeURIComponent(
            storedUser
          )}; path=/; max-age=${7 * 24 * 60 * 60}`;
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("appToken");
          // Limpar cookies também
          document.cookie =
            "appToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          document.cookie =
            "user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        }
      }
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    setAppToken(token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("appToken", token);

      // Sincronizar com cookies para o middleware
      document.cookie = `appToken=${token}; path=/; max-age=${
        7 * 24 * 60 * 60
      }`; // 7 dias
      document.cookie = `user=${encodeURIComponent(
        JSON.stringify(userData)
      )}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }
  };

  const logout = () => {
    setUser(null);
    setAppToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("appToken");

      // Limpar cookies também
      document.cookie =
        "appToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Extrair informações do usuário do Google
      const email = result.user.email;
      const name = result.user.displayName;
      const imageUrl = result.user.photoURL;

      // Enviar token e informações do usuário para o backend
      const response = await api.google(idToken, { email, name, imageUrl });

      // Fazer login localmente com os dados retornados
      login(response.user, response.appToken);
    } catch (error) {
      console.error("Erro no login com Google:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    appToken,
    isLoading,
    login,
    logout,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
