"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";

export default function CheckoutTransparenteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/carrinho");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-rose-600 mb-4" />
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Checkout integrado ao carrinho
      </h1>
      <p className="text-gray-600 max-w-md mb-6">
        Nosso processo de pagamento agora acontece diretamente na página do
        carrinho. Você será redirecionado automaticamente em instantes.
      </p>
      <Link
        href="/carrinho"
        className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 transition"
      >
        <ShoppingCart className="h-4 w-4" />
        Abrir carrinho
      </Link>
    </div>
  );
}
