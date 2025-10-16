"use client";

import { useState, useEffect } from "react";
import { useApi } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import { IntegratedProductManager } from "../components/integrated-product-manager";
import { useRouter } from "next/navigation";

export default function IntegratedProductsPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <IntegratedProductManager onUpdate={handleDataUpdate} />
    </div>
  );
}
