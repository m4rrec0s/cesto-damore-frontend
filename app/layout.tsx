import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "./hooks/use-auth";
import { CartProvider } from "./hooks/cart-context";
import ClientLayout from "./components/layout/client-layout";
import TokenMonitor from "./components/auth/token-monitor";
import TokenExpiryWarning from "./components/auth/token-expiry-warning";
import AuthStatusDebug from "./components/auth/auth-status-debug";
import { Toaster } from "./components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cesto d'Amore - Cestas de Presente em Campina Grande",
  description:
    "As melhores cestas de presente de Campina Grande e região! Feito com amor para você presentear quem você ama.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <Script
          src="https://sdk.mercadopago.com/js/v2"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <CartProvider>
            <TokenExpiryWarning />
            <AuthStatusDebug />
            <TokenMonitor>
              <ClientLayout>{children}</ClientLayout>
            </TokenMonitor>
          </CartProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
