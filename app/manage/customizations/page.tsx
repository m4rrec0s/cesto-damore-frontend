"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function CustomizationsPage() {
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando customizações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Customizações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Esta seção está em desenvolvimento. Aqui você poderá gerenciar as
            customizações dos produtos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
