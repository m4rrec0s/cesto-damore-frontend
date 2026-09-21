"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/app/components/layout/product-card";
import { Button } from "@/app/components/ui/button";
import { Search, Send, X } from "lucide-react";
import useApi, { Product, Category, Type } from "@/app/hooks/use-api";

function AnaAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className={`relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-rose-100 shadow-sm ${speaking ? "animate-pulse" : ""}`} aria-label="Ana, assistente de presentes" role="img">
      {speaking && <span className="absolute -inset-1 rounded-full border-2 border-rose-300 animate-ping" />}
      <img src={speaking ? "/ana-speaking.png" : "/ana-idle.png"} alt="" className="relative h-16 w-16 object-contain" />
    </div>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const api = useApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [alsoLike, setAlsoLike] = useState<Product[]>([]);
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
  const [showFilters] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const activeRequest = useRef<string | null>(null);
  const query = searchParams.get("q");

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

  useEffect(() => {
    const saved: unknown = JSON.parse(window.localStorage.getItem("cda-discovery-history") || "[]");
    if (!Array.isArray(saved)) return;
    const active = saved.filter((entry): entry is { text: string; expiresAt: number } => Boolean(entry) && typeof entry === "object" && "text" in entry && typeof entry.text === "string" && "expiresAt" in entry && typeof entry.expiresAt === "number" && entry.expiresAt > Date.now());
    window.localStorage.setItem("cda-discovery-history", JSON.stringify(active));
    setChatHistory(active.map((entry) => entry.text));
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(null);
    setAssistantMessage("");
    setAlsoLike([]);
    try {
      const q = query;
      if (!q) {
        const response = await api.getProducts({ page: currentPage, perPage: 12 });
        setProducts(response.products);
        setTotalPages(response.pagination.totalPages);
        setCurrentPage(response.pagination.page);
        return;
      }

      const visitorKey = "cda-discovery-visitor";
      let visitorId = window.localStorage.getItem(visitorKey);
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        window.localStorage.setItem(visitorKey, visitorId);
      }
      const historyKey = "cda-discovery-history";
      const savedHistory = JSON.parse(window.localStorage.getItem(historyKey) || "[]") as Array<{ text: string; expiresAt: number }>;
      const history = savedHistory.filter((entry) => entry.expiresAt > Date.now()).map((entry) => entry.text);
      const requestKey = `${q}:${visitorId}`;
      if (activeRequest.current === requestKey) return;
      activeRequest.current = requestKey;
      const response = await fetch("/api/backend/discovery/recommendations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-discovery-visitor": visitorId },
        body: JSON.stringify({ prompt: q, history }),
      });
      if (response.status === 429) {
        const catalog = await api.getProducts({ page: 1, perPage: 12, search: q });
        setAssistantMessage("Encontrei essas opções para você 🤩");
        setProducts(catalog.products);
        setTotalPages(catalog.pagination.totalPages);
        setCurrentPage(catalog.pagination.page);
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error("Curadoria indisponível");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let selectedProducts: Product[] = [];
      let streamedMessage = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const data: unknown = JSON.parse(line.slice(6));
          if (event.startsWith("event: token") && data && typeof data === "object" && "token" in data && typeof data.token === "string") {
            streamedMessage += data.token;
            setAssistantMessage((message) => message + data.token);
          }
          if (event.startsWith("event: products") && data && typeof data === "object" && "products" in data && Array.isArray(data.products)) {
            selectedProducts = data.products as Product[];
          }
          if (event.startsWith("event: also_like") && data && typeof data === "object" && "products" in data && Array.isArray(data.products)) {
            setAlsoLike(data.products as Product[]);
          }
        }
      }
      setProducts(selectedProducts);
      if (streamedMessage) {
        const expiresAt = Date.now() + 60 * 60 * 1000;
        window.localStorage.setItem(historyKey, JSON.stringify([
          ...savedHistory.filter((entry) => entry.expiresAt > Date.now()),
          { text: `Cliente: ${q}`, expiresAt },
          { text: `Ana: ${streamedMessage}`, expiresAt },
        ].slice(-12)));
        setChatHistory((messages) => [...messages, `Cliente: ${q}`, `Ana: ${streamedMessage}`].slice(-12));
      }
      setTotalPages(1);
      setCurrentPage(1);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setLoadError("Não foi possível carregar os produtos no momento.");
    } finally {
      activeRequest.current = null;
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
  }, [query]);

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
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        <div className="flex gap-6">
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

          
          <main className="flex-1">
            {searchParams.get("q") && (loading || assistantMessage) && (
              <div className="mb-6 flex gap-3 rounded-2xl border border-rose-100 bg-white px-5 py-4 shadow-sm">
                <AnaAvatar speaking={loading} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Ana, sua curadora</p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{assistantMessage || "Estou escolhendo opções especiais para você..."}</p>
                </div>
              </div>
            )}
            {searchParams.get("q") && chatHistory.length > 0 && !loading && (
              <div className="mb-6 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {chatHistory.map((message, index) => (
                    <p key={`${message}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${message.startsWith("Ana:") ? "mr-8 bg-rose-50 text-[#5b0618]" : "ml-8 bg-gray-100 text-gray-700"}`}>{message.replace(/^(Ana|Cliente):\s*/, "")}</p>
                  ))}
                </div>
                <form className="relative mt-3" onSubmit={(event) => { event.preventDefault(); if (searchTerm.trim()) router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`); }}>
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Continue conversando com a Ana..." className="w-full rounded-xl border border-rose-200 bg-white py-3 pl-4 pr-12 text-sm text-[#35111a] outline-none focus:border-rose-400" />
                  <button type="submit" aria-label="Enviar mensagem" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-[#5b0618] text-white"><Send className="h-4 w-4" /></button>
                </form>
              </div>
            )}
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

                 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 mb-8">
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
                      className="max-sm:min-w-[150px]"
                    />
                  ))}
                 </div>

                 {alsoLike.length > 0 && (
                   <section className="border-t border-rose-100 pt-8">
                     <h2 className="text-2xl font-semibold tracking-tight text-[#35111a]">Você também pode gostar</h2>
                     <p className="mt-1 text-sm text-gray-600">Outras opções para deixar presente ainda mais especial.</p>
                     <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
                       {alsoLike.map((product) => (
                         <ProductCard key={product.id} props={{ id: product.id, name: product.name, price: product.price, image_url: product.image_url || null, categories: product.categories, discount: product.discount }} />
                       ))}
                     </div>
                   </section>
                 )}

                
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

                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {

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
