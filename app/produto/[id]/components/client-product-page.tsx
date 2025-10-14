"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Minus,
  Plus,
  Check,
  UploadCloud,
  Trash2,
  AlertCircle,
  Images,
  FileText,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/lib/utils";
import useApi, { Additional, Product } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import {
  useCustomization,
  PhotoUploadData,
} from "@/app/hooks/use-customization";
import type { CartCustomization } from "@/app/hooks/use-cart";
import type {
  ProductRule,
  RuleAvailableOptions,
  SelectOption,
  LayoutPreset,
  LayoutWithPhotos,
  RuleType,
} from "@/app/types/customization";

interface RuleValue {
  rule_id: string;
  photos?: PhotoUploadData[];
  text?: string;
  selected_option?: string;
  selected_layout?: string;
  selected_item?: {
    original_item: string;
    selected_item: string;
    price_adjustment: number;
  };
}

import AdditionalCard from "./additional-card";
import Link from "next/link";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const serializeAdditionals = (additionals?: string[]) => {
  if (!additionals || additionals.length === 0) return "[]";
  return JSON.stringify([...additionals].sort());
};

const serializeAdditionalColors = (colors?: Record<string, string>) => {
  if (!colors) return "{}";
  const normalized = Object.entries(colors).sort(([idA], [idB]) =>
    idA.localeCompare(idB)
  );
  return JSON.stringify(normalized);
};

const serializeCustomizationsSignature = (
  customizations?: CartCustomization[]
) => {
  if (!customizations || customizations.length === 0) return "[]";

  const normalized = customizations.map((customization) => ({
    customization_id: customization.customization_id,
    price_adjustment: customization.price_adjustment || 0,
    text: customization.text?.trim() || null,
    selected_option: customization.selected_option || null,
    selected_item: customization.selected_item
      ? {
          original_item: customization.selected_item.original_item,
          selected_item: customization.selected_item.selected_item,
        }
      : null,
    photos:
      customization.photos?.map(
        (photo) =>
          photo.temp_file_id || photo.preview_url || photo.original_name
      ) || [],
  }));

  normalized.sort((a, b) =>
    a.customization_id.localeCompare(b.customization_id)
  );

  return JSON.stringify(normalized);
};

const formatCustomizationValue = (custom: CartCustomization) => {
  switch (custom.customization_type) {
    case "TEXT_INPUT":
      return custom.text?.trim() || "Mensagem não informada";
    case "MULTIPLE_CHOICE":
      return (
        custom.selected_option_label ||
        custom.selected_option ||
        "Opção não selecionada"
      );
    case "ITEM_SUBSTITUTION":
      if (custom.selected_item) {
        return `${custom.selected_item.original_item} → ${custom.selected_item.selected_item}`;
      }
      return "Substituição não definida";
    case "PHOTO_UPLOAD":
      return `${custom.photos?.length || 0} foto(s) enviada(s)`;
    default:
      return "Personalização";
  }
};

const isSubstitutionOptions = (
  options: RuleAvailableOptions | undefined
): options is {
  items: Array<{
    original_item: string;
    available_substitutes: Array<{
      item: string;
      price_adjustment: number;
    }>;
  }>;
} => {
  return Boolean(
    options &&
      !Array.isArray(options) &&
      Array.isArray((options as { items?: unknown }).items)
  );
};

// Type guards para opções específicas
const isSelectOptions = (
  options: RuleAvailableOptions | undefined
): options is SelectOption[] => {
  return (
    Array.isArray(options) &&
    options.every((o): o is SelectOption => {
      const opt = o as Partial<SelectOption>;
      return typeof opt.value === "string" && typeof opt.label === "string";
    })
  );
};

const isLayoutPresetOptions = (
  options: RuleAvailableOptions | undefined
): options is LayoutPreset[] => {
  return (
    Array.isArray(options) &&
    options.every(
      (o) => typeof (o as Partial<LayoutPreset>).preview_image_url === "string"
    )
  );
};

const isLayoutWithPhotosOptions = (
  options: RuleAvailableOptions | undefined
): options is LayoutWithPhotos[] => {
  return (
    Array.isArray(options) &&
    options.every(
      (o) => typeof (o as Partial<LayoutWithPhotos>).photo_slots === "number"
    )
  );
};

// Mapeia tipos novos para os tipos legados usados no carrinho
const mapRuleTypeToLegacy = (
  ruleType: RuleType
): "PHOTO_UPLOAD" | "TEXT_INPUT" | "MULTIPLE_CHOICE" | "ITEM_SUBSTITUTION" => {
  switch (ruleType) {
    case "PHOTO_UPLOAD":
      return "PHOTO_UPLOAD";
    case "TEXT_INPUT":
      return "TEXT_INPUT";
    case "OPTION_SELECT":
      return "MULTIPLE_CHOICE";
    case "ITEM_SUBSTITUTION":
      return "ITEM_SUBSTITUTION";
    case "LAYOUT_PRESET":
      return "MULTIPLE_CHOICE";
    case "LAYOUT_WITH_PHOTOS":
      return "PHOTO_UPLOAD";
  }
};

const ClientProductPage = ({ id }: { id: string }) => {
  const { getProduct, getAdditionalsByProduct, getProductRulesByType } =
    useApi();
  const { cart, addToCart } = useCartContext();

  const [product, setProduct] = useState<Product>({} as Product);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>(
    []
  );
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const [ruleValues, setRuleValues] = useState<RuleValue[]>([]);

  const { uploadFile, deleteFile } = useCustomization(id, "product");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(id);
        setProduct(data);
        // Buscar regras de customização do tipo do produto
        if (data.type_id) {
          try {
            const rules = await getProductRulesByType(data.type_id);
            setProductRules(rules);
          } catch (error) {
            console.error("Erro ao carregar regras de customização:", error);
            // Não mostrar toast para erro de regras, pois pode ser que não haja regras
          }
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        toast.error("Erro ao carregar produto");
      } finally {
        setLoadingProduct(false);
      }
    };

    const fetchAdditionals = async () => {
      try {
        const data = await getAdditionalsByProduct(id);
        setAdditionals(data || []);
      } catch (error) {
        console.error("Erro ao carregar informações adicionais:", error);
        toast.error("Erro ao carregar informações adicionais");
      }
    };

    fetchProduct();
    fetchAdditionals();
  }, [id, getProduct, getAdditionalsByProduct, getProductRulesByType]);

  const sortedCustomizationRules = useMemo(() => {
    return [...productRules].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
  }, [productRules]);

  useEffect(() => {
    // Validar regras obrigatórias
    const missingFields: string[] = [];
    sortedCustomizationRules.forEach((rule) => {
      if (!rule.required) return;

      const value = ruleValues.find((v) => v.rule_id === rule.id);
      if (!value) {
        missingFields.push(rule.title);
        return;
      }

      let isFilled = false;
      switch (rule.rule_type) {
        case "PHOTO_UPLOAD":
          isFilled = (value.photos?.length ?? 0) > 0;
          break;
        case "TEXT_INPUT":
          isFilled = !!value.text?.trim();
          break;
        case "OPTION_SELECT":
          isFilled = !!value.selected_option;
          break;
        case "LAYOUT_PRESET":
          isFilled = !!value.selected_layout;
          break;
        case "LAYOUT_WITH_PHOTOS":
          isFilled = !!value.selected_layout && (value.photos?.length ?? 0) > 0;
          break;
        case "ITEM_SUBSTITUTION":
          isFilled = !!value.selected_item;
          break;
      }

      if (!isFilled) {
        missingFields.push(rule.title);
      }
    });

    setMissingRequiredFields(missingFields);
  }, [ruleValues, sortedCustomizationRules]);

  const cartCustomizations = useMemo(() => {
    if (sortedCustomizationRules.length === 0) return [];

    const result: CartCustomization[] = [];

    sortedCustomizationRules.forEach((rule) => {
      const value = ruleValues.find((c) => c.rule_id === rule.id);
      if (!value) return;

      let isFilled = false;
      let priceAdjustment = 0;
      let selectedOptionLabel: string | undefined;
      let selectedItemLabel: string | undefined;

      const normalizedPhotos = (value.photos || []).map((photo, index) => ({
        ...photo,
        position: index,
      }));

      switch (rule.rule_type) {
        case "PHOTO_UPLOAD": {
          if (normalizedPhotos.length > 0) {
            isFilled = true;
          }
          break;
        }
        case "TEXT_INPUT": {
          if (value.text && value.text.trim() !== "") {
            isFilled = true;
          }
          break;
        }
        case "OPTION_SELECT": {
          if (value.selected_option) {
            isFilled = true;
            if (isSelectOptions(rule.available_options)) {
              const opt = rule.available_options.find(
                (o) => o.value === value.selected_option
              );
              if (opt) {
                priceAdjustment = opt.price_adjustment || 0;
                selectedOptionLabel = opt.label;
              }
            }
          }
          break;
        }
        case "LAYOUT_PRESET": {
          if (value.selected_layout) {
            isFilled = true;
            if (isLayoutPresetOptions(rule.available_options)) {
              const layout = rule.available_options.find(
                (l) => l.id === value.selected_layout
              );
              if (layout) {
                priceAdjustment = layout.price_adjustment || 0;
                selectedOptionLabel = layout.name;
              }
            }
          }
          break;
        }
        case "LAYOUT_WITH_PHOTOS": {
          if (value.selected_layout && normalizedPhotos.length > 0) {
            isFilled = true;
            if (isLayoutWithPhotosOptions(rule.available_options)) {
              const layout = rule.available_options.find(
                (l) => l.id === value.selected_layout
              );
              if (layout) {
                priceAdjustment = layout.price_adjustment || 0;
              }
            }
          }
          break;
        }
        case "ITEM_SUBSTITUTION": {
          if (value.selected_item) {
            isFilled = true;
            priceAdjustment = value.selected_item.price_adjustment || 0;
            selectedItemLabel = `${value.selected_item.original_item} → ${value.selected_item.selected_item}`;
          }
          break;
        }
        default:
          break;
      }

      if (!isFilled) {
        return;
      }

      const customizationEntry: CartCustomization = {
        customization_id: rule.id,
        photos: normalizedPhotos,
        text: value.text,
        selected_option: value.selected_option,
        selected_item: value.selected_item,
        title: rule.title || "Personalização",
        customization_type: mapRuleTypeToLegacy(rule.rule_type),
        is_required: rule.required,
        price_adjustment: priceAdjustment,
        selected_option_label: selectedOptionLabel,
        selected_item_label: selectedItemLabel,
      };

      // Ajustes para LAYOUT_PRESET: reutilizar campos de opção para exibição
      if (rule.rule_type === "LAYOUT_PRESET" && value.selected_layout) {
        customizationEntry.selected_option = value.selected_layout;
      }

      result.push(customizationEntry);
    });

    return result;
  }, [ruleValues, sortedCustomizationRules]);

  const customizationTotal = useMemo(
    () =>
      cartCustomizations.reduce(
        (sum, customization) => sum + (customization.price_adjustment || 0),
        0
      ),
    [cartCustomizations]
  );

  // Funções para gerenciar valores das regras
  const updateRuleValue = useCallback(
    (ruleId: string, updates: Partial<RuleValue>) => {
      setRuleValues((prev) => {
        const existing = prev.find((v) => v.rule_id === ruleId);
        if (existing) {
          return prev.map((v) =>
            v.rule_id === ruleId ? { ...v, ...updates } : v
          );
        } else {
          return [...prev, { rule_id: ruleId, ...updates }];
        }
      });
    },
    []
  );

  const removeRuleValue = useCallback((ruleId: string) => {
    setRuleValues((prev) => prev.filter((v) => v.rule_id !== ruleId));
  }, []);

  const basePrice = useMemo(() => {
    if (!product.price) return 0;
    const discount = product.discount || 0;
    return product.price * (1 - discount / 100);
  }, [product.price, product.discount]);

  const unitPriceWithCustomizations = useMemo(
    () => Number((basePrice + customizationTotal).toFixed(2)),
    [basePrice, customizationTotal]
  );

  const totalPriceForQuantity = useMemo(
    () => unitPriceWithCustomizations * quantity,
    [unitPriceWithCustomizations, quantity]
  );

  const isUploading = useMemo(
    () => Object.values(uploadingMap).some(Boolean),
    [uploadingMap]
  );

  const currentConfigSignature = useMemo(
    () => serializeCustomizationsSignature(cartCustomizations),
    [cartCustomizations]
  );

  const isCurrentConfigInCart = useMemo(() => {
    if (!product.id || !cart?.items?.length) return false;

    return cart.items.some(
      (item) =>
        item.product_id === product.id &&
        serializeAdditionals(item.additional_ids) === "[]" &&
        serializeAdditionalColors(item.additional_colors) === "{}" &&
        serializeCustomizationsSignature(item.customizations) ===
          currentConfigSignature
    );
  }, [cart?.items, product.id, currentConfigSignature]);

  const handlePhotoUpload = async (
    customizationId: string,
    rule: ProductRule,
    files: FileList | File[]
  ) => {
    const filesArray = Array.from(files || []);
    if (filesArray.length === 0) {
      return;
    }

    const currentValue = ruleValues.find((c) => c.rule_id === customizationId);
    const existingPhotos = currentValue?.photos || [];

    const maxFilesFromRule =
      typeof rule.max_items === "number" && rule.max_items > 0
        ? rule.max_items
        : undefined;

    if (maxFilesFromRule && existingPhotos.length >= maxFilesFromRule) {
      toast.error(
        `Você já enviou o máximo de ${maxFilesFromRule} foto(s) permitido(s).`
      );
      return;
    }

    const availableSlots = maxFilesFromRule
      ? Math.max(maxFilesFromRule - existingPhotos.length, 0)
      : filesArray.length;

    if (availableSlots === 0) {
      toast.error("Limite de fotos atingido.");
      return;
    }

    const selectedFiles = filesArray.slice(0, availableSlots);

    setUploadingMap((prev) => ({ ...prev, [customizationId]: true }));

    try {
      const uploadedPhotos: PhotoUploadData[] = [];

      for (const file of selectedFiles) {
        const result = await uploadFile(file);
        if (result) {
          uploadedPhotos.push({
            temp_file_id: result.id,
            original_name: result.original_name,
            position: existingPhotos.length + uploadedPhotos.length,
          });
        }
      }

      if (uploadedPhotos.length > 0) {
        const updatedPhotos = [...existingPhotos, ...uploadedPhotos].map(
          (photo, index) => ({
            ...photo,
            position: index,
          })
        );
        updateRuleValue(customizationId, { photos: updatedPhotos });
        toast.success("Foto(s) adicionada(s) com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao enviar fotos:", error);
      toast.error("Não foi possível enviar as fotos. Tente novamente.");
    } finally {
      setUploadingMap((prev) => ({ ...prev, [customizationId]: false }));
    }
  };

  const handleRemovePhoto = async (
    customizationId: string,
    tempFileId: string
  ) => {
    setUploadingMap((prev) => ({ ...prev, [customizationId]: true }));

    try {
      await deleteFile(tempFileId);
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      toast.error("Não foi possível remover a foto.");
    } finally {
      setUploadingMap((prev) => ({ ...prev, [customizationId]: false }));
    }

    const currentValue = ruleValues.find((c) => c.rule_id === customizationId);
    const remainingPhotos = (currentValue?.photos || []).filter(
      (photo) => photo.temp_file_id !== tempFileId
    );

    if (remainingPhotos.length === 0) {
      removeRuleValue(customizationId);
    } else {
      updateRuleValue(customizationId, {
        photos: remainingPhotos.map((photo, index) => ({
          ...photo,
          position: index,
        })),
      });
    }
  };

  const handleAddToCart = async () => {
    if (!product.id) return;

    if (isUploading) {
      toast.info("Aguarde finalizar o carregamento das personalizações.");
      return;
    }

    if (missingRequiredFields.length > 0) {
      toast.error(
        `Complete as personalizações obrigatórias: ${missingRequiredFields.join(
          ", "
        )}`
      );
      return;
    }

    setMissingRequiredFields([]);
    setAddingToCart(true);

    try {
      await addToCart(
        product.id,
        quantity,
        undefined,
        undefined,
        cartCustomizations
      );
      toast.success("Produto adicionado ao carrinho!");
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      toast.error("Erro ao adicionar produto ao carrinho");
    } finally {
      setAddingToCart(false);
    }
  };

  const hasDiscount = product.discount && product.discount > 0;

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!product.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Produto não encontrado
          </h1>
          <p className="text-gray-600">
            O produto que você está procurando não existe ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:underline">
            Início
          </Link>
          <span className="mx-2">›</span>
          <Link
            href={`/categoria/${product.categories?.[0]?.id}`}
            className="hover:underline"
          >
            {product.categories?.[0]?.name || "Produtos"}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="relative aspect-square w-full max-w-md mx-auto">
                <Image
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
                {hasDiscount && (
                  <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                    -{product.discount}%
                  </Badge>
                )}
              </div>
            </Card>

            <div className="flex gap-2 overflow-x-auto">
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0" />
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0" />
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0" />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(0 avaliações)</span>
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                {hasDiscount ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(basePrice)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        {formatCurrency(product.price)}
                      </span>
                      <Badge variant="destructive">-{product.discount}%</Badge>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Você economiza {formatCurrency(product.price - basePrice)}
                    </p>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(product.price || 0)}
                  </span>
                )}
              </div>

              <div className="rounded-md border border-orange-200 bg-orange-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-orange-900">
                  <span>Personalizações</span>
                  <span>{formatCurrency(customizationTotal)}</span>
                </div>
                {cartCustomizations.length > 0 && (
                  <ul className="space-y-1 text-xs text-orange-900/80">
                    {cartCustomizations.map((customization) => (
                      <li
                        key={customization.customization_id}
                        className="flex items-start gap-2"
                      >
                        <span className="font-medium text-orange-950">
                          {customization.title}:
                        </span>
                        <span className="flex-1">
                          {formatCustomizationValue(customization)}
                          {customization.price_adjustment ? (
                            <span className="ml-1 font-semibold">
                              ({formatCurrency(customization.price_adjustment)})
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-lg font-semibold text-gray-900">
                  Total por unidade
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(unitPriceWithCustomizations)}
                </span>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={addingToCart || isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                size="lg"
              >
                {addingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Adicionando...
                  </>
                ) : isCurrentConfigInCart ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Configuração no carrinho
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Adicionar por {formatCurrency(totalPriceForQuantity)}
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-600 text-center">
                Valor total inclui {formatCurrency(customizationTotal)} em
                personalizações.
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1">
                  <Heart className="w-4 h-4 mr-2" />
                  Favoritar
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Personalize seu pedido
                </h2>
                {/* Loader de customização removido (não aplicável ao novo fluxo) */}
              </div>

              {sortedCustomizationRules.length === 0 && true ? (
                <p className="text-sm text-muted-foreground">
                  Este produto não possui personalizações configuradas.
                </p>
              ) : (
                <div className="space-y-5">
                  {sortedCustomizationRules.map((rule) => {
                    const value = ruleValues.find((v) => v.rule_id === rule.id);
                    const cartCustomization = cartCustomizations.find(
                      (c) => c.customization_id === rule.id
                    );
                    const currentPhotos = value?.photos || [];
                    const isMissing = missingRequiredFields.includes(
                      rule.title
                    );

                    const maxAllowed = rule.max_items || 10; // default fallback

                    const remainingPhotos = maxAllowed
                      ? Math.max(maxAllowed - currentPhotos.length, 0)
                      : undefined;

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "rounded-lg border border-border bg-muted/40 p-4 space-y-3",
                          isMissing &&
                            "border-destructive/60 bg-red-50/60 ring-1 ring-destructive/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">
                                {rule.title}
                              </h3>
                              {rule.required && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] uppercase"
                                >
                                  Obrigatório
                                </Badge>
                              )}
                              {cartCustomization?.price_adjustment ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  +
                                  {formatCurrency(
                                    cartCustomization.price_adjustment
                                  )}
                                </Badge>
                              ) : null}
                            </div>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground">
                                {rule.description}
                              </p>
                            )}
                          </div>
                          {isMissing && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
                              <AlertCircle className="h-3 w-3" /> Necessário
                            </span>
                          )}
                        </div>

                        {(() => {
                          switch (rule.rule_type) {
                            case "PHOTO_UPLOAD":
                              return (
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-2 rounded-md border-2 border-dashed border-border/60 bg-white p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Images className="h-5 w-5" />
                                      <span>
                                        Envie fotos para personalizar seu pedido
                                      </span>
                                    </div>
                                    {maxAllowed ? (
                                      <span className="text-xs text-muted-foreground">
                                        Você pode enviar até {maxAllowed}{" "}
                                        foto(s). Restam {remainingPhotos}.
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Você pode enviar múltiplas fotos (limite
                                        dinâmico).
                                      </span>
                                    )}
                                    <label className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer w-fit">
                                      <UploadCloud className="h-4 w-4" />
                                      Selecionar arquivos
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(event) => {
                                          if (!event.target.files) return;
                                          handlePhotoUpload(
                                            rule.id,
                                            rule,
                                            event.target.files
                                          );
                                          event.target.value = "";
                                        }}
                                        disabled={
                                          isUploading ||
                                          (maxAllowed
                                            ? remainingPhotos === 0
                                            : false)
                                        }
                                      />
                                    </label>
                                  </div>

                                  {currentPhotos.length > 0 ? (
                                    <ul className="space-y-2 text-xs">
                                      {currentPhotos.map((photo) => (
                                        <li
                                          key={photo.temp_file_id}
                                          className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Images className="h-4 w-4 text-muted-foreground" />
                                            <span
                                              className="truncate max-w-[200px]"
                                              title={photo.original_name}
                                            >
                                              {photo.original_name}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleRemovePhoto(
                                                rule.id,
                                                photo.temp_file_id
                                              )
                                            }
                                            className="text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                      Nenhuma foto enviada ainda.
                                    </p>
                                  )}
                                </div>
                              );

                            case "TEXT_INPUT":
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                    <FileText className="h-4 w-4" />
                                    Escreva uma mensagem personalizada
                                  </div>
                                  <textarea
                                    className="w-full min-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    placeholder="Digite aqui sua mensagem"
                                    value={value?.text || ""}
                                    onChange={(event) =>
                                      updateRuleValue(rule.id, {
                                        text: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                              );

                            case "OPTION_SELECT":
                              return (
                                <div className="space-y-2">
                                  <span className="text-xs text-muted-foreground">
                                    Escolha uma das opções disponíveis.
                                  </span>
                                  <Select
                                    value={value?.selected_option || ""}
                                    onValueChange={(selectedValue) =>
                                      updateRuleValue(rule.id, {
                                        selected_option: selectedValue,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma opção" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {isSelectOptions(
                                        rule.available_options
                                      ) ? (
                                        rule.available_options.map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span>{option.label}</span>
                                              {option.price_adjustment ? (
                                                <span className="text-xs text-emerald-600 font-semibold">
                                                  +
                                                  {formatCurrency(
                                                    option.price_adjustment
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">
                                          Nenhuma opção configurada
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );

                            case "ITEM_SUBSTITUTION": {
                              const substitutionOptions = isSubstitutionOptions(
                                rule.available_options
                              )
                                ? rule.available_options.items.flatMap((item) =>
                                    item.available_substitutes.map(
                                      (substitute) => ({
                                        value: `${item.original_item}__${substitute.item}`,
                                        label: `${item.original_item} → ${substitute.item}`,
                                        price_adjustment:
                                          substitute.price_adjustment,
                                        original_item: item.original_item,
                                        selected_item: substitute.item,
                                      })
                                    )
                                  )
                                : [];

                              return (
                                <div className="space-y-2">
                                  <span className="text-xs text-muted-foreground">
                                    Escolha qual item deseja substituir.
                                  </span>
                                  <Select
                                    value={
                                      value?.selected_item
                                        ? `${value.selected_item.original_item}__${value.selected_item.selected_item}`
                                        : ""
                                    }
                                    onValueChange={(selectedValue) => {
                                      const [originalItem, selectedItem] =
                                        selectedValue.split("__");
                                      const option = substitutionOptions.find(
                                        (opt) => opt.value === selectedValue
                                      );
                                      updateRuleValue(rule.id, {
                                        selected_item: {
                                          original_item: originalItem,
                                          selected_item: selectedItem,
                                          price_adjustment:
                                            option?.price_adjustment || 0,
                                        },
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a substituição" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {substitutionOptions.length > 0 ? (
                                        substitutionOptions.map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="truncate">
                                                {option.label}
                                              </span>
                                              {option.price_adjustment ? (
                                                <span className="text-xs text-emerald-600 font-semibold">
                                                  +
                                                  {formatCurrency(
                                                    option.price_adjustment
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">
                                          Nenhuma substituição disponível
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            }

                            case "LAYOUT_PRESET": {
                              const layoutOptions = isLayoutPresetOptions(
                                rule.available_options
                              )
                                ? rule.available_options
                                : [];

                              return (
                                <div className="space-y-2">
                                  <span className="text-xs text-muted-foreground">
                                    Selecione um layout pronto para seu produto.
                                  </span>
                                  <Select
                                    value={value?.selected_layout || ""}
                                    onValueChange={(selectedLayoutId) =>
                                      updateRuleValue(rule.id, {
                                        selected_layout: selectedLayoutId,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um layout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {layoutOptions.length > 0 ? (
                                        layoutOptions.map((layout) => (
                                          <SelectItem
                                            key={layout.id}
                                            value={layout.id}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="truncate">
                                                {layout.name}
                                              </span>
                                              {layout.price_adjustment ? (
                                                <span className="text-xs text-emerald-600 font-semibold">
                                                  +
                                                  {formatCurrency(
                                                    layout.price_adjustment
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">
                                          Nenhum layout disponível
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            }

                            case "LAYOUT_WITH_PHOTOS": {
                              const layoutOptions = isLayoutWithPhotosOptions(
                                rule.available_options
                              )
                                ? rule.available_options
                                : [];
                              const selectedLayout = layoutOptions.find(
                                (l) => l.id === value?.selected_layout
                              );
                              const maxSlots =
                                selectedLayout?.photo_slots ||
                                rule.max_items ||
                                undefined;
                              const currentPhotos = value?.photos || [];
                              const remainingSlots = maxSlots
                                ? Math.max(maxSlots - currentPhotos.length, 0)
                                : undefined;

                              return (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground">
                                      Escolha um layout com fotos e envie as
                                      imagens.
                                    </span>
                                    <Select
                                      value={value?.selected_layout || ""}
                                      onValueChange={(selectedLayoutId) =>
                                        updateRuleValue(rule.id, {
                                          selected_layout: selectedLayoutId,
                                          photos: [], // resetar fotos ao trocar de layout
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione um layout" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {layoutOptions.length > 0 ? (
                                          layoutOptions.map((layout) => (
                                            <SelectItem
                                              key={layout.id}
                                              value={layout.id}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="truncate">
                                                  {layout.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                  {layout.photo_slots} foto(s)
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <div className="px-2 py-2 text-xs text-muted-foreground">
                                            Nenhum layout disponível
                                          </div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex flex-col gap-2 rounded-md border-2 border-dashed border-border/60 bg-white p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Images className="h-5 w-5" />
                                      <span>
                                        Envie fotos para preencher o layout
                                        selecionado
                                      </span>
                                    </div>
                                    {maxSlots ? (
                                      <span className="text-xs text-muted-foreground">
                                        Slots: {currentPhotos.length}/{maxSlots}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Selecione um layout para ver o limite de
                                        fotos.
                                      </span>
                                    )}
                                    <label className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer w-fit">
                                      <UploadCloud className="h-4 w-4" />
                                      Selecionar arquivos
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(event) => {
                                          if (!event.target.files) return;
                                          handlePhotoUpload(
                                            rule.id,
                                            rule,
                                            event.target.files
                                          );
                                          event.target.value = "";
                                        }}
                                        disabled={
                                          isUploading ||
                                          !value?.selected_layout ||
                                          (remainingSlots !== undefined &&
                                            remainingSlots === 0)
                                        }
                                      />
                                    </label>
                                  </div>

                                  {currentPhotos.length > 0 ? (
                                    <ul className="space-y-2 text-xs">
                                      {currentPhotos.map((photo) => (
                                        <li
                                          key={photo.temp_file_id}
                                          className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Images className="h-4 w-4 text-muted-foreground" />
                                            <span
                                              className="truncate max-w-[200px]"
                                              title={photo.original_name}
                                            >
                                              {photo.original_name}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleRemovePhoto(
                                                rule.id,
                                                photo.temp_file_id!
                                              )
                                            }
                                            className="text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                      Nenhuma foto enviada ainda.
                                    </p>
                                  )}
                                </div>
                              );
                            }

                            // TODO: Implementar UI para LAYOUT_PRESET e LAYOUT_WITH_PHOTOS
                            // Por enquanto, não renderiza nada para esses tipos
                            default:
                              return null;
                          }
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Descrição do Produto
              </h3>
              <div className="prose">
                {product.description ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    Nenhuma descrição disponível para este produto.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Adicionais</h2>
            {additionals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {additionals.map((additional) => (
                  <AdditionalCard
                    key={additional.id}
                    additional={additional}
                    productId={product.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Nenhum adicional disponível para este produto.
              </p>
            )}
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Produtos relacionados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-square bg-gray-200 rounded mb-2" />
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Produto {i + 1}
                </h3>
                <p className="text-sm font-bold text-gray-900">R$ 29,90</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProductPage;
