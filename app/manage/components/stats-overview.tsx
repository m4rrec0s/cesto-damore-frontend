"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Product,
  Category,
  Type as ProductType,
  Additional,
} from "../../hooks/use-api";
import {
  Package,
  Tag,
  Plus,
  AlertCircle,
  ArrowRight,
  ImageIcon,
  FolderOpen,
  TrendingUp,
  DollarSign,
  BotIcon,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { ChartContainer } from "../../components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/app/components/ui/button";

interface StatsOverviewProps {
  data: {
    products: Product[];
    categories: Category[];
    types: ProductType[];
    additionals: Additional[];
  };
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const router = useRouter();

  // Métricas reais calculadas
  const metrics = useMemo(() => {
    const totalProducts = data.products.length;
    const totalCategories = data.categories.length;
    const totalAdditionals = data.additionals.length;

    // Produtos sem imagem
    const productsWithoutImage = data.products.filter(
      (p) => !p.image_url || p.image_url.trim() === ""
    ).length;

    // Categorias vazias (sem produtos)
    const emptyCategories = data.categories.filter((cat) => {
      return !data.products.some((p) =>
        p.categories.some((c) => c.category_id === cat.id)
      );
    }).length;

    // Preço médio dos produtos
    const avgPrice =
      totalProducts > 0
        ? data.products.reduce((sum, p) => sum + (p.price || 0), 0) /
          totalProducts
        : 0;

    return {
      totalProducts,
      totalCategories,
      totalAdditionals,
      productsWithoutImage,
      emptyCategories,
      avgPrice,
    };
  }, [data]);

  const recentProducts = useMemo(() => {
    return [...data.products]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [data.products]);

  const salesPreviewData = Array.from({ length: 30 }, (_, i) => ({
    day: String(i + 1).padStart(2, "0"),
    vendas: Math.floor(Math.random() * 20) + 10,
  }));

  const revenuePreviewData = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ].map((month) => ({
    month,
    receita: Math.floor(Math.random() * 15000) + 10000,
  }));

  const chartConfig = {
    vendas: {
      label: "Vendas",
      color: "hsl(var(--chart-1))",
    },
    receita: {
      label: "Receita",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Dashboard - Cesto d&apos;Amore
            </h2>
            <p className="text-white/90 text-sm md:text-base">
              Visão geral do seu catálogo de produtos
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold">
                {metrics.totalProducts}
              </div>
              <div className="text-xs md:text-sm text-white/80 mt-1">
                Produtos
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold">
                {metrics.totalAdditionals}
              </div>
              <div className="text-xs md:text-sm text-white/80 mt-1">
                Adicionais
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold">
                R$ {metrics.avgPrice.toFixed(2)}
              </div>
              <div className="text-xs md:text-sm text-white/80 mt-1">
                Preço Médio
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-white shadow-sm">
            Disponível na versão posterior
          </Badge>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <BotIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Resumo Semanal por IA
            </h3>
            <p className="text-sm text-gray-600">
              Análise inteligente do desempenho do seu negócio
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 space-y-3 opacity-40">
          <p className="text-gray-700 leading-relaxed">
            📈 <strong>Crescimento positivo:</strong> Suas vendas aumentaram 23%
            em relação à semana anterior, com destaque para a categoria de
            chocolates artesanais.
          </p>
          <p className="text-gray-700 leading-relaxed">
            🎯 <strong>Produto em destaque:</strong> O *Cesto Romântico Premium*
            foi o item mais vendido, representando 35% do faturamento semanal.
          </p>
          <p className="text-gray-700 leading-relaxed">
            💡 <strong>Recomendação:</strong> Considere aumentar o estoque de
            produtos relacionados a datas comemorativas. A demanda por cestas
            personalizadas está em alta.
          </p>
        </div>
      </div>

      {(metrics.productsWithoutImage > 0 || metrics.emptyCategories > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.productsWithoutImage > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">
                    Produtos sem Imagem
                  </h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {metrics.productsWithoutImage} produto
                  {metrics.productsWithoutImage > 1 ? "s" : ""} sem imagem
                  cadastrada. Isso pode afetar a experiência do cliente.
                </p>
                <Button
                  onClick={() => router.push("/manage/catalog")}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Revisar produtos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {metrics.emptyCategories > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">
                    Categorias Vazias
                  </h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  {metrics.emptyCategories} categoria
                  {metrics.emptyCategories > 1 ? "s" : ""} sem produtos.
                  Considere adicionar produtos ou remover a categoria.
                </p>
                <Button
                  onClick={() => router.push("/manage/categories")}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Ver categorias
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          onClick={() => router.push("/manage/catalog")}
          className="group bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 border border-gray-200 hover:border-blue-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
              <Package className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Novo Produto</h3>
          <p className="text-xs text-gray-500">Adicionar produto ao catálogo</p>
        </Button>

        <Button
          onClick={() => router.push("/manage/catalog?tab=items")}
          className="group bg-white hover:bg-gradient-to-br hover:from-rose-50 hover:to-rose-100 border border-gray-200 hover:border-rose-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 group-hover:bg-rose-500 flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5 text-rose-600 group-hover:text-white transition-colors" />
            </div>
            <Plus className="h-5 w-5 text-gray-400 group-hover:text-rose-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Novo Adicional</h3>
          <p className="text-xs text-gray-500">Criar item adicional</p>
        </Button>

        <Button
          onClick={() => router.push("/manage/categories")}
          className="group bg-white hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 border border-gray-200 hover:border-green-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 group-hover:bg-green-500 flex items-center justify-center transition-colors">
              <Tag className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Categorias</h3>
          <p className="text-xs text-gray-500">
            {metrics.totalCategories} categoria
            {metrics.totalCategories !== 1 ? "s" : ""}
          </p>
        </Button>

        <Button
          onClick={() => router.push("/manage/catalog?tab=products")}
          className="group bg-white hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 border border-gray-200 hover:border-purple-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-500 flex items-center justify-center transition-colors">
              <Package className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Ver Estoque</h3>
          <p className="text-xs text-gray-500">Gerenciar produtos</p>
        </Button>
      </div>

      {/* Produtos Recentes */}
      {recentProducts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Produtos Adicionados Recentemente
            </h3>
            <Button
              onClick={() => router.push("/manage/catalog?tab=products")}
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {recentProducts.map((product) => (
              <div
                key={product.id}
                className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push(`/produto/${product.id}`)}
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
                    {product.name}
                  </h4>
                  <p className="text-lg font-bold text-purple-600">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview de Gráficos Futuros */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Preview: Vendas por Dias */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-white to-transparent z-10">
            <Badge variant="outline" className="bg-white shadow-sm">
              Em breve
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4 relative z-10">
            Vendas por Dias (Mensal)
          </h3>

          <div className="relative">
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full opacity-30"
            >
              <LineChart data={salesPreviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                <TrendingUp className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">
                  Análise de Vendas
                </p>
                <p className="text-sm text-gray-600">
                  Disponível em versão futura
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview: Receita Anual */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-white to-transparent z-10">
            <Badge variant="outline" className="bg-white shadow-sm">
              Em breve
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4 relative z-10">
            Receita Anual (R$)
          </h3>

          <div className="relative">
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full opacity-30"
            >
              <LineChart data={revenuePreviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                <DollarSign className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">
                  Relatórios Financeiros
                </p>
                <p className="text-sm text-gray-600">
                  Disponível em versão futura
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
