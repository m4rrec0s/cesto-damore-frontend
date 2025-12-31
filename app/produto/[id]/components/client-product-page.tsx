"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  Minus,
  Plus,
  ChevronLeft,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";
import useApi, {
  Additional,
  Product,
  ProductComponent,
} from "@/app/hooks/use-api";
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
import { getInternalImageUrl } from "@/lib/image-helper";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ClientProductPage = ({ id }: { id: string }) => {
  const {
    getProduct,
    getAdditionalsByProduct,
    getItemsByProduct,
    uploadCustomizationImage,
  } = useApi();
  const { addToCart, cart } = useCartContext();

  const [product, setProduct] = useState<Product>({} as Product);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [selectedComponent, setSelectedComponent] =
    useState<ProductComponent | null>(null);
  const [itemCustomizations, setItemCustomizations] = useState<
    Record<string, CustomizationInput[]>
  >({});
  const [additionalCustomizations, setAdditionalCustomizations] = useState<
    Record<string, CustomizationInput[]>
  >({});
  const [customizationPreviews, setCustomizationPreviews] = useState<
    Record<string, string>
  >({});
  const [activeCustomizationModal, setActiveCustomizationModal] = useState<
    string | null
  >(null);
  const [activeAdditionalModal, setActiveAdditionalModal] = useState<
    string | null
  >(null);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(
    null
  );
  const [itemImagesCount, setItemImagesCount] = useState<
    Record<string, { current: number; max: number }>
  >({});
  const isUploading = false;

  const isNewProduct = useCallback((createdAt: string) => {
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }, []);

  const handleImagesUpdate = useCallback(
    (itemId: string, imageCount: number, maxImages: number) => {
      console.log("📊 [handleImagesUpdate] Atualizando state:", {
        itemId,
        imageCount,
        maxImages,
      });
      setItemImagesCount((prev) => ({
        ...prev,
        [itemId]: { current: imageCount, max: maxImages },
      }));
    },
    []
  );

  // ❌ REMOVIDO: sessionStorage causava conflitos com dados do banco de dados
  // As customizações agora são salvas diretamente no carrinho/pedido e recuperadas de lá

  const handleCustomizationComplete = useCallback(
    (
      itemId: string,
      hasCustomizations: boolean,
      data: CustomizationInput[]
    ) => {
      if (hasCustomizations) {
        setItemCustomizations((prev) => ({
          ...prev,
          [itemId]: data,
        }));

        const hasBaseLayout = data.some(
          (c) => c.customizationType === CustomizationType.BASE_LAYOUT
        );

        if (hasBaseLayout) {
          setPreviewComponentId(itemId);
        }

        toast.success("Personalização salva!");
      } else {
        setItemCustomizations((prev) => {
          const copy = { ...prev };
          delete copy[itemId];
          return copy;
        });

        if (previewComponentId === itemId) {
          setPreviewComponentId(null);
        }

        toast.info("Personalização removida");
      }

      setActiveCustomizationModal(null);
    },
    [previewComponentId]
  );

  const handleAdditionalCustomizationComplete = useCallback(
    async (
      additionalId: string,
      hasCustomizations: boolean,
      data: CustomizationInput[]
    ) => {
      if (hasCustomizations) {
        setAdditionalCustomizations((prev) => {
          const updated = {
            ...prev,
            [additionalId]: data,
          };
          return updated;
        });

        toast.success("Personalização do adicional salva!");
      } else {
        setAdditionalCustomizations((prev) => {
          const copy = { ...prev };
          delete copy[additionalId];
          return copy;
        });

        toast.info("Personalização do adicional removida");
      }

      setActiveAdditionalModal(null);

      if (!product.id) return;

      try {
        const cartCustomizations: CartCustomization[] = [];

        const convertToCartCustomization = async (
          input: CustomizationInput,
          itemId: string
        ): Promise<CartCustomization | null> => {
          const data = input.data as Record<string, unknown>;
          const customizationName =
            (data._customizationName as string) || "Personalização";
          const priceAdjustment = (data._priceAdjustment as number) || 0;

          if (input.customizationType === "TEXT") {
            const textFields = Object.entries(data)
              .filter(
                ([key]) =>
                  key !== "_customizationName" && key !== "_priceAdjustment"
              )
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              title: customizationName,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: priceAdjustment,
              text: textFields || String(data || ""),
            };
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice = data as { id?: string; label?: string } | string;
            const optionId =
              typeof choice === "string" ? choice : choice.id || "";
            const optionLabel =
              typeof choice === "string" ? choice : choice.label || "";

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: priceAdjustment,
              selected_option: optionId,
              selected_option_label: optionLabel,
            };
          } else if (input.customizationType === "IMAGES") {
            // IMAGES agora tem a estrutura: { files: File[], previews: string[], count: number }
            const imagesData = data as {
              files?: File[];
              previews?: string[];
              count?: number;
            };

            const photos =
              imagesData.previews && imagesData.previews.length > 0
                ? await Promise.all(
                    imagesData.previews.map(async (preview, index) => {
                      // Tentar obter nome do arquivo se disponível
                      const file = imagesData.files?.[index];
                      const fileName = file?.name || `photo-${index + 1}.jpg`;

                      // 🔄 NOVO: Upload automático para /temp/upload ao adicionar a foto
                      let tempFileUrl = preview; // fallback para base64 se upload falhar
                      let uploadedFileName = "";
                      try {
                        if (file) {
                          console.log(
                            `📤 [IMAGES-1] Uploading file ${index}: ${fileName}`
                          );
                          const uploadResult = await uploadCustomizationImage(
                            file
                          );
                          if (uploadResult.success) {
                            tempFileUrl = uploadResult.imageUrl;
                            uploadedFileName = uploadResult.filename;
                            console.log(
                              `✅ [IMAGES-1] Upload bem-sucedido: ${uploadResult.imageUrl}`
                            );
                          } else {
                            console.warn(
                              `⚠️ [IMAGES-1] Upload falhou para ${fileName}, usando base64`
                            );
                          }
                        }
                      } catch (err) {
                        console.error(
                          `❌ [IMAGES-1] Erro ao fazer upload de ${fileName}:`,
                          err
                        );
                        // Continuar com base64 se upload falhar
                      }

                      return {
                        preview_url: tempFileUrl, // ✅ Será URL ou base64 como fallback
                        original_name: fileName,
                        temp_file_id:
                          uploadedFileName || `temp-${Date.now()}-${index}`,
                        position: index,
                        base64: preview, // ✅ Manter base64 como backup para Drive
                        mime_type: file?.type || "image/jpeg",
                        size: file?.size || 0,
                      };
                    })
                  )
                : [];

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              title: customizationName,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: priceAdjustment,
              photos: photos,
            };
          } else if (input.customizationType === "BASE_LAYOUT") {
            const layoutData = data as {
              id?: string;
              name?: string;
              model_url?: string;
              item_type?: string;
              images?: Array<{ slot?: string; url?: string }>;
              previewUrl?: string;
            };

            const imageCount = layoutData.images?.length || 0;

            const baseObj = {
              customization_id: input.ruleId || `item_${itemId}`,
              title: customizationName,
              customization_type: "BASE_LAYOUT" as const,
              is_required: false,
              price_adjustment: priceAdjustment,
              selected_item: {
                original_item: "Layout Base",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: priceAdjustment,
              },
              selected_item_label: `${
                layoutData.name || "Layout Personalizado"
              }${
                imageCount > 0
                  ? ` (${imageCount} foto${imageCount > 1 ? "s" : ""})`
                  : ""
              }`,
              text: undefined,
            };

            // ✅ Upload BASE_LAYOUT preview if it's base64
            let finalPreviewUrl = layoutData.previewUrl;
            if (
              layoutData.previewUrl &&
              layoutData.previewUrl.startsWith("data:image")
            ) {
              try {
                const fetchRes = await fetch(layoutData.previewUrl);
                const blob = await fetchRes.blob();
                const file = new File([blob], "base-layout-preview.png", {
                  type: "image/png",
                });

                console.log(`📤 [BASE_LAYOUT-Add] Uploading preview...`);
                const uploadResult = await uploadCustomizationImage(file);

                if (uploadResult.success) {
                  console.log(
                    `✅ [BASE_LAYOUT-Add] Upload OK: ${uploadResult.imageUrl}`
                  );
                  finalPreviewUrl = uploadResult.imageUrl;
                } else {
                  console.warn(
                    `⚠️ [BASE_LAYOUT-Add] Upload failed, falling back to base64`
                  );
                }
              } catch (err) {
                console.error(
                  `❌ [BASE_LAYOUT-Add] Error uploading preview:`,
                  err
                );
              }
            }

            return {
              ...baseObj,
              text: finalPreviewUrl,
            };
          }

          return null;
        };

        for (const component of components) {
          const componentCustomizations =
            itemCustomizations[component.id] || [];
          for (const custom of componentCustomizations) {
            const converted = await convertToCartCustomization(
              custom,
              component.id
            );
            if (converted) {
              cartCustomizations.push(converted);
            }
          }
        }

        if (hasCustomizations) {
          for (const custom of data) {
            const converted = await convertToCartCustomization(
              custom,
              additionalId
            );
            if (converted) {
              cartCustomizations.push(converted);
            }
          }
        }

        await addToCart(
          product.id,
          1,
          [additionalId],
          undefined,
          cartCustomizations.length > 0 ? cartCustomizations : undefined
        );

        toast.success("Adicional adicionado ao carrinho!");
      } catch (error) {
        console.error("Erro ao adicionar adicional ao carrinho:", error);
        toast.error("Erro ao adicionar adicional ao carrinho");
      }
    },
    [
      product.id,
      components,
      itemCustomizations,
      addToCart,
      uploadCustomizationImage,
    ]
  );

  const handleAddAdditionalToCart = useCallback(
    async (additionalId: string) => {
      console.log("🛒 [handleAddAdditionalToCart] Início:", { additionalId });

      if (!product.id) {
        toast.error("Produto não encontrado");
        return;
      }

      try {
        const savedCustomizations = additionalCustomizations[additionalId];
        const cartCustomizations: CartCustomization[] = [];

        const convertToCartCustomization = async (
          input: CustomizationInput,
          itemId: string
        ): Promise<CartCustomization | null> => {
          const data = input.data as Record<string, unknown>;
          const customizationName =
            (data._customizationName as string) || "Personalização";
          const priceAdjustment = (data._priceAdjustment as number) || 0;

          if (input.customizationType === "TEXT") {
            const textFields = Object.entries(data)
              .filter(
                ([key]) =>
                  key !== "_customizationName" && key !== "_priceAdjustment"
              )
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              componentId: itemId, // ✅ Add componentId
              title: customizationName,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: priceAdjustment,
              text: textFields || String(data || ""),
            };
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice = data as { id?: string; label?: string } | string;
            const optionId =
              typeof choice === "string" ? choice : choice.id || "";
            const optionLabel =
              typeof choice === "string" ? choice : choice.label || "";

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              componentId: itemId, // ✅ Add componentId
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: priceAdjustment,
              selected_option: optionId,
              selected_option_label: optionLabel,
            };
          } else if (input.customizationType === "IMAGES") {
            // IMAGES agora tem a estrutura: { files: File[], previews: string[], count: number }
            const imagesData = data as {
              files?: File[];
              previews?: string[];
              count?: number;
            };

            const photos =
              imagesData.previews && imagesData.previews.length > 0
                ? await Promise.all(
                    imagesData.previews.map(async (preview, index) => {
                      // Tentar obter nome do arquivo se disponível
                      const file = imagesData.files?.[index];
                      const fileName = file?.name || `photo-${index + 1}.jpg`;

                      // 🔄 NOVO: Upload automático para /temp/upload ao adicionar a foto
                      let tempFileUrl = preview; // fallback para base64 se upload falhar
                      let uploadedFileName = "";
                      try {
                        if (file) {
                          console.log(
                            `📤 [IMAGES-2] Uploading file ${index}: ${fileName}`
                          );
                          const uploadResult = await uploadCustomizationImage(
                            file
                          );
                          if (uploadResult.success) {
                            tempFileUrl = uploadResult.imageUrl;
                            uploadedFileName = uploadResult.filename;
                            console.log(
                              `✅ [IMAGES-2] Upload bem-sucedido: ${uploadResult.imageUrl}`
                            );
                          } else {
                            console.warn(
                              `⚠️ [IMAGES-2] Upload falhou para ${fileName}, usando base64`
                            );
                          }
                        }
                      } catch (err) {
                        console.error(
                          `❌ [IMAGES-2] Erro ao fazer upload de ${fileName}:`,
                          err
                        );
                        // Continuar com base64 se upload falhar
                      }

                      return {
                        preview_url: tempFileUrl, // ✅ Será URL ou base64 como fallback
                        original_name: fileName,
                        temp_file_id:
                          uploadedFileName || `temp-${Date.now()}-${index}`,
                        position: index,
                        base64: preview, // ✅ Manter base64 como backup para Drive
                        mime_type: file?.type || "image/jpeg",
                        size: file?.size || 0,
                      };
                    })
                  )
                : [];

            return {
              customization_id: input.ruleId || `item_${itemId}`,
              componentId: itemId, // ✅ Add componentId
              title: customizationName,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: priceAdjustment,
              photos: photos,
            };
          } else if (input.customizationType === "BASE_LAYOUT") {
            const layoutData = data as {
              id?: string;
              name?: string;
              previewUrl?: string;
            };

            const baseObj = {
              customization_id: input.ruleId || `item_${itemId}`,
              componentId: itemId, // ✅ Add componentId
              title: customizationName,
              customization_type: "BASE_LAYOUT" as const,
              is_required: false,
              price_adjustment: priceAdjustment,
              selected_item: {
                original_item: "Layout Base",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: priceAdjustment,
              },
              selected_item_label: layoutData.name || "Layout Personalizado",
              text: undefined,
            };

            // ✅ Upload BASE_LAYOUT preview if it's base64
            let finalPreviewUrl = layoutData.previewUrl;
            if (
              layoutData.previewUrl &&
              layoutData.previewUrl.startsWith("data:image")
            ) {
              try {
                const fetchRes = await fetch(layoutData.previewUrl);
                const blob = await fetchRes.blob();
                const file = new File([blob], "base-layout-preview.png", {
                  type: "image/png",
                });

                console.log(`📤 [BASE_LAYOUT-Add2] Uploading preview...`);
                const uploadResult = await uploadCustomizationImage(file);

                if (uploadResult.success) {
                  console.log(
                    `✅ [BASE_LAYOUT-Add2] Upload OK: ${uploadResult.imageUrl}`
                  );
                  finalPreviewUrl = uploadResult.imageUrl;
                } else {
                  console.warn(
                    `⚠️ [BASE_LAYOUT-Add2] Upload failed, falling back to base64`
                  );
                }
              } catch (err) {
                console.error(
                  `❌ [BASE_LAYOUT-Add2] Error uploading preview:`,
                  err
                );
              }
            }

            return {
              ...baseObj,
              text: finalPreviewUrl,
            };
          }

          return null;
        };

        // Adicionar customizações dos componentes do produto
        for (const component of components) {
          const componentCustomizations =
            itemCustomizations[component.id] || [];
          console.log(
            `🔍 [handleAddAdditionalToCart] Customizações do componente ${component.item.name}:`,
            componentCustomizations
          );
          for (const custom of componentCustomizations) {
            const converted = await convertToCartCustomization(
              custom,
              component.id
            );
            console.log(`🔄 [handleAddAdditionalToCart] Convertido:`, {
              original: custom,
              converted,
            });
            if (converted) {
              cartCustomizations.push(converted);
            }
          }
        }

        // Adicionar customizações do adicional se existirem
        if (savedCustomizations && savedCustomizations.length > 0) {
          console.log(
            `🔍 [handleAddAdditionalToCart] Customizações salvas do adicional:`,
            savedCustomizations
          );
          for (const custom of savedCustomizations) {
            const converted = await convertToCartCustomization(
              custom,
              additionalId
            );
            console.log(
              `🔄 [handleAddAdditionalToCart] Convertido (adicional):`,
              { original: custom, converted }
            );
            if (converted) {
              cartCustomizations.push(converted);
            }
          }
        }

        console.log(
          `📦 [handleAddAdditionalToCart] Total de customizações para carrinho:`,
          cartCustomizations
        );

        await addToCart(
          product.id,
          1,
          [additionalId],
          undefined,
          cartCustomizations.length > 0 ? cartCustomizations : undefined
        );

        toast.success("Adicional adicionado ao carrinho!");
      } catch (error) {
        console.error("Erro ao adicionar adicional ao carrinho:", error);
        toast.error("Erro ao adicionar adicional ao carrinho");
      }
    },
    [
      product.id,
      components,
      itemCustomizations,
      additionalCustomizations,
      addToCart,
      uploadCustomizationImage,
    ]
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
          setComponents(data.components);
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
        const mapped: ProductComponent[] = (data || []).map((item) => ({
          id: item.id, // Fallback: use item.id as component.id
          product_id: id,
          item_id: item.id,
          quantity: 1,
          item: item,
        }));
        setComponents(mapped);
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

  const currentProductionTime = useMemo(() => {
    let time = product.production_time || 0;

    // Check components for BASE_LAYOUT additional_time
    components.forEach((comp) => {
      const customizations = itemCustomizations[comp.id] || [];
      const baseLayout = customizations.find(
        (c) => c.customizationType === CustomizationType.BASE_LAYOUT
      );
      if (baseLayout) {
        // Check if data has additional_time
        const data = baseLayout.data as { additional_time?: number };
        if (data && typeof data.additional_time === "number") {
          time = Math.max(time, data.additional_time);
        }
      }
    });

    // Check additional customizations
    Object.values(additionalCustomizations)
      .flat()
      .forEach((cust) => {
        if (cust.customizationType === CustomizationType.BASE_LAYOUT) {
          const data = cust.data as { additional_time?: number };
          if (data && typeof data.additional_time === "number") {
            time = Math.max(time, data.additional_time);
          }
        }
      });

    return time;
  }, [
    product.production_time,
    components,
    itemCustomizations,
    additionalCustomizations,
  ]);

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

  const isItemInCart = useMemo(() => {
    if (!product.id) return false;

    // Verificar se existe algum item no carrinho com o mesmo product_id
    return cart.items.some((item) => item.product_id === product.id);
  }, [cart.items, product.id]);

  // const currentConfigSignature = useMemo(
  //   () => serializeCustomizationsSignature(cartCustomizations),
  //   [cartCustomizations]
  // );

  const currentImageUrl = useMemo(() => {
    if (previewComponentId) {
      const previewComponent = components.find(
        (c) => c.id === previewComponentId
      );
      if (previewComponent) {
        const componentCustomizations =
          itemCustomizations[previewComponentId] || [];
        const baseLayoutCustomization = componentCustomizations.find(
          (c) => c.customizationType === CustomizationType.BASE_LAYOUT
        );

        if (baseLayoutCustomization) {
          const layoutData = baseLayoutCustomization.data as
            | { id?: string; image_url?: string }
            | undefined;

          if (layoutData?.image_url) {
            return layoutData.image_url;
          }
        }

        return (
          previewComponent.item.image_url ||
          product.image_url ||
          "/placeholder.png"
        );
      }
    }

    if (selectedComponent && customizationPreviews[selectedComponent.id]) {
      return customizationPreviews[selectedComponent.id];
    }

    return (
      selectedComponent?.item.image_url ||
      product.image_url ||
      "/placeholder.png"
    );
  }, [
    selectedComponent,
    customizationPreviews,
    product.image_url,
    previewComponentId,
    components,
    itemCustomizations,
  ]);

  const currentName = selectedComponent?.item.name || product.name;

  const { shouldShow3D, modelUrl, textureUrl, shouldUse3D, itemType } =
    useMemo(() => {
      const componentToCheck = previewComponentId
        ? components.find((c) => c.id === previewComponentId)
        : selectedComponent;

      if (!componentToCheck)
        return {
          shouldShow3D: false,
          modelUrl: undefined,
          textureUrl: undefined,
          shouldUse3D: false,
          itemType: undefined,
        };
      if (!componentToCheck.item.allows_customization)
        return {
          shouldShow3D: false,
          modelUrl: undefined,
          textureUrl: undefined,
          shouldUse3D: false,
          itemType: undefined,
        };

      const componentCustomizations =
        itemCustomizations[componentToCheck.id] || [];
      const baseLayoutCustomization = componentCustomizations.find(
        (c) => c.customizationType === CustomizationType.BASE_LAYOUT
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

        // Verificar se tem dados necessários para 3D
        if (layoutData?.model_url && layoutData?.previewUrl) {
          // Apenas mostrar 3D para canecas, quadros devem usar preview 2D
          const detectedItemType = layoutData.item_type?.toLowerCase();
          const shouldUse3D = detectedItemType === "caneca";

          return {
            shouldShow3D: shouldUse3D,
            modelUrl: layoutData.model_url,
            textureUrl: layoutData.previewUrl,
            shouldUse3D: shouldUse3D,
            itemType: detectedItemType,
          };
        }
      }

      return {
        shouldShow3D: false,
        modelUrl: undefined,
        textureUrl: undefined,
        shouldUse3D: false,
        itemType: undefined,
      };
    }, [selectedComponent, itemCustomizations, previewComponentId, components]);

  const handleAddToCart = async () => {
    if (!product.id) return;

    if (isUploading) {
      toast.info("Aguarde finalizar o carregamento das personalizações.");
      return;
    }

    const missingCustomizations: string[] = [];

    components.forEach((component) => {
      if (!component.item.allows_customization) return;

      const requiredCustomizations =
        component.item.customizations?.filter((c) => c.isRequired) || [];
      const componentData = itemCustomizations[component.id] || [];

      requiredCustomizations.forEach((reqCustom) => {
        const hasData = componentData.some((c) => c.ruleId === reqCustom.id);

        if (!hasData) {
          missingCustomizations.push(
            `${component.item.name} - ${reqCustom.name}`
          );
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

              // ✅ Aceitar tanto data[field.id] quanto data.fields[field.id]
              const fieldsData =
                (data.fields as Record<string, string> | undefined) || data;

              const hasEmptyField = fields.some((field) => {
                const value = fieldsData[field.id];
                return (
                  !value || (typeof value === "string" && value.trim() === "")
                );
              });

              if (hasEmptyField) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (campo vazio)`
                );
              }
            }

            // Validar IMAGES
            if (reqCustom.type === "IMAGES") {
              // IMAGES agora tem a estrutura: { files: File[], previews: string[], count: number }
              const imagesData = data as {
                files?: File[];
                previews?: string[];
                count?: number;
              };

              console.log(`🔍 [Validação IMAGES] ${reqCustom.name}:`, {
                data,
                imagesData,
                hasFiles: imagesData?.files && Array.isArray(imagesData.files),
                filesLength: imagesData?.files?.length || 0,
              });

              const hasPhotos =
                imagesData?.files &&
                Array.isArray(imagesData.files) &&
                imagesData.files.length > 0;

              if (!hasPhotos) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (sem fotos)`
                );
              }
            }

            // Validar MULTIPLE_CHOICE
            if (reqCustom.type === "MULTIPLE_CHOICE") {
              const choice = data as
                | { id?: string; selected_option?: string }
                | undefined;
              // ✅ Aceitar tanto id quanto selected_option para compatibilidade
              const hasOptionSelected =
                choice && (choice.id || choice.selected_option);
              if (!hasOptionSelected) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (nenhuma opção selecionada)`
                );
              }
            }

            // Validar BASE_LAYOUT
            if (reqCustom.type === "BASE_LAYOUT") {
              const layout = data as
                | { id?: string; layout_id?: string }
                | undefined;
              // Aceitar tanto id quanto layout_id para compatibilidade
              const hasLayoutSelected =
                layout && (layout.id || layout.layout_id);
              if (!hasLayoutSelected) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (nenhum layout selecionado)`
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

      for (const [itemId, customizationInputs] of Object.entries(
        itemCustomizations
      )) {
        // ✅ itemId é na verdade o component.id (ProductComponent.id)
        const componentId = itemId;

        for (const input of customizationInputs) {
          const data = input.data as Record<string, unknown>;
          const customizationName =
            (data._customizationName as string) || "Personalização";

          // Converter baseado no tipo de customização
          if (input.customizationType === "TEXT") {
            const textFields = Object.entries(data)
              .filter(([key]) => key !== "_customizationName")
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            cartCustomizations.push({
              customization_id: input.ruleId || `item_${itemId}`,
              componentId, // ✅ Add componentId
              title: customizationName,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: 0,
              text: textFields || String(data || ""),
            });
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice = data as { id?: string; label?: string } | string;
            const optionId =
              typeof choice === "string" ? choice : choice.id || "";
            const optionLabel =
              typeof choice === "string" ? choice : choice.label || "";

            cartCustomizations.push({
              customization_id: input.ruleId || `item_${itemId}`,
              componentId, // ✅ Add componentId
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: 0,
              selected_option: optionId,
              selected_option_label: optionLabel,
            });
          } else if (input.customizationType === "IMAGES") {
            // IMAGES agora tem a estrutura: { files: File[], previews: string[], count: number }
            const imagesData = data as {
              files?: File[];
              previews?: string[];
              count?: number;
            };

            const photos =
              imagesData.previews && imagesData.previews.length > 0
                ? await Promise.all(
                    imagesData.previews.map(async (preview, index) => {
                      // Tentar obter nome do arquivo se disponível
                      const file = imagesData.files?.[index];
                      const fileName = file?.name || `photo-${index + 1}.jpg`;

                      // 🔄 NOVO: Upload automático para /temp/upload ao adicionar a foto
                      let tempFileUrl = preview; // fallback para base64 se upload falhar
                      let uploadedFileName = "";
                      try {
                        if (file) {
                          console.log(
                            `📤 [IMAGES-3] Uploading file ${index}: ${fileName}`
                          );
                          const uploadResult = await uploadCustomizationImage(
                            file
                          );
                          if (uploadResult.success) {
                            tempFileUrl = uploadResult.imageUrl;
                            uploadedFileName = uploadResult.filename;
                            console.log(
                              `✅ [IMAGES-3] Upload bem-sucedido: ${uploadResult.imageUrl}`
                            );
                          } else {
                            console.warn(
                              `⚠️ [IMAGES-3] Upload falhou para ${fileName}, usando base64`
                            );
                          }
                        }
                      } catch (err) {
                        console.error(
                          `❌ [IMAGES-3] Erro ao fazer upload de ${fileName}:`,
                          err
                        );
                        // Continuar com base64 se upload falhar
                      }

                      return {
                        preview_url: tempFileUrl, // ✅ Será URL ou base64 como fallback
                        original_name: fileName,
                        temp_file_id:
                          uploadedFileName || `temp-${Date.now()}-${index}`,
                        position: index,
                        base64: preview, // ✅ Manter base64 como backup para Drive
                        mime_type: file?.type || "image/jpeg",
                        size: file?.size || 0,
                      };
                    })
                  )
                : [];

            cartCustomizations.push({
              customization_id: input.ruleId || `item_${itemId}`,
              componentId, // ✅ Add componentId
              title: customizationName,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: 0,
              photos: photos,
            });
          } else if (input.customizationType === "BASE_LAYOUT") {
            const layoutData = data as {
              id?: string;
              name?: string;
              model_url?: string;
              item_type?: string;
              images?: Array<{ slot?: string; url?: string }>;
              previewUrl?: string;
              additional_time?: number;
            };

            const imageCount = layoutData.images?.length || 0;

            const cartCustomization: CartCustomization = {
              customization_id: input.ruleId || `item_${itemId}`,
              componentId, // ✅ Add componentId
              title: customizationName,
              customization_type: "BASE_LAYOUT",
              is_required: false,
              price_adjustment: 0,
              selected_item: {
                original_item: "Layout Base",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: 0,
              },
              selected_item_label: `${
                layoutData.name || "Layout Personalizado"
              }${
                imageCount > 0
                  ? ` (${imageCount} foto${imageCount > 1 ? "s" : ""})`
                  : ""
              }`,
              text: undefined,
              additional_time: layoutData.additional_time || 0,
            };

            // ✅ Upload BASE_LAYOUT preview if it's base64
            let finalPreviewUrl = layoutData.previewUrl;
            if (
              layoutData.previewUrl &&
              layoutData.previewUrl.startsWith("data:image")
            ) {
              try {
                const fetchRes = await fetch(layoutData.previewUrl);
                const blob = await fetchRes.blob();
                const file = new File([blob], "base-layout-preview.png", {
                  type: "image/png",
                });

                console.log(`📤 [BASE_LAYOUT-AddToCart] Uploading preview...`);
                const uploadResult = await uploadCustomizationImage(file);

                if (uploadResult.success) {
                  console.log(
                    `✅ [BASE_LAYOUT-AddToCart] Upload OK: ${uploadResult.imageUrl}`
                  );
                  finalPreviewUrl = uploadResult.imageUrl;
                } else {
                  console.warn(
                    `⚠️ [BASE_LAYOUT-AddToCart] Upload failed, falling back to base64`
                  );
                }
              } catch (err) {
                console.error(
                  `❌ [BASE_LAYOUT-AddToCart] Error uploading preview:`,
                  err
                );
              }
            }
            cartCustomization.text = finalPreviewUrl;

            cartCustomizations.push(cartCustomization);
          }
        }
      }

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
        <div className="animate-pulse flex flex-col items-center">
          <Image
            src="/logocestodamore.png"
            alt="Cesto d'Amore"
            className="w-14 h-14"
            width={56}
            height={56}
          />
        </div>
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
            href={
              product.categories?.[0]
                ? `/categorias/${product.categories[0].id}`
                : "#"
            }
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
              ) : itemType === "quadro" && textureUrl ? (
                // Apresentação especial para quadros - moldura decorativa
                <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
                  <div className="relative w-full h-full max-w-[60%] max-h-[80%] shadow-2xl">
                    {/* Moldura externa dourada */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700 rounded-sm p-[8px] shadow-lg">
                      {/* Moldura interna com detalhes */}
                      <div className="w-full h-full bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-sm p-[4px]">
                        {/* Área interna da moldura */}
                        <div className="relative w-full h-full bg-white rounded-sm overflow-hidden">
                          <Image
                            src={textureUrl}
                            alt={currentName}
                            fill
                            className="object-contain p-1"
                            priority
                          />
                        </div>
                      </div>
                    </div>
                    {/* Sombra decorativa */}
                    <div className="absolute -bottom-2 -right-2 w-full h-full bg-black/20 rounded-sm -z-10 blur-sm"></div>
                  </div>
                </div>
              ) : (
                <Image
                  src={getInternalImageUrl(currentImageUrl)}
                  alt={currentName}
                  fill
                  className={cn(
                    "rounded-lg bg-white",
                    shouldUse3D || itemType === "quadro"
                      ? "object-contain"
                      : "object-cover"
                  )}
                  priority
                />
              )}
              {hasDiscount ? (
                <Badge className="absolute top-3 right-3 bg-red-500 hover:bg-red-600">
                  -{product.discount}%
                </Badge>
              ) : null}

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
                      src={
                        getInternalImageUrl(product.image_url) ||
                        "/placeholder.png"
                      }
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
                      title={component.item.name}
                    >
                      <Button
                        asChild
                        className="w-full h-full p-0 rounded-lg overflow-hidden"
                        onClick={() => setSelectedComponent(component)}
                        aria-label={`Selecionar componente ${component.item.name}`}
                      >
                        <Image
                          src={
                            getInternalImageUrl(component.item.image_url) ||
                            "/placeholder.png"
                          }
                          alt={component.item.name}
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
                {product.created_at && isNewProduct(product.created_at) && (
                  <>
                    <span className="bg-blue-500 text-sm md:text-base text-white rounded px-2 py-0.5">
                      Novo
                    </span>
                    <Separator orientation="vertical" />
                  </>
                )}
                <span className="text-sm md:text-base text-gray-500">
                  +{Math.floor(Math.random() * (1500 - 300 + 1)) + 300} Vendidos
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
              <div
                className={cn(
                  "flex w-fit items-center gap-2 text-sm bg-neutral-500 text-white mt-4 px-2 py-1 rounded-full",
                  currentProductionTime && currentProductionTime > 1
                    ? ""
                    : "bg-green-500"
                )}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {currentProductionTime && currentProductionTime > 1
                    ? `Tempo de produção: ${currentProductionTime} horas`
                    : "Produção imediata"}
                  {currentProductionTime > (product.production_time || 0) && (
                    <span className="ml-1 text-xs opacity-90">
                      (Layout personalizado)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col h-fit overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {components.filter((c) => c.item.allows_customization).length >
                  0 && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      Personalizações Disponíveis
                    </h3>

                    <div className="space-y-2">
                      {components
                        .filter((c) => c.item.allows_customization)
                        .map((component) => {
                          const hasCustomizations =
                            itemCustomizations[component.id]?.length > 0;
                          const requiredCount =
                            component.item.customizations?.filter(
                              (c) => c.isRequired
                            ).length || 0;
                          const totalCount =
                            component.item.customizations?.length || 0;

                          const hasBaseLayout =
                            component.item.customizations?.some(
                              (c) => c.type === "BASE_LAYOUT"
                            );

                          return (
                            <Button
                              key={component.id}
                              onClick={() => {
                                if (hasBaseLayout && hasCustomizations) {
                                  setPreviewComponentId(component.id);
                                }
                                setActiveCustomizationModal(component.id);
                              }}
                              variant="outline"
                              className="w-full justify-between h-auto py-3 px-3 flex-wrap sm:flex-nowrap gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-md overflow-hidden flex-shrink-0">
                                  <Image
                                    src={
                                      getInternalImageUrl(
                                        component.item.image_url
                                      ) || "/placeholder.png"
                                    }
                                    alt={component.item.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <p className="font-medium text-sm sm:text-base truncate">
                                    {component.item.name}{" "}
                                    {requiredCount > 0 && (
                                      <span className="text-red-500">*</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-xs text-gray-500">
                                      {totalCount} opç
                                      {totalCount === 1 ? "ão" : "ões"}
                                    </span>
                                    {itemImagesCount[component.id] && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        {itemImagesCount[component.id].current}/
                                        {itemImagesCount[component.id].max}{" "}
                                        fotos
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {hasCustomizations && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 text-xs py-0 px-1"
                                  >
                                    ✓
                                  </Badge>
                                )}
                                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 flex-shrink-0" />
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
                    {isItemInCart
                      ? "Já adicionado ao carrinho"
                      : `Adicionar por ${formatCurrency(
                          totalPriceForQuantity
                        )}`}
                  </>
                )}
              </Button>
            </div>
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">Adicionais</h2>
                <span className="text-sm opacity-50">
                  {(() => {
                    const hasProductRequiredCustomizations = components.some(
                      (component) =>
                        component.item.customizations?.some((c) => c.isRequired)
                    );

                    let hasCompletedProductCustomizations = true;
                    if (hasProductRequiredCustomizations) {
                      hasCompletedProductCustomizations = components.every(
                        (component) => {
                          const requiredCustomizations =
                            component.item.customizations?.filter(
                              (c) => c.isRequired
                            ) || [];
                          if (requiredCustomizations.length === 0) return true;

                          const componentData =
                            itemCustomizations[component.id] || [];
                          return requiredCustomizations.every((reqCustom) =>
                            componentData.some((c) => c.ruleId === reqCustom.id)
                          );
                        }
                      );
                    }

                    return hasCompletedProductCustomizations ? (
                      <strong className="text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="inline-block ml-1 w-4 h-4" />
                        Selecione os adicionais desejados
                      </strong>
                    ) : (
                      <strong className="text-red-500">
                        Termine de customizar o produto para acrescentar
                        adicionais
                      </strong>
                    );
                  })()}
                </span>
              </div>
              {additionals.length > 0 ? (
                <div className="flex items-center w-full">
                  <div className="flex gap-4 items-center w-full overflow-x-scroll scrollbar-hide py-2">
                    {additionals.map((additional) => {
                      const hasProductRequiredCustomizations = components.some(
                        (component) =>
                          component.item.customizations?.some(
                            (c) => c.isRequired
                          )
                      );
                      let hasCompletedProductCustomizations = true;
                      if (hasProductRequiredCustomizations) {
                        hasCompletedProductCustomizations = components.every(
                          (component) => {
                            const requiredCustomizations =
                              component.item.customizations?.filter(
                                (c) => c.isRequired
                              ) || [];
                            if (requiredCustomizations.length === 0)
                              return true;
                            const componentData =
                              itemCustomizations[component.id] || [];
                            return requiredCustomizations.every((reqCustom) =>
                              componentData.some(
                                (c) => c.ruleId === reqCustom.id
                              )
                            );
                          }
                        );
                      }
                      return (
                        <AdditionalCard
                          key={additional.id}
                          additional={additional}
                          productId={product.id}
                          onCustomizeClick={(additionalId) =>
                            setActiveAdditionalModal(additionalId)
                          }
                          onAddToCart={handleAddAdditionalToCart}
                          hasCustomizations={
                            !!additionalCustomizations[additional.id]
                          }
                          hasProductRequiredCustomizations={
                            hasProductRequiredCustomizations
                          }
                          hasCompletedProductCustomizations={
                            hasCompletedProductCustomizations
                          }
                        />
                      );
                    })}
                  </div>
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
              <div className="flex gap-4 items-center w-full overflow-x-scroll scrollbar-hide py-2">
                {product.related_products.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    className="w-[160px] md:w-[240px] flex-none"
                    props={{
                      id: relatedProduct.id,
                      name: relatedProduct.name,
                      image_url: relatedProduct.image_url || "/placeholder.png",
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
        .filter((c) => c.item.allows_customization)
        .map((component) => (
          <ItemCustomizationModal
            key={component.id}
            isOpen={activeCustomizationModal === component.id}
            onClose={() => setActiveCustomizationModal(null)}
            itemId={component.item.id}
            itemName={component.item.name}
            customizations={(component.item.customizations || []).map((c) => ({
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
            onImagesUpdate={(id, current, max) =>
              handleImagesUpdate(component.id, current, max)
            }
          />
        ))}

      {/* Modais de customização de adicionais */}
      {additionals
        .filter((a) => a.allows_customization)
        .map((additional) => (
          <ItemCustomizationModal
            key={additional.id}
            isOpen={activeAdditionalModal === additional.id}
            onClose={() => setActiveAdditionalModal(null)}
            itemId={additional.id}
            itemName={additional.name}
            customizations={(additional.customizations || []).map((c) => ({
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
              handleAdditionalCustomizationComplete(
                additional.id,
                hasCustomizations,
                data
              )
            }
            onImagesUpdate={handleImagesUpdate}
          />
        ))}
    </div>
  );
};

export default ClientProductPage;
