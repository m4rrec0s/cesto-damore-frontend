import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, Product, Additional, CustomizationTypeValue } from "./use-api";
import { useAuth } from "./use-auth";
import type { CustomizationValue } from "./use-customization";

export interface CartCustomization extends CustomizationValue {
  title: string;
  customization_type: CustomizationTypeValue;
  is_required: boolean;
  price_adjustment?: number;
  selected_option_label?: string;
  selected_item_label?: string;
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
  additional_colors?: Record<string, string>; // Mapeia additional_id -> color_id selecionado
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
    idA.localeCompare(idB)
  );
  return JSON.stringify(normalized);
};

const serializeCustomizations = (customizations?: CartCustomization[]) => {
  if (!customizations || customizations.length === 0) {
    return "[]";
  }

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

const cloneCustomizations = (
  customizations?: CartCustomization[]
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
  customizations?: CartCustomization[]
): number => {
  if (!customizations) return 0;
  return customizations.reduce(
    (sum, customization) => sum + (customization.price_adjustment || 0),
    0
  );
};

export function useCart() {
  const api = useApi();
  const { user } = useAuth();

  const [cart, setCart] = useState<CartState>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.items)
          ) {
            const itemsWithEffectivePrice = parsed.items.map(
              (item: Partial<CartItem>) => {
                const customizationTotal = (item.customizations || []).reduce(
                  (sum: number, customization: Partial<CartCustomization>) =>
                    sum + (customization?.price_adjustment || 0),
                  0
                );

                const baseEffective =
                  (item.price || 0) * (1 - (item.discount || 0) / 100);

                return {
                  ...item,
                  customizations: Array.isArray(item.customizations)
                    ? item.customizations
                    : [],
                  customization_total: customizationTotal,
                  effectivePrice:
                    item.effectivePrice !== undefined
                      ? item.effectivePrice
                      : Number((baseEffective + customizationTotal).toFixed(2)),
                } as CartItem;
              }
            );
            return {
              items: itemsWithEffectivePrice || [],
              total: parsed.total || 0,
              itemCount: parsed.itemCount || 0,
            };
          }
        }
      } catch (error) {
        console.error("Erro ao carregar carrinho do localStorage:", error);
        localStorage.removeItem("cart");
      }
    }
    return {
      items: [],
      total: 0,
      itemCount: 0,
    };
  });

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("pendingOrderId");
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pendingOrderId) {
      localStorage.removeItem("pendingOrderId");
      return;
    }
    localStorage.setItem("pendingOrderId", pendingOrderId);
  }, [pendingOrderId]);

  const [orderMetadata, _setOrderMetadata] = useState<{
    send_anonymously?: boolean;
    complement?: string;
  }>({});

  const setOrderMetadata = useCallback(
    (metadata: { send_anonymously?: boolean; complement?: string }) => {
      _setOrderMetadata((prev) => ({ ...prev, ...metadata }));
    },
    []
  );

  // Quando metadata do pedido muda, sincronizar com o backend (se houver rascunho)
  useEffect(() => {
    // Debounce sending metadata to server via existing debouncedSync
    if (!user) return;
    // Apenas sincronizar metadata se houver pendingOrderId (evita criar pedido sem itens)
    if (!pendingOrderId) return;
    // reutiliza o debouncedSync para enviar a atualização
    debouncedSync(cart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderMetadata, pendingOrderId, user]);

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
        customization_id: custom.customization_id || "default",
        customization_type: custom.customization_type,
        title: custom.title,
        customization_data: {
          text: custom.text,
          photos: custom.photos,
          selected_option: custom.selected_option,
          selected_item: custom.selected_item,
        },
      })),
    }));
  }, []);

  const syncCartToBackend = useCallback(
    async (currentCart: CartState) => {
      if (!user) return; // Only sync when user is authenticated

      try {
        console.log(
          "🔁 syncCartToBackend - items:",
          currentCart.items.length,
          "pendingOrderId:",
          pendingOrderId
        );
        const itemsPayload = cartItemsToOrderItems(currentCart.items);

        if (itemsPayload.length === 0) {
          if (pendingOrderId) {
            await api.deleteOrder(pendingOrderId);
            setPendingOrderId(null);
            // Limpar metadata local quando o pedido pendente for removido
            setOrderMetadata({
              send_anonymously: false,
              complement: undefined,
            });
          }
          return;
        }

        if (!pendingOrderId) {
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
          // Atualizar metadata local com os dados do servidor (caso defaults tenham sido definidos lá)
          if (order) {
            setOrderMetadata({
              send_anonymously: !!order.send_anonymously,
              complement: order.complement || undefined,
            });
          }
        } else {
          await api.updateOrderItems(pendingOrderId, itemsPayload);
          // Also update metadata if changed
          await api.updateOrderMetadata(pendingOrderId, {
            send_anonymously: orderMetadata.send_anonymously,
            complement: orderMetadata.complement,
          });
        }
      } catch (error) {
        console.error("Erro ao sincronizar carrinho com backend:", error);
      }
    },
    [
      api,
      cartItemsToOrderItems,
      pendingOrderId,
      user,
      orderMetadata,
      setOrderMetadata,
    ]
  );

  // Debounce setup to avoid spamming the backend when cart changes fast
  const syncTimeoutRef = useRef<number | null>(null);
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
    [syncCartToBackend]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Criar uma cópia do carrinho sem dados pesados (imagens base64)
        const cartToSave = {
          ...cart,
          items: cart.items.map((item) => ({
            ...item,
            customizations: item.customizations?.map((custom) => ({
              ...custom,
              // Limpar dados pesados das customizações
              photos: custom.photos?.map((photo) => ({
                ...photo,
                preview_url: undefined, // Remover preview base64
              })),
              text:
                custom.customization_type === "BASE_LAYOUT"
                  ? undefined // Remover preview URL do layout
                  : custom.text,
            })),
          })),
        };

        localStorage.setItem("cart", JSON.stringify(cartToSave));
      } catch (error) {
        console.error("Erro ao salvar carrinho no localStorage:", error);

        // Se ainda assim falhar, tentar limpar completamente as customizações
        try {
          const minimalCart = {
            ...cart,
            items: cart.items.map((item) => ({
              ...item,
              customizations: undefined, // Remover customizações completamente
            })),
          };
          localStorage.setItem("cart", JSON.stringify(minimalCart));
          console.warn(
            "⚠️ Carrinho salvo sem customizações para evitar quota exceeded"
          );
        } catch (fallbackError) {
          console.error(
            "❌ Não foi possível salvar carrinho mesmo sem customizações:",
            fallbackError
          );
          // Como último recurso, limpar o carrinho
          localStorage.removeItem("cart");
        }
      }
    }
  }, [cart]);

  // Quando o usuário autentica, sincronizar/recuperar rascunho do backend
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      try {
        if (pendingOrderId) {
          // Tentar recuperar pedido pendente e preencher o carrinho local caso esteja vazio
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
                      (item.effectivePrice || item.price) +
                      (item.customization_total || 0),
                    additionals,
                    customizations,
                    product: item.product,
                  };
                });
              })()
            );
            if (transformedCart.items.length > 0 && cart.items.length === 0) {
              setCart(transformedCart);
            }
            // Se o pedido do servidor tiver metadata, atualizar o estado local
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
          // Sincronizar local -> server sempre que houver itens e não existir rascunho
          await syncCartToBackend(cart);
        }
      } catch (error) {
        console.error("Erro ao inicializar sincronização de carrinho:", error);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const calculateTotals = useCallback((items: CartItem[]): CartState => {
    const safeItems = Array.isArray(items) ? items : [];

    const total = safeItems.reduce((sum, item) => {
      const itemTotal = item.effectivePrice * item.quantity;
      const additionalsTotal =
        item.additionals?.reduce(
          (addSum, add) => addSum + add.price * item.quantity,
          0
        ) || 0;
      return sum + itemTotal + additionalsTotal;
    }, 0);

    const itemCount = safeItems.reduce(
      (count, item) => count + item.quantity,
      0
    );

    return {
      items: safeItems,
      total,
      itemCount,
    };
  }, []);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity: number = 1,
      additionals?: string[],
      additionalColors?: Record<string, string>,
      customizations?: CartCustomization[]
    ) => {
      try {
        const product = await api.getProduct(productId);

        const additionalDetails =
          additionals && additionals.length > 0
            ? await Promise.all(additionals.map((id) => api.getAdditional(id)))
            : [];

        const discount = product.discount || 0;
        const customizationEntries = cloneCustomizations(customizations);
        const customizationTotal =
          calculateCustomizationTotal(customizationEntries);

        const baseEffective = product.price * (1 - discount / 100);
        const effectivePrice = Number(
          (baseEffective + customizationTotal).toFixed(2)
        );

        const newItem: CartItem = {
          product_id: productId,
          quantity,
          price: product.price,
          effectivePrice,
          discount,
          additional_ids: additionals,
          additionals: additionalDetails,
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

          const existingIndex = currentItems.findIndex(
            (item) =>
              item.product_id === productId &&
              serializeAdditionals(item.additional_ids) ===
                targetAdditionalsKey &&
              serializeAdditionalColors(item.additional_colors) ===
                targetColorsKey &&
              serializeCustomizations(item.customizations) ===
                targetCustomizationsKey
          );

          let newItems: CartItem[];
          if (existingIndex >= 0) {
            newItems = [...currentItems];
            newItems[existingIndex].quantity += quantity;
            const existingBaseEffective =
              newItems[existingIndex].price *
              (1 - (newItems[existingIndex].discount || 0) / 100);
            newItems[existingIndex].effectivePrice = Number(
              (existingBaseEffective + customizationTotal).toFixed(2)
            );
            newItems[existingIndex].customization_total = customizationTotal;
            newItems[existingIndex].customizations =
              customizationEntries.length > 0
                ? cloneCustomizations(customizationEntries)
                : undefined;
          } else {
            newItems = [...currentItems, newItem];
          }

          const updatedCart = calculateTotals(newItems);
          // Sincronizar com backend (se aplicável)
          debouncedSync(updatedCart);
          return updatedCart;
        });
      } catch (error) {
        console.error("Erro ao adicionar produto ao carrinho:", error);
        throw error;
      }
    },
    [api, calculateTotals, debouncedSync]
  );

  const removeFromCart = useCallback(
    (
      productId: string,
      additionals?: string[],
      customizations?: CartCustomization[],
      additionalColors?: Record<string, string>
    ) => {
      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const targetAdditionals = serializeAdditionals(additionals);
        const targetColors = serializeAdditionalColors(additionalColors);
        const targetCustomizations = serializeCustomizations(customizations);

        const newItems = currentItems.filter(
          (item) =>
            !(
              item.product_id === productId &&
              serializeAdditionals(item.additional_ids) === targetAdditionals &&
              serializeAdditionalColors(item.additional_colors) ===
                targetColors &&
              serializeCustomizations(item.customizations) ===
                targetCustomizations
            )
        );
        const updatedCart = calculateTotals(newItems);
        debouncedSync(updatedCart);
        return updatedCart;
      });
    },
    [calculateTotals, debouncedSync]
  );

  const updateQuantity = useCallback(
    (
      productId: string,
      quantity: number,
      additionals?: string[],
      customizations?: CartCustomization[],
      additionalColors?: Record<string, string>
    ) => {
      if (quantity <= 0) {
        removeFromCart(
          productId,
          additionals,
          customizations,
          additionalColors
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
    [calculateTotals, removeFromCart, debouncedSync]
  );

  /**
   * Atualizar customizações de um item específico no carrinho
   */
  const updateCustomizations = useCallback(
    (
      productId: string,
      oldCustomizations: CartCustomization[],
      newCustomizations: CartCustomization[],
      additionals?: string[],
      additionalColors?: Record<string, string>
    ) => {
      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const targetAdditionals = serializeAdditionals(additionals);
        const targetOldCustomizations =
          serializeCustomizations(oldCustomizations);
        const targetColors = serializeAdditionalColors(additionalColors);

        // Encontrar o item com as customizações antigas
        const itemIndex = currentItems.findIndex(
          (item) =>
            item.product_id === productId &&
            serializeAdditionals(item.additional_ids) === targetAdditionals &&
            serializeCustomizations(item.customizations) ===
              targetOldCustomizations &&
            serializeAdditionalColors(item.additional_colors) === targetColors
        );

        if (itemIndex === -1) {
          console.error("Item não encontrado no carrinho para atualização");
          return prevCart;
        }

        const newItems = [...currentItems];
        const item = newItems[itemIndex];

        // Calcular novo total de customização
        const customizationEntries = cloneCustomizations(newCustomizations);
        const customizationTotal =
          calculateCustomizationTotal(customizationEntries);

        // Recalcular preço efetivo
        const baseEffective = item.price * (1 - (item.discount || 0) / 100);
        const effectivePrice = Number(
          (baseEffective + customizationTotal).toFixed(2)
        );

        // Atualizar item com novas customizações
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
    [calculateTotals, debouncedSync]
  );

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
      }
    ) => {
      if (cart.items.length === 0) {
        throw new Error("Carrinho está vazio");
      }

      // Extrair cidade e estado se não fornecidos nas opções
      let deliveryCity = options?.deliveryCity;
      let deliveryState = options?.deliveryState;

      if (!deliveryCity || !deliveryState) {
        // Tentar extrair do endereço se não fornecidos
        if (deliveryAddress) {
          const addressParts = deliveryAddress.split("/");
          if (addressParts.length >= 2) {
            const statePart = addressParts[addressParts.length - 1];
            const cityPart = addressParts[addressParts.length - 2];

            // Extrair estado após o último '/'
            const stateMatch = statePart.match(/([A-Z]{2})/);
            if (stateMatch) {
              deliveryState = stateMatch[1];
            }

            // Extrair cidade (remover tudo após '-' se existir)
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

      // Validar método de pagamento
      if (
        !options?.paymentMethod ||
        (options.paymentMethod !== "pix" && options.paymentMethod !== "card")
      ) {
        throw new Error(
          "Método de pagamento é obrigatório e deve ser 'pix' ou 'card'"
        );
      }

      // Validar telefone do destinatário
      if (!options?.recipientPhone || options.recipientPhone.trim() === "") {
        throw new Error("Telefone do destinatário é obrigatório");
      }

      const orderItems: OrderItem[] = cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.effectivePrice,
        additionals: item.additionals?.map((add) => ({
          additional_id: add.id,
          quantity: item.quantity,
          price: add.price,
        })),
        // ✅ NOVO: Incluir customizações
        customizations: item.customizations?.map((custom) => ({
          customization_id: custom.customization_id || "default",
          customization_type: custom.customization_type,
          title: custom.title || "Personalização",
          customization_data: {
            text: custom.text,
            photos: custom.photos, // ✅ Array de PhotoUploadData com base64
            selected_option: custom.selected_option,
            selected_item: custom.selected_item,
          },
        })),
      }));

      const totalPrice =
        typeof options?.grandTotal === "number"
          ? options.grandTotal
          : cart.total + (options?.shippingCost ?? 0);

      const payload = {
        user_id: userId,
        payment_method: options.paymentMethod,
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_state: deliveryState,
        delivery_date: deliveryDate,
        recipient_phone: options.recipientPhone,
        discount: 0, // Pode ser ajustado se houver desconto
        send_anonymously: options?.sendAnonymously,
        complement: options?.complement,
      };

      // Log sucinto do payload para evitar impressão de base64/imagens
      console.log("📦 [useCart] Payload do pedido - resumo:", {
        user_id: payload.user_id,
        itemsCount: payload.items?.length || 0,
        grandTotal: totalPrice || null,
        delivery_city: payload.delivery_city || null,
      });

      const order = await api.createOrder(payload);

      // Pedido final criado com sucesso: remover rascunho do backend
      setPendingOrderId(null);
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("cart_pending_order_id");
        }
      } catch (err) {
        console.warn(
          "Não foi possível remover pending order do localStorage:",
          err
        );
      }

      console.log("✅ Pedido criado com sucesso:", order?.id);
      return order;
    },
    [cart, api]
  );

  const createPaymentPreference = useCallback(
    async (
      userEmail: string,
      orderId?: string,
      options?: {
        shippingCost?: number;
        paymentMethod?: "pix" | "card";
        grandTotal?: number;
      }
    ) => {
      if (
        !process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN ||
        process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN === "SEU_TOKEN_AQUI"
      ) {
        throw new Error(
          "Token do Mercado Pago não configurado. Configure NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN no arquivo .env.local"
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

        console.log("📤 Dados enviados ao Mercado Pago (resumido):", {
          itemsCount: items.length,
          payerEmail: requestBody.payer?.email ? "[REDACTED]" : undefined,
          external_reference: requestBody.external_reference,
        });

        const token = process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN;
        console.log("🔑 Token sendo usado (resumido):", {
          tokenConfigured: !!token,
          tokenLength: token?.length || 0,
        });

        const response = await fetch(
          "https://api.mercadopago.com/checkout/preferences",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log("📥 Status da resposta (MP):", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Resposta de erro do Mercado Pago:", errorText);
          throw new Error(
            `Erro ao criar preferência: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const preference = await response.json();
        console.log(
          "🎯 Preferência criada (Mercado Pago) - init_point sanitized available"
        );
        return preference;
      } catch (error) {
        console.error("Erro ao criar preferência de pagamento:", error);
        throw error;
      }
    },
    [cart.items]
  );

  const getDeliveryWindows = useCallback((): {
    weekdays: DeliveryWindow[];
    weekends: DeliveryWindow[];
  } => {
    return {
      weekdays: [
        { start: "07:30", end: "12:00" },
        { start: "14:00", end: "17:00" },
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
          /quadro|polaroid|caneca|quebra.?cabeça/i.test(add.name)
        ) || false;

      return isCustomProduct || hasCustomAdditionals;
    });
  }, [cart.items]);

  const getMinPreparationHours = useCallback((): number => {
    let maxHours = 1; // Padrão para itens normais

    cart.items.forEach((item) => {
      // Verificar produto principal
      if (/quadro|polaroid/i.test(item.product.name)) {
        maxHours = Math.max(maxHours, 4); // 4 horas para produtos personalizados
      }
      if (/caneca|quebra.?cabeça/i.test(item.product.name)) {
        maxHours = Math.max(maxHours, 24); // 24 horas para itens mais complexos
      }

      // Verificar adicionais
      item.additionals?.forEach((add) => {
        if (/quadro|polaroid/i.test(add.name)) {
          maxHours = Math.max(maxHours, 4);
        }
        if (/caneca|quebra.?cabeça/i.test(add.name)) {
          maxHours = Math.max(maxHours, 24);
        }
      });
    });

    return maxHours;
  }, [cart.items]);

  const parseTimeOnDate = (referenceDate: Date, time: string) => {
    const [hourStr, minuteStr] = time.split(":");
    const hours = parseInt(hourStr ?? "0", 10);
    const minutes = parseInt(minuteStr ?? "0", 10);

    const result = new Date(referenceDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  const isWithinServiceHours = useCallback(
    (date: Date): boolean => {
      const windows = getDeliveryWindows();
      const relevantWindows = isWeekend(date)
        ? windows.weekends
        : windows.weekdays;

      return relevantWindows.some((window) => {
        const windowStart = parseTimeOnDate(date, window.start);
        const windowEnd = parseTimeOnDate(date, window.end);
        return date >= windowStart && date <= windowEnd;
      });
    },
    [getDeliveryWindows, isWeekend]
  );

  const getNextServiceWindowStart = useCallback(
    (from: Date): Date | null => {
      const windows = getDeliveryWindows();

      for (let offset = 0; offset < 14; offset++) {
        const candidateDate = new Date(from);
        candidateDate.setHours(0, 0, 0, 0);
        candidateDate.setDate(candidateDate.getDate() + offset);

        const relevantWindows = isWeekend(candidateDate)
          ? windows.weekends
          : windows.weekdays;

        for (const window of relevantWindows) {
          const windowStart = parseTimeOnDate(candidateDate, window.start);
          const windowEnd = parseTimeOnDate(candidateDate, window.end);

          if (offset === 0) {
            if (from < windowStart) {
              return windowStart;
            }

            if (from >= windowStart && from < windowEnd) {
              return from;
            }
          } else {
            return windowStart;
          }
        }
      }

      return null;
    },
    [getDeliveryWindows, isWeekend]
  );

  const getEarliestDeliveryDateTime = useCallback(() => {
    const now = new Date();
    const minHours = getMinPreparationHours();
    let earliest = new Date(now.getTime() + minHours * 60 * 60 * 1000);

    if (!isWithinServiceHours(now)) {
      const nextWindowStart = getNextServiceWindowStart(now);

      if (nextWindowStart) {
        const prepAfterWindow = new Date(
          nextWindowStart.getTime() + 60 * 60 * 1000
        );

        if (prepAfterWindow > earliest) {
          earliest = prepAfterWindow;
        }
      }
    }

    return earliest;
  }, [getMinPreparationHours, getNextServiceWindowStart, isWithinServiceHours]);

  const generateTimeSlots = useCallback(
    (date: Date): TimeSlot[] => {
      const windows = getDeliveryWindows();
      const isWeekendDay = isWeekend(date);
      const relevantWindows = isWeekendDay
        ? windows.weekends
        : windows.weekdays;
      const slots: TimeSlot[] = [];
      const now = new Date();
      const earliestTime = getEarliestDeliveryDateTime();
      const earliestTimestamp = earliestTime.getTime();
      const isNowWithinService = isWithinServiceHours(now);

      relevantWindows.forEach((window) => {
        const startTime = window.start.split(":");
        const endTime = window.end.split(":");
        const startHour = parseInt(startTime[0]);
        const startMinute = parseInt(startTime[1]);
        const endHour = parseInt(endTime[0]);
        const endMinute = parseInt(endTime[1]) || 0;

        // Converter tudo para minutos para facilitar os cálculos
        const windowStartMinutes = startHour * 60 + startMinute;
        const windowEndMinutes = endHour * 60 + endMinute;

        // Gerar slots de 1 hora
        const possibleSlots = [];

        // 1. Slots seguindo o padrão da janela (ex: 7:30-8:30, 8:30-9:30...)
        let currentMinutes = windowStartMinutes;

        while (currentMinutes < windowEndMinutes) {
          let nextSlotMinutes = currentMinutes + 60;
          if (nextSlotMinutes > windowEndMinutes) {
            nextSlotMinutes = windowEndMinutes;
          }

          possibleSlots.push({
            start: currentMinutes,
            end: nextSlotMinutes,
          });

          currentMinutes = nextSlotMinutes;
        }

        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = hour * 60;
          const slotEnd = (hour + 1) * 60;

          if (slotStart >= windowStartMinutes && slotEnd <= windowEndMinutes) {
            possibleSlots.push({
              start: slotStart,
              end: slotEnd,
            });
          } else if (
            slotStart >= windowStartMinutes &&
            slotStart < windowEndMinutes
          ) {
            possibleSlots.push({
              start: slotStart,
              end: windowEndMinutes,
            });
          }
        }

        const uniqueSlots = possibleSlots
          .filter(
            (slot, index, arr) =>
              arr.findIndex(
                (s) => s.start === slot.start && s.end === slot.end
              ) === index
          )
          .sort((a, b) => a.start - b.start);

        uniqueSlots.forEach((slot) => {
          const slotStartHour = Math.floor(slot.start / 60);
          const slotStartMin = slot.start % 60;
          const slotEndHour = Math.floor(slot.end / 60);
          const slotEndMin = slot.end % 60;
          const slotStart = `${slotStartHour
            .toString()
            .padStart(2, "0")}:${slotStartMin.toString().padStart(2, "0")}`;
          const slotEnd = `${slotEndHour
            .toString()
            .padStart(2, "0")}:${slotEndMin.toString().padStart(2, "0")}`;

          const slotStartDateTime = new Date(date);
          slotStartDateTime.setHours(slotStartHour, slotStartMin, 0, 0);

          const isToday = date.toDateString() === now.toDateString();

          if (isToday) {
            const slotEndDateTime = new Date(date);
            slotEndDateTime.setHours(slotEndHour, slotEndMin, 0, 0);
            const isSlotValid = isNowWithinService
              ? slotEndDateTime.getTime() >= earliestTimestamp
              : slotStartDateTime.getTime() >= earliestTimestamp;

            if (isSlotValid) {
              slots.push({
                value: slotStart,
                label: `${slotStart} - ${slotEnd}`,
              });
            }
          } else {
            if (slotStartDateTime.getTime() >= earliestTimestamp) {
              slots.push({
                value: slotStart,
                label: `${slotStart} - ${slotEnd}`,
              });
            }
          }
        });
      });

      const uniqueFinalSlots = slots
        .filter(
          (slot, index, arr) =>
            arr.findIndex((s) => s.value === slot.value) === index
        )
        .sort((a, b) => a.value.localeCompare(b.value));

      return uniqueFinalSlots;
    },
    [
      getDeliveryWindows,
      getEarliestDeliveryDateTime,
      isWeekend,
      isWithinServiceHours,
    ]
  );

  const getAvailableDates = useCallback((): AvailableDate[] => {
    const earliestDelivery = getEarliestDeliveryDateTime();
    const baseDate = new Date(earliestDelivery);
    baseDate.setHours(0, 0, 0, 0);

    const dates: AvailableDate[] = [];

    // Gerar próximos 7 dias
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const timeSlots = generateTimeSlots(date);

      // Só adicionar datas que tenham slots disponíveis
      if (timeSlots.length > 0) {
        dates.push({ date, slots: timeSlots });
      }
    }

    return dates;
  }, [getEarliestDeliveryDateTime, generateTimeSlots]);

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
      }
    ) => {
      if (cart.items.length === 0) {
        throw new Error("Carrinho está vazio");
      }

      // Criar o pedido primeiro
      console.log("🛒 Criando pedido para checkout transparente...");
      const order = await createOrder(
        userId,
        deliveryAddress,
        deliveryDate,
        options
      );

      // Retornar URL para checkout transparente
      const checkoutUrl = `/checkout-transparente?orderId=${order.id}`;
      console.log("🔗 URL do checkout criada:", checkoutUrl);

      return {
        order,
        checkoutUrl,
        redirectToCheckout: () => {
          if (typeof window !== "undefined") {
            console.log("🚀 Redirecionando para:", checkoutUrl);
            // Pequeno delay para garantir que o pedido foi salvo
            setTimeout(() => {
              window.location.href = checkoutUrl;
            }, 100);
          }
        },
      };
    },
    [cart, createOrder]
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
      }
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

        // Limpar carrinho apenas se pagamento foi iniciado com sucesso
        if (response.success) {
          clearCart();
        }

        return response;
      } catch (error) {
        console.error("Erro ao processar pagamento transparente:", error);
        throw error;
      }
    },
    [api, clearCart]
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
    generateTimeSlots,
    getAvailableDates,
    getDeliveryDateBounds,
    formatDate,
    orderMetadata,
    setOrderMetadata,
  };
}
