import Link from "next/link";
import { ShoppingCart, User, Search, Menu, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Cesto d&apos;Amore
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex items-center flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produtos, categorias..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link
              href="/categorias"
              className="hover:text-orange-600 transition-colors"
            >
              Categorias
            </Link>
            <Link
              href="/ofertas"
              className="hover:text-orange-600 transition-colors"
            >
              Ofertas
            </Link>
            <Link
              href="/novidades"
              className="hover:text-orange-600 transition-colors"
            >
              Novidades
            </Link>
            <Link
              href="/estoque"
              className="flex items-center gap-1 hover:text-orange-600 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Estoque
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                Entrar
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Criar conta
              </Button>
            </div>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Carrinho"
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User */}
            <Button variant="ghost" size="icon" aria-label="Perfil">
              <User className="h-5 w-5" />
            </Button>

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
