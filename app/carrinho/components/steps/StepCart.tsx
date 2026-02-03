"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
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
    customizations?: CartCustomization[],
  ) => void;
  removeFromCart: (
    productId: string,
    additionalIds?: string[],
    customizations?: CartCustomization[],
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
    case "DYNAMIC_LAYOUT":
      if (custom.label_selected) return custom.label_selected;
      if (custom.selected_item_label) return custom.selected_item_label;
      if (custom.selected_option_label) return custom.selected_option_label;
      if (custom.text) return custom.text;
      if (typeof custom.selected_item === "string") return custom.selected_item;
      if (
        custom.selected_item &&
        typeof custom.selected_item === "object" &&
        "selected_item" in custom.selected_item
      ) {
        return (
          (custom.selected_item as { selected_item?: string }).selected_item ||
          "Design selecionado"
        );
      }
      return "Design selecionado";
    case "IMAGES":
      return `${custom.photos?.length || 0} foto(s)`;
    default:
      return "Personalização";
  }
};

const getAdditionalFinalPrice = (
  additionalId: string,
  basePrice: number,
  customizations?: CartCustomization[],
): number => {
  if (!customizations || customizations.length === 0) return basePrice;
  const additionalCustomizations = customizations.filter(
    (c) =>
      c.customization_id?.includes(additionalId) ||
      c.customization_id?.endsWith(`_${additionalId}`),
  );
  if (additionalCustomizations.length === 0) return basePrice;
  const adjustmentTotal = additionalCustomizations.reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0,
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
    <div className="flex gap-4 py-6 border-b border-gray-200 last:border-0">
      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
        <Image
          src={
            getInternalImageUrl(item.product.image_url) || "/placeholder.png"
          }
          alt={item.product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base leading-snug mb-1">
              {item.product.name}
            </h3>

            <div className="space-y-1">
              {item.additionals && item.additionals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.additionals.map((add) => (
                    <span key={add.id} className="text-[10px] text-gray-500">
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
                      className="text-[10px] text-gray-400 flex items-center gap-1"
                    >
                      <span className="font-normal">
                        {customization.title}:
                      </span>
                      <span className="truncate max-w-[150px]">
                        {formatCustomizationValue(customization)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-4">
              <button
                onClick={() =>
                  removeFromCart(
                    item.product_id,
                    item.additional_ids,
                    item.customizations,
                  )
                }
                disabled={isProcessing}
                className="text-xs text-[#3483fa] hover:text-[#2968c8] font-medium"
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center border border-gray-300 rounded overflow-hidden h-8">
              <button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity - 1,
                    item.additional_ids,
                    item.customizations,
                  )
                }
                disabled={isProcessing || item.quantity <= 1}
                className="w-8 h-full flex items-center justify-center text-[#3483fa] hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                title="Diminuir quantidade"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 h-full flex items-center justify-center text-xs font-medium border-x border-gray-300 bg-white">
                {item.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(
                    item.product_id,
                    item.quantity + 1,
                    item.additional_ids,
                    item.customizations,
                  )
                }
                disabled={isProcessing}
                className="w-8 h-full flex items-center justify-center text-[#3483fa] hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                title="Aumentar quantidade"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div className="text-right">
              <span className="text-gray-900 text-lg font-normal">
                R${" "}
                {(
                  (item.effectivePrice ?? item.price) * item.quantity +
                  (item.additionals?.reduce(
                    (sum: number, add) =>
                      sum +
                      getAdditionalFinalPrice(
                        add.id,
                        add.price,
                        item.customizations,
                      ) *
                        item.quantity,
                    0,
                  ) || 0)
                ).toFixed(2)}
              </span>
            </div>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <Card className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-none">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Produtos</h2>
        </div>
        <div className="flex flex-col">
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

      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Frete</span>
          <span className="text-xs text-gray-500">
            Será calculado na entrega
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Frete grátis apenas com PIX em Campina Grande ou retirada na loja com
          desconto.
        </p>
      </div>
    </motion.div>
  );
};
