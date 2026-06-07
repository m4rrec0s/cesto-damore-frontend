"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { CheckCircle2, ChevronLeft, FileDown, X } from "lucide-react";
import { getPublicAssetUrl } from "@/lib/image-helper";

interface CustomizationItemProps {
  id: string;
  name: string;
  imageUrl?: string;
  requiredCount: number;
  totalCount: number;
  hasCustomizations: boolean;
  hasMissingRequired: boolean;
  imagesCount?: { current: number; max: number };
  previewItems?: Array<{ label: string; previews: string[] }>;
  pdfUrl?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthCheck: () => boolean;
  children: React.ReactNode;
}

export function CustomizationItem({
  id,
  name,
  imageUrl,
  requiredCount,
  totalCount,
  hasCustomizations,
  hasMissingRequired,
  imagesCount,
  previewItems = [],
  pdfUrl,
  isOpen,
  onOpenChange,
  onAuthCheck,
  children,
}: CustomizationItemProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sincronizar: se parent fecha (isOpen=false), fechar drawer
  useEffect(() => {
    if (!isOpen && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [isOpen]);

  const handleMobileOpen = () => {
    if (!onAuthCheck()) return;
    setDrawerOpen(true);
    onOpenChange(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) onOpenChange(false);
  };

  const triggerContent = (
    <div className="flex w-full items-center justify-between gap-3 py-3 px-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 relative overflow-hidden flex-shrink-0">
          <img
            src={imageUrl || getPublicAssetUrl("placeholder-v2.png")}
            alt={name}
            className="absolute inset-0 rounded-lg h-full w-full object-cover object-center bg-white"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="text-left min-w-0">
          <p className="font-medium text-sm">
            {name}
            {requiredCount > 0 && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-gray-500">
            {totalCount} {totalCount > 1 ? "opções" : "opção"}
            {imagesCount && (
              <span className="ml-2 text-blue-600">
                {imagesCount.current}/{imagesCount.max} fotos
              </span>
            )}
          </p>
          {previewItems.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {previewItems.map((item, idx) => (
                <div key={idx}>
                  <p className="text-[11px] text-gray-700 truncate">
                    {item.label}
                  </p>
                  {item.previews.length > 0 && (
                    <div className="mt-1 flex gap-1.5">
                      {item.previews.slice(0, 3).map((url, pi) => (
                        <img
                          key={pi}
                          src={url}
                          alt=""
                          className="h-8 w-8 rounded border border-gray-200 object-contain bg-white p-0.5"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pdfUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (pdfUrl.startsWith("data:")) {
                      // Convert data URL to blob URL to avoid browser blocking
                      fetch(pdfUrl).then(r => r.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                      });
                    } else {
                      window.open(pdfUrl, "_blank");
                    }
                  }}
                  className="inline-flex items-center gap-1 mt-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                >
                  <FileDown className="h-3 w-3" />
                  Ver PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasCustomizations && (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        )}
        <ChevronLeft
          className={cn(
            "w-5 h-5 transition-transform",
            isOpen ? "-rotate-90" : "rotate-180",
          )}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: Collapsible */}
      <Collapsible
        open={isOpen}
        onOpenChange={(open) => {
          if (open && !onAuthCheck()) return;
          onOpenChange(open);
        }}
        className="hidden md:block rounded-xl border border-gray-200 bg-white"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between h-auto rounded-xl p-0",
              hasMissingRequired &&
                "border border-red-400 text-red-950 hover:border-red-500",
            )}
          >
            {triggerContent}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          {!isMobile && children}
        </CollapsibleContent>
      </Collapsible>

      {/* Mobile: Drawer */}
      <div className="md:hidden">
        <button
          onClick={handleMobileOpen}
          className={cn(
            "w-full rounded-xl border border-gray-200 bg-white text-left",
            hasMissingRequired && "border-red-400",
          )}
        >
          {triggerContent}
        </button>

        <Drawer open={drawerOpen} onOpenChange={handleDrawerClose}>
          <DrawerContent className="max-h-[92vh] flex flex-col px-3">
            <DrawerHeader className="border-b border-gray-100 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle className="text-sm font-semibold text-gray-900">
                    {name}
                  </DrawerTitle>
                  {requiredCount > 0 && (
                    <p className="text-[11px] text-rose-500 mt-0.5">
                      Obrigatório
                    </p>
                  )}
                </div>
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 text-gray-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto">
              {isMobile && children}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
