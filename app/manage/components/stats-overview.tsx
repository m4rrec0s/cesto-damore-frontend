import {
  Product,
  Category,
  Type as ProductType,
  Additional,
} from "../../hooks/use-api";
import {
  Package,
  Tag,
  Grid3X3,
  Plus,
  TrendingUp,
  DollarSign,
  Settings,
  Sparkles,
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

interface StatsOverviewProps {
  data: {
    products: Product[];
    categories: Category[];
    types: ProductType[];
    additionals: Additional[];
  };
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const totalProducts = data.products.length;
  const totalCategories = data.categories.length;
  const totalTypes = data.types.length;
  const totalAdditionals = data.additionals.length;
  const totalPromotionalItems =
    data.products.filter((p) => p.discount && p.discount > 0).length +
    data.additionals.filter((a) => a.discount && a.discount > 0).length;

  const salesData = [
    { day: "01", vendas: 12 },
    { day: "02", vendas: 19 },
    { day: "03", vendas: 8 },
    { day: "04", vendas: 15 },
    { day: "05", vendas: 22 },
    { day: "06", vendas: 18 },
    { day: "07", vendas: 25 },
    { day: "08", vendas: 14 },
    { day: "09", vendas: 20 },
    { day: "10", vendas: 16 },
    { day: "11", vendas: 28 },
    { day: "12", vendas: 21 },
    { day: "13", vendas: 17 },
    { day: "14", vendas: 24 },
    { day: "15", vendas: 19 },
    { day: "16", vendas: 26 },
    { day: "17", vendas: 13 },
    { day: "18", vendas: 23 },
    { day: "19", vendas: 18 },
    { day: "20", vendas: 30 },
    { day: "21", vendas: 22 },
    { day: "22", vendas: 16 },
    { day: "23", vendas: 27 },
    { day: "24", vendas: 20 },
    { day: "25", vendas: 25 },
    { day: "26", vendas: 19 },
    { day: "27", vendas: 31 },
    { day: "28", vendas: 24 },
    { day: "29", vendas: 18 },
    { day: "30", vendas: 26 },
  ];

  const revenueData = [
    { month: "Jan", receita: 12500 },
    { month: "Fev", receita: 15200 },
    { month: "Mar", receita: 18100 },
    { month: "Abr", receita: 16800 },
    { month: "Mai", receita: 22300 },
    { month: "Jun", receita: 19800 },
    { month: "Jul", receita: 24500 },
    { month: "Ago", receita: 21200 },
    { month: "Set", receita: 23800 },
    { month: "Out", receita: 19600 },
    { month: "Nov", receita: 26700 },
    { month: "Dez", receita: 28900 },
  ];

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

  const stats = [
    {
      title: "Total de Produtos",
      value: totalProducts,
      icon: Package,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Categorias",
      value: totalCategories,
      icon: Tag,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Tipos de Produto",
      value: totalTypes,
      icon: Grid3X3,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Adicionais",
      value: totalAdditionals,
      icon: Plus,
      color: "bg-rose-500",
      textColor: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      title: "Itens com Promoção",
      value: totalPromotionalItems,
      icon: TrendingUp,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.bgColor} rounded-2xl p-4 md:p-6 border border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p
                    className={`text-2xl md:text-3xl font-bold ${stat.textColor}`}
                  >
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`${stat.color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center`}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráficos de Vendas por Dias */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm relative">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Vendas por Dias (Mensal)
          </h3>
          <div className="relative">
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full"
            >
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-xs">
              <div className="text-center">
                <Badge variant="outline" className="px-4 py-2 bg-white/80">
                  ⨂ Gráfico indisponível
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos de Ganhos Anuais */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm relative">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ganhos Anuais (R$)
          </h3>
          <div className="relative">
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full"
            >
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    `R$ ${value.toLocaleString("pt-BR")}`,
                    "Receita",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-xs rounded-lg">
              <div className="text-center">
                <Badge variant="outline" className="px-4 py-2 bg-white/80 mb-2">
                  ⨂ Gráfico indisponível
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Receita do Mês Atual */}
        <div className="relative rounded-2xl p-5 border border-gray-100 bg-white shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 pt-[44px]">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center ring-1 ring-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Receita do Mês Atual
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Valor total de vendas no mês
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold text-gray-900">R$ --</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  +0.0% vs mês anterior
                </span>
                <span className="text-xs text-gray-400">
                  Última atualização: hoje
                </span>
              </div>
            </div>

            <div className="w-28">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ width: "56%" }}
                />
              </div>
              <p className="text-xs text-right text-gray-400 mt-2">Meta: 80%</p>
            </div>
          </div>
        </div>

        {/* Taxa de Crescimento/Decaimento */}
        <div className="relative rounded-2xl p-5 border border-gray-100 bg-white shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 pt-[44px]">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center ring-1 ring-sky-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Taxa de Crescimento
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Comparado ao mês anterior
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-extrabold text-gray-900">--</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700">
                Estável
              </span>
              <p className="text-xs text-gray-400">
                Dados históricos insuficientes
              </p>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-sky-500"
                style={{ width: "36%" }}
              />
            </div>
          </div>
        </div>

        {/* Configuração de Banners Promocionais */}
        <div className="relative rounded-2xl p-5 border border-gray-100 bg-white shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 pt-[4 flex flex-col justify-between pt-[44px]">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-violet-50 flex items-center justify-center ring-1 ring-purple-100">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Banners Promocionais
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure banners para promoções
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              aria-disabled
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-50 to-white border border-gray-200 text-gray-600 opacity-80 cursor-not-allowed"
            >
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-xs">
                Em breve
              </span>
              Configurar Banners
            </button>

            <p className="text-xs text-gray-400 mt-3">
              Dica: crie imagens em 1200x300 para melhor resultado
            </p>
          </div>
        </div>

        {/* Resumo Personalizado por IA */}
        <div className="relative rounded-2xl p-5 border border-gray-100 bg-white shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 pt-[44px]">
          <Badge variant="outline" className="absolute top-4 right-4 z-10">
            Disponível na versão posterior
          </Badge>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-50 flex items-center justify-center ring-1 ring-indigo-100">
              <Sparkles className="h-6 w-6 text-indigo-600" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Resumo do Mês por IA
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Análise inteligente das vendas
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-100 text-sm text-gray-400 italic">
              Resumo personalizado indisponível no momento
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Solicite resumo ao ativar IA
              </p>
              <span className="text-xs text-gray-500">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
