"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "@/app/hooks/use-cart";
import type { CartCustomization } from "@/app/hooks/use-cart";
import Image from "next/image";

interface CartProps {
  onCheckout?: () => void;
  className?: string;
}

export function Cart({ onCheckout, className = "" }: CartProps) {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);

  const renderCustomizationValue = (custom: CartCustomization) => {
    switch (custom.customization_type) {
      case "TEXT_INPUT":
        return custom.text?.trim() || "Mensagem não informada";
      case "MULTIPLE_CHOICE":
        return (
          custom.selected_option_label ||
          custom.selected_option ||
          "Opção não selecionada"
        );
      case "ITEM_SUBSTITUTION":
        if (custom.selected_item) {
          return `${custom.selected_item.original_item} → ${custom.selected_item.selected_item}`;
        }
        return "Substituição não definida";
      case "PHOTO_UPLOAD":
        return `${custom.photos?.length || 0} foto(s)`;
      default:
        return "Personalização";
    }
  };

  if (cart.items.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Seu carrinho está vazio
        </h3>
        <p className="text-gray-600">
          Adicione produtos para começar suas compras
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Carrinho ({cart.itemCount} itens)
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Minimizar" : "Expandir"}
        </Button>
      </div>

      <div className={`space-y-4 ${isExpanded ? "block" : "hidden"}`}>
        {cart.items.map((item, index) => (
          <div
            key={`${item.product_id}-${index}`}
            className="flex gap-4 p-4 border rounded-lg"
          >
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={item.product.image_url || "/placeholder.svg"}
                alt={item.product.name}
                fill
                className="object-cover rounded-md"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {item.product.name}
              </h3>

              {item.additionals && item.additionals.length > 0 && (
                <div className="mt-1 space-y-1">
                  {item.additionals.map((add) => {
                    return (
                      <div
                        key={add.id}
                        className="flex items-center gap-1 flex-wrap"
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs flex items-center gap-1"
                        >
                          + {add.name} (+R$ {add.price.toFixed(2)})
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {item.customizations && item.customizations.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.customizations.map((customization) => (
                    <div
                      key={customization.customization_id}
                      className="flex items-start gap-2 rounded-md border border-dashed border-rose-200 bg-rose-50/70 px-2 py-1 text-xs"
                    >
                      <span className="font-semibold text-rose-700">
                        {customization.title}:
                      </span>
                      <span className="flex-1 text-rose-900/80 line-clamp-2">
                        {renderCustomizationValue(customization)}
                      </span>
                      {customization.price_adjustment ? (
                        <span className="text-emerald-600 font-semibold whitespace-nowrap">
                          +R$ {customization.price_adjustment.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateQuantity(
                        item.product_id,
                        item.quantity - 1,
                        item.additional_ids,
                        item.customizations,
                        item.additional_colors
                      )
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateQuantity(
                        item.product_id,
                        item.quantity + 1,
                        item.additional_ids,
                        item.customizations,
                        item.additional_colors
                      )
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    R${" "}
                    {(
                      item.effectivePrice * item.quantity +
                      (item.additionals?.reduce(
                        (sum, add) => sum + add.price * item.quantity,
                        0
                      ) || 0)
                    ).toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      removeFromCart(
                        item.product_id,
                        item.additional_ids,
                        item.customizations,
                        item.additional_colors
                      )
                    }
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-900">Total:</span>
          <span className="text-xl font-bold text-orange-600">
            R$ {cart.total.toFixed(2)}
          </span>
        </div>

        <Button
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          size="lg"
          onClick={onCheckout}
        >
          Finalizar Pedido
        </Button>
      </div>
    </Card>
  );
}
