import { ChevronDown } from "lucide-react";
import { Button } from "../ui/button";

export function HeroSection() {
  return (
    <>
      {/* Hero Principal */}
      <section className="relative w-full bg-gradient-to-br overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:py-12">
          <div className="relative bg-gradient-to-br from-rose-50 to-rose-100 rounded-4xl overflow-hidden w-full h-64 sm:h-80 lg:h-96 flex items-end justify-start p-6 sm:p-8">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2 text-left leading-none">
                Surpreenda com um Cesto dAmore
              </h1>
              <p className="text-base sm:text-lg text-gray-700 mb-0 text-left leading-tight">
                Presentes personalizados para todas as ocasiões especiais
              </p>
              <Button
                size="lg"
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
                onClick={() => {
                  const productsSection = document.getElementById("products");
                  productsSection?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Ver Produtos
                <ChevronDown className="h-4 w-4 ml-2 animate-spin-slow" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
