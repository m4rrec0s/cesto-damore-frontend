import { ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
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
    <section className="w-full scrollbar-hide">
      <div className="mx-auto max-w-none sm:max-w-[90%] px-4 py-2 bg-white text-left">
        {title && (
          <header className="w-full flex items-center justify-between mb-6 mt-10">
            {title && (
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {hasMore && viewAllUrl && (
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

        <div className="flex gap-6 w-full overflow-x-auto scrollbar-hide pb-4">
          <div className="flex gap-6 min-w-max">
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-40 sm:w-64">
                <ProductCard props={product} />
              </div>
            ))}
          </div>
        </div>

        {products.length > 0 && (
          <div className="text-center mt-12">
            <Button className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 shadow-sm hover:shadow-md">
              Ver todos os produtos
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
