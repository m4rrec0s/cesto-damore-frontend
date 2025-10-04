"use client";

import { useState, useEffect } from "react";
import { useApi, Color } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import { ColorManager } from "../components/color-manager";
import { ChevronLeft, Palette } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CoresPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    if (!isAdmin && !authLoading) {
      router.push("/");
      return;
    }

    const loadColors = async () => {
      setLoading(true);
      try {
        const colorsData = await api.getColors();
        setColors(colorsData);
      } catch (error) {
        console.error("Erro ao carregar cores:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin) {
      loadColors();
    }
  }, [api, isAdmin, authLoading, user, router]);

  const handleUpdate = () => {
    api.invalidateCache();
    const loadColors = async () => {
      try {
        const colorsData = await api.getColors();
        setColors(colorsData);
      } catch (error) {
        console.error("Erro ao recarregar cores:", error);
      }
    };
    loadColors();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading
              ? "Verificando autenticação..."
              : "Carregando cores..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/manage" className="p-2 rounded-md hover:bg-gray-100">
                <ChevronLeft className="text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gerenciamento de Cores
                  </h1>
                  <p className="text-sm text-gray-600">
                    Crie e gerencie cores para seus adicionais
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Olá, {user?.name}</span>
              {isAdmin && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">
                Total de Cores
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {colors.length}
              </p>
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-4">
              <p className="text-sm text-pink-600 font-medium">
                Cores Populares
              </p>
              <p className="text-3xl font-bold text-pink-900 mt-1">
                {Math.min(colors.length, 12)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-4">
              <p className="text-sm text-indigo-600 font-medium">Em Uso</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">-</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <ColorManager colors={colors} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}
