"use client";

import { motion } from "framer-motion";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { PartyPopper, Calendar, Clock } from "lucide-react";
import type { Order } from "@/app/hooks/use-api";

interface OrderConfirmationTicketProps {
  order: Order | null;
  onTrackOrder: () => void;
}

export function OrderConfirmationTicket({
  order,
  onTrackOrder,
}: OrderConfirmationTicketProps) {
  const formattedDate = order?.delivery_date
    ? new Date(order.delivery_date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const formattedTime = order?.delivery_date
    ? new Date(order.delivery_date).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto px-4 py-8"
    >
      <div className="relative">
        
        <Card className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border-0 relative">
          
          <div className="p-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6"
            >
              <PartyPopper className="w-8 h-8 text-green-600" />
            </motion.div>

            <h1 className="text-3xl font-bold text-gray-900">Obrigado!</h1>
            <p className="text-gray-500 text-sm">
              Seu pedido foi confirmado com sucesso
            </p>
          </div>

          
          <div className="relative h-px w-full my-2">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full border-t-2 border-dashed border-gray-200" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
          </div>

          
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  ID do Pedido
                </p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  #{order?.id?.slice(0, 8).toUpperCase() || "N/A"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Valor Total
                </p>
                <p className="text-lg font-bold text-gray-900">
                  R$ {(order?.total || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Data
                </p>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formattedDate}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Horário
                </p>
                <div className="flex items-center justify-end gap-2 text-gray-700 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formattedTime}
                </div>
              </div>
            </div>

            
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-500 opacity-80" />
                <div className="w-8 h-8 rounded-full bg-green-500 opacity-80" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  {order?.payment_method === "pix"
                    ? "Pagamento via PIX"
                    : "Cartão de Crédito"}
                </p>
              </div>
            </div>

            
            <div className="space-y-2">
              <div className="h-12 w-full flex items-end justify-between gap-[2px] opacity-60">
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 w-full"
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
              <p className="text-center text-[10px] text-gray-400 font-mono tracking-[0.2em]">
                {order?.id || "000000000000"}
              </p>
            </div>
          </div>

          
          <div className="p-8 pt-0">
            <Button
              onClick={onTrackOrder}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-xl font-bold text-base shadow-lg transition-all"
            >
              Acompanhar Pedido
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
