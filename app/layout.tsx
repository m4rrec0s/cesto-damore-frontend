import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./animations.css";
import { AuthProvider } from "./hooks/use-auth";
import ClientLayout from "./components/layout/client-layout";
import { Toaster } from "./components/ui/sonner";
import AppWrapper from "./components/layout/app-wrapper";
import Script from "next/script";

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
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head></head>
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
