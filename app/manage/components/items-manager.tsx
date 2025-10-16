"use client";

import { useState, useCallback, useEffect } from "react";
import { useApi } from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plus, Search, Edit2, Trash2, Package, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Item {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
  base_price: number;
  image_url?: string;
  allows_customization: boolean;
  additional_id?: string;
  additional?: {
    id: string;
    name: string;
    image_url?: string;
  };
  customizations?: Array<{
    id: string;
    name: string;
    type: string;
    price: number;
  }>;
  components?: Array<{
    product_id: string;
    quantity: number;
  }>;
}

interface Additional {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface ItemsManagerProps {
  onUpdate?: () => void;
}

export function ItemsManager({ onUpdate }: ItemsManagerProps) {
  const api = useApi();
  const [items, setItems] = useState<Item[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stock_quantity: 0,
    base_price: 0,
    allows_customization: false,
    additional_id: "",
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/items");
      setItems(data);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadAdditionals = useCallback(async () => {
    try {
      const data = await api.getAdditionals();
      setAdditionals(data);
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error);
    }
  }, [api]);

  useEffect(() => {
    loadItems();
    loadAdditionals();
  }, [loadItems, loadAdditionals]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 5MB");
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/upload/image", formData);
      return response.url || response.image_url;
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      throw new Error("Falha no upload da imagem");
    }
  };

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        stock_quantity: item.stock_quantity,
        base_price: item.base_price,
        allows_customization: item.allows_customization,
        additional_id: item.additional_id || "",
      });

      if (item.image_url) {
        setImagePreview(item.image_url);
      }
    } else {
      setEditingItem(null);
      setImageFile(null);
      setImagePreview("");
      setFormData({
        name: "",
        description: "",
        stock_quantity: 0,
        base_price: 0,
        allows_customization: false,
        additional_id: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview("");
    setFormData({
      name: "",
      description: "",
      stock_quantity: 0,
      base_price: 0,
      allows_customization: false,
      additional_id: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.base_price < 0) {
      toast.error("Preço deve ser positivo");
      return;
    }

    if (formData.stock_quantity < 0) {
      toast.error("Estoque deve ser positivo");
      return;
    }

    setLoading(true);
    try {
      // Upload da imagem primeiro, se houver uma nova
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        toast.info("Fazendo upload da imagem...");
        imageUrl = await uploadImage(imageFile);
      } else if (imagePreview && editingItem?.image_url) {
        // Manter imagem antiga se estiver editando
        imageUrl = editingItem.image_url;
      }

      const payload = {
        ...formData,
        image_url: imageUrl,
        additional_id: formData.additional_id || undefined,
      };

      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, payload);
        toast.success("Item atualizado com sucesso");
      } else {
        await api.post("/items", payload);
        toast.success("Item criado com sucesso");
      }

      handleCloseModal();
      loadItems();
      onUpdate?.();
    } catch (error: unknown) {
      console.error("Erro ao salvar item:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Erro ao salvar item";
      toast.error(errorMessage || "Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja deletar este item?")) return;

    setLoading(true);
    try {
      await api.delete(`/items/${itemId}`);
      toast.success("Item deletado com sucesso");
      loadItems();
      onUpdate?.();
    } catch (error: unknown) {
      console.error("Erro ao deletar item:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Erro ao deletar item";
      toast.error(errorMessage || "Erro ao deletar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      R$ {item.base_price.toFixed(2)}
                    </Badge>
                    <Badge
                      variant={
                        item.stock_quantity > 0 ? "default" : "destructive"
                      }
                      className="text-xs"
                    >
                      Estoque: {item.stock_quantity}
                    </Badge>
                    {item.allows_customization && (
                      <Badge variant="outline" className="text-xs">
                        Customizável
                      </Badge>
                    )}
                  </div>

                  {item.additional && (
                    <p className="text-xs text-blue-600 mt-1">
                      Adicional: {item.additional.name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenModal(item)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum item encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingItem ? "Editar Item" : "Novo Item"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_price">Preço Base *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.base_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          base_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock_quantity">Estoque *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="image">Imagem do Item</Label>
                  <div className="mt-2 space-y-3">
                    {imagePreview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-contain"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">
                              Clique para fazer upload
                            </span>{" "}
                            ou arraste a imagem
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, WEBP (MAX. 5MB)
                          </p>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="additional_id">Adicional (Opcional)</Label>
                  <select
                    id="additional_id"
                    title="Selecione um adicional"
                    value={formData.additional_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additional_id: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Nenhum</option>
                    {additionals.map((add) => (
                      <option key={add.id} value={add.id}>
                        {add.name} (R$ {add.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allows_customization"
                    title="Permite customização"
                    checked={formData.allows_customization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allows_customization: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Label
                    htmlFor="allows_customization"
                    className="cursor-pointer"
                  >
                    Permite customização
                  </Label>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
