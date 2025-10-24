"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Box, Layers, Link2, Palette } from "lucide-react";
import { ProductsTab } from "@/app/manage/components/catalog/ProductsTab";
import { ItemsTab } from "@/app/manage/components/catalog/ItemsTab";
import { ConstraintsTab } from "@/app/manage/components/catalog/ConstraintsTab";
import { CustomizationsTab } from "../components/catalog/CustomizationsTab";

export default function CatalogPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Box className="w-4 h-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Componentes
            </TabsTrigger>
            <TabsTrigger
              value="customizations"
              className="flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Customizações
            </TabsTrigger>
            <TabsTrigger
              value="constraints"
              className="flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Restrições
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="items">
            <ItemsTab />
          </TabsContent>

          <TabsContent value="customizations">
            <CustomizationsTab />
          </TabsContent>

          <TabsContent value="constraints">
            <ConstraintsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
