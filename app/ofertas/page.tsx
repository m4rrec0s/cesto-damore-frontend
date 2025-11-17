"use client";

import { useEffect, useState } from "react";
import { useApi, Product } from "@/app/hooks/use-api";
import { ProductCard } from "../components/layout/product-card";

export default function OfertasPage() {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await api.getProducts({ page: 1, perPage: 48 });
        if (!mounted) return;
        const filtered = (res.products || []).filter(
          (p) => (p.discount && p.discount > 0) || p.price < 120
        );
        setProducts(filtered);
      } catch (err) {
        console.error("Erro ao buscar produtos de oferta:", err);
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
      <h1 className="text-2xl font-bold mb-4">Ofertas</h1>
      {isLoading ? (
        <p>Carregando ofertas...</p>
      ) : products.length === 0 ? (
        <p>Nenhuma oferta encontrada no momento.</p>
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
