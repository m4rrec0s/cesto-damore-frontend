"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "@/app/hooks/use-cart";
import type { CartCustomization } from "@/app/hooks/use-cart";
import Image from "next/image";
import { getInternalImageUrl } from "@/lib/image-helper";
import { useRouter } from "next/navigation";

export function Cart({ onClose }: { onClose?: () => void }) {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    if (onClose) onClose();
    router.push("/checkout");
  };

  const renderCustomizationValue = (customization: CartCustomization) => {
    switch (customization.customization_type) {
      case "DYNAMIC_LAYOUT":
        return (
          customization.label_selected ||
          customization.selected_item_label ||
          "Design selecionado"
        );
      case "TEXT":
        return customization.text || "";
      case "MULTIPLE_CHOICE":
        return (
          customization.label_selected ||
          customization.selected_option_label ||
          customization.selected_option ||
          ""
        );
      case "IMAGES":
        return `${customization.photos?.length || 0} fotos`;
      default:
        return "";
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="bg-rose-50 p-4 rounded-full">
          <ShoppingBag className="h-12 w-12 text-rose-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">
          Seu carrinho está vazio
        </h3>
        <p className="text-gray-500 max-w-[200px]">
          Adicione alguns produtos deliciosos para começar!
        </p>
        <Button
          onClick={onClose}
          className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
        >
          Continuar Comprando
        </Button>
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-full border-0 shadow-none bg-transparent">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {cart.items.map((item) => (
          <div
            key={`${item.product_id}-${(item.additional_ids || []).join(
              "-",
            )}-${JSON.stringify(item.customizations)}`}
            className="flex gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
          >
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
              <Image
                src={getInternalImageUrl(
                  item.product.image_url || "/placeholder.png",
                )}
                alt={item.product.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
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
              </div>

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
                        item.additional_colors,
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
                        item.additional_colors,
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
                        0,
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
                        item.additional_colors,
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
          <span className="text-xl font-bold text-rose-600">
            R$ {cart.total.toFixed(2)}
          </span>
        </div>

        <Button
          className="w-full bg-rose-600 hover:bg-rose-700 text-white"
          size="lg"
          onClick={handleCheckout}
        >
          Finalizar Pedido
        </Button>
      </div>
    </Card>
  );
}
