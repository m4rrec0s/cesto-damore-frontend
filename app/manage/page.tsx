"use client";

import { useState, useEffect } from "react";
import {
  useApi,
  Product,
  Category,
  Type as ProductType,
  Additional,
  FeedConfiguration,
} from "../hooks/use-api";
import { useAuth } from "../hooks/use-auth";
import { ProductManager } from "./components/product-manager";
import { CategoryManager } from "./components/category-manager";
import { TypeManager } from "./components/type-manager";
import { AdditionalManager } from "./components/additional-manager";
import { StatsOverview } from "./components/stats-overview";
import {
  Package,
  Tag,
  Grid3X3,
  Plus,
  BarChart3,
  Monitor,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { Button } from "../components/ui/button";
import FeedManager from "./components/feed-manager";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EstoquePage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "types" | "additionals" | "stats" | "feed"
  >("stats");
  const [data, setData] = useState({
    products: [] as Product[],
    categories: [] as Category[],
    types: [] as ProductType[],
    additionals: [] as Additional[],
    feedConfigurations: [] as FeedConfiguration[],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    if (!isAdmin) {
      router.push("/");
    }

    const loadAllData = async () => {
      setLoading(true);
      try {
        const [
          productsResponse,
          categories,
          types,
          additionals,
          feedConfigurations,
        ] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTypes(),
          api.getAdditionals(),
          isAdmin
            ? api.getFeedConfigurations().catch((error) => {
                console.error("❌ Erro ao carregar Feed configs:", error);
                return [];
              })
            : Promise.resolve([]),
        ]);

        setData({
          products: productsResponse.products,
          categories,
          types,
          additionals,
          feedConfigurations,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadAllData();
    }
  }, [api, isAdmin, authLoading, user, router]);

  const handleDataUpdate = () => {
    api.invalidateCache();
    const loadAllData = async () => {
      try {
        const [
          productsResponse,
          categories,
          types,
          additionals,
          feedConfigurations,
        ] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTypes(),
          api.getAdditionals(),
          isAdmin
            ? api.getFeedConfigurations().catch((error) => {
                console.error("❌ Erro ao recarregar Feed configs:", error);
                return [];
              })
            : Promise.resolve([]),
        ]);

        setData({
          products: productsResponse.products,
          categories,
          types,
          additionals,
          feedConfigurations,
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
    {
      id: "feed" as const,
      label: "Feed",
      icon: Monitor,
      count: data.feedConfigurations.length,
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading
              ? "Verificando autenticação..."
              : "Carregando sistema de estoque..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-md hover:bg-gray-100">
                <ChevronLeft className="text-gray-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Painel de Controle
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Olá, {user?.name}</span>
              {isAdmin && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
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
                </Button>
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
        {activeTab === "feed" && isAdmin && (
          <FeedManager
            configurations={data.feedConfigurations}
            onUpdate={handleDataUpdate}
            api={api}
          />
        )}
        {activeTab === "feed" && !isAdmin && (
          <div className="text-center py-16">
            <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-600">
              Apenas administradores podem acessar as configurações de Feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
