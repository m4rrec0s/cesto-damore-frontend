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
  productId: string;
  productName: string;
  availableCustomizations: AvailableCustomization[];
  filledCustomizations: CartCustomization[];
  missingRequired: AvailableCustomization[];
  isComplete: boolean;
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

const isCustomizationFilled = (
  custom: CartCustomization | undefined,
): boolean => {
  if (!custom) return false;

  switch (custom.customization_type) {
    case "TEXT":
      return Boolean(custom.text && custom.text.trim().length > 0);
    case "MULTIPLE_CHOICE":
      return Boolean(custom.label_selected || custom.selected_option);
    case "DYNAMIC_LAYOUT":
      // DYNAMIC_LAYOUT é preenchido se tiver um item selecionado, um label ou dados brutos reais
      if (
        custom.selected_item_label ||
        custom.label_selected ||
        custom.selected_item
      )
        return true;
      if (!custom.data) return false;
      const data = custom.data as Record<string, unknown>;
      return Boolean(
        data.selected_item ||
        data.label_selected ||
        data.selected_item_label ||
        data.text ||
        (Array.isArray(data.photos) && data.photos.length > 0) ||
        (Array.isArray(data.images) && data.images.length > 0),
      );
    case "IMAGES":
      return Boolean(custom.photos && custom.photos.length > 0);
    default:
      return true;
  }
};

// Extrai o texto limpo de um valor que pode estar serializado
const extractCleanText = (text: string | undefined): string => {
  if (!text) return "";

  // Se começar com "field-", extrair o valor após o ": "
  if (text.startsWith("field-")) {
    const colonIndex = text.indexOf(":");
    if (colonIndex !== -1) {
      let extracted = text.substring(colonIndex + 1).trim();
      // Remover ", text: ", ", fields: ", etc. se existirem
      const commaIndex = extracted.indexOf(",");
      if (commaIndex !== -1) {
        extracted = extracted.substring(0, commaIndex).trim();
      }
      return extracted;
    }
  }

  // Se contiver ", text: ", extrair o valor após isso
  if (text.includes(", text: ")) {
    const textMatch = text.match(/,\s*text:\s*([^,]+)/);
    if (textMatch && textMatch[1]) {
      return textMatch[1].trim();
    }
  }

  // Se for JSON, tentar parsear
  try {
    if (text.startsWith("{")) {
      const obj = JSON.parse(text);
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

  // Retornar o texto como está
  return text;
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
              const val = (f.value || {}) as Record<string, unknown>;

              return {
                id: f.id,
                customization_id: f.customization_id,
                customization_type:
                  (val.customization_type as CustomizationTypeValue) || "TEXT",
                title:
                  (val.title as string) ||
                  (val._customizationName as string) ||
                  "Personalização",
                is_required: Boolean(val.is_required),
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
                componentId: val.componentId as string | undefined,
                data: val,
              };
            },
          );

          const missingRequired = data.availableCustomizations.filter(
            (avail) => {
              const filledCustom = filled.find(
                (f) =>
                  (f.customization_id === avail.id ||
                    f.customization_id?.includes(avail.id)) &&
                  (f.componentId === avail.componentId ||
                    f.componentId === avail.itemId),
              );

              const isFilled = isCustomizationFilled(filledCustom);
              return avail.isRequired && !isFilled;
            },
          );

          return {
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
              (f.componentId === avail.componentId ||
                f.componentId === avail.itemId), // ✅ Match by both rule and component
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
            const customData = customization.data as Record<string, unknown>;
            const previewUrl = customData?.previewUrl as string | undefined;

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
      <Card className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Personalizações</h3>
            <p className="text-sm text-gray-600">
              Revise as personalizações dos seus itens
            </p>
          </div>
          <div className="flex flex-col items-end">
            {allComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Completo
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {totalMissing} pendente{totalMissing > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {validations.map((validation) => {
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
                    f.customization_id?.includes(avail.id)) &&
                  (f.componentId === avail.componentId ||
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
              <div key={validation.productId} className="space-y-3">
                {Array.from(itemsMap.entries()).map(
                  ([componentId, { itemName, missing, filled, itemId }]) => {
                    const isIncomplete = missing.length > 0;
                    // const totalCustomizations = allCustomizations.length;

                    return (
                      <div
                        key={componentId}
                        className={`border rounded-sm p-4 transition-all ${
                          isIncomplete ? "border-amber-200" : "border-green-200"
                        }`}
                      >
                        {/* Header do item */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-1">
                              <div className="">
                                <h2 className="font-medium text-sm text-gray-900">
                                  {validation.productName}
                                </h2>
                                {/* <p
                                  className={`text-xs font-medium mt-1 ${
                                    isIncomplete
                                      ? "text-amber-700"
                                      : "text-green-700"
                                  }`}
                                >
                                  {isIncomplete
                                    ? `${
                                        missing.length
                                      } de ${totalCustomizations} pendente${
                                        missing.length > 1 ? "s" : ""
                                      }`
                                    : `${totalCustomizations} personalizado${
                                        totalCustomizations > 1 ? "s" : ""
                                      }`}
                                </p> */}
                              </div>
                              {itemName && (
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {itemName}
                                </p>
                              )}
                            </div>
                            {filled.length > 0 && (
                              <div className="max-w-[60%]">
                                <div className="flex flex-wrap gap-2">
                                  {filled.map((f, idx) => {
                                    const summary = getCustomizationSummary(f);
                                    if (!summary) return null;
                                    return (
                                      <Badge
                                        key={`${f.customization_id}-${idx}`}
                                        variant="outline"
                                        className="bg-white border-gray-300 text-gray-700 font-medium text-xs py-1 px-2.5"
                                      >
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
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
                            className={`h-9 px-3 font-medium text-sm ${
                              isIncomplete
                                ? "text-amber-700 hover:bg-amber-100"
                                : "text-green-700 hover:bg-green-100"
                            }`}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>

                        {/* Itens pendentes */}
                        {missing.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-amber-200">
                            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                              Pendentes
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {missing.map((m) => (
                                <Badge
                                  key={m.id}
                                  className="bg-amber-100 text-amber-900 font-medium text-xs py-1 px-2.5 border-0"
                                >
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                                  {m.name}
                                </Badge>
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
