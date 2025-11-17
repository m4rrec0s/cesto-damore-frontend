"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  Settings,
  Home,
  Grid,
  Tag,
  Heart,
  Sparkles,
  Zap,
  Package,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { Input } from "../ui/input";
import { useCartContext } from "../../hooks/cart-context";
import { useAuth } from "../../hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CartSheet } from "../cart-sheet";
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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

  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsMobileMenuOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  const handleLogout = () => {
    setIsDialogUserOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  };

  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isMobileSearchOpen]);

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
    <div className="flex flex-col items-center bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg">
      <div className="flex w-full max-w-none sm:max-w-[90%] text-sm py-2 justify-between items-center px-4">
        <span className="text-xs flex items-center gap-2">
          <span className="bg-white/20 rounded-full w-2 h-2 animate-pulse"></span>
          Atendimento 24hrs no WhatsApp
        </span>
        <span className="text-xs">Entregas nos horários comerciais</span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-md">
        <div className="mx-auto max-w-none sm:max-w-[90%] px-3 sm:px-4">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center flex-shrink-0 py-2 w-[100px] sm:w-[140px] relative h-10 sm:h-12"
            >
              <Image
                src="/logo.png"
                alt="Cesto d'Amore"
                fill
                priority
                className="object-contain"
              />
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden lg:flex items-center flex-1 max-w-2xl mx-4">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-400" />
                <Input
                  type="text"
                  placeholder="O que você procura hoje?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 text-gray-900 border-2 border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all hover:border-rose-200"
                />
              </form>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              {/* User Account */}
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="bg-rose-50 p-2 rounded-full group-hover:bg-rose-100 transition-colors">
                  <User className="h-5 w-5 text-rose-500" />
                </div>
                <div className="text-left">
                  {user ? (
                    <button
                      type="button"
                      onClick={() => setIsDialogUserOpen(true)}
                      className="flex flex-col items-start"
                    >
                      <span className="text-xs text-gray-500">Olá,</span>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600 transition-colors">
                        {user.name.split(" ")[0]}
                      </span>
                    </button>
                  ) : (
                    <Link href="/login" className="flex flex-col items-start">
                      <span className="text-xs text-gray-500">Entrar</span>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600 transition-colors">
                        Minha Conta
                      </span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Orders */}
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="bg-rose-50 p-2 rounded-full group-hover:bg-rose-100 transition-colors">
                  <Package className="h-5 w-5 text-rose-500" />
                </div>
                <div className="text-left">
                  <Link href="/pedidos" className="flex flex-col items-start">
                    <span className="text-xs text-gray-500">Meus</span>
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600 transition-colors">
                      Pedidos
                    </span>
                  </Link>
                </div>
              </div>

              {/* Cart */}
              <button
                type="button"
                aria-label="Carrinho"
                className="flex items-center gap-3 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-full transition-all shadow-md hover:shadow-lg"
                onClick={handleOpenCart}
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {isClient && cart.itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-white text-rose-600 text-xs font-bold rounded-full flex items-center justify-center">
                      {cart.itemCount}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm">Carrinho</span>
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1 sm:gap-2">
              {/* Mobile Search Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:text-rose-500 hover:bg-rose-50 h-10 w-10 rounded-full"
                aria-label="Buscar"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              >
                {isMobileSearchOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>

              {/* Mobile Cart */}
              <button
                type="button"
                aria-label="Carrinho"
                className="relative text-gray-700 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors"
                onClick={handleOpenCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {isClient && cart.itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cart.itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:text-rose-500 hover:bg-rose-50 h-10 w-10 rounded-full"
                aria-label="Menu"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {isMobileSearchOpen && (
            <div className="pb-4 lg:hidden">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                <Input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 text-gray-900 border-2 border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Navigation */}
      <div className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-3 shadow-inner">
        <nav className="hidden lg:flex items-center justify-center gap-8 text-sm font-medium max-w-none sm:max-w-[90%] mx-auto px-4">
          <Link
            href="/"
            className="hover:text-rose-100 transition-colors flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Início
          </Link>
          <Link
            href="/categorias"
            className="hover:text-rose-100 transition-colors flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Categorias
          </Link>
          <Link
            href="/ofertas"
            className="hover:text-rose-100 transition-colors flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full"
          >
            <Tag className="h-4 w-4" />
            Ofertas
          </Link>
          <Link
            href="/cestas-romanticas"
            className="hover:text-rose-100 transition-colors flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Cestas Românticas
          </Link>
          <Link
            href="/buques-de-flores"
            className="hover:text-rose-100 transition-colors"
          >
            Buquês de Flores
          </Link>
          <Link
            href="/cesto-express"
            className="hover:text-rose-100 transition-colors flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Cesto Express
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/manage"
              className="flex items-center gap-2 hover:text-rose-100 transition-colors bg-white/10 px-4 py-2 rounded-full"
            >
              <Settings className="h-4 w-4" />
              Gerenciar
            </Link>
          )}
        </nav>
      </div>

      {/* Cart Sheet */}
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-rose-500 to-rose-600">
            <SheetTitle className="text-left text-white font-bold text-xl">
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* User Info */}
            <div className="p-6 border-b bg-gradient-to-br from-rose-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-full p-3 shadow-md">
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
                      className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-l-4 border-transparent hover:border-rose-500"
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
                    className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-t mt-2 pt-4 border-l-4 border-transparent hover:border-rose-500"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Meus Pedidos</span>
                  </Link>
                )}

                {user?.role === "admin" && (
                  <Link
                    href="/manage"
                    className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-l-4 border-transparent hover:border-rose-500"
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
              <div className="p-4 border-t bg-gray-50">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
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
