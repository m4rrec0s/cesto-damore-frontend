"use client";

import { useState, useEffect } from "react";
import { useApi, Category } from "../../hooks/use-api";
import { useAuth } from "../../hooks/use-auth";
import { CategoryManager } from "../components/category-manager";
import { useRouter } from "next/navigation";

export default function CategoriesPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    const loadCategories = async () => {
      setLoading(true);
      try {
        const categoriesData = await api.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadCategories();
    }
  }, [api, authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    const loadCategories = async () => {
      try {
        const categoriesData = await api.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Erro ao recarregar categorias:", error);
      }
    };
    loadCategories();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <CategoryManager categories={categories} onUpdate={handleDataUpdate} />
    </div>
  );
}
