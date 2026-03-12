import { initMercadoPago } from "@mercadopago/sdk-react";

let mpInitialized = false;
let initializedPublicKey: string | null = null;
let publicConfigPromise: Promise<MercadoPagoPublicConfig> | null = null;

export interface MercadoPagoPublicConfig {
  publicKey: string;
  publicKeyEnvironment?: string;
  publicKeyFingerprint?: string;
  publicKeyPrefix?: string;
  source: "runtime" | "build";
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const fallbackPublicConfig = (): MercadoPagoPublicConfig => {
  if (!MP_PUBLIC_KEY) {
    throw new Error("Chave pública do Mercado Pago não configurada");
  }

  return {
    publicKey: MP_PUBLIC_KEY,
    publicKeyPrefix: MP_PUBLIC_KEY.slice(0, 16),
    source: "build",
  };
};

export const getMercadoPagoPublicConfig =
  async (): Promise<MercadoPagoPublicConfig> => {
    if (!publicConfigPromise) {
      publicConfigPromise = (async () => {
        if (!API_URL) {
          return fallbackPublicConfig();
        }

        try {
          const response = await fetch(`${API_URL}/mercadopago/public-config`, {
            method: "GET",
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(
              `Falha ao carregar configuração pública (${response.status})`,
            );
          }

          const payload = (await response.json()) as {
            success?: boolean;
            data?: {
              publicKey?: string;
              publicKeyEnvironment?: string;
              publicKeyFingerprint?: string;
              publicKeyPrefix?: string;
            };
          };

          if (!payload?.data?.publicKey) {
            throw new Error("Resposta sem chave pública do Mercado Pago");
          }

          return {
            publicKey: payload.data.publicKey,
            publicKeyEnvironment: payload.data.publicKeyEnvironment,
            publicKeyFingerprint: payload.data.publicKeyFingerprint,
            publicKeyPrefix:
              payload.data.publicKeyPrefix ||
              payload.data.publicKey.slice(0, 16),
            source: "runtime",
          };
        } catch (error) {
          console.warn(
            "⚠️ Falha ao carregar chave pública do Mercado Pago em runtime. Usando fallback do build.",
            error,
          );
          return fallbackPublicConfig();
        }
      })();
    }

    return publicConfigPromise;
  };

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
    (mpInitialized && initializedPublicKey === publicKey) ||
    (window.MercadoPago &&
      (
        window.MercadoPago as {
          __initialized?: boolean;
          __initializedKey?: string;
        }
      ).__initialized &&
      (
        window.MercadoPago as {
          __initialized?: boolean;
          __initializedKey?: string;
        }
      ).__initializedKey === publicKey)
  ) {
    mpInitialized = true;
    initializedPublicKey = publicKey;
    return window.MercadoPago;
  }

  if (publicKey) {
    try {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      mpInitialized = true;
      initializedPublicKey = publicKey;

      if (window.MercadoPago) {
        (
          window.MercadoPago as {
            __initialized?: boolean;
            __initializedKey?: string;
          }
        ).__initialized = true;
        (
          window.MercadoPago as {
            __initialized?: boolean;
            __initializedKey?: string;
          }
        ).__initializedKey = publicKey;
      }

      console.log("💳 MercadoPago inicializado com sucesso");
    } catch (err) {
      console.warn("⚠️ Aviso ao inicializar MercadoPago:", err);
    }
  }

  return window.MercadoPago;
};
