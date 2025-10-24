"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, Eye, Layout } from "lucide-react";
import { toast } from "sonner";
import VisualSlotEditor from "./visual-slot-editor";
import type {
  LayoutBase,
  SlotDef,
  CreateLayoutBaseInput,
} from "../../types/personalization";
import Image from "next/image";
import {
  getDirectImageUrl,
  getImageDimensions,
} from "@/app/helpers/drive-normalize";

interface LayoutBaseManagerProps {
  layouts: LayoutBase[];
  onLayoutSelect: (layout: LayoutBase) => void;
  updateLayout: (
    id: string,
    data: CreateLayoutBaseInput,
    imageFile?: File
  ) => Promise<void>;
  createLayout: (data: CreateLayoutBaseInput, imageFile: File) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;
  loadLayouts: () => Promise<void>;
  loading: boolean;
}

export default function LayoutBaseManager({
  layouts,
  updateLayout,
  createLayout,
  deleteLayout,
  loadLayouts,
  loading,
}: LayoutBaseManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutBase | null>(null);

  const [formData, setFormData] = useState<CreateLayoutBaseInput>({
    name: "",
    item_type: "",
    width: 1000,
    height: 1000,
    slots: [],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editorTab, setEditorTab] = useState<"visual" | "manual">("visual");

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const dimensions = await getImageDimensions(file);
        setFormData((prev) => ({
          ...prev,
          width: dimensions.width,
          height: dimensions.height,
        }));
        console.log(
          `📐 Dimensões da imagem: ${dimensions.width}x${dimensions.height}px`
        );
      } catch (error) {
        console.error("❌ Erro ao obter dimensões da imagem:", error);
        toast.error("Não foi possível obter as dimensões da imagem");
        setFormData((prev) => ({
          ...prev,
          width: 1000,
          height: 1000,
        }));
      }
    }
  };

  const handleSlotsChange = (newSlots: SlotDef[]) => {
    setFormData({
      ...formData,
      slots: newSlots,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.item_type) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!editingLayout && !imageFile) {
      toast.error("Selecione uma imagem");
      return;
    }

    try {
      if (editingLayout) {
        await updateLayout(editingLayout.id, formData, imageFile || undefined);
        toast.success("Layout atualizado com sucesso!");
      } else {
        if (!imageFile) {
          toast.error("Imagem é obrigatória");
          return;
        }
        await createLayout(formData, imageFile);
        toast.success("Layout criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadLayouts();
    } catch (error) {
      console.error("Erro ao salvar layout:", error);
      const message =
        error instanceof Error ? error.message : "Erro ao salvar layout";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este layout?")) return;

    try {
      await deleteLayout(id);
      toast.success("Layout deletado com sucesso!");
      loadLayouts();
    } catch (error) {
      console.error("Erro ao deletar layout:", error);
      const message =
        error instanceof Error ? error.message : "Erro ao deletar layout";
      toast.error(message);
    }
  };

  const handleEdit = (layout: LayoutBase) => {
    setEditingLayout(layout);
    setFormData({
      name: layout.name,
      item_type: layout.item_type,
      width: layout.width,
      height: layout.height,
      slots: layout.slots,
    });
    // Normalizar possíveis URLs do Google Drive para download direto
    setImagePreview(getDirectImageUrl(layout.image_url));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLayout(null);
    setFormData({
      name: "",
      item_type: "",
      width: 1000,
      height: 1000,
      slots: [],
    });
    setImageFile(null);
    setImagePreview("");
    setEditorTab("visual");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciar Layouts Base</span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Layout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLayout ? "Editar Layout" : "Novo Layout"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Layout *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Ex: Caneca Branca Padrão"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nome descritivo para identificar o layout
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="item-type-select">Tipo de Item *</Label>
                      <select
                        id="item-type-select"
                        title="Selecione o tipo de item"
                        value={formData.item_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            item_type: e.target.value,
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="CANECA">🍵 Caneca</option>
                        <option value="QUADRO">🖼️ Quadro</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escolha entre caneca ou quadro
                      </p>
                    </div>
                  </div>

                  {/* Upload da Imagem */}
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Imagem Base *</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      required={!editingLayout}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPEG, PNG, WebP • Tamanho máximo: 5MB
                    </p>
                    {imagePreview && (
                      <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                        <div className="flex gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-contain border rounded bg-white"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">
                              Preview da Imagem
                            </p>
                            <p className="text-xs text-muted-foreground">
                              📐 Dimensões: {formData.width} × {formData.height}
                              px
                            </p>
                            <p className="text-xs text-muted-foreground">
                              📊 Proporção:{" "}
                              {(formData.width / formData.height).toFixed(2)}:1
                            </p>
                            {imageFile && (
                              <p className="text-xs text-muted-foreground">
                                💾 Tamanho: {(imageFile.size / 1024).toFixed(2)}{" "}
                                KB
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Editor de Slots */}
                  {imagePreview && (
                    <div className="border-t pt-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold mb-1">
                          Áreas de Personalização (Slots)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formData.slots.length === 0
                            ? "⚠️ Nenhum slot configurado - este layout não permitirá personalização"
                            : `✅ ${formData.slots.length} slot(s) configurado(s)`}
                        </p>
                      </div>
                      <Tabs
                        value={editorTab}
                        onValueChange={(v) =>
                          setEditorTab(v as "visual" | "manual")
                        }
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="visual">
                            <Eye className="mr-2 h-4 w-4" />
                            Editor Visual
                          </TabsTrigger>
                          <TabsTrigger value="manual">
                            <Layout className="mr-2 h-4 w-4" />
                            Editor Manual
                          </TabsTrigger>
                        </TabsList>

                        {/* Editor Visual com Drag & Drop */}
                        <TabsContent value="visual" className="mt-4">
                          <VisualSlotEditor
                            imageUrl={imagePreview}
                            imageWidth={formData.width}
                            imageHeight={formData.height}
                            slots={formData.slots}
                            onSlotsChange={handleSlotsChange}
                          />
                        </TabsContent>

                        {/* Editor Manual (fallback) */}
                        <TabsContent value="manual" className="mt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">
                                Slots Configurados ({formData.slots.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {formData.slots.length === 0 ? (
                                <div className="text-center py-8">
                                  <Layout className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                  <p className="text-sm font-medium text-muted-foreground">
                                    Nenhum slot adicionado
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Use o <strong>Editor Visual</strong> para
                                    criar slots de personalização
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                                    💡 <strong>Dica:</strong> Layouts sem slots
                                    não permitirão personalização e funcionarão
                                    apenas como imagens fixas.
                                  </p>
                                </div>
                              ) : (
                                formData.slots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className="flex items-center justify-between p-3 border rounded text-sm hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium">{slot.id}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Posição: {slot.x.toFixed(1)}%,{" "}
                                        {slot.y.toFixed(1)}% • Tamanho:{" "}
                                        {slot.width.toFixed(1)}% ×{" "}
                                        {slot.height.toFixed(1)}%
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          slots: formData.slots.filter(
                                            (s) => s.id !== slot.id
                                          ),
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingLayout ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : layouts.length === 0 ? (
            <div className="text-center py-12">
              <Layout className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum layout criado
              </h3>
              <p className="text-muted-foreground mt-2">
                Crie seu primeiro layout base para personalização
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dimensões</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layouts.map((layout) => (
                  <TableRow key={layout.id}>
                    <TableCell>
                      <Image
                        src={getDirectImageUrl(layout.image_url)}
                        alt={layout.name}
                        className="w-[100px] h-[70px] object-cover rounded-md border-2 border-muted"
                        crossOrigin="anonymous"
                        width={100}
                        height={70}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{layout.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {layout.id.substring(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          layout.item_type === "CANECA"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {layout.item_type === "CANECA" ? "🍵" : "🖼️"}{" "}
                        {layout.item_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="space-y-1">
                        <p>
                          {layout.width}×{layout.height}px
                        </p>
                        <p className="text-xs">
                          {(layout.width / layout.height).toFixed(2)}:1
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {layout.slots.length === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ⚠️ Sem slots
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ✨ {layout.slots.length} slot
                          {layout.slots.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(layout)}
                          title="Editar layout"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(layout.id)}
                          title="Deletar layout"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
