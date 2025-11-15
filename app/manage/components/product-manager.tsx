"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Product,
  ProductInput,
  Category,
  Type as ProductType,
  ProductsResponse,
  useApi,
  Additional,
  Item,
} from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { ImageUpload } from "../../components/ui/image-upload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";

interface ProductAdditionalLink {
  additional_id: string;
  additional_name: string;
  additional_price: number;
  custom_price?: number;
}

interface LinkedAdditionalResponse {
  additional_id: string;
  name: string;
  price: number;
  custom_price?: number;
}

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  types: ProductType[];
  onUpdate: () => void;
}

interface ProductForm {
  name: string;
  description: string;
  price: number;
  discount: number;
  categories: string[];
  type_id: string;
  image_url: string;
  imageFile?: File;
  linkedAdditionals: ProductAdditionalLink[];
}

export function ProductManager({
  products: initialProducts,
  categories,
  types,
  onUpdate,
}: ProductManagerProps) {
  const api = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsData, setProductsData] = useState<ProductsResponse>({
    products: initialProducts,
    pagination: {
      page: 1,
      totalPages: Math.ceil(initialProducts.length / 15),
      total: initialProducts.length,
      perPage: 15,
    },
  });
  const [availableAdditionals, setAvailableAdditionals] = useState<Item[]>([]);
  const [selectedAdditionalId, setSelectedAdditionalId] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [originalFormData, setOriginalFormData] = useState<ProductForm | null>(
    null
  );
  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    categories: [],
    type_id: "",
    image_url: "",
    imageFile: undefined,
    linkedAdditionals: [],
  });

  // Load products with pagination
  const loadProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const response = await api.getProducts({
          page,
          perPage: 15,
          search: searchTerm || undefined,
          category_id: selectedCategory || undefined,
          type_id: selectedType || undefined,
        });
        setProductsData(response);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedCategory, selectedType, api]
  );

  // Load products when filters change
  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  // Load available items (additionals/components)
  const loadAvailableAdditionals = useCallback(async () => {
    try {
      // Prefer the unified items endpoint when available
      const items = await api.getItems();
      setAvailableAdditionals(items.items || []);
    } catch (error) {
      console.error(
        "Erro ao carregar itens (fallback para adicionais):",
        error
      );
      // fallback to legacy additionals endpoint if needed
      try {
        const additionals = await api.getAdditionals();
        setAvailableAdditionals(
          (additionals || []).map((a: Additional) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            price: a.price,
            discount: a.discount,
            image_url: a.image_url,
            stock_quantity: a.stock_quantity,
            type: "ADDITIONAL",
          }))
        );
      } catch (err2) {
        console.error("Fallback também falhou:", err2);
      }
    }
  }, [api]);

  // Load additionals when modal opens
  useEffect(() => {
    if (showModal) {
      loadAvailableAdditionals();
    }
  }, [showModal, loadAvailableAdditionals]);

  const handlePageChange = (page: number) => {
    loadProducts(page);
  };

  const handleOpenModal = async (product?: Product) => {
    if (product) {
      setEditingProduct(product);

      let categoryIds: string[] = [];
      if (product.categories && product.categories.length > 0) {
        categoryIds = product.categories.map((category) => category.id);
      }

      const initialData = {
        name: product.name,
        description: product.description || "",
        price: product.price,
        discount: product.discount || 0,
        categories: categoryIds,
        type_id: product.type_id || "",
        image_url: product.image_url || "",
        imageFile: undefined,
        linkedAdditionals: [],
      };

      setFormData(initialData);

      setOriginalFormData({ ...initialData });

      try {
        const linkedAdditionals = await api.getAdditionalsByProduct(product.id);
        const formattedAdditionals: ProductAdditionalLink[] =
          linkedAdditionals.map((additional: LinkedAdditionalResponse) => ({
            additional_id: additional.additional_id,
            additional_name: additional.name,
            additional_price: additional.price,
            custom_price: additional.custom_price,
          }));

        const updatedData = {
          ...initialData,
          linkedAdditionals: formattedAdditionals,
        };

        setFormData(updatedData);
        setOriginalFormData(updatedData);
      } catch (error) {
        console.error("Erro ao carregar adicionais do produto:", error);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        discount: 0,
        categories: [],
        type_id: "",
        image_url: "",
        imageFile: undefined,
        linkedAdditionals: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setOriginalFormData(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      discount: 0,
      categories: [],
      type_id: "",
      image_url: "",
      imageFile: undefined,
      linkedAdditionals: [],
    });
  };

  const handleAddAdditional = () => {
    if (!selectedAdditionalId) return;

    const additional = availableAdditionals.find(
      (a) => a.id === selectedAdditionalId
    );
    if (!additional) return;

    const customPriceValue = customPrice ? parseFloat(customPrice) : undefined;

    const newLink: ProductAdditionalLink = {
      additional_id: additional.id,
      additional_name: additional.name,
      // Items may expose base_price or price depending on backend shape
      additional_price:
        (additional as Item).base_price ??
        (additional as { price?: number }).price ??
        0,
      custom_price: customPriceValue,
    };

    setFormData((prev) => ({
      ...prev,
      linkedAdditionals: [...prev.linkedAdditionals, newLink],
    }));

    setSelectedAdditionalId("");
    setCustomPrice("");
  };

  const handleRemoveAdditional = (additionalId: string) => {
    setFormData((prev) => ({
      ...prev,
      linkedAdditionals: prev.linkedAdditionals.filter(
        (a) => a.additional_id !== additionalId
      ),
    }));
  };

  // Helper function to get only changed fields
  const getChangedFields = (original: ProductForm, current: ProductForm) => {
    const changes: Partial<ProductForm> = {};

    // Compare basic fields
    if (original.name !== current.name) changes.name = current.name;
    if (original.description !== current.description)
      changes.description = current.description;
    if (original.price !== current.price) changes.price = current.price;
    if (original.discount !== current.discount)
      changes.discount = current.discount;

    // Compare category arrays
    const categoriesChanged =
      original.categories.length !== current.categories.length ||
      original.categories.some((id) => !current.categories.includes(id)) ||
      current.categories.some((id) => !original.categories.includes(id));

    if (categoriesChanged) changes.categories = current.categories;
    if (original.type_id !== current.type_id) changes.type_id = current.type_id;
    if (original.image_url !== current.image_url)
      changes.image_url = current.image_url;

    return changes;
  };

  // Helper function to check if linked additionals changed
  const additionalsChanged = (
    original: ProductAdditionalLink[],
    current: ProductAdditionalLink[]
  ) => {
    // Handle undefined or null arrays
    const safeOriginal = original || [];
    const safeCurrent = current || [];

    if (safeOriginal.length !== safeCurrent.length) return true;

    // Filter out any invalid entries and sort by additional_id
    const sortedOriginal = [...safeOriginal]
      .filter((a) => a && a.additional_id)
      .sort((a, b) => a.additional_id.localeCompare(b.additional_id));

    const sortedCurrent = [...safeCurrent]
      .filter((a) => a && a.additional_id)
      .sort((a, b) => a.additional_id.localeCompare(b.additional_id));

    // If lengths differ after filtering, there were changes
    if (sortedOriginal.length !== sortedCurrent.length) return true;

    return sortedOriginal.some((orig, index) => {
      const curr = sortedCurrent[index];
      return (
        orig.additional_id !== curr.additional_id ||
        orig.custom_price !== curr.custom_price
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation logging
    console.log("📝 Validação - formData completo:", formData);
    console.log("📝 Validação - categorias:", formData.categories);
    console.log(
      "📝 Validação - length das categorias:",
      formData.categories.length
    );
    console.log(
      "📝 Validação - tipo das categorias:",
      typeof formData.categories
    );
    console.log("📝 Validação - é array?", Array.isArray(formData.categories));

    // Validate categories
    if (formData.categories.length === 0) {
      alert("Selecione pelo menos uma categoria para o produto.");
      return;
    }

    setLoading(true);

    try {
      const { imageFile, linkedAdditionals, ...productData } = formData;

      console.log("🔄 Extração de dados:");
      console.log("  formData original:", formData);
      console.log("  productData após destructuring:", productData);
      console.log("  imageFile:", imageFile);

      let product: Product;
      if (editingProduct && originalFormData) {
        // For updates, only send changed fields
        const changedFields = getChangedFields(originalFormData, formData);

        console.log("🔄 Campos alterados:", changedFields);
        console.log("📸 Nova imagem:", imageFile ? imageFile.name : "Nenhuma");

        // Ensure numeric fields are properly typed for changed fields only
        const normalizedChanges: Partial<ProductInput> = {};
        if ("price" in changedFields)
          normalizedChanges.price = Number(changedFields.price);
        if ("discount" in changedFields) {
          normalizedChanges.discount = changedFields.discount
            ? Number(changedFields.discount)
            : undefined;
        }
        if ("name" in changedFields)
          normalizedChanges.name = changedFields.name;
        if ("description" in changedFields)
          normalizedChanges.description = changedFields.description;
        if (Array.isArray(changedFields.categories))
          normalizedChanges.categories = changedFields.categories as string[];
        if ("type_id" in changedFields)
          normalizedChanges.type_id = changedFields.type_id;
        if ("image_url" in changedFields)
          normalizedChanges.image_url = changedFields.image_url;

        // Only update if there are actual changes or if there's a new image
        if (Object.keys(normalizedChanges).length > 0 || imageFile) {
          console.log(
            "✅ Enviando atualização com os dados:",
            normalizedChanges
          );
          product = await api.updateProduct(
            editingProduct.id,
            normalizedChanges,
            imageFile
          );
        } else {
          console.log("⚠️ Nenhuma alteração detectada no produto");
          // No changes to product data, just use existing product
          product = editingProduct;
        }
      } else {
        // For creation, send all fields
        const normalizedProductData = {
          ...productData,
          price: Number(productData.price),
          discount: productData.discount
            ? Number(productData.discount)
            : undefined,
          categories: Array.isArray(productData.categories)
            ? productData.categories
            : [],
        };

        console.log(
          "🚀 Dados que serão enviados para criação:",
          normalizedProductData
        );
        console.log(
          "📦 Categorias selecionadas:",
          normalizedProductData.categories
        );
        console.log("📸 Enviando com imagem:", !!imageFile);

        product = await api.createProduct(normalizedProductData, imageFile);
      }

      // Handle additional links - only if there are changes
      if (editingProduct && originalFormData) {
        const hasAdditionalChanges = additionalsChanged(
          originalFormData.linkedAdditionals,
          linkedAdditionals
        );

        console.log("🔗 Adicionais alterados:", hasAdditionalChanges);

        if (hasAdditionalChanges) {
          console.log(
            "📋 Adicionais originais:",
            originalFormData.linkedAdditionals
          );
          console.log("📋 Novos adicionais:", linkedAdditionals);

          // Get current linked additionals
          const currentAdditionals = await api.getAdditionalsByProduct(
            editingProduct.id
          );
          const currentIds = currentAdditionals.map(
            (a: LinkedAdditionalResponse) => a.additional_id
          );
          const newIds = linkedAdditionals.map((a) => a.additional_id);

          // Remove additionals that are no longer linked
          const toRemove = currentIds.filter(
            (id: string) => !newIds.includes(id)
          );
          for (const additionalId of toRemove) {
            await api.unlinkAdditionalFromProduct(
              additionalId,
              editingProduct.id
            );
          }

          // Add new additionals or update existing ones
          for (const link of linkedAdditionals) {
            const existing = currentAdditionals.find(
              (a: LinkedAdditionalResponse) =>
                a.additional_id === link.additional_id
            );
            if (existing) {
              // Update if custom price changed
              if (existing.custom_price !== link.custom_price) {
                await api.linkAdditionalToProduct(
                  link.additional_id,
                  editingProduct.id
                );
                // Note: Backend might need an update method for custom price
              }
            } else {
              await api.linkAdditionalToProduct(
                link.additional_id,
                editingProduct.id
              );
            }
          }
        }
      } else if (!editingProduct) {
        // For new products, link additionals after creation
        for (const link of linkedAdditionals) {
          await api.linkAdditionalToProduct(link.additional_id, product.id);
        }
      }

      handleCloseModal();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    setLoading(true);
    try {
      await api.deleteProduct(productId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFinalPrice = (price: number, discount: number = 0) => {
    return price * (1 - discount / 100);
  };

  const getDiscountAmount = (price: number, discount: number = 0) => {
    return price * (discount / 100);
  };

  const getCategoryNames = (product: Product) => {
    let categoryIds: string[] = [];
    if (product.categories && product.categories.length > 0) {
      categoryIds = product.categories.map((category) => category.id);
    }
    if (categoryIds.length === 0) return ["Sem categoria"];

    return categoryIds.map(
      (id) =>
        categories.find((c) => c.id === id)?.name || "Categoria desconhecida"
    );
  };

  const getTypeName = (typeId: string) => {
    return types.find((t) => t.id === typeId)?.name || "Sem tipo";
  };

  const getAvailableAdditionals = () => {
    const linkedIds = formData.linkedAdditionals.map((a) => a.additional_id);
    return availableAdditionals.filter((a) => !linkedIds.includes(a.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedCategory}
            title={
              selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name
                : "Todas as categorias"
            }
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            title={
              selectedType
                ? types.find((t) => t.id === selectedType)?.name
                : "Todos os tipos"
            }
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Todos os tipos</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => handleOpenModal()}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {productsData.products.length} de {productsData.pagination.total}{" "}
            produtos
          </span>
        </div>{" "}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Preço Final</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsData.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {product.description || "Sem descrição"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {getCategoryNames(product).map((categoryName, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                      >
                        {categoryName}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                    {getTypeName(product.type_id || "")}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {product.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {product.discount ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                      {product.discount}%
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  {getFinalPrice(
                    product.price,
                    product.discount
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(product)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {productsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Mostrando{" "}
            {(productsData.pagination.page - 1) *
              productsData.pagination.perPage +
              1}{" "}
            a{" "}
            {Math.min(
              productsData.pagination.page * productsData.pagination.perPage,
              productsData.pagination.total
            )}{" "}
            de {productsData.pagination.total} produtos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(productsData.pagination.page - 1)}
              disabled={productsData.pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-1">
              {Array.from(
                { length: productsData.pagination.totalPages },
                (_, i) => i + 1
              )
                .filter((page) => {
                  const distance = Math.abs(
                    page - productsData.pagination.page
                  );
                  return (
                    distance === 0 ||
                    distance === 1 ||
                    page === 1 ||
                    page === productsData.pagination.totalPages
                  );
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <Button
                      variant={
                        productsData.pagination.page === page
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={`h-8 w-8 p-0 ${
                        productsData.pagination.page === page
                          ? "bg-rose-500 hover:bg-rose-600"
                          : ""
                      }`}
                    >
                      {page}
                    </Button>
                  </div>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(productsData.pagination.page + 1)}
              disabled={
                productsData.pagination.page ===
                productsData.pagination.totalPages
              }
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {productsData.products.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Upload className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum produto encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory || selectedType
              ? "Tente ajustar os filtros de busca"
              : "Comece adicionando seu primeiro produto"}
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <p className="text-rose-100 text-sm mt-1">
                {editingProduct
                  ? "Atualize as informações do produto"
                  : "Preencha os dados para criar um novo produto"}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]"
            >
              {/* Seção Principal */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-rose-500 rounded-full mr-3"></div>
                  Informações Principais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nome do Produto *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="Digite o nome do produto"
                      aria-label="Nome do produto"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Categorias *
                    </label>
                    <div className="space-y-3">
                      {/* Categorias selecionadas */}
                      {formData.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
                          {formData.categories.map((categoryId) => {
                            const category = categories.find(
                              (c) => c.id === categoryId
                            );
                            return (
                              <span
                                key={categoryId}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium"
                              >
                                {category?.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      categories: prev.categories.filter(
                                        (id) => id !== categoryId
                                      ),
                                    }))
                                  }
                                  className="ml-1 text-rose-500 hover:text-rose-700"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Seletor de nova categoria */}
                      <select
                        value=""
                        onChange={(e) => {
                          const categoryId = e.target.value;
                          if (
                            categoryId &&
                            !formData.categories.includes(categoryId)
                          ) {
                            setFormData((prev) => ({
                              ...prev,
                              categories: [...prev.categories, categoryId],
                            }));
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                        aria-label="Adicionar categoria ao produto"
                      >
                        <option value="">Adicionar categoria...</option>
                        {categories
                          .filter(
                            (category) =>
                              !formData.categories.includes(category.id)
                          )
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>

                      {formData.categories.length === 0 && (
                        <p className="text-sm text-red-500">
                          Selecione pelo menos uma categoria
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.type_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type_id: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                      aria-label="Tipo do produto"
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
              </div>

              {/* Seção de Preços */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Preços e Descontos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preço Original (R$) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price === 0 ? "" : String(formData.price)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cleaned =
                          raw.startsWith("0") && !raw.startsWith("0.")
                            ? raw.replace(/^0+/, "")
                            : raw;
                        setFormData((prev) => ({
                          ...prev,
                          price: cleaned === "" ? 0 : parseFloat(cleaned),
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      aria-label="Preço do produto"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Desconto (%)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={
                        formData.discount === 0 ? "" : String(formData.discount)
                      }
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          discount: Math.min(100, Math.max(0, value)),
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      aria-label="Desconto do produto"
                    />
                    {formData.discount > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200 mt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Preço final:</span>
                          <span className="font-bold text-green-600">
                            {getFinalPrice(
                              formData.price,
                              formData.discount
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Economia:</span>
                          <span className="font-medium text-red-500">
                            -
                            {getDiscountAmount(
                              formData.price,
                              formData.discount
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção de Imagem */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Imagem do Produto
                </h3>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url, file) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: url,
                      imageFile: file,
                    }))
                  }
                  onRemove={() =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: "",
                      imageFile: undefined,
                    }))
                  }
                  className="w-full"
                />
              </div>

              {/* Seção de Adicionais */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                  Adicionais do Produto
                </h3>

                {/* Adicionar novo adicional */}
                <div className="bg-white rounded-lg p-4 border border-indigo-200 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Adicionar Adicional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs text-gray-600">
                        Adicional
                      </label>
                      <select
                        value={selectedAdditionalId}
                        onChange={(e) =>
                          setSelectedAdditionalId(e.target.value)
                        }
                        aria-label="Selecionar adicional"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecione um adicional</option>
                        {getAvailableAdditionals().map((additional) => (
                          <option key={additional.id} value={additional.id}>
                            {additional.name} - R${" "}
                            {((additional as Item).base_price ?? 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs text-gray-600">
                        Preço Customizado (Opcional)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Preço padrão"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddAdditional}
                        disabled={!selectedAdditionalId}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de adicionais linkados */}
                {formData.linkedAdditionals.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Adicionais Linkados
                    </h4>
                    {formData.linkedAdditionals.map((link, index) => (
                      <div
                        key={`${link.additional_id}-${index}`}
                        className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">
                              {link.additional_name}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>Preço padrão:</span>
                              <span className="font-medium text-green-600">
                                R$ {link.additional_price.toFixed(2)}
                              </span>
                              {link.custom_price && (
                                <>
                                  <span>|</span>
                                  <span>Customizado:</span>
                                  <span className="font-medium text-blue-600">
                                    R$ {link.custom_price.toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveAdditional(link.additional_id)
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.linkedAdditionals.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Nenhum adicional linkado</p>
                  </div>
                )}
              </div>

              {/* Seção de Descrição */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Descrição
                </h3>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Descreva o produto detalhadamente..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="flex-1 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </div>
                  ) : (
                    <>
                      {editingProduct ? "Atualizar Produto" : "Criar Produto"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
