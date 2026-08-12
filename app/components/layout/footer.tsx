import Image from "next/image";
import { getPublicAssetUrl } from "@/lib/image-helper";
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
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <Image
                  src={getPublicAssetUrl("logo.png")}
                  alt="Cesto d'Amore"
                  fill
                  className="object-contain invert"
                />
              </div>
              <div>
                <p className="text-white text-lg font-bold">
                  Cesto d&apos;Amore
                </p>
                <p className="text-xs text-gray-400">Presentes e flores</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              Surpreenda com cestas, flores e presentes personalizados.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://tintim.link/whatsapp/0e438d1e-b6d6-41f8-ba1e-1a2554fb2089/e1e7a67b-23ad-4d79-b41f-faad52c88ddf"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 p-2 rounded-full hover:bg-rose-500 transition-colors"
                aria-label="WhatsApp"
              >
                <Phone className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/cestodamore/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 p-2 rounded-full hover:bg-rose-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

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
                  href="/about-us"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/devolutions"
                  className="text-sm hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  → Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-500" />
              Contato
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <Phone className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">WhatsApp</p>
                  <a
                    href="https://tintim.link/whatsapp/0e438d1e-b6d6-41f8-ba1e-1a2554fb2089/e1e7a67b-23ad-4d79-b41f-faad52c88ddf"
                    className="text-rose-400 transition-colors"
                  >
                    Clique Aqui para WhatsApp
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Mail className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">E-mail</p>
                  <a
                    href="mailto:cestodamore17@gmail.com"
                    className="hover:text-rose-400 transition-colors"
                  >
                    cestodamore17@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Clock className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Horário de Entrega</p>
                  <p className="text-gray-400">
                    Seg - Sex: 9h às 13h / 14h às 18h
                  </p>
                  <p className="text-gray-400">Sábado: 9h às 13h</p>
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

        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CreditCard className="h-5 w-5 text-rose-400" />
              Formas de Pagamento
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <img
                src={getPublicAssetUrl("pix.svg")}
                alt="PIX"
                title="PIX"
                className="h-8 w-auto bg-white rounded-lg border border-gray-700 hover:border-rose-500 transition-colors px-2 py-1"
              />

              <img
                src={getPublicAssetUrl("mercado-pago.svg")}
                alt="Mercado Pago"
                title="Mercado Pago"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />

              <img
                src={getPublicAssetUrl("visa.svg")}
                alt="Visa"
                title="Visa"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />

              <img
                src={getPublicAssetUrl("mastercard.svg")}
                alt="Mastercard"
                title="Mastercard"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />

              <img
                src={getPublicAssetUrl("elo.svg")}
                alt="Elo"
                title="Elo"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />

              <img
                src={getPublicAssetUrl("american-express.svg")}
                alt="American Express"
                title="American Express"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />

              <img
                src={getPublicAssetUrl("hipercard.svg")}
                alt="Hipercard"
                title="Hipercard"
                className="h-8 w-auto rounded-lg border border-gray-700 hover:border-rose-500 transition-colors"
              />
            </div>

            <p className="text-xs text-gray-500 text-center mt-2">
              <Shield className="inline h-3 w-3 mr-1" />
              Pagamento 100% seguro via Mercado Pago
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p className="text-center md:text-left">
              © {currentYear} Cesto d&apos;Amore. Todos os direitos reservados.
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
