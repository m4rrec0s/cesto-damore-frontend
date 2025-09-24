import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-rose-300 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Cesto d'Amore Logo"
            width={40}
            height={40}
          />
          <span className="text-lg font-bold">Cesto d&apos;Amore</span>
        </div>
        <div className="text-sm text-center">
          Pagamento seguro via <strong>Mercado Pago</strong> - Aceitando pix e
          <strong>cartão</strong>
        </div>
        <div className="text-xs">
          © 2024 Cesto d&apos;Amore. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
