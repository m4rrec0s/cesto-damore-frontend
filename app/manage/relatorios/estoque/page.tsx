"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Package,
  Palette,
  TrendingDown,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import useApi from "@/app/hooks/use-api";

interface LowStockItem {
  id: string;
  name: string;
  type: "product" | "additional" | "color";
  current_stock: number;
  threshold: number;
  color_name?: string;
  color_hex_code?: string;
  additional_name?: string;
}

interface StockReport {
  low_stock_items: LowStockItem[];
  total_products: number;
  total_additionals: number;
  total_colors: number;
  products_out_of_stock: number;
  additionals_out_of_stock: number;
  colors_out_of_stock: number;
}

export default function StockReportPage() {
  const router = useRouter();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<StockReport | null>(null);
  const [threshold, setThreshold] = useState(5);
  const [filter, setFilter] = useState<
    "all" | "product" | "additional" | "color"
  >("all");

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.getStockReport(threshold);
      setReport(response);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (stock: number): string => {
    if (stock === 0) return "bg-red-100 text-red-800 border-red-300";
    if (stock <= 2) return "bg-orange-100 text-orange-800 border-orange-300";
    if (stock <= 5) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  const getStatusText = (stock: number): string => {
    if (stock === 0) return "SEM ESTOQUE";
    if (stock <= 2) return "CRÍTICO";
    if (stock <= 5) return "BAIXO";
    return "OK";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="w-4 h-4" />;
      case "additional":
        return <Package className="w-4 h-4" />;
      case "color":
        return <Palette className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "product":
        return "Produto";
      case "additional":
        return "Adicional";
      case "color":
        return "Cor";
      default:
        return type;
    }
  };

  const filteredItems =
    report?.low_stock_items.filter(
      (item) => filter === "all" || item.type === filter
    ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-600" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/manage")}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Voltar para o painel"
              aria-label="Voltar para o painel de gerenciamento"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingDown className="w-8 h-8 text-orange-600" />
                Relatório de Estoque
              </h1>
              <p className="text-gray-600 mt-1">
                Monitore itens com estoque baixo e sem estoque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Limite:</label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                title="Selecionar limite de estoque"
                aria-label="Selecionar limite de estoque para alertas"
              >
                <option value={3}>3 unidades</option>
                <option value={5}>5 unidades</option>
                <option value={10}>10 unidades</option>
                <option value={20}>20 unidades</option>
              </select>
            </div>
            <button
              onClick={loadReport}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Produtos</h3>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {report?.products_out_of_stock || 0}
              </p>
              <p className="text-sm text-gray-600">
                de {report?.total_products || 0} sem estoque
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Adicionais</h3>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {report?.additionals_out_of_stock || 0}
              </p>
              <p className="text-sm text-gray-600">
                de {report?.total_additionals || 0} sem estoque
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Cores</h3>
              <Palette className="w-5 h-5 text-pink-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {report?.colors_out_of_stock || 0}
              </p>
              <p className="text-sm text-gray-600">
                de {report?.total_colors || 0} sem estoque
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos ({report?.low_stock_items.length || 0})
            </button>
            <button
              onClick={() => setFilter("product")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "product"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Produtos (
              {report?.low_stock_items.filter((i) => i.type === "product")
                .length || 0}
              )
            </button>
            <button
              onClick={() => setFilter("additional")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "additional"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Adicionais (
              {report?.low_stock_items.filter((i) => i.type === "additional")
                .length || 0}
              )
            </button>
            <button
              onClick={() => setFilter("color")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "color"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Cores (
              {report?.low_stock_items.filter((i) => i.type === "color")
                .length || 0}
              )
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalhes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque Atual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limite
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Nenhum item com estoque baixo encontrado</p>
                      <p className="text-sm mt-1">
                        Ajuste o limite ou verifique os filtros
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            item.current_stock
                          )}`}
                        >
                          {item.current_stock === 0 ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {getStatusText(item.current_stock)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          {getTypeIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === "color" && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                              style={{ backgroundColor: item.color_hex_code }}
                            />
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">
                                {item.color_name}
                              </p>
                              <p className="text-gray-500">
                                {item.additional_name}
                              </p>
                            </div>
                          </div>
                        )}
                        {item.type !== "color" && (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              item.current_stock === 0
                                ? "text-red-600"
                                : item.current_stock <= 2
                                ? "text-orange-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {item.current_stock} un
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.threshold} un
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Summary */}
        {filteredItems.length > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">
                  Atenção necessária
                </h3>
                <p className="text-sm text-orange-700">
                  {filteredItems.filter((i) => i.current_stock === 0).length}{" "}
                  item(ns) sem estoque e{" "}
                  {filteredItems.filter((i) => i.current_stock > 0).length} com
                  estoque baixo. Considere reabastecer em breve.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
