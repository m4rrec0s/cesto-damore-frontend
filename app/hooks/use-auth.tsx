"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";

interface User {
  id: string;
  name: string;
  email: string;
  firebaseUId: string;
  image_url?: string | null;
  phone?: string | null;
  address?: string | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appToken, setAppToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar dados do localStorage na inicialização
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedAppToken = localStorage.getItem("appToken");

      if (storedUser && storedAppToken) {
        try {
          setUser(JSON.parse(storedUser));
          setAppToken(storedAppToken);
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("appToken");
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
    }
  };

  const logout = () => {
    setUser(null);
    setAppToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("appToken");
    }
  };

  const value: AuthContextType = {
    user,
    appToken,
    isLoading,
    login,
    logout,
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
