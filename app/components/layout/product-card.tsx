"use client";

import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { Badge } from "../ui/badge";
import { getInternalImageUrl, getPublicAssetUrl } from "@/lib/image-helper";

interface ProductCardProps {
  props: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    categories?: Array<{
      category: {
        id: string;
        name: string;
      };
    }>;
    discount?: number;
  };
  className?: string;
  imagePriority?: boolean;
  isEmphasis?: boolean;
  index?: number;
  largeCard?: boolean;
  imageAspectClass?: string;
}

export function ProductCard({
  props,
  className,
  imagePriority = false,
  isEmphasis,
  index,
  largeCard = false,
  imageAspectClass,
}: ProductCardProps) {
  const finalPrice = props.discount
    ? props.price - (props.discount * props.price) / 100
    : props.price;

  const hasDiscount = Boolean(props.discount && props.discount > 0);
  const categories = (props.categories || [])
    .map((item) => item.category.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Link
      href={`/produto/${props.id}`}
      prefetch={false}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden bg-gray-100",
          imageAspectClass || (largeCard ? "aspect-[3/4]" : "aspect-square"),
        )}
      >
        <img
          src={
            getInternalImageUrl(props.image_url) ||
            getPublicAssetUrl("placeholder-v2.png")
          }
          alt={props.name}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          loading={imagePriority ? "eager" : "lazy"}
          fetchPriority={imagePriority ? "high" : "auto"}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-2 top-2 z-10 flex max-w-[72%] flex-wrap gap-1">
          {isEmphasis && (
            <Badge className="rounded-full bg-rose-500/95 text-white hover:bg-rose-500">
              {index !== undefined ? index : null}
            </Badge>
          )}
          {categories.length > 0 ? (
            <Badge className="max-w-full truncate border border-white/40 bg-white/90 text-gray-700">
              {categories[0]}
            </Badge>
          ) : null}
        </div>

        {hasDiscount ? (
          <Badge className="absolute right-2 top-2 z-10 bg-red-500/95 text-white hover:bg-red-500">
            -{props.discount}%
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <h3 className="min-h-[2.5rem] text-sm font-medium leading-snug text-gray-900 line-clamp-2">
          {props.name}
        </h3>

        <div className="mt-auto flex items-end gap-2">
          <p className="text-lg font-semibold leading-none text-rose-600">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(finalPrice)}
          </p>
          {hasDiscount ? (
            <span className="pb-0.5 text-xs text-gray-400 line-through">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(props.price)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
