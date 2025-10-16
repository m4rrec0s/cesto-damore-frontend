"use client";

import { useState, useCallback, useEffect } from "react";
import { useApi } from "@/app/hooks/use-api";
import type {
  Product,
  Category,
  Type as ProductType,
} from "@/app/hooks/use-api";
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
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  X,
  AlertCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Item {
  id: string;
  name: string;
  stock_quantity: number;
  base_price: number;
  image_url?: string;
}

interface ProductComponent {
  id?: string;
  item_id: string;
  quantity: number;
  item?: Item;
}

interface IntegratedProductManagerProps {
  onUpdate?: () => void;
}

export function IntegratedProductManager({
  onUpdate,
}: IntegratedProductManagerProps) {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    categories: [] as string[],
    type_id: "",
    components: [] as ProductComponent[],
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getProducts();
      setProducts(response.products);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  }, [api]);

  const loadTypes = useCallback(async () => {
    try {
      const data = await api.getTypes();
      setTypes(data);
    } catch (error) {
      console.error("Erro ao carregar tipos:", error);
    }
  }, [api]);

  const loadItems = useCallback(async () => {
    try {
      const data = await api.get("/items");
      setItems(data);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    }
  }, [api]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 5MB");
      return;
    }

    setImageFile(file);

    // Criar preview
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

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadTypes();
    loadItems();
  }, [loadProducts, loadCategories, loadTypes, loadItems]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = async (product?: Product) => {
    if (product) {
      setEditingProduct(product);

      // Carregar componentes do produto
      let components: ProductComponent[] = [];
      try {
        const response = await api.get(`/products/${product.id}/components`);
        components = response.components || [];
      } catch (error) {
        console.error("Erro ao carregar componentes:", error);
      }

      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        discount: product.discount || 0,
        categories:
          product.categories?.map((c: { id: string; name: string }) => c.id) ||
          [],
        type_id: product.type_id,
        components,
      });

      // Set image preview if exists
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
    } else {
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview("");
      setFormData({
        name: "",
        description: "",
        price: 0,
        discount: 0,
        categories: [],
        type_id: "",
        components: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedItemId("");
    setItemQuantity(1);
    setImageFile(null);
    setImagePreview("");
    setFormData({
      name: "",
      description: "",
      price: 0,
      discount: 0,
      categories: [],
      type_id: "",
      components: [],
    });
  };

  const handleAddComponent = () => {
    // Verificar se há itens disponíveis
    if (items.length === 0) {
      toast.error(
        "Nenhum item disponível. Crie itens primeiro na aba 'Itens'."
      );
      return;
    }

    if (!selectedItemId) {
      toast.error("Selecione um item");
      return;
    }

    if (itemQuantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    const itemExists = formData.components.some(
      (c) => c.item_id === selectedItemId
    );

    if (itemExists) {
      toast.error("Este item já foi adicionado");
      return;
    }

    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    setFormData({
      ...formData,
      components: [
        ...formData.components,
        {
          item_id: selectedItemId,
          quantity: itemQuantity,
          item,
        },
      ],
    });

    setSelectedItemId("");
    setItemQuantity(1);
  };

  const handleRemoveComponent = (itemId: string) => {
    setFormData({
      ...formData,
      components: formData.components.filter((c) => c.item_id !== itemId),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }

    if (formData.categories.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }

    if (!formData.type_id) {
      toast.error("Selecione um tipo");
      return;
    }

    setLoading(true);
    try {
      // Upload da imagem primeiro, se houver uma nova
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        toast.info("Fazendo upload da imagem...");
        imageUrl = await uploadImage(imageFile);
      } else if (imagePreview && editingProduct?.image_url) {
        // Manter imagem antiga se estiver editando
        imageUrl = editingProduct.image_url;
      }

      const productPayload = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        discount: formData.discount,
        categories: formData.categories,
        type_id: formData.type_id,
        image_url: imageUrl,
      };

      let productId: string;

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, productPayload);
        productId = editingProduct.id;
        toast.success("Produto atualizado com sucesso");
      } else {
        const newProduct = await api.post("/products", productPayload);
        productId = newProduct.id;
        toast.success("Produto criado com sucesso");
      }

      // Atualizar componentes
      if (editingProduct) {
        // Remover componentes antigos
        const existingComponents = await api.get(
          `/products/${productId}/components`
        );

        for (const component of existingComponents.components || []) {
          if (component.id) {
            await api.delete(`/components/${component.id}`);
          }
        }
      }

      // Adicionar novos componentes
      for (const component of formData.components) {
        await api.post(`/products/${productId}/components`, {
          item_id: component.item_id,
          quantity: component.quantity,
        });
      }

      handleCloseModal();
      loadProducts();
      onUpdate?.();
    } catch (error: unknown) {
      console.error("Erro ao salvar produto:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Erro ao salvar produto";
      toast.error(errorMessage || "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;

    setLoading(true);
    try {
      await api.delete(`/products/${productId}`);
      toast.success("Produto deletado com sucesso");
      loadProducts();
      onUpdate?.();
    } catch (error: unknown) {
      console.error("Erro ao deletar produto:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Erro ao deletar produto";
      toast.error(errorMessage || "Erro ao deletar produto");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.includes(categoryId)
        ? formData.categories.filter((id) => id !== categoryId)
        : [...formData.categories, categoryId],
    });
  };

  const getTypeName = (typeId: string) => {
    return types.find((t) => t.id === typeId)?.name || "N/A";
  };

  const getCategoryNames = (product: Product) => {
    return (
      product.categories
        ?.map((c: { id: string; name: string }) => c.name)
        .join(", ") || "N/A"
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      R$ {product.price.toFixed(2)}
                    </Badge>
                    {product.discount && product.discount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        -{product.discount}%
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                    <p>Tipo: {getTypeName(product.type_id)}</p>
                    <p className="truncate">Cat: {getCategoryNames(product)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenModal(product)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(product.id)}
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

      {filteredProducts.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Informações Básicas</h3>

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
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Preço *</Label>
                      <Input
                        id="price"
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
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image">Imagem do Produto</Label>
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
                    <Label htmlFor="type_id">Tipo *</Label>
                    <select
                      id="type_id"
                      title="Selecione um tipo"
                      value={formData.type_id}
                      onChange={(e) =>
                        setFormData({ ...formData, type_id: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    >
                      <option value="">Selecione um tipo</option>
                      {types.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Categorias *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categories.map((category) => (
                        <Badge
                          key={category.id}
                          variant={
                            formData.categories.includes(category.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                    {formData.categories.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Selecione pelo menos uma categoria
                      </p>
                    )}
                  </div>
                </div>

                {/* Componentes do Produto */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      Componentes (Itens)
                    </h3>
                    {items.length === 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-orange-600"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Crie itens primeiro
                      </Badge>
                    )}
                  </div>

                  {items.length > 0 ? (
                    <>
                      <div className="flex gap-2">
                        <select
                          title="Selecione um item"
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Selecione um item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Est: {item.stock_quantity})
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) =>
                            setItemQuantity(parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                          placeholder="Qtd"
                        />
                        <Button
                          type="button"
                          onClick={handleAddComponent}
                          size="sm"
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="font-medium text-amber-900">
                        Nenhum item disponível
                      </p>
                      <p className="text-xs mt-1 text-amber-700">
                        Vá para a aba &quot;Itens&quot; e crie itens antes de
                        adicionar componentes
                      </p>
                    </div>
                  )}

                  {/* Lista de Componentes */}
                  {formData.components.length > 0 ? (
                    <div className="space-y-2">
                      {formData.components.map((component) => (
                        <div
                          key={component.item_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {component.item?.image_url && (
                              <Image
                                src={component.item.image_url}
                                alt={component.item.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {component.item?.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                Quantidade: {component.quantity} | Estoque:{" "}
                                {component.item?.stock_quantity}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRemoveComponent(component.item_id)
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum componente adicionado</p>
                      <p className="text-xs mt-1">
                        Adicione itens que compõem este produto
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Produto"}
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
