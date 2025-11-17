"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi, Category } from "@/app/hooks/use-api";

export default function CategoriasPage() {
  const api = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setIsLoading(true);
        const data = await api.getCategories();
        if (mounted) setCategories(data || []);
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [api]);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Categorias</h1>
      {isLoading ? (
        <p>Carregando categorias...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categorias/${cat.id}`}
              className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-start"
            >
              <span className="font-semibold">{cat.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
