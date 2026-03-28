"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  Minus,
  Plus,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Loader2,
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
import { MockupGallery } from "./MockupGallery";
import AdditionalCard from "./additional-card";
import Link from "next/link";
import { ProductCard } from "@/app/components/layout/product-card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/use-auth";
import {
  CustomizationType,
  type CustomizationInput,
} from "@/app/types/customization";
import type { SlotDef } from "@/app/types/personalization";
import { ItemCustomizationModal } from "./itemCustomizationsModal";
import { getInternalImageUrl } from "@/lib/image-helper";
import { useLoginPrompt } from "@/app/components/layout/app-wrapper";
import { normalizeCustomizationData } from "@/app/lib/customization-serialization";

const Model3DViewer = dynamic(
  () => import("./Model3DViewer").then((mod) => mod.Model3DViewer),
  {
    ssr: false,
  },
);

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const mergeCustomizationInputs = (
  previous: CustomizationInput[],
  incoming: CustomizationInput[],
): CustomizationInput[] => {
  const merged = new Map<string, CustomizationInput>();

  previous.forEach((input) => {
    const key = input.ruleId || input.customizationRuleId;
    if (key) {
      merged.set(key, input);
    }
  });

  incoming.forEach((input) => {
    const key = input.ruleId || input.customizationRuleId;
    if (key) {
      merged.set(key, input);
    }
  });

  return Array.from(merged.values());
};

const getCustomizationPreviewUrls = (input: CustomizationInput): string[] => {
  const data = (input.data as Record<string, unknown>) || {};
  const urls: string[] = [];

  const addUrl = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      urls.push(value);
    }
  };

  if (input.customizationType === CustomizationType.DYNAMIC_LAYOUT) {
    addUrl(data.highQualityUrl);
    addUrl(data.previewUrl);
    if (typeof data.final_artwork === "object" && data.final_artwork) {
      addUrl((data.final_artwork as Record<string, unknown>).preview_url);
    }
    if (typeof data.image === "object" && data.image) {
      addUrl((data.image as Record<string, unknown>).preview_url);
    }
  }

  if (input.customizationType === CustomizationType.IMAGES) {
    const previews = data.previews;
    if (Array.isArray(previews)) {
      previews.forEach(addUrl);
    }
    const photos = data.photos;
    if (Array.isArray(photos)) {
      photos.forEach((photo) => {
        if (typeof photo === "string") addUrl(photo);
        if (typeof photo === "object" && photo !== null) {
          const p = photo as Record<string, unknown>;
          addUrl(p.preview_url);
          addUrl(p.url);
        }
      });
    }
  }

  return [...new Set(urls)];
};

const getCustomizationPreviewLabel = (input: CustomizationInput): string => {
  const data = (input.data as Record<string, unknown>) || {};
  const name = (data._customizationName as string) || "Personalização";

  if (input.customizationType === CustomizationType.TEXT) {
    const text =
      (data.text as string) ||
      Object.entries(data)
        .filter(([key, value]) => key.startsWith("field-") && !!value)
        .map(([, value]) => String(value).trim())
        .filter(Boolean)
        .join(" | ");
    return text ? `${name}: ${text}` : name;
  }

  if (input.customizationType === CustomizationType.MULTIPLE_CHOICE) {
    const selected =
      (data.selected_option_label as string) ||
      (data.label as string) ||
      (data.selected_option as string) ||
      "";
    return selected ? `${name}: ${selected}` : name;
  }

  if (input.customizationType === CustomizationType.IMAGES) {
    const count =
      (Array.isArray(data.previews) ? data.previews.length : 0) ||
      (Array.isArray(data.photos) ? data.photos.length : 0);
    return `${name}: ${count} foto(s)`;
  }

  if (input.customizationType === CustomizationType.DYNAMIC_LAYOUT) {
    return `${name}: ${
      (data.layout_name as string) ||
      (data.name as string) ||
      "Design personalizado"
    }`;
  }

  return name;
};

const ClientProductPage = ({ id }: { id: string }) => {
  const {
    getProduct,
    getAdditionalsByProduct,
    getItemsByProduct,
    uploadCustomizationImage,
    validateCustomizationsV2,
  } = useApi();
  const { addToCart, cart } = useCartContext();
  const { user } = useAuth();
  const { openPrompt } = useLoginPrompt();

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
  const [missingRequiredByComponent, setMissingRequiredByComponent] = useState<
    Record<string, string[]>
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

  const ensureAuthenticated = useCallback(() => {
    if (user) {
      return true;
    }

    openPrompt({ force: true });
    toast.info("Faça login para continuar.");
    return false;
  }, [user, openPrompt]);

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
      setMissingRequiredByComponent((prev) => {
        if (!prev[itemId]) return prev;
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });

      if (hasCustomizations) {
        let shouldPreview = false;

        setItemCustomizations((prev) => {
          const mergedData = mergeCustomizationInputs(prev[itemId] || [], data);
          shouldPreview = mergedData.some(
            (c) => c.customizationType === CustomizationType.DYNAMIC_LAYOUT,
          );

          return {
            ...prev,
            [itemId]: mergedData,
          };
        });

        if (shouldPreview) {
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
            [additionalId]: mergeCustomizationInputs(
              prev[additionalId] || [],
              data,
            ),
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

  const normalizeInputsForValidation = useCallback(
    (inputs: CustomizationInput[]): CustomizationInput[] =>
      inputs
        .map((input) => ({
          ...input,
          data: normalizeCustomizationData(input.data),
        }))
        .filter((input) => Boolean(input.ruleId || input.customizationRuleId)),
    [],
  );

  const getMissingRequiredCustomizationIds = useCallback(
    (component: ProductComponent): string[] => {
      if (!component.item.allows_customization) return [];

      const requiredCustomizations =
        component.item.customizations?.filter((c) => c.isRequired) || [];
      const componentData = itemCustomizations[component.id] || [];
      const missingIds: string[] = [];

      requiredCustomizations.forEach((reqCustom) => {
        const customData = componentData.find((c) => c.ruleId === reqCustom.id);

        if (!customData) {
          missingIds.push(reqCustom.id);
          return;
        }

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
            return !value || (typeof value === "string" && value.trim() === "");
          });

          if (hasEmptyField) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "IMAGES") {
          const imagesData = data as {
            files?: File[];
            previews?: string[];
            count?: number;
          };
          const maxImages =
            (
              reqCustom.customization_data as {
                dynamic_layout?: { max_images?: number };
              }
            )?.dynamic_layout?.max_images || 0;
          const imageCount =
            imagesData.count ||
            (Array.isArray(imagesData.previews)
              ? imagesData.previews.length
              : 0) ||
            (Array.isArray(imagesData.files) ? imagesData.files.length : 0);

          if (imageCount === 0 || (maxImages > 0 && imageCount < maxImages)) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "MULTIPLE_CHOICE") {
          const choice = data as
            | { id?: string; selected_option?: string }
            | undefined;

          const hasOptionSelected =
            choice && (choice.id || choice.selected_option);
          if (!hasOptionSelected) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "DYNAMIC_LAYOUT") {
          const layout = data as
            | { id?: string; layout_id?: string }
            | undefined;

          const hasLayoutSelected = layout && (layout.id || layout.layout_id);
          if (!hasLayoutSelected) {
            missingIds.push(reqCustom.id);
          }
        }
      });

      return missingIds;
    },
    [itemCustomizations],
  );

  const getMissingRequiredAdditionalCustomizationIds = useCallback(
    (additional: Additional): string[] => {
      if (!additional.allows_customization) return [];

      const requiredCustomizations =
        additional.customizations?.filter((c) => c.isRequired) || [];
      const additionalData = additionalCustomizations[additional.id] || [];
      const missingIds: string[] = [];

      requiredCustomizations.forEach((reqCustom) => {
        const customData = additionalData.find(
          (c) => c.ruleId === reqCustom.id,
        );

        if (!customData) {
          missingIds.push(reqCustom.id);
          return;
        }

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
            return !value || (typeof value === "string" && value.trim() === "");
          });

          if (hasEmptyField) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "IMAGES") {
          const imagesData = data as {
            files?: File[];
            previews?: string[];
            count?: number;
          };
          const maxImages =
            (
              reqCustom.customization_data as {
                dynamic_layout?: { max_images?: number };
              }
            )?.dynamic_layout?.max_images || 0;
          const imageCount =
            imagesData.count ||
            (Array.isArray(imagesData.previews)
              ? imagesData.previews.length
              : 0) ||
            (Array.isArray(imagesData.files) ? imagesData.files.length : 0);

          if (imageCount === 0 || (maxImages > 0 && imageCount < maxImages)) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "MULTIPLE_CHOICE") {
          const choice = data as
            | { id?: string; selected_option?: string }
            | undefined;

          const hasOptionSelected =
            choice && (choice.id || choice.selected_option);
          if (!hasOptionSelected) {
            missingIds.push(reqCustom.id);
          }
        }

        if (reqCustom.type === "DYNAMIC_LAYOUT") {
          const layout = data as
            | { id?: string; layout_id?: string }
            | undefined;

          const hasLayoutSelected = layout && (layout.id || layout.layout_id);
          if (!hasLayoutSelected) {
            missingIds.push(reqCustom.id);
          }
        }
      });

      return missingIds;
    },
    [additionalCustomizations],
  );

  const handleAddAdditionalToCart = useCallback(
    async (additionalId: string) => {
      if (!ensureAuthenticated()) {
        return;
      }

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
    [selectedAdditionalIds, ensureAuthenticated],
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

  const uploadRequiredImages = useCallback(
    async (
      imagesData: {
        files?: File[];
        previews?: string[];
        photos?: Array<{
          preview_url?: string;
          original_name?: string;
          position?: number;
          temp_file_id?: string;
          mime_type?: string;
          size?: number;
        }>;
        count?: number;
        required_count?: number;
      },
      customizationName: string,
    ) => {
      const previews = Array.isArray(imagesData.previews)
        ? imagesData.previews
        : [];
      const existingPhotos = Array.isArray(imagesData.photos)
        ? imagesData.photos
        : [];
      const availableCount = Math.max(previews.length, existingPhotos.length);
      const requiredCount =
        imagesData.required_count || imagesData.count || availableCount;

      if (requiredCount > 0 && availableCount < requiredCount) {
        throw new Error(
          `${customizationName}: faltam ${requiredCount - availableCount} imagem(ns).`,
        );
      }

      const photos = await Promise.all(
        Array.from({ length: availableCount }).map(async (_, index) => {
          const file = imagesData.files?.[index];
          const existingPhoto = existingPhotos[index];
          const fileName = file?.name || `photo-${index + 1}.jpg`;

          if (!file) {
            if (existingPhoto?.preview_url || existingPhoto?.temp_file_id) {
              return {
                preview_url: existingPhoto.preview_url || "",
                original_name: existingPhoto.original_name || fileName,
                temp_file_id:
                  existingPhoto.temp_file_id ||
                  `persisted-${Date.now()}-${index}`,
                position: existingPhoto.position ?? index,
                mime_type: existingPhoto.mime_type || "image/jpeg",
                size: existingPhoto.size || 0,
              };
            }

            throw new Error(
              `${customizationName}: a imagem ${index + 1} precisa ser reenviada.`,
            );
          }

          const uploadResult = await uploadCustomizationImage(file);
          if (!uploadResult.success || !uploadResult.imageUrl) {
            throw new Error(
              `${customizationName}: não foi possível enviar a imagem ${index + 1}.`,
            );
          }

          return {
            preview_url: uploadResult.imageUrl,
            original_name: fileName,
            temp_file_id:
              uploadResult.filename || `temp-${Date.now()}-${index}`,
            position: index,
            mime_type: file.type || "image/jpeg",
            size: file.size || 0,
          };
        }),
      );

      if (requiredCount > 0 && photos.length < requiredCount) {
        throw new Error(
          `${customizationName}: nem todas as imagens obrigatórias foram processadas.`,
        );
      }

      return photos;
    },
    [uploadCustomizationImage],
  );

  const handleAddToCart = async () => {
    if (!product.id) return;

    if (!ensureAuthenticated()) {
      return;
    }

    if (isUploading) {
      toast.info("Aguarde finalizar o carregamento das personalizações.");
      return;
    }

    const missingCustomizations = components.reduce<Record<string, string[]>>(
      (accumulator, component) => {
        const missingIds = getMissingRequiredCustomizationIds(component);
        if (missingIds.length > 0) {
          accumulator[component.id] = missingIds;
        }
        return accumulator;
      },
      {},
    );

    if (Object.keys(missingCustomizations).length > 0) {
      setMissingRequiredByComponent(missingCustomizations);
      return;
    }

    setMissingRequiredByComponent({});

    const missingAdditionals = selectedAdditionalIds.reduce<string[]>(
      (acc, additionalId) => {
        const additional = additionals.find((a) => a.id === additionalId);
        if (!additional) return acc;
        const missingIds =
          getMissingRequiredAdditionalCustomizationIds(additional);
        if (missingIds.length > 0) {
          acc.push(additional.name || "Adicional");
        }
        return acc;
      },
      [],
    );

    if (missingAdditionals.length > 0) {
      toast.error(
        `Complete as personalizações obrigatórias dos adicionais: ${missingAdditionals.join(
          ", ",
        )}`,
      );
      return;
    }

    const validateServerSide = async (): Promise<boolean> => {
      const errors: string[] = [];

      for (const component of components) {
        if (!component.item.allows_customization) continue;
        const inputs = normalizeInputsForValidation(
          itemCustomizations[component.id] || [],
        );
        const hasRequired =
          component.item.customizations?.some((c) => c.isRequired) || false;
        if (inputs.length === 0 && !hasRequired) continue;
        if (inputs.length === 0) continue;

        try {
          const response = await validateCustomizationsV2({
            itemId: component.item.id,
            inputs,
          });
          if (!response.valid) {
            errors.push(...(response.errors || []));
          }
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error.message
              : "Erro ao validar personalização no servidor.",
          );
        }
      }

      for (const additionalId of selectedAdditionalIds) {
        const additional = additionals.find((a) => a.id === additionalId);
        if (!additional || !additional.allows_customization) continue;
        const inputs = normalizeInputsForValidation(
          additionalCustomizations[additionalId] || [],
        );
        const hasRequired =
          additional.customizations?.some((c) => c.isRequired) || false;
        if (inputs.length === 0 && !hasRequired) continue;
        if (inputs.length === 0) continue;

        try {
          const response = await validateCustomizationsV2({
            itemId: additional.id,
            inputs,
          });
          if (!response.valid) {
            errors.push(...(response.errors || []));
          }
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error.message
              : "Erro ao validar personalização do adicional.",
          );
        }
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
        if (errors.length > 1) {
          console.warn("Erros adicionais de validação:", errors);
        }
        return false;
      }

      return true;
    };

    setAddingToCart(true);

    try {
      const serverValid = await validateServerSide();
      if (!serverValid) {
        return;
      }

      const cartCustomizations: CartCustomization[] = [];

      for (const [itemId, customizationInputs] of Object.entries(
        itemCustomizations,
      )) {
        const componentId = itemId;

        for (const input of customizationInputs) {
          const rawData = input.data as Record<string, unknown>;
          const data = normalizeCustomizationData(rawData);
          const ruleId =
            input.ruleId ||
            input.customizationRuleId ||
            (rawData.ruleId as string) ||
            (rawData.customizationRuleId as string) ||
            null;
          const component = components.find((c) => c.id === componentId);
          const rule = component?.item.customizations?.find(
            (c) => c.id === ruleId,
          );
          const customizationName =
            (data._customizationName as string) ||
            rule?.name ||
            "Personalização";
          const isRequired = Boolean(rule?.isRequired);
          const priceAdjustment = Number(
            (data._priceAdjustment as number) || rule?.price || 0,
          );

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
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              text: textFields || String(data || ""),
              data: data,
            });
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice =
              (rawData as { id?: string; label?: string } | string) || data;
            const optionId =
              typeof choice === "string"
                ? choice
                : typeof choice.id === "string"
                  ? choice.id
                  : "";
            const optionLabel =
              typeof choice === "string"
                ? choice
                : typeof choice.label === "string"
                  ? choice.label
                  : "";

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              selected_option: optionId,
              selected_option_label: optionLabel,
              data: data,
            });
          } else if (input.customizationType === "IMAGES") {
            const imagesData = rawData as {
              files?: File[];
              previews?: string[];
              count?: number;
              required_count?: number;
            };
            const photos = await uploadRequiredImages(
              imagesData,
              customizationName,
            );

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${componentId}`
                : `item_${itemId}_${componentId}`,
              componentId,
              title: customizationName,
              customization_type: "IMAGES",
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              photos: photos,
              data: normalizeCustomizationData({
                ...data,
                photos,
                previews: photos.map((photo) => photo.preview_url),
                count: photos.length,
              }),
            });
          } else if (input.customizationType === "DYNAMIC_LAYOUT") {
            const layoutData = rawData as {
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
              is_required: isRequired,
              price_adjustment: priceAdjustment,
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
              data: normalizeCustomizationData(layoutData),
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
            cartCustomization.data = normalizeCustomizationData({
              ...layoutData,
              previewUrl: finalPreviewUrl,
              text: finalPreviewUrl,
            });

            cartCustomizations.push(cartCustomization);
          }
        }
      }

      for (const additionalId of selectedAdditionalIds) {
        const additionalCustoms = additionalCustomizations[additionalId];
        if (!additionalCustoms) continue;

        for (const input of additionalCustoms) {
          const rawData = input.data as Record<string, unknown>;
          const data = normalizeCustomizationData(rawData);
          const ruleId =
            input.ruleId ||
            input.customizationRuleId ||
            (rawData.ruleId as string) ||
            (rawData.customizationRuleId as string) ||
            null;
          const additional = additionals.find((a) => a.id === additionalId);
          const rule = additional?.customizations?.find((c) => c.id === ruleId);
          const customizationName =
            (data._customizationName as string) ||
            rule?.name ||
            "Personalização";
          const isRequired = Boolean(rule?.isRequired);
          const priceAdjustment = Number(
            (data._priceAdjustment as number) || rule?.price || 0,
          );

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
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              text: textFields || String(data || ""),
              data: data,
            });
          } else if (input.customizationType === "MULTIPLE_CHOICE") {
            const choice =
              (rawData as { id?: string; label?: string } | string) || data;
            const optionId =
              typeof choice === "string"
                ? choice
                : typeof choice.id === "string"
                  ? choice.id
                  : "";
            const optionLabel =
              typeof choice === "string"
                ? choice
                : typeof choice.label === "string"
                  ? choice.label
                  : "";

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "MULTIPLE_CHOICE",
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              selected_option: optionId,
              selected_option_label: optionLabel,
              data: data,
            });
          } else if (input.customizationType === "IMAGES") {
            const imagesData = rawData as {
              files?: File[];
              previews?: string[];
              count?: number;
              required_count?: number;
            };
            const photos = await uploadRequiredImages(
              imagesData,
              customizationName,
            );

            cartCustomizations.push({
              customization_id: input.ruleId
                ? `${input.ruleId}:${additionalId}`
                : `add_${additionalId}`,
              componentId: additionalId,
              title: customizationName,
              customization_type: "IMAGES",
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              photos: photos,
              data: normalizeCustomizationData({
                ...data,
                photos,
                previews: photos.map((photo) => photo.preview_url),
                count: photos.length,
              }),
            });
          } else if (input.customizationType === "DYNAMIC_LAYOUT") {
            const layoutData = rawData as {
              id?: string;
              name?: string;
              previewUrl?: string;
              productionTime?: number;
              additional_time?: number;
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
              is_required: isRequired,
              price_adjustment: priceAdjustment,
              selected_item: {
                original_item: "Design Dinâmico",
                selected_item: layoutData.name || "Personalizado",
                price_adjustment: 0,
              },
              selected_item_label: layoutData.name || "Design Personalizado",
              text: undefined,
              additional_time:
                layoutData.productionTime ?? layoutData.additional_time ?? 0,
              fabricState: layoutData.fabricState,
              data: normalizeCustomizationData(layoutData),
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
            cartCustomization.data = normalizeCustomizationData({
              ...layoutData,
              additional_time:
                layoutData.productionTime ?? layoutData.additional_time ?? 0,
              previewUrl: finalPreviewUrl,
              text: finalPreviewUrl,
            });

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
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao adicionar produto ao carrinho",
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const hasDiscount = product.discount && product.discount > 0;

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
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

              <img
                src={getInternalImageUrl(
                  product.image_url || "/placeholder-v2.png",
                )}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="eager"
                decoding="async"
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
                        <img
                          src={textureUrl}
                          alt="Preview Personalizado"
                          className="absolute inset-0 h-full w-full object-contain object-center"
                          loading="lazy"
                          decoding="async"
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
                    <img
                      src={
                        getInternalImageUrl(product.image_url) ||
                        "/placeholder-v2.png"
                      }
                      alt={product.name || "Produto"}
                      className="absolute inset-0 h-full w-full object-cover object-center rounded-xl p-1 bg-white"
                      loading="lazy"
                      decoding="async"
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
                      <img
                        src={
                          getInternalImageUrl(component.item.image_url) ||
                          "/placeholder-v2.png"
                        }
                        alt={component.item.name}
                        className="absolute inset-0 h-full w-full object-cover object-center rounded-xl p-1 bg-white"
                        loading="lazy"
                        decoding="async"
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
                    dangerouslySetInnerHTML={{
                      __html: sanitizeProductDescription(product.description),
                    }}
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
                {Object.keys(missingRequiredByComponent).length > 0 && (
                  <div className="text-xs font-medium text-red-700">
                    Complete as customizações
                  </div>
                )}
                {components.map((component) => {
                  const layouts = availableLayoutsByComponent[component.id];
                  if (!layouts || layouts.length === 0) return null;

                  const dynamicLayoutRule = component.item.customizations?.find(
                    (c) => c.type === "DYNAMIC_LAYOUT" && c.isRequired,
                  );
                  const hasDynamicLayoutError = !!(
                    dynamicLayoutRule &&
                    missingRequiredByComponent[component.id]?.includes(
                      dynamicLayoutRule.id,
                    )
                  );

                  return (
                    <div
                      key={`gallery-${component.id}`}
                      className={cn(
                        "space-y-3 rounded-xl p-3",
                        hasDynamicLayoutError &&
                          "border border-red-300 bg-red-50/60",
                      )}
                    >
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
                                if (!ensureAuthenticated()) {
                                  return;
                                }

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
                              <img
                                src={getInternalImageUrl(layout.image_url)}
                                alt={layout.name}
                                className="absolute inset-0 h-full w-full object-cover object-center p-1 bg-white"
                                loading="lazy"
                                decoding="async"
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
                      const componentCustomizations =
                        itemCustomizations[component.id] || [];
                      const hasMissingRequired =
                        (missingRequiredByComponent[component.id]?.length ||
                          0) > 0;
                      const hasCustomizations =
                        componentCustomizations.length > 0;
                      const requiredCount =
                        component.item.customizations?.filter(
                          (c) => c.isRequired,
                        ).length || 0;
                      const totalCount =
                        component.item.customizations?.length || 0;

                      return (
                        <Button
                          key={component.id}
                          onClick={() => {
                            if (!ensureAuthenticated()) {
                              return;
                            }
                            setActiveCustomizationModal(component.id);
                          }}
                          variant="outline"
                          className={cn(
                            "w-full justify-between h-auto py-3 px-4",
                            hasMissingRequired &&
                              "border-red-400 text-red-950 hover:border-red-500 hover:text-red-700",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 relative overflow-hidden flex-shrink-0">
                              <img
                                src={
                                  getInternalImageUrl(
                                    component.item.image_url,
                                  ) || "/placeholder-v2.png"
                                }
                                alt={component.item.name}
                                className="absolute inset-0 rounded-lg h-full w-full object-cover object-center bg-white"
                                loading="lazy"
                                decoding="async"
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
                                {totalCount}{" "}
                                {totalCount > 1 ? "opções" : "opção"}
                                {itemImagesCount[component.id] && (
                                  <span className="ml-2 text-blue-600">
                                    {itemImagesCount[component.id].current}/
                                    {itemImagesCount[component.id].max} fotos
                                  </span>
                                )}
                              </p>
                              {hasCustomizations && (
                                <div className="mt-2 space-y-1">
                                  {componentCustomizations.map(
                                    (custom, idx) => {
                                      const label =
                                        getCustomizationPreviewLabel(custom);
                                      const previews =
                                        getCustomizationPreviewUrls(custom);
                                      return (
                                        <div key={`${component.id}-${idx}`}>
                                          <p className="text-[11px] text-gray-700 truncate">
                                            {label}
                                          </p>
                                          {previews.length > 0 && (
                                            <div className="mt-1 flex gap-1.5">
                                              {previews
                                                .slice(0, 3)
                                                .map((url, previewIdx) => (
                                                  <img
                                                    key={`${component.id}-preview-${previewIdx}`}
                                                    src={url}
                                                    alt={`${component.item.name} preview ${previewIdx + 1}`}
                                                    className="h-8 w-8 rounded border border-gray-200 object-contain object-center bg-white p-0.5"
                                                  />
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}
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

                <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
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
                        onCustomizeClick={(additionalId) => {
                          if (!ensureAuthenticated()) {
                            return;
                          }
                          setActiveAdditionalModal(additionalId);
                        }}
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
            <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
              {product.related_products.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  className="w-48 flex-shrink-0"
                  props={{
                    id: relatedProduct.id,
                    name: relatedProduct.name,
                    image_url: relatedProduct.image_url || "/placeholder-v2.png",
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
