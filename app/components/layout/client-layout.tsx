"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { usePathname } from "next/navigation";
import WhatsappToggle from "../whatsappToggle";
import { ChevronLeft } from "lucide-react";
import { useCartContext } from "@/app/hooks/cart-context";
import Link from "next/link";

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { cart } = useCartContext();
  const cartItemCount = cart?.itemCount || 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Evita mismatch de hidratação quando o pathname inicial diverge entre SSR e cliente.
  if (!isMounted) {
    return <>{children}</>;
  }

  const isDashboardPage =
    pathname === "/manage" ||
    pathname === "/login" ||
    pathname.startsWith("/manage/");

  if (isDashboardPage) {
    return <>{children}</>;
  }

  const isCartPage =
    pathname === "/carrinho" || pathname.startsWith("/carrinho/");

  if (isCartPage) {
    return (
      <>
        <main className="min-h-screen">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white px-4 py-3">
            <div>
              <Link
                href="/"
                className="flex items-center text-sm text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <h2 className="text-lg font-bold">Carrinho ({cartItemCount})</h2>
            <div className="opacity-0"></div>
          </header>
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
      <div className="fixed bottom-6 right-6">
        <WhatsappToggle />
      </div>
      <SiteFooter />
    </>
  );
};

export default ClientLayout;
