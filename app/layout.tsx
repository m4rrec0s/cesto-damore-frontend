import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./animations.css";
import { AuthProvider } from "./hooks/use-auth";
import ClientLayout from "./components/layout/client-layout";
import { Toaster } from "./components/ui/sonner";
import AppWrapper from "./components/layout/app-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <AuthProvider>
          <AppWrapper>
            <ClientLayout>{children}</ClientLayout>
          </AppWrapper>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
