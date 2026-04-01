"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useCartContext } from "@/app/hooks/cart-context";
import { useAuth } from "@/app/hooks/use-auth";
import { getInternalImageUrl, getPublicAssetUrl } from "@/lib/image-helper";
import { renderCustomizationValue } from "@/app/lib/cart-customization";

export default function CarrinhoRapidoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart } = useCartContext();

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
  const cartTotal = cart?.total || 0;
  const cartItemCount = cart?.itemCount || 0;

  const handleOpenCompleteCart = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/carrinho")}`);
      return;
    }

    router.push("/carrinho");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      <div className="mx-auto w-full max-w-md px-4 py-4 sm:py-6">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm font-medium text-gray-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <span className="text-sm font-semibold text-gray-800">
              Resumo rápido
            </span>
            <span className="text-xs text-gray-500">
              {cartItemCount} {cartItemCount === 1 ? "item" : "itens"}
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="mx-auto mb-3 h-14 w-14 text-gray-300" />
              <p className="font-medium text-gray-900">Seu carrinho está vazio</p>
              <p className="mt-1 text-sm text-gray-500">
                Adicione produtos para iniciar seu pedido.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/">Continuar comprando</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div
                  key={`${item.product_id}-${index}`}
                  className="rounded-lg border bg-gray-50 p-3"
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0">
                      <Image
                        src={
                          getInternalImageUrl(item.product.image_url) ||
                          getPublicAssetUrl("placeholder-v2.png")
                        }
                        alt={item.product.name}
                        fill
                        className="rounded-md object-cover object-center"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-sm font-medium text-gray-900">
                        {item.product.name}
                      </h2>

                      {item.additionals && item.additionals.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.additionals.map((add) => (
                            <Badge
                              key={add.id}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              + {add.name} (+R$ {add.price.toFixed(2)})
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      {item.customizations && item.customizations.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {item.customizations.map((customization, cIdx) => (
                            <div
                              key={`${customization.id || customization.customization_id}-${cIdx}`}
                              className="flex items-start gap-2 rounded-md border border-dashed border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px]"
                            >
                              <span className="font-semibold text-rose-700">
                                {customization.title}:
                              </span>
                              <span className="flex-1 line-clamp-2 text-rose-900/80">
                                {renderCustomizationValue(customization)}
                              </span>
                              {customization.price_adjustment ? (
                                <span className="whitespace-nowrap font-semibold text-emerald-600">
                                  +R$ {customization.price_adjustment.toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between">
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
                            className="h-7 w-7 p-0"
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
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-rose-600">
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
                            className="h-auto p-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cartItems.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto w-full max-w-md rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShoppingBasket className="h-4 w-4" />
                Total do pedido
              </span>
              <span className="text-lg font-bold text-rose-600">
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>

            <Button
              className="w-full bg-rose-600 text-white hover:bg-rose-700"
              size="lg"
              onClick={handleOpenCompleteCart}
            >
              Ir para carrinho completo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
