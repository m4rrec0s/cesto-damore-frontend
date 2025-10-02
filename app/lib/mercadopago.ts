// lib/mercadopago.ts

export const loadMercadoPagoSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    if (window.MercadoPago) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load MercadoPago SDK"));
    };

    document.head.appendChild(script);
  });
};

export const initializeMercadoPago = (publicKey: string) => {
  if (typeof window === "undefined" || !window.MercadoPago) {
    return null;
  }

  return new window.MercadoPago(publicKey);
};
