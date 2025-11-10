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
import { StatsOverview } from "./components/stats-overview";
import { useRouter } from "next/navigation";
import StockReportManage from "./components/stock/stock-manage";

export default function DashboardPage() {
  const api = useApi();
  const { user, isLoading: authLoading } = useAuth();
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading
              ? "Verificando autenticação..."
              : "Carregando dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <StatsOverview data={data} />
      <StockReportManage />
    </div>
  );
}
