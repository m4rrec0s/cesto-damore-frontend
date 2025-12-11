import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy para carregar imagens do Google Drive contornando CORS
 * Otimizado para usar thumbnails do Drive para carregamento mais rápido
 *
 * Uso: /api/proxy-image?url=https://drive.google.com/uc?id=FILE_ID&size=w400
 */

// Cache em memória simples para reduzir requisições repetidas
const imageCache = new Map<
  string,
  { buffer: Buffer; contentType: string; timestamp: number }
>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora em memória
const MAX_CACHE_SIZE = 50; // Máximo de imagens em cache

function cleanOldCache() {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  // Se ainda tiver muitas, remove as mais antigas
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      imageCache.delete(key);
    }
  }
}

function extractDriveFileId(url: string): string | null {
  // Padrões comuns de URL do Google Drive
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, // /d/FILE_ID/
    /id=([a-zA-Z0-9_-]+)/, // id=FILE_ID
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");
    const size = searchParams.get("size") || "w500"; // Tamanho padrão otimizado

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL da imagem não fornecida" },
        { status: 400 }
      );
    }

    // Validar que é uma URL do Google Drive
    if (
      !imageUrl.includes("drive.google.com") &&
      !imageUrl.includes("drive.usercontent.google.com")
    ) {
      return NextResponse.json(
        { error: "Apenas URLs do Google Drive são permitidas" },
        { status: 400 }
      );
    }

    // Chave de cache baseada na URL e tamanho
    const cacheKey = `${imageUrl}:${size}`;

    // Verificar cache em memória
    cleanOldCache();
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
          "Access-Control-Allow-Origin": "*",
          "X-Cache": "HIT",
        },
      });
    }

    // Extrair o ID do arquivo para usar a API de thumbnail (mais rápida)
    const fileId = extractDriveFileId(imageUrl);

    let finalUrl = imageUrl;

    if (fileId) {
      // Usar URL de thumbnail do Drive - MUITO mais rápido que download direto
      // O formato sz=w{width} pega thumbnail em largura específica
      finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
    }

    // Fazer requisição para o Google Drive
    const response = await fetch(finalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*",
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(
        `❌ Erro ao buscar imagem: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: `Erro ao carregar imagem: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Obter o buffer da imagem
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detectar tipo de conteúdo
    const contentType = response.headers.get("content-type") || "image/png";

    // Salvar no cache em memória
    imageCache.set(cacheKey, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    // Retornar imagem com headers corretos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("❌ Erro no proxy de imagem:", error);
    return NextResponse.json(
      { error: "Erro ao processar imagem" },
      { status: 500 }
    );
  }
}
