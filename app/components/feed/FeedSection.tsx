"use client";

import { PublicFeedSection, PublicFeedItem } from "@/app/hooks/use-api";
import { ChevronRight, Grid2x2, SlidersHorizontal, ClipboardList, Truck } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "../layout/product-card";
import { ProductGridWrapper, ProductGridItem, MasonryGridWrapper, MasonryGridItem } from "./ProductGrid";

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categoryName?: string;
}

// import { getInternalImageUrl } from "@/lib/image-helper";

interface FeedSectionProps {
  section: PublicFeedSection;
}

const quickActions = [
  {
    label: "Ver categorias",
    href: "/categorias",
    icon: Grid2x2,
  },
  {
    label: "Escolher pelos itens",
    href: "/itens-personalizados",
    icon: SlidersHorizontal,
  },
  {
    label: "Meus pedidos",
    href: "/pedidos",
    icon: ClipboardList,
  },
  {
    label: "Entrega rápida",
    href: "/cesto-express",
    icon: Truck,
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMobileAspectClass(
  sectionId: string,
  itemId: string,
  index: number,
  totalItems: number,
): string {
  if (totalItems <= 2) return "aspect-square";
  if (index === 0 || index === totalItems - 1) return "aspect-square";

  const variants = [
    "aspect-square",
    "aspect-[5/6]",
    "aspect-[4/5]",
    "aspect-[3/4]",
  ];
  const seed = `${sectionId}-${itemId}-${index}`;
  const hashed = hashString(seed);
  const variantIndex = hashed % variants.length;
  const aspectClass = variants[variantIndex];

  if (aspectClass === "aspect-square") return aspectClass;

  const prevSeed = `${sectionId}-${index - 1}`;
  const prevVariantIndex = hashString(prevSeed) % variants.length;
  const prevAspectClass = variants[prevVariantIndex];

  if (prevAspectClass !== "aspect-square" && aspectClass !== "aspect-square") {
    return "aspect-square";
  }

  return aspectClass;
}

// interface FeedItemCardProps {
//   item: PublicFeedItem;
//   imagePriority?: boolean;
//   isEmphasis?: boolean;
//   index?: number;
// }

// function FeedItemCard({ item, imagePriority = false }: FeedItemCardProps) {
//   const { item_data, item_type, custom_title, custom_subtitle } = item;

//   const isProduct = item_type === "product" && item_data;
//   const isCategory = item_type === "category" && item_data;
//   const isAdditional = item_type === "additional" && item_data;

//   if (!item_data) return null;

//   const productData = item_data as unknown as Product;

//   const categoryData = item_data as unknown as {
//     id: string;
//     name: string;
//   };

//   const additionalData = item_data as unknown as {
//     id: string;
//     name: string;
//     description?: string;
//     price: number;
//     discount?: number;
//     image_url?: string;
//   };

//   const renderProductCard = () => (
//     <ProductCard
//       props={productData}
//       className="w-[170px] shrink-0 sm:w-[190px] lg:w-[210px]"
//       imagePriority={imagePriority}
//     />
//   );

//   const renderCategoryCard = () => (
//     <Link href={`/categorias/${categoryData.id}`} prefetch={false}>
//       <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer p-6 h-full">
//         <div className="text-center flex flex-col items-center justify-center h-full">
//           <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
//             <Tag className="h-8 w-8 text-white" />
//           </div>
//           <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
//             {custom_title || categoryData.name}
//           </h3>
//           {custom_subtitle && (
//             <p className="text-sm text-gray-600 line-clamp-2">
//               {custom_subtitle}
//             </p>
//           )}
//         </div>
//       </div>
//     </Link>
//   );

//   const renderAdditionalCard = () => (
//     <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
//       <div className="relative aspect-square overflow-hidden bg-gray-100">
//         {additionalData.image_url ? (
//           <Image
//             src={getInternalImageUrl(
//               additionalData.image_url,
//               imagePriority ? "w800" : "w500",
//             )}
//             alt={custom_title || additionalData.name}
//             fill
//             className="object-cover group-hover:scale-110 transition-transform duration-500"
//             priority={imagePriority}
//             loading={imagePriority ? "eager" : "lazy"}
//             fetchPriority={imagePriority ? "high" : "auto"}
//             sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center">
//             <Gift className="h-12 w-12 text-gray-400" />
//           </div>
//         )}

//         {additionalData.discount && additionalData.discount > 0 && (
//           <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
//             -{additionalData.discount}%
//           </div>
//         )}
//       </div>

//       <div className="p-4 flex-1 flex flex-col">
//         <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">
//           {custom_title || additionalData.name}
//         </h3>

//         {(custom_subtitle || additionalData.description) && (
//           <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
//             {custom_subtitle || additionalData.description}
//           </p>
//         )}

//         <div className="flex items-center justify-between mt-auto">
//           <div className="flex flex-col">
//             {additionalData.discount && additionalData.discount > 0 ? (
//               <>
//                 <span className="text-xs text-gray-400 line-through">
//                   R$ {additionalData.price.toFixed(2)}
//                 </span>
//                 <span className="text-lg font-bold text-gray-900">
//                   R${" "}
//                   {(
//                     additionalData.price *
//                     (1 - additionalData.discount / 100)
//                   ).toFixed(2)}
//                 </span>
//               </>
//             ) : (
//               <span className="text-lg font-bold text-gray-900">
//                 R$ {additionalData.price.toFixed(2)}
//               </span>
//             )}
//           </div>

//           <div className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full font-medium">
//             Adicional
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   if (isProduct) return renderProductCard();
//   if (isCategory) return renderCategoryCard();
//   if (isAdditional) return renderAdditionalCard();

//   return null;
// }

export default function FeedSection({ section }: FeedSectionProps) {
  if (!section.items.length) return null;

  // const renderBestSellerCard = (item: PublicFeedItem, rank: number) => {
  //   if (!item.item_data) return null;
  //   const product = item.item_data as unknown as Product;

  //   return (
  //     <Link
  //       href={`/produto/${product.id}`}
  //       prefetch={false}
  //       className="group relative flex h-60 min-w-[240px] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1"
  //     >
  //       <div className="absolute inset-0">
  //         <img
  //           src={
  //             getInternalImageUrl(product.image_url, "w800") ||
  //             getPublicAssetUrl("placeholder-v2.png")
  //           }
  //           alt={product.name}
  //           className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
  //           loading="lazy"
  //           fetchPriority="auto"
  //           sizes="(max-width: 640px) 80vw, (max-width: 1024px) 35vw, 25vw"
  //         />
  //         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
  //       </div>

  //       <div className="relative z-10 flex items-end gap-3 p-4">
  //         <span className="text-5xl font-black text-white/70">{rank}</span>
  //         <div className="space-y-1">
  //           <p className="text-sm font-semibold leading-tight">
  //             {product.name}
  //           </p>
  //           <p className="text-xs text-white/70">
  //             {new Intl.NumberFormat("pt-BR", {
  //               style: "currency",
  //               currency: "BRL",
  //             }).format(product.price)}
  //           </p>
  //         </div>
  //       </div>
  //     </Link>
  //   );
  // };

  if (section.section_type === "BEST_SELLERS") {
    return (
      <section
        className="w-full py-6"
        style={{ contentVisibility: "auto", containIntrinsicSize: "720px" }}
      >
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4 bg-rose-100 rounded-xl py-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                Destaque da semana
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {section.title || "Mais vendidos"}
              </h2>
            </div>
          </header>

          <div className="flex gap-3 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory no-scrollbar">
            {section.items
              .slice(0, 4)
              .map((item: PublicFeedItem, index: number) => (
                <div key={item.id}>
                  <ProductCard
                    props={item.item_data as unknown as Product}
                    className="min-w-[180px] max-w-[200px] shrink-0 snap-start"
                    imagePriority={true}
                    isEmphasis={true}
                    index={index + 1}
                  />
                </div>
              ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200/70 bg-white/90 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const displayItems = section.items.slice(0, 6);
  const hasMoreItems = section.items.length > 6;
  const viewAllUrl = `/section/${section.id}`;

  return (
    <section
      className="w-full py-4"
      style={{ contentVisibility: "auto", containIntrinsicSize: "620px" }}
    >
      <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
        {section.title && (
          <header className="w-full flex items-center justify-between mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {section.title}
            </h2>
            {hasMoreItems && viewAllUrl && (
              <Link
                href={viewAllUrl}
                className="inline-flex text-nowrap items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </header>
        )}

        {/* Mobile: Masonry Layout */}
        {displayItems.length > 0 && (
          <div className="block sm:hidden mb-6">
            <MasonryGridWrapper>
              {displayItems.map((item: PublicFeedItem, index: number) => (
                <MasonryGridItem key={item.id}>
                  <ProductCard
                    props={item.item_data as unknown as Product}
                    imagePriority={false}
                    imageAspectClass={getMobileAspectClass(
                      section.id,
                      item.id,
                      index,
                      displayItems.length,
                    )}
                  />
                </MasonryGridItem>
              ))}
            </MasonryGridWrapper>
          </div>
        )}

        {/* Desktop: Grid Layout */}
        <div className="hidden sm:block">
          <ProductGridWrapper className="gap-3">
            {displayItems.map((item: PublicFeedItem) => (
              <ProductGridItem key={item.id}>
                <ProductCard
                  props={item.item_data as unknown as Product}
                  imagePriority={false}
                />
              </ProductGridItem>
            ))}
          </ProductGridWrapper>
        </div>
      </div>
    </section>
  );
}
