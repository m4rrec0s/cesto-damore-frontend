"use client";

import { useState, useEffect } from "react";
import { useApi, Additional } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import { AdditionalManager } from "../components/additional-manager";
import { useRouter } from "next/navigation";

export default function AdditionalsPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    const loadAdditionals = async () => {
      setLoading(true);
      try {
        const additionalsData = await api.getAdditionals();
        setAdditionals(additionalsData);
      } catch (error) {
        console.error("Erro ao carregar adicionais:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadAdditionals();
    }
  }, [api, authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    const loadAdditionals = async () => {
      try {
        const additionalsData = await api.getAdditionals();
        setAdditionals(additionalsData);
      } catch (error) {
        console.error("Erro ao recarregar adicionais:", error);
      }
    };
    loadAdditionals();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando adicionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <AdditionalManager
        additionals={additionals}
        onUpdate={handleDataUpdate}
      />
    </div>
  );
}
