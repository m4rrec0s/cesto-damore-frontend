"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { Input } from "../ui/input";
import { useCartContext } from "../../hooks/cart-context";
import { useAuth } from "../../hooks/use-auth";
import { useState, useEffect } from "react";
import { CartSheet } from "../cart-sheet";

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { cart } = useCartContext();
  const { user } = useAuth();

  // Garantir hidratação correta
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  return (
    <div className="flex flex-col items-center bg-rose-500 text-white">
      <div className="w-full max-w-7xl text-sm py-1 flex justify-between items-center px-4">
        <span className="text-xs">Atendimento 24hrs no WhatsApp</span>
        <span className="text-xs text-right">
          Entregas nos horários comerciais
        </span>
      </div>
      <header className="sticky top-0 z-50 w-full bg-rose-400 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0 py-2">
              <Image
                src="/logo.png"
                alt="Cesto d'Amore"
                width={200}
                height={35}
              />
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex items-center flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar produtos, categorias..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-white">
              <Link
                href="/categorias"
                className="hover:text-neutral-200 transition-colors"
              >
                Categorias
              </Link>
              <Link
                href="/ofertas"
                className="hover:text-neutral-200 transition-colors"
              >
                Ofertas
              </Link>
              <Link
                href="/novidades"
                className="hover:text-neutral-200 transition-colors"
              >
                Novidades
              </Link>
              <Link
                href="/estoque"
                className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
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
              <div className="hidden md:flex items-center gap-2 ml-5">
                {user ? (
                  <Button
                    variant="ghost"
                    className="text-white hover:text-gray-900"
                  >
                    {user.name}
                  </Button>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="ghost"
                        className="text-white hover:text-gray-900"
                      >
                        Entrar
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                        Criar conta
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Carrinho"
                className="relative"
                onClick={handleOpenCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {isClient && cart.itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cart.itemCount}
                  </span>
                )}
              </Button>

              {/* User */}
              {user && (
                <Button variant="ghost" size="icon" aria-label="Perfil">
                  <User className="h-5 w-5" />
                </Button>
              )}

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
              <Input
                type="text"
                placeholder="Buscar produtos..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </header>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
