import { ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categoryName?: string;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  hasMore?: boolean;
  viewAllUrl?: string;
}

export function ProductGrid({
  products,
  title,
  hasMore,
  viewAllUrl,
}: ProductGridProps) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-none sm:max-w-[90%] px-4 py-2">
        {title && (
          <header className="w-full flex items-center justify-between mb-8">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
              {title}
            </h2>
            {hasMore && viewAllUrl && (
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProductCard props={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
