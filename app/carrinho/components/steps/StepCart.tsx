"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { getInternalImageUrl } from "@/lib/image-helper";
import type { CartCustomization } from "@/app/hooks/use-cart";

interface CartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    description?: string;
    image_url?: string | null;
  };
  quantity: number;
  price: number;
  effectivePrice?: number;
  additional_ids?: string[];
  additionals?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  customizations?: CartCustomization[];
}

interface StepCartProps {
  cartItems: CartItem[];
  updateQuantity: (
    productId: string,
    quantity: number,
    additionalIds?: string[],
    customizations?: CartCustomization[]
  ) => void;
  removeFromCart: (
    productId: string,
    additionalIds?: string[],
    customizations?: CartCustomization[]
  ) => void;
  isProcessing: boolean;
  onEditCustomizations?: (item: CartItem) => void;
}

const formatCustomizationValue = (custom: CartCustomization) => {
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
    case "BASE_LAYOUT":
      if (custom.label_selected) return custom.label_selected;
      if (custom.selected_item_label) return custom.selected_item_label;
      if (typeof custom.selected_item === "string") return custom.selected_item;
      if (
        custom.selected_item &&
        typeof custom.selected_item === "object" &&
        "selected_item" in custom.selected_item
      ) {
        return (
          (custom.selected_item as { selected_item?: string }).selected_item ||
          "Layout selecionado"
        );
      }
      return "Layout selecionado";
    case "IMAGES":
      return `${custom.photos?.length || 0} foto(s)`;
    default:
      return "Personalização";
  }
};

const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[]
): number => {
  if (!customizations || customizations.length === 0) return basePrice;
  const additionalCustomizations = customizations.filter(
    (c) =>
      c.customization_id?.includes(additionalId) ||
      c.customization_id?.endsWith(`_${additionalId}`)
  );
  if (additionalCustomizations.length === 0) return basePrice;
  const adjustmentTotal = additionalCustomizations.reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0
  );
  return basePrice + adjustmentTotal;
};

const ProductCard = ({
  item,
  updateQuantity,
  removeFromCart,
  isProcessing,
}: {
  item: CartItem;
  updateQuantity: StepCartProps["updateQuantity"];
  removeFromCart: StepCartProps["removeFromCart"];
  isProcessing: boolean;
}) => {
  return (
    <div className="flex gap-4 sm:gap-6 py-4 sm:py-6 border-b border-gray-100 last:border-0">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <Image
          src={
            getInternalImageUrl(item.product.image_url) || "/placeholder.png"
          }
          alt={item.product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight mb-1 truncate">
              {item.product.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">
              {item.product.description}
            </p>
          </div>
          <Button
            onClick={() =>
              removeFromCart(
                item.product_id,
                item.additional_ids,
                item.customizations
              )
            }
            disabled={isProcessing}
            variant="ghost"
            className="text-gray-400 hover:text-red-500 transition-colors p-1 h-auto"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-2 space-y-1">
          {item.additionals && item.additionals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.additionals.map((add) => (
                <span
                  key={add.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] sm:text-xs font-medium"
                >
                  + {add.name}
                </span>
              ))}
            </div>
          )}

          {item.customizations && item.customizations.length > 0 && (
            <div className="space-y-0.5">
              {item.customizations.map((customization, index) => (
                <div
                  key={`${customization.customization_id}-${index}`}
                  className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1"
                >
                  <span className="font-medium">{customization.title}:</span>
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {formatCustomizationValue(customization)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 sm:p-1 bg-white">
              <Button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity - 1,
                    item.additional_ids,
                    item.customizations
                  )
                }
                disabled={isProcessing || item.quantity <= 1}
                variant="ghost"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-semibold text-gray-900">
                {item.quantity}
              </span>
              <Button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity + 1,
                    item.additional_ids,
                    item.customizations
                  )
                }
                disabled={isProcessing}
                variant="ghost"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="text-right">
            <span className="font-bold text-gray-900 text-base sm:text-lg">
              R${" "}
              {(
                (item.effectivePrice ?? item.price) * item.quantity +
                (item.additionals?.reduce(
                  (sum: number, add) =>
                    sum +
                    getAdditionalFinalPrice(
                      add.id,
                      add.price,
                      item.customizations
                    ) *
                      item.quantity,
                  0
                ) || 0)
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StepCart = ({
  cartItems,
  updateQuantity,
  removeFromCart,
  isProcessing,
}: StepCartProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="bg-white p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-50 rounded-xl">
            <ShoppingCart className="h-6 w-6 text-rose-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Seus Produtos ({cartItems.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {cartItems.map((item, index) => (
            <ProductCard
              key={`${item.product_id}-${index}`}
              item={item}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
