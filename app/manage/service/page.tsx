"use client";

import { useEffect, useState } from "react";
import { useApi, N8NCustomer, CombinedCustomerInfo } from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Switch } from "@/app/components/ui/switch";
import {
  MessageSquare,
  Phone,
  User,
  ShoppingBag,
  Filter,
  RefreshCcw,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const ServicePage = () => {
  const api = useApi();
  const [customers, setCustomers] = useState<N8NCustomer[]>([]);
  const [followUpCustomers, setFollowUpCustomers] = useState<
    CombinedCustomerInfo[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CombinedCustomerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [filters, setFilters] = useState({
    follow_up: undefined as boolean | undefined,
    service_status: "",
    already_a_customer: undefined as boolean | undefined,
  });

  const [messageForm, setMessageForm] = useState({
    phone: "",
    message: "",
  });

  const [editForm, setEditForm] = useState({
    phone: "",
    name: "",
    service_status: "",
    already_a_customer: false,
    follow_up: false,
  });

  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.listCustomers({
        ...filters,
        limit: 100,
      });
      setCustomers(
        Array.isArray(response?.customers) ? response.customers : []
      );
    } catch (error) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUpCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getFollowUpCustomers();
      setFollowUpCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar clientes para follow-up");
      console.error(error);
      setFollowUpCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "all") {
      loadCustomers();
    } else if (activeTab === "followup") {
      loadFollowUpCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

  // Abrir detalhes do cliente
  const openCustomerDetails = async (phone: string) => {
    setLoading(true);
    try {
      const data = await api.getCustomerInfo(phone);
      setSelectedCustomer(data);
      setShowDetailsDialog(true);
    } catch (error) {
      toast.error("Erro ao carregar detalhes do cliente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (customer: N8NCustomer) => {
    setEditForm({
      phone: customer.number,
      name: customer.name || "",
      service_status: customer.service_status || "",
      already_a_customer: customer.already_a_customer || false,
      follow_up: customer.follow_up || false,
    });
    setShowEditDialog(true);
  };

  const openMessageDialog = (phone: string) => {
    setMessageForm({ phone, message: "" });
    setShowMessageDialog(true);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await api.upsertCustomer({
        number: editForm.phone,
        name: editForm.name,
        service_status: editForm.service_status,
        already_a_customer: editForm.already_a_customer,
        follow_up: editForm.follow_up,
      });
      toast.success("Cliente atualizado com sucesso!");
      setShowEditDialog(false);
      loadCustomers();
    } catch (error) {
      toast.error("Erro ao atualizar cliente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageForm.message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setLoading(true);
    try {
      const result = await api.sendMessageToCustomer(
        messageForm.phone,
        messageForm.message
      );

      if (result.success) {
        toast.success("Mensagem enviada com sucesso!");
        setShowMessageDialog(false);
        setMessageForm({ phone: "", message: "" });
        loadCustomers();
      } else {
        console.error("❌ Falha no envio - success: false", result);
        toast.error("Falha ao enviar mensagem");
      }
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);

      if (error instanceof Error) {
        toast.error(`Erro: ${error.message}`);
      } else if (typeof error === "object" && error !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = error as any;
        if (errorObj.response?.data?.error) {
          toast.error(`Erro: ${errorObj.response.data.error}`);
        } else if (errorObj.response?.data?.message) {
          toast.error(`Erro: ${errorObj.response.data.message}`);
        } else {
          toast.error("Erro ao enviar mensagem");
        }
      } else {
        toast.error("Erro ao enviar mensagem");
      }
    } finally {
      setLoading(false);
    }
  };

  // Alternar follow-up
  const toggleFollowUp = async (phone: string, currentValue: boolean) => {
    try {
      await api.updateCustomerFollowUp(phone, !currentValue);
      toast.success("Follow-up atualizado!");
      loadCustomers();
    } catch (error) {
      toast.error("Erro ao atualizar follow-up");
      console.error(error);
    }
  };

  // Formatar data
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleString("pt-BR");
  };

  // Formatar telefone
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(
        4,
        9
      )}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie clientes, envie mensagens e controle follow-ups
          </p>
        </div>
        <Button onClick={loadCustomers} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">
            <Users className="mr-2 h-4 w-4" />
            Todos os Clientes
          </TabsTrigger>
          <TabsTrigger value="followup">
            <Clock className="mr-2 h-4 w-4" />
            Follow-ups Ativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Follow-up</Label>
                <Select
                  value={
                    filters.follow_up === undefined
                      ? "all"
                      : filters.follow_up.toString()
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      follow_up: value === "all" ? undefined : value === "true",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status de Cliente</Label>
                <Select
                  value={
                    filters.already_a_customer === undefined
                      ? "all"
                      : filters.already_a_customer.toString()
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      already_a_customer:
                        value === "all" ? undefined : value === "true",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Cliente Ativo</SelectItem>
                    <SelectItem value="false">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status de Serviço</Label>
                <Input
                  placeholder="Digite o status..."
                  value={filters.service_status}
                  onChange={(e) =>
                    setFilters({ ...filters, service_status: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabela de clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes ({customers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status de Serviço</TableHead>
                    <TableHead>Última Mensagem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.number}>
                        <TableCell className="font-mono">
                          {formatPhone(customer.number)}
                        </TableCell>
                        <TableCell>{customer.name || "—"}</TableCell>
                        <TableCell>
                          {customer.service_status ? (
                            <Badge variant="outline">
                              {customer.service_status}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(customer.last_message_sent)}
                        </TableCell>
                        <TableCell>
                          {customer.already_a_customer ? (
                            <Badge className="bg-green-500">
                              <UserCheck className="mr-1 h-3 w-3" />
                              Cliente
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Prospect</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={customer.follow_up || false}
                            onCheckedChange={() =>
                              toggleFollowUp(
                                customer.number,
                                customer.follow_up || false
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openCustomerDetails(customer.number)
                              }
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openMessageDialog(customer.number)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!Array.isArray(followUpCustomers) ||
            followUpCustomers.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhum cliente com follow-up ativo
                </CardContent>
              </Card>
            ) : (
              followUpCustomers.map((customerInfo) => (
                <Card
                  key={customerInfo.n8n_customer?.number}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Phone className="mr-2 h-5 w-5" />
                        {formatPhone(customerInfo.n8n_customer?.number || "")}
                      </span>
                      {customerInfo.has_app_account && (
                        <Badge className="bg-green-500">
                          <UserCheck className="mr-1 h-3 w-3" />
                          App
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {customerInfo.n8n_customer?.name ||
                        customerInfo.app_user?.name ||
                        "Sem nome"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customerInfo.n8n_customer?.service_status && (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Status: {customerInfo.n8n_customer.service_status}
                        </span>
                      </div>
                    )}

                    {customerInfo.n8n_customer?.last_message_sent && (
                      <div className="flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Última mensagem:{" "}
                          {formatDate(
                            customerInfo.n8n_customer.last_message_sent
                          )}
                        </span>
                      </div>
                    )}

                    {customerInfo.has_app_account && (
                      <div className="flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {customerInfo.total_orders} pedido(s)
                          {customerInfo.last_order_status && (
                            <Badge variant="outline" className="ml-2">
                              {customerInfo.last_order_status}
                            </Badge>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          openCustomerDetails(
                            customerInfo.n8n_customer?.number || ""
                          )
                        }
                      >
                        <User className="mr-2 h-4 w-4" />
                        Detalhes
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          openMessageDialog(
                            customerInfo.n8n_customer?.number || ""
                          )
                        }
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Mensagem
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações completas do cliente
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Informações do N8N */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Dados de Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="font-medium">Telefone:</span>
                    <span className="font-mono">
                      {formatPhone(selectedCustomer.n8n_customer?.number || "")}
                    </span>

                    <span className="font-medium">Nome:</span>
                    <span>{selectedCustomer.n8n_customer?.name || "—"}</span>

                    <span className="font-medium">Status de Serviço:</span>
                    <span>
                      {selectedCustomer.n8n_customer?.service_status || "—"}
                    </span>

                    <span className="font-medium">Última Mensagem:</span>
                    <span>
                      {formatDate(
                        selectedCustomer.n8n_customer?.last_message_sent
                      )}
                    </span>

                    <span className="font-medium">Follow-up:</span>
                    <span>
                      {selectedCustomer.n8n_customer?.follow_up ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </span>

                    <span className="font-medium">Cliente Ativo:</span>
                    <span>
                      {selectedCustomer.n8n_customer?.already_a_customer ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Informações do App */}
              {selectedCustomer.has_app_account &&
                selectedCustomer.app_user && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Dados do Aplicativo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="font-medium">Email:</span>
                        <span>{selectedCustomer.app_user.email}</span>

                        <span className="font-medium">Endereço:</span>
                        <span>{selectedCustomer.app_user.address || "—"}</span>

                        <span className="font-medium">Cidade:</span>
                        <span>
                          {selectedCustomer.app_user.city || "—"},{" "}
                          {selectedCustomer.app_user.state || "—"}
                        </span>

                        <span className="font-medium">CEP:</span>
                        <span>{selectedCustomer.app_user.zip_code || "—"}</span>

                        <span className="font-medium">Total de Pedidos:</span>
                        <span className="font-bold">
                          {selectedCustomer.total_orders}
                        </span>
                      </div>

                      {selectedCustomer.app_user.orders.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Últimos Pedidos:</h4>
                          <div className="space-y-2">
                            {selectedCustomer.app_user.orders
                              .slice(0, 5)
                              .map((order) => (
                                <div
                                  key={order.id}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <div>
                                    <span className="font-mono text-sm">
                                      #{order.id.slice(0, 8)}
                                    </span>
                                    <Badge variant="outline" className="ml-2">
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold">
                                      R$ {order.total_price.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(
                                        order.created_at
                                      ).toLocaleDateString("pt-BR")}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Telefone</Label>
              <Input value={formatPhone(editForm.phone)} disabled />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Status de Serviço</Label>
              <Input
                value={editForm.service_status}
                onChange={(e) =>
                  setEditForm({ ...editForm, service_status: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.already_a_customer}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, already_a_customer: checked })
                }
              />
              <Label>Cliente Ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.follow_up}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, follow_up: checked })
                }
              />
              <Label>Follow-up Ativo</Label>
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={loading}
              className="w-full"
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Mensagem */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
            <DialogDescription>
              Envie uma mensagem via WhatsApp para{" "}
              {formatPhone(messageForm.phone)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={messageForm.message}
                onChange={(e) =>
                  setMessageForm({ ...messageForm, message: e.target.value })
                }
                placeholder="Digite sua mensagem..."
                rows={5}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={loading || !messageForm.message.trim()}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar Mensagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicePage;
