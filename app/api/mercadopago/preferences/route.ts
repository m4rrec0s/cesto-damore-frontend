import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mercadopagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  if (!mercadopagoAccessToken) {
    return Response.json(
      { error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor." },
      { status: 500 },
    );
  }

  const payload = await request.json();

  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
