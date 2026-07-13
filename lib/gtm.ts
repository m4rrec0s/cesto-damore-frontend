/**
 * Google Tag Manager (GTM) / GA4 dataLayer helpers.
 *
 * Pushes ecommerce and engagement events to `window.dataLayer`.
 * The array is always initialized defensively before any push so that
 * client components can emit events even before the GTM snippet executes.
 */

export type GtmItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
};

type GtmPush = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: GtmPush[];
  }
}

const CURRENCY = "BRL";

export function pushToDataLayer(event: GtmPush): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

export function trackViewItem(item: GtmItem, value?: number): void {
  pushToDataLayer({
    event: "view_item",
    ecommerce: {
      currency: CURRENCY,
      value: value ?? item.price ?? 0,
      items: [item],
    },
  });
}

export function trackAddToCart(item: GtmItem, quantity: number): void {
  pushToDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: CURRENCY,
      value: (item.price ?? 0) * quantity,
      items: [{ ...item, quantity }],
    },
  });
}

export function trackBeginCheckout(value: number, items: GtmItem[]): void {
  pushToDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: CURRENCY,
      value,
      items,
    },
  });
}

export function trackPurchase(params: {
  transaction_id: string;
  value: number;
  coupon?: string;
  shipping?: number;
  items: GtmItem[];
}): void {
  pushToDataLayer({
    event: "purchase",
    ecommerce: {
      currency: CURRENCY,
      transaction_id: params.transaction_id,
      value: params.value,
      ...(params.coupon ? { coupon: params.coupon } : {}),
      ...(typeof params.shipping === "number"
        ? { shipping: params.shipping }
        : {}),
      items: params.items,
    },
  });
}

export function trackContact(method?: string): void {
  pushToDataLayer({
    event: "generate_lead",
    contact_method: method ?? "whatsapp",
  });
}

export function trackLogin(method: string): void {
  pushToDataLayer({
    event: "login",
    method,
  });
}

export interface GtmOrderLike {
  id: string | number;
  grand_total?: number | null;
  total?: number;
  shipping_price?: number | null;
  coupon?: { code: string } | null;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    product?: { name?: string } | null;
    additionals?: Array<{
      additional_id: string;
      price: number;
      additional?: { name?: string } | null;
    }>;
  }>;
}

export function trackPurchaseFromOrder(order: GtmOrderLike): void {
  const gtmItems = order.items.flatMap((item) => {
    const base = {
      item_id: item.product_id,
      item_name: item.product?.name,
      price: item.price,
      quantity: item.quantity,
    };
    const additionals = (item.additionals ?? []).map((add) => ({
      item_id: add.additional_id,
      item_name: add.additional?.name ?? add.additional_id,
      price: add.price,
      quantity: item.quantity,
    }));
    return [base, ...additionals];
  });

  const value =
    order.grand_total ?? order.total ??
    gtmItems.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0,
    );

  trackPurchase({
    transaction_id: String(order.id),
    value: Number(value),
    ...(order.coupon?.code ? { coupon: order.coupon.code } : {}),
    ...(typeof order.shipping_price === "number"
      ? { shipping: order.shipping_price }
      : {}),
    items: gtmItems,
  });
}
