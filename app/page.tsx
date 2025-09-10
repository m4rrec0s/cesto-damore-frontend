"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "./components/layout/hero";
import { ProductGrid } from "./components/layout/product-grid";
import { useApi, Product as ApiProduct, Category } from "./hooks/use-api";
import { Button } from "./components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

interface GridProduct {
  id: string;
  name: string;
  price: number;
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
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);

        setCategories(fetchedCategories);

        const featuredProducts = fetchedProducts.map((product: ApiProduct) => {
          const category = fetchedCategories.find(
            (cat: Category) => cat.id === product.categoryId
          );
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || null,
            categoryName: category?.name,
          };
        });

        setProducts(featuredProducts.slice(0, 8)); // Mostrar apenas 8 produtos em destaque
      } catch {
        setError("Não foi possível carregar os produtos. Tente novamente.");
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
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore nossas categorias
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubra produtos selecionados especialmente para cada ocasião
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.slice(0, 4).map((category) => (
              <div
                key={category.id}
                className="group cursor-pointer p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                    {category.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Produtos */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">
                  Erro ao carregar produtos
                </p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="text-lg">
                  Carregando produtos especiais...
                </span>
              </div>
            </div>
          ) : (
            <ProductGrid
              products={products}
              title="Produtos em Destaque"
              subtitle="Seleções especiais preparadas com carinho para você"
            />
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
