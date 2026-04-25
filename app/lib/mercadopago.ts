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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const fallbackPublicConfig = (): MercadoPagoPublicConfig => {
  throw new Error(
    "Não foi possível carregar a chave pública do Mercado Pago em runtime.",
  );
};

const runtimePublicConfigEndpoints = (): string[] => {
  const endpoints = ["/api/backend/mercadopago/public-config"];

  if (API_URL) {
    endpoints.push(`${API_URL}/mercadopago/public-config`);
  }

  return endpoints;
};

export const getMercadoPagoPublicConfig =
  async (): Promise<MercadoPagoPublicConfig> => {
    if (!publicConfigPromise) {
      publicConfigPromise = (async () => {
        const endpoints = runtimePublicConfigEndpoints();
        let lastRuntimeError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
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
            lastRuntimeError = error;
          }
        }

        try {
          return fallbackPublicConfig();
        } catch (fallbackError) {
          console.warn(
            "⚠️ Falha ao carregar chave pública do Mercado Pago em runtime e fallback de build.",
            {
              runtimeError: lastRuntimeError,
              fallbackError,
            },
          );
          throw fallbackError;
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
