"use client";

import { motion } from "framer-motion";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  CheckCircle2,
  User,
  Smartphone,
  MapPin,
  ArrowRight,
  Calendar,
  Package,
} from "lucide-react";
import type { Order } from "@/app/hooks/use-api";

interface OrderConfirmationTicketProps {
  order: Order | null;
  onTrackOrder: () => void;
}

export function OrderConfirmationTicket({
  order,
  onTrackOrder,
}: OrderConfirmationTicketProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto px-4"
    >
      {/* Animação de confete/celebração */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="flex justify-center mb-8"
      >
        <div className="relative">
          {/* Círculos decorativos ao fundo */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl opacity-30"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          
          <div className="relative w-28 h-28 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <CheckCircle2
                className="w-16 h-16 text-white drop-shadow-lg"
                strokeWidth={2.5}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Título de sucesso */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
          Pedido Confirmado!
        </h1>
        <p className="text-gray-600 text-lg">
          Obrigado pela sua compra 🎉
        </p>
      </motion.div>

      {/* Card do Ticket */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-2xl">
          {/* Cabeçalho do Ticket */}
          <div className="relative bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-8 py-10 text-white">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 left-4 w-20 h-20 border-2 border-white rounded-full" />
              <div className="absolute bottom-4 right-4 w-32 h-32 border-2 border-white rounded-full" />
            </div>
            
            <div className="relative text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Package className="w-12 h-12 mx-auto mb-4 drop-shadow-lg" />
                <p className="text-sm uppercase tracking-widest opacity-90 mb-2">
                  Número do Pedido
                </p>
                <p className="text-3xl font-bold font-mono tracking-wider">
                  #{order?.id?.toUpperCase().slice(0, 8) || "N/A"}
                </p>
              </motion.div>
            </div>

            {/* Decoração de borda ondulada */}
            <div className="absolute -bottom-1 left-0 right-0 h-4 bg-white">
              <svg
                className="absolute top-0 w-full h-4"
                viewBox="0 0 1200 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,0 Q30,12 60,0 T120,0 T180,0 T240,0 T300,0 T360,0 T420,0 T480,0 T540,0 T600,0 T660,0 T720,0 T780,0 T840,0 T900,0 T960,0 T1020,0 T1080,0 T1140,0 T1200,0 L1200,12 L0,12 Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          {/* Conteúdo do Ticket */}
          <div className="px-8 py-8 space-y-6">
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center"
            >
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-6 py-2 text-sm font-semibold shadow-lg">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Pagamento Aprovado
              </Badge>
            </motion.div>

            {/* Informações do Cliente */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 border border-gray-200"
            >
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                Detalhes da Entrega
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Cliente</p>
                    <p className="font-semibold text-gray-900">
                      {order?.user?.name || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Contato</p>
                    <p className="font-semibold text-gray-900">
                      {order?.recipient_phone || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Endereço</p>
                    <p className="font-semibold text-gray-900 text-sm leading-relaxed">
                      {order?.delivery_address || "N/A"}
                    </p>
                  </div>
                </div>

                {order?.delivery_date && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Data de Entrega</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(order.delivery_date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Resumo Financeiro */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-3 border-t-2 border-dashed border-gray-200 pt-6"
            >
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                Resumo do Pedido
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    R$ {((order?.total || 0) - (order?.shipping_price || 0)).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa de Entrega</span>
                  <span className="font-medium text-gray-900">
                    {order?.shipping_price === 0
                      ? "GRÁTIS"
                      : `R$ ${(order?.shipping_price || 0).toFixed(2)}`}
                  </span>
                </div>

                {order?.discount && order?.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Desconto</span>
                    <span className="text-green-600 font-semibold">
                      - R$ {order.discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t-2 border-gray-200 pt-3 mt-3">
                  <span className="font-bold text-gray-900 text-lg">Total Pago</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                    R$ {(order?.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Mensagem de acompanhamento */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 text-center border border-blue-200"
            >
              <p className="text-sm text-blue-800 font-medium">
                ✨ Seu pedido está sendo preparado com carinho!
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Você receberá atualizações sobre o status da entrega
              </p>
            </motion.div>
          </div>

          {/* Botão de ação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="px-8 pb-8"
          >
            <Button
              onClick={onTrackOrder}
              className="w-full bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-700 hover:via-rose-600 hover:to-orange-600 text-white py-6 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Acompanhar Meu Pedido
            </Button>
          </motion.div>
        </Card>
      </motion.div>

      {/* Mensagem adicional */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center text-sm text-gray-500 mt-6"
      >
        Um e-mail de confirmação foi enviado para você
      </motion.p>
    </motion.div>
  );
}
