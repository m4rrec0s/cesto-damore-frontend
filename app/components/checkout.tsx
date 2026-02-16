"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { useCart } from "@/app/hooks/use-cart";
import { Loader2, CreditCard, X } from "lucide-react";

declare global {
  interface Window {
    MercadoPago: {
      new (key: string): MercadoPagoInstance;
      checkout: (config: MercadoPagoConfig) => void;
    };
  }
}

interface MercadoPagoInstance {
  checkout: (config: MercadoPagoConfig) => void;
}

interface MercadoPagoConfig {
  preference: {
    id: string;
  };
  render: {
    container: string;
    label: string;
  };
}

interface CheckoutProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onClose?: () => void;
  isOpen?: boolean;
}

export function Checkout({ user, onClose, isOpen = true }: CheckoutProps) {
  const { cart, createOrder, createPaymentPreference } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [mp, setMp] = useState<MercadoPagoInstance | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {

    if (typeof window !== "undefined" && window.MercadoPago && !mp) {
      try {
        const mpInstance = new window.MercadoPago(
          process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || ""
        );
        setMp(mpInstance);
      } catch (error) {
        console.error("Erro ao inicializar Mercado Pago:", error);
      }
    }
  }, [mp]);

  const handleCheckout = async () => {
    if (!deliveryAddress.trim()) {
      alert("Por favor, informe o endereço de entrega");
      return;
    }

    setIsProcessing(true);
    try {

      const order = (await createOrder(
        user.id,
        deliveryAddress,
        deliveryDate ? new Date(deliveryDate) : undefined
      )) as { id: string };

      const preference = await createPaymentPreference(user.email, order.id);

      if (mp && preference.id) {
        setShowPayment(true);

      }

      if (onClose) onClose();
    } catch (error) {
      console.error("Erro no checkout:", error);
      alert("Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Finalizar Pedido
            </h2>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-6">
            
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
              <div className="space-y-2">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.product.name}
                      {item.additionals && item.additionals.length > 0 && (
                        <span className="text-gray-500">
                          {" "}
                          ({item.additionals.map((a) => a.name).join(", ")})
                        </span>
                      )}
                    </span>
                    <span>
                      R${" "}
                      {(
                        item.effectivePrice * item.quantity +
                        (item.additionals?.reduce(
                          (sum, add) => sum + add.price * item.quantity,
                          0
                        ) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-3 flex justify-between font-semibold">
                <span>Total:</span>
                <span className="text-rose-600">
                  R$ {cart.total.toFixed(2)}
                </span>
              </div>
            </Card>

            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço de Entrega *
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Digite o endereço completo para entrega"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Entrega (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Selecione a data e hora"
                />
              </div>
            </div>

            
            {showPayment && (
              <div className="cho-container border p-4 rounded-md bg-gray-50"></div>
            )}

            
            <Button
              onClick={handleCheckout}
              disabled={isProcessing || !deliveryAddress.trim()}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirmar e Pagar
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
