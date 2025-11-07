"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApi, PublicFeedSection, PublicFeedItem } from "@/app/hooks/use-api";
import {
  ChevronLeft,
  ShoppingCart,
  Package,
  Tag,
  Gift,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/app/lib/utils";

interface FeedItemCardProps {
  item: PublicFeedItem;
}

function FeedItemCard({ item }: FeedItemCardProps) {
  const { item_data, item_type, custom_title, custom_subtitle } = item;

  // Type guards para os diferentes tipos de dados
  const isProduct = item_type === "product" && item_data;
  const isCategory = item_type === "category" && item_data;
  const isAdditional = item_type === "additional" && item_data;

  if (!item_data) return null;

  // Type assertions para os dados dos itens
  const productData = item_data as {
    id: string;
    name: string;
    price: number;
    discount?: number;
    image_url?: string;
  };

  const categoryData = item_data as {
    id: string;
    name: string;
  };

  const additionalData = item_data as {
    id: string;
    name: string;
    description?: string;
    price: number;
    discount?: number;
    image_url?: string;
  };

  const renderProductCard = () => (
    <Link href={`/produto/${productData.id}`}>
      <div className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {productData.image_url ? (
            <Image
              src={productData.image_url}
              alt={custom_title || productData.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Discount badge */}
          {productData.discount && productData.discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{productData.discount}%
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {custom_title || productData.name}
          </h3>

          {custom_subtitle && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {custom_subtitle}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {productData.discount && productData.discount > 0 ? (
                <>
                  <span className="text-sm text-gray-500 line-through">
                    R$ {productData.price.toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    R${" "}
                    {(
                      productData.price *
                      (1 - productData.discount / 100)
                    ).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  R$ {productData.price.toFixed(2)}
                </span>
              )}
            </div>

            <button
              aria-label="Adicionar ao carrinho"
              className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );

  const renderCategoryCard = () => (
    <Link href={`/categoria/${categoryData.id}`}>
      <div className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Tag className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            {custom_title || categoryData.name}
          </h3>
          {custom_subtitle && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {custom_subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );

  const renderAdditionalCard = () => (
    <div className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      {/* Additional Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {additionalData.image_url ? (
          <Image
            src={additionalData.image_url}
            alt={custom_title || additionalData.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Discount badge */}
        {additionalData.discount && additionalData.discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{additionalData.discount}%
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {custom_title || additionalData.name}
        </h3>

        {(custom_subtitle || additionalData.description) && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {custom_subtitle || additionalData.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {additionalData.discount && additionalData.discount > 0 ? (
              <>
                <span className="text-sm text-gray-500 line-through">
                  R$ {additionalData.price.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-green-600">
                  R${" "}
                  {(
                    additionalData.price *
                    (1 - additionalData.discount / 100)
                  ).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                R$ {additionalData.price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Adicional
          </div>
        </div>
      </div>
    </div>
  );

  if (isProduct) return renderProductCard();
  if (isCategory) return renderCategoryCard();
  if (isAdditional) return renderAdditionalCard();

  return null;
}

export default function SectionDetailPage() {
  const params = useParams();
  const api = useApi();
  const sectionId = params.id as string;

  const [section, setSection] = useState<PublicFeedSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectionData = async () => {
      try {
        setLoading(true);
        // Buscar todas as configurações de feed públicas
        const feedData = await api.getPublicFeed();

        if (feedData && feedData.sections) {
          // Encontrar a seção específica pelo ID
          const foundSection = feedData.sections.find(
            (s) => s.id === sectionId
          );

          if (foundSection) {
            setSection(foundSection);
          } else {
            setError("Seção não encontrada");
          }
        } else {
          setError("Dados do feed não disponíveis");
        }
      } catch (err) {
        console.error("Erro ao carregar seção:", err);
        setError("Erro ao carregar a seção");
      } finally {
        setLoading(false);
      }
    };

    if (sectionId) {
      fetchSectionData();
    }
  }, [sectionId, api]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rose-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando seção...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Seção não encontrada"}
          </h1>
          <p className="text-gray-600 mb-6">
            A seção que você está procurando não existe ou foi removida.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-none sm:max-w-[90%] mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-rose-600 hover:text-rose-700 font-semibold mb-4 group"
          >
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Voltar para a página inicial
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {section.title}
          </h1>

          <p className="text-gray-600">
            {section.items.length}{" "}
            {section.items.length === 1 ? "item" : "itens"} disponíveis
          </p>
        </div>

        {/* Items Grid */}
        {section.items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum item disponível
            </h3>
            <p className="text-gray-600">
              Esta seção ainda não possui itens configurados.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-6",
              section.section_type === "FEATURED_CATEGORIES"
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            )}
          >
            {section.items.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
