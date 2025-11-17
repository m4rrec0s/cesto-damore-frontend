"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/use-auth";
import { useApi, Order } from "@/app/hooks/use-api";
import { useParams } from "next/navigation";
import { Badge } from "@/app/components/ui/badge";
import Image from "next/image";
import { Clock, CheckCircle, XCircle, Truck, Package } from "lucide-react";
import { useWebhookNotification } from "@/app/hooks/use-webhook-notification";

const statusConfig = {
  PENDING: {
    label: "Aguardando Pagamento",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  PAID: {
    label: "Pagamento Confirmado",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  SHIPPED: {
    label: "Em Rota de Entrega",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Truck,
  },
  DELIVERED: {
    label: "Entregue",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Package,
  },
  CANCELED: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

export default function OrderDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { getOrder } = useApi();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await getOrder(id);
        setOrder(data || null);
      } catch (error) {
        console.error("Erro ao buscar pedido:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id, getOrder]);

  const sseOnPaymentApproved = useCallback(() => {
    getOrder(id).then((o) => setOrder(o || null));
  }, [getOrder, id]);

  useWebhookNotification({
    orderId: id,
    enabled: Boolean(id),
    onPaymentApproved: sseOnPaymentApproved,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Pedido não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Detalhes do Pedido
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Pedido #{order.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="mb-4">
          <Badge className={`${statusConfig[order.status].color} border`}>
            {statusConfig[order.status].label}
          </Badge>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700">Itens</h3>
              <div className="mt-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.product?.image_url && (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="rounded"
                      />
                    )}
                    <div>
                      <div className="text-sm text-gray-800">
                        {item.product?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.quantity}x • R${" "}
                        {item.price.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">Resumo</h3>
              <div className="mt-3 text-sm text-gray-600">
                <p>Subtotal: R$ {order.total.toFixed(2).replace(".", ",")}</p>
                {order.discount ? (
                  <p>Desconto: R$ {order.discount.toFixed(2)}</p>
                ) : null}
                <p className="font-bold">
                  Total: R${" "}
                  {(order.grand_total ?? order.total)
                    .toFixed(2)
                    .replace(".", ",")}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Criado em: {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <div className="flex items-center gap-4 justify-between">
              {(["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const).map(
                (s, idx) => {
                  const cfg = statusConfig[s as keyof typeof statusConfig];
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

                  return (
                    <div key={s} className="flex-1 text-center">
                      <div
                        className={`mx-auto w-8 h-8 rounded-full ${
                          isActive ? "bg-rose-500" : "bg-gray-200"
                        }`}
                      />
                      <div
                        className={`text-xs ${
                          isActive ? "text-gray-900" : "text-gray-400"
                        } mt-2`}
                      >
                        {cfg.label}
                      </div>
                      {idx < 3 && (
                        <div
                          className="h-0.5 bg-gray-200 mx-auto mt-2"
                          style={{ width: "60%" }}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Detalhes adicionais: endereço, pagamento, etc. */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-sm font-semibold text-gray-700">
              Endereço de entrega
            </h4>
            <p className="mt-2 text-sm text-gray-600">
              {order.delivery_address}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {order.delivery_city} - {order.delivery_state}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-sm font-semibold text-gray-700">Pagamento</h4>
            <p className="mt-2 text-sm text-gray-600">
              {order.payment ? order.payment.status : "Sem pagamento vinculado"}
            </p>
            {order.payment?.mercado_pago_id && (
              <p className="text-xs text-gray-400 mt-1">
                MP ID: {order.payment?.mercado_pago_id}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
