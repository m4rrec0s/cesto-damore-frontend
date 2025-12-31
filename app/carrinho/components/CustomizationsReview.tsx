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
    componentId?: string
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
  type: "BASE_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  isRequired: boolean;
  price: number;
  customization_data: Record<string, unknown>;
}

// Alias para compatibilidade com o modal
type Customization = ModalCustomization;

const isCustomizationFilled = (
  custom: CartCustomization | undefined
): boolean => {
  if (!custom) return false;

  switch (custom.customization_type) {
    case "TEXT":
      return Boolean(custom.text && custom.text.trim().length > 0);
    case "MULTIPLE_CHOICE":
      return Boolean(custom.label_selected || custom.selected_option);
    case "BASE_LAYOUT":
      // BASE_LAYOUT é preenchido se tiver um item selecionado, um label ou dados brutos reais
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
          (Array.isArray(data.images) && data.images.length > 0)
      );
    case "IMAGES":
      return Boolean(custom.photos && custom.photos.length > 0);
    default:
      return true;
  }
};

const getCustomizationSummary = (custom: CartCustomization): string => {
  if (!isCustomizationFilled(custom)) return "";

  switch (custom.customization_type) {
    case "TEXT":
      return custom.text ? `Texto: "${custom.text}"` : "";
    case "MULTIPLE_CHOICE":
      return custom.label_selected || custom.selected_option_label || "";
    case "IMAGES":
      return custom.photos && custom.photos.length > 0
        ? `${custom.photos.length} foto(s)`
        : "";
    case "BASE_LAYOUT":
      return (
        custom.label_selected ||
        custom.selected_item_label ||
        "Layout personalizado"
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
    BASE_LAYOUT: "BASE_LAYOUT",
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
    null
  );
  const [activeInitialValues, setActiveInitialValues] = useState<
    Record<string, unknown>
  >({});

  const fetchAvailableCustomizations = useCallback(async () => {
    console.log(
      "🔍 [CustomizationsReview] Iniciando fetchAvailableCustomizations. orderId:",
      orderId
    );
    setIsLoading(true);

    // ✅ NOVO: Se tivermos orderId, buscar dados consolidados do backend
    if (orderId) {
      try {
        console.log(
          "🔍 [CustomizationsReview] Buscando dados consolidados para orderId:",
          orderId
        );
        const reviewData = await getCustomizationReviewData(orderId);
        console.log(
          "📋 [CustomizationsReview] reviewData recebida:",
          JSON.stringify(reviewData, null, 2)
        );

        const results: ProductValidation[] = reviewData.map((data) => {
          console.log(
            `📦 Processando item do pedido: ${data.productName} (${data.orderItemId})`
          );

          const filled: CartCustomization[] = data.filledCustomizations.map(
            (f) => {
              const val = (f.value || {}) as Record<string, unknown>;
              console.log(
                `  📝 Customização preenchida no BD: ID=${f.id}, ruleId=${f.customization_id}, componentId=${val.componentId}`
              );

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
            }
          );

          const missingRequired = data.availableCustomizations.filter(
            (avail) => {
              const filledCustom = filled.find(
                (f) =>
                  (f.customization_id === avail.id ||
                    f.customization_id?.includes(avail.id)) &&
                  (f.componentId === avail.componentId ||
                    f.componentId === avail.itemId)
              );

              const isFilled = isCustomizationFilled(filledCustom);
              console.log(
                `  ⚙️ Regra Disponível: ${avail.name} (ID: ${
                  avail.id
                }, Component: ${avail.componentId}) -> ${
                  isFilled ? "PREENCHIDA" : "PENDENTE"
                }`
              );

              return avail.isRequired && !isFilled;
            }
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
                component.item_id
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
                itemError
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
                f.componentId === avail.itemId) // ✅ Match by both rule and component
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
          error
        );

        const filled = cartItem.customizations || [];
        const missingFromFilled = filled.filter(
          (f) => f.is_required && !isCustomizationFilled(f)
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

  // ✅ Desserializar valor salvo de customizações (vem como string JSON do backend)
  const deserializeCustomizationValue = (
    value: string | undefined
  ): Record<string, unknown> => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn("Erro ao desserializar valor de customização:", e);
      return {};
    }
  };

  // Abrir modal para editar customizações de um item específico
  const handleEditItem = useCallback(
    async (
      productId: string,
      itemId: string,
      itemName: string,
      componentId: string
    ) => {
      try {
        const configResponse = await getItemCustomizations(itemId);
        const customizations = configResponse?.customizations || [];

        // Mapear para o formato esperado pelo modal
        const modalCustoms: Customization[] = customizations.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type as "BASE_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE",
          isRequired: c.isRequired,
          price: c.price,
          customization_data: c.customization_data,
        }));

        // Preparar initialValues
        const cartItem = cartItems.find((i) => i.product_id === productId);
        // ✅ Filtrar apenas customizações que pertencem a este componente específico
        const filled =
          cartItem?.customizations?.filter(
            (f) => f.componentId === componentId
          ) || [];
        const initialData: Record<string, unknown> = {};

        console.log("📋 [handleEditItem] Customizações do item no carrinho:", {
          itemId,
          totalCustomizations: filled.length,
          customizations: filled.map((f) => ({
            id: f.customization_id,
            type: f.customization_type,
            hasValue: !!f.value,
            valueType: typeof f.value,
            valuePreview:
              typeof f.value === "string"
                ? f.value.substring(0, 100)
                : "not-string",
          })),
        });

        filled.forEach((fc: CartCustomization) => {
          const ruleId = fc.customization_id;
          if (!ruleId) return;

          console.log(
            `🔍 [handleEditItem] Processando customização ${ruleId}:`,
            {
              type: fc.customization_type,
              hasValue: !!fc.value,
              valueType: typeof fc.value,
              hasText: !!fc.text,
              hasSelectedOption: !!fc.selected_option,
              hasPhotos: !!fc.photos,
              hasData: !!fc.data,
            }
          );

          // ✅ NOVO: Se temos 'value' como string (vem do backend), desserializar
          if (typeof fc.value === "string") {
            const deserialized = deserializeCustomizationValue(fc.value);
            initialData[ruleId] = deserialized;
            console.log(
              `✅ [handleEditItem] Desserializou customização ${ruleId}:`,
              deserialized
            );
            return;
          }

          // Fallback mapping - CartCustomization pode ter propriedades dinamicamente adicionadas do servidor
          if (fc.customization_type === "TEXT") {
            initialData[ruleId] = fc.text || "";
            console.log(`✅ [handleEditItem] Mapeou TEXT ${ruleId}:`, fc.text);
          } else if (fc.customization_type === "MULTIPLE_CHOICE") {
            initialData[ruleId] = fc.selected_option;
            console.log(
              `✅ [handleEditItem] Mapeou MULTIPLE_CHOICE ${ruleId}:`,
              fc.selected_option
            );
          } else if (fc.customization_type === "IMAGES") {
            initialData[ruleId] = fc.photos || [];
            console.log(
              `✅ [handleEditItem] Mapeou IMAGES ${ruleId}:`,
              fc.photos?.length
            );
          } else if (fc.customization_type === "BASE_LAYOUT") {
            initialData[ruleId] = fc.data || fc;
            console.log(
              `✅ [handleEditItem] Mapeou BASE_LAYOUT ${ruleId}:`,
              Object.keys(fc.data || fc)
            );
          }
        });

        console.log("📊 [handleEditItem] initialData final:", initialData);

        setActiveInitialValues(initialData);
        setActiveItemId(itemId);
        setActiveItemName(itemName);
        setActiveCustomizations(modalCustoms);
        setActiveProductId(productId);
        setActiveComponentId(componentId); // ✅ Set activeComponentId
        setModalOpen(true);
      } catch (error) {
        console.error("Erro ao carregar customizações:", error);
      }
    },
    [getItemCustomizations, cartItems, setModalOpen]
  );

  // Estado de salvamento
  const [isSaving, setIsSaving] = useState(false);

  // Callback quando customização é completada no modal
  const handleCustomizationComplete = useCallback(
    async (hasCustomizations: boolean, data: CustomizationInput[]) => {
      if (!hasCustomizations || !activeItemId) {
        setModalOpen(false);
        return;
      }

      // Se temos orderId, salvar diretamente no backend
      if (orderId && activeProductId) {
        setIsSaving(true);
        try {
          // Buscar o pedido para encontrar o OrderItem.id correto
          const order = await getOrder(orderId);

          // Encontrar o OrderItem que corresponde ao produto atual
          // OrderItem tem product_id que aponta para o produto
          const orderItem = order?.items?.find(
            (item: { product_id: string }) =>
              item.product_id === activeProductId
          );

          if (!orderItem) {
            console.error(
              "❌ OrderItem não encontrado para o produto:",
              activeProductId
            );
            toast.error("Item do pedido não encontrado.");
            setIsSaving(false);
            setModalOpen(false);
            return;
          }

          const orderItemId = orderItem.id;
          console.log("📍 [CustomizationsReview] OrderItem encontrado:", {
            orderItemId,
            productId: activeProductId,
            catalogItemId: activeItemId,
            componentId: activeComponentId,
          });

          // Salvar cada customização no backend
          for (const customization of data) {
            const customData = customization.data as Record<string, unknown>;
            const previewUrl = customData?.previewUrl as string | undefined;

            // Sanitizar data para remover imageBuffer que causa erro 400 (payload muito grande/inválido)
            const sanitizedData = { ...customData };

            // ✅ IMPORTANTE: Incluir componentId no data para recuperar depois
            if (activeComponentId) {
              sanitizedData.componentId = activeComponentId;
            }

            if (sanitizedData.images && Array.isArray(sanitizedData.images)) {
              sanitizedData.images = sanitizedData.images.map(
                (img: Record<string, unknown>) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { imageBuffer, ...rest } = img;
                  return rest;
                }
              );
            }

            // Preparar payload para o backend
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

            // Para BASE_LAYOUT com preview, adicionar como finalArtwork
            if (
              customization.customizationType === "BASE_LAYOUT" &&
              previewUrl
            ) {
              // Se é base64, enviar como finalArtwork
              if (previewUrl.startsWith("data:")) {
                payload.finalArtwork = {
                  base64: previewUrl,
                  mimeType: "image/png",
                  fileName: "artwork.png",
                };
              }
            }

            console.log("📤 [CustomizationsReview] Salvando customização:", {
              orderId,
              orderItemId,
              type: customization.customizationType,
              hasPreview: !!previewUrl,
              isBase64: previewUrl?.startsWith("data:"),
            });

            // Usar orderItemId (ID do item do pedido) em vez de activeItemId (ID do item do catálogo)
            await saveOrderItemCustomization(orderId, orderItemId, payload);
          }

          // Notificar sucesso
          console.log(
            "✅ [CustomizationsReview] Customização salva com sucesso!"
          );
          toast.success("Personalização salva no pedido!");
          onCustomizationSaved?.();
        } catch (error) {
          console.error(
            "❌ [CustomizationsReview] Erro ao salvar customização:",
            error
          );
          toast.error("Erro ao salvar personalização. Tente novamente.");
        } finally {
          setIsSaving(false);
        }
      }

      // ✅ ALWAYS update local state (fallback/sync)
      // This ensures use-cart logic has the latest data and doesn't overwrite backend with stale state on next sync
      if (activeProductId && onCustomizationUpdate) {
        onCustomizationUpdate(
          activeProductId,
          data,
          activeComponentId || undefined
        );
      }

      setModalOpen(false);
      // Recarregar validações após edição
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
    ]
  );

  // Se não há validações relevantes, não mostrar
  const hasRelevantValidations = validations.some(
    (v) =>
      v.availableCustomizations.length > 0 || v.filledCustomizations.length > 0
  );

  if (!hasRelevantValidations && !isLoading) {
    return null;
  }

  const totalMissing = validations.reduce(
    (acc, v) => acc + v.missingRequired.length,
    0
  );
  const allComplete = validations.every((v) => v.isComplete);

  // Loading state simples
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
      <div className="space-y-2">
        {/* Header simples */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Personalizações
          </span>
          {allComplete ? (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              OK
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {totalMissing} pendente{totalMissing > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Lista de items com customizações */}
        {validations.map((validation) => {
          // ✅ MUDANÇA: Mostrar TODAS as customizações disponíveis, não só as faltantes
          // Agrupar por COMPONENT instance em vez de apenas itemId
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

          // Adicionar TODAS as customizações disponíveis
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

          // Adicionar itens faltantes (obrigatórios não preenchidos)
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

          // Adicionar itens preenchidos
          validation.availableCustomizations.forEach((avail) => {
            const filledCustom = validation.filledCustomizations.find(
              (f) =>
                (f.customization_id === avail.id ||
                  f.customization_id?.includes(avail.id)) &&
                (f.componentId === avail.componentId ||
                  f.componentId === avail.itemId)
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
              // Evitar duplicatas
              if (
                !entry.filled.some(
                  (f) => f.customization_id === filledCustom.customization_id
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
            <div key={validation.productId} className="space-y-1">
              {Array.from(itemsMap.entries()).map(
                ([
                  componentId,
                  { itemName, allCustomizations, missing, filled, itemId },
                ]) => {
                  const isIncomplete = missing.length > 0;
                  const totalCustomizations = allCustomizations.length;
                  const statusColor = isIncomplete ? "red" : "blue";
                  const StatusIcon = isIncomplete ? AlertCircle : CheckCircle2;

                  return (
                    <div key={componentId} className="space-y-1">
                      <div
                        className={`flex items-center justify-between py-1.5 px-2 bg-${statusColor}-50 rounded text-sm`}
                      >
                        <div
                          className={`flex items-center gap-2 text-${statusColor}-700`}
                        >
                          <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {validation.productName}
                            {itemName && ` - ${itemName}`}
                          </span>
                          <span className={`text-${statusColor}-500 text-xs`}>
                            {isIncomplete
                              ? `(${
                                  missing.length
                                }/${totalCustomizations} pendente${
                                  missing.length > 1 ? "s" : ""
                                })`
                              : `(${totalCustomizations} personalizado${
                                  totalCustomizations > 1 ? "s" : ""
                                })`}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 text-${statusColor}-700 hover:text-${statusColor}-800 hover:bg-${statusColor}-100`}
                          onClick={() =>
                            handleEditItem(
                              validation.productId,
                              itemId, // ✅ Use the actual itemId from the map
                              itemName || "Item",
                              componentId // ✅ Pass componentId as 4th argument
                            )
                          }
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* ✅ NOVO: Lista de customizações preenchidas */}
                      {filled.length > 0 && (
                        <div className="pl-7 pb-1 flex flex-wrap gap-1.5">
                          {filled.map((f, idx) => {
                            const summary = getCustomizationSummary(f);
                            if (!summary) return null;
                            return (
                              <Badge
                                key={`${f.customization_id}-${idx}`}
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 font-normal border-gray-200 text-gray-600 bg-white"
                              >
                                {f.title}: {summary}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          );
        })}

        {/* Mensagem se completo */}
        {allComplete && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Todas as personalizações preenchidas
          </p>
        )}
      </div>

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
  }>
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
