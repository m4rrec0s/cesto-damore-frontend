// lib/mercadopago.ts
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

    // O script pode ser injetado pelo sdk-react ou manualmente
    const checkExist = setInterval(() => {
      if (window.MercadoPago) {
        clearInterval(checkExist);
        resolve();
      }
    }, 100);

    // Timeout de segurança
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

  // Se já inicializado pela nossa flag ou se o MercadoPago já parece pronto
  if (
    mpInitialized ||
    (window.MercadoPago &&
      (window.MercadoPago as { __initialized?: boolean }).__initialized)
  ) {
    mpInitialized = true;
    return window.MercadoPago;
  }

  // Verificar se o script está carregado antes de inicializar
  if (publicKey) {
    try {
      // initMercadoPago é seguro para chamar múltiplas vezes se o SDK lidar com isso,
      // mas o warn diz que não. Então usamos nossa flag.
      initMercadoPago(publicKey, { locale: "pt-BR" });
      mpInitialized = true;

      // Marcar como inicializado no objeto global para ser extra seguro
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
