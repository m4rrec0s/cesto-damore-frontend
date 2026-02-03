"use client";

import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  X,
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useCartContext } from "@/app/hooks/cart-context";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { useAuth } from "@/app/hooks/use-auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: () => void;
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
  const { cart, updateQuantity, removeFromCart } = useCartContext();
  const { user } = useAuth();
  const router = useRouter();

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
  const cartTotal = cart?.total || 0;
  const cartItemCount = cart?.itemCount || 0;

  const renderCustomizationValue = (custom: CartCustomization) => {
    switch (custom.customization_type) {
      case "TEXT":
        return custom.text?.trim() || "Mensagem não informada";
      case "MULTIPLE_CHOICE":
        return (
          custom.label_selected ||
          custom.selected_option_label ||
          custom.selected_option ||
          "Opção não selecionada"
        );
      case "DYNAMIC_LAYOUT":
        // DYNAMIC_LAYOUT sempre deve retornar o label_selected
        if (custom.label_selected) return custom.label_selected;
        // Fallback se não houver label_selected
        if (custom.selected_item_label) return custom.selected_item_label;
        if (custom.selected_option_label) return custom.selected_option_label;
        if (custom.text) return custom.text;
        if (typeof custom.selected_item === "string") {
          return custom.selected_item;
        }
        if (
          custom.selected_item &&
          typeof custom.selected_item === "object" &&
          "selected_item" in custom.selected_item
        ) {
          return (
            (custom.selected_item as { selected_item?: string })
              .selected_item || "Design selecionado"
          );
        }
        return "Design selecionado";
      case "IMAGES":
        return `${custom.photos?.length || 0} foto(s)`;
      default:
        return "Personalização";
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/carrinho")}`);
      return;
    }

    if (onCheckout) {
      onCheckout();
    } else {
      router.push("/carrinho");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white text-black shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <span className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBasket /> Carrinho ({cartItemCount}{" "}
              {cartItemCount === 1 ? "item" : "itens"})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Carrinho vazio
                </h3>
                <p className="text-gray-500 mb-6">
                  Adicione produtos para começar suas compras
                </p>
                <Button onClick={onClose} variant="outline">
                  Continuar comprando
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex gap-4 p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={item.product.image_url || "/placeholder.png"}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {item.product.name}
                      </h3>

                      {item.additionals && item.additionals.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.additionals.map((add) => {
                            return (
                              <Badge
                                key={add.id}
                                variant="secondary"
                                className="text-xs flex items-center gap-1"
                              >
                                + {add.name} (+R$ {add.price.toFixed(2)})
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {item.customizations &&
                        item.customizations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.customizations.map((customization, cIdx) => (
                              <div
                                key={`${customization.id || customization.customization_id}-${cIdx}`}
                                className="flex items-start gap-2 rounded-md border border-dashed border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px]"
                              >
                                <span className="font-semibold text-rose-700">
                                  {customization.title}:
                                </span>
                                <span className="flex-1 text-rose-900/80 line-clamp-2">
                                  {renderCustomizationValue(customization)}
                                </span>
                                {customization.price_adjustment ? (
                                  <span className="text-emerald-600 font-semibold whitespace-nowrap">
                                    +R${" "}
                                    {customization.price_adjustment.toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantidade */}
                        <div className="flex items-center gap-1">
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
                            className="w-7 h-7 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
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
                            className="w-7 h-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            {item.discount && item.discount > 0 ? (
                              <Badge
                                variant="destructive"
                                className="text-xs mb-1"
                              >
                                -{item.discount}%
                              </Badge>
                            ) : null}
                            <div className="flex flex-col items-end w-full">
                              {item.discount && item.discount > 0 ? (
                                <>
                                  <span className="text-xs text-gray-400 line-through">
                                    R${" "}
                                    {(
                                      item.price * item.quantity +
                                      (item.customization_total || 0) *
                                        item.quantity +
                                      (item.additionals?.reduce(
                                        (sum, add) =>
                                          sum + add.price * item.quantity,
                                        0,
                                      ) || 0)
                                    ).toFixed(2)}
                                  </span>
                                  <span className="text-sm font-semibold text-rose-600">
                                    R${" "}
                                    {(
                                      item.effectivePrice * item.quantity +
                                      (item.additionals?.reduce(
                                        (sum, add) =>
                                          sum + add.price * item.quantity,
                                        0,
                                      ) || 0)
                                    ).toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-semibold text-rose-600">
                                  R${" "}
                                  {(
                                    item.effectivePrice * item.quantity +
                                    (item.additionals?.reduce(
                                      (sum, add) =>
                                        sum + add.price * item.quantity,
                                      0,
                                    ) || 0)
                                  ).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            title="Remover item"
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
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - apenas se houver itens */}
          {cartItems.length > 0 && (
            <div className="border-t p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  Total:
                </span>
                <span className="text-xl font-bold text-rose-600">
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>

              <Button
                className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                size="lg"
                onClick={handleCheckout}
              >
                Ver Carrinho Completo
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Pagamento seguro via Mercado Pago
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
