import { Suspense } from "react";
import CarrinhoPageContent from "./components/CarrinhoPage";
import { Loader2 } from "lucide-react";

function CarrinhoLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#3483fa] mb-4" />
        <p className="text-gray-600">Carregando carrinho...</p>
      </div>
    </div>
  );
}

export default function CarrinhoPage() {
  return (
    <Suspense fallback={<CarrinhoLoading />}>
      <CarrinhoPageContent />
    </Suspense>
  );
}
