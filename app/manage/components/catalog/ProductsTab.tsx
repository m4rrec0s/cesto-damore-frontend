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
  Package,
  Upload,
  X,
  DollarSign,
  Tag,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Textarea } from "@/app/components/ui/textarea";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { Pagination } from "@/app/components/ui/pagination";
import { getInternalImageUrl } from "@/lib/image-helper";

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

interface ProductAdditional {
  id?: string;
  item_id: string;
  custom_price: number;
  item?: Item;
}

export function ProductsTab() {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productionMode, setProductionMode] = useState<"immediate" | "custom">(
    "immediate"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [additionals, setAdditionals] = useState<ProductAdditional[]>([]);
  const [originalComponents, setOriginalComponents] = useState<
    ProductComponent[]
  >([]);
  const [originalAdditionals, setOriginalAdditionals] = useState<
    ProductAdditional[]
  >([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    type_id: "",
    categories: [] as string[],
    production_time: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, typesData, itemsData] =
        await Promise.all([
          api.getProducts({
            page: currentPage,
            perPage,
            search: searchTerm || undefined,
          }),
          api.getCategories(),
          api.getTypes(),
          api.getItems(),
        ]);
      setProducts(productsData.products);
      setTotalPages(productsData.pagination.totalPages);
      setTotal(productsData.pagination.total);
      setCategories(categoriesData);
      setTypes(typesData);
      setItems(itemsData.items);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleOpenModal = async (product?: Product) => {
    try {
      if (product) {
        setShowModal(true);
        setLoadingProduct(true);
        setEditingProduct(product);
        setFormData({
          name: product.name,
          description: product.description || "",
          price: product.price,
          discount: product.discount || 0,
          type_id: product.type_id,
          categories: product.categories.map((c) => c.id),
          production_time: product.production_time || 0,
        });
        setImagePreview(product.image_url || "");

        // Set production mode based on time
        setProductionMode(
          (product.production_time || 0) <= 1 ? "immediate" : "custom"
        );

        // Carregar componentes do produto
        try {
          const componentsData = await api.get(
            `/products/${product.id}/components`
          );

          const componentsArray = componentsData?.components || [];

          setComponents(componentsArray);
          setOriginalComponents(componentsArray);
        } catch (error) {
          console.error("Erro ao carregar componentes:", error);
          setComponents([]);
          setOriginalComponents([]);
        }
        setLoadingProduct(false);

        try {
          const additionalsData = await api.getAdditionalsByProduct(product.id);

          const additionalsArray = (
            additionalsData as Array<{
              id: string;
              name: string;
              price: number;
              stock_quantity?: number;
              image_url?: string;
            }>
          ).map((additional) => ({
            item_id: additional.id,
            custom_price: additional.price,
            item: {
              id: additional.id,
              name: additional.name,
              stock_quantity: additional.stock_quantity || 0,
              base_price: additional.price,
              image_url: additional.image_url,
            },
          }));

          setAdditionals(additionalsArray);
          setOriginalAdditionals(additionalsArray);
        } catch (error) {
          console.error("Erro ao carregar adicionais:", error);
          setAdditionals([]);
          setOriginalAdditionals([]);
        }
      } else {
        setShowModal(true);
        setLoadingProduct(true);
        setEditingProduct(null);
        setFormData({
          name: "",
          description: "",
          price: 0,
          discount: 0,
          type_id: "",
          categories: [],
          production_time: 1, // Default to 1 hour (immediate)
        });
        setProductionMode("immediate");
        setImagePreview("");
        setComponents([]);
        setAdditionals([]);
        setOriginalComponents([]);
        setOriginalAdditionals([]);
      }
    } catch (error) {
      console.error("Erro ao abrir modal do produto:", error);
      toast.error("Erro ao abrir modal do produto");
      setLoadingProduct(false);
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
    setComponents([]);
    setAdditionals([]);
    setOriginalComponents([]);
    setOriginalAdditionals([]);
  };

  const handleAddComponent = () => {
    const currentComponents = Array.isArray(components) ? components : [];
    setComponents([...currentComponents, { item_id: "", quantity: 1 }]);
  };

  const handleRemoveComponent = (index: number) => {
    const currentComponents = Array.isArray(components) ? components : [];
    setComponents(currentComponents.filter((_, i) => i !== index));
  };

  const handleComponentChange = (
    index: number,
    field: "item_id" | "quantity",
    value: string | number
  ) => {
    const currentComponents = Array.isArray(components) ? components : [];
    const updated = [...currentComponents];

    if (field === "item_id") {
      updated[index].item_id = value as string;
      const item = items.find((i) => i.id === value);
      if (item) {
        updated[index].item = item;
      }
    } else {
      updated[index].quantity = Number(value);
    }
    setComponents(updated);
  };

  const handleAddAdditional = () => {
    const currentAdditionals = Array.isArray(additionals) ? additionals : [];
    setAdditionals([...currentAdditionals, { item_id: "", custom_price: 0 }]);
  };

  const handleRemoveAdditional = (index: number) => {
    const currentAdditionals = Array.isArray(additionals) ? additionals : [];
    setAdditionals(currentAdditionals.filter((_, i) => i !== index));
  };

  const handleAdditionalChange = (
    index: number,
    field: "item_id" | "custom_price",
    value: string | number
  ) => {
    const currentAdditionals = Array.isArray(additionals) ? additionals : [];
    const updated = [...currentAdditionals];

    if (field === "item_id") {
      updated[index].item_id = value as string;
      const item = items.find((i) => i.id === value);
      if (item) {
        updated[index].item = item;
      }
    } else {
      updated[index].custom_price = Number(value);
    }
    setAdditionals(updated);
  };

  const getAvailableComponentItems = (currentIndex: number) => {
    const selectedIds = components
      .map((c, idx) => (idx !== currentIndex ? c.item_id : null))
      .filter((id): id is string => id !== null && id !== "");
    return items.filter((item) => !selectedIds.includes(item.id));
  };

  const getAvailableAdditionalItems = (currentIndex: number) => {
    const selectedIds = additionals
      .map((a, idx) => (idx !== currentIndex ? a.item_id : null))
      .filter((id): id is string => id !== null && id !== "");
    return items.filter((item) => !selectedIds.includes(item.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productFormData = new FormData();
      productFormData.append("name", formData.name);
      productFormData.append("description", formData.description);
      productFormData.append("price", formData.price.toString());
      productFormData.append("discount", formData.discount.toString());
      productFormData.append("type_id", formData.type_id);
      productFormData.append("categories", JSON.stringify(formData.categories));

      if (imageFile) {
        productFormData.append("image", imageFile);
      }

      // Fix: Add production_time to FormData
      if (formData.production_time !== undefined) {
        productFormData.append(
          "production_time",
          formData.production_time.toString()
        );
      }

      let productId: string;

      if (editingProduct) {
        const updated = await api.put(
          `/products/${editingProduct.id}`,
          productFormData
        );
        productId = updated.id;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const created = await api.post("/products", productFormData);
        productId = created.id;
        toast.success("Produto criado com sucesso!");
      }

      if (editingProduct) {
        const validComponents = Array.isArray(components) ? components : [];
        const originalComponentsArray = Array.isArray(originalComponents)
          ? originalComponents
          : [];

        const removedComponents = originalComponentsArray.filter(
          (original) =>
            !validComponents.some((current) => current.id === original.id)
        );

        // 2. Remover componentes deletados
        await Promise.all(
          removedComponents.map(async (removed) => {
            if (removed.id) {
              try {
                await api.removeProductComponent(removed.id);
              } catch (error) {
                console.error(
                  `❌ Erro ao remover componente ${removed.id}:`,
                  error
                );
              }
            }
          })
        );

        // 3. Adicionar novos componentes e atualizar existentes
        const componentsToProcess = validComponents.filter(
          (component) =>
            component.item_id &&
            component.item_id !== "" &&
            component.quantity > 0
        );

        await Promise.all(
          componentsToProcess.map(async (component) => {
            try {
              if (component.id) {
                // Atualizar componente existente
                await api.updateProductComponent(component.id, {
                  quantity: component.quantity,
                });
              } else {
                // Adicionar novo componente
                await api.addProductComponent(productId, {
                  item_id: component.item_id,
                  quantity: component.quantity,
                });
              }
            } catch (error) {
              console.error(`❌ Erro ao processar componente:`, error);
            }
          })
        );
      } else {
        // Produto novo - apenas adicionar componentes
        const validComponents = Array.isArray(components) ? components : [];
        const componentsToSave = validComponents.filter(
          (component) =>
            component.item_id &&
            component.item_id !== "" &&
            component.quantity > 0
        );

        await Promise.all(
          componentsToSave.map(async (component) => {
            try {
              await api.addProductComponent(productId, {
                item_id: component.item_id,
                quantity: component.quantity,
              });
            } catch (error) {
              console.error(`❌ Erro ao adicionar componente:`, error);
            }
          })
        );
      }

      if (editingProduct) {
        const validAdditionals = Array.isArray(additionals) ? additionals : [];
        const originalAdditionalsArray = Array.isArray(originalAdditionals)
          ? originalAdditionals
          : [];

        const removedAdditionals = originalAdditionalsArray.filter(
          (original) =>
            !validAdditionals.some(
              (current) => current.item_id === original.item_id
            )
        );

        // 2. Remover adicionais deletados
        await Promise.all(
          removedAdditionals.map(async (removed) => {
            try {
              await api.unlinkAdditionalFromProduct(removed.item_id, productId);
            } catch (error) {
              console.error(
                `❌ Erro ao desvincular adicional ${removed.item_id}:`,
                error
              );
            }
          })
        );

        // 3. Adicionar novos adicionais (re-link sempre para atualizar custom_price)
        const additionalsToProcess = validAdditionals.filter(
          (additional) =>
            additional.item_id &&
            additional.item_id !== "" &&
            additional.custom_price >= 0
        );

        await Promise.all(
          additionalsToProcess.map(async (additional) => {
            try {
              await api.linkAdditionalToProduct(
                additional.item_id,
                productId,
                additional.custom_price
              );
            } catch (error) {
              console.error(
                `❌ Erro ao vincular adicional ${additional.item_id}:`,
                error
              );
            }
          })
        );
      } else {
        // Produto novo - apenas adicionar adicionais
        const validAdditionals = Array.isArray(additionals) ? additionals : [];
        const additionalsToSave = validAdditionals.filter(
          (additional) =>
            additional.item_id &&
            additional.item_id !== "" &&
            additional.custom_price >= 0
        );

        await Promise.all(
          additionalsToSave.map(async (additional) => {
            try {
              await api.linkAdditionalToProduct(
                additional.item_id,
                productId,
                additional.custom_price
              );
            } catch (error) {
              console.error(`❌ Erro ao adicionar adicional:`, error);
            }
          })
        );
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as unknown as { response: { data: { error: string } } })
              .response?.data?.error
          : "Erro ao salvar produto";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    setLoading(true);
    try {
      await api.deleteProduct(id);
      toast.success("Produto excluído com sucesso!");
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as unknown as { response: { data: { error: string } } })
              .response?.data?.error
          : "Erro ao excluir produto";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produtos
          </CardTitle>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar produtos..."
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categorias</TableHead>
                  <TableHead className="text-center">Preço</TableHead>
                  <TableHead className="text-center">Desconto</TableHead>
                  <TableHead className="text-center">
                    Tempo de produção
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && products.length > 0
                  ? products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.image_url ? (
                            <div className="relative w-12 h-12 rounded-md overflow-hidden">
                              <Image
                                src={getInternalImageUrl(product.image_url)}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {types.find((t) => t.id === product.type_id)
                              ?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.categories.length > 0 ? (
                              product.categories.map((cat) => (
                                <Badge
                                  key={cat.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {cat.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">
                                Sem categoria
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="font-semibold text-center">
                            {product.price &&
                            product.discount &&
                            product.discount > 0 ? (
                              <>
                                <del className="text-gray-500">
                                  R$ {product.price.toFixed(2)}
                                </del>
                                <br />
                                <span className="text-green-600 font-bold">
                                  R${" "}
                                  {(
                                    product.price -
                                    (product.price * product.discount) / 100
                                  ).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              `R$ ${product.price.toFixed(2)}`
                            )}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {product.discount && product.discount > 0 ? (
                            <Badge variant="destructive">
                              -{product.discount}%
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.production_time &&
                          product.production_time > 1 ? (
                            <Badge variant="secondary">
                              {product.production_time} horas
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500 text-white">
                              Produção
                              <br />
                              imediata
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenModal(product)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500"
                        >
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
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

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {loadingProduct ? (
                <div className="min-h-[90vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Header Fixo */}
                  <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </h2>
                    <Button
                      onClick={handleCloseModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Conteúdo com Scroll */}
                  <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
                    {/* Informações Básicas */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </Label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo *
                        </Label>
                        <select
                          title="Tipo de Produto"
                          value={formData.type_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              type_id: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                          required
                        >
                          <option value="">Selecione</option>
                          {types.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                      />
                    </div>

                    {/* Preço e Desconto */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          Preço *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          <Tag className="w-4 h-4 inline mr-1" />
                          Desconto (%)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.discount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>

                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Produção
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => {
                              setProductionMode("immediate");
                              setFormData({ ...formData, production_time: 1 });
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              productionMode === "immediate"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Imediato
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setProductionMode("custom");
                              if (formData.production_time <= 1) {
                                setFormData({
                                  ...formData,
                                  production_time: 2,
                                });
                              }
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              productionMode === "custom"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Custom
                          </Button>
                        </div>
                        {productionMode === "custom" && (
                          <Input
                            type="number"
                            min="2"
                            value={formData.production_time}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                production_time: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            placeholder="Horas"
                          />
                        )}
                      </div>
                    </div>

                    {formData.price > 0 && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Preço Final
                            </p>
                            <div className="flex items-center gap-2">
                              {formData.discount > 0 && (
                                <span className="text-sm text-gray-500 line-through">
                                  R$ {formData.price.toFixed(2)}
                                </span>
                              )}
                              <span className="text-2xl font-bold text-green-600">
                                R${" "}
                                {(
                                  formData.price -
                                  (formData.price * formData.discount) / 100
                                ).toFixed(2)}
                              </span>
                              {formData.discount > 0 && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                  -{formData.discount}%
                                </span>
                              )}
                            </div>
                          </div>
                          {formData.discount > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Economia</p>
                              <p className="text-lg font-bold text-green-600">
                                R${" "}
                                {(
                                  (formData.price * formData.discount) /
                                  100
                                ).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Categorias */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Categorias
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              formData.categories.includes(cat.id)
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Imagem */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Imagem
                      </Label>
                      <div className="flex items-center gap-4">
                        <Label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm">
                          <Upload className="w-4 h-4" />
                          Escolher
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </Label>
                        {imagePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </div>

                    {/* Componentes */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Componentes
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Itens necessários para produção
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddComponent}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </button>
                      </div>

                      {components.length > 0 ? (
                        <div className="space-y-2">
                          {components.map((component, index) => {
                            const availableItems =
                              getAvailableComponentItems(index);
                            const selectedItem = items.find(
                              (item) => item.id === component.item_id
                            );

                            return (
                              <div
                                key={index}
                                className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex-1">
                                  <select
                                    title="Item do Componente"
                                    value={component.item_id}
                                    onChange={(e) =>
                                      handleComponentChange(
                                        index,
                                        "item_id",
                                        e.target.value
                                      )
                                    }
                                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition ${
                                      !component.item_id
                                        ? "border-red-300 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    <option value="">Selecione um item</option>
                                    {component.item_id && selectedItem && (
                                      <option value={selectedItem.id}>
                                        {selectedItem.name} • R${" "}
                                        {selectedItem.base_price.toFixed(2)}
                                      </option>
                                    )}
                                    {availableItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name} • R${" "}
                                        {item.base_price.toFixed(2)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <Input
                                  type="number"
                                  min="1"
                                  value={component.quantity}
                                  onChange={(e) =>
                                    handleComponentChange(
                                      index,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-3 py-2 text-sm text-center font-semibold border border-gray-300 rounded-lg outline-none"
                                />
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveComponent(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Package className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Nenhum componente
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Adicionais */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Adicionais
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Itens opcionais com preços customizados
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddAdditional}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </Button>
                      </div>

                      {additionals.length > 0 ? (
                        <div className="space-y-2">
                          {additionals.map((additional, index) => {
                            const availableItems =
                              getAvailableAdditionalItems(index);
                            const selectedItem = items.find(
                              (item) => item.id === additional.item_id
                            );

                            return (
                              <div
                                key={index}
                                className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex-1">
                                  <select
                                    title="Item do Adicional"
                                    value={additional.item_id}
                                    onChange={(e) =>
                                      handleAdditionalChange(
                                        index,
                                        "item_id",
                                        e.target.value
                                      )
                                    }
                                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition ${
                                      !additional.item_id
                                        ? "border-red-300 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    <option value="">Selecione um item</option>
                                    {additional.item_id && selectedItem && (
                                      <option value={selectedItem.id}>
                                        {selectedItem.name} • Base: R${" "}
                                        {selectedItem.base_price.toFixed(2)}
                                      </option>
                                    )}
                                    {availableItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name} • Base: R${" "}
                                        {item.base_price.toFixed(2)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={additional.custom_price}
                                  onChange={(e) =>
                                    handleAdditionalChange(
                                      index,
                                      "custom_price",
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-3 py-2 text-sm text-center font-semibold border border-gray-300 rounded-lg outline-none"
                                  placeholder="0.00"
                                />
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveAdditional(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Package className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Nenhum adicional
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Fixo */}
                  <div className="bg-white border-t px-6 py-4 flex justify-end gap-3">
                    <Button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
