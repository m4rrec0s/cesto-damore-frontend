"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useLayoutApi } from "@/app/hooks/use-layout-api";
import { sanitizeProductDescription } from "@/app/utils/descriptionSanitizer";
import { Model3DViewer } from "./Model3DViewer";
import { MockupGallery } from "./MockupGallery";
import AdditionalCard from "./additional-card";
import Link from "next/link";
import { ProductCard } from "@/app/components/layout/product-card";
import { useRouter } from "next/navigation";
import {
  CustomizationType,
  type CustomizationInput,
} from "@/app/types/customization";
import type { SlotDef } from "@/app/types/personalization";
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
  const [activeCustomizationModal, setActiveCustomizationModal] = useState<
    string | null
  >(null);
  const [activeAdditionalModal, setActiveAdditionalModal] = useState<
    string | null
  >(null);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(
    null,
  );
  const [itemImagesCount, setItemImagesCount] = useState<
    Record<string, { current: number; max: number }>
  >({});
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<string[]>(
    [],
  );
  const { fetchPublicLayouts } = useLayoutApi();
  const [availableLayoutsByComponent, setAvailableLayoutsByComponent] =
    useState<Record<string, any[]>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingLayouts, setLoadingLayouts] = useState(false);
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
      setItemImagesCount((prev) => ({
        ...prev,
        [itemId]: { current: imageCount, max: maxImages },
      }));
    },
    [],
  );

  const handleCustomizationComplete = useCallback(
    (
      itemId: string,
      hasCustomizations: boolean,
      data: CustomizationInput[],
    ) => {
      if (hasCustomizations) {
        setItemCustomizations((prev) => ({
          ...prev,
          [itemId]: data,
        }));

        const hasBaseLayout = data.some(
          (c) => c.customizationType === CustomizationType.DYNAMIC_LAYOUT,
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
    [previewComponentId],
  );

  const handleAdditionalCustomizationComplete = useCallback(
    async (
      additionalId: string,
      hasCustomizations: boolean,
      data: CustomizationInput[],
    ) => {
      if (hasCustomizations) {
        setAdditionalCustomizations((prev) => {
          const updated = {
            ...prev,
            [additionalId]: data,
          };
          return updated;
        });

        setSelectedAdditionalIds((prev) =>
          prev.includes(additionalId) ? prev : [...prev, additionalId],
        );

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

    },
    [],
  );

  const handleAddAdditionalToCart = useCallback(
    async (additionalId: string) => {
      setSelectedAdditionalIds((prev) =>
        prev.includes(additionalId)
          ? prev.filter((id) => id !== additionalId)
          : [...prev, additionalId],
      );

      const isAdding = !selectedAdditionalIds.includes(additionalId);
      if (isAdding) {
        toast.success("Adicional selecionado!");
      } else {
        toast.info("Adicional removido da seleção");
      }
    },
    [selectedAdditionalIds],
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
          fetchDesignsForComponents(data.components);
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

    const fetchDesignsForComponents = async (comps: ProductComponent[]) => {
      try {
        setLoadingLayouts(true);
        const layoutsMap: Record<string, any[]> = {};

        for (const comp of comps) {
          const layoutCustomization = comp.item.customizations?.find(
            (c) => c.type === "DYNAMIC_LAYOUT",
          );

          if (layoutCustomization) {
            const data = layoutCustomization.customization_data as any;
            let layouts: any[] = [];

            if (data?.autoSelectSameType) {
              const itemTypeUpper = comp.item.name
                .toUpperCase()
                .includes("CANECA")
                ? "CANECA"
                : comp.item.name.toUpperCase().includes("QUADRO")
                  ? "QUADRO"
                  : "QUEBRA_CABECA";

              layouts = await fetchPublicLayouts(itemTypeUpper);
            } else if (data?.layoutIds && Array.isArray(data.layoutIds)) {
              const allLayouts = await fetchPublicLayouts();
              layouts = allLayouts.filter((l) => data.layoutIds.includes(l.id));
            }

            if (layouts.length > 0) {
              layoutsMap[comp.id] = layouts;
            }
          }
        }

        setAvailableLayoutsByComponent(layoutsMap);
      } catch (error) {
        console.error("Erro ao carregar designs:", error);
      } finally {
        setLoadingLayouts(false);
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
          id: item.id,
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
  }, [
    id,
    getProduct,
    getAdditionalsByProduct,
    getItemsByProduct,
    fetchPublicLayouts,
  ]);

  const customizationTotal = useMemo(() => 0, []);

  const currentProductionTime = useMemo(() => {
    let time = product.production_time || 0;

    components.forEach((comp) => {
      const customizations = itemCustomizations[comp.id] || [];
      const baseLayout = customizations.find(
        (c) => c.customizationType === CustomizationType.DYNAMIC_LAYOUT,
      );
      if (baseLayout) {
        const data = baseLayout.data as { additional_time?: number };
        if (data && typeof data.additional_time === "number") {
          time = Math.max(time, data.additional_time);
        }
      }
    });

    Object.values(additionalCustomizations)
      .flat()
      .forEach((cust) => {
        if (cust.customizationType === CustomizationType.DYNAMIC_LAYOUT) {
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
    [basePrice, customizationTotal],
  );

  const totalPriceForQuantity = useMemo(
    () => unitPriceWithCustomizations * quantity,
    [unitPriceWithCustomizations, quantity],
  );

  const isItemInCart = useMemo(() => {
    if (!product.id) return false;

    return cart.items.some((item) => item.product_id === product.id);
  }, [cart.items, product.id]);

  const { shouldShow3D, modelUrl, textureUrl, itemType } = useMemo(() => {

    const componentsToSearch = [
      ...(previewComponentId
        ? [components.find((c) => c.id === previewComponentId)]
        : []),
      ...(selectedComponent ? [selectedComponent] : []),
      ...components.filter((c) => c.item.allows_customization),
    ].filter(Boolean) as ProductComponent[];

    for (const component of componentsToSearch) {
      const customizations = itemCustomizations[component.id] || [];
      const layoutCustomization = customizations.find(
        (c) => c.customizationType === CustomizationType.DYNAMIC_LAYOUT,
      );

      if (layoutCustomization) {
        const layoutData = layoutCustomization.data as any;
        if (layoutData?.previewUrl) {
          const detectedItemType = layoutData.item_type?.toLowerCase();
          const isMug =
            detectedItemType === "mug" || detectedItemType === "caneca";

          return {
            shouldShow3D: isMug,
            modelUrl: layoutData.model_url,
            textureUrl: layoutData.previewUrl,
            itemType: detectedItemType,
          };
        }
      }
    }

    return {
      shouldShow3D: false,
      modelUrl: undefined,
      textureUrl: undefined,
      itemType: undefined,
    };
  }, [itemCustomizations, previewComponentId, selectedComponent, components]);

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
            `${component.item.name} - ${reqCustom.name}`,
          );
        } else {

          const customData = componentData.find(
            (c) => c.ruleId === reqCustom.id,
          );
          if (customData) {
            const data = customData.data as Record<string, unknown>;

            if (reqCustom.type === "TEXT") {
              const fields =
                (
                  reqCustom.customization_data as {
                    fields?: Array<{ id: string }>;
                  }
                )?.fields || [];

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
                  `${component.item.name} - ${reqCustom.name} (campo vazio)`,
                );
              }
            }

            if (reqCustom.type === "IMAGES") {

              const imagesData = data as {
                files?: File[];
                previews?: string[];
                count?: number;
              };

              const hasPhotos =
                imagesData?.files &&
                Array.isArray(imagesData.files) &&
                imagesData.files.length > 0;

              if (!hasPhotos) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (sem fotos)`,
                );
              }
            }

            if (reqCustom.type === "MULTIPLE_CHOICE") {
              const choice = data as
                | { id?: string; selected_option?: string }
                | undefined;

              const hasOptionSelected =
                choice && (choice.id || choice.selected_option);
              if (!hasOptionSelected) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (nenhuma opção selecionada)`,
                );
              }
            }

            if (reqCustom.type === "DYNAMIC_LAYOUT") {
              const layout = data as
                | { id?: string; layout_id?: string }
                | undefined;

              const hasLayoutSelected =
                layout && (layout.id || layout.layout_id);
              if (!hasLayoutSelected) {
                missingCustomizations.push(
                  `${component.item.name} - ${reqCustom.name} (nenhum layout selecionado)`,
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
        { duration: 5000 },
      );
      return;
    }

    setAddingToCart(true);

    try {

      const cartCustomizations: CartCustomization[] = [];

      for (const [itemId, customizationInputs] of Object.entries(
        itemCustomizations,
      )) {

        const componentId = itemId;

        for (const input of customizationInputs) {
          const data = input.data as Record<string, unknown>;
          const customizationName =
            (data._customizationName as string) || "Personalização";

          if (input.customizationType === "TEXT") {
            const textFields = Object.entries(data)
              .filter(([key]) => key !== "_customizationName")
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: 0,
              text: textFields || String(data || ""),
              data: data,
            });
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice = data as { id?: string; label?: string } | string;
            const optionId =
              typeof choice === "string" ? choice : choice.id || "";
            const optionLabel =
              typeof choice === "string" ? choice : choice.label || "";

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: 0,
              selected_option: optionId,
              selected_option_label: optionLabel,
              data: data,
            });
          } else if (input.customizationType === "IMAGES") {

            const imagesData = data as {
              files?: File[];
              previews?: string[];
              count?: number;
            };

            const photos =
              imagesData.previews && imagesData.previews.length > 0
                ? await Promise.all(
                    imagesData.previews.map(async (preview, index) => {

                      const file = imagesData.files?.[index];
                      const fileName = file?.name || `photo-${index + 1}.jpg`;

                      let tempFileUrl = preview;
                      let uploadedFileName = "";
                      try {
                        if (file) {
                          const uploadResult =
                            await uploadCustomizationImage(file);
                          if (uploadResult.success) {
                            tempFileUrl = uploadResult.imageUrl;
                            uploadedFileName = uploadResult.filename;
                          } else {
                            console.warn(
                              `⚠️ [IMAGES-3] Upload falhou para ${fileName}, usando base64`,
                            );
                          }
                        }
                      } catch (err) {
                        console.error(
                          `❌ [IMAGES-3] Erro ao fazer upload de ${fileName}:`,
                          err,
                        );

                      }

                      return {
                        preview_url: tempFileUrl,
                        original_name: fileName,
                        temp_file_id:
                          uploadedFileName || `temp-${Date.now()}-${index}`,
                        position: index,
                        base64: preview,
                        mime_type: file?.type || "image/jpeg",
                        size: file?.size || 0,
                      };
                    }),
                  )
                : [];

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: 0,
              photos: photos,
              data: data,
            });
          } else if (input.customizationType === "DYNAMIC_LAYOUT") {
            const layoutData = data as {
              id?: string;
              name?: string;
              model_url?: string;
              item_type?: string;
              images?: Array<{ slot?: string; url?: string }>;
              previewUrl?: string;
              additional_time?: number;
              productionTime?: number;
              fabricState?: string;
              highQualityUrl?: string;
            };

            const imageCount = layoutData.images?.length || 0;

            const cartCustomization: CartCustomization = {
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "DYNAMIC_LAYOUT",
              is_required: false,
              price_adjustment: 0,
              selected_item: {
                original_item: "Design Dinâmico",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: 0,
              },
              selected_item_label: `${
                layoutData.name || "Design Personalizado"
              }${
                imageCount > 0
                  ? ` (${imageCount} foto${imageCount > 1 ? "s" : ""})`
                  : ""
              }`,
              text: undefined,
              additional_time:
                layoutData.productionTime ?? layoutData.additional_time ?? 0,
              fabricState: layoutData.fabricState,
              data: layoutData,
            };

            const finalImageToUpload =
              layoutData.highQualityUrl || layoutData.previewUrl;
            let finalPreviewUrl = layoutData.previewUrl;

            if (
              finalImageToUpload &&
              finalImageToUpload.startsWith("data:image")
            ) {
              try {
                const fetchRes = await fetch(finalImageToUpload);
                const blob = await fetchRes.blob();
                const file = new File([blob], "design-final.png", {
                  type: "image/png",
                });

                const uploadResult = await uploadCustomizationImage(file);

                if (uploadResult.success) {
                  finalPreviewUrl = uploadResult.imageUrl;
                } else {
                  console.warn(
                    `⚠️ [DYNAMIC_LAYOUT-AddToCart] Upload failed, falling back to base64`,
                  );
                }
              } catch (err) {
                console.error(
                  `❌ [DYNAMIC_LAYOUT-AddToCart] Error uploading final image:`,
                  err,
                );
              }
            }
            cartCustomization.text = finalPreviewUrl;

            cartCustomizations.push(cartCustomization);
          }
        }
      }

      for (const additionalId of selectedAdditionalIds) {
        const additionalCustoms = additionalCustomizations[additionalId];
        if (!additionalCustoms) continue;

        for (const input of additionalCustoms) {
          const data = input.data as Record<string, unknown>;
          const customizationName =
            (data._customizationName as string) || "Personalização";

          if (input.customizationType === "TEXT") {
            const textFields = Object.entries(data)
              .filter(([key]) => key !== "_customizationName")
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "TEXT",
              is_required: false,
              price_adjustment: 0,
              text: textFields || String(data || ""),
              data: data,
            });
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice = data as { id?: string; label?: string } | string;
            const optionId =
              typeof choice === "string" ? choice : choice.id || "";
            const optionLabel =
              typeof choice === "string" ? choice : choice.label || "";

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: false,
              price_adjustment: 0,
              selected_option: optionId,
              selected_option_label: optionLabel,
              data: data,
            });
          } else if (input.customizationType === "IMAGES") {
            const imagesData = data as {
              files?: File[];
              previews?: string[];
              count?: number;
            };

            const photos =
              imagesData.previews && imagesData.previews.length > 0
                ? await Promise.all(
                    imagesData.previews.map(async (preview, index) => {
                      const file = imagesData.files?.[index];
                      const fileName = file?.name || `photo-${index + 1}.jpg`;
                      let tempFileUrl = preview;
                      let uploadedFileName = "";
                      try {
                        if (file) {
                          const uploadResult =
                            await uploadCustomizationImage(file);
                          if (uploadResult.success) {
                            tempFileUrl = uploadResult.imageUrl;
                            uploadedFileName = uploadResult.filename;
                          }
                        }
                      } catch (err) {
                        console.error(err);
                      }

                      return {
                        preview_url: tempFileUrl,
                        original_name: fileName,
                        temp_file_id:
                          uploadedFileName || `temp-${Date.now()}-${index}`,
                        position: index,
                        base64: preview,
                        mime_type: file?.type || "image/jpeg",
                        size: file?.size || 0,
                      };
                    }),
                  )
                : [];

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "IMAGES",
              is_required: false,
              price_adjustment: 0,
              photos: photos,
              data: data,
            });
          } else if (input.customizationType === "DYNAMIC_LAYOUT") {
            const layoutData = data as {
              id?: string;
              name?: string;
              previewUrl?: string;
              productionTime?: number;
              fabricState?: string;
              highQualityUrl?: string;
            };

            const cartCustomization: CartCustomization = {
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "DYNAMIC_LAYOUT",
              is_required: false,
              price_adjustment: 0,
              selected_item: {
                original_item: "Design Dinâmico",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: 0,
              },
              selected_item_label: layoutData.name || "Design Personalizado",
              text: undefined,
              additional_time: layoutData.productionTime ?? 0,
              fabricState: layoutData.fabricState,
              data: layoutData,
            };

            const finalImageToUpload =
              layoutData.highQualityUrl || layoutData.previewUrl;
            let finalPreviewUrl = layoutData.previewUrl;

            if (
              finalImageToUpload &&
              finalImageToUpload.startsWith("data:image")
            ) {
              try {
                const fetchRes = await fetch(finalImageToUpload);
                const blob = await fetchRes.blob();
                const file = new File([blob], "design-final.png", {
                  type: "image/png",
                });

                const uploadResult = await uploadCustomizationImage(file);

                if (uploadResult.success) {
                  finalPreviewUrl = uploadResult.imageUrl;
                } else {
                  console.warn(
                    "⚠️ [DYNAMIC_LAYOUT-AddToCart] Upload failed for additional, falling back to base64",
                  );
                }
              } catch (err) {
                console.error(
                  "❌ [DYNAMIC_LAYOUT-AddToCart] Error uploading final image for additional:",
                  err,
                );
              }
            }

            cartCustomization.text = finalPreviewUrl;

            cartCustomizations.push(cartCustomization);
          }
        }
      }

      await addToCart(
        product.id,
        quantity,
        selectedAdditionalIds.length > 0 ? selectedAdditionalIds : undefined,
        undefined,
        cartCustomizations,
      );
      toast.success("Produto adicionado ao carrinho!");

      setSelectedAdditionalIds([]);
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        <nav className="text-xs sm:text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Início
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={
              product.categories?.[0]
                ? `/categorias/${product.categories[0].id}`
                : "#"
            }
            className="hover:text-gray-900 transition-colors"
          >
            {product.categories?.[0]?.name || "Produtos"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          <div className="space-y-6">
            
            <div className="relative aspect-square w-full bg-gray-50 rounded-2xl overflow-hidden">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white shadow-sm rounded-full w-10 h-10 p-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Image
                src={getInternalImageUrl(
                  product.image_url || "/placeholder.png",
                )}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />

              {hasDiscount && (
                <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white">
                  -{product.discount}%
                </Badge>
              )}

              {product.created_at && isNewProduct(product.created_at) && (
                <Badge className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white">
                  Novo
                </Badge>
              )}
            </div>

            
            {textureUrl && (
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Sua Personalização
                  </h3>
                  <Badge variant="outline" className="text-xs font-medium">
                    Preview
                  </Badge>
                </div>

                <div className="relative aspect-square w-full bg-white rounded-xl overflow-hidden">
                  {shouldShow3D &&
                  modelUrl &&
                  (itemType === "mug" || itemType === "caneca") ? (
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
                  ) : itemType === "frame" || itemType === "quadro" ? (
                    <MockupGallery
                      designUrl={textureUrl}
                      itemType={itemType}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full p-6">
                      <div className="relative w-full h-full">
                        <Image
                          src={textureUrl}
                          alt="Preview Personalizado"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Preview aproximado do resultado final
                </p>
              </div>
            )}

            
            {components && components.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Componentes
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <div
                    className={cn(
                      "relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-xl border-2 cursor-pointer transition-all",
                      selectedComponent === null
                        ? "border-gray-900 ring-2 ring-gray-200"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    onClick={() => setSelectedComponent(null)}
                  >
                    <Image
                      src={
                        getInternalImageUrl(product.image_url) ||
                        "/placeholder.png"
                      }
                      alt={product.name || "Produto"}
                      fill
                      className="object-cover rounded-xl"
                      priority
                    />
                  </div>

                  {components.map((component) => (
                    <div
                      key={component.id}
                      className={cn(
                        "relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-xl border-2 cursor-pointer transition-all",
                        selectedComponent?.id === component.id
                          ? "border-gray-900 ring-2 ring-gray-200"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                      onClick={() => setSelectedComponent(component)}
                    >
                      <Image
                        src={
                          getInternalImageUrl(component.item.image_url) ||
                          "/placeholder.png"
                        }
                        alt={component.item.name}
                        fill
                        className="object-cover rounded-xl"
                        priority
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Descrição
              </h3>
              <div className="prose prose-sm max-w-none text-gray-600">
                {product.description ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description) }}
                  />
                ) : (
                  <p className="text-gray-400 italic">
                    Sem descrição disponível.
                  </p>
                )}
              </div>
            </div>
          </div>

          
          <div className="space-y-6">
            
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>
                  +{Math.floor(Math.random() * (1500 - 300 + 1)) + 300} vendidos
                </span>
              </div>

              <div className="space-y-2">
                {hasDiscount ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                        {formatCurrency(basePrice)}
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Economize {formatCurrency(product.price - basePrice)}
                    </p>
                  </div>
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                    {formatCurrency(product.price || 0)}
                  </span>
                )}
              </div>

              
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                  currentProductionTime && currentProductionTime > 1
                    ? "bg-gray-100 text-gray-700"
                    : "bg-green-50 text-green-700",
                )}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {currentProductionTime && currentProductionTime > 1
                    ? `${currentProductionTime}h de produção`
                    : "Produção imediata"}
                  {currentProductionTime > (product.production_time || 0) && (
                    <span className="ml-1 text-xs opacity-75">
                      (personalizado)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {components && components.length > 0 && (
              <div className="space-y-4">
                {components.map((component) => {
                  const layouts = availableLayoutsByComponent[component.id];
                  if (!layouts || layouts.length === 0) return null;

                  return (
                    <div key={`gallery-${component.id}`} className="space-y-3">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {component.item.name}
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {layouts.map((layout) => {
                          const customization = itemCustomizations[
                            component.id
                          ]?.find(
                            (c) =>
                              c.customizationType ===
                              CustomizationType.DYNAMIC_LAYOUT,
                          );
                          const isSelected =
                            (customization?.data as any)?.id ===
                            (layout as any).id;

                          return (
                            <div
                              key={(layout as any).id}
                              onClick={() => {
                                const currentData =
                                  itemCustomizations[component.id] || [];
                                const otherData = currentData.filter(
                                  (c) =>
                                    c.customizationType !==
                                    CustomizationType.DYNAMIC_LAYOUT,
                                );

                                const rule =
                                  component.item.customizations?.find(
                                    (c) => c.type === "DYNAMIC_LAYOUT",
                                  );

                                if (rule) {
                                  const newData: CustomizationInput = {
                                    ruleId: rule.id,
                                    customizationType:
                                      CustomizationType.DYNAMIC_LAYOUT,
                                    data: {
                                      ...layout,
                                      _customizationName: rule.name,
                                      _priceAdjustment: rule.price,
                                    },
                                  };

                                  handleCustomizationComplete(
                                    component.id,
                                    true,
                                    [...otherData, newData],
                                  );

                                  if (layout.slots && layout.slots.length > 0) {
                                    setActiveCustomizationModal(component.id);
                                  }
                                }
                              }}
                              className={cn(
                                "relative w-24 h-24 flex-shrink-0 rounded-xl border-2 transition-all cursor-pointer overflow-hidden",
                                isSelected
                                  ? "border-gray-900 ring-2 ring-gray-300"
                                  : "border-gray-200 hover:border-gray-400",
                              )}
                            >
                              <Image
                                src={getInternalImageUrl(layout.image_url)}
                                alt={layout.name}
                                fill
                                className="object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-gray-900 text-white rounded-full p-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                
                <div className="space-y-2">
                  {components
                    .filter((c) => c.item.allows_customization)
                    .map((component) => {
                      const hasCustomizations =
                        itemCustomizations[component.id]?.length > 0;
                      const requiredCount =
                        component.item.customizations?.filter(
                          (c) => c.isRequired,
                        ).length || 0;
                      const totalCount =
                        component.item.customizations?.length || 0;

                      return (
                        <Button
                          key={component.id}
                          onClick={() =>
                            setActiveCustomizationModal(component.id)
                          }
                          variant="outline"
                          className="w-full justify-between h-auto py-3 px-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 relative rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={
                                  getInternalImageUrl(
                                    component.item.image_url,
                                  ) || "/placeholder.png"
                                }
                                alt={component.item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm">
                                {component.item.name}
                                {requiredCount > 0 && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {totalCount} opção{totalCount !== 1 && "ões"}
                                {itemImagesCount[component.id] && (
                                  <span className="ml-2 text-blue-600">
                                    {itemImagesCount[component.id].current}/
                                    {itemImagesCount[component.id].max} fotos
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasCustomizations && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            <ChevronLeft className="w-5 h-5 rotate-180" />
                          </div>
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Quantidade
              </label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-10 w-10"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-medium w-12 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart || isUploading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 text-base font-medium"
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
                    ? "Adicionar novamente"
                    : `Adicionar • ${formatCurrency(totalPriceForQuantity)}`}
                </>
              )}
            </Button>

            
            {additionals.length > 0 && (
              <div className="space-y-4 pt-6 border-t">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Adicionais
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const hasProductRequiredCustomizations = components.some(
                        (component) =>
                          component.item.customizations?.some(
                            (c) => c.isRequired,
                          ),
                      );

                      let hasCompletedProductCustomizations = true;
                      if (hasProductRequiredCustomizations) {
                        hasCompletedProductCustomizations = components.every(
                          (component) => {
                            const requiredCustomizations =
                              component.item.customizations?.filter(
                                (c) => c.isRequired,
                              ) || [];
                            if (requiredCustomizations.length === 0)
                              return true;

                            const componentData =
                              itemCustomizations[component.id] || [];
                            return requiredCustomizations.every((reqCustom) =>
                              componentData.some(
                                (c) => c.ruleId === reqCustom.id,
                              ),
                            );
                          },
                        );
                      }

                      return hasCompletedProductCustomizations
                        ? "Complemente seu pedido"
                        : "Complete as personalizações obrigatórias primeiro";
                    })()}
                  </p>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {additionals.map((additional) => {
                    const hasProductRequiredCustomizations = components.some(
                      (component) =>
                        component.item.customizations?.some(
                          (c) => c.isRequired,
                        ),
                    );
                    let hasCompletedProductCustomizations = true;
                    if (hasProductRequiredCustomizations) {
                      hasCompletedProductCustomizations = components.every(
                        (component) => {
                          const requiredCustomizations =
                            component.item.customizations?.filter(
                              (c) => c.isRequired,
                            ) || [];
                          if (requiredCustomizations.length === 0) return true;
                          const componentData =
                            itemCustomizations[component.id] || [];
                          return requiredCustomizations.every((reqCustom) =>
                            componentData.some(
                              (c) => c.ruleId === reqCustom.id,
                            ),
                          );
                        },
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

                        isInCartExternal={selectedAdditionalIds.includes(
                          additional.id,
                        )}
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
            )}
          </div>
        </div>

        
        {product.related_products && product.related_products.length > 0 && (
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Você também pode gostar
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {product.related_products.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  className="w-48 flex-shrink-0"
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
          </div>
        )}
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
                | "DYNAMIC_LAYOUT"
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
                dynamic_layout?: {
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
            onImagesUpdate={(id, current, max) =>
              handleImagesUpdate(component.id, current, max)
            }
          />
        ))}

      
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
                | "DYNAMIC_LAYOUT"
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
                dynamic_layout?: {
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
                data,
              )
            }
            onImagesUpdate={handleImagesUpdate}
          />
        ))}
    </div>
  );
};

export default ClientProductPage;
