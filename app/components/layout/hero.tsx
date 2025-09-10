import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { ShoppingBag, Star, Award, Truck } from "lucide-react";

export function HeroSection() {
  return (
    <>
      {/* Hero Principal */}
      <section className="relative w-full bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
                  <Award className="h-4 w-4" />
                  Produtos Artesanais Premium
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
                  Sabores
                  <span className="text-orange-500"> artesanais</span>
                  <br />
                  para momentos especiais
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Descubra cestas cuidadosamente selecionadas com produtos
                  regionais, ingredientes frescos e combinações perfeitas para
                  presentear ou se deliciar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Comprar agora
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 px-8 py-4 text-lg font-semibold"
                >
                  Ver categorias
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-orange-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">Produtos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">10k+</div>
                  <div className="text-sm text-gray-600">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">4.9</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    Avaliação
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-square w-full max-w-lg mx-auto">
                {/* Floating elements */}
                <div className="absolute -top-4 -left-4 w-20 h-20 bg-yellow-200 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-orange-200 rounded-full opacity-60 animate-pulse delay-1000"></div>
                <div className="absolute top-1/4 -right-8 w-12 h-12 bg-red-200 rounded-full opacity-60 animate-pulse delay-500"></div>

                {/* Main image container */}
                <div className="relative w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-orange-100">
                  <Image
                    src="/globe.svg"
                    alt="Cesta gourmet artesanal"
                    fill
                    className="object-contain p-12"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Benefícios */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Qualidade Premium
                </h3>
                <p className="text-gray-600 text-sm">
                  Produtos selecionados rigorosamente por especialistas em
                  gastronomia.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Entrega Rápida
                </h3>
                <p className="text-gray-600 text-sm">
                  Receba seus produtos frescos e saborosos em até 24 horas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Experiência Única
                </h3>
                <p className="text-gray-600 text-sm">
                  Cada produto conta uma história e desperta sensações
                  especiais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
