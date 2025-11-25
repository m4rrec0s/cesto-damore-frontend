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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Upload,
  X,
  Wand2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import CustomizationManager from "./CustomizationManager";
import { Pagination } from "@/app/components/ui/pagination";
import { getInternalImageUrl } from "@/lib/image-helper";

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
  customizations?: Customization[];
}

interface Customization {
  id: string;
  name: string;
  description?: string;
  type: "BASE_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  price: number;
  isRequired: boolean;
  customization_data: Record<string, unknown>;
}

interface Additional {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

export function ItemsTab() {
  const api = useApi();
  const [items, setItems] = useState<Item[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;
  const [showModal, setShowModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
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
      const data = await api.getItems({
        page: currentPage,
        perPage,
        search: searchTerm || undefined,
      });
      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, searchTerm]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      setImagePreview(item.image_url || "");
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        stock_quantity: 0,
        base_price: 0,
        allows_customization: false,
        additional_id: "",
      });
      setImagePreview("");
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemFormData = new FormData();
      itemFormData.append("name", formData.name);
      itemFormData.append("description", formData.description);
      itemFormData.append("stock_quantity", formData.stock_quantity.toString());
      itemFormData.append("base_price", formData.base_price.toString());
      itemFormData.append(
        "allows_customization",
        formData.allows_customization.toString()
      );
      if (formData.additional_id) {
        itemFormData.append("additional_id", formData.additional_id);
      }

      if (imageFile) {
        itemFormData.append("image", imageFile);
      }

      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, itemFormData);
        toast.success("Item atualizado com sucesso!");
      } else {
        await api.post("/items", itemFormData);
        toast.success("Item criado com sucesso!");
      }

      await loadItems();
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar item:", error);
      toast.error("Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    setLoading(true);
    try {
      await api.delete(`/items/${id}`);
      toast.success("Item excluído com sucesso!");
      await loadItems();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomizationModal = async (item: Item) => {
    setSelectedItem(item);
    setShowCustomizationModal(true);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Componentes (Itens)
          </CardTitle>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border flex-1 flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Preço Base</TableHead>
                  <TableHead className="text-center">Customizável</TableHead>
                  <TableHead className="text-center">Adicional</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  !loading &&
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image_url ? (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden">
                            <Image
                              src={getInternalImageUrl(item.image_url)}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
                            <Layers className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.stock_quantity > 10
                              ? "default"
                              : item.stock_quantity > 0
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {item.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        R$ {item.base_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.allows_customization ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                            <Check className="w-3 h-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.additional ? (
                          <Badge variant="secondary">
                            {item.additional.name}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.allows_customization && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCustomizationModal(item)}
                              title="Configurar Customizações"
                            >
                              <Wand2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Modal de Criação/Edição de Item */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {editingItem ? "Editar Item" : "Novo Item"}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
                      <Label htmlFor="additional_id">
                        Adicional Relacionado
                      </Label>
                      <select
                        id="additional_id"
                        value={formData.additional_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            additional_id: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        aria-label="Selecionar adicional relacionado"
                      >
                        <option value="">Nenhum</option>
                        {additionals.map((add) => (
                          <option key={add.id} value={add.id}>
                            {add.name} - R$ {add.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Estoque *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stock_quantity: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base_price">Preço Base *</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            base_price: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allows_customization"
                      checked={formData.allows_customization}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          allows_customization: checked as boolean,
                        })
                      }
                    />
                    <Label
                      htmlFor="allows_customization"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Permite Customização
                    </Label>
                  </div>

                  {formData.allows_customization && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-800">
                        💡 Após salvar, você poderá configurar os tipos de
                        customização disponíveis para este item.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="image">Imagem</Label>
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="image"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Escolher Imagem
                      </label>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      {imagePreview && (
                        <div className="relative w-20 h-20 rounded-md overflow-hidden">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Item"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Customização */}
        {showCustomizationModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Wand2 className="w-6 h-6" />
                    Customizações: {selectedItem.name}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomizationModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <CustomizationManager
                  itemId={selectedItem.id}
                  itemName={selectedItem.name}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
