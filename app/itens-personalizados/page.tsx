"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";

interface ComponentItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  _count: {
    components: number;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  type: string;
  categories: string[];
}

interface ComponentDetails {
  item: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    base_price: number;
  };
  products: Product[];
}

export default function ItensPersonalizadosPage() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = "/api/backend";

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/items/components`);
      if (!response.ok) throw new Error("Erro ao carregar componentes");
      const data = await response.json();
      setComponents(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Erro ao carregar componentes");
      } else {
        setError("Erro ao carregar componentes");
      }
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const fetchComponentDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(
        `${apiBaseUrl}/items/components/${id}/products`,
      );
      if (!response.ok) throw new Error("Erro ao carregar produtos");
      const data = await response.json();
      setSelectedComponent(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Erro ao carregar produtos");
      } else {
        setError("Erro ao carregar produtos");
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleComponentClick = (component: ComponentItem) => {
    if (selectedComponent?.item.id === component.id) {
      setSelectedComponent(null);
    } else {
      fetchComponentDetails(component.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando componentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchComponents}
            className="mt-4 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Products View - Full Screen */}
        {selectedComponent ? (
          <div>
            <button
              onClick={() => setSelectedComponent(null)}
              className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-6 font-medium"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Fechar
            </button>

            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Produtos com {selectedComponent.item.name}
              </h1>
              {selectedComponent.item.description && (
                <p className="text-gray-600">
                  {selectedComponent.item.description}
                </p>
              )}
            </div>

            {loadingDetails ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando produtos...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {selectedComponent.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/produto/${product.id}`}
                      className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative h-56 bg-gray-200">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-pink-600 font-bold text-lg">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Qtd: {product.quantity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                            {product.type}
                          </span>
                          {product.categories.slice(0, 2).map((cat, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {selectedComponent.products.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhum produto ativo encontrado com este componente
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          // Components Grid View
          <>
            <div className="mb-8">
              <Link
                href="/"
                className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-4"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Voltar ao início
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Itens Personalizados
              </h1>
              <p className="text-gray-600">
                Escolha um componente para ver todos os produtos que o incluem
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {components.map((component) => (
                <div
                  key={component.id}
                  onClick={() => handleComponentClick(component)}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                  <div className="relative h-48 bg-gray-100">
                    {component.image_url ? (
                      <img
                        src={component.image_url}
                        alt={component.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {component.name}
                    </h3>
                    {component.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {component.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-pink-600 font-semibold">
                        {formatPrice(component.base_price)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {component._count.components}{" "}
                        {component._count.components === 1
                          ? "produto"
                          : "produtos"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {components.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Nenhum componente disponível no momento
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
