"use client";

import {
  Box,
  ClipboardList,
  Grid3X3,
  PackageCheckIcon,
  Tag,
  LayoutDashboard,
  Menu,
  X,
  BotMessageSquareIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import Image from "next/image";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/manage" || path === "/manage/") {
      return pathname === "/manage" || pathname === "/manage/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  const tabs = [
    { name: "Dashboard", href: "/manage", icon: LayoutDashboard },
    { name: "Pedidos", href: "/manage/orders", icon: ClipboardList },
    { name: "Catálogo", href: "/manage/catalog", icon: Box },
    { name: "Categorias", href: "/manage/categories", icon: Tag },
    { name: "Tipos", href: "/manage/types", icon: Grid3X3 },
    { name: "Feed", href: "/manage/feed", icon: PackageCheckIcon },
    {
      name: "Atendimento",
      href: "/manage/service",
      icon: BotMessageSquareIcon,
    },
  ];

  return (
    <div className="h-screen w-full flex bg-gray-50">
      <aside
        className={`w-64 bg-white shadow-lg fixed h-full md:relative md:translate-x-0 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:block z-30 overflow-y-auto`}
      >
        <Link
          href="/"
          className="flex flex-col items-center p-6 border-b border-rose-200 bg-white/50"
        >
          <Image
            src="/logo.png"
            alt="Cesto D'Amore Logo"
            width={120}
            height={120}
            className="mb-3"
            style={{ filter: "invert(1)" }}
          />
          <h2 className="text-lg font-bold text-rose-900">Painel Admin</h2>
        </Link>

        <nav className="p-4">
          <ul className="space-y-2 overflow-y-auto h-[calc(100vh-200px)] w-full overflow-x-hidden scrollbar-hide">
            {tabs.map((tab) => (
              <li key={tab.name}>
                <Link
                  href={tab.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(tab.href)
                      ? "bg-rose-600 text-white shadow-md scale-105"
                      : "text-rose-900 hover:bg-rose-200 hover:text-rose-950"
                  }`}
                >
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{tab.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-rose-200 bg-white/50">
          <p className="text-xs text-center text-rose-700">
            © 2025 Cesto D&apos;Amore
          </p>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <main className="flex-1 overflow-auto">
        <div className="md:hidden bg-white border-b border-gray-200 p-4 shadow-sm sticky top-0 z-10">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            variant="outline"
            size="icon"
            className="text-rose-700 hover:bg-rose-50"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <div className="p-4 md:p-0">
          <header className="w-full bg-white border-b shadow-sm py-4 px-3 mb-4">
            <h2 className="text-2xl font-bold">
              {tabs.find((tab) => isActive(tab.href))?.name}
            </h2>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
