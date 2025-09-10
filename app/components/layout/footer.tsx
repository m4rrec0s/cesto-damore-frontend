import { Heart, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold">Cesto d&apos;Amore</span>
            </div>
            <p className="text-gray-300 max-w-md leading-relaxed mb-6">
              Sabores artesanais selecionados com carinho para criar momentos
              especiais. Cada produto conta uma história de tradição e
              qualidade.
            </p>
            <div className="flex items-center gap-2 text-gray-300">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="text-sm">Feito com amor para você</span>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contato</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-orange-400" />
                <div>
                  <div className="text-sm">(11) 99999-9999</div>
                  <div className="text-xs text-gray-400">WhatsApp</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-1 text-orange-400" />
                <div>
                  <div className="text-sm">contato@cestoamore.com</div>
                  <div className="text-xs text-gray-400">E-mail</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-orange-400" />
                <div>
                  <div className="text-sm">São Paulo, SP</div>
                  <div className="text-xs text-gray-400">
                    Entregamos em toda a cidade
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Navegação</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link
                  href="/"
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  href="/categorias"
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  Categorias
                </Link>
              </li>
              <li>
                <Link
                  href="/ofertas"
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  Ofertas
                </Link>
              </li>
              <li>
                <Link
                  href="/novidades"
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  Novidades
                </Link>
              </li>
              <li>
                <Link
                  href="/estoque"
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  Controle de Estoque
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              © 2024 Cesto d&apos;Amore. Todos os direitos reservados.
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-orange-400 transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-orange-400 transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="hover:text-orange-400 transition-colors">
                Política de Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
