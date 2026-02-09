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
  MapPin,
  Bell,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { Input } from "../ui/input";
import { useCartContext } from "../../hooks/cart-context";
import { useAuth } from "../../hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CartSheet } from "../cart-sheet";
import { useCartSheet } from "./app-wrapper";
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
  const { isOpen: isCartOpen, setIsOpen: setIsCartOpen } = useCartSheet();
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
    <div className="flex flex-col items-center w-full">
      {/* Top Info Bar - Hidden on Mobile */}
      <div className="hidden md:flex w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg overflow-hidden">
        <div className="flex w-full max-w-[90%] mx-auto text-sm py-2 justify-between items-center px-4">
          <span className="text-xs flex items-center gap-2 font-medium">
            <span className="bg-white/20 rounded-full w-2 h-2 animate-pulse"></span>
            Atendimento 24hrs no WhatsApp
          </span>
          <span className="text-xs font-medium opacity-90">Entregas em Campina Grande e Região</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
          {/* Mobile Header Layout (Image Style) */}
          <div className="flex flex-col md:hidden py-4 gap-4">
            <div className="flex items-center justify-between relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-900 bg-gray-50 rounded-full h-11 w-11 shadow-sm"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Link href="/" className="absolute left-1/2 -translate-x-1/2 w-[120px] h-10">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
              </Link>

              <button
                type="button"
                className="relative text-gray-900 bg-gray-50 p-3 rounded-full shadow-sm"
                onClick={handleOpenCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {isClient && cart.itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {cart.itemCount}
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="O que você procura hoje?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-6 bg-gray-50 border-none rounded-2xl text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-rose-200"
              />
            </form>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium px-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>Entregar em: <span className="text-gray-900">Campina Grande, PB</span></span>
            </div>
          </div>

          {/* Desktop Header Layout */}
          <div className="hidden md:flex h-20 items-center justify-between gap-8">
            <Link href="/" className="flex items-center flex-shrink-0 relative w-[140px] h-12">
              <Image src="/logo.png" alt="Logo" fill priority className="object-contain" />
            </Link>

            <div className="flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="O que você procura hoje?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-6 bg-gray-50 border-gray-100 rounded-2xl focus-visible:ring-rose-400 focus-visible:border-rose-400"
                />
              </form>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="bg-gray-50 p-2.5 rounded-full group-hover:bg-rose-50 transition-colors">
                  <User className="h-5 w-5 text-gray-600 group-hover:text-rose-500" />
                </div>
                <div className="text-left">
                  {user ? (
                    <button onClick={() => setIsDialogUserOpen(true)} className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Perfil</span>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600">{user.name.split(" ")[0]}</span>
                    </button>
                  ) : (
                    <Link href="/login" className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Acesse</span>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600">Entrar</span>
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="bg-gray-50 p-2.5 rounded-full group-hover:bg-rose-50 transition-colors">
                  <Package className="h-5 w-5 text-gray-600 group-hover:text-rose-500" />
                </div>
                <div className="text-left">
                    <Link href="/pedidos" className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Pedidos</span>
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-rose-600">Ver Todos</span>
                    </Link>
                </div>
              </div>

              <button
                onClick={handleOpenCart}
                className="flex items-center gap-3 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-2xl transition-all shadow-md active:scale-95"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {isClient && cart.itemCount > 0 && (
                    <span className="absolute -top-3 -right-3 h-5 w-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {cart.itemCount}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm">Carrinho</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sub-navigation */}
      <div className="hidden lg:block w-full bg-white border-b border-gray-100 py-3">
        <nav className="flex items-center justify-center gap-8 text-[13px] font-semibold text-gray-600 max-w-[90%] mx-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 hover:text-rose-500 transition-colors">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Floating Bottom Nav */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-[400px]">
        <nav className="bg-gray-900/95 backdrop-blur-lg border border-white/10 p-2 rounded-[28px] shadow-2xl flex items-center justify-between px-3">
          <Link href="/" className="p-3 bg-white/10 rounded-full text-white">
            <Home className="h-5 w-5" />
          </Link>
          <button className="p-3 text-gray-400 hover:text-white transition-colors" onClick={() => setIsMobileSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </button>
          <Link href="/pedidos" className="p-3 text-gray-400 hover:text-white transition-colors">
            <Package className="h-5 w-5" />
          </Link>
          <button 
            className="p-3 text-gray-400 hover:text-white transition-colors" 
            onClick={() => user ? setIsDialogUserOpen(true) : router.push("/login")}
          >
            <User className="h-5 w-5" />
          </button>
        </nav>
      </div>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="text-left font-bold text-xl">
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
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
