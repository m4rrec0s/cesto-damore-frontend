"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  Settings,
  MapPin,
  Home,
  Grid,
  Tag,
  Heart,
  Sparkles,
  Zap,
  Package,
  LogOut,
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
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

export function SiteHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogUserOpen, setIsDialogUserOpen] = useState(false);
  const { cart } = useCartContext();
  const { user, logout } = useAuth();
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
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    setIsDialogUserOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  };

  const menuItems = [
    { href: "/", label: "Início", icon: Home },
    { href: "/categorias", label: "Categorias", icon: Grid },
    { href: "/ofertas", label: "Ofertas", icon: Tag },
    { href: "/cestas-romanticas", label: "Cestas Românticas", icon: Heart },
    {
      href: "/itens-personalizados",
      label: "Itens Personalizados",
      icon: Sparkles,
    },
    { href: "/cesto-express", label: "Cesto Express", icon: Zap },
  ];

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
              {/* Busca Mobile - Apenas ícone */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:text-white hover:bg-rose-500"
                aria-label="Buscar"
                onClick={() => {
                  const input = document.getElementById(
                    "mobile-search-input"
                  ) as HTMLInputElement;
                  if (input) {
                    input.focus();
                  }
                }}
              >
                <Search className="h-6 w-6" />
              </Button>

              <div
                aria-label="Usuário"
                className="hidden md:flex items-center gap-3 cursor-pointer"
              >
                <User className="h-6 w-6" fill="#FFFFFF" />
                <div className="text-left">
                  {user ? (
                    <button
                      type="button"
                      onClick={() => setIsDialogUserOpen(true)}
                      className="flex flex-col items-start"
                    >
                      <span className="text-xs">Bem vindo de volta,</span>
                      <span className="font-semibold text-xs">{user.name}</span>
                    </button>
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
                  <MapPin className="h-6 w-6" fill="#FFFFFF" />
                  <span className="absolute top-1.5 right-2 h-2 w-2 bg-rose-400 text-white text-xs rounded-full flex items-center justify-center" />
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
                  <ShoppingCart className="h-6 w-6" fill="#FFFFFF" />
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

              <button
                type="button"
                className="lg:hidden text-white hover:bg-rose-500 p-1 rounded-md transition-colors"
                aria-label="Menu"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-8 w-8" />
              </button>
            </div>
          </div>

          {/* Busca Mobile - Abaixo do header principal */}
          <div className="lg:hidden pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="mobile-search-input"
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent placeholder:text-gray-500"
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

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-left text-rose-500 font-bold text-xl">
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* User Info */}
            <div className="p-6 border-b bg-rose-50">
              <div className="flex items-center gap-3">
                <div className="bg-rose-500 rounded-full p-3">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  {user ? (
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="text-rose-600 font-semibold hover:text-rose-700"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Entrar na conta
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto">
              <div className="py-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}

                {user && (
                  <Link
                    href="/pedidos"
                    className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-t mt-2 pt-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Meus Pedidos</span>
                  </Link>
                )}

                {user?.role === "admin" && (
                  <Link
                    href="/manage"
                    className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Gerenciar</span>
                  </Link>
                )}
              </div>
            </nav>

            {/* Logout Button */}
            {user && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsDialogUserOpen(true);
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Sair da conta
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isDialogUserOpen} onOpenChange={setIsDialogUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deseja sair da sua conta?</DialogTitle>
            <DialogDescription>
              Você será redirecionado para a página inicial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              className="ml-2 bg-red-600 hover:bg-red-700"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
