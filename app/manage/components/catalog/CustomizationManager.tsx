"use client";

import { useState, useCallback, useMemo } from "react";
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
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Wand2,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

// Import hook centralizado
import {
  useCustomizationManager,
  type Customization,
  type BaseLayoutData,
  type TextCustomizationData,
  type ImageCustomizationData,
  type MultipleChoiceData,
} from "@/app/hooks/use-customization-manager";

// Import formulários de customização
import BaseLayoutCustomizationForm from "../customizations/BaseLayoutCustomizationForm";
import TextCustomizationForm from "../customizations/TextCustomizationForm";
import ImageCustomizationForm from "../customizations/ImageCustomizationForm";
import MultipleChoiceCustomizationForm from "../customizations/MultipleChoiceCustomizationForm";

interface CustomizationManagerProps {
  itemId: string;
  itemName?: string;
}

const CUSTOMIZATION_TYPES = [
  {
    value: "BASE_LAYOUT" as const,
    label: "Layout Base",
    description: "Cliente escolhe um layout pronto",
    icon: "🎨",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "TEXT" as const,
    label: "Texto Personalizável",
    description: "Cliente modifica textos",
    icon: "✏️",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "IMAGES" as const,
    label: "Upload de Imagens",
    description: "Cliente anexa imagens",
    icon: "🖼️",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "MULTIPLE_CHOICE" as const,
    label: "Múltipla Escolha",
    description: "Cliente escolhe entre opções",
    icon: "☑️",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
];

export default function CustomizationManager({
  itemId,
  itemName,
}: CustomizationManagerProps) {
  const {
    customizations,
    loading,
    error,
    createCustomization,
    updateCustomization,
    deleteCustomization,
  } = useCustomizationManager({ itemId });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomization, setEditingCustomization] =
    useState<Customization | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "TEXT" as Customization["type"],
    name: "",
    description: "",
    isRequired: false,
    price: 0,
    customization_data: {} as Record<string, unknown>,
  });

  /**
   * Handler para abrir modal de criação
   */
  const handleOpenCreateDialog = useCallback(() => {
    setEditingCustomization(null);
    setFormData({
      type: "TEXT",
      name: "",
      description: "",
      isRequired: false,
      price: 0,
      customization_data: {},
    });
    setIsDialogOpen(true);
  }, []);

  /**
   * Handler para abrir modal de edição
   */
  const handleOpenEditDialog = useCallback((customization: Customization) => {
    setEditingCustomization(customization);
    setFormData({
      type: customization.type,
      name: customization.name,
      description: customization.description || "",
      isRequired: customization.isRequired,
      price: customization.price,
      customization_data: customization.customization_data,
    });
    setIsDialogOpen(true);
  }, []);

  /**
   * Handler para fechar modal
   */
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingCustomization(null);
  }, []);

  /**
   * Handler para salvar customização
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (editingCustomization) {
        await updateCustomization(editingCustomization.id, {
          name: formData.name,
          description: formData.description,
          isRequired: formData.isRequired,
          price: formData.price,
          customization_data: formData.customization_data,
        });
      } else {
        await createCustomization(formData);
      }

      handleCloseDialog();
    },
    [
      editingCustomization,
      formData,
      createCustomization,
      updateCustomization,
      handleCloseDialog,
    ]
  );

  /**
   * PRINCÍPIO ANTI-LOOP: Handler estável com comparação por conteúdo
   */
  const handleCustomizationDataChange = useCallback(
    (newData: Record<string, unknown>) => {
      const newStr = JSON.stringify(newData);
      const currentStr = JSON.stringify(formData.customization_data);

      if (newStr !== currentStr) {
        setFormData((prev) => ({
          ...prev,
          customization_data: newData,
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

  /**
   * Obter badge de tipo
   */
  const getTypeInfo = useCallback((type: string) => {
    return (
      CUSTOMIZATION_TYPES.find((t) => t.value === type) ||
      CUSTOMIZATION_TYPES[0]
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-600" />
            Customizações
            {itemName && <span className="text-gray-500">- {itemName}</span>}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure as opções de personalização para este item
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Customização
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erro</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !customizations.length && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Empty State */}
      {!loading && customizations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Wand2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma customização configurada
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Adicione customizações para permitir que os clientes personalizem
            este item. Você pode configurar textos, imagens, layouts e opções de
            escolha.
          </p>
          <Button onClick={handleOpenCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Primeira Customização
          </Button>
        </div>
      )}

      {/* Customizations Grid */}
      {!loading && customizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customizations.map((customization) => {
            const typeInfo = getTypeInfo(customization.type);

            return (
              <div
                key={customization.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {customization.name}
                      </h4>
                      <Badge className={`${typeInfo.color} text-xs mt-1`}>
                        {typeInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDialog(customization)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomization(customization.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {customization.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {customization.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    {customization.isRequired ? (
                      <Badge variant="destructive" className="text-xs">
                        Obrigatório
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Opcional
                      </Badge>
                    )}
                  </div>
                  {customization.price > 0 && (
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <DollarSign className="w-4 h-4" />
                      <span>+R$ {customization.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              {editingCustomization
                ? "Editar Customização"
                : "Nova Customização"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campos Básicos */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-700">
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo */}
                <div className="space-y-2">
                  <Label>Tipo de Customização *</Label>
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
                      {CUSTOMIZATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.type && (
                    <p className="text-xs text-gray-600">
                      {getTypeInfo(formData.type).description}
                    </p>
                  )}
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Adicionar texto personalizado"
                    required
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva como o cliente utilizará esta customização..."
                  rows={2}
                />
              </div>

              {/* Opções */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preço */}
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

                {/* Obrigatório */}
                <div className="flex items-center space-x-2 pt-7">
                  <Switch
                    checked={formData.isRequired}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isRequired: checked })
                    }
                  />
                  <Label className="cursor-pointer">
                    Customização obrigatória
                  </Label>
                </div>
              </div>
            </div>

            {/* Configurações Específicas */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">
                Configurações Específicas - {getTypeInfo(formData.type).label}
              </h3>

              {formData.type === "BASE_LAYOUT" && (
                <BaseLayoutCustomizationForm
                  data={
                    (memoizedCustomizationData || {
                      layouts: [],
                    }) as unknown as BaseLayoutData
                  }
                  itemId={itemId}
                  onChange={handleBaseLayoutChange}
                />
              )}

              {formData.type === "TEXT" && (
                <TextCustomizationForm
                  data={
                    (memoizedCustomizationData || {
                      fields: [],
                    }) as unknown as TextCustomizationData
                  }
                  onChange={handleTextChange}
                />
              )}

              {formData.type === "IMAGES" && (
                <ImageCustomizationForm
                  data={
                    (memoizedCustomizationData || {
                      base_layout: { max_images: 5 },
                    }) as unknown as ImageCustomizationData
                  }
                  onChange={handleImageChange}
                />
              )}

              {formData.type === "MULTIPLE_CHOICE" && (
                <MultipleChoiceCustomizationForm
                  data={
                    (memoizedCustomizationData || {
                      options: [],
                      min_selection: 1,
                      max_selection: 1,
                    }) as unknown as MultipleChoiceData
                  }
                  onChange={handleMultipleChoiceChange}
                />
              )}

              {!itemId && formData.type === "BASE_LAYOUT" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Selecione um item primeiro para
                  configurar layouts.
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
