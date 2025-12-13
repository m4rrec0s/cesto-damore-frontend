"use client";

import { ProductCard } from "@/app/components/layout/product-card";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import useApi, { Product, Category } from "@/app/hooks/use-api";
import { ChevronLeftIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NamedCategoryPageProps {
    categoryName: string; // Exact or partial name to match
}

const NamedCategoryPage = ({ categoryName }: NamedCategoryPageProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [foundCategory, setFoundCategory] = useState<Category | null>(null);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const api = useApi();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch categories to find the ID
                const categories = await api.getCategories();

                // Find category by name (case insensitive, ignoring accents)
                const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const target = normalize(categoryName);

                const category = categories.find((c: Category) => normalize(c.name).includes(target));

                if (!category) {
                    setError(`Categoria "${categoryName}" não encontrada.`);
                    setLoading(false);
                    return;
                }

                setFoundCategory(category);

                // 2. Fetch products for this category
                const productsData = await api.getProducts({ category_id: category.id });
                setProducts(productsData.products);

            } catch (err) {
                console.error("Erro ao buscar dados da categoria:", err);
                setError("Erro ao carregar produtos. Tente novamente.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [categoryName, api]);

    if (loading) {
        return (
            <div className="fixed z-50 bg-white/55 flex justify-center items-center inset-0 h-[100vh]">
                <div className="animate-pulse flex flex-col items-center">
                    <Image
                        src="/logocestodamore.png"
                        alt="Cesto d'Amore"
                        className="w-14 h-14"
                        width={56}
                        height={56}
                    />
                    <span className="text-xs text-gray-500">
                        Buscando categoria...
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
                        {foundCategory ? foundCategory.name : categoryName}
                    </h2>
                    {!error && <p>{products.length} produtos encontrados</p>}
                </div>
            </div>

            <Separator className="my-4" />

            {error ? (
                <div className="text-center py-10">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => router.push("/")} variant="outline">Voltar para a Loja</Button>
                </div>
            ) : products.length > 0 ? (
                <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {products.map((product) => (
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
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>Nenhum produto encontrado nesta categoria.</p>
                </div>
            )}
        </section>
    );
};

export default NamedCategoryPage;
