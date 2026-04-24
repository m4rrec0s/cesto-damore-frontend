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
    process.env.BACKEND_API_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_API_URL,
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
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
  const targetUrl = `${apiBaseUrl}/${normalizedPath}${query}`;

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

  let upstream: Response;
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

  const responseHeaders = new Headers(upstream.headers);
  for (const header of hopByHopHeaders) {
    responseHeaders.delete(header);
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
