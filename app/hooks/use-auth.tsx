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

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(tokenData: Record<string, unknown>): boolean {
  if (!tokenData.exp || typeof tokenData.exp !== "number") return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return tokenData.exp < currentTime;
}

interface User {
  id: string;
  name: string;
  email: string;
  firebaseUId: string;
  image_url?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string;
  document?: string | null;
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

    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedAppToken = localStorage.getItem("appToken");

      if (storedUserId && storedAppToken && storedAppToken !== "undefined") {
        const tokenData = decodeToken(storedAppToken);

        if (tokenData && isTokenExpired(tokenData)) {
          console.warn("⏰ Token expirado ao carregar do localStorage");
          localStorage.removeItem("userId");
          localStorage.removeItem("appToken");
          localStorage.removeItem("tokenTimestamp");
          document.cookie =
            "appToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          setIsLoading(false);
          return;
        }

        api
          .getUser(storedUserId)
          .then((userData) => {
            setUser(userData);
            setAppToken(storedAppToken);
            document.cookie = `appToken=${storedAppToken}; path=/; max-age=${
              12 * 60 * 60
            }; Secure; SameSite=Strict`;
          })
          .catch((error) => {
            console.error("Erro ao carregar dados do usuário:", error);
            localStorage.removeItem("userId");
            localStorage.removeItem("appToken");
            localStorage.removeItem("tokenTimestamp");
            document.cookie =
              "appToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    }
  }, [api]);

  const login = (userData: User, token: string) => {

    const tokenData = decodeToken(token);
    if (!tokenData || isTokenExpired(tokenData)) {
      console.error("❌ Token inválido ou expirado");
      throw new Error("Token inválido ou expirado");
    }

    setUser(userData);
    setAppToken(token);
    if (typeof window !== "undefined") {

      localStorage.setItem("userId", userData.id);
      localStorage.setItem("appToken", token);
      localStorage.setItem("tokenTimestamp", Date.now().toString());

      document.cookie = `appToken=${token}; path=/; max-age=${
        12 * 60 * 60
      }; Secure; SameSite=Strict`;
    }
  };

  const logout = () => {
    setUser(null);
    setAppToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId");
      localStorage.removeItem("appToken");
      localStorage.removeItem("tokenTimestamp");

      document.cookie =
        "appToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
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

      const email = result.user.email;
      const name = result.user.displayName;
      const imageUrl = result.user.photoURL;

      const response = await api.google(idToken, { email, name, imageUrl });

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
