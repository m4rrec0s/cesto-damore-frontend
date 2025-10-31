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
      <div className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer p-6">
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

        {additionalData.discount && additionalData.discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{additionalData.discount}%
          </div>
        )}
      </div>

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

export default function FeedSection({ section }: FeedSectionProps) {
  if (!section.items.length) return null;

  const displayItems = section.items.slice(0, 6);
  const hasMoreItems = section.items.length > 6;
  const viewAllUrl = `/section/${section.id}`;

  return (
    <section className="w-full">
      <div className="mx-auto max-w-none sm:max-w-[90%] py-2 px-4 bg-white text-left rounded">
        {section.title && (
          <header className="w-full flex items-center justify-between mb-6 mt-10">
            {section.title && (
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
                {section.title}
              </h2>
            )}
            {hasMoreItems && viewAllUrl && (
              <Link
                href={viewAllUrl}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </header>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 w-full overflow-x-auto scrollbar-hide pb-4">
          {displayItems.map((item: PublicFeedItem) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>

        {displayItems.length > 0 && hasMoreItems && (
          <div className="text-center mt-12">
            <Link href={viewAllUrl}>
              <Button className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 shadow-sm hover:shadow-md">
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
