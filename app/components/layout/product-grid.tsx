import { ProductCard } from "./product-card";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  categoryName?: string;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

export function ProductGrid({ products, title, subtitle }: ProductGridProps) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4">
        {(title || subtitle) && (
          <header className="text-center mb-12">
            {title && (
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {subtitle}
              </p>
            )}
          </header>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        {products.length > 0 && (
          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 shadow-sm hover:shadow-md">
              Ver todos os produtos
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
