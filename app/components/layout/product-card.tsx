"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils";
import { getInternalImageUrl } from "@/lib/image-helper";
import { Badge } from "../ui/badge";

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
}

export function ProductCard({ props, className }: ProductCardProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  const finalPrice = props.discount
    ? props.price - (props.discount * props.price) / 100
    : props.price;

  const hasDiscount = Boolean(props.discount && props.discount > 0);
  const categories = (props.categories || [])
    .map((item) => item.category.name)
    .filter((name): name is string => Boolean(name));

  useEffect(() => {
    if (categories.length === 0) return;

    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [categories.length]);

  return (
    <Link
      href={`/produto/${props.id}`}
      className={cn(
        "group flex flex-col gap-3 h-full rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={getInternalImageUrl(props.image_url) || "/placeholder.png"}
          alt={props.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          quality={70}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {categories.length > 0 ? (
          <div className="category-carousel absolute left-2 top-2">
            <Badge
              key={activeCategory}
              className="category-carousel-badge border border-white/40 bg-white/90 text-gray-700"
            >
              {categories[activeCategory]}
            </Badge>
          </div>
        ) : null}
        {hasDiscount ? (
          <Badge className="absolute right-2 top-2 bg-red-500/95 text-white hover:bg-red-500">
            -{props.discount}%
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <h3 className="text-sm text-gray-900">
          {props.name}
        </h3>
        <div className="flex items-end gap-2">
          <p className="text-xl font-semibold text-gray-900">
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
