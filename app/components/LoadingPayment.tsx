"use client";

import { motion } from "framer-motion";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { Card } from "@/app/components/ui/card";

interface LoadingPaymentProps {
  paymentMethod?: "pix" | "card";
}

export function LoadingPayment({ paymentMethod }: LoadingPaymentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="bg-gradient-to-br from-white via-rose-50/30 to-orange-50/30 p-10 rounded-3xl shadow-xl border-2 border-rose-100/50 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Ícone animado */}
          <motion.div
            className="relative"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-orange-400 rounded-full blur-xl opacity-50" />
            <div className="relative bg-gradient-to-br from-rose-500 to-orange-500 p-6 rounded-full shadow-2xl">
              {paymentMethod === "pix" ? (
                <Smartphone className="h-10 w-10 text-white" strokeWidth={2} />
              ) : (
                <CreditCard className="h-10 w-10 text-white" strokeWidth={2} />
              )}
            </div>
          </motion.div>

          {/* Texto */}
          <div className="text-center space-y-3">
            <motion.h3
              className="text-2xl font-bold bg-gradient-to-r from-rose-700 to-orange-600 bg-clip-text text-transparent"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              {paymentMethod === "pix"
                ? "Gerando QR Code PIX..."
                : "Processando Pagamento..."}
            </motion.h3>
            <p className="text-sm text-rose-700/80 font-medium">
              {paymentMethod === "pix"
                ? "Aguarde enquanto geramos seu código de pagamento"
                : "Validando os dados do seu cartão com segurança"}
            </p>
          </div>

          {/* Barra de progresso animada */}
          <div className="w-full max-w-xs">
            <div className="h-2 bg-rose-100 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 rounded-full"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                style={{ width: "50%" }}
              />
            </div>
          </div>

          {/* Pontos animados */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
