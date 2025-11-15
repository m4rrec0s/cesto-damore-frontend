"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useApi,
  Product as ApiProduct,
  PublicFeedResponse,
} from "./hooks/use-api";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { DatabaseErrorFallback } from "./components/database-error-fallback";
import FeedBannerCarousel from "./components/feed/FeedBannerCarousel";
import FeedSection from "./components/feed/FeedSection";
import Image from "next/image";
import InfiniteScroll from "react-infinite-scroll-component";

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
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<GridProduct[]>([]);
  // const [categories, setCategories] = useState<Category[]>([]);
  const [feedData, setFeedData] = useState<PublicFeedResponse | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [visibleSections, setVisibleSections] = useState(2); // Inicialmente mostrar 2 seções

  // Usar cache imediatamente se disponível
  const cachedData = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      // Acessar o cache estático da classe ApiService
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ApiService = (api as any).constructor;
      const cache = ApiService.getCache?.() || {};
      return {
        categories: cache.categories || null,
        products: cache.products || null,
      };
    } catch (error) {
      console.warn("Erro ao acessar cache:", error);
      return null;
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      if (cachedData?.categories) {
        setInitialLoad(false);
      }

      setLoading(true);
      setError(null);

      try {
        let feed = null;
        try {
          feed = await api.getPublicFeed();
          setFeedData(feed);
        } catch (feedError) {
          console.error("❌ Erro ao carregar feed:", feedError);
          console.warn("⚠️ Usando fallback devido ao erro:", feedError);
          setUseFallback(true);
        }

        const [productsResponse] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);

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

        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";

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
        setInitialLoad(false);
      }
    };

    loadData();
  }, [api, useFallback, cachedData]);

  const handleRetry = () => {
    api.invalidateCache();
    window.location.reload();
  };

  if (initialLoad || loading) {
    return (
      <div className="fixed z-50 bg-white flex justify-center items-center inset-0 h-[100vh]">
        <div className="animate-pulse flex flex-col items-center">
          <Image
            src="/logocestodamore.png"
            alt="Cesto d'Amore"
            className="w-14 h-14"
            width={56}
            height={56}
          />
          <span className="text-xs text-gray-500">
            Preparando tudo para você
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Banner Carousel */}
      {feedData &&
        !useFallback &&
        feedData.banners &&
        feedData.banners.length > 0 && (
          <div className="w-full animate-fadeIn">
            <FeedBannerCarousel banners={feedData.banners} />
          </div>
        )}

      {/* Categories Section */}
      {/* <section className="py-8 w-full flex flex-col justify-center transition-all duration-300">
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
          {initialLoad ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <CategorySkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fadeIn">
              {Array.isArray(categories) &&
                categories.slice(0, 6).map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}`}
                    className="group relative overflow-hidden rounded-xl bg-rose-400 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className={cn(
                        "relative px-6 py-3 flex flex-col items-center justify-center",
                        category.name === "Cesto Express" &&
                          "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 text-center font-semibold text-base text-white">
                        {category.name}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </section> */}

      {feedData && !useFallback ? (
        <div className="space-y-8 pb-12 animate-fadeIn">
          <InfiniteScroll
            dataLength={visibleSections}
            next={() =>
              setVisibleSections((prev) =>
                Math.min(prev + 1, feedData.sections?.length || 0)
              )
            }
            hasMore={visibleSections < (feedData.sections?.length || 0)}
            loader={
              <h4 className="text-center py-4">Carregando mais seções...</h4>
            }
            endMessage={
              <p className="text-center py-4 text-gray-500">
                Você viu tudo! 🎉
              </p>
            }
          >
            {feedData.sections &&
              feedData.sections
                .slice(0, visibleSections)
                .map((section, index) => (
                  <div
                    key={section.id}
                    className="animate-slideUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <FeedSection section={section} />
                  </div>
                ))}
          </InfiniteScroll>
        </div>
      ) : (
        <section className="py-12">
          <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
            {error && (
              <div className="animate-fadeIn">
                <DatabaseErrorFallback error={error} onRetry={handleRetry} />
              </div>
            )}

            {!loading && !error && products.length === 0 && !initialLoad && (
              <div className="text-center py-20 animate-fadeIn">
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
                  className="bg-rose-500 hover:bg-rose-600 text-white"
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
