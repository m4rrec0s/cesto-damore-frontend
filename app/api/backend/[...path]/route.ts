import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("seudominio.com.br") ||
    normalized.includes("example.com") ||
    normalized.includes("xxxxxxxx") ||
    normalized.startsWith("key_x")
  );
}

function normalizeBaseUrl(raw: string): string {
  const parsed = new URL(raw);
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

function isFrontendProxyLoop(baseUrl: string, request: NextRequest): boolean {
  try {
    const parsed = new URL(baseUrl);
    const path = parsed.pathname.replace(/\/+$/, "");

    const isLocalFrontendPort =
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (parsed.port === "3000" || parsed.port === "3001");

    const pointsToProxyPath =
      path === "/api/backend" || path.startsWith("/api/backend/");

    const sameOriginAsCurrentRequest = parsed.origin === request.nextUrl.origin;

    return pointsToProxyPath && (isLocalFrontendPort || sameOriginAsCurrentRequest);
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(request: NextRequest): string {
  const candidates = [
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.BACKEND_API_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_API_URL,
    process.env.NODE_ENV !== "production" ? "http://localhost:3333" : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate || isPlaceholder(candidate)) {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed || trimmed.startsWith("/")) {
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      continue;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      continue;
    }

    const normalized = normalizeBaseUrl(trimmed);
    if (isFrontendProxyLoop(normalized, request)) {
      continue;
    }

    return normalized;
  }

  return "";
}

function resolveApiKey(): string {
  const candidates = [
    process.env.API_KEY,
    process.env.AI_AGENT_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY,
    process.env.NEXT_PUBLIC_AI_AGENT_API_KEY,
  ];

  for (const candidate of candidates) {
    if (!isPlaceholder(candidate)) {
      return candidate!.trim();
    }
  }

  return "";
}

function buildTargetUrl(baseUrl: string, path: string, query: string): string {
  const parsed = new URL(baseUrl);
  const basePath = parsed.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  const fullPath = [basePath, normalizedPath].filter(Boolean).join("/");
  return `${parsed.origin}/${fullPath}${query}`;
}

function buildApiPrefixFallbackUrl(
  baseUrl: string,
  path: string,
  query: string,
): string {
  const parsed = new URL(baseUrl);
  const baseSegments = parsed.pathname
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  const pathSegments = path
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);

  let fallbackBaseSegments = [...baseSegments];
  let fallbackPathSegments = [...pathSegments];

  if (fallbackBaseSegments[fallbackBaseSegments.length - 1] === "api") {
    fallbackBaseSegments = fallbackBaseSegments.slice(0, -1);
  } else if (fallbackPathSegments[0] === "api") {
    fallbackPathSegments = fallbackPathSegments.slice(1);
  } else {
    fallbackPathSegments = ["api", ...fallbackPathSegments];
  }

  const fallbackBase = fallbackBaseSegments.join("/");
  const fallbackPath = fallbackPathSegments.join("/");
  const fullPath = [fallbackBase, fallbackPath].filter(Boolean).join("/");
  return `${parsed.origin}/${fullPath}${query}`;
}

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxyRequest(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  const apiBaseUrl = resolveApiBaseUrl(request);
  const apiKey = resolveApiKey();

  if (!apiBaseUrl) {
    return Response.json(
      {
        error:
          "API_URL não configurada no servidor do frontend. Defina API_URL (server-side).",
      },
      { status: 500 },
    );
  }

  const { path = [] } = context.params;
  const query = request.nextUrl.search || "";
  const normalizedPath = path.join("/");
  const targetUrl = buildTargetUrl(apiBaseUrl, normalizedPath, query);
  const fallbackTargetUrl = buildApiPrefixFallbackUrl(
    apiBaseUrl,
    normalizedPath,
    query,
  );

  const headers = new Headers(request.headers);
  for (const header of hopByHopHeaders) {
    headers.delete(header);
  }

  if (apiKey && !headers.get("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const debugProxy = request.nextUrl.searchParams.get("__debug_proxy") === "1";

  let upstream: Response;
  let fallbackStatus: number | null = null;
  let fallbackUsed = false;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error: any) {
    return Response.json(
      {
        error: "Falha ao conectar ao backend upstream.",
        targetUrl,
        details: error?.message || "Erro de rede não identificado",
      },
      { status: 502 },
    );
  }

  // Fallback de compatibilidade para ambientes com/sem prefixo "/api"
  // no gateway upstream. Evita 404 em produção por divergência de path base.
  if (
    upstream.status === 404 &&
    (method === "GET" || method === "HEAD") &&
    fallbackTargetUrl !== targetUrl
  ) {
    try {
      const fallbackUpstream = await fetch(fallbackTargetUrl, {
        method,
        headers,
        redirect: "manual",
        cache: "no-store",
      });
      fallbackStatus = fallbackUpstream.status;

      if (fallbackUpstream.status !== 404) {
        upstream = fallbackUpstream;
        fallbackUsed = true;
      }
    } catch {
      // Mantém resposta original se fallback falhar.
    }
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const header of hopByHopHeaders) {
    responseHeaders.delete(header);
  }
  if (debugProxy) {
    responseHeaders.set("x-proxy-target-url", targetUrl);
    responseHeaders.set("x-proxy-fallback-url", fallbackTargetUrl);
    responseHeaders.set("x-proxy-fallback-status", String(fallbackStatus ?? ""));
    responseHeaders.set("x-proxy-fallback-used", String(fallbackUsed));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: { path?: string[] } },
) {
  return proxyRequest(request, context);
}
