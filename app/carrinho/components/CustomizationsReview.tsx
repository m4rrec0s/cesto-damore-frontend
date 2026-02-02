"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, CheckCircle2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { useApi, type CustomizationTypeValue } from "@/app/hooks/use-api";
import type { PhotoUploadData } from "@/app/hooks/use-customization";
import { ItemCustomizationModal } from "@/app/produto/[id]/components/itemCustomizationsModal";
import type {
  CustomizationInput,
  CustomizationType,
  SaveOrderItemCustomizationPayload,
} from "@/app/types/customization";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/card";

interface CartItemForReview {
  product_id: string;
  product: {
    name: string;
    image_url?: string | null;
  };
  customizations?: CartCustomization[];
}

interface CustomizationsReviewProps {
  cartItems: CartItemForReview[];
  orderId?: string | null;
  onCustomizationUpdate?: (
    productId: string,
    customizations: CustomizationInput[],
    componentId?: string,
  ) => void;
  onCustomizationSaved?: () => void;
}

interface AvailableCustomization {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  itemId: string;
  itemName: string;
  componentId: string; // ✅ Unique ID of the component instance
}

interface ProductValidation {
  orderItemId?: string;
  productId: string;
  productName: string;
  availableCustomizations: AvailableCustomization[];
  filledCustomizations: CartCustomization[];
  missingRequired: AvailableCustomization[];
  isComplete: boolean;
}

// Interfaces para evitar erros de tipo e uso de 'any'
interface CustomizationPreview {
  preview_url?: string;
}

interface PersonalizationData {
  customization_type?: CustomizationTypeValue;
  title?: string;
  _customizationName?: string;
  is_required?: boolean | number;
  text?: string;
  photos?: PhotoUploadData[];
  selected_option?: string;
  selected_item_label?: string;
  selected_option_label?: string;
  label_selected?: string;
  componentId?: string;
  final_artwork?: CustomizationPreview;
  image?: CustomizationPreview;
  final_artworks?: CustomizationPreview[];
  previewUrl?: string;
  images?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

// Tipo para customizações do modal (compatível com ItemCustomizationModal)
interface ModalCustomization {
  id: string;
  name: string;
  description?: string;
  type: "DYNAMIC_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  isRequired: boolean;
  price: number;
  customization_data: Record<string, unknown>;
}

// Alias para compatibilidade com o modal
type Customization = ModalCustomization;

// 🔥 NOVO: Validação robusta com verificação de preview_url
const isCustomizationFilled = (
  custom: CartCustomization | undefined,
): boolean => {
  if (!custom) return false;

  const data = (custom.data as any) || {};

  switch (custom.customization_type) {
    case "TEXT": {
      const text = custom.text?.trim() || "";
      return text.length >= 2;
    }
    case "MULTIPLE_CHOICE": {
      // Verificar opção e nome (label)
      const hasOption = !!(
        custom.selected_option ||
        data.id ||
        data.selected_option ||
        data.selected_option_id
      );
      const hasLabel = !!(
        custom.label_selected ||
        custom.selected_option_label ||
        data.selected_option_label ||
        data.label
      );
      return hasOption && hasLabel;
    }
    case "IMAGES": {
      const photos = custom.photos || data.photos || data.files || [];
      if (!Array.isArray(photos) || photos.length === 0) return false;

      // Verificar que não são ranhuras de blob/base64 (significa que foram salvas)
      return photos.every((p: any) => {
        const url = p.preview_url || p.url || p.preview;
        return url && !url.startsWith("blob:") && !url.startsWith("data:");
      });
    }
    case "DYNAMIC_LAYOUT": {
      // Verificar se arte final + configuração do fabric está disponível
      const fabricState = data.fabricState;
      const artworkUrl =
        custom.text ||
        data.image?.preview_url ||
        data.previewUrl ||
        data.finalArtwork?.preview_url;

      const hasArtwork =
        !!artworkUrl &&
        !artworkUrl.startsWith("blob:") &&
        !artworkUrl.startsWith("data:");
      const hasFabric =
        !!fabricState &&
        (typeof fabricState === "string" ? fabricState.length > 20 : true);
      const hasLabel = !!(
        custom.label_selected ||
        custom.selected_item_label ||
        data.selected_item_label
      );

      return hasLabel && hasFabric && hasArtwork;
    }
    default:
      return true;
  }
};

// 🔥 NOVO: Obter dica específica por tipo de customização
const getCustomizationHint = (type: string, name: string): string => {
  const hints: Record<string, string> = {
    TEXT: `Digite um texto personalizado (mínimo 3 caracteres)`,
    MULTIPLE_CHOICE: `Selecione uma opção disponível`,
    IMAGES: `Envie pelo menos 1 foto (clique para fazer upload)`,
    DYNAMIC_LAYOUT: `Escolha um design e personalize-o (não esqueça de salvar)`,
  };

  return hints[type] || `Complete a personalização "${name}"`;
};

// Extrai o texto limpo de um valor que pode estar serializado
const extractCleanText = (text: string | undefined): string => {
  if (!text) return "";

  let cleaned = text;

  // Se começar com "field-", extrair o valor após o ": "
  if (cleaned.startsWith("field-")) {
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex !== -1) {
      cleaned = cleaned.substring(colonIndex + 1).trim();
      // Remover ", text: ", ", fields: ", etc. se existirem
      const commaIndex = cleaned.indexOf(",");
      if (commaIndex !== -1) {
        cleaned = cleaned.substring(0, commaIndex).trim();
      }
    }
  }

  // Se contiver ", text: ", extrair o valor após isso
  if (cleaned.includes(", text: ")) {
    const textMatch = cleaned.match(/,\s*text:\s*([^,]+)/);
    if (textMatch && textMatch[1]) {
      cleaned = textMatch[1].trim();
    }
  }

  // 🔥 NOVO: Remover prefixo "text: " se existir
  if (cleaned.startsWith('"text: ') && cleaned.endsWith('"')) {
    // Remove aspas externas e o prefixo "text: "
    cleaned = cleaned.slice(7, -1);
  } else if (cleaned.startsWith("text: ")) {
    cleaned = cleaned.substring(6);
  }

  // Se for JSON, tentar parsear
  try {
    if (cleaned.startsWith("{")) {
      const obj = JSON.parse(cleaned);
      if (obj.text) return obj.text;
      // Procurar por propriedade que começe com "field-"
      for (const key of Object.keys(obj)) {
        if (key.startsWith("field-")) {
          return obj[key];
        }
      }
    }
  } catch {
    // Não é JSON válido, continuar
  }

  // Retornar o texto limpo
  return cleaned;
};

const getCustomizationSummary = (custom: CartCustomization): string => {
  if (!isCustomizationFilled(custom)) return "";

  switch (custom.customization_type) {
    case "TEXT": {
      const cleanText = extractCleanText(custom.text);
      return cleanText ? `Texto: "${cleanText}"` : "";
    }
    case "MULTIPLE_CHOICE":
      return custom.label_selected || custom.selected_option_label || "";
    case "IMAGES":
      return custom.photos && custom.photos.length > 0
        ? `${custom.photos.length} foto(s)`
        : "";
    case "DYNAMIC_LAYOUT":
      return (
        custom.label_selected ||
        custom.selected_item_label ||
        "Design personalizado"
      );
    default:
      return "";
  }
};

const mapCustomizationType = (backendType: string): string => {
  const typeMap: Record<string, string> = {
    IMAGES: "IMAGES",
    TEXT: "TEXT",
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    DYNAMIC_LAYOUT: "DYNAMIC_LAYOUT",
  };
  return typeMap[backendType] || backendType;
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export function CustomizationsReview({
  cartItems,
  orderId,
  onCustomizationUpdate,
  onCustomizationSaved,
}: CustomizationsReviewProps) {
  const {
    getProduct,
    getItemCustomizations,
    saveOrderItemCustomization,
    getOrder,
    getCustomizationReviewData,
  } = useApi();

  const [validations, setValidations] = useState<ProductValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemName, setActiveItemName] = useState<string>("");
  const [activeCustomizations, setActiveCustomizations] = useState<
    Customization[]
  >([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  );
  const [activeInitialValues, setActiveInitialValues] = useState<
    Record<string, unknown>
  >({});

  const fetchAvailableCustomizations = useCallback(async () => {
    setIsLoading(true);

    // ✅ NOVO: Se tivermos orderId, buscar dados consolidados do backend
    if (orderId) {
      try {
        const reviewData = await getCustomizationReviewData(orderId);
        const results: ProductValidation[] = reviewData.map((data) => {
          const filled: CartCustomization[] = data.filledCustomizations.map(
            (f) => {
              const val = (f.value || {}) as PersonalizationData;

              // Tentar encontrar a regra correspondente para pegar o tipo correto
              const rule = data.availableCustomizations.find(
                (avail) =>
                  avail.id === f.customization_id ||
                  f.customization_id?.split(":")[0] === avail.id,
              );

              const inferredType =
                (rule?.type as CustomizationTypeValue) || "TEXT";

              return {
                id: f.id,
                customization_id: f.customization_id,
                customization_type:
                  (val.customization_type as CustomizationTypeValue) ||
                  inferredType,
                title:
                  (val.title as string) ||
                  rule?.name ||
                  (val._customizationName as string) ||
                  "Personalização",
                is_required: Boolean(val.is_required || rule?.isRequired),
                text: val.text as string | undefined,
                photos: val.photos as PhotoUploadData[] | undefined,
                selected_option: val.selected_option as string | undefined,
                selected_item_label: val.selected_item_label as
                  | string
                  | undefined,
                label_selected:
                  (val.label_selected as string) ||
                  (val.selected_item_label as string) ||
                  (val.selected_option_label as string) ||
                  undefined,
                componentId: (val.componentId as string) || rule?.componentId,
                data: val,
              };
            },
          );

          const missingRequired = data.availableCustomizations.filter(
            (avail) => {
              const filledCustom = filled.find(
                (f) =>
                  (f.customization_id === avail.id ||
                    f.customization_id?.split(":")[0] === avail.id) &&
                  // ✅ Match by componentId if present, else fallback to any match for this rule
                  (!f.componentId ||
                    f.componentId === avail.componentId ||
                    f.componentId === avail.itemId),
              );

              const isFilled = isCustomizationFilled(filledCustom);
              return avail.isRequired && !isFilled;
            },
          );

          return {
            orderItemId: data.orderItemId,
            productId: data.productId,
            productName: data.productName,
            availableCustomizations: data.availableCustomizations,
            filledCustomizations: filled,
            missingRequired,
            isComplete: missingRequired.length === 0,
          };
        });

        setValidations(results);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("Erro ao buscar dados de revisão consolidados:", error);
        // Fallback para o método antigo em caso de erro
      }
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id))];
    const results: ProductValidation[] = [];

    for (const productId of productIds) {
      const cartItem = cartItems.find((i) => i.product_id === productId);
      if (!cartItem) continue;

      try {
        const product = await getProduct(productId);
        const allAvailable: AvailableCustomization[] = [];

        if (product.components && product.components.length > 0) {
          for (const component of product.components) {
            // ✅ Validar item_id antes de buscar customizações
            if (!component.item_id || !component.item?.id) {
              console.warn(`Componente sem item_id válido:`, component);
              continue;
            }

            try {
              const configResponse = await getItemCustomizations(
                component.item_id,
              );
              const itemCustomizations = configResponse?.customizations || [];

              const mapped = itemCustomizations.map((c) => ({
                id: c.id,
                name: c.name,
                type: mapCustomizationType(c.type),
                isRequired: c.isRequired,
                itemId: component.item_id,
                itemName:
                  configResponse?.item?.name || component.item?.name || "Item",
                componentId: component.id, // ✅ Add componentId
              }));

              allAvailable.push(...mapped);
            } catch (itemError) {
              console.warn(
                `Erro ao buscar customizações do item ${component.item_id}:`,
                itemError,
              );
            }
          }
        }

        const filled = cartItem.customizations || [];
        // ✅ MUDANÇA: Mostrar TODAS as customizações, não só as obrigatórias
        const missingRequired = allAvailable.filter((avail) => {
          const filledCustom = filled.find(
            (f) =>
              (f.customization_id === avail.id ||
                f.customization_id?.includes(avail.id)) &&
              // ✅ Match by componentId if present, else fallback
              (!f.componentId ||
                f.componentId === avail.componentId ||
                f.componentId === avail.itemId),
          );
          // Se é obrigatória E não está preenchida, adicionar na lista
          if (avail.isRequired && !isCustomizationFilled(filledCustom)) {
            return true;
          }
          // Se é opcional, nunca aparecer em missingRequired
          return false;
        });

        results.push({
          productId,
          productName: cartItem.product.name,
          availableCustomizations: allAvailable,
          filledCustomizations: filled,
          missingRequired,
          // ✅ MUDANÇA: isComplete agora é true apenas se TODAS as OBRIGATÓRIAS estão preenchidas
          isComplete: missingRequired.length === 0,
        });
      } catch (error) {
        console.error(
          `Erro ao buscar customizações do produto ${productId}:`,
          error,
        );

        const filled = cartItem.customizations || [];
        const missingFromFilled = filled.filter(
          (f) => f.is_required && !isCustomizationFilled(f),
        );

        results.push({
          productId,
          productName: cartItem.product.name,
          availableCustomizations: [],
          filledCustomizations: filled,
          missingRequired: missingFromFilled.map((f) => ({
            id: f.customization_id || "",
            name: f.title,
            type: f.customization_type,
            isRequired: true,
            itemId: "",
            itemName: "",
            componentId: "", // Fallback
          })),
          isComplete: missingFromFilled.length === 0,
        });
      }
    }

    setValidations(results);
    setIsLoading(false);
  }, [
    cartItems,
    orderId,
    getProduct,
    getItemCustomizations,
    getCustomizationReviewData,
  ]);

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchAvailableCustomizations();
    } else {
      setValidations([]);
      setIsLoading(false);
    }
  }, [cartItems, fetchAvailableCustomizations]);

  const deserializeCustomizationValue = (
    value: string | undefined,
  ): Record<string, unknown> => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn("Erro ao desserializar valor de customização:", e);
      return {};
    }
  };

  const handleEditItem = useCallback(
    async (
      productId: string,
      itemId: string,
      itemName: string,
      componentId: string,
    ) => {
      try {
        const configResponse = await getItemCustomizations(itemId);
        const customizations = configResponse?.customizations || [];

        const modalCustoms: Customization[] = customizations.map((c) => ({
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
          customization_data: c.customization_data,
        }));

        const cartItem = cartItems.find((i) => i.product_id === productId);
        const filled =
          cartItem?.customizations?.filter(
            (f) => f.componentId === componentId,
          ) || [];
        const initialData: Record<string, unknown> = {};

        filled.forEach((fc: CartCustomization) => {
          const ruleId = fc.customization_id;
          if (!ruleId) return;

          if (typeof fc.value === "string") {
            const deserialized = deserializeCustomizationValue(fc.value);
            initialData[ruleId] = deserialized;
            return;
          }

          if (fc.customization_type === "TEXT") {
            initialData[ruleId] = fc.text || "";
          } else if (fc.customization_type === "MULTIPLE_CHOICE") {
            initialData[ruleId] = fc.selected_option;
          } else if (fc.customization_type === "IMAGES") {
            initialData[ruleId] = fc.photos || [];
          } else if (fc.customization_type === "DYNAMIC_LAYOUT") {
            initialData[ruleId] = fc.data || fc;
          }
        });

        setActiveInitialValues(initialData);
        setActiveItemId(itemId);
        setActiveItemName(itemName);
        setActiveCustomizations(modalCustoms);
        setActiveProductId(productId);
        setActiveComponentId(componentId);
        setModalOpen(true);
      } catch (error) {
        console.error("Erro ao carregar customizações:", error);
      }
    },
    [getItemCustomizations, cartItems, setModalOpen],
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleCustomizationComplete = useCallback(
    async (hasCustomizations: boolean, data: CustomizationInput[]) => {
      if (!hasCustomizations || !activeItemId) {
        setModalOpen(false);
        return;
      }

      if (orderId && activeProductId) {
        setIsSaving(true);
        try {
          const order = await getOrder(orderId);

          const orderItem = order?.items?.find(
            (item: { product_id: string }) =>
              item.product_id === activeProductId,
          );

          if (!orderItem) {
            console.error(
              "❌ OrderItem não encontrado para o produto:",
              activeProductId,
            );
            toast.error("Item do pedido não encontrado.");
            setIsSaving(false);
            setModalOpen(false);
            return;
          }

          const orderItemId = orderItem.id;

          for (const customization of data) {
            const customData = customization.data as PersonalizationData;
            // 🔥 NOVO: Tentar usar highQualityUrl se disponível para melhor qualidade
            const highQualityUrl = (customData as any).highQualityUrl as
              | string
              | undefined;
            const previewUrl =
              highQualityUrl || (customData?.previewUrl as string | undefined);

            const sanitizedData = { ...customData };

            if (activeComponentId) {
              sanitizedData.componentId = activeComponentId;
            }

            if (sanitizedData.images && Array.isArray(sanitizedData.images)) {
              sanitizedData.images = sanitizedData.images.map(
                (img: Record<string, unknown>) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { imageBuffer, ...rest } = img;
                  return rest;
                },
              );
            }

            const payload: SaveOrderItemCustomizationPayload = {
              customizationRuleId:
                customization.ruleId ||
                customization.customizationRuleId ||
                null,
              customizationType:
                customization.customizationType as CustomizationType,
              title:
                (customData?._customizationName as string) ||
                customization.customizationType,
              selectedLayoutId: customization.selectedLayoutId || null,
              data: sanitizedData || {},
            };

            if (
              customization.customizationType === "DYNAMIC_LAYOUT" &&
              previewUrl
            ) {
              if (previewUrl.startsWith("data:")) {
                payload.finalArtwork = {
                  base64: previewUrl,
                  mimeType: "image/png",
                  fileName: "design-final.png",
                };
              }
            }

            await saveOrderItemCustomization(orderId, orderItemId, payload);
          }

          toast.success("Personalização salva no pedido!");
          onCustomizationSaved?.();
        } catch (error) {
          console.error(
            "❌ [CustomizationsReview] Erro ao salvar customização:",
            error,
          );
          toast.error("Erro ao salvar personalização. Tente novamente.");
        } finally {
          setIsSaving(false);
        }
      }

      if (activeProductId && onCustomizationUpdate) {
        onCustomizationUpdate(
          activeProductId,
          data,
          activeComponentId || undefined,
        );
      }

      setModalOpen(false);
      fetchAvailableCustomizations();
    },
    [
      activeItemId,
      activeProductId,
      activeComponentId,
      orderId,
      onCustomizationUpdate,
      onCustomizationSaved,
      saveOrderItemCustomization,
      fetchAvailableCustomizations,
      getOrder,
      setModalOpen,
    ],
  );

  const hasRelevantValidations = validations.some(
    (v) =>
      v.availableCustomizations.length > 0 || v.filledCustomizations.length > 0,
  );

  if (!hasRelevantValidations && !isLoading) {
    return null;
  }

  const totalMissing = validations.reduce(
    (acc, v) => acc + v.missingRequired.length,
    0,
  );
  const allComplete = validations.every((v) => v.isComplete);

  if (isLoading || isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isSaving
          ? "Salvando personalizações..."
          : "Verificando personalizações..."}
      </div>
    );
  }

  return (
    <>
      <Card className="bg-gray-50/50 p-4 sm:p-5 rounded-xl border border-gray-100 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Personalizações
            </h3>
            <p className="text-xs text-gray-500">
              Revise as informações antes do pagamento
            </p>
          </div>
          <div className="flex flex-col items-end">
            {allComplete ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50/50 rounded-full border border-green-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-semibold text-green-600">
                  Tudo OK
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/50 rounded-full border border-amber-100">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">
                  {totalMissing} pendente{totalMissing > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {validations.map((validation, vIdx) => {
            const itemsMap = new Map<
              string,
              {
                itemName: string;
                allCustomizations: AvailableCustomization[];
                missing: AvailableCustomization[];
                filled: CartCustomization[];
                itemId: string;
              }
            >();

            validation.availableCustomizations.forEach((avail) => {
              if (!avail.itemId) return;
              if (!itemsMap.has(avail.componentId)) {
                itemsMap.set(avail.componentId, {
                  itemName: avail.itemName,
                  allCustomizations: [],
                  missing: [],
                  filled: [],
                  itemId: avail.itemId,
                });
              }
              itemsMap.get(avail.componentId)!.allCustomizations.push(avail);
            });

            validation.missingRequired.forEach((missing) => {
              if (!missing.componentId) return;
              if (!itemsMap.has(missing.componentId)) {
                itemsMap.set(missing.componentId, {
                  itemName: missing.itemName,
                  allCustomizations: [],
                  missing: [],
                  filled: [],
                  itemId: missing.itemId,
                });
              }
              itemsMap.get(missing.componentId)!.missing.push(missing);
            });

            validation.availableCustomizations.forEach((avail) => {
              const filledCustom = validation.filledCustomizations.find(
                (f) =>
                  (f.customization_id === avail.id ||
                    f.customization_id?.split(":")[0] === avail.id) &&
                  (!f.componentId ||
                    f.componentId === avail.componentId ||
                    f.componentId === avail.itemId),
              );

              if (filledCustom && isCustomizationFilled(filledCustom)) {
                if (!itemsMap.has(avail.componentId)) {
                  itemsMap.set(avail.componentId, {
                    itemName: avail.itemName,
                    allCustomizations: [],
                    missing: [],
                    filled: [],
                    itemId: avail.itemId,
                  });
                }
                const entry = itemsMap.get(avail.componentId)!;
                if (
                  !entry.filled.some(
                    (f) => f.customization_id === filledCustom.customization_id,
                  )
                ) {
                  entry.filled.push(filledCustom);
                }
              }
            });

            if (itemsMap.size === 0) {
              return null;
            }

            return (
              <div
                key={
                  validation.orderItemId || `${validation.productId}-${vIdx}`
                }
                className="space-y-3"
              >
                {Array.from(itemsMap.entries()).map(
                  (
                    [componentId, { itemName, missing, filled, itemId }],
                    cIdx,
                  ) => {
                    const isIncomplete = missing.length > 0;
                    // const totalCustomizations = allCustomizations.length;

                    return (
                      <div
                        key={`${componentId}-${cIdx}`}
                        className={`border rounded-sm p-3 transition-all ${
                          isIncomplete
                            ? "border-amber-200 bg-white"
                            : "border-gray-200 bg-white/50"
                        }`}
                      >
                        {/* Header do item */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-1">
                              <div className="">
                                <h3 className="font-semibold text-xs text-gray-900">
                                  {validation.productName}
                                </h3>
                              </div>
                              {itemName && (
                                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                                  {itemName}
                                </p>
                              )}
                            </div>
                            {filled.length > 0 && (
                              <div className="max-w-[60%]">
                                <div className="flex flex-wrap gap-1.5">
                                  {filled.map((f, idx) => {
                                    const summary = getCustomizationSummary(f);
                                    if (!summary) return null;
                                    return (
                                      <Badge
                                        key={`${f.customization_id}-${idx}`}
                                        variant="outline"
                                        className="bg-white border-gray-200 text-gray-600 font-medium text-[10px] py-0.5 px-2"
                                      >
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                                        <p>
                                          {f.title}: {summary}
                                        </p>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleEditItem(
                                validation.productId,
                                itemId,
                                itemName || "Item",
                                componentId,
                              )
                            }
                            className={`h-8 px-2 font-medium text-xs ${
                              isIncomplete
                                ? "text-amber-700 hover:bg-amber-100"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                            Editar
                          </Button>
                        </div>

                        {/* Itens pendentes */}
                        {missing.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-amber-100">
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                              Pendentes ({missing.length})
                            </p>
                            <div className="grid grid-cols-1 gap-1">
                              {missing.map((m) => (
                                <div
                                  key={`${m.id}-${m.componentId}`}
                                  className="bg-amber-50/50 p-1.5 rounded border border-amber-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-100/50 text-amber-900 font-semibold text-[10px] py-0 px-1 border-0">
                                      {m.name}
                                    </Badge>
                                    <span className="text-[10px] text-amber-700 italic">
                                      {getCustomizationHint(m.type, m.name)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            );
          })}
        </div>

        {/* Mensagem de conclusão */}
        {allComplete && validations.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">
              Todas as personalizações foram preenchidas. Prossiga para o
              pagamento.
            </p>
          </div>
        )}
      </Card>

      {/* Modal de customização */}
      {activeItemId && (
        <ItemCustomizationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          itemId={activeItemId}
          itemName={activeItemName}
          customizations={activeCustomizations}
          onComplete={handleCustomizationComplete}
          initialValues={activeInitialValues}
        />
      )}
    </>
  );
}

// =============================================
// FUNÇÕES UTILITÁRIAS EXPORTADAS
// =============================================

export function validateCustomizations(
  cartItems: Array<{
    customizations?: CartCustomization[];
  }>,
): boolean {
  for (const item of cartItems) {
    for (const custom of item.customizations || []) {
      if (!custom.is_required) continue;
      if (!isCustomizationFilled(custom)) {
        return false;
      }
    }
  }
  return true;
}
