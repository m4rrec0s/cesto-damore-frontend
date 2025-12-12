"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import InfiniteScroll from "react-infinite-scroll-component";
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
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/lib/utils";
import {
  useApi,
  Order,
  OrderItemDetailed,
  OrderStatus,
} from "../../hooks/use-api";
import { CustomizationDisplay } from "./customization-display";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Em separação/Envio",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState<{
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>({ total: 0, totalPages: 0, hasMore: false });
  const ITEMS_PER_PAGE = 8;

  const loadOrders = useCallback(
    async (currentFilter: StatusFilter, page: number = 1, silent = false) => {
      if (!silent && page === 1) setLoading(true);
      try {
        const params =
          currentFilter === "all"
            ? { page, limit: ITEMS_PER_PAGE }
            : {
                status: currentFilter === "open" ? "open" : currentFilter,
                page,
                limit: ITEMS_PER_PAGE,
              };
        const data = await api.getOrders(params);

        // Handle both old format (array) and new format (paginated response)
        if (Array.isArray(data)) {
          const list = data as Order[];
          if (page === 1) {
            setOrders(list);
          } else {
            setOrders((prev) => [...prev, ...list]);
          }
          setSelectedStatuses(
            list.reduce<StatusSelectionState>((acc, order) => {
              acc[order.id] = getInitialNextStatus(order.status);
              return acc;
            }, {})
          );
          setPaginationData({
            total: list.length,
            totalPages: 1,
            hasMore: false,
          });
        } else {
          // New paginated format
          const paginatedData = data as {
            data: Order[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
              hasMore: boolean;
            };
          };
          const list = paginatedData.data || [];

          if (page === 1) {
            setOrders(list);
            setCurrentPage(1);
          } else {
            setOrders((prev) => [...prev, ...list]);
          }

          const newStatuses = list.reduce<StatusSelectionState>(
            (acc, order) => {
              if (!selectedStatuses[order.id]) {
                acc[order.id] = getInitialNextStatus(order.status);
              }
              return acc;
            },
            {}
          );

          if (Object.keys(newStatuses).length > 0) {
            setSelectedStatuses((prev) => ({ ...prev, ...newStatuses }));
          }

          setPaginationData(paginatedData.pagination);
          setCurrentPage(paginatedData.pagination.page);
        }

        setCounts((prev) => ({
          ...prev,
          [currentFilter]: paginationData.total || 0,
        }));
      } catch (error: unknown) {
        console.error("Erro ao carregar pedidos:", error);
        toast.error(
          extractErrorMessage(error, "Não foi possível carregar pedidos")
        );
      } finally {
        if (page === 1) setLoading(false);
      }
    },
    [api, ITEMS_PER_PAGE, selectedStatuses, paginationData.total]
  );

  useEffect(() => {
    setOrders([]);
    setCurrentPage(1);
    setPaginationData({ total: 0, totalPages: 0, hasMore: false });
    loadOrders(statusFilter, 1);
  }, [statusFilter, loadOrders]);

  const refreshCounts = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const results = await Promise.all(
          SUMMARY_FILTERS.map((filter) => {
            const params =
              filter === "all"
                ? { page: 1, limit: 1 }
                : {
                    status: filter === "open" ? "open" : filter,
                    page: 1,
                    limit: 1,
                  };
            return api.getOrders(params);
          })
        );

        const map = SUMMARY_FILTERS.reduce<
          Partial<Record<StatusFilter, number>>
        >((acc, filter, index) => {
          const result = results[index];
          if (Array.isArray(result)) {
            acc[filter] = (result as Order[]).length;
          } else {
            const paginatedResult = result as {
              pagination?: { total: number };
            };
            acc[filter] = paginatedResult?.pagination?.total || 0;
          }
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
          loadOrders(statusFilter, 1, true),
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

  const handleDeleteCanceledOrders = useCallback(async () => {
    const confirmed = window.confirm("Excluir todos os pedidos cancelados?");
    if (!confirmed) return;
    setUpdatingOrders((prev) => ({ ...prev, ["deleteAll"]: true }));
    try {
      await api.deleteAllCanceledOrders();
      toast.success("Pedido cancelado excluído");
      await Promise.all([
        loadOrders(statusFilter, 1, true),
        refreshCounts(true),
      ]);
    } catch (error: unknown) {
      console.error("Erro ao excluir pedido cancelado", error);
      toast.error(
        extractErrorMessage(
          error,
          "Não foi possível excluir o pedido cancelado"
        )
      );
    } finally {
      setUpdatingOrders((prev) => ({ ...prev, ["deleteAll"]: false }));
    }
  }, [api, loadOrders, refreshCounts, statusFilter]);

  const loadMoreOrders = useCallback(() => {
    if (paginationData.hasMore) {
      loadOrders(statusFilter, currentPage + 1, true);
    }
  }, [statusFilter, currentPage, paginationData.hasMore, loadOrders]);

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
            variant="secondary"
            onClick={() => handleDeleteCanceledOrders()}
            disabled={updatingOrders["deleteAll"]}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Excluir pedidos cancelados
          </Button>

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
        <InfiniteScroll
          dataLength={groupedOrders.length}
          next={loadMoreOrders}
          hasMore={paginationData.hasMore}
          loader={
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            </div>
          }
          endMessage={
            <div className="flex justify-center py-8">
              <p className="text-gray-500 text-sm">
                Você viu todos os pedidos ({groupedOrders.length} no total)
              </p>
            </div>
          }
        >
          <div className="space-y-6">
            {groupedOrders.map((order) => {
              const currentStatus = order.status;
              const selectedStatus =
                selectedStatuses[order.id] ?? currentStatus;
              const isUpdating = Boolean(updatingOrders[order.id]);
              const paymentStatus = order.payment?.status;
              const totalItems = order.items.reduce(
                (acc, item) => acc + (item.quantity ?? 0),
                0
              );
              const canCancel =
                currentStatus !== "DELIVERED" && currentStatus !== "CANCELED";
              const disableUpdate =
                isUpdating ||
                !selectedStatus ||
                selectedStatus === currentStatus;

              const isExpanded = expandedOrders.has(order.id);
              const toggleExpand = () => {
                const newExpanded = new Set(expandedOrders);
                if (isExpanded) {
                  newExpanded.delete(order.id);
                } else {
                  newExpanded.add(order.id);
                }
                setExpandedOrders(newExpanded);
              };

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Header Clicável - Sempre Visível */}
                  <button
                    onClick={toggleExpand}
                    className="w-full text-left p-6 hover:bg-gray-50/50 transition-colors flex flex-col gap-4 md:flex-row md:items-start md:justify-between group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400">
                        <span>Pedido</span>
                        <span>#{shortId(order.id)}</span>
                        <span>•</span>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                        {order.user?.name || "Cliente não identificado"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {order.user?.email || "Sem e-mail"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
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
                        Total:{" "}
                        {formatCurrency(order.grand_total || order.total)}
                      </Badge>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-gray-400 transition-transform duration-300 ml-2",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* Conteúdo Expandível */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 py-6 space-y-6">
                      <section className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <User className="h-4 w-4 text-gray-500" /> Cliente
                          </h4>
                          <div className="text-sm text-gray-600">
                            {order.user?.phone && (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <Link
                                  href={`https://wa.me/55${order.user.phone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-rose-600"
                                >
                                  {order.user.phone}
                                </Link>
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
                              {order.delivery_address ||
                                "Endereço não informado"}
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

                      <section className="space-y-3">
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
                                          {additional.additional?.name ||
                                            "Adicional"}
                                        </span>
                                        <span className="font-medium text-gray-600">
                                          x{additional.quantity} •{" "}
                                          {formatCurrency(
                                            additional.price *
                                              additional.quantity
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {item.customizations.length > 0 && (
                                <div className="mt-3 space-y-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-gray-700">
                                      Customizações (
                                      {item.customizations.length})
                                    </p>
                                    {item.customizations.some((c) =>
                                      getGoogleDriveFolderUrl(
                                        c as unknown as Record<string, unknown>
                                      )
                                    ) && (
                                      <Link
                                        href={
                                          getGoogleDriveFolderUrl(
                                            (item.customizations.find((c) =>
                                              getGoogleDriveFolderUrl(
                                                c as unknown as Record<
                                                  string,
                                                  unknown
                                                >
                                              )
                                            ) || {}) as Record<string, unknown>
                                          ) || "#"
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-medium"
                                      >
                                        <FolderOpen className="h-3 w-3" />
                                        Abrir no Drive
                                      </Link>
                                    )}
                                  </div>
                                  <ul className="space-y-2">
                                    {item.customizations.map(
                                      (customization) => (
                                        <CustomizationDisplay
                                          key={customization.id}
                                          customization={{
                                            id: customization.id,
                                            customization_type:
                                              customization.customization_type,
                                            title: customization.title,
                                            value:
                                              customization.value ?? undefined,
                                          }}
                                        />
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Botões de Ação Rápida */}
                      <section className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                          onClick={() => {
                            const phone =
                              order.recipient_phone || order.user?.phone;
                            if (phone) {
                              const whatsappUrl = `https://wa.me/${onlyDigits(
                                phone
                              )}?text=${encodeURIComponent(
                                `Olá! Sobre o pedido #${shortId(order.id)}`
                              )}`;
                              window.open(whatsappUrl, "_blank");
                            } else {
                              toast.error("Número de telefone não disponível");
                            }
                          }}
                        >
                          <Phone className="h-4 w-4" />
                          Falar no WhatsApp
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            toast.info(
                              "Função de mensagem direta em desenvolvimento"
                            );
                          }}
                        >
                          <User className="h-4 w-4" />
                          Mensagem Direta
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            window.open(
                              `/manage/service?order=${order.id}`,
                              "_blank"
                            );
                          }}
                        >
                          <PackageCheck className="h-4 w-4" />
                          Verificar Situação
                        </Button>
                      </section>

                      <footer className="flex flex-col gap-4 border-t border-gray-100 pt-6 md:flex-row md:items-center md:justify-between">
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
                            onClick={() =>
                              handleStatusChange(order, selectedStatus)
                            }
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
                            onClick={() =>
                              handleStatusChange(order, "CANCELED")
                            }
                            disabled={isUpdating || !canCancel}
                            className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <XCircle className="h-4 w-4" /> Cancelar pedido
                          </Button>
                        </div>
                      </footer>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </InfiniteScroll>
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

function getGoogleDriveFolderUrl(
  customization: Record<string, unknown>
): string | null {
  try {
    // Tenta extrair folder_id do google_drive_url se disponível
    if (
      customization.google_drive_url &&
      typeof customization.google_drive_url === "string"
    ) {
      // Se for uma pasta do Drive, retorna a URL
      if (customization.google_drive_url.includes("folder")) {
        return customization.google_drive_url;
      }
      // Se for um arquivo, tenta extrair a pasta
      const folderId =
        customization.google_drive_url.match(/[?&]id=([^&]+)/)?.[1];
      if (folderId) {
        return `https://drive.google.com/drive/folders/${folderId}`;
      }
    }

    // Tenta pelo value se for JSON
    if (customization.value) {
      const data =
        typeof customization.value === "string"
          ? JSON.parse(customization.value as string)
          : customization.value;

      if (data?.folder_id) {
        return `https://drive.google.com/drive/folders/${data.folder_id}`;
      }
      if (data?.google_drive_url) {
        return data.google_drive_url;
      }
    }
  } catch {
    // Se falhar no parse, ignora
  }

  return null;
}
