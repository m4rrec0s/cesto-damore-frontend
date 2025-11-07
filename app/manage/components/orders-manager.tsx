"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  User,
  Workflow,
  XCircle,
} from "lucide-react";
import type {
  Order,
  OrderItemDetailed,
  OrderStatus,
} from "../../hooks/use-api";
import { useApi } from "../../hooks/use-api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../lib/utils";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Em separação/Envio",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-sky-100 text-sky-700 border-sky-200",
  SHIPPED: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELED: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_FLOW: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED"];

const STATUS_OPTIONS = STATUS_FLOW.concat("CANCELED" as OrderStatus);

type StatusFilter = "open" | "all" | OrderStatus;

const SUMMARY_FILTERS: StatusFilter[] = [
  "open",
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "all",
];

const FILTER_DEFINITION: Record<
  StatusFilter,
  { label: string; helper?: string }
> = {
  open: { label: "Em aberto", helper: "Pendente ao Entregue" },
  PENDING: { label: "Aguardando pagamento" },
  PAID: { label: "Pagos" },
  SHIPPED: { label: "Em envio" },
  DELIVERED: { label: "Entregues" },
  CANCELED: { label: "Cancelados" },
  all: { label: "Todos" },
};

interface StatusSelectionState {
  [orderId: string]: OrderStatus;
}

export function OrdersManager() {
  const api = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [selectedStatuses, setSelectedStatuses] =
    useState<StatusSelectionState>({});
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>(
    {}
  );
  const [counts, setCounts] = useState<Partial<Record<StatusFilter, number>>>(
    {}
  );

  const loadOrders = useCallback(
    async (currentFilter: StatusFilter, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params =
          currentFilter === "all"
            ? undefined
            : { status: currentFilter === "open" ? "open" : currentFilter };
        const data = await api.getOrders(params);
        const list = Array.isArray(data) ? (data as Order[]) : [];

        setOrders(list);
        setSelectedStatuses(
          list.reduce<StatusSelectionState>((acc, order) => {
            acc[order.id] = getInitialNextStatus(order.status);
            return acc;
          }, {})
        );
        setCounts((prev) => ({
          ...prev,
          [currentFilter]: list.length,
        }));
      } catch (error: unknown) {
        console.error("Erro ao carregar pedidos:", error);
        toast.error(
          extractErrorMessage(error, "Não foi possível carregar pedidos")
        );
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    loadOrders(statusFilter);
  }, [loadOrders, statusFilter]);

  const refreshCounts = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const results = await Promise.all(
          SUMMARY_FILTERS.map((filter) =>
            api.getOrders(
              filter === "all"
                ? undefined
                : { status: filter === "open" ? "open" : filter }
            )
          )
        );

        const map = SUMMARY_FILTERS.reduce<
          Partial<Record<StatusFilter, number>>
        >((acc, filter, index) => {
          acc[filter] = Array.isArray(results[index])
            ? (results[index] as Order[]).length
            : 0;
          return acc;
        }, {});

        setCounts(map);
        if (!silent) toast.success("Resumo atualizado");
      } catch (error: unknown) {
        console.error("Erro ao atualizar contagens de pedidos", error);
        if (!silent)
          toast.error(
            extractErrorMessage(
              error,
              "Não foi possível atualizar o resumo agora"
            )
          );
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [api]
  );

  useEffect(() => {
    refreshCounts(true);
  }, [refreshCounts]);

  const handleStatusChange = useCallback(
    async (order: Order, newStatus: OrderStatus) => {
      if (order.status === newStatus) {
        toast.info("O pedido já está nesse status");
        return;
      }

      const confirmed = window.confirm(
        `Alterar o pedido ${shortId(order.id)} para "${
          STATUS_LABELS[newStatus]
        }"?`
      );
      if (!confirmed) return;

      setUpdatingOrders((prev) => ({ ...prev, [order.id]: true }));
      try {
        await api.updateOrderStatus(order.id, newStatus, {
          notifyCustomer,
        });
        toast.success("Status do pedido atualizado");
        await Promise.all([
          loadOrders(statusFilter, true),
          refreshCounts(true),
        ]);
      } catch (error: unknown) {
        console.error("Erro ao atualizar status do pedido", error);
        toast.error(
          extractErrorMessage(error, "Não foi possível alterar o status")
        );
      } finally {
        setUpdatingOrders((prev) => ({ ...prev, [order.id]: false }));
      }
    },
    [api, loadOrders, notifyCustomer, refreshCounts, statusFilter]
  );

  const groupedOrders = useMemo(() => orders ?? [], [orders]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Workflow className="h-6 w-6 text-rose-500" /> Pedidos em andamento
          </h2>
          <p className="text-sm text-gray-500">
            Acompanhe pedidos em tempo real, avance etapas e mantenha seus
            clientes informados automaticamente.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(event) => setNotifyCustomer(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
            />
            Notificar cliente a cada atualização
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCounts(false)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar resumo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_FILTERS.slice(0, 4).map((filter) => {
          const definition = FILTER_DEFINITION[filter];
          return (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md",
                statusFilter === filter &&
                  "border-rose-400 shadow-md ring-1 ring-rose-200"
              )}
            >
              <span className="text-sm font-medium text-gray-500">
                {definition.label}
              </span>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {counts[filter] ?? "--"}
              </p>
              {definition.helper && (
                <span className="mt-1 text-xs text-gray-400">
                  {definition.helper}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUMMARY_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(filter)}
            className="gap-2"
          >
            <span>{FILTER_DEFINITION[filter].label}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-gray-100 text-gray-600"
            >
              {counts[filter] ?? "--"}
            </Badge>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando pedidos...</span>
          </div>
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <PackageCheck className="h-8 w-8" />
            <span>Nenhum pedido encontrado para este filtro.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map((order) => {
            const currentStatus = order.status;
            const selectedStatus = selectedStatuses[order.id] ?? currentStatus;
            const isUpdating = Boolean(updatingOrders[order.id]);
            const paymentStatus = order.payment?.status;
            const totalItems = order.items.reduce(
              (acc, item) => acc + (item.quantity ?? 0),
              0
            );
            const canCancel =
              currentStatus !== "DELIVERED" && currentStatus !== "CANCELED";
            const disableUpdate =
              isUpdating || !selectedStatus || selectedStatus === currentStatus;

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400">
                      <span>Pedido</span>
                      <span>#{shortId(order.id)}</span>
                      <span>•</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {order.user?.name || "Cliente não identificado"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {order.user?.email || "Sem e-mail"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                        STATUS_COLORS[currentStatus]
                      )}
                    >
                      {STATUS_LABELS[currentStatus]}
                    </Badge>
                    {paymentStatus && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        Pagamento: {paymentStatus}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-600"
                    >
                      Itens: {totalItems}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-600"
                    >
                      Total: {formatCurrency(order.grand_total || order.total)}
                    </Badge>
                  </div>
                </header>

                <section className="mt-6 grid gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <User className="h-4 w-4 text-gray-500" /> Cliente
                    </h4>
                    <div className="text-sm text-gray-600">
                      {order.user?.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a
                            href={`https://wa.me/${onlyDigits(
                              order.user.phone
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-rose-600"
                          >
                            {order.user.phone}
                          </a>
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        {order.payment_method
                          ? `Pagamento via ${order.payment_method}`
                          : "Forma de pagamento não informada"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-500" /> Entrega
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p>
                        {order.delivery_address || "Endereço não informado"}
                      </p>
                      <p className="text-gray-500">
                        {(order.delivery_city || "Cidade").trim()} -{" "}
                        {(order.delivery_state || "UF").trim()}
                      </p>
                      <p className="mt-1 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-gray-400" />
                        {order.delivery_date
                          ? formatDate(order.delivery_date)
                          : "Data de entrega não definida"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Workflow className="h-4 w-4 text-gray-500" />
                      Progresso
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_FLOW.map((status) => {
                        const isCompleted =
                          STATUS_FLOW.indexOf(order.status) >
                          STATUS_FLOW.indexOf(status);
                        const isCurrent = order.status === status;
                        return (
                          <Badge
                            key={status}
                            className={cn(
                              "border px-2 py-1 text-xs",
                              isCurrent
                                ? STATUS_COLORS[status]
                                : isCompleted
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-gray-200 bg-white text-gray-500"
                            )}
                          >
                            {STATUS_LABELS[status]}
                          </Badge>
                        );
                      })}
                      {order.status === "CANCELED" && (
                        <Badge
                          className={cn(
                            "px-2 py-1 text-xs",
                            STATUS_COLORS.CANCELED
                          )}
                        >
                          Pedido cancelado
                        </Badge>
                      )}
                    </div>
                  </div>
                </section>

                <section className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Itens da cesta
                  </h4>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                          <div className="font-medium text-gray-900">
                            {item.product?.name || "Produto"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Quantidade: {item.quantity} • Total:{" "}
                            {formatCurrency(calculateItemTotal(item))}
                          </div>
                        </div>
                        {item.additionals.length > 0 && (
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            <p className="font-medium text-gray-700">
                              Adicionais
                            </p>
                            <ul className="space-y-1">
                              {item.additionals.map((additional) => (
                                <li
                                  key={additional.id}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span>
                                    {additional.additional?.name || "Adicional"}
                                  </span>
                                  <span className="font-medium text-gray-600">
                                    x{additional.quantity} •{" "}
                                    {formatCurrency(
                                      additional.price * additional.quantity
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.customizations.length > 0 && (
                          <div className="mt-3 space-y-1 text-xs">
                            <p className="font-medium text-gray-700">
                              Customizações
                            </p>
                            <ul className="space-y-1">
                              {item.customizations.map((customization) => (
                                <li
                                  key={customization.id}
                                  className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-gray-600"
                                >
                                  <Badge
                                    variant="outline"
                                    className="border-gray-200 bg-white px-2 py-0 text-[10px] uppercase tracking-wide text-gray-500"
                                  >
                                    {formatCustomizationType(
                                      customization.customization_type
                                    )}
                                  </Badge>
                                  <span className="font-medium text-gray-700">
                                    {customization.title}
                                  </span>
                                  {customization.google_drive_url && (
                                    <a
                                      href={customization.google_drive_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                      Ver arquivos
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <footer className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase text-gray-500">
                      Próximo status
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) =>
                          setSelectedStatuses((prev) => ({
                            ...prev,
                            [order.id]: value as OrderStatus,
                          }))
                        }
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {notifyCustomer
                          ? "Clientes serão notificados automaticamente."
                          : "Notificações automáticas desativadas."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => handleStatusChange(order, selectedStatus)}
                      disabled={disableUpdate}
                      className="gap-2"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Atualizar status
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(order, "CANCELED")}
                      disabled={isUpdating || !canCancel}
                      className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <XCircle className="h-4 w-4" /> Cancelar pedido
                    </Button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getInitialNextStatus(status: OrderStatus): OrderStatus {
  if (status === "CANCELED") return "CANCELED";
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1) return status;
  if (index < STATUS_FLOW.length - 1) return STATUS_FLOW[index + 1];
  return status;
}

function shortId(id: string) {
  return id ? id.substring(0, 8).toUpperCase() : "--";
}

function formatDate(value?: string | null) {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "R$ 0,00";
  return currencyFormatter.format(value);
}

function onlyDigits(value?: string | null) {
  return value ? value.replace(/\D/g, "") : "";
}

function formatCustomizationType(type: string) {
  switch (type) {
    case "PHOTO_UPLOAD":
      return "Envio de fotos";
    case "ITEM_SUBSTITUTION":
      return "Substituição";
    case "TEXT_INPUT":
      return "Mensagem";
    case "MULTIPLE_CHOICE":
      return "Opções";
    default:
      return "Customização";
  }
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { error?: unknown } };
      }
    ).response;
    const message = response?.data?.error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function calculateItemTotal(item: OrderItemDetailed) {
  const additionalsTotal = item.additionals.reduce((acc, additional) => {
    const quantity = additional.quantity ?? 0;
    return acc + (additional.price || 0) * quantity;
  }, 0);
  return (item.price || 0) * (item.quantity || 0) + additionalsTotal;
}
