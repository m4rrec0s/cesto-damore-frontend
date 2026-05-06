"use client";

import { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface ProductGridProps {
  children: ReactNode;
  className?: string;
}

export function ProductGridWrapper({ children, className }: ProductGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ProductGridItemProps {
  children: ReactNode;
  className?: string;
}

export function ProductGridItem({ children, className }: ProductGridItemProps) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

export function MasonryGridWrapper({
  children,
  className,
}: MasonryGridProps) {
  return (
    <div className={cn("columns-2 gap-3", className)}>
      {children}
    </div>
  );
}

interface MasonryGridItemProps {
  children: ReactNode;
  className?: string;
}

export function MasonryGridItem({ children, className }: MasonryGridItemProps) {
  return (
    <div className={cn("mb-3 break-inside-avoid", className)}>
      {children}
    </div>
  );
}
