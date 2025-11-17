import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Heart,
  Shield,
  Truck,
  CreditCard,
} from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-none sm:max-w-[90%] mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="h-16 w-[180px] relative mb-4">
              <Image
                src="/logo.png"
                alt="Cesto d'Amore Logo"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Presentes especiais para momentos inesquecíveis. Cestas, flores e
              mimos que expressam amor e carinho.
            </p>
            <div className="flex gap-3 pt-2">
              <a
                href="https://instagram.com/cestodamorecg"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 p-2 rounded-full hover:bg-rose-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              {/* <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 p-2 rounded-full hover:bg-rose-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a> */}
              <a
                href="https://wa.me/5583982163104"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 p-2 rounded-full hover:bg-rose-500 transition-colors"
                aria-label="WhatsApp"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Links Rápidos
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/categorias"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Categorias
                </Link>
              </li>
              <li>
                <Link
                  href="/ofertas"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Ofertas Especiais
                </Link>
              </li>
              <li>
                <Link
                  href="/cestas-romanticas"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Cestas Românticas
                </Link>
              </li>
              <li>
                <Link
                  href="/buques-de-flores"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Buquês de Flores
                </Link>
              </li>
              <li>
                <Link
                  href="/cesto-express"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Cesto Express
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-500" />
              Atendimento
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/pedidos"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Meus Pedidos
                </Link>
              </li>
              <li>
                <Link
                  href="/sobre"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-privacidade"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/termos-uso"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/devolucoes"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-500" />
              Contato
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <Phone className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">WhatsApp 24h</p>
                  <a
                    href="https://wa.me/5583982163104"
                    className="hover:text-rose-400 transition-colors"
                  >
                    (83) 98216-3104
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Mail className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">E-mail</p>
                  <a
                    href="mailto:contato@cestodamore.com.br"
                    className="hover:text-rose-400 transition-colors"
                  >
                    contato@cestodamore.com.br
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Clock className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Horário de Entrega</p>
                  <p className="text-gray-400">Seg - Sex: 8h às 18h</p>
                  <p className="text-gray-400">Sábado: 8h às 14h</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Localização</p>
                  <p className="text-gray-400">Campina Grande - PB</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CreditCard className="h-5 w-5 text-rose-400" />
              Formas de Pagamento
            </div>

            {/* Payment Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* PIX */}
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors">
                <span className="text-sm font-bold text-emerald-400">PIX</span>
              </div>

              {/* Mercado Pago */}
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">MP</span>
                </div>
                <span className="text-sm font-medium">Mercado Pago</span>
              </div>

              {/* Visa */}
              <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors">
                <span className="text-sm font-bold text-blue-600">VISA</span>
              </div>

              {/* Mastercard */}
              <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors flex items-center gap-1">
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded-full bg-red-500 opacity-80"></div>
                  <div className="w-4 h-4 rounded-full bg-orange-500 opacity-80 -ml-2"></div>
                </div>
                <span className="text-sm font-bold">Mastercard</span>
              </div>

              {/* Elo */}
              <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors">
                <span className="text-sm font-bold text-yellow-500">ELO</span>
              </div>

              {/* American Express */}
              <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors">
                <span className="text-sm font-bold text-blue-400">AMEX</span>
              </div>

              {/* Hipercard */}
              <div className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 hover:border-rose-500 transition-colors">
                <span className="text-sm font-bold text-red-600">
                  Hipercard
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-2">
              <Shield className="inline h-3 w-3 mr-1" />
              Pagamento 100% seguro via Mercado Pago
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p className="text-center md:text-left">
              © {currentYear} Cesto dAmore. Todos os direitos reservados.
            </p>
            <p className="text-center font-mono md:text-right flex items-center gap-1">
              Desenvolvido_Por_
              <Link href="https://github.com/m4rrec0s">M4rrec0s</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
