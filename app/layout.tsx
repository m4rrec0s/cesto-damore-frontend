import type { Metadata } from "next";
import "./globals.css";
import "./animations.css";
import { AuthProvider } from "./hooks/use-auth";
import ClientLayout from "./components/layout/client-layout";
import { Toaster } from "./components/ui/sonner";
import AppWrapper from "./components/layout/app-wrapper";
import { CookieBanner } from "./components/layout/cookie-banner";
import { installApiKeyFetchInterceptor } from "./lib/api-key-fetch";

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
        <AuthProvider>
          <AppWrapper>
            <ClientLayout>{children}</ClientLayout>
            <CookieBanner />
          </AppWrapper>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
