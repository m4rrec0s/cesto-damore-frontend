"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { XCircle, Home, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function PaymentFailure() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
      <Card className="p-8 text-center max-w-md">
        <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento Não Aprovado
        </h1>
        <p className="text-gray-600 mb-6">
          Houve um problema com seu pagamento. Verifique os dados do cartão e
          tente novamente.
        </p>
        <div className="space-y-3">
          <Link href="/carrinho?step=pagamento">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
