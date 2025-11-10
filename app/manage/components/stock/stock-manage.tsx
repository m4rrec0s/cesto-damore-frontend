"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertCircle, Package, Box, TrendingDown } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import useApi, { Additional } from "@/app/hooks/use-api";

interface LowStockItem {
  id: string;
  name: string;
  type: "product" | "component" | "item";
  current_stock: number;
  threshold: number;
}

export default function StockReportManage() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [filter, setFilter] = useState<
    "all" | "product" | "component" | "item"
  >("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const additionalsData = await api.getAdditionals();
      setAdditionals(additionalsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dados mockados para demonstração
  const mockReport = useMemo(() => {
    const mockLowStockItems: LowStockItem[] = [
      {
        id: "1",
        name: "Chocolate Belga Premium",
        type: "product",
        current_stock: 0,
        threshold: 5,
      },
      {
        id: "2",
        name: "Bombom de Morango",
        type: "product",
        current_stock: 2,
        threshold: 5,
      },
      {
        id: "3",
        name: "Caixa Decorativa Rosa",
        type: "component",
        current_stock: 4,
        threshold: 10,
      },
      {
        id: "4",
        name: "Fita de Cetim Dourada",
        type: "component",
        current_stock: 1,
        threshold: 5,
      },
      {
        id: "5",
        name: "Laço Decorativo",
        type: "component",
        current_stock: 0,
        threshold: 5,
      },
    ];

    return {
      low_stock_items: mockLowStockItems,
      total_products: 25,
      total_components: 18,
      products_out_of_stock: 1,
      components_out_of_stock: 1,
    };
  }, []);

  const getStatusColor = (stock: number): string => {
    if (stock === 0) return "bg-red-100 text-red-800";
    if (stock <= 2) return "bg-rose-100 text-rose-800";
    if (stock <= 5) return "bg-amber-100 text-amber-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusText = (stock: number): string => {
    if (stock === 0) return "Sem Estoque";
    if (stock <= 2) return "Crítico";
    if (stock <= 5) return "Baixo";
    return "Normal";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="w-4 h-4" />;
      case "component":
        return <Box className="w-4 h-4" />;
      case "item":
        return <Package className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "product":
        return "Produto";
      case "component":
        return "Componente";
      case "item":
        return "Item";
      default:
        return type;
    }
  };

  const filteredItems = mockReport.low_stock_items.filter(
    (item) => filter === "all" || item.type === filter
  );

  if (loading) {
    return (
      <div className="mt-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando itens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Header com Badge */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-white shadow-sm">
            Disponível na versão posterior
          </Badge>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Controle de Estoque
            </h2>
            <p className="text-sm text-gray-600">
              Monitore produtos e componentes com estoque baixo
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Produtos</h3>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-extrabold text-blue-900">
              {mockReport.products_out_of_stock}
            </p>
            <p className="text-sm text-blue-700">
              de {mockReport.total_products} sem estoque
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
                <Box className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                Componentes
              </h3>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-extrabold text-purple-900">
              {mockReport.components_out_of_stock}
            </p>
            <p className="text-sm text-purple-700">
              de {mockReport.total_components} sem estoque
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl transition-all font-medium ${
              filter === "all"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos ({mockReport.low_stock_items.length})
          </button>
          <button
            onClick={() => setFilter("product")}
            className={`px-4 py-2 rounded-xl transition-all font-medium ${
              filter === "product"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Produtos (
            {
              mockReport.low_stock_items.filter((i) => i.type === "product")
                .length
            }
            )
          </button>
          <button
            onClick={() => setFilter("component")}
            className={`px-4 py-2 rounded-xl transition-all font-medium ${
              filter === "component"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Componentes (
            {
              mockReport.low_stock_items.filter((i) => i.type === "component")
                .length
            }
            )
          </button>
        </div>
      </div>

      {/* Items List - Itens Reais da API */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative">
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-white shadow-sm">
            Disponível na versão posterior
          </Badge>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Itens com Estoque Baixo
        </h3>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium">
              Nenhum item com estoque baixo
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Ajuste os filtros para ver outros itens
            </p>
          </div>
        ) : (
          <div className="space-y-3 opacity-50">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {item.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(item.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Limite mínimo: {item.threshold} unidades
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Estoque Atual</p>
                    <p
                      className={`text-2xl font-bold ${
                        item.current_stock === 0
                          ? "text-red-600"
                          : item.current_stock <= 2
                          ? "text-rose-600"
                          : "text-amber-600"
                      }`}
                    >
                      {item.current_stock}
                    </p>
                  </div>
                  <div>
                    <Badge
                      className={`${getStatusColor(
                        item.current_stock
                      )} px-3 py-1`}
                    >
                      {item.current_stock === 0 && (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {getStatusText(item.current_stock)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Itens Reais da API */}
      {additionals.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Itens Cadastrados
            </h3>
            <Badge variant="outline">{additionals.length} itens</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionals.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1 truncate">
                      {item.name}
                    </h4>
                    <p className="text-lg font-bold text-purple-600">
                      R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Summary */}
      {filteredItems.length > 0 && (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-900 mb-2">
                Atenção Necessária
              </h3>
              <p className="text-sm text-rose-700 leading-relaxed">
                <strong>
                  {filteredItems.filter((i) => i.current_stock === 0).length}
                </strong>{" "}
                {filteredItems.filter((i) => i.current_stock === 0).length === 1
                  ? "item"
                  : "itens"}{" "}
                sem estoque e{" "}
                <strong>
                  {filteredItems.filter((i) => i.current_stock > 0).length}
                </strong>{" "}
                com estoque baixo. Considere reabastecer em breve para evitar
                rupturas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
