"use client";

import React, { ReactNode } from "react";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { usePathname } from "next/navigation";

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  const isDashboardPage =
    pathname === "/manage" ||
    pathname === "/pedidos" ||
    pathname === "/carrinho";

  if (isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
      <SiteFooter />
    </>
  );
};

export default ClientLayout;
