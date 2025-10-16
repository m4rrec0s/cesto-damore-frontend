"use client";

import { useState, useEffect } from "react";
import { useApi, Type as ProductType } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import { TypeManager } from "../components/type-manager";
import { useRouter } from "next/navigation";

export default function TypesPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    const loadTypes = async () => {
      setLoading(true);
      try {
        const typesData = await api.getTypes();
        setTypes(typesData);
      } catch (error) {
        console.error("Erro ao carregar tipos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadTypes();
    }
  }, [api, authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    const loadTypes = async () => {
      try {
        const typesData = await api.getTypes();
        setTypes(typesData);
      } catch (error) {
        console.error("Erro ao recarregar tipos:", error);
      }
    };
    loadTypes();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <TypeManager types={types} onUpdate={handleDataUpdate} />
    </div>
  );
}
