
import { initMercadoPago } from "@mercadopago/sdk-react";

let mpInitialized = false;

export const loadMercadoPagoSDK = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (window.MercadoPago) {
      resolve();
      return;
    }

    const checkExist = setInterval(() => {
      if (window.MercadoPago) {
        clearInterval(checkExist);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkExist);
      resolve();
    }, 5000);
  });
};

export const initializeMercadoPago = (publicKey: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    mpInitialized ||
    (window.MercadoPago &&
      (window.MercadoPago as { __initialized?: boolean }).__initialized)
  ) {
    mpInitialized = true;
    return window.MercadoPago;
  }

  if (publicKey) {
    try {

      initMercadoPago(publicKey, { locale: "pt-BR" });
      mpInitialized = true;

      if (window.MercadoPago) {
        (window.MercadoPago as { __initialized?: boolean }).__initialized =
          true;
      }

      console.log("💳 MercadoPago inicializado com sucesso");
    } catch (err) {
      console.warn("⚠️ Aviso ao inicializar MercadoPago:", err);
    }
  }

  return window.MercadoPago;
};
