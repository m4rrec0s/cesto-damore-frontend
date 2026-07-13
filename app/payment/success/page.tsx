"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { CheckCircle, Home } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/app/hooks/use-cart";
import { useApi } from "@/app/hooks/use-api";
import { trackPurchaseFromOrder } from "@/lib/gtm";

function PaymentSuccessContent() {
  const { clearCart } = useCart();
  const api = useApi();
  const searchParams = useSearchParams();
  const purchaseFiredRef = useRef(false);

  useEffect(() => {
    clearCart();

    if (purchaseFiredRef.current) return;

    const status = searchParams.get("status");
    if (status && status !== "approved") return;

    const orderId = searchParams.get("external_reference");
    if (!orderId) return;

    purchaseFiredRef.current = true;

    const firePurchase = async () => {
      try {
        const order = await api.getOrder(orderId);
        if (!order) return;

        trackPurchaseFromOrder(order);
      } catch (error) {
        console.error("Erro ao disparar evento de compra:", error);
      }
    };

    void firePurchase();
  }, [clearCart, api, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-green-50">
      <Card className="p-8 text-center max-w-md">
        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento Aprovado!
        </h1>
        <p className="text-gray-600 mb-6">
          Seu pedido foi processado com sucesso. Você receberá um email de
          confirmação em breve.
        </p>
        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
          <Link href="/pedidos">
            <Button variant="outline" className="w-full">
              Ver Meus Pedidos
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-green-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
