import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  categoryName?: string;
}

export function ProductCard({
  id,
  name,
  price,
  image_url,
  categoryName,
}: ProductCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <Link href={`/produto/${id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <Image
            src={image_url || "/placeholder.svg"}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Category Badge */}
          {categoryName && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
              {categoryName}
            </div>
          )}

          {/* Favorite Button */}
          <button
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Adicionar aos favoritos"
          >
            <Heart className="h-4 w-4" />
          </button>

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              size="sm"
              className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
              onClick={(e) => {
                e.preventDefault();
                // Add to cart logic
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">
              {name}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">(24)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-lg font-bold text-gray-900">
                {price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <div className="text-sm text-gray-400 line-through">
                {(price * 1.2).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>

            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              -17%
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
