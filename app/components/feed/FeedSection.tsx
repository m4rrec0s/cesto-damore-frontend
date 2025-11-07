"use client";

import { PublicFeedSection, PublicFeedItem } from "@/app/hooks/use-api";
import { Tag, Gift, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "../layout/product-card";
import { Button } from "../ui/button";

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categoryName?: string;
}

interface FeedSectionProps {
  section: PublicFeedSection;
}

interface FeedItemCardProps {
  item: PublicFeedItem;
}

function FeedItemCard({ item }: FeedItemCardProps) {
  const { item_data, item_type, custom_title, custom_subtitle } = item;

  const isProduct = item_type === "product" && item_data;
  const isCategory = item_type === "category" && item_data;
  const isAdditional = item_type === "additional" && item_data;

  if (!item_data) return null;

  const productData = item_data as unknown as Product;

  const categoryData = item_data as unknown as {
    id: string;
    name: string;
  };

  const additionalData = item_data as unknown as {
    id: string;
    name: string;
    description?: string;
    price: number;
    discount?: number;
    image_url?: string;
  };

  const renderProductCard = () => <ProductCard props={productData} />;

  const renderCategoryCard = () => (
    <Link href={`/categoria/${categoryData.id}`}>
      <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer p-6 h-full">
        <div className="text-center flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
            <Tag className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
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
    <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {additionalData.image_url ? (
          <Image
            src={additionalData.image_url}
            alt={custom_title || additionalData.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {additionalData.discount && additionalData.discount > 0 && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
            -{additionalData.discount}%
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">
          {custom_title || additionalData.name}
        </h3>

        {(custom_subtitle || additionalData.description) && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
            {custom_subtitle || additionalData.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {additionalData.discount && additionalData.discount > 0 ? (
              <>
                <span className="text-xs text-gray-400 line-through">
                  R$ {additionalData.price.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-gray-900">
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

          <div className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full font-medium">
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

export default function FeedSection({ section }: FeedSectionProps) {
  if (!section.items.length) return null;

  const displayItems = section.items.slice(0, 6);
  const hasMoreItems = section.items.length > 6;
  const viewAllUrl = `/section/${section.id}`;

  return (
    <section className="w-full py-4">
      <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
        {section.title && (
          <header className="w-full flex items-center justify-between mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {section.title}
            </h2>
            {hasMoreItems && viewAllUrl && (
              <Link
                href={viewAllUrl}
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </header>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {displayItems.map((item: PublicFeedItem, index: number) => (
            <div
              key={item.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <FeedItemCard item={item} />
            </div>
          ))}
        </div>

        {displayItems.length > 0 && hasMoreItems && (
          <div className="text-center mt-10">
            <Link href={viewAllUrl}>
              <Button className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-rose-500 text-rose-600 font-semibold rounded-lg hover:bg-rose-50 hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-md">
                Ver todos os produtos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
