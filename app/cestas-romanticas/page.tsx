"use client";

import { useEffect, useState } from "react";
import { useApi, Product, Category } from "@/app/hooks/use-api";
import { ProductCard } from "../components/layout/product-card";

export default function CestasRomanticasPage() {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setIsLoading(true);
        const cats: Category[] = await api.getCategories();
        const matchRegex = /rom[aã]ntica|romantica|casal|amor/i;
        const matched = (cats || []).filter((c) =>
          matchRegex.test(c.name.toLowerCase())
        );
        const productSets = await Promise.all(
          matched.map((c) =>
            api.getProducts({ page: 1, perPage: 48, category_id: c.id })
          )
        );
        const allProducts = productSets.flatMap((ps) => ps.products || []);
        const uniqueMap: Record<string, Product> = {};
        allProducts.forEach((p) => (uniqueMap[p.id] = p));
        const unique = Object.values(uniqueMap);
        if (mounted) setProducts(unique);
      } catch (err) {
        console.error("Erro ao buscar cestas românticas:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [api]);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Cestas Românticas</h1>
      {isLoading ? (
        <p>Carregando cestas românticas...</p>
      ) : products.length === 0 ? (
        <p>Nenhuma cesta encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              props={{
                id: p.id,
                name: p.name,
                price: p.price,
                image_url: p.image_url ?? null,
                categories:
                  p.categories?.map((c) => ({
                    category: { id: c.id, name: c.name },
                  })) ?? [],
                discount: p.discount,
              }}
              className="max-sm:min-w-[150px]"
            />
          ))}
        </div>
      )}
    </div>
  );
}
