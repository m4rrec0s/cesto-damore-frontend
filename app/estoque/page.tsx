"use client";

import { useState, useEffect } from "react";
import {
  useApi,
  Product,
  Category,
  Type as ProductType,
  Additional,
} from "../hooks/use-api";
import { ProductManager } from "./components/product-manager";
import { CategoryManager } from "./components/category-manager";
import { TypeManager } from "./components/type-manager";
import { AdditionalManager } from "./components/additional-manager";
import { StatsOverview } from "./components/stats-overview";
import { Package, Tag, Grid3X3, Plus, Settings, BarChart3 } from "lucide-react";

export default function EstoquePage() {
  const api = useApi();
  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "types" | "additionals" | "stats"
  >("stats");
  const [data, setData] = useState({
    products: [] as Product[],
    categories: [] as Category[],
    types: [] as ProductType[],
    additionals: [] as Additional[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [products, categories, types, additionals] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTypes(),
          api.getAdditionals(),
        ]);

        setData({
          products,
          categories,
          types,
          additionals,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [api]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    // Recarregar dados após uma atualização
    const loadAllData = async () => {
      try {
        const [products, categories, types, additionals] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTypes(),
          api.getAdditionals(),
        ]);

        setData({
          products,
          categories,
          types,
          additionals,
        });
      } catch (error) {
        console.error("Erro ao recarregar dados:", error);
      }
    };

    loadAllData();
  };

  const tabs = [
    {
      id: "stats" as const,
      label: "Visão Geral",
      icon: BarChart3,
      count: null,
    },
    {
      id: "products" as const,
      label: "Produtos",
      icon: Package,
      count: data.products.length,
    },
    {
      id: "categories" as const,
      label: "Categorias",
      icon: Tag,
      count: data.categories.length,
    },
    {
      id: "types" as const,
      label: "Tipos",
      icon: Grid3X3,
      count: data.types.length,
    },
    {
      id: "additionals" as const,
      label: "Adicionais",
      icon: Plus,
      count: data.additionals.length,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema de estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Controle de Estoque
                </h1>
                <p className="text-gray-600 text-sm">
                  Gerencie produtos, categorias, tipos e adicionais
                </p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "stats" && <StatsOverview data={data} />}
        {activeTab === "products" && (
          <ProductManager
            products={data.products}
            categories={data.categories}
            types={data.types}
            onUpdate={handleDataUpdate}
          />
        )}
        {activeTab === "categories" && (
          <CategoryManager
            categories={data.categories}
            onUpdate={handleDataUpdate}
          />
        )}
        {activeTab === "types" && (
          <TypeManager types={data.types} onUpdate={handleDataUpdate} />
        )}
        {activeTab === "additionals" && (
          <AdditionalManager
            additionals={data.additionals}
            onUpdate={handleDataUpdate}
          />
        )}
      </div>
    </div>
  );
}
