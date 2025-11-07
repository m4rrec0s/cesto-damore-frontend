"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { ConstraintsManager } from "../components/constraints-manager";
import { useRouter } from "next/navigation";

export default function ConstraintsPage() {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando restrições...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <ConstraintsManager />
    </div>
  );
}
