"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/app/components/layout/product-card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Search, Filter, X } from "lucide-react";
import useApi, { Product, Category, Type } from "@/app/hooks/use-api";
import { toast } from "sonner";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const api = useApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || ""
  );
  const [selectedType, setSelectedType] = useState(
    searchParams.get("type") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const loadFilters = async () => {
    try {
      const [categoriesData, typesData] = await Promise.all([
        api.getCategories(),
        api.getTypes(),
      ]);
      setCategories(categoriesData);
      setTypes(typesData);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        perPage: number;
        search?: string;
        category_id?: string;
        type_id?: string;
      } = {
        page: currentPage,
        perPage: 12,
      };

      const q = searchParams.get("q");
      const category = searchParams.get("category");
      const type = searchParams.get("type");
      const page = searchParams.get("page");

      if (q) params.search = q;
      if (category) params.category_id = category;
      if (type) params.type_id = type;
      if (page) params.page = parseInt(page);

      const response = await api.getProducts(params);
      setProducts(response.products);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(response.pagination.page);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ q: searchTerm, page: "1" });
  };

  const updateURL = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    router.push(`/busca?${newParams.toString()}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    updateURL({ category: categoryId, page: "1" });
  };

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    updateURL({ type: typeId, page: "1" });
  };

  const handlePageChange = (page: number) => {
    updateURL({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedType("");
    setSearchTerm("");
    router.push("/busca");
  };

  const activeFiltersCount =
    (searchTerm ? 1 : 0) + (selectedCategory ? 1 : 0) + (selectedType ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-none sm:max-w-[90%] mx-auto px-4 py-8">
        {/* Header de Busca */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Resultados da Busca
          </h1>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" className="bg-rose-500 hover:bg-rose-600">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </form>

          {/* Filtros Mobile Toggle */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar de Filtros */}
          <aside
            className={`${
              showFilters ? "block" : "hidden"
            } lg:block w-full lg:w-64 flex-shrink-0`}
          >
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Filtros</h2>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-rose-500 hover:text-rose-600"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Filtro de Categorias */}
              <div className="mb-6">
                <h3 className="font-medium text-sm text-gray-700 mb-3">
                  Categorias
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={!selectedCategory}
                      onChange={() => handleCategoryChange("")}
                      className="mr-2 text-rose-500"
                    />
                    <span className="text-sm">Todas</span>
                  </label>
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category.id}
                        onChange={() => handleCategoryChange(category.id)}
                        className="mr-2 text-rose-500"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro de Tipos */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-3">
                  Tipos
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={!selectedType}
                      onChange={() => handleTypeChange("")}
                      className="mr-2 text-rose-500"
                    />
                    <span className="text-sm">Todos</span>
                  </label>
                  {types.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="type"
                        checked={selectedType === type.id}
                        onChange={() => handleTypeChange(type.id)}
                        className="mr-2 text-rose-500"
                      />
                      <span className="text-sm">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Tente ajustar os filtros ou buscar por outros termos
                </p>
                <Button
                  onClick={clearFilters}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  {products.length} produto(s) encontrado(s)
                  {searchParams.get("q") && (
                    <span className="font-medium">
                      {" "}
                      para &quot;{searchParams.get("q")}&quot;
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      props={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image_url: product.image_url || null,
                        categories: product.categories,
                        discount: product.discount,
                      }}
                    />
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Mostra sempre a primeira, última e páginas próximas à atual
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          // Adiciona "..." entre páginas não consecutivas
                          const showEllipsis =
                            index > 0 && page - array[index - 1] > 1;

                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                onClick={() => handlePageChange(page)}
                                className={
                                  currentPage === page
                                    ? "bg-rose-500 hover:bg-rose-600"
                                    : ""
                                }
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Carregando...
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
