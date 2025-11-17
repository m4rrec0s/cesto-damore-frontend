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
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApi } from "@/app/hooks/use-api";

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
    label: "Aguardando Pagamento",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Seu pedido está aguardando confirmação do pagamento",
  },
  PAID: {
    label: "Pagamento Confirmado",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "✨ Sua cesta está sendo preparada com muito carinho!",
  },
  SHIPPED: {
    label: "Em Rota de Entrega",
    icon: Truck,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Seu pedido está a caminho!",
  },
  DELIVERED: {
    label: "Entregue",
    icon: Package,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Pedido entregue com sucesso!",
  },
  CANCELED: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Este pedido foi cancelado",
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
        console.log("🔍 Buscando pedidos do usuário:", user.id);

        const data = await getOrderByUserId(user.id);

        console.log("📦 Pedidos recebidos:", data);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
          <p className="mt-2 text-gray-600">
            Acompanhe o status dos seus pedidos
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum pedido ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Quando você fizer um pedido, ele aparecerá aqui
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-rose-500 hover:bg-rose-600"
            >
              Começar a comprar
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status];
              const StatusIcon = config.icon;

              return (
                <Card
                  key={order.id}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Pedido #{order.id.substring(0, 8).toUpperCase()}
                        </h3>
                        <Badge className={`${config.color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {config.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-rose-500">
                        R${" "}
                        {(order.grand_total || order.total)
                          .toFixed(2)
                          .replace(".", ",")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
                  </div>

                  {order.delivery_date && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Entrega prevista:</strong>{" "}
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
                  )}

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Itens do pedido:
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-3">
                            {item.product.image_url && (
                              <Image
                                src={item.product.image_url}
                                alt={item.product.name}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <span className="text-gray-700">
                              {item.quantity}x {item.product.name}
                            </span>
                          </div>
                          <span className="text-gray-900 font-medium">
                            R${" "}
                            {(item.price * item.quantity)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline simples das fases do pedido */}
                  <div className="mt-4">
                    <div className="flex items-center gap-4">
                      {(
                        ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const
                      ).map((s) => {
                        const isActive =
                          (s === "PENDING" && order.status === "PENDING") ||
                          (s === "PAID" &&
                            (order.status === "PAID" ||
                              order.status === "SHIPPED" ||
                              order.status === "DELIVERED")) ||
                          (s === "SHIPPED" &&
                            (order.status === "SHIPPED" ||
                              order.status === "DELIVERED")) ||
                          (s === "DELIVERED" && order.status === "DELIVERED");

                        const label =
                          statusConfig[s as keyof typeof statusConfig].label;

                        return (
                          <div key={s} className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                isActive ? "bg-rose-500" : "bg-gray-300"
                              }`}
                              aria-hidden
                            />
                            <span
                              className={`text-xs ${
                                isActive ? "text-gray-900" : "text-gray-400"
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/pedidos/${order.id}`)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      Ver detalhes
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
