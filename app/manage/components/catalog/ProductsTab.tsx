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
import { Plus, Search, Edit2, Trash2, Package, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Textarea } from "@/app/components/ui/textarea";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

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
  const [searchTerm, setSearchTerm] = useState("");
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
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, typesData, itemsData] =
        await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTypes(),
          api.getItems(),
        ]);
      setProducts(productsData.products);
      setCategories(categoriesData);
      setTypes(typesData);
      setItems(itemsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        discount: product.discount || 0,
        type_id: product.type_id,
        categories: product.categories.map((c) => c.id),
      });
      setImagePreview(product.image_url || "");

      // Carregar componentes do produto
      try {
        const componentsData = await api.get(
          `/products/${product.id}/components`
        );

        // A API retorna um objeto com { product_id, components: [], total_components }
        // Precisamos extrair apenas o array de components
        const componentsArray = componentsData?.components || [];

        setComponents(componentsArray);
        setOriginalComponents(componentsArray); // Salvar estado original
      } catch (error) {
        console.error("Erro ao carregar componentes:", error);
        setComponents([]);
        setOriginalComponents([]);
      }

      // Carregar adicionais do produto
      try {
        const additionalsData = await api.getAdditionalsByProduct(product.id);

        // Mapear para o formato esperado pelo formulário
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
        setOriginalAdditionals(additionalsArray); // Salvar estado original
      } catch (error) {
        console.error("Erro ao carregar adicionais:", error);
        setAdditionals([]);
        setOriginalAdditionals([]);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        discount: 0,
        type_id: "",
        categories: [],
      });
      setImagePreview("");
      setComponents([]);
      setAdditionals([]);
      setOriginalComponents([]);
      setOriginalAdditionals([]);
    }
    setShowModal(true);
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
    // Garantir que components é sempre um array
    const currentComponents = Array.isArray(components) ? components : [];
    setComponents([...currentComponents, { item_id: "", quantity: 1 }]);
  };

  const handleRemoveComponent = (index: number) => {
    // Garantir que components é sempre um array
    const currentComponents = Array.isArray(components) ? components : [];
    setComponents(currentComponents.filter((_, i) => i !== index));
  };

  const handleComponentChange = (
    index: number,
    field: "item_id" | "quantity",
    value: string | number
  ) => {
    // Garantir que components é sempre um array
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
    // Garantir que additionals é sempre um array
    const currentAdditionals = Array.isArray(additionals) ? additionals : [];
    setAdditionals([...currentAdditionals, { item_id: "", custom_price: 0 }]);
  };

  const handleRemoveAdditional = (index: number) => {
    // Garantir que additionals é sempre um array
    const currentAdditionals = Array.isArray(additionals) ? additionals : [];
    setAdditionals(currentAdditionals.filter((_, i) => i !== index));
  };

  const handleAdditionalChange = (
    index: number,
    field: "item_id" | "custom_price",
    value: string | number
  ) => {
    // Garantir que additionals é sempre um array
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

  // Funções para filtrar itens disponíveis e evitar duplicatas
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

      // Sincronizar componentes (adicionar, atualizar e remover)
      if (editingProduct) {
        const validComponents = Array.isArray(components) ? components : [];
        const originalComponentsArray = Array.isArray(originalComponents)
          ? originalComponents
          : [];

        // 1. Identificar componentes removidos
        const removedComponents = originalComponentsArray.filter(
          (original) =>
            !validComponents.some((current) => current.id === original.id)
        );

        // 2. Remover componentes deletados
        for (const removed of removedComponents) {
          if (removed.id) {
            try {
              await api.removeProductComponent(removed.id);
              console.log(`✅ Componente ${removed.id} removido`);
            } catch (error) {
              console.error(
                `❌ Erro ao remover componente ${removed.id}:`,
                error
              );
            }
          }
        }

        // 3. Adicionar novos componentes e atualizar existentes
        const componentsToProcess = validComponents.filter(
          (component) =>
            component.item_id &&
            component.item_id !== "" &&
            component.quantity > 0
        );

        for (const component of componentsToProcess) {
          try {
            if (component.id) {
              // Atualizar componente existente
              await api.updateProductComponent(component.id, {
                quantity: component.quantity,
              });
              console.log(`✅ Componente ${component.id} atualizado`);
            } else {
              // Adicionar novo componente
              await api.addProductComponent(productId, {
                item_id: component.item_id,
                quantity: component.quantity,
              });
              console.log(
                `✅ Novo componente adicionado: ${component.item_id}`
              );
            }
          } catch (error) {
            console.error(`❌ Erro ao processar componente:`, error);
          }
        }
      } else {
        // Produto novo - apenas adicionar componentes
        const validComponents = Array.isArray(components) ? components : [];
        const componentsToSave = validComponents.filter(
          (component) =>
            component.item_id &&
            component.item_id !== "" &&
            component.quantity > 0
        );

        for (const component of componentsToSave) {
          try {
            await api.addProductComponent(productId, {
              item_id: component.item_id,
              quantity: component.quantity,
            });
            console.log(`✅ Componente adicionado: ${component.item_id}`);
          } catch (error) {
            console.error(`❌ Erro ao adicionar componente:`, error);
          }
        }
      }

      // Sincronizar adicionais (adicionar e remover)
      if (editingProduct) {
        const validAdditionals = Array.isArray(additionals) ? additionals : [];
        const originalAdditionalsArray = Array.isArray(originalAdditionals)
          ? originalAdditionals
          : [];

        // 1. Identificar adicionais removidos
        const removedAdditionals = originalAdditionalsArray.filter(
          (original) =>
            !validAdditionals.some(
              (current) => current.item_id === original.item_id
            )
        );

        // 2. Remover adicionais deletados
        for (const removed of removedAdditionals) {
          try {
            await api.unlinkAdditionalFromProduct(removed.item_id, productId);
            console.log(`✅ Adicional ${removed.item_id} desvinculado`);
          } catch (error) {
            console.error(
              `❌ Erro ao desvincular adicional ${removed.item_id}:`,
              error
            );
          }
        }

        // 3. Adicionar novos adicionais (re-link sempre para atualizar custom_price)
        const additionalsToProcess = validAdditionals.filter(
          (additional) =>
            additional.item_id &&
            additional.item_id !== "" &&
            additional.custom_price >= 0
        );

        for (const additional of additionalsToProcess) {
          try {
            await api.linkAdditionalToProduct(
              additional.item_id,
              productId,
              additional.custom_price
            );
            console.log(
              `✅ Adicional ${additional.item_id} vinculado/atualizado com preço ${additional.custom_price}`
            );
          } catch (error) {
            console.error(
              `❌ Erro ao vincular adicional ${additional.item_id}:`,
              error
            );
          }
        }
      } else {
        // Produto novo - apenas adicionar adicionais
        const validAdditionals = Array.isArray(additionals) ? additionals : [];
        const additionalsToSave = validAdditionals.filter(
          (additional) =>
            additional.item_id &&
            additional.item_id !== "" &&
            additional.custom_price >= 0
        );

        for (const additional of additionalsToSave) {
          try {
            await api.linkAdditionalToProduct(
              additional.item_id,
              productId,
              additional.custom_price
            );
            console.log(
              `✅ Adicional adicionado: ${additional.item_id} com preço ${additional.custom_price}`
            );
          } catch (error) {
            console.error(`❌ Erro ao adicionar adicional:`, error);
          }
        }
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
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
      <CardContent>
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Imagem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categorias</TableHead>
                <TableHead className="text-center">Preço</TableHead>
                <TableHead className="text-center">Desconto</TableHead>
                <TableHead className="text-center">Componentes</TableHead>
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

              {!loading && filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500"
                  >
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <div className="relative w-12 h-12 rounded-md overflow-hidden">
                          <Image
                            src={product.image_url}
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
                        {types.find((t) => t.id === product.type_id)?.name ||
                          "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.categories.map((cat) => (
                          <Badge
                            key={cat.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cat.name}
                          </Badge>
                        ))}
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
                      <span className="text-gray-400">-</span>
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
              )}
            </TableBody>
          </Table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {editingProduct ? "Editar Produto" : "Novo Produto"}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                      <Label htmlFor="type_id">Tipo *</Label>
                      <select
                        id="type_id"
                        value={formData.type_id}
                        onChange={(e) =>
                          setFormData({ ...formData, type_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                        aria-label="Selecionar tipo de produto"
                      >
                        <option value="">Selecione um tipo</option>
                        {types.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
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
                      <Label htmlFor="price">Preço *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Visualização do Preço Final */}
                  {formData.price > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">
                            Visualização do Preço
                          </p>
                          <div className="flex items-center gap-3">
                            {formData.discount > 0 ? (
                              <>
                                <span className="text-lg text-gray-500 line-through">
                                  R$ {formData.price.toFixed(2)}
                                </span>
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  -{formData.discount}%
                                </Badge>
                                <span className="text-2xl font-bold text-green-600">
                                  R${" "}
                                  {(
                                    formData.price -
                                    (formData.price * formData.discount) / 100
                                  ).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-2xl font-bold text-gray-900">
                                R$ {formData.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {formData.discount > 0 && (
                            <p className="text-xs text-green-700 mt-1">
                              Economia de R${" "}
                              {(
                                (formData.price * formData.discount) /
                                100
                              ).toFixed(2)}
                            </p>
                          )}
                        </div>
                        {formData.discount > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Preço Final</p>
                            <p className="text-3xl font-bold text-green-600">
                              R${" "}
                              {(
                                formData.price -
                                (formData.price * formData.discount) / 100
                              ).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Categorias</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={
                            formData.categories.includes(cat.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => handleCategoryToggle(cat.id)}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

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

                  <div className="space-y-4 border-t pt-4 mt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <Label className="text-lg font-semibold">
                          Componentes do Produto
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Defina quais itens são necessários para produzir este
                          produto. O estoque do produto será calculado
                          automaticamente.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddComponent}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>

                    {components.length > 0 ? (
                      <div className="space-y-3">
                        {components.map((component, index) => {
                          const availableItems =
                            getAvailableComponentItems(index);
                          const selectedItem = items.find(
                            (item) => item.id === component.item_id
                          );

                          return (
                            <div
                              key={index}
                              className="flex gap-3 items-start p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              <div className="flex-1 space-y-2">
                                <Label className="text-sm font-medium">
                                  Item Componente *
                                </Label>
                                <select
                                  value={component.item_id}
                                  onChange={(e) =>
                                    handleComponentChange(
                                      index,
                                      "item_id",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full px-3 py-2 border rounded-md ${
                                    !component.item_id
                                      ? "border-rose-300 bg-rose-50"
                                      : "border-gray-300"
                                  }`}
                                  aria-label="Selecionar item componente"
                                >
                                  <option value="">⚠️ Selecione um item</option>
                                  {component.item_id && selectedItem && (
                                    <option
                                      key={selectedItem.id}
                                      value={selectedItem.id}
                                    >
                                      {selectedItem.name} • R${" "}
                                      {selectedItem.base_price.toFixed(2)} •
                                      Estoque: {selectedItem.stock_quantity}
                                    </option>
                                  )}
                                  {availableItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} • R${" "}
                                      {item.base_price.toFixed(2)} • Estoque:{" "}
                                      {item.stock_quantity}
                                    </option>
                                  ))}
                                </select>
                                {!component.item_id && (
                                  <p className="text-xs text-rose-600">
                                    Selecione um item antes de salvar
                                  </p>
                                )}
                              </div>

                              <div className="w-32 space-y-2">
                                <Label className="text-sm font-medium">
                                  Qtd. Necessária *
                                </Label>
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
                                  className="text-center font-semibold"
                                />
                              </div>

                              <div className="pt-7">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveComponent(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm text-blue-800">
                            💡 <strong>Dica:</strong> O estoque do produto será
                            calculado automaticamente com base na
                            disponibilidade dos componentes.
                            {components.length > 0 &&
                              !components.every((c) => c.item_id) && (
                                <span className="block mt-1 text-rose-700 font-medium">
                                  ⚠️ Selecione um item para cada componente
                                  antes de salvar.
                                </span>
                              )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-700 font-medium">
                          Nenhum componente adicionado
                        </p>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          Adicione itens que compõem este produto
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddComponent}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Primeiro Item
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Seção de Adicionais */}
                  <div className="space-y-4 border-t pt-4 mt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <Label className="text-lg font-semibold">
                          Adicionais do Produto
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Defina itens opcionais que podem ser adicionados ao
                          produto com preços personalizados diferentes do valor
                          base.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddAdditional}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Adicional
                      </Button>
                    </div>

                    {additionals.length > 0 ? (
                      <div className="space-y-3">
                        {additionals.map((additional, index) => {
                          const availableItems =
                            getAvailableAdditionalItems(index);
                          const selectedItem = items.find(
                            (item) => item.id === additional.item_id
                          );

                          return (
                            <div
                              key={index}
                              className="flex gap-3 items-start p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              <div className="flex-1 space-y-2">
                                <Label className="text-sm font-medium">
                                  Item Adicional *
                                </Label>
                                <select
                                  value={additional.item_id}
                                  onChange={(e) =>
                                    handleAdditionalChange(
                                      index,
                                      "item_id",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full px-3 py-2 border rounded-md ${
                                    !additional.item_id
                                      ? "border-rose-300 bg-rose-50"
                                      : "border-gray-300"
                                  }`}
                                  aria-label="Selecionar item adicional"
                                >
                                  <option value="">⚠️ Selecione um item</option>
                                  {additional.item_id && selectedItem && (
                                    <option
                                      key={selectedItem.id}
                                      value={selectedItem.id}
                                    >
                                      {selectedItem.name} • Preço Base: R${" "}
                                      {selectedItem.base_price.toFixed(2)}
                                    </option>
                                  )}
                                  {availableItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} • Preço Base: R${" "}
                                      {item.base_price.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                                {!additional.item_id && (
                                  <p className="text-xs text-rose-600">
                                    Selecione um item antes de salvar
                                  </p>
                                )}
                                {selectedItem &&
                                  additional.custom_price !==
                                    selectedItem.base_price && (
                                    <p className="text-xs text-blue-600">
                                      💡 Preço customizado: R${" "}
                                      {additional.custom_price.toFixed(2)}{" "}
                                      (Base: R${" "}
                                      {selectedItem.base_price.toFixed(2)})
                                    </p>
                                  )}
                              </div>

                              <div className="w-40 space-y-2">
                                <Label className="text-sm font-medium">
                                  Preço Personalizado *
                                </Label>
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
                                  className="text-center font-semibold"
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="pt-7">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAdditional(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm text-blue-800">
                            💡 <strong>Dica:</strong> O preço personalizado
                            permite que você cobre um valor diferente do preço
                            base do item quando ele for vendido como adicional
                            deste produto.
                            {additionals.length > 0 &&
                              !additionals.every((a) => a.item_id) && (
                                <span className="block mt-1 text-rose-700 font-medium">
                                  ⚠️ Selecione um item para cada adicional antes
                                  de salvar.
                                </span>
                              )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-700 font-medium">
                          Nenhum adicional configurado
                        </p>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          Adicione itens opcionais com preços personalizados
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAdditional}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Primeiro Adicional
                        </Button>
                      </div>
                    )}
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
                      {loading ? "Salvando..." : "Salvar Produto"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
