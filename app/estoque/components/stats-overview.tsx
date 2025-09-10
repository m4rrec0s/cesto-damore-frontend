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
  AlertTriangle,
  DollarSign,
} from "lucide-react";

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

  const totalValue = data.products.reduce(
    (sum, product) => sum + product.price,
    0
  );
  const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;

  const productsByCategory = data.categories.map((category) => ({
    name: category.name,
    count: data.products.filter((p) => p.categoryId === category.id).length,
  }));

  const productsByType = data.types.map((type) => ({
    name: type.name,
    count: data.products.filter((p) => p.typeId === type.id).length,
  }));

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
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.bgColor} rounded-2xl p-6 border border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estatísticas Financeiras */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Valor Total do Estoque
              </h3>
              <p className="text-sm text-gray-600">Soma de todos os produtos</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalValue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Preço Médio</h3>
              <p className="text-sm text-gray-600">Valor médio por produto</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {averagePrice.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Atenção</h3>
              <p className="text-sm text-gray-600">Categorias sem produtos</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {productsByCategory.filter((c) => c.count === 0).length}
          </p>
        </div>
      </div>

      {/* Distribuição por Categoria e Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Produtos por Categoria
          </h3>
          <div className="space-y-3">
            {productsByCategory.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-600">{category.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-orange-500 rounded-full transition-all duration-300`}
                      style={{
                        width:
                          totalProducts > 0
                            ? `${Math.min(
                                (category.count / totalProducts) * 100,
                                100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {category.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Produtos por Tipo
          </h3>
          <div className="space-y-3">
            {productsByType.map((type) => (
              <div
                key={type.name}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-600">{type.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-500 rounded-full transition-all duration-300`}
                      style={{
                        width:
                          totalProducts > 0
                            ? `${Math.min(
                                (type.count / totalProducts) * 100,
                                100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {type.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
