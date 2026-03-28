"use client";

import { ProductCard } from "@/app/components/layout/product-card";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import useApi, { ProductsResponse } from "@/app/hooks/use-api";
import { ChevronLeftIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CategoryProductPageClient = ({ id }: { id: string }) => {
  const [products, setProducts] = useState<ProductsResponse | undefined>();
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const router = useRouter();

  if (!id) {
    router.push("/categorias");
  }

  const api = useApi();

  useEffect(() => {
    try {
      setLoading(true);
      api
        .getProducts({
          category_id: id,
        })
        .then((data) => {
          setProducts(data);
          if (data.products.length > 0) {
            setCategoryName(data.products[0].categories?.[0]?.name || "");
          }
          setLoading(false);
        });
    } catch (error) {
      console.error("Erro ao buscar produtos da categoria:", error);
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  if (loading) {
    return (
      <div className="fixed z-50 bg-white/55 flex justify-center items-center inset-0 h-[100vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-rose-600 animate-spin mb-2" />
          <span className="text-xs text-gray-500">
            Preparando tudo para você
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-6 w-full flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="px-0"
          onClick={() => router.back()}
        >
          <ChevronLeftIcon />
        </Button>
        <div>
          <h2 className="text-xl font-bold">
            Produtos da Categoria: {categoryName}
          </h2>
          <p>{products?.products.length} produtos encontrados</p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products?.products.map((product) => (
          <ProductCard
            key={product.id}
            props={{
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url ?? null,
              categories:
                product.categories?.map((c) => ({
                  category: { id: c.id, name: c.name },
                })) ?? [],
              discount: product.discount,
            }}
            className="max-sm:min-w-[150px]"
          />
        ))}
      </div>
    </section>
  );
};

export default CategoryProductPageClient;
