import { ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { ProductCard } from "./product-card";

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
}

export function ProductGrid({ products, title }: ProductGridProps) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4 bg-white text-left">
        {title && (
          <header className="text-left">
            {title && (
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
                {title}
              </h2>
            )}
          </header>
        )}

        <div className="flex gap-6 w-full overflow-x-auto scrollbar-hide pb-4">
          <div className="flex gap-6 min-w-max">
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-40 sm:w-64">
                <ProductCard {...product} />
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
