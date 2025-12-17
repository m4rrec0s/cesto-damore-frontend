"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, CheckCircle2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { useApi } from "@/app/hooks/use-api";
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
    customizations: CustomizationInput[]
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
      return Boolean(custom.selected_option);
    case "BASE_LAYOUT":
      return Boolean(custom.label_selected || custom.selected_item);
    case "IMAGES":
      return Boolean(custom.photos && custom.photos.length > 0);
    default:
      return true;
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
  const [activeInitialValues, setActiveInitialValues] = useState<
    Record<string, unknown>
  >({});

  const fetchAvailableCustomizations = useCallback(async () => {
    setIsLoading(true);
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
        const missingRequired = allAvailable.filter((avail) => {
          if (!avail.isRequired) return false;
          const filledCustom = filled.find(
            (f) =>
              f.customization_id === avail.id ||
              f.customization_id?.includes(avail.id)
          );
          return !isCustomizationFilled(filledCustom);
        });

        results.push({
          productId,
          productName: cartItem.product.name,
          availableCustomizations: allAvailable,
          filledCustomizations: filled,
          missingRequired,
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
          })),
          isComplete: missingFromFilled.length === 0,
        });
      }
    }

    setValidations(results);
    setIsLoading(false);
  }, [cartItems, getProduct, getItemCustomizations]);

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchAvailableCustomizations();
    } else {
      setValidations([]);
      setIsLoading(false);
    }
  }, [cartItems, fetchAvailableCustomizations]);

  // Abrir modal para editar customizações de um item específico
  const handleEditItem = useCallback(
    async (productId: string, itemId: string, itemName: string) => {
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
        const filled = cartItem?.customizations || [];
        const initialData: Record<string, unknown> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filled.forEach((fc: any) => {
          const ruleId = fc.customization_id;
          if (!ruleId) return;

          // Fallback mapping - CartCustomization pode ter propriedades dinamicamente adicionadas do servidor
          if (fc.customization_type === "TEXT") {
            initialData[ruleId] = fc.text;
          } else if (fc.customization_type === "MULTIPLE_CHOICE") {
            initialData[ruleId] = fc.selected_option;
          } else if (fc.customization_type === "IMAGES") {
            initialData[ruleId] = fc.photos;
          } else if (fc.customization_type === "BASE_LAYOUT") {
            if (fc.data) {
              initialData[ruleId] = fc.data;
            }
          }
        });

        setActiveInitialValues(initialData);
        setActiveItemId(itemId);
        setActiveItemName(itemName);
        setActiveCustomizations(modalCustoms);
        setActiveProductId(productId);
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
          });

          // Salvar cada customização no backend
          for (const customization of data) {
            const customData = customization.data as Record<string, unknown>;
            const previewUrl = customData?.previewUrl as string | undefined;

            // Sanitizar data para remover imageBuffer que causa erro 400 (payload muito grande/inválido)
            const sanitizedData = { ...customData };
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
        onCustomizationUpdate(activeProductId, data);
      }

      setModalOpen(false);
      // Recarregar validações após edição
      fetchAvailableCustomizations();
    },
    [
      activeItemId,
      activeProductId,
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
          // Agrupar por item
          const itemsMap = new Map<
            string,
            {
              itemName: string;
              missing: AvailableCustomization[];
              filled: CartCustomization[];
            }
          >();

          // Adicionar itens faltantes
          validation.missingRequired.forEach((missing) => {
            if (!missing.itemId) return;
            if (!itemsMap.has(missing.itemId)) {
              itemsMap.set(missing.itemId, {
                itemName: missing.itemName,
                missing: [],
                filled: [],
              });
            }
            itemsMap.get(missing.itemId)!.missing.push(missing);
          });

          // Adicionar itens preenchidos (iterando sobre availableCustomizations para agrupar corretamente)
          validation.availableCustomizations.forEach((avail) => {
            const filledCustom = validation.filledCustomizations.find(
              (f) =>
                f.customization_id === avail.id ||
                f.customization_id?.includes(avail.id)
            );

            if (filledCustom && isCustomizationFilled(filledCustom)) {
              if (!itemsMap.has(avail.itemId)) {
                itemsMap.set(avail.itemId, {
                  itemName: avail.itemName,
                  missing: [],
                  filled: [],
                });
              }
              const entry = itemsMap.get(avail.itemId)!;
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

          if (itemsMap.size === 0 && validation.isComplete) {
            return null;
          }

          return (
            <div key={validation.productId} className="space-y-1">
              {Array.from(itemsMap.entries()).map(
                ([itemId, { itemName, missing }]) => {
                  const isIncomplete = missing.length > 0;
                  const statusColor = isIncomplete ? "red" : "blue";
                  const StatusIcon = isIncomplete ? AlertCircle : CheckCircle2;

                  return (
                    <div
                      key={itemId}
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
                            ? `(${missing.length} pendente${missing.length > 1 ? "s" : ""
                            })`
                            : "(Personalizado)"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-${statusColor}-700 hover:text-${statusColor}-800 hover:bg-${statusColor}-100`}
                        onClick={() =>
                          handleEditItem(
                            validation.productId,
                            itemId,
                            itemName || "Item"
                          )
                        }
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
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
