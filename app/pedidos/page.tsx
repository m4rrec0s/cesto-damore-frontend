"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/use-auth";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChevronRight,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApi } from "@/app/hooks/use-api";
import { getInternalImageUrl } from "@/lib/image-helper";

interface Order {
  id: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  total: number;
  grand_total: number;
  delivery_date: string | null;
  created_at: string;
  items: Array<{
    product: {
      name: string;
      image_url?: string | null;
    };
    quantity: number;
    price: number;
  }>;
}

const statusConfig = {
  PENDING: {
    label: "Aguardando",
    icon: Clock,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
    description: "Aguardando pagamento",
  },
  PAID: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    description: "Preparando seu pedido",
  },
  SHIPPED: {
    label: "Em Entrega",
    icon: Truck,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
    description: "A caminho",
  },
  DELIVERED: {
    label: "Entregue",
    icon: Package,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dotColor: "bg-purple-500",
    description: "Pedido finalizado",
  },
  CANCELED: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    dotColor: "bg-gray-400",
    description: "Pedido cancelado",
  },
};

export default function PedidosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getOrderByUserId } = useApi();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const data = await getOrderByUserId(user.id);
        setOrders(data || []);
      } catch (error) {
        console.error("❌ Erro ao carregar pedidos:", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, getOrderByUserId]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-rose-500 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-gray-500">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <div className="border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Meus Pedidos
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {orders.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <div className="p-8 sm:p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                <Package className="h-10 w-10 text-rose-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Nenhum pedido ainda
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-sm mx-auto">
                Explore nossos produtos e faça seu primeiro pedido!
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30"
              >
                Começar a comprar
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status];
              const StatusIcon = config.icon;

              return (
                <Card
                  key={order.id}
                  className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur overflow-hidden"
                >
                  {/* Header do Card - Mobile Optimized */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-4 sm:p-5 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                          <Badge
                            className={`${config.color} border text-xs px-2 py-0.5`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(order.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                          R${" "}
                          {(order.grand_total || order.total)
                            .toFixed(2)
                            .replace(".", ",")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total do pedido
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Date */}
                  {order.delivery_date && (
                    <div className="mx-4 sm:mx-5 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-blue-900 mb-0.5">
                            Previsão de entrega
                          </p>
                          <p className="text-sm font-semibold text-blue-700">
                            {new Date(order.delivery_date).toLocaleDateString(
                              "pt-BR",
                              {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items - Mobile Optimized */}
                  <div className="p-4 sm:p-5">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                      Itens do pedido ({order.items.length})
                    </p>
                    <div className="space-y-2.5">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5 sm:p-3"
                        >
                          {item.product.image_url && (
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                              <Image
                                src={getInternalImageUrl(item.product.image_url)}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qtd: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-gray-900 flex-shrink-0">
                            R${" "}
                            {(item.price * item.quantity)
                              .toFixed(2)
                              .replace(".", ",")}
                          </p>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-gray-500 text-center py-1">
                          + {order.items.length - 3} itens adicionais
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Timeline - Simplified for Mobile */}
                  {order.status !== "CANCELED" && (
                    <div className="px-4 sm:px-5 pb-4">
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          {(
                            ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const
                          ).map((s, idx) => {
                            const isActive =
                              (s === "PENDING" && order.status === "PENDING") ||
                              (s === "PAID" &&
                                ["PAID", "SHIPPED", "DELIVERED"].includes(
                                  order.status
                                )) ||
                              (s === "SHIPPED" &&
                                ["SHIPPED", "DELIVERED"].includes(
                                  order.status
                                )) ||
                              (s === "DELIVERED" &&
                                order.status === "DELIVERED");

                            const StepIcon = statusConfig[s].icon;

                            return (
                              <div key={s} className="flex items-center flex-1">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div
                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                      isActive
                                        ? "bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30"
                                        : "bg-gray-200"
                                    }`}
                                  >
                                    <StepIcon
                                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                        isActive
                                          ? "text-white"
                                          : "text-gray-400"
                                      }`}
                                    />
                                  </div>
                                  <span
                                    className={`text-[10px] sm:text-xs font-medium text-center leading-tight hidden sm:block ${
                                      isActive
                                        ? "text-gray-900"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {statusConfig[s].label}
                                  </span>
                                </div>
                                {idx < 3 && (
                                  <div
                                    className={`h-0.5 flex-1 mx-1 sm:mx-2 transition-all ${
                                      isActive ? "bg-rose-500" : "bg-gray-200"
                                    }`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-center text-xs text-gray-600 mt-3 sm:hidden">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Button */}
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-3 bg-gray-50/50">
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/pedidos/${order.id}`)}
                      className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium"
                    >
                      Ver detalhes completos
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
