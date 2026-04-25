"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { usePathname } from "next/navigation";
import WhatsappToggle from "../whatsappToggle";

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

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

  const isCartPage = pathname === "/carrinho" || pathname.startsWith("/carrinho/");

  if (isCartPage) {
    return (
      <>
        {children}
        <div className="fixed bottom-6 right-6">
          <WhatsappToggle />
        </div>
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
