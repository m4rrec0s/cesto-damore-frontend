"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus, ChevronLeft } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";
import useApi, { Additional, Item, Product } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { Model3DViewer } from "./Model3DViewer";
import AdditionalCard from "./additional-card";
import Link from "next/link";
import { ProductCard } from "@/app/components/layout/product-card";
import { useRouter } from "next/navigation";
import {
  CustomizationType,
  type CustomizationInput,
} from "@/app/types/customization";
import type { SlotDef } from "@/app/types/personalization";
import { Separator } from "@/app/components/ui/separator";
import { ItemCustomizationModal } from "./itemCustomizationsModal";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ClientProductPage = ({ id }: { id: string }) => {
  const { getProduct, getAdditionalsByProduct, getItemsByProduct } = useApi();
  const { addToCart } = useCartContext();

  const [product, setProduct] = useState<Product>({} as Product);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [components, setComponents] = useState<Item[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<Item | null>(null);
  const [itemCustomizations, setItemCustomizations] = useState<
    Record<string, CustomizationInput[]>
  >({});
  const [customizationPreviews, setCustomizationPreviews] = useState<
    Record<string, string>
  >({});
  const [activeCustomizationModal, setActiveCustomizationModal] = useState<
    string | null
  >(null);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(
    null
  );
  const isUploading = false;

  const handleCustomizationComplete = useCallback(
    (
      itemId: string,
      hasCustomizations: boolean,
      data: CustomizationInput[]
    ) => {
      console.log("🎨 [handleCustomizationComplete] Início:", {
        itemId,
        hasCustomizations,
        data,
      });

      if (hasCustomizations) {
        setItemCustomizations((prev) => ({
          ...prev,
          [itemId]: data,
        }));

        // Verificar se tem BASE_LAYOUT customizado
        const hasBaseLayout = data.some(
          (c) => c.customizationType === CustomizationType.LAYOUT_BASE
        );

        console.log(
          "🎨 [handleCustomizationComplete] hasBaseLayout:",
          hasBaseLayout
        );

        if (hasBaseLayout) {
          console.log(
            "✅ [handleCustomizationComplete] Ativando preview para:",
            itemId
          );
          setPreviewComponentId(itemId);
        }

        toast.success("Personalização salva!");
      } else {
        setItemCustomizations((prev) => {
          const copy = { ...prev };
          delete copy[itemId];
          return copy;
        });

        // Limpar preview se era deste item
        if (previewComponentId === itemId) {
          console.log("🗑️ [handleCustomizationComplete] Limpando preview");
          setPreviewComponentId(null);
        }
      }
    },
    [previewComponentId]
  );

  const handlePreviewChange = useCallback(
    (itemId: string, previewUrl: string | null) => {
      if (previewUrl) {
        setCustomizationPreviews((prev) => ({
          ...prev,
          [itemId]: previewUrl,
        }));
      } else {
        setCustomizationPreviews((prev) => {
          const copy = { ...prev };
          delete copy[itemId];
          return copy;
        });
      }
    },
    []
  );

  const router = useRouter();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(id);
        setProduct(data);
        if (
          data.components &&
          Array.isArray(data.components) &&
          data.components.length > 0
        ) {
          const itemsFromProduct = data.components
            .map((c: { item?: Item | null }) => c.item)
            .filter(Boolean) as Item[];
          setComponents(itemsFromProduct);
        } else {
          await fetchComponents();
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

    const fetchComponents = async () => {
      try {
        const data = await getItemsByProduct(id);
        setComponents(data || []);
      } catch (error) {
        console.error("Erro ao carregar componentes:", error);
        toast.error("Erro ao carregar componentes");
      }
    };

    const run = async () => {
      await fetchProduct();
      fetchAdditionals();
    };

    run();
  }, [id, getProduct, getAdditionalsByProduct, getItemsByProduct]);

  const customizationTotal = useMemo(() => 0, []);

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

  // const currentConfigSignature = useMemo(
  //   () => serializeCustomizationsSignature(cartCustomizations),
  //   [cartCustomizations]
  // );

  // Determinar a imagem/preview atual a ser exibido
  const currentImageUrl = useMemo(() => {
    // 1. Se há um componente sendo visualizado para preview
    if (previewComponentId) {
      const previewComponent = components.find(
        (c) => c.id === previewComponentId
      );
      if (previewComponent) {
        // Se tem customização BASE_LAYOUT, verificar se há layout selecionado
        const componentCustomizations =
          itemCustomizations[previewComponentId] || [];
        const baseLayoutCustomization = componentCustomizations.find(
          (c) => c.customizationType === CustomizationType.LAYOUT_BASE
        );

        if (baseLayoutCustomization) {
          const layoutData = baseLayoutCustomization.data as
            | { id?: string; image_url?: string }
            | undefined;

          console.log("🖼️ [currentImageUrl] Layout data:", layoutData);

          // Usar image_url diretamente dos dados salvos
          if (layoutData?.image_url) {
            console.log(
              "✅ [currentImageUrl] Usando image_url do layout:",
              layoutData.image_url
            );
            return layoutData.image_url;
          }
        }

        // Fallback para imagem do componente
        return (
          previewComponent.image_url || product.image_url || "/placeholder.svg"
        );
      }
    }

    // 2. Se há um preview de customização para o componente selecionado
    if (selectedComponent && customizationPreviews[selectedComponent.id]) {
      return customizationPreviews[selectedComponent.id];
    }

    // 3. Usar a imagem do componente ou do produto
    return (
      selectedComponent?.image_url || product.image_url || "/placeholder.svg"
    );
  }, [
    selectedComponent,
    customizationPreviews,
    product.image_url,
    previewComponentId,
    components,
    itemCustomizations,
  ]);

  const currentName = selectedComponent?.name || product.name;

  // Determinar se deve mostrar modelo 3D e qual modelo usar
  const { shouldShow3D, modelUrl, textureUrl } = useMemo(() => {
    // Priorizar componente sendo previsualizado
    const componentToCheck = previewComponentId
      ? components.find((c) => c.id === previewComponentId)
      : selectedComponent;

    if (!componentToCheck)
      return {
        shouldShow3D: false,
        modelUrl: undefined,
        textureUrl: undefined,
      };
    if (!componentToCheck.allows_customization)
      return {
        shouldShow3D: false,
        modelUrl: undefined,
        textureUrl: undefined,
      };

    // Verificar se há uma customização BASE_LAYOUT ativa com layout selecionado
    const componentCustomizations =
      itemCustomizations[componentToCheck.id] || [];
    const baseLayoutCustomization = componentCustomizations.find(
      (c) => c.customizationType === CustomizationType.LAYOUT_BASE
    );

    if (baseLayoutCustomization) {
      const layoutData = baseLayoutCustomization.data as
        | {
            id?: string;
            name?: string;
            model_url?: string;
            item_type?: string;
            previewUrl?: string;
          }
        | undefined;

      if (layoutData?.model_url && layoutData?.previewUrl) {
        console.log("✅ [shouldShow3D] Mostrando 3D:", {
          modelUrl: layoutData.model_url,
          itemType: layoutData.item_type,
          hasTexture: !!layoutData.previewUrl,
        });
        return {
          shouldShow3D: true,
          modelUrl: layoutData.model_url,
          textureUrl: layoutData.previewUrl,
        };
      }
    }

    console.log("❌ [shouldShow3D] Não deve mostrar 3D");
    return { shouldShow3D: false, modelUrl: undefined, textureUrl: undefined };
  }, [selectedComponent, itemCustomizations, previewComponentId, components]);

  const handleAddToCart = async () => {
    if (!product.id) return;

    if (isUploading) {
      toast.info("Aguarde finalizar o carregamento das personalizações.");
      return;
    }

    // Validar customizações obrigatórias
    const missingCustomizations: string[] = [];

    components.forEach((component) => {
      if (!component.allows_customization) return;

      const requiredCustomizations =
        component.customizations?.filter((c) => c.isRequired) || [];
      const componentData = itemCustomizations[component.id] || [];

      requiredCustomizations.forEach((reqCustom) => {
        const hasData = componentData.some((c) => c.ruleId === reqCustom.id);

        if (!hasData) {
          missingCustomizations.push(`${component.name} - ${reqCustom.name}`);
        } else {
          // Verificar se os dados estão preenchidos
          const customData = componentData.find(
            (c) => c.ruleId === reqCustom.id
          );
          if (customData) {
            const data = customData.data as Record<string, unknown>;

            // Validar TEXT
            if (reqCustom.type === "TEXT") {
              const fields =
                (
                  reqCustom.customization_data as {
                    fields?: Array<{ id: string }>;
                  }
                )?.fields || [];
              const hasEmptyField = fields.some((field) => {
                const value = data[field.id];
                return (
                  !value || (typeof value === "string" && value.trim() === "")
                );
              });

              if (hasEmptyField) {
                missingCustomizations.push(
                  `${component.name} - ${reqCustom.name} (campo vazio)`
                );
              }
            }

            // Validar IMAGES
            if (reqCustom.type === "IMAGES") {
              const photos = Array.isArray(data) ? data : [];
              if (photos.length === 0) {
                missingCustomizations.push(
                  `${component.name} - ${reqCustom.name} (sem fotos)`
                );
              }
            }

            // Validar MULTIPLE_CHOICE
            if (reqCustom.type === "MULTIPLE_CHOICE") {
              const choice = data as { id?: string } | undefined;
              if (!choice || !choice.id) {
                missingCustomizations.push(
                  `${component.name} - ${reqCustom.name} (nenhuma opção selecionada)`
                );
              }
            }

            // Validar BASE_LAYOUT
            if (reqCustom.type === "BASE_LAYOUT") {
              const layout = data as { id?: string } | undefined;
              if (!layout || !layout.id) {
                missingCustomizations.push(
                  `${component.name} - ${reqCustom.name} (nenhum layout selecionado)`
                );
              }
            }
          }
        }
      });
    });

    if (missingCustomizations.length > 0) {
      toast.error(
        <div>
          <p className="font-semibold">
            Personalizações obrigatórias não preenchidas:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            {missingCustomizations.map((missing, idx) => (
              <li key={idx}>{missing}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setAddingToCart(true);

    try {
      // Converter customizações dos itens para o formato do carrinho
      const cartCustomizations: CartCustomization[] = [];

      Object.entries(itemCustomizations).forEach(
        ([itemId, customizationInputs]) => {
          customizationInputs.forEach((input) => {
            const data = input.data as Record<string, unknown>;
            const customizationName =
              (data._customizationName as string) || "Personalização";

            // Converter baseado no tipo de customização
            if (input.customizationType === "TEXT") {
              const textValue = (data.text as string) || String(data || "");

              cartCustomizations.push({
                customization_id: input.ruleId || `item_${itemId}`,
                title: customizationName,
                customization_type: "TEXT",
                is_required: false,
                price_adjustment: 0,
                text: textValue,
              });
            } else if (input.customizationType === "MULTIPLE_CHOICE") {
              const choice = data as { id?: string; label?: string } | string;
              const optionId =
                typeof choice === "string" ? choice : choice.id || "";
              const optionLabel =
                typeof choice === "string" ? choice : choice.label || "";

              cartCustomizations.push({
                customization_id: input.ruleId || `item_${itemId}`,
                title: customizationName,
                customization_type: "MULTIPLE_CHOICE",
                is_required: false,
                price_adjustment: 0,
                selected_option: optionId,
                selected_option_label: optionLabel,
              });
            } else if (input.customizationType === "IMAGES") {
              const photos = Array.isArray(data)
                ? data
                    .map(
                      (
                        item: { file?: File; preview?: string },
                        index: number
                      ) => ({
                        preview_url: item.preview || "",
                        original_name:
                          item.file?.name || `photo-${index + 1}.jpg`,
                        temp_file_id: `temp-${Date.now()}-${index}`,
                        position: index,
                      })
                    )
                    .filter((p) => p.preview_url)
                : [];

              cartCustomizations.push({
                customization_id: input.ruleId || `item_${itemId}`,
                title: customizationName,
                customization_type: "IMAGES",
                is_required: false,
                price_adjustment: 0,
                photos: photos,
              });
            } else if (input.customizationType === "LAYOUT_BASE") {
              cartCustomizations.push({
                customization_id: input.ruleId || `item_${itemId}`,
                title: customizationName,
                customization_type: "BASE_LAYOUT",
                is_required: false,
                price_adjustment: 0,
                selected_item: {
                  original_item: "Layout Base",
                  selected_item: "Personalizado",
                  price_adjustment: 0,
                },
              });
            }
          });
        }
      );

      console.log(
        "🛒 Customizações convertidas para carrinho:",
        cartCustomizations
      );

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
      <div className="max-w-none sm:max-w-[90%] mx-auto px-4 py-8">
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
            <div className="relative aspect-square w-full max-w-md mx-auto">
              <Button
                variant={"ghost"}
                onClick={() => router.back()}
                className="absolute text-white hover:text-neutral-100 top-3 left-3 z-10 bg-black/30 hover:bg-black/50 backdrop-blur-lg px-0 py-0 p-0 rounded-full shadow-sm cursor-pointer border"
              >
                <ChevronLeft size={24} />
              </Button>

              {shouldShow3D && modelUrl && textureUrl ? (
                <Model3DViewer
                  modelUrl={modelUrl}
                  className="w-full h-full"
                  autoRotate={true}
                  rotateSpeed={0.3}
                  baseScale={6}
                  materialColor="#ffffff"
                  textures={[
                    {
                      areaId: "customTexture",
                      imageUrl: textureUrl,
                      position: { x: 0, y: 0.35, z: 0 },
                      dimensions: {
                        width: 0.95,
                        height: 0.95,
                      },
                      mapping: "cylinder",
                      cylinder: {
                        radius: 0.46,
                        height: 0.95,
                        segments: 200,
                      },
                    },
                  ]}
                />
              ) : (
                <Image
                  src={currentImageUrl}
                  alt={currentName}
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
              )}
              {hasDiscount && (
                <Badge className="absolute top-3 right-3 bg-red-500 hover:bg-red-600">
                  -{product.discount}%
                </Badge>
              )}

              {previewComponentId && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                    🎨 Preview Personalizado
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewComponentId(null)}
                    className="text-xs"
                  >
                    Ver Original
                  </Button>
                </div>
              )}
            </div>

            <h2 className="font-semibold text-lg">Componentes</h2>
            <div className="flex gap-2 overflow-x-auto">
              <>
                <div
                  key="product-default"
                  className={cn(
                    "relative w-[100px] h-[100px] bg-gray-200 rounded-lg border-2 flex-shrink-0 cursor-pointer",
                    selectedComponent === null
                      ? "border-blue-500 ring-2 ring-blue-100"
                      : "border-gray-300"
                  )}
                  title="Imagem padrão do produto"
                >
                  <Button
                    asChild
                    className="w-full h-full p-0 rounded-lg overflow-hidden"
                    onClick={() => setSelectedComponent(null)}
                    aria-label="Selecionar imagem do produto"
                  >
                    <Image
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name || "Produto"}
                      fill
                      className="object-cover rounded-lg"
                      priority
                    />
                  </Button>
                </div>

                {components &&
                  components.length > 0 &&
                  components.map((component) => (
                    <div
                      key={component.id}
                      className={cn(
                        "relative w-[100px] h-[100px] bg-gray-200 rounded-lg border-2 flex-shrink-0 cursor-pointer",
                        selectedComponent?.id === component.id
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-gray-300"
                      )}
                      title={component.name}
                    >
                      <Button
                        asChild
                        className="w-full h-full p-0 rounded-lg overflow-hidden"
                        onClick={() => setSelectedComponent(component)}
                        aria-label={`Selecionar componente ${component.name}`}
                      >
                        <Image
                          src={component.image_url || "/placeholder.svg"}
                          alt={component.name}
                          fill
                          className="object-cover rounded-lg"
                          priority
                        />
                      </Button>
                    </div>
                  ))}
              </>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Descrição do Produto
                </h3>
                <div className="prose">
                  {product.description ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">Sem descrição.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 h-6">
                <span className="text-sm md:text-base text-gray-500">Novo</span>
                <Separator orientation="vertical" />
                <span className="text-sm md:text-base text-gray-500">
                  +1000 Vendidos
                </span>
              </div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                {product.name}
              </h1>
              <div className="space-y-2">
                {hasDiscount ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl lg:text-4xl font-light text-gray-900">
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
                  <span className="text-2xl lg:text-4xl font-light text-gray-900">
                    {formatCurrency(product.price || 0)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col h-fit overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Seção: Lista de Customizações Disponíveis */}
                {components.filter((c) => c.allows_customization).length >
                  0 && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      Personalizações Disponíveis
                    </h3>

                    <div className="space-y-2">
                      {components
                        .filter((c) => c.allows_customization)
                        .map((component) => {
                          const hasCustomizations =
                            itemCustomizations[component.id]?.length > 0;
                          const requiredCount =
                            component.customizations?.filter(
                              (c) => c.isRequired
                            ).length || 0;
                          const totalCount =
                            component.customizations?.length || 0;

                          // Verificar se tem customização BASE_LAYOUT
                          const hasBaseLayout = component.customizations?.some(
                            (c) => c.type === "BASE_LAYOUT"
                          );

                          return (
                            <Button
                              key={component.id}
                              onClick={() => {
                                console.log("🖱️ [Button Click] Componente:", {
                                  id: component.id,
                                  name: component.name,
                                  hasBaseLayout,
                                  hasCustomizations,
                                });

                                // Se tem BASE_LAYOUT e já foi customizado, ativar preview
                                if (hasBaseLayout && hasCustomizations) {
                                  console.log(
                                    "✅ [Button Click] Ativando preview"
                                  );
                                  setPreviewComponentId(component.id);
                                }
                                setActiveCustomizationModal(component.id);
                              }}
                              variant="outline"
                              className="w-full justify-between h-auto py-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0">
                                  <Image
                                    src={
                                      component.image_url || "/placeholder.svg"
                                    }
                                    alt={component.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">
                                    {component.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {totalCount} opç
                                      {totalCount === 1 ? "ão" : "ões"}{" "}
                                      disponíve
                                      {totalCount === 1 ? "l" : "is"}
                                    </span>
                                    {requiredCount > 0 && (
                                      <Badge
                                        variant="destructive"
                                        className="ml-2 text-xs text-white"
                                      >
                                        {requiredCount} obrigatória
                                        {requiredCount === 1 ? "" : "s"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasCustomizations && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500"
                                  >
                                    ✓ Personalizado
                                  </Badge>
                                )}
                                <ChevronLeft className="w-5 h-5 rotate-180" />
                              </div>
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
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
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={addingToCart || isUploading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
                size="lg"
              >
                {addingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Adicionar por {formatCurrency(totalPriceForQuantity)}
                  </>
                )}
              </Button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Adicionais
              </h2>
              {additionals.length > 0 ? (
                <div className="flex items-center gap-4 overflow-x-auto">
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
            </div>
          </div>
        </div>

        <div className="w-full mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Produtos relacionados
          </h2>
          <div className="w-full text-center">
            {product.related_products && product.related_products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {product.related_products.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    props={{
                      id: relatedProduct.id,
                      name: relatedProduct.name,
                      image_url: relatedProduct.image_url || "/placeholder.svg",
                      price: relatedProduct.price,
                      discount: relatedProduct.discount,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-center">
                Nenhum produto relacionado encontrado.
              </p>
            )}
          </div>
        </div>
      </div>

      {components
        .filter((c) => c.allows_customization)
        .map((component) => (
          <ItemCustomizationModal
            key={component.id}
            isOpen={activeCustomizationModal === component.id}
            onClose={() => setActiveCustomizationModal(null)}
            itemId={component.id}
            itemName={component.name}
            customizations={(component.customizations || []).map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              type: c.type as
                | "BASE_LAYOUT"
                | "TEXT"
                | "IMAGES"
                | "MULTIPLE_CHOICE",
              isRequired: c.isRequired,
              price: c.price,
              customization_data: c.customization_data as {
                layouts?: Array<{
                  id: string;
                  name: string;
                  model_url?: string;
                  image_url?: string;
                  slots?: SlotDef[];
                }>;
                fields?: Array<{
                  id: string;
                  label: string;
                  placeholder?: string;
                  max_length?: number;
                }>;
                base_layout?: {
                  max_images: number;
                  min_width?: number;
                  min_height?: number;
                  max_file_size_mb?: number;
                  accepted_formats?: string[];
                };
                options?: Array<{
                  id: string;
                  label: string;
                  value: string;
                  price_adjustment?: number;
                  image_url?: string;
                  description?: string;
                }>;
              },
            }))}
            onComplete={(hasCustomizations, data) =>
              handleCustomizationComplete(component.id, hasCustomizations, data)
            }
            onPreviewChange={(url) =>
              url &&
              url !== "3D_MODEL" &&
              handlePreviewChange(component.id, url)
            }
          />
        ))}
    </div>
  );
};

export default ClientProductPage;
