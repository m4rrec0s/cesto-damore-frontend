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
  title: "Cesto d'Amore",
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
