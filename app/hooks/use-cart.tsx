import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useApi,
  Product,
  ProductComponent,
  Customization,
  Additional,
  CustomizationTypeValue,
  Order,
} from "./use-api";
import { useAuth } from "./use-auth";
import type { CustomizationValue, PhotoUploadData } from "./use-customization";

export interface CartCustomization extends CustomizationValue {
  id?: string;
  componentId?: string;
  title: string;
  customization_type: CustomizationTypeValue;
  is_required: boolean;
  price_adjustment?: number;
  selected_option_label?: string;
  selected_item_label?: string;
  label_selected?: string;
  additional_time?: number;
  data?: Record<string, unknown>;
  fabricState?: string;
  value?: string;
}

interface OrderAdditionalItem {
  additional_id: string;
  quantity: number;
  price: number;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  additionals?: OrderAdditionalItem[];
  customizations?: {
    customization_id?: string;
    customization_type?: string;
    title?: string;
    customization_data?: Record<string, unknown>;
  }[];
}

export interface CartItem {
  product_id: string;
  quantity: number;
  price: number;
  effectivePrice: number;
  discount?: number;
  additional_ids?: string[];
  additionals?: Additional[];
  additional_colors?: Record<string, string>;
  customizations?: CartCustomization[];
  customization_total?: number;
  product: Product;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface DeliveryWindow {
  start: string;
  end: string;
}

export interface TimeSlot {
  value: string;
  label: string;
}

export interface AvailableDate {
  date: Date;
  slots: TimeSlot[];
}

const serializeAdditionals = (additionals?: string[]) => {
  if (!additionals || additionals.length === 0) return "[]";
  return JSON.stringify([...additionals].sort());
};

const serializeAdditionalColors = (colors?: Record<string, string>): string => {
  if (!colors) return "{}";
  const normalized = Object.entries(colors).sort(([idA], [idB]) =>
    idA.localeCompare(idB),
  );
  return JSON.stringify(normalized);
};

const serializeCustomizations = (customizations?: CartCustomization[]) => {
  if (!customizations || customizations.length === 0) {
    return "[]";
  }

  const normalized = customizations.map((customization) => {

    const baseFields = [
      "text",
      "photos",
      "selected_option",
      "selected_item",
      "customization_type",
      "customization_id",
      "title",
      "price_adjustment",
      "componentId",
    ];

    const cleanData: Record<string, unknown> = {};
    if (customization.data) {
      Object.entries(customization.data).forEach(([key, value]) => {
        if (!baseFields.includes(key) && !key.startsWith("_")) {
          cleanData[key] = value;
        }
      });
    }

    return {
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

      label_selected: customization.label_selected || null,
      selected_item_label: customization.selected_item_label || null,
      selected_option_label: customization.selected_option_label || null,
      componentId: customization.componentId || null,
      data: Object.keys(cleanData).length > 0 ? cleanData : null,
      fabricState: customization.fabricState || null,
      photos:
        customization.photos?.map(
          (photo) =>
            photo.temp_file_id || photo.preview_url || photo.original_name,
        ) || [],
    };
  });

  normalized.sort((a, b) =>
    a.customization_id.localeCompare(b.customization_id),
  );

  return JSON.stringify(normalized);
};

const cloneCustomizations = (
  customizations?: CartCustomization[],
): CartCustomization[] => {
  if (!customizations || customizations.length === 0) return [];

  return customizations.map((customization) => ({
    ...customization,
    photos: customization.photos
      ? customization.photos.map((photo) => ({ ...photo }))
      : undefined,
    selected_item: customization.selected_item
      ? { ...customization.selected_item }
      : undefined,
  }));
};

const calculateCustomizationTotal = (
  customizations?: CartCustomization[],
): number => {
  if (!customizations) return 0;
  return customizations.reduce(
    (sum, customization) => sum + (customization.price_adjustment || 0),
    0,
  );
};

const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[],
): number => {
  if (!customizations || customizations.length === 0) return basePrice;

  const additionalCustomizations = customizations.filter(
    (c) =>
      (c.componentId && c.componentId === additionalId) ||
      (!c.componentId &&
        (c.customization_id?.includes(additionalId) ||
          c.customization_id?.endsWith(`_${additionalId}`))),
  );

  if (additionalCustomizations.length === 0) return basePrice;

  const adjustmentTotal = additionalCustomizations.reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0,
  );

  return basePrice + adjustmentTotal;
};

interface CartContextType {
  cart: CartState;
  addToCart: (
    productId: string,
    quantity?: number,
    additionals?: string[],
    additionalColors?: Record<string, string>,
    customizations?: CartCustomization[],
  ) => Promise<void>;
  removeFromCart: (
    productId: string,
    additionals?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>,
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    additionals?: string[],
    customizations?: CartCustomization[],
    additionalColors?: Record<string, string>,
  ) => void;
  updateCustomizations: (
    productId: string,
    oldCustomizations: CartCustomization[],
    newCustomizations: CartCustomization[],
    additionals?: string[],
    additionalColors?: Record<string, string>,
  ) => void;
  clearCart: () => void;
  createOrder: (
    userId: string,
    deliveryAddress?: string,
    deliveryDate?: Date,
    options?: {
      shippingCost?: number;
      paymentMethod?: "pix" | "card";
      grandTotal?: number;
      deliveryCity?: string;
      deliveryState?: string;
      recipientPhone?: string;
    },
  ) => Promise<unknown>;
  createOrderWithTransparentCheckout: (
    userId: string,
    deliveryAddress?: string,
    deliveryDate?: Date,
    options?: {
      shippingCost?: number;
      paymentMethod?: "pix" | "card";
      grandTotal?: number;
      deliveryCity?: string;
      deliveryState?: string;
      recipientPhone?: string;
    },
  ) => Promise<{
    order: { id: number; status: string; total: number };
    checkoutUrl: string;
    redirectToCheckout: () => void;
  }>;
  createPaymentPreference: (
    userEmail: string,
    orderId?: string,
  ) => Promise<{
    init_point?: string;
    sandbox_init_point?: string;
    id: string;
  }>;
  processTransparentPayment: (
    orderId: string,
    paymentData: {
      payment_method_id: "pix" | "credit_card" | "debit_card";
      token?: string;
      issuer_id?: string;
      installments?: number;
      payer: {
        email: string;
        first_name?: string;
        last_name?: string;
        identification?: {
          type: string;
          number: string;
        };
      };
    },
  ) => Promise<unknown>;
  getDeliveryWindows: () => {
    weekdays: DeliveryWindow[];
    weekends: DeliveryWindow[];
  };
  isWeekend: (date: Date) => boolean;
  hasCustomItems: () => boolean;
  getMinPreparationHours: () => number;
  getMaxProductionTime: () => number;
  generateTimeSlots: (date: Date) => TimeSlot[];
  getAvailableDates: () => AvailableDate[];
  isDateDisabledInCalendar: (date: Date) => boolean;
  getDeliveryDateBounds: () => { minDate: Date; maxDate: Date };
  getProductionTimeline: () => {
    productionHours: number;
    productionEndsAt: Date;
    earliestPickupTime: Date;
    formattedProductionEnds: string;
    formattedPickup: string;
  };
  formatDate: (date: Date) => string;
  orderMetadata: Record<string, unknown>;
  setOrderMetadata: (metadata: Record<string, unknown>) => void;
}

export function useCart(): CartContextType {
  const api = useApi();
  const { user } = useAuth();

  const [cart, setCart] = useState<CartState>({
    items: [],
    total: 0,
    itemCount: 0,
  });

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const isInitializedRef = useRef<boolean>(false);
  const getOrderAttemptedRef = useRef<Set<string>>(new Set());

  const calculateTotals = useCallback((items: CartItem[]): CartState => {
    const safeItems = Array.isArray(items) ? items : [];

    const total = safeItems.reduce((sum, item) => {
      const itemTotal = item.effectivePrice * item.quantity;
      const additionalsTotal =
        item.additionals?.reduce(
          (addSum, add) =>
            addSum +
            getAdditionalFinalPrice(add.id, add.price, item.customizations) *
              item.quantity,
          0,
        ) || 0;
      return sum + itemTotal + additionalsTotal;
    }, 0);

    const itemCount = safeItems.reduce(
      (count, item) => count + item.quantity,
      0,
    );

    return {
      items: safeItems,
      total,
      itemCount,
    };
  }, []);

  const [orderMetadata, _setOrderMetadata] = useState<{
    send_anonymously?: boolean;
    complement?: string;
  }>({});

  const setOrderMetadata = useCallback(
    (metadata: { send_anonymously?: boolean; complement?: string }) => {
      _setOrderMetadata((prev) => ({ ...prev, ...metadata }));
    },
    [],
  );

  useEffect(() => {
    if (!user) return;

    if (!pendingOrderId) return;

    const syncMetadata = async () => {
      try {
        await api.updateOrderMetadata(pendingOrderId, {
          send_anonymously: orderMetadata.send_anonymously,
          complement: orderMetadata.complement,
        });
      } catch (error) {
        console.error("❌ Erro ao sincronizar metadata:", error);
      }
    };

    const timeoutId = setTimeout(syncMetadata, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orderMetadata.send_anonymously,
    orderMetadata.complement,
    pendingOrderId,
    user,
  ]);

  const transformOrderToCartItems = useCallback(
    async (serverOrder: Order): Promise<CartItem[]> => {
      if (!serverOrder || !serverOrder.items) return [];

      const cartItems: CartItem[] = [];

      for (const orderItem of serverOrder.items) {
        try {
          const product = await api.getProduct(orderItem.product_id);

          const additionalPriceMap = new Map<string, number>();
          if (orderItem.additionals && orderItem.additionals.length > 0) {
            orderItem.additionals.forEach((add: { additional_id: string; price?: number }) => {
              if (typeof add.price === "number") {
                additionalPriceMap.set(add.additional_id, add.price);
              }
            });
          }

          const additionals =
            orderItem.additionals && orderItem.additionals.length > 0
              ? await Promise.all(
                  orderItem.additionals.map((add: { additional_id: string }) =>
                    api.getAdditional(add.additional_id),
                  ),
                )
              : [];

          const additionalsWithPrice = additionals.map((additional) => {
            const resolvedPrice = additionalPriceMap.get(additional.id);
            return {
              ...additional,
              price:
                typeof resolvedPrice === "number"
                  ? resolvedPrice
                  : additional.price,
            };
          });

          const customizations: CartCustomization[] = [];
          if (orderItem.customizations && orderItem.customizations.length > 0) {
            for (const customization of orderItem.customizations) {
              try {

                let data: Record<string, unknown> = {};

                if (typeof customization.value === "string") {
                  data = JSON.parse(customization.value);
                } else if (
                  typeof customization.value === "object" &&
                  customization.value !== null
                ) {
                  data = customization.value as Record<string, unknown>;
                }

                const componentId = (data.componentId as string) || undefined;
                const customizationId = (customization.customization_id ||
                  data.customization_id ||
                  data.customizationRuleId ||
                  "") as string;

                const baseRuleId = customizationId.includes(":")
                  ? customizationId.split(":")[0]
                  : customizationId;

                let isRequired = false;
                let inferredType: string | undefined;

                if (product.customizations) {
                  const rule = product.customizations.find(
                    (c: Customization) => c.id === baseRuleId,
                  );
                  if (rule) {
                    isRequired = rule.isRequired || false;
                    inferredType = rule.type;
                  }
                }

                if (!isRequired && product.components) {
                  product.components.forEach((comp: ProductComponent) => {
                    const rule = comp.item?.customizations?.find(
                      (c: Customization) => c.id === baseRuleId,
                    );
                    if (rule) {
                      isRequired = rule.isRequired || false;
                      inferredType = rule.type;
                    }
                  });
                }

                const customizationType = (data.customization_type ||
                  customization.customization_type ||
                  inferredType ||
                  "TEXT") as string;

                if (customizationType === "TEXT") {
                  customizations.push({
                    id: customization.id,
                    componentId,
                    customization_id: customizationId,
                    title: (data.title as string) || "Personalização",
                    customization_type: "TEXT",
                    is_required: isRequired,
                    price_adjustment: (data.price_adjustment as number) || 0,
                    text: (data.text as string) || "",
                    value:
                      typeof customization.value === "string"
                        ? customization.value
                        : JSON.stringify(customization.value),
                  });
                } else if (customizationType === "MULTIPLE_CHOICE") {
                  customizations.push({
                    id: customization.id,
                    componentId,
                    customization_id: customizationId,
                    title: (data.title as string) || "Personalização",
                    customization_type: "MULTIPLE_CHOICE",
                    is_required: isRequired,
                    price_adjustment: (data.price_adjustment as number) || 0,
                    selected_option: data.selected_option as string | undefined,
                    selected_option_label: data.selected_option_label as
                      | string
                      | undefined,
                    label_selected:
                      (data.label_selected as string) ||
                      (data.selected_option_label as string),
                    value:
                      typeof customization.value === "string"
                        ? customization.value
                        : JSON.stringify(customization.value),
                  });
                } else if (customizationType === "IMAGES") {
                  customizations.push({
                    id: customization.id,
                    componentId,
                    customization_id: customizationId,
                    title: (data.title as string) || "Personalização",
                    customization_type: "IMAGES",
                    is_required: isRequired,
                    price_adjustment: (data.price_adjustment as number) || 0,
                    photos: (data.photos as PhotoUploadData[]) || [],
                    value:
                      typeof customization.value === "string"
                        ? customization.value
                        : JSON.stringify(customization.value),
                  });
                } else if (customizationType === "DYNAMIC_LAYOUT") {
                  customizations.push({
                    id: customization.id,
                    componentId,
                    customization_id: customizationId,
                    title: (data.title as string) || "Design",
                    customization_type: "DYNAMIC_LAYOUT",
                    is_required: isRequired,
                    price_adjustment: (data.price_adjustment as number) || 0,
                    text: (data.text as string) || "",
                    selected_option: data.selected_option as string | undefined,
                    selected_option_label: data.selected_option_label as
                      | string
                      | undefined,
                    label_selected:
                      (data.label_selected as string) ||
                      (data.selected_item_label as string) ||
                      (data.selected_option_label as string) ||
                      (data.text as string),
                    additional_time: (data.additional_time as number) || 0,
                    data: data,
                    fabricState: (data.fabricState as string) || undefined,
                    value:
                      typeof customization.value === "string"
                        ? customization.value
                        : JSON.stringify(customization.value),
                  });
                } else {
                  customizations.push({
                    id: customization.id,
                    componentId,
                    customization_id: customizationId,
                    title: (data.title as string) || "Personalização",
                    customization_type:
                      (customizationType as CustomizationTypeValue) || "TEXT",
                    is_required: isRequired,
                    price_adjustment: (data.price_adjustment as number) || 0,
                    data: data,
                    value:
                      typeof customization.value === "string"
                        ? customization.value
                        : JSON.stringify(customization.value),
                  });
                }
              } catch (error) {
                console.error("Erro ao parsear customização:", error);
              }
            }
          }

          const customizationTotal = customizations.reduce(
            (sum, c) => sum + (c.price_adjustment || 0),
            0,
          );

          const baseEffective =
            product.price * (1 - (product.discount || 0) / 100);
          const effectivePrice = Number(
            (baseEffective + customizationTotal).toFixed(2),
          );

          cartItems.push({
            product_id: orderItem.product_id,
            quantity: orderItem.quantity,
            price: product.price,
            effectivePrice,
            discount: product.discount || 0,
            additional_ids:
              orderItem.additionals?.map(
                (add: { additional_id: string }) => add.additional_id,
              ) || [],
            additionals: additionalsWithPrice,
            customizations:
              customizations.length > 0 ? customizations : undefined,
            customization_total:
              customizationTotal > 0 ? customizationTotal : undefined,
            product,
          });
        } catch (err) {
          console.error(`Erro ao transformar item ${orderItem.id}:`, err);
        }
      }

      return cartItems;
    },
    [api],
  );

  useEffect(() => {
    const loadPendingOrder = async () => {
      if (!user) return;

      if (isInitializedRef.current) return;

      try {
        const pendingOrder = await api.getPendingOrder(user.id);
        if (
          pendingOrder &&
          pendingOrder.items &&
          pendingOrder.items.length > 0
        ) {
          const cartItems = await transformOrderToCartItems(pendingOrder);

          if (
            pendingOrder.send_anonymously !== undefined ||
            pendingOrder.complement
          ) {
            _setOrderMetadata({
              send_anonymously: pendingOrder.send_anonymously || false,
              complement: pendingOrder.complement || undefined,
            });
          }

          const updatedCart = calculateTotals(cartItems);
          setCart(updatedCart);
          setPendingOrderId(pendingOrder.id);

          isInitializedRef.current = true;
        } else {

          isInitializedRef.current = true;
        }
      } catch (error) {
        console.error("Erro ao carregar pedido pendente:", error);

        isInitializedRef.current = true;
      }
    };

    loadPendingOrder();
  }, [user, api, calculateTotals, setOrderMetadata, transformOrderToCartItems]);

  const cartItemsToOrderItems = useCallback((items: CartItem[]) => {
    return items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.effectivePrice,
      additionals: item.additionals?.map((add) => ({
        additional_id: add.id,
        quantity: item.quantity,
        price: add.price,
      })),
      customizations: item.customizations?.map((custom) => ({
        customization_id: custom.customization_id || undefined,
        customization_type: custom.customization_type,
        title: custom.title,
        customization_data: {
          text: custom.text,
          photos: custom.photos,
          selected_option: custom.selected_option,
          selected_item: custom.selected_item,

          componentId: custom.componentId,

          selected_option_label: custom.selected_option_label,
          selected_item_label: custom.selected_item_label,
          label_selected: custom.label_selected,
          price_adjustment: custom.price_adjustment,
          additional_time: custom.additional_time || 0,
          fabricState: custom.fabricState,
          ...custom.data,
        },
      })),
    }));
  }, []);

  const syncLockRef = useRef<boolean>(false);

  const syncCartToBackend = useCallback(
    async (currentCart: CartState) => {
      if (!user) return;

      if (!isInitializedRef.current) {
        return;
      }

      if (syncLockRef.current) {
        return;
      }

      syncLockRef.current = true;
      try {
        const itemsPayload = cartItemsToOrderItems(currentCart.items);

        if (itemsPayload.length === 0) {
          if (
            pendingOrderId &&
            getOrderAttemptedRef.current.has(pendingOrderId)
          ) {

            try {

              await api.deleteOrder(pendingOrderId);
              setPendingOrderId(null);
              setOrderMetadata({
                send_anonymously: false,
                complement: undefined,
              });
            } catch (error) {
              console.error("Erro ao deletar pedido pendente:", error);
            }
          } else if (pendingOrderId) {

            try {
              const serverOrder = await api.getOrder(pendingOrderId);
              getOrderAttemptedRef.current.add(pendingOrderId);
              const status = serverOrder?.status;
              if (status && (status === "PENDING" || status === "pending")) {
                await api.deleteOrder(pendingOrderId);
                setPendingOrderId(null);
                setOrderMetadata({
                  send_anonymously: false,
                  complement: undefined,
                });
              } else {
              }
            } catch (error) {
              console.error(
                "Erro ao verificar/deletar pedido pendente:",
                error,
              );
            }
          }
          return;
        }

        if (!pendingOrderId) {
          try {
            const existingPending = await api.getPendingOrder(user.id);
            if (existingPending) {
              setPendingOrderId(existingPending.id);
              _setOrderMetadata({
                send_anonymously: !!existingPending.send_anonymously,
                complement: existingPending.complement || undefined,
              });
              const orderIdToUpdate = existingPending.id;
              await api.updateOrderItems(orderIdToUpdate, itemsPayload);
              return;
            }
          } catch (error) {
            console.error(
              "Erro ao verificar pedido pendente existente:",
              error,
            );
          }

          const payload: {
            user_id: string;
            items: OrderItem[];
            is_draft: boolean;
            send_anonymously: boolean;
            complement?: string;
          } = {
            user_id: user.id,
            items: itemsPayload,
            is_draft: true,
            send_anonymously: orderMetadata.send_anonymously || false,
            complement: orderMetadata.complement || undefined,
          };
          const order = await api.createOrder(payload);
          setPendingOrderId(order?.id || null);
        } else {
          try {
            await api.updateOrderItems(pendingOrderId, itemsPayload);
          } catch (updateError: unknown) {
            console.error("Erro ao atualizar pedido:", updateError);
            const maybe = updateError as { response?: { status: number } };
            const status = maybe?.response?.status;

            if (status === 403 || status === 404) {
              console.warn("⚠️ Pedido inválido, criando novo...");
              setPendingOrderId(null);

              const payload: {
                user_id: string;
                items: OrderItem[];
                is_draft: boolean;
                send_anonymously: boolean;
                complement?: string;
              } = {
                user_id: user.id,
                items: itemsPayload,
                is_draft: true,
                send_anonymously: orderMetadata.send_anonymously || false,
                complement: orderMetadata.complement || undefined,
              };
              const newOrder = await api.createOrder(payload);
              setPendingOrderId(newOrder?.id || null);

            } else {

              throw updateError;
            }
          }
        }
      } catch (error: unknown) {
        console.error("Erro ao sincronizar carrinho com backend:", error);

        try {
          const maybe = error as { response?: { status: number } };
          const status = maybe?.response?.status;
          if (status === 403 || status === 404) {
            setPendingOrderId(null);
            setOrderMetadata({
              send_anonymously: false,
              complement: undefined,
            });
            return;
          }
          if (status === 500) {
            toast.error(
              "Erro ao sincronizar o carrinho com o servidor. Tente novamente mais tarde.",
            );
          }
        } catch {

        }
      } finally {

        syncLockRef.current = false;
      }
    },
    [
      api,
      cartItemsToOrderItems,
      pendingOrderId,
      user,
      orderMetadata,
      setOrderMetadata,
    ],
  );

  const syncTimeoutRef = useRef<number | null>(null);

  const dateDisabledCacheRef = useRef<Map<string, boolean>>(new Map());

  const debouncedSync = useCallback(
    (currentCart: CartState) => {
      if (typeof window === "undefined") return;
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = window.setTimeout(() => {
        void syncCartToBackend(currentCart);
      }, 300);
    },
    [syncCartToBackend],
  );

  useEffect(() => {
    dateDisabledCacheRef.current.clear();
  }, [cart]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;

      try {
        if (
          pendingOrderId &&
          !getOrderAttemptedRef.current.has(pendingOrderId)
        ) {

          getOrderAttemptedRef.current.add(pendingOrderId);

          const serverOrder = await api.getOrder(pendingOrderId);
          if (serverOrder?.items && serverOrder.items.length > 0) {
            const transformedCart = calculateTotals(
              (() => {
                type ServerAdditional = {
                  additional_id: string;
                  price: number;
                  additional?: { name?: string };
                };
                type ServerCustomization = {
                  customization_id?: string;
                  value?: string;
                };
                type ServerOrderItem = {
                  product_id: string;
                  quantity: number;
                  price: number;
                  effectivePrice?: number;
                  customization_total?: number;
                  additionals?: ServerAdditional[];
                  customizations?: ServerCustomization[];
                  product?: Product;
                };

                return serverOrder.items.map((it: ServerOrderItem) => {
                  const item = it;

                  const additionals =
                    item.additionals?.map((a) => ({
                      id: a.additional_id,
                      price: a.price,
                      name: a.additional?.name,
                    })) || [];

                  const customizations = item.customizations
                    ? item.customizations.map((c) => {
                        const parsed = (() => {
                          try {
                            return JSON.parse(c.value || "{}") as Record<
                              string,
                              unknown
                            >;
                          } catch {
                            return {};
                          }
                        })();

                        return {
                          ...parsed,
                          customization_id: c.customization_id,
                          title: (parsed.title as string) || undefined,
                        };
                      })
                    : undefined;

                  return {
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,

                    effectivePrice:
                      item.effectivePrice !== undefined
                        ? item.effectivePrice
                        : Number(
                            (
                              item.price + (item.customization_total || 0)
                            ).toFixed(2),
                          ),
                    additionals,
                    customizations,
                    product: item.product,
                  };
                });
              })(),
            );
            if (transformedCart.items.length > 0 && cart.items.length === 0) {
              setCart(transformedCart);
            }

            if (
              typeof serverOrder.send_anonymously !== "undefined" ||
              serverOrder.complement
            ) {
              setOrderMetadata({
                send_anonymously: !!serverOrder.send_anonymously,
                complement: serverOrder.complement || undefined,
              });
            }
          }
        } else if (cart.items.length > 0) {

          await syncCartToBackend(cart);
        }
      } catch (error) {
        console.error("Erro ao inicializar sincronização de carrinho:", error);
      }
    };

    init();
  }, [
    user,
    pendingOrderId,
    api,
    calculateTotals,
    syncCartToBackend,
    cart,
    setOrderMetadata,
    cart.items.length,
  ]);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity: number = 1,
      additionals?: string[],
      additionalColors?: Record<string, string>,
      customizations?: CartCustomization[],
    ) => {
      try {
        const product = await api.getProduct(productId);

        const additionalDetails =
          additionals && additionals.length > 0
            ? await Promise.all(additionals.map((id) => api.getAdditional(id)))
            : [];

        const additionalsWithPrice = additionalDetails.map((additional) => {
          const customPrice = additional.compatible_products?.find(
            (entry: { product_id: string; is_active: boolean; }) => entry.product_id === productId && entry.is_active,
          )?.custom_price;

          return {
            ...additional,
            price:
              typeof customPrice === "number" ? customPrice : additional.price,
          };
        });

        const discount = product.discount || 0;
        const customizationEntries = cloneCustomizations(customizations);
        const customizationTotal =
          calculateCustomizationTotal(customizationEntries);

        const baseEffective = product.price * (1 - discount / 100);
        const effectivePrice = Number(
          (baseEffective + customizationTotal).toFixed(2),
        );

        const newItem: CartItem = {
          product_id: productId,
          quantity,
          price: product.price,
          effectivePrice,
          discount,
          additional_ids: additionals,
          additionals: additionalsWithPrice,
          additional_colors: additionalColors,
          customizations:
            customizationEntries.length > 0 ? customizationEntries : undefined,
          customization_total:
            customizationEntries.length > 0 ? customizationTotal : undefined,
          product,
        };

        setCart((prevCart) => {
          const currentItems = Array.isArray(prevCart.items)
            ? prevCart.items
            : [];

          const targetAdditionalsKey = serializeAdditionals(additionals);
          const targetColorsKey = serializeAdditionalColors(additionalColors);
          const targetCustomizationsKey =
            serializeCustomizations(customizationEntries);

          const existingIndex = currentItems.findIndex((item) => {
            const itemAddsKey = serializeAdditionals(item.additional_ids);
            const itemColorsKey = serializeAdditionalColors(
              item.additional_colors,
            );
            const itemCustsKey = serializeCustomizations(item.customizations);

            const match =
              item.product_id === productId &&
              itemAddsKey === targetAdditionalsKey &&
              itemColorsKey === targetColorsKey &&
              itemCustsKey === targetCustomizationsKey;

            return match;
          });

          let newItems: CartItem[];
          if (existingIndex >= 0) {
            newItems = [...currentItems];
            const updatedItem = { ...newItems[existingIndex] };
            updatedItem.quantity += quantity;
            const existingBaseEffective =
              updatedItem.price * (1 - (updatedItem.discount || 0) / 100);
            updatedItem.effectivePrice = Number(
              (existingBaseEffective + customizationTotal).toFixed(2),
            );
            updatedItem.customization_total = customizationTotal;
            updatedItem.customizations =
              customizationEntries.length > 0
                ? customizationEntries
                : undefined;
            newItems[existingIndex] = updatedItem;
          } else {
            newItems = [...currentItems, newItem];
          }

          const updatedCart = calculateTotals(newItems);
          debouncedSync(updatedCart);
          return updatedCart;
        });

      } catch (error) {
        console.error("❌ [addToCart] Erro:", error);

        throw error;
      }
    },
    [api, calculateTotals, debouncedSync],
  );

  const removeFromCart = useCallback(
    (
      productId: string,
      additionals?: string[],
      customizations?: CartCustomization[],
      additionalColors?: Record<string, string>,
    ) => {
      let removedItem: CartItem | null = null;

      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const targetAdditionals = serializeAdditionals(additionals);
        const targetColors = serializeAdditionalColors(additionalColors);
        const targetCustomizations = serializeCustomizations(customizations);

        removedItem =
          currentItems.find(
            (item) =>
              item.product_id === productId &&
              serializeAdditionals(item.additional_ids) === targetAdditionals &&
              serializeAdditionalColors(item.additional_colors) ===
                targetColors &&
              serializeCustomizations(item.customizations) ===
                targetCustomizations,
          ) || null;

        const newItems = currentItems.filter(
          (item) =>
            !(
              item.product_id === productId &&
              serializeAdditionals(item.additional_ids) === targetAdditionals &&
              serializeAdditionalColors(item.additional_colors) ===
                targetColors &&
              serializeCustomizations(item.customizations) ===
                targetCustomizations
            ),
        );
        const updatedCart = calculateTotals(newItems);

        void (async () => {
          try {
            await syncCartToBackend(updatedCart);

            if (updatedCart.items.length === 0 && pendingOrderId) {
              try {
                const serverOrder = await api.getOrder(pendingOrderId);
                const status = serverOrder?.status;
                if (status && (status === "PENDING" || status === "pending")) {
                  try {
                    await api.deleteOrder(pendingOrderId);
                  } catch (deleteErr) {
                    console.error(
                      `❌ [removeFromCart] Erro ao deletar pedido rascunho ${pendingOrderId}:`,
                      deleteErr,
                    );
                  }
                  setPendingOrderId(null);
                  setOrderMetadata({
                    send_anonymously: false,
                    complement: undefined,
                  });
                }
              } catch (err) {
                console.error(
                  "Erro ao verificar pedido pendente ao remover item do carrinho:",
                  err,
                );
              }
            }
          } catch (err) {

            console.error("Erro ao sincronizar remoção com backend:", err);
            if (removedItem) {
              setCart((prev) => {
                const restoredItems = [...prev.items, removedItem!];
                toast.error("Erro ao remover item. Tente novamente.");
                return calculateTotals(restoredItems);
              });
            }
          }
        })();

        return updatedCart;
      });
    },
    [
      calculateTotals,
      syncCartToBackend,
      api,
      pendingOrderId,
      setPendingOrderId,
      setOrderMetadata,
    ],
  );

  const updateQuantity = useCallback(
    (
      productId: string,
      quantity: number,
      additionals?: string[],
      customizations?: CartCustomization[],
      additionalColors?: Record<string, string>,
    ) => {
      if (quantity <= 0) {
        removeFromCart(
          productId,
          additionals,
          customizations,
          additionalColors,
        );
        return;
      }

      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const targetAdditionals = serializeAdditionals(additionals);
        const targetCustomizations = serializeCustomizations(customizations);
        const targetColors = serializeAdditionalColors(additionalColors);

        const newItems = currentItems.map((item) => {
          if (
            item.product_id === productId &&
            serializeAdditionals(item.additional_ids) === targetAdditionals &&
            serializeCustomizations(item.customizations) ===
              targetCustomizations &&
            serializeAdditionalColors(item.additional_colors) === targetColors
          ) {
            return { ...item, quantity };
          }
          return item;
        });
        const updatedCart = calculateTotals(newItems);
        debouncedSync(updatedCart);
        return updatedCart;
      });
    },
    [calculateTotals, removeFromCart, debouncedSync],
  );

  /**
   * Atualizar customizações de um item específico no carrinho
   * ✅ FIX: Mescla as customizações novas com as existentes para não perder dados
   */
  const updateCustomizations = useCallback(
    (
      productId: string,
      oldCustomizations: CartCustomization[],
      newCustomizations: CartCustomization[],
      additionals?: string[],
      additionalColors?: Record<string, string>,
    ) => {
      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const targetAdditionals = serializeAdditionals(additionals);
        const targetOldCustomizations =
          serializeCustomizations(oldCustomizations);
        const targetColors = serializeAdditionalColors(additionalColors);

        const itemIndex = currentItems.findIndex(
          (item) =>
            item.product_id === productId &&
            serializeAdditionals(item.additional_ids) === targetAdditionals &&
            serializeCustomizations(item.customizations) ===
              targetOldCustomizations &&
            serializeAdditionalColors(item.additional_colors) === targetColors,
        );

        if (itemIndex === -1) {
          console.error("Item não encontrado no carrinho para atualização");
          return prevCart;
        }

        const newItems = [...currentItems];
        const item = newItems[itemIndex];

        const mergedCustomizations = mergeCustomizations(
          item.customizations || [],
          newCustomizations,
        );

        const customizationEntries = cloneCustomizations(mergedCustomizations);
        const customizationTotal =
          calculateCustomizationTotal(customizationEntries);

        const baseEffective = item.price * (1 - (item.discount || 0) / 100);
        const effectivePrice = Number(
          (baseEffective + customizationTotal).toFixed(2),
        );

        newItems[itemIndex] = {
          ...item,
          customizations:
            customizationEntries.length > 0 ? customizationEntries : undefined,
          customization_total:
            customizationEntries.length > 0 ? customizationTotal : undefined,
          effectivePrice,
        };

        const updatedCart = calculateTotals(newItems);
        debouncedSync(updatedCart);
        return updatedCart;
      });
    },
    [calculateTotals, debouncedSync],
  );

  const mergeCustomizations = (
    existing: CartCustomization[],
    updated: CartCustomization[],
  ): CartCustomization[] => {
    const merged = [...existing];

    for (const newCustom of updated) {
      const existingIndex = merged.findIndex((c) => {

        if (c.id && newCustom.id) {
          return c.id === newCustom.id;
        }

        return c.customization_id === newCustom.customization_id;
      });

      if (existingIndex >= 0) {

        merged[existingIndex] = { ...newCustom };
      } else {

        merged.push({ ...newCustom });
      }
    }

    return merged;
  };

  const clearCart = useCallback(() => {
    const emptyCart = {
      items: [],
      total: 0,
      itemCount: 0,
    };
    setCart(emptyCart);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cart");
      } catch (error) {
        console.error("Erro ao limpar carrinho do localStorage:", error);
      }
    }
    debouncedSync(emptyCart);
  }, [debouncedSync]);

  const createOrder = useCallback(
    async (
      userId: string,
      deliveryAddress?: string,
      deliveryDate?: Date,
      options?: {
        shippingCost?: number;
        paymentMethod?: "pix" | "card";
        grandTotal?: number;
        deliveryCity?: string;
        deliveryState?: string;
        recipientPhone?: string;
        sendAnonymously?: boolean;
        complement?: string;
        deliveryMethod?: "delivery" | "pickup";
        discount?: number;
      },
    ) => {
      if (cart.items.length === 0) {
        throw new Error("Carrinho está vazio");
      }

      let deliveryCity = options?.deliveryCity;
      let deliveryState = options?.deliveryState;

      if (!deliveryCity || !deliveryState) {

        if (deliveryAddress) {
          const addressParts = deliveryAddress.split("/");
          if (addressParts.length >= 2) {
            const statePart = addressParts[addressParts.length - 1];
            const cityPart = addressParts[addressParts.length - 2];

            const stateMatch = statePart.match(/([A-Z]{2})/);
            if (stateMatch) {
              deliveryState = stateMatch[1];
            }

            const cityMatch = cityPart.split(",").pop()?.split("-")[0]?.trim();
            if (cityMatch) {
              deliveryCity = cityMatch;
            }
          }
        }
      }

      if (!deliveryCity || !deliveryState) {
        throw new Error("Cidade e estado de entrega são obrigatórios");
      }

      if (
        !options?.paymentMethod ||
        (options.paymentMethod !== "pix" && options.paymentMethod !== "card")
      ) {
        throw new Error(
          "Método de pagamento é obrigatório e deve ser 'pix' ou 'card'",
        );
      }

      if (!options?.recipientPhone || options.recipientPhone.trim() === "") {
        throw new Error("Telefone do destinatário é obrigatório");
      }

      const orderItems: OrderItem[] = cartItemsToOrderItems(cart.items);

      const payload = {
        user_id: userId,
        payment_method: options.paymentMethod,
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_state: deliveryState,
        delivery_date: deliveryDate,
        recipient_phone: options.recipientPhone,
        discount: options.discount || 0,
        send_anonymously: options?.sendAnonymously,
        complement: options?.complement,
        delivery_method: options?.deliveryMethod || "delivery",
      };

      const order = await api.createOrder(payload);

      setPendingOrderId(null);

      return order;
    },
    [cart, api, cartItemsToOrderItems],
  );

  const createPaymentPreference = useCallback(
    async (
      userEmail: string,
      orderId?: string,
      options?: {
        shippingCost?: number;
        paymentMethod?: "pix" | "card";
        grandTotal?: number;
      },
    ) => {
      if (
        !process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN ||
        process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN === "SEU_TOKEN_AQUI"
      ) {
        throw new Error(
          "Token do Mercado Pago não configurado. Configure NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN no arquivo .env.local",
        );
      }

      const items = cart.items.map((item) => ({
        title: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.effectivePrice.toFixed(2)),
        currency_id: "BRL",
      }));

      cart.items.forEach((item) => {
        item.additionals?.forEach((add) => {
          items.push({
            title: `${add.name} (${item.product.name})`,
            quantity: item.quantity,
            unit_price: Number(add.price.toFixed(2)),
            currency_id: "BRL",
          });
        });
      });

      if (options?.shippingCost && options.shippingCost > 0) {
        items.push({
          title: "Taxa de entrega",
          quantity: 1,
          unit_price: Number(options.shippingCost.toFixed(2)),
          currency_id: "BRL",
        });
      }

      try {
        const requestBody = {
          items,
          payer: {
            email: userEmail,
          },
          back_urls: {
            success: `${window.location.origin}/payment/success`,
            failure: `${window.location.origin}/payment/failure`,
            pending: `${window.location.origin}/payment/pending`,
          },
          external_reference: orderId,
          metadata: {
            shipping_cost: options?.shippingCost ?? 0,
            payment_method: options?.paymentMethod ?? "not-set",
          },
        };

        const response = await fetch(
          "https://api.mercadopago.com/checkout/preferences",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Erro ao criar preferência: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const preference = await response.json();
        return preference;
      } catch (error) {
        console.error("Erro ao criar preferência de pagamento:", error);
        throw error;
      }
    },
    [cart.items],
  );

  const getDeliveryWindows = useCallback((): {
    weekdays: DeliveryWindow[];
    weekends: DeliveryWindow[];
  } => {
    return {
      weekdays: [
        { start: "08:30", end: "12:00" },
        { start: "14:00", end: "16:30" },
      ],
      weekends: [{ start: "08:00", end: "11:00" }],
    };
  }, []);

  const isWeekend = useCallback((date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  }, []);

  const hasCustomItems = useCallback((): boolean => {
    return cart.items.some((item) => {
      const isCustomProduct = /quadro|polaroid/i.test(item.product.name);

      const hasCustomAdditionals =
        item.additionals?.some((add) =>
          /quadro|polaroid|caneca|quebra.?cabeça/i.test(add.name),
        ) || false;

      return isCustomProduct || hasCustomAdditionals;
    });
  }, [cart.items]);

  const createBrazilDate = useCallback(
    (
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
    ): Date => {

      const y = year;
      const m = String(month + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      const h = String(hour).padStart(2, "0");
      const min = String(minute).padStart(2, "0");
      return new Date(`${y}-${m}-${d}T${h}:${min}:00-03:00`);
    },
    [],
  );

  const getBrazilTimeComponents = useCallback((date: Date) => {

    const str = date.toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    });
    const parts = str.split(", ");
    if (parts.length < 2) {

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: 0,
      };
    }
    const [datePart, timePart] = parts;
    const dateParts = datePart.split("/").map(Number);
    const timeParts = timePart.split(":").map(Number);
    if (dateParts.length < 3 || timeParts.length < 2) {

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: 0,
      };
    }
    const [month, day, year] = dateParts;
    const [hour, minute, second] = timeParts;
    return { year, month: month - 1, day, hour, minute, second: second || 0 };
  }, []);

  /**
   * ✅ CORRIGIDO: Calcula o tempo MÁXIMO de produção considerando:
   * 1. product.production_time
   * 2. additional_time de DYNAMIC_LAYOUT selecionado (stored em customization.additional_time)
   * 3. additional_time de componentes (comp.item.dynamic_layout.additional_time)
   * 4. additional_time de adicionais (add.dynamic_layout.additional_time)
   * 5. Toma o MÁXIMO entre todos (não soma)
   *
   * O tempo retornado é o tempo REAL de produção em horas.
   * A consideração dos horários de funcionamento é feita em getEarliestDeliveryDateTime()
   */
  const getMaxProductionTime = useCallback((): number => {
    let maxTime = 0;

    cart.items.forEach((item) => {

      const productTime = item.product.production_time || 0;
      let itemMaxTime = productTime;

      if (item.customizations) {
        item.customizations.forEach((custom) => {
          if (custom.customization_type === "DYNAMIC_LAYOUT") {

            const dynamicLayoutTime = custom.additional_time || 0;
            if (dynamicLayoutTime > 0) {
              itemMaxTime = Math.max(itemMaxTime, dynamicLayoutTime);
            }
          }
        });
      }

      if (item.product.components) {
        item.product.components.forEach((comp) => {
          if (comp.item?.layout_base?.additional_time) {
            itemMaxTime = Math.max(
              itemMaxTime,
              comp.item.layout_base.additional_time,
            );
          }
        });
      }

      maxTime = Math.max(maxTime, itemMaxTime);

    });

    return maxTime > 0 ? maxTime : 1;
  }, [cart.items]);

  const getMinPreparationHours = useCallback((): number => {
    return getMaxProductionTime();
  }, [getMaxProductionTime]);

  const isWithinServiceHours = useCallback(
    (date: Date): boolean => {

      const { hour, minute } = getBrazilTimeComponents(date);
      const currentMinutes = hour * 60 + minute;

      const isWknd = isWeekend(date);
      const windows = getDeliveryWindows();
      const relevantWindows = isWknd ? windows.weekends : windows.weekdays;

      return relevantWindows.some((window) => {
        const [startH, startM] = window.start.split(":").map(Number);
        const [endH, endM] = window.end.split(":").map(Number);

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        return currentMinutes >= startTotal && currentMinutes <= endTotal;
      });
    },
    [getDeliveryWindows, isWeekend, getBrazilTimeComponents],
  );

  /**
   * Calcula os minutos restantes no período de funcionamento atual
   * ou retorna 0 se não estiver em horário comercial
   */
  const getRemainingMinutesInCurrentWindow = useCallback(
    (date: Date): number => {
      const { hour, minute } = getBrazilTimeComponents(date);
      const currentMinutes = hour * 60 + minute;

      const isWknd = isWeekend(date);
      const windows = getDeliveryWindows();
      const relevantWindows = isWknd ? windows.weekends : windows.weekdays;

      for (const window of relevantWindows) {
        const [startH, startM] = window.start.split(":").map(Number);
        const [endH, endM] = window.end.split(":").map(Number);

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (currentMinutes >= startTotal && currentMinutes <= endTotal) {
          return endTotal - currentMinutes;
        }
      }
      return 0;
    },
    [getBrazilTimeComponents, isWeekend, getDeliveryWindows],
  );

  /**
   * Retorna o próximo horário de início de funcionamento após a data especificada
   */
  const getNextServiceWindowStart = useCallback(
    (afterDate: Date): Date => {
      const candidate = new Date(afterDate);
      candidate.setSeconds(0, 0);

      const limit = new Date(candidate);
      limit.setDate(limit.getDate() + 14);

      while (candidate < limit) {
        const { year, month, day, hour, minute } =
          getBrazilTimeComponents(candidate);
        const currentMinutes = hour * 60 + minute;
        const isWknd = isWeekend(candidate);
        const windows = getDeliveryWindows();
        const relevantWindows = isWknd ? windows.weekends : windows.weekdays;

        for (const window of relevantWindows) {
          const [startH, startM] = window.start.split(":").map(Number);
          const startTotal = startH * 60 + startM;

          if (startTotal > currentMinutes) {
            return createBrazilDate(year, month, day, startH, startM);
          }
        }

        const nextDay = createBrazilDate(year, month, day + 1, 0, 0);
        const nextDayComponents = getBrazilTimeComponents(nextDay);
        const nextIsWknd = isWeekend(nextDay);
        const nextWindows = nextIsWknd
          ? getDeliveryWindows().weekends
          : getDeliveryWindows().weekdays;

        if (nextWindows.length > 0) {
          const [startH, startM] = nextWindows[0].start.split(":").map(Number);
          return createBrazilDate(
            nextDayComponents.year,
            nextDayComponents.month,
            nextDayComponents.day,
            startH,
            startM,
          );
        }

        candidate.setTime(candidate.getTime() + 24 * 60 * 60 * 1000);
      }

      const { year, month, day } = getBrazilTimeComponents(candidate);
      return createBrazilDate(year, month, day + 1, 8, 0);
    },
    [getBrazilTimeComponents, isWeekend, getDeliveryWindows, createBrazilDate],
  );

  const getEarliestDeliveryDateTime = useCallback(() => {
    const now = new Date();
    let remainingProductionMinutes = getMinPreparationHours() * 60;

    let current = new Date(now);

    if (!isWithinServiceHours(current)) {
      current = getNextServiceWindowStart(current);
    }

    const limit = new Date(now);
    limit.setDate(limit.getDate() + 14);

    while (remainingProductionMinutes > 0 && current < limit) {

      const remainingInWindow = getRemainingMinutesInCurrentWindow(current);

      if (remainingInWindow > 0) {
        if (remainingInWindow >= remainingProductionMinutes) {

          current = new Date(
            current.getTime() + remainingProductionMinutes * 60 * 1000,
          );
          remainingProductionMinutes = 0;
        } else {

          remainingProductionMinutes -= remainingInWindow;
          current = new Date(current.getTime() + remainingInWindow * 60 * 1000);

          current = getNextServiceWindowStart(current);
        }
      } else {

        current = getNextServiceWindowStart(current);
      }
    }

    const { year, month, day, hour, minute } = getBrazilTimeComponents(current);
    const remainder = minute % 30;
    let alignedMinute = minute;
    let alignedHour = hour;
    if (remainder !== 0) {
      alignedMinute = minute + (30 - remainder);
      if (alignedMinute >= 60) {
        alignedMinute -= 60;
        alignedHour += 1;
      }
    }

    let result = createBrazilDate(year, month, day, alignedHour, alignedMinute);

    if (!isWithinServiceHours(result)) {
      result = getNextServiceWindowStart(result);
    }

    return result;
  }, [
    getMinPreparationHours,
    isWithinServiceHours,
    getRemainingMinutesInCurrentWindow,
    getNextServiceWindowStart,
    getBrazilTimeComponents,
    createBrazilDate,
  ]);

  const generateTimeSlots = useCallback(
    (baseDate: Date): TimeSlot[] => {

      const { year, month, day } = getBrazilTimeComponents(baseDate);

      const checkDate = createBrazilDate(year, month, day, 12, 0);

      if (checkDate.getDay() === 0) {
        return [];
      }

      const isWknd = isWeekend(checkDate);

      const windows = getDeliveryWindows();
      const relevantWindows = isWknd ? windows.weekends : windows.weekdays;

      const slots: TimeSlot[] = [];
      const earliestTime = getEarliestDeliveryDateTime();

      relevantWindows.forEach((window) => {
        const [startH, startM] = window.start.split(":").map(Number);
        const [endH, endM] = window.end.split(":").map(Number);

        const windowStart = createBrazilDate(year, month, day, startH, startM);
        const windowEnd = createBrazilDate(year, month, day, endH, endM);

        const iter = new Date(windowStart);

        while (iter < windowEnd) {
          const slotStart = new Date(iter);
          const slotEnd = new Date(iter.getTime() + 60 * 60 * 1000);

          if (slotStart >= earliestTime) {
            const startStr = slotStart.toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            });
            const endStr = slotEnd.toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            });

            slots.push({
              value: slotStart.toISOString(),
              label: `${startStr} - ${endStr}`,
            });
          }

          iter.setTime(iter.getTime() + 30 * 60 * 1000);
        }
      });

      const agreeLaterDate = createBrazilDate(year, month, day, 23, 59);

      slots.push({
        value: agreeLaterDate.toISOString(),
        label: "A combinar (entraremos em contato)",
      });

      const uniqueSlots = slots.filter(
        (slot, index, self) =>
          index === self.findIndex((t) => t.label === slot.label),
      );

      return uniqueSlots;
    },
    [
      getDeliveryWindows,
      isWeekend,
      getEarliestDeliveryDateTime,
      createBrazilDate,
      getBrazilTimeComponents,
    ],
  );

  const getAvailableDates = useCallback((): AvailableDate[] => {
    const earliestDelivery = getEarliestDeliveryDateTime();
    const baseDate = new Date(earliestDelivery);
    baseDate.setHours(0, 0, 0, 0);

    const dates: AvailableDate[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const timeSlots = generateTimeSlots(date);

      if (timeSlots.length > 0) {
        dates.push({ date, slots: timeSlots });
      }
    }

    return dates;
  }, [getEarliestDeliveryDateTime, generateTimeSlots]);

  const isDateDisabledInCalendar = useCallback(
    (date: Date): boolean => {

      const dateKey = date.toISOString().split("T")[0];

      if (dateDisabledCacheRef.current.has(dateKey)) {
        return dateDisabledCacheRef.current.get(dateKey) || false;
      }

      const timeSlots = generateTimeSlots(date);
      const isDisabled = timeSlots.length === 0;
      dateDisabledCacheRef.current.set(dateKey, isDisabled);

      return isDisabled;
    },
    [generateTimeSlots],
  );

  /**
   * ✅ NOVO: Calcula quando a PRODUÇÃO termina dentro do horário de funcionamento
   *
   * Retorna objeto com:
   * - productionEndTime: momento que a produção termina (tempo real)
   * - earliestPickupTime: primeiro horário de retirada disponível APÓS produção terminar
   *
   * EXEMPLO:
   * - Agora: seg 10:00
   * - Produção: 18h
   * - productionEndTime: seg 28:00 = ter 04:00 (fora do horário)
   * - earliestPickupTime: ter 08:00 (próximo horário de funcionamento)
   */
  const getProductionTimeline = useCallback((): {
    productionHours: number;
    productionEndsAt: Date;
    earliestPickupTime: Date;
    formattedProductionEnds: string;
    formattedPickup: string;
  } => {
    const now = new Date();
    const prodHours = getMinPreparationHours();

    const productionEndsAt = new Date(
      now.getTime() + prodHours * 60 * 60 * 1000,
    );

    const earliestPickupTime = getEarliestDeliveryDateTime();

    const formattedProductionEnds = productionEndsAt.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formattedPickup = earliestPickupTime.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      productionHours: prodHours,
      productionEndsAt,
      earliestPickupTime,
      formattedProductionEnds,
      formattedPickup,
    };
  }, [getMinPreparationHours, getEarliestDeliveryDateTime]);

  /**
   * Retorna o intervalo de datas permitido para agendamento:
   * - minDate: agora + tempo mínimo de preparo (em horas)
   * - maxDate: agora + 1 ano
   */
  const getDeliveryDateBounds = useCallback(() => {
    const earliestDelivery = getEarliestDeliveryDateTime();
    const minDate = new Date(earliestDelivery);
    minDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    maxDate.setHours(23, 59, 59, 999);

    return { minDate, maxDate };
  }, [getEarliestDeliveryDateTime]);

  const createOrderWithTransparentCheckout = useCallback(
    async (
      userId: string,
      deliveryAddress?: string,
      deliveryDate?: Date,
      options?: {
        shippingCost?: number;
        paymentMethod?: "pix" | "card";
        grandTotal?: number;
        deliveryCity?: string;
        deliveryState?: string;
      },
    ) => {
      if (cart.items.length === 0) {
        throw new Error("Carrinho está vazio");
      }

      const order = await createOrder(
        userId,
        deliveryAddress,
        deliveryDate,
        options,
      );

      const checkoutUrl = `/checkout-transparente?orderId=${order.id}`;

      return {
        order,
        checkoutUrl,
        redirectToCheckout: () => {
          if (typeof window !== "undefined") {
            setTimeout(() => {
              window.location.href = checkoutUrl;
            }, 100);
          }
        },
      };
    },
    [cart, createOrder],
  );

  const processTransparentPayment = useCallback(
    async (
      orderId: string,
      paymentData: {
        payment_method_id: "pix" | "credit_card" | "debit_card";
        token?: string;
        issuer_id?: string;
        installments?: number;
        payer: {
          email: string;
          first_name?: string;
          last_name?: string;
          identification?: {
            type: string;
            number: string;
          };
        };
      },
    ) => {
      try {
        const payer = paymentData.payer || { email: "" };
        type TransparentPayload = {
          orderId: string;
          payerEmail: string;
          payerName: string;
          payerDocument: string;
          payerDocumentType: "CPF" | "CNPJ";
          paymentMethodId: "pix" | "credit_card" | "debit_card";
          cardToken?: string;
          installments?: number;
          issuer_id?: string;
        };

        const payload: TransparentPayload = {
          orderId,
          payerEmail: payer.email,
          payerName:
            [payer.first_name, payer.last_name].filter(Boolean).join(" ") ||
            payer.email,
          payerDocument: payer.identification?.number || "",
          payerDocumentType:
            (payer.identification?.type as "CPF" | "CNPJ") || "CPF",
          paymentMethodId: paymentData.payment_method_id,
        };

        if (paymentData.token) payload.cardToken = paymentData.token;
        if (paymentData.installments)
          payload.installments = paymentData.installments;
        if (paymentData.issuer_id) payload.issuer_id = paymentData.issuer_id;

        const response = await api.createTransparentPayment(payload);

        if (response.success) {
          clearCart();
        }

        return response;
      } catch (error) {
        console.error("Erro ao processar pagamento transparente:", error);
        throw error;
      }
    },
    [api, clearCart],
  );

  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }, []);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCustomizations,
    clearCart,
    createOrder,
    createOrderWithTransparentCheckout,
    processTransparentPayment,
    createPaymentPreference,
    getDeliveryWindows,
    isWeekend,
    hasCustomItems,
    getMinPreparationHours,
    getMaxProductionTime,
    generateTimeSlots,
    getAvailableDates,
    isDateDisabledInCalendar,
    getDeliveryDateBounds,
    getProductionTimeline,
    formatDate,
    orderMetadata,
    setOrderMetadata,
  };
}
