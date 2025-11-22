"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  useApi,
  Product as ApiProduct,
  PublicFeedResponse,
} from "./hooks/use-api";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { DatabaseErrorFallback } from "./components/database-error-fallback";
import dynamic from "next/dynamic";

// Lazy load feed components to reduce initial JS bundle and speed up first paint
const FeedBannerCarousel = dynamic(
  () => import("./components/feed/FeedBannerCarousel"),
  { loading: () => <div className="h-48 bg-gray-100 animate-pulse" /> }
);
const FeedSection = dynamic(() => import("./components/feed/FeedSection"), {
  loading: () => <div className="h-36 bg-gray-100 animate-pulse" />,
});
import Image from "next/image";
import InfiniteScroll from "react-infinite-scroll-component";

interface GridProduct {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categoryName?: string;
  categoryNames?: string[];
}

export default function Home() {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const LOADER_SHOW_DELAY = 180;
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [feedData, setFeedData] = useState<PublicFeedResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(3);
  const [sections, setSections] = useState<PublicFeedResponse["sections"]>([]);
  const [pagination, setPagination] = useState<{
    totalSections?: number;
    page?: number;
    perPage?: number;
  } | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const [scrollThreshold, setScrollThreshold] = useState<string>("1300px");

  // Ref para o container do InfiniteScroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const cachedData = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
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
    const computeThreshold = () => {
      // Aumentar o threshold mínimo para garantir que carregue antes do footer
      const minPx = 800; // Aumentado de 300px para 800px
      const val = Math.max(minPx, Math.floor(window.innerHeight * 0.6)); // Aumentado de 0.4 para 0.6
      setScrollThreshold(`${val}px`);
    };

    computeThreshold();
    window.addEventListener("resize", computeThreshold);
    return () => window.removeEventListener("resize", computeThreshold);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (cachedData?.products) {
        try {
          const productsCache = cachedData?.products as unknown as {
            products: ApiProduct[];
          };
          if (productsCache?.products?.length) {
            const featuredProducts = productsCache.products
              .map((product: ApiProduct) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                discount: product.discount || undefined,
                image_url: product.image_url || null,
                categoryName:
                  product.categories && product.categories.length > 0
                    ? product.categories[0].name
                    : "Sem categoria",
              }))
              .slice(0, 8);
            setProducts(featuredProducts);
            setInitialLoad(false);
          }
        } catch {}
      }

      const loaderTimer = window.setTimeout(
        () => setLoading(true),
        LOADER_SHOW_DELAY
      );
      const fallback = useFallback;
      setError(null);

      try {
        let feed: PublicFeedResponse | null = null;
        try {
          feed = await api.getPublicFeed(undefined, 1, perPage);
          setFeedData(feed);
          setSections(feed?.sections || []);
          setPagination(feed?.pagination || null);
          setPage(1);
          if (feed && feed.sections && feed.sections.length > 0) {
            setUseFallback(false);
            if (loaderTimer) clearTimeout(loaderTimer);
            setLoading(false);
            setInitialLoad(false);
          }
        } catch (feedError) {
          console.error("❌ Erro ao carregar feed:", feedError);
          setUseFallback(true);
        }

        if (!feed || fallback) {
          const productsResponse = await api.getProducts({ perPage: 8 });
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
        if (loaderTimer) clearTimeout(loaderTimer);
        setLoading(false);
        setInitialLoad(false);
      }
    };

    loadData();
  }, [api, cachedData, perPage, useFallback]);

  const handleRetry = () => {
    api.invalidateCache();
    window.location.reload();
  };

  const loadMoreSections = async () => {
    try {
      const nextPage = page + 1;
      const nextFeed = await api.getPublicFeed(undefined, nextPage, perPage);
      if (nextFeed) {
        setSections((prev) => [...prev, ...(nextFeed.sections || [])]);
        setPagination(nextFeed.pagination || null);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Erro ao carregar mais seções:", err);
    }
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
      {feedData &&
        !useFallback &&
        feedData.banners &&
        feedData.banners.length > 0 && (
          <div className="w-full animate-fadeIn">
            <FeedBannerCarousel banners={feedData.banners} />
          </div>
        )}

      {feedData && !useFallback ? (
        <div
          className="space-y-8 pb-12 animate-fadeIn"
          ref={scrollContainerRef}
        >
          <InfiniteScroll
            dataLength={sections.length}
            next={() => loadMoreSections()}
            hasMore={sections.length < (pagination?.totalSections || 0)}
            scrollThreshold={scrollThreshold}
            loader={
              <h4 className="text-center py-4 animate-pulse">
                Carregando mais seções...
              </h4>
            }
            endMessage={
              <p className="text-center py-4 text-gray-500">
                Você viu tudo! 🎉
              </p>
            }
          >
            {sections &&
              sections.map((section, index) => (
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
