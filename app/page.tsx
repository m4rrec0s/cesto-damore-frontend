"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "./components/layout/product-grid";
import {
  useApi,
  Product as ApiProduct,
  Category,
  PublicFeedResponse,
} from "./hooks/use-api";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { DatabaseErrorFallback } from "./components/database-error-fallback";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";
import Link from "next/link";
import FeedBannerCarousel from "./components/feed/FeedBannerCarousel";
import FeedSection from "./components/feed/FeedSection";
import Image from "next/image";

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
  const [feedData, setFeedData] = useState<PublicFeedResponse | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Iniciando carregamento de dados...");
        console.log("📡 API URL:", process.env.NEXT_PUBLIC_API_URL);

        let feed = null;
        try {
          console.log("🎯 Buscando feed público...");
          feed = await api.getPublicFeed();
          setFeedData(feed);
          console.log("✅ Feed carregado com sucesso:", feed);
        } catch (feedError) {
          console.error("❌ Erro ao carregar feed:", feedError);
          console.warn("⚠️ Usando fallback devido ao erro:", feedError);
          setUseFallback(true);
        }

        console.log("📦 Buscando produtos e categorias...");
        const [productsResponse, fetchedCategories] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);

        console.log("✅ Produtos recebidos:", productsResponse);
        console.log("✅ Categorias recebidas:", fetchedCategories);

        setCategories(fetchedCategories);

        if (feed && !useFallback) {
          setProducts([]);
        } else {
          const featuredProducts = productsResponse.products.map(
            (product: ApiProduct) => {
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

          setProducts(featuredProducts.slice(0, 8));
        }
      } catch (err: unknown) {
        console.error("❌ Erro crítico ao carregar dados:", err);
        console.error("Tipo do erro:", typeof err);
        console.error("Erro completo:", JSON.stringify(err, null, 2));

        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";

        console.error("Mensagem de erro:", errorMessage);

        if (
          errorMessage.includes("database") ||
          errorMessage.includes("connection") ||
          errorMessage.includes("Network Error") ||
          errorMessage.includes("ERR_CONNECTION")
        ) {
          setError(
            "Erro de conexão com o servidor. Verifique se o ngrok está rodando e a URL está correta."
          );
        } else {
          setError(`Não foi possível carregar os dados. Erro: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [api, useFallback]);

  const handleRetry = () => {
    api.invalidateCache();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {feedData &&
        !useFallback &&
        feedData.banners &&
        feedData.banners.length > 0 && (
          <div className="w-full">
            <FeedBannerCarousel banners={feedData.banners} />
          </div>
        )}

      <section className="pb-5 w-full flex flex-col justify-center">
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.isArray(categories) &&
              categories.slice(0, 6).map((category) => (
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

      {feedData && !useFallback ? (
        <div className="bg-gray-50 space-y-8 py-8">
          {feedData.sections &&
            feedData.sections.map((section) => (
              <FeedSection key={section.id} section={section} />
            ))}
        </div>
      ) : (
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
            {error && (
              <DatabaseErrorFallback error={error} onRetry={handleRetry} />
            )}

            {loading ? (
              <div className="text-center py-20">
                <div className="mx-auto relative w-36 h-36">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-25 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Image
                        src="/logo.png"
                        alt="Cesto d'Amore"
                        className="w-16 h-16 animate-spin"
                        width={64}
                        height={64}
                      />
                    </div>
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
      )}
    </div>
  );
}
