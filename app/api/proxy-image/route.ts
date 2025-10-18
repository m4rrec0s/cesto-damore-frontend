import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy para carregar imagens do Google Drive contornando CORS
 *
 * Uso: /api/proxy-image?url=https://drive.google.com/uc?id=FILE_ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL da imagem não fornecida" },
        { status: 400 }
      );
    }

    // Validar que é uma URL do Google Drive
    if (!imageUrl.includes("drive.google.com")) {
      return NextResponse.json(
        { error: "Apenas URLs do Google Drive são permitidas" },
        { status: 400 }
      );
    }

    console.log(`🔄 Proxy: Carregando imagem do Google Drive...`);

    // Fazer requisição para o Google Drive
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
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

    console.log(
      `✅ Imagem carregada: ${(buffer.length / 1024).toFixed(
        0
      )}KB (${contentType})`
    );

    // Retornar imagem com headers corretos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache por 24h
        "Access-Control-Allow-Origin": "*",
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
