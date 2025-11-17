"use client";

import Link from "next/link";

export default function CestoExpressPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Cesto Express</h1>
      <p>Placeholder page para Cesto Express.</p>
      <p className="mt-4">
        Voltar para <Link href="/">Início</Link>
      </p>
    </div>
  );
}
