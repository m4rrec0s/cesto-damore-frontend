"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

// Import customization forms
import BaseLayoutCustomizationForm from "./customizations/BaseLayoutCustomizationForm";
import TextCustomizationForm from "./customizations/TextCustomizationForm";
import ImageCustomizationForm from "./customizations/ImageCustomizationForm";
import MultipleChoiceCustomizationForm from "./customizations/MultipleChoiceCustomizationForm";

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

// Type-safe interfaces for customization data
interface BaseLayoutData {
  layouts: Array<{ id: string; name: string }>;
}

interface TextCustomizationData {
  fields: Array<{
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
    max_length?: number;
  }>;
}

interface ImageCustomizationData {
  base_layout: {
    max_images: number;
    min_width?: number;
    min_height?: number;
    max_file_size_mb?: number;
    accepted_formats?: string[];
  };
}

interface MultipleChoiceData {
  options: Array<{
    id: string;
    label: string;
    description?: string;
    price_modifier: number;
    image_url?: string;
  }>;
  min_selection: number;
  max_selection: number;
}

type CustomizationData =
  | BaseLayoutData
  | TextCustomizationData
  | ImageCustomizationData
  | MultipleChoiceData;

interface Item {
  id: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CustomizationManager() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomization, setEditingCustomization] =
    useState<Customization | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    item_id: "",
    type: "TEXT" as Customization["type"],
    name: "",
    description: "",
    isRequired: false,
    price: 0,
    customization_data: {},
  });

  useEffect(() => {
    fetchItems();
    fetchCustomizations();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  /**
   * PRINCÍPIO ANTI-LOOP: Handler estável com comparação por conteúdo
   */
  const handleCustomizationDataChange = useCallback(
    (newData: Record<string, unknown> | CustomizationData) => {
      const newStr = JSON.stringify(newData);
      const currentStr = JSON.stringify(formData.customization_data);

      if (newStr !== currentStr) {
        setFormData((prev) => ({
          ...prev,
          customization_data: newData as Record<string, unknown>,
        }));
      }
    },
    [formData.customization_data]
  );

  /**
   * Conversão type-safe para cada tipo de customização
   */
  const handleBaseLayoutChange = useCallback(
    (data: BaseLayoutData) => {
      handleCustomizationDataChange(data as unknown as Record<string, unknown>);
    },
    [handleCustomizationDataChange]
  );

  const handleTextChange = useCallback(
    (data: TextCustomizationData) => {
      handleCustomizationDataChange(data as unknown as Record<string, unknown>);
    },
    [handleCustomizationDataChange]
  );

  const handleImageChange = useCallback(
    (data: ImageCustomizationData) => {
      handleCustomizationDataChange(data as unknown as Record<string, unknown>);
    },
    [handleCustomizationDataChange]
  );

  const handleMultipleChoiceChange = useCallback(
    (data: MultipleChoiceData) => {
      handleCustomizationDataChange(data as unknown as Record<string, unknown>);
    },
    [handleCustomizationDataChange]
  );

  /**
   * Memoizar customization_data para evitar criar nova referência
   */
  const memoizedCustomizationData = useMemo(
    () => formData.customization_data,
    [formData.customization_data]
  );

  const handleFilterByItem = (itemId: string) => {
    const actualItemId = itemId === "all" ? "" : itemId;
    setSelectedItem(actualItemId);
    fetchCustomizations(actualItemId || undefined);
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      BASE_LAYOUT: "bg-purple-500",
      TEXT: "bg-blue-500",
      IMAGES: "bg-green-500",
      MULTIPLE_CHOICE: "bg-yellow-500",
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-500"}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        {items.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            title={item.name}
                          >
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
                        setFormData({ ...formData, type: value })
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
                        <SelectItem value="BASE_LAYOUT">Layout 3D</SelectItem>
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
                            price: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.isRequired}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isRequired: checked })
                        }
                      />
                      <Label>Obrigatório</Label>
                    </div>
                  </div>

                  {/* Formulário específico por tipo de customização */}
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm mb-2">
                        Configurações Específicas - {formData.type}
                      </h4>
                    </div>

                    {formData.type === "BASE_LAYOUT" && (
                      <BaseLayoutCustomizationForm
                        data={memoizedCustomizationData as BaseLayoutData}
                        itemId={formData.item_id}
                        onChange={handleBaseLayoutChange}
                      />
                    )}

                    {formData.type === "TEXT" && (
                      <TextCustomizationForm
                        data={
                          memoizedCustomizationData as TextCustomizationData
                        }
                        onChange={handleTextChange}
                      />
                    )}

                    {formData.type === "IMAGES" && (
                      <ImageCustomizationForm
                        data={
                          memoizedCustomizationData as ImageCustomizationData
                        }
                        onChange={handleImageChange}
                      />
                    )}

                    {formData.type === "MULTIPLE_CHOICE" && (
                      <MultipleChoiceCustomizationForm
                        data={memoizedCustomizationData as MultipleChoiceData}
                        onChange={handleMultipleChoiceChange}
                      />
                    )}

                    {!formData.item_id && formData.type === "BASE_LAYOUT" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                        ⚠️ <strong>Atenção:</strong> Selecione um item primeiro
                        para configurar layouts.
                      </div>
                    )}
                  </div>

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
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhuma customização encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  customizations.map((customization) => (
                    <TableRow key={customization.id}>
                      <TableCell className="font-medium">
                        {customization.name}
                      </TableCell>
                      <TableCell>{getTypeBadge(customization.type)}</TableCell>
                      <TableCell>R$ {customization.price.toFixed(2)}</TableCell>
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
    </div>
  );
}
