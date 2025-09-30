import { useState, useCallback, useEffect } from "react";
import { useApi, OrderItem, Product, Additional } from "./use-api";

export interface CartItem {
  product_id: string;
  quantity: number;
  price: number;
  effectivePrice: number;
  discount?: number;
  additional_ids?: string[];
  additionals?: Additional[];
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

export function useCart() {
  const api = useApi();

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
              (item: Partial<CartItem>) => ({
                ...item,
                effectivePrice:
                  item.effectivePrice ||
                  (item.price || 0) * (1 - (item.discount || 0) / 100),
              })
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cart", JSON.stringify(cart));
      } catch (error) {
        console.error("Erro ao salvar carrinho no localStorage:", error);
      }
    }
  }, [cart]);

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
    async (productId: string, quantity: number = 1, additionals?: string[]) => {
      try {
        const product = await api.getProduct(productId);

        const additionalDetails =
          additionals && additionals.length > 0
            ? await Promise.all(additionals.map((id) => api.getAdditional(id)))
            : [];

        const discount = product.discount || 0;
        const effectivePrice = product.price * (1 - discount / 100);

        const newItem: CartItem = {
          product_id: productId,
          quantity,
          price: product.price,
          effectivePrice,
          discount,
          additional_ids: additionals,
          additionals: additionalDetails,
          product,
        };

        setCart((prevCart) => {
          const currentItems = Array.isArray(prevCart.items)
            ? prevCart.items
            : [];

          const existingIndex = currentItems.findIndex(
            (item) =>
              item.product_id === productId &&
              JSON.stringify(item.additional_ids) ===
                JSON.stringify(additionals)
          );

          let newItems: CartItem[];
          if (existingIndex >= 0) {
            newItems = [...currentItems];
            newItems[existingIndex].quantity += quantity;
          } else {
            newItems = [...currentItems, newItem];
          }

          const updatedCart = calculateTotals(newItems);
          return updatedCart;
        });
      } catch (error) {
        console.error("Erro ao adicionar produto ao carrinho:", error);
        throw error;
      }
    },
    [api, calculateTotals]
  );

  const removeFromCart = useCallback(
    (productId: string, additionals?: string[]) => {
      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const newItems = currentItems.filter(
          (item) =>
            !(
              item.product_id === productId &&
              JSON.stringify(item.additional_ids) ===
                JSON.stringify(additionals)
            )
        );
        return calculateTotals(newItems);
      });
    },
    [calculateTotals]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, additionals?: string[]) => {
      if (quantity <= 0) {
        removeFromCart(productId, additionals);
        return;
      }

      setCart((prevCart) => {
        const currentItems = Array.isArray(prevCart.items)
          ? prevCart.items
          : [];

        const newItems = currentItems.map((item) => {
          if (
            item.product_id === productId &&
            JSON.stringify(item.additional_ids) === JSON.stringify(additionals)
          ) {
            return { ...item, quantity };
          }
          return item;
        });
        return calculateTotals(newItems);
      });
    },
    [calculateTotals, removeFromCart]
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
  }, []);

  const createOrder = useCallback(
    async (
      userId: string,
      deliveryAddress?: string,
      deliveryDate?: Date,
      options?: {
        shippingCost?: number;
        paymentMethod?: "pix" | "card";
        grandTotal?: number;
      }
    ) => {
      if (cart.items.length === 0) {
        throw new Error("Carrinho está vazio");
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
      }));

      const totalPrice =
        typeof options?.grandTotal === "number"
          ? options.grandTotal
          : cart.total + (options?.shippingCost ?? 0);

      const order = await api.createOrder({
        user_id: userId,
        total_price: totalPrice,
        shipping_price: options?.shippingCost,
        payment_method: options?.paymentMethod,
        grand_total: totalPrice,
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate,
      });

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

        console.log(
          "📤 Dados sendo enviados para o Mercado Pago:",
          JSON.stringify(requestBody, null, 2)
        );

        const token = process.env.NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN;
        console.log(
          "🔑 Token sendo usado:",
          token ? `${token.substring(0, 20)}...` : "Token NÃO configurado"
        );
        console.log("🔑 Token completo disponível:", !!token);

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

        console.log("📥 Status da resposta:", response.status);
        console.log(
          "📥 Headers da resposta:",
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Resposta de erro do Mercado Pago:", errorText);
          throw new Error(
            `Erro ao criar preferência: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const preference = await response.json();
        console.log("🎯 Preferência completa recebida:", preference);
        console.log("🎯 init_point disponível:", preference.init_point);
        console.log(
          "🎯 sandbox_init_point disponível:",
          preference.sandbox_init_point
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
    clearCart,
    createOrder,
    createPaymentPreference,
    getDeliveryWindows,
    isWeekend,
    hasCustomItems,
    getMinPreparationHours,
    generateTimeSlots,
    getAvailableDates,
    getDeliveryDateBounds,
    formatDate,
  };
}
