"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Menu,
  Settings,
  Home,
  Tag,
  Heart,
  Sparkles,
  Package,
  LogOut,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { getPublicAssetUrl } from "@/lib/image-helper";
import { Input } from "../ui/input";
import { useCartContext } from "../../hooks/cart-context";
import { useAuth } from "../../hooks/use-auth";
import { useApi } from "../../hooks/use-api";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLoginPrompt } from "./app-wrapper";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogUserOpen, setIsDialogUserOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { cart } = useCartContext();
  const { user, logout, loginWithGoogle, login } = useAuth();
  const api = useApi();
  const { openPrompt } = useLoginPrompt();
  const router = useRouter();
  const pathname = usePathname();
  const isProductPage = pathname.startsWith("/produto/");
  const headerTextClass = isProductPage ? "text-[#5b0618]" : "text-white";

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenCart = () => {
    router.push("/carrinho/rapido");
  };

  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    setIsDialogUserOpen(false);
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  };

  const handleHeaderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!email || !password) {
      setLoginError("Preencha email e senha.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.login({ email, password });
      login(response.user, response.appToken, "email");
      setIsUserDropdownOpen(false);
      setPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Não foi possível entrar.";
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleHeaderGoogleLogin = async () => {
    setLoginError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      setIsUserDropdownOpen(false);
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error
          ? err.message
          : "Não foi possível entrar com Google.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const menuItems = [
    { href: "/", label: "Início", icon: Home },
    { href: "/cestas-romanticas", label: "Cestas", icon: Heart },
    { href: "/itens-personalizados", label: "Personalizados", icon: Sparkles },
    { href: "/ofertas", label: "Ofertas", icon: Tag },
  ];

  return (
    <div className="flex w-full flex-col items-center overflow-x-clip">
      <div className={`flex w-full overflow-hidden border-b ${isProductPage ? "border-rose-100 bg-[#fffaf8] text-[#5b0618]" : "border-white/10 bg-[#5b0618] text-white/95"}`}>
        <div className="flex w-full max-w-[90%] mx-auto text-sm py-2 justify-between items-center px-4">
          <span className="text-xs flex items-center gap-2 font-medium">
            <span className="bg-white/20 rounded-full w-2 h-2 animate-pulse"></span>
            Atendimento no WhatsApp
          </span>
          <span className="text-xs font-medium opacity-90">
            Entregas em Campina Grande e Região
          </span>
        </div>
      </div>

      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-md ${isProductPage ? "border-rose-100 bg-[#fffaf8]/95 text-[#5b0618] shadow-[0_8px_20px_rgba(91,6,24,0.08)]" : "border-white/10 bg-[#5b0618] text-white shadow-[0_10px_24px_rgba(43,0,12,0.24)]"}`}>
        <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
          <div className="flex flex-col gap-3 py-3 xl:hidden">
            <div className="flex items-center justify-between relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-900 bg-rose-50 rounded-full h-11 w-11 shadow-sm"
                aria-label="Abrir menu"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Link
                href="/"
                className="absolute left-1/2 -translate-x-1/2 w-[120px] h-10"
              >
                <Image
                  src={getPublicAssetUrl("logo.png")}
                  alt="Logo"
                  fill
                  className={`object-contain ${isProductPage ? "" : "invert"}`}
                  priority
                />
              </Link>

              <button
                type="button"
                className="relative text-gray-900 bg-rose-50 p-3 rounded-full shadow-sm"
                aria-label="Abrir carrinho"
                onClick={handleOpenCart}
                data-cart-button="true"
              >
                <ShoppingCart className="h-5 w-5" />
                {isClient && cart.itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {cart.itemCount}
                  </span>
                )}
              </button>
            </div>

            {pathname !== "/" && pathname !== "/busca" && <form onSubmit={handleSearch} className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-rose-100">
                <img src="/ana-idle.png" alt="" className="h-6 w-6 object-contain" />
              </span>
              <Input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Pergunte à Ana o presente ideal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-rose-100 bg-rose-50/50 py-5 pl-12 pr-4 text-sm placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-rose-300"
              />
            </form>}
          </div>

          <div className="hidden h-20 min-w-0 items-center justify-between gap-4 xl:flex">
            <Link
              href="/"
              className="flex items-center flex-shrink-0 relative w-[140px] h-12"
            >
              <Image
                src={getPublicAssetUrl("logo.png")}
                alt="Logo"
                fill
                priority
                className={`object-contain ${isProductPage ? "" : "invert"}`}
              />
            </Link>

            <nav className={`flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap text-[11px] font-semibold ${isProductPage ? "text-[#5b0618]/85" : "text-white/90"}`}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 transition-colors hover:text-rose-200"
                  >
                    <Icon className="hidden h-3.5 w-3.5 2xl:block" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu
                open={isUserDropdownOpen}
                onOpenChange={setIsUserDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button className={`group flex h-12 cursor-pointer items-center gap-2.5 ${headerTextClass}`}>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left leading-tight">
                      {user ? (
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-[10px] text-rose-200 font-medium uppercase tracking-wider">
                            Perfil
                          </span>
                          <span className={`text-sm font-semibold group-hover:text-rose-500 ${headerTextClass}`}>
                            {user.name.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-[10px] text-rose-200 font-medium uppercase tracking-wider">
                            Acesse
                          </span>
                          <span className={`text-sm font-semibold group-hover:text-rose-500 ${headerTextClass}`}>
                            Entrar
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-80 p-3">
                  {user ? (
                    <>
                      <DropdownMenuLabel className="px-1">
                        {user.name}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/pedidos" className="cursor-pointer">
                          <Package className="h-4 w-4" />
                          Meus pedidos
                        </Link>
                      </DropdownMenuItem>
                      {user.role === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/manage" className="cursor-pointer">
                            <Settings className="h-4 w-4" />
                            Gerenciar
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-700"
                        onClick={() => setIsDialogUserOpen(true)}
                      >
                        <LogOut className="h-4 w-4" />
                        Sair da conta
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="px-1">
                        <p className="font-semibold text-sm text-gray-900">
                          Faça login
                        </p>
                        <p className="text-xs text-gray-500">
                          Personalize e finalize pedidos sem sair da página.
                        </p>
                      </div>

                      {loginError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                          {loginError}
                        </div>
                      )}

                      <form onSubmit={handleHeaderLogin} className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoggingIn || isGoogleLoading}
                        />
                        <Input
                          type="password"
                          placeholder="Senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoggingIn || isGoogleLoading}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoggingIn || isGoogleLoading}
                        >
                          {isLoggingIn ? "Entrando..." : "Entrar"}
                        </Button>
                      </form>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleHeaderGoogleLogin}
                        disabled={isLoggingIn || isGoogleLoading}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        {isGoogleLoading
                          ? "Conectando..."
                          : "Entrar com Google"}
                      </Button>

                      <Link
                        href="/login"
                        className="block text-center text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Criar nova conta
                      </Link>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex h-12 items-center gap-2.5 cursor-pointer group">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
                  <Package className={`h-5 w-5 ${headerTextClass}`} />
                </div>
                <div className="text-left leading-tight">
                  <Link
                    href="/pedidos"
                    className="flex flex-col items-start leading-none"
                  >
                    <span className="text-[10px] text-rose-200 font-medium uppercase tracking-wider">
                      Pedidos
                    </span>
                    <span className={`text-sm font-semibold group-hover:text-rose-500 ${headerTextClass}`}>
                      Ver Todos
                    </span>
                  </Link>
                </div>
              </div>

              <button
                onClick={handleOpenCart}
                className="flex h-12 items-center gap-2.5 rounded-xl bg-white px-4 text-[#580617] shadow-md transition-all hover:bg-rose-50 active:scale-95"
                data-cart-button="true"
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
                    <button
                      type="button"
                      className="text-rose-600 font-semibold hover:text-rose-700"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openPrompt({ force: true });
                      }}
                    >
                      Entrar na conta
                    </button>
                  )}
                </div>
              </div>
            </div>

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
