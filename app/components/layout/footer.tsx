import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-rose-300 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="h-24 w-[250px] relative">
          <Image
            src="/logo.png"
            alt="Cesto d'Amore Logo"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="text-sm text-center">
          Pagamento seguro via <strong>Mercado Pago</strong> - Aceitando pix e{" "}
          <strong>cartão</strong>
        </div>
        <div className="text-xs">
          © 2024 Cesto d&apos;Amore. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
