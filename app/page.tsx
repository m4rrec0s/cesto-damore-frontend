"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "./components/layout/hero";
import { ProductGrid } from "./components/layout/product-grid";
import { useApi, Product as ApiProduct, Category } from "./hooks/use-api";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { DatabaseErrorFallback } from "./components/database-error-fallback";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";
import Link from "next/link";

interface GridProduct {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categoryName?: string;
}

export default function Home() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [productsResponse, fetchedCategories] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);

        setCategories(fetchedCategories);

        const featuredProducts = productsResponse.products.map(
          (product: ApiProduct) => {
            // Get the first category name for display, or "Sem categoria" if none
            const categoryName =
              product.categories && product.categories.length > 0
                ? product.categories[0].name
                : "Sem categoria";

            return {
              id: product.id,
              name: product.name,
              price: product.price,
              discount: product.discount || undefined,
              image_url: product.image_url || null,
              categoryName,
              categoryNames: product.categories?.map((cat) => cat.name) || [],
            };
          }
        );

        setProducts(featuredProducts.slice(0, 8)); // Mostrar apenas 8 produtos em destaque
      } catch (err: unknown) {
        console.error("Erro ao carregar dados:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        if (
          errorMessage.includes("database") ||
          errorMessage.includes("connection")
        ) {
          setError(
            "Erro de conexão com o banco de dados. Verifique se o servidor está rodando."
          );
        } else {
          setError("Não foi possível carregar os produtos. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [api]);

  const handleRetry = () => {
    api.invalidateCache();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroSection />

      {/* Seção de Categorias */}
      <section className="pb-5 bg-white w-full flex flex-col justify-center">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="w-full"
              >
                <Badge
                  className={cn(
                    "flex items-center justify-center w-full text-center text-base bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900 transition-colors shadow-sm",
                    category.name === "Cesto Express" &&
                      "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:text-neutral-100"
                  )}
                >
                  {category.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Produtos */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          {error && (
            <DatabaseErrorFallback error={error} onRetry={handleRetry} />
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-gray-600 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="text-lg font-medium">
                  Carregando produtos especiais...
                </span>
              </div>
              <div className="max-w-md mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> Se demorar muito, pode haver um
                    problema temporário de conexão com o banco de dados. Tente
                    recarregar a página.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ProductGrid products={products} title="Produtos em destaque" />
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-6a2 2 0 00-2 2v3a2 2 0 01-2 2v-3a2 2 0 00-2-2H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Parece que ainda não temos produtos cadastrados.
              </p>
              <Button
                onClick={handleRetry}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar página
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
