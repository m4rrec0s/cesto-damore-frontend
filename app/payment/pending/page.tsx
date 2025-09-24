"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Clock, Home } from "lucide-react";
import Link from "next/link";

export default function PaymentPending() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-yellow-50">
      <Card className="p-8 text-center max-w-md">
        <Clock className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pagamento Pendente
        </h1>
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Você receberá uma confirmação
          assim que for aprovado.
        </p>
        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
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
