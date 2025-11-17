"use client";

import Link from "next/link";

export default function ItensPersonalizadosPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Itens Personalizados</h1>
      <p>Placeholder page para Itens Personalizados.</p>
      <p className="mt-4">
        Voltar para <Link href="/">Início</Link>
      </p>
    </div>
  );
}
