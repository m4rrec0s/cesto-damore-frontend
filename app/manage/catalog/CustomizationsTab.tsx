"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/app/lib/auth-utils";

// Importar os formulários específicos
import TextCustomizationForm from "../components/customizations/TextCustomizationForm";
import ImageCustomizationForm from "../components/customizations/ImageCustomizationForm";
import MultipleChoiceCustomizationForm from "../components/customizations/MultipleChoiceCustomizationForm";
import BaseLayoutCustomizationForm from "../components/customizations/BaseLayoutCustomizationForm";

interface Customization {
  id: string;
  item_id: string;
  type: "BASE_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  name: string;
  description?: string;
  isRequired: boolean;
  customization_data: Record<string, unknown>;
  price: number;
}

interface Layout {
  id: string;
  item_id: string;
  name: string;
  image_url: string;
  layout_data: {
    model_url: string;
    print_areas?: PrintArea[];
  };
}

interface PrintArea {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { width: number; height: number };
}

interface Item {
  id: string;
  name: string;
  allows_customization: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function CustomizationsTab() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [editingCustomization, setEditingCustomization] =
    useState<Customization | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"customizations" | "layouts">(
    "customizations"
  );

  // Form state para customizações
  const [formData, setFormData] = useState({
    item_id: "",
    type: "TEXT" as Customization["type"],
    name: "",
    description: "",
    isRequired: false,
    price: 0,
    customization_data: {} as Record<string, unknown>,
  });

  // Form state para layouts 3D
  const [layoutFormData, setLayoutFormData] = useState({
    item_id: "",
    name: "",
    model_url: "",
  });

  useEffect(() => {
    fetchItems();
    fetchCustomizations();
    fetchLayouts();
  }, []);

  const fetchItems = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    }
  };

  const fetchCustomizations = async (itemId?: string) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const url = itemId
        ? `${API_URL}/customizations?itemId=${itemId}`
        : `${API_URL}/customizations`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomizations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar customizações:", error);
      toast.error("Erro ao buscar customizações");
    } finally {
      setLoading(false);
    }
  };

  const fetchLayouts = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/layouts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLayouts(data);
      }
    } catch (error) {
      console.error("Erro ao buscar layouts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getAuthToken();
      if (!token) return;

      const url = editingCustomization
        ? `${API_URL}/customizations/${editingCustomization.id}`
        : `${API_URL}/customizations`;

      const method = editingCustomization ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingCustomization
            ? "Customização atualizada com sucesso!"
            : "Customização criada com sucesso!"
        );
        setIsDialogOpen(false);
        resetForm();
        fetchCustomizations(selectedItem);
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao salvar customização");
      }
    } catch (error) {
      console.error("Erro ao salvar customização:", error);
      toast.error("Erro ao salvar customização");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta customização?")) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/customizations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Customização deletada com sucesso!");
        fetchCustomizations(selectedItem);
      } else {
        toast.error("Erro ao deletar customização");
      }
    } catch (error) {
      console.error("Erro ao deletar customização:", error);
      toast.error("Erro ao deletar customização");
    }
  };

  const handleEdit = (customization: Customization) => {
    setEditingCustomization(customization);
    setFormData({
      item_id: customization.item_id,
      type: customization.type,
      name: customization.name,
      description: customization.description || "",
      isRequired: customization.isRequired,
      price: customization.price,
      customization_data: customization.customization_data,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCustomization(null);
    setFormData({
      item_id: "",
      type: "TEXT",
      name: "",
      description: "",
      isRequired: false,
      price: 0,
      customization_data: {},
    });
  };

  const handleFilterByItem = (itemId: string) => {
    const actualId = itemId === "all" ? "" : itemId;
    setSelectedItem(actualId);
    fetchCustomizations(actualId || undefined);
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      BASE_LAYOUT: "bg-purple-500",
      TEXT: "bg-blue-500",
      IMAGES: "bg-green-500",
      MULTIPLE_CHOICE: "bg-yellow-500",
    };

    const labels = {
      BASE_LAYOUT: "Layout 3D",
      TEXT: "Texto",
      IMAGES: "Imagens",
      MULTIPLE_CHOICE: "Múltipla Escolha",
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-500"}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  // Handlers para Layouts 3D
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".glb") && !file.name.endsWith(".gltf")) {
      toast.error("Apenas arquivos .glb e .gltf são permitidos");
      return;
    }

    try {
      setUploading(true);
      const token = getAuthToken();
      if (!token) {
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("model", file);

      const response = await fetch(`${API_URL}/layouts/upload-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLayoutFormData((prev) => ({ ...prev, model_url: data.url }));
        toast.success("Modelo 3D enviado com sucesso!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao enviar modelo 3D");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do modelo 3D");
    } finally {
      setUploading(false);
    }
  };

  const handleLayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!layoutFormData.model_url) {
      toast.error("Faça upload de um modelo 3D primeiro");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const payload = {
        item_id: layoutFormData.item_id,
        name: layoutFormData.name,
        layout_data: {
          model_url: layoutFormData.model_url,
          print_areas: [],
          camera_position: { x: 0, y: 5, z: 10 },
          camera_target: { x: 0, y: 0, z: 0 },
        },
      };

      const response = await fetch(`${API_URL}/layouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Layout 3D criado com sucesso!");
        setIsLayoutDialogOpen(false);
        resetLayoutForm();
        fetchLayouts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao criar layout");
      }
    } catch (error) {
      console.error("Erro ao criar layout:", error);
      toast.error("Erro ao criar layout");
    }
  };

  const handleDeleteLayout = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este layout?")) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/layouts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Layout deletado com sucesso!");
        fetchLayouts();
      } else {
        toast.error("Erro ao deletar layout");
      }
    } catch (error) {
      console.error("Erro ao deletar layout:", error);
      toast.error("Erro ao deletar layout");
    }
  };

  const resetLayoutForm = () => {
    setLayoutFormData({
      item_id: "",
      name: "",
      model_url: "",
    });
  };

  const getItemName = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    return item?.name || "Item não encontrado";
  };

  const renderCustomizationDataForm = () => {
    switch (formData.type) {
      case "TEXT":
        return (
          <TextCustomizationForm
            data={formData.customization_data as never}
            onChange={(data) =>
              setFormData({
                ...formData,
                customization_data: data as unknown as Record<string, unknown>,
              })
            }
          />
        );
      case "IMAGES":
        return (
          <ImageCustomizationForm
            data={formData.customization_data as never}
            onChange={(data) =>
              setFormData({
                ...formData,
                customization_data: data as unknown as Record<string, unknown>,
              })
            }
          />
        );
      case "MULTIPLE_CHOICE":
        return (
          <MultipleChoiceCustomizationForm
            data={formData.customization_data as never}
            onChange={(data) =>
              setFormData({
                ...formData,
                customization_data: data as unknown as Record<string, unknown>,
              })
            }
          />
        );
      case "BASE_LAYOUT":
        return (
          <BaseLayoutCustomizationForm
            data={formData.customization_data as never}
            onChange={(data) =>
              setFormData({
                ...formData,
                customization_data: data as unknown as Record<string, unknown>,
              })
            }
            itemId={formData.item_id}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customizations">Customizações</TabsTrigger>
          <TabsTrigger value="layouts">Layouts 3D</TabsTrigger>
        </TabsList>

        {/* Tab de Customizações */}
        <TabsContent value="customizations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gerenciar Customizações</span>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Customização
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCustomization
                          ? "Editar Customização"
                          : "Nova Customização"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Item</Label>
                        <Select
                          value={formData.item_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, item_id: value })
                          }
                          disabled={!!editingCustomization}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items
                              .filter((item) => item.allows_customization)
                              .map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Customização</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: Customization["type"]) =>
                            setFormData({
                              ...formData,
                              type: value,
                              customization_data: {},
                            })
                          }
                          disabled={!!editingCustomization}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Texto</SelectItem>
                            <SelectItem value="IMAGES">Imagens</SelectItem>
                            <SelectItem value="MULTIPLE_CHOICE">
                              Múltipla Escolha
                            </SelectItem>
                            <SelectItem value="BASE_LAYOUT">
                              Layout 3D
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Ex: Adicionar texto personalizado"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Descreva a customização..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Preço Adicional (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center space-x-2 pt-7">
                          <Switch
                            checked={formData.isRequired}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, isRequired: checked })
                            }
                          />
                          <Label>Obrigatório</Label>
                        </div>
                      </div>

                      {/* Formulário específico por tipo */}
                      {formData.item_id && (
                        <div className="border-t pt-4">
                          {renderCustomizationDataForm()}
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button type="submit">
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Filtrar por Item</Label>
                <Select
                  value={selectedItem || "all"}
                  onValueChange={handleFilterByItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os itens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {items
                      .filter((item) => item.allows_customization)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Nenhuma customização encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      customizations.map((customization) => (
                        <TableRow key={customization.id}>
                          <TableCell className="font-medium">
                            {customization.name}
                          </TableCell>
                          <TableCell>
                            {getItemName(customization.item_id)}
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(customization.type)}
                          </TableCell>
                          <TableCell>
                            R$ {customization.price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {customization.isRequired ? (
                              <Badge>Sim</Badge>
                            ) : (
                              <Badge variant="outline">Não</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(customization)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(customization.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Layouts 3D */}
        <TabsContent value="layouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gerenciar Layouts 3D</span>
                <Dialog
                  open={isLayoutDialogOpen}
                  onOpenChange={setIsLayoutDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetLayoutForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Layout 3D
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Layout 3D</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLayoutSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Item</Label>
                        <Select
                          value={layoutFormData.item_id}
                          onValueChange={(value) =>
                            setLayoutFormData({
                              ...layoutFormData,
                              item_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items
                              .filter((item) => item.allows_customization)
                              .map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome do Layout</Label>
                        <Input
                          value={layoutFormData.name}
                          onChange={(e) =>
                            setLayoutFormData({
                              ...layoutFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="Ex: Layout Caneca Clássica"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Modelo 3D (.glb ou .gltf)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept=".glb,.gltf"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                          {uploading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                        {layoutFormData.model_url && (
                          <p className="text-sm text-green-600">
                            ✓ Modelo enviado: {layoutFormData.model_url}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsLayoutDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={uploading}>
                          <Upload className="mr-2 h-4 w-4" />
                          Criar Layout
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Modelo 3D</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {layouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Nenhum layout encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    layouts.map((layout) => (
                      <TableRow key={layout.id}>
                        <TableCell className="font-medium">
                          {layout.name}
                        </TableCell>
                        <TableCell>{getItemName(layout.item_id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {layout.layout_data.model_url.split("/").pop()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteLayout(layout.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
