"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { CheckCircle, Home } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/app/hooks/use-cart";

export default function PaymentSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {

    clearCart();
  }, [clearCart]);

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
