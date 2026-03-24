const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const API_KEY =
  process.env.NEXT_PUBLIC_API_KEY ||
  process.env.NEXT_PUBLIC_AI_AGENT_API_KEY ||
  "";

let installed = false;

const shouldAttachApiKey = (url: string) => {
  if (!API_BASE_URL || !API_KEY) return false;

  try {
    const apiBase = new URL(API_BASE_URL);
    const resolvedUrl = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : apiBase.origin,
    );

    return resolvedUrl.origin === apiBase.origin;
  } catch {
    return false;
  }
};

export function installApiKeyFetchInterceptor() {
  if (installed || typeof globalThis.fetch !== "function" || !API_KEY) {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);

    if (!shouldAttachApiKey(request.url)) {
      return originalFetch(request);
    }

    const headers = new Headers(request.headers);
    headers.set("x-api-key", API_KEY);

    return originalFetch(new Request(request, { headers }));
  };

  installed = true;
}
