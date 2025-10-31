"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  Settings,
  MapPin,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { Input } from "../ui/input";
import { useCartContext } from "../../hooks/cart-context";
import { useAuth } from "../../hooks/use-auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartSheet } from "../cart-sheet";
import { Separator } from "../ui/separator";

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { cart } = useCartContext();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="flex flex-col items-center bg-rose-500 text-white">
      <div className="w-full max-w-none sm:max-w-[90%] text-sm py-1 flex justify-between items-center px-4">
        <span className="text-xs">Atendimento 24hrs no WhatsApp</span>
        <span className="text-xs text-right">
          Entregas nos horários comerciais
        </span>
      </div>
      <header className="sticky top-0 z-50 w-full bg-rose-400">
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
          <div className="flex h-20 items-center justify-between">
            <Link
              href="/"
              className="flex items-center flex-shrink-0 py-2 w-[120px] relative h-12"
            >
              <Image
                src="/logo.png"
                alt="Cesto d'Amore"
                fill
                className="object-contain"
              />
            </Link>

            <div className="hidden lg:flex items-center flex-1 min-w-[30%] lg:min-w-[40%] w-full mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar produtos, categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </form>
            </div>

            <div className="w-full flex items-center justify-end gap-6 h-8">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Buscar"
              >
                <Search className="h-8 w-8" />
              </Button>

              <div className="flex items-center gap-3">
                <User className="h-8 w-8" fill="#FFFFFF" />
                <div className="hidden md:block text-left">
                  {user ? (
                    <div className="flex flex-col items-start">
                      <span className="text-xs">Bem vindo de volta,</span>
                      <span className="font-semibold text-xs">{user.name}</span>
                    </div>
                  ) : (
                    <>
                      <Link href="/login" className="flex flex-col items-start">
                        <span className="text-xs">Entre na sua conta</span>
                        <span className="font-semibold text-xs">
                          Bem vindo!
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden lg:block" />

              <div className="hidden md:flex items-center gap-3">
                <div className="relative">
                  <MapPin className="h-8 w-8" fill="#FFFFFF" />
                  <span className="absolute top-2 right-2.5 h-3 w-3 bg-rose-400 text-white text-xs rounded-full flex items-center justify-center" />
                </div>
                <div className="text-left">
                  <Link href="/pedidos" className="flex flex-col items-start">
                    <span className="text-xs">Seus pedidos</span>
                    <span className="font-semibold text-xs">
                      Acompanhe aqui
                    </span>
                  </Link>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden lg:block" />

              <button
                type="button"
                aria-label="Carrinho"
                className="flex items-center gap-3 cursor-pointer"
                onClick={handleOpenCart}
              >
                <div className="relative">
                  <ShoppingCart className="h-8 w-8" fill="#FFFFFF" />
                  {isClient && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                      {cart.itemCount}
                    </span>
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs">Seu carrinho</span>
                  <span className="font-semibold text-xs">Ver produtos</span>
                </div>
              </button>

              <button type="button" className="lg:hidden" aria-label="Menu">
                <Menu className="h-8 w-8" />
              </button>
            </div>
          </div>

          <div className="lg:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </form>
          </div>
        </div>
      </header>
      <div className="w-full bg-rose-400 text-white py-1">
        <nav className="hidden lg:flex items-center justify-between text-sm font-medium text-white max-w-none sm:max-w-[90%] mx-auto px-4 py-2">
          <Link href="/" className="hover:text-neutral-200 transition-colors">
            Início
          </Link>
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
            href="/cestas-romanticas"
            className="hover:text-neutral-200 transition-colors"
          >
            Cestas Românticas
          </Link>
          <Link
            href="/itens-personalizados"
            className="hover:text-neutral-200 transition-colors"
          >
            Itens Personalizados
          </Link>
          <Link
            href="/cesto-express"
            className="hover:text-neutral-200 transition-colors"
          >
            Cesto Express
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/manage"
              className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Gerenciar
            </Link>
          )}
        </nav>
      </div>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
