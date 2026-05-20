import type { Metadata } from "next";
import "./globals.css";
import "./animations.css";
import { AuthProvider } from "./hooks/use-auth";
import ClientLayout from "./components/layout/client-layout";
import { Toaster } from "./components/ui/sonner";
import AppWrapper from "./components/layout/app-wrapper";
import { CookieBanner } from "./components/layout/cookie-banner";
import { installApiKeyFetchInterceptor } from "./lib/api-key-fetch";

const MAINTENANCE_MODE_ENABLED =
  process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

installApiKeyFetchInterceptor();

export const metadata: Metadata = {
  title: "Cesto d'Amore | Cestas e Presentes Personalizados em Campina Grande",
  description:
    "Transforme momentos em memórias inesquecíveis. As mais sofisticadas cestas de café da manhã e presentes personalizados em Campina Grande/PB. Do mimo delicado ao luxo exclusivo, entregamos amor em cada detalhe. Peça agora!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiOrigin =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
    "https://api.cestodamore.com.br";

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head>
        <link rel="dns-prefetch" href={apiOrigin} />
        <link rel="preconnect" href={apiOrigin} crossOrigin="" />
        <link rel="dns-prefetch" href="https://drive.google.com" />
        <link rel="preconnect" href="https://drive.google.com" crossOrigin="" />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">
        {MAINTENANCE_MODE_ENABLED ? (
          <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
            <section className="w-full max-w-2xl rounded-2xl border border-white/15 bg-white/5 p-8 text-center">
              <p className="text-sm tracking-[0.2em] uppercase text-rose-300 mb-4">
                Cesto d&apos;Amore
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold mb-4">
                Estamos em manutenção
              </h1>
              <p className="text-white/80 leading-relaxed">
                Nosso site está temporariamente indisponível para melhorias.
                Voltaremos em breve. Obrigado pela compreensão.
              </p>
            </section>
          </main>
        ) : (
          <>
            <AuthProvider>
              <AppWrapper>
                <ClientLayout>{children}</ClientLayout>
                <CookieBanner />
              </AppWrapper>
            </AuthProvider>
            <Toaster position="top-center" richColors />
          </>
        )}
      </body>
    </html>
  );
}
