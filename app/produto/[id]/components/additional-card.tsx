import { Button } from "@/app/components/ui/button";
import { Additional } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import {
  EyeIcon,
  ShoppingCart,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

interface AdditionalCardProps {
  additional: Additional;
  productId: string;
}

const AdditionalCard = ({ additional, productId }: AdditionalCardProps) => {
  const { cart, addToCart, removeFromCart } = useCartContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Verificar se adicional tem estoque disponível
  const hasStock = () => {
    if (additional.colors && additional.colors.length > 0) {
      // Se tem cores, verificar se alguma cor tem estoque
      return additional.colors.some((color) => color.stock_quantity > 0);
    }
    // Se não tem cores, verificar estoque total
    return (additional.stock_quantity || 0) > 0;
  };

  // Obter estoque total disponível
  const getTotalStock = () => {
    if (additional.colors && additional.colors.length > 0) {
      return additional.colors.reduce(
        (sum, color) => sum + color.stock_quantity,
        0
      );
    }
    return additional.stock_quantity || 0;
  };

  // Obter cor selecionada
  const getSelectedColorData = () => {
    if (!selectedColor || !additional.colors) return null;
    return additional.colors.find((c) => c.color_id === selectedColor);
  };

  const isInCart =
    cart?.items?.some(
      (item) =>
        item.product_id === productId &&
        item.additional_ids?.includes(additional.id)
    ) || false;

  const handleAddToCart = async () => {
    if (!productId || !additional.id) {
      toast.error("Erro: Informações do produto ou adicional não encontradas");
      return;
    }

    // Verificar se tem estoque disponível
    if (!hasStock()) {
      toast.error("Este adicional está sem estoque no momento");
      return;
    }

    // Se tem cores, validar se uma cor foi selecionada
    if (additional.colors && additional.colors.length > 0) {
      if (!selectedColor) {
        toast.error("Por favor, selecione uma cor antes de adicionar");
        return;
      }

      const colorData = getSelectedColorData();
      if (!colorData || colorData.stock_quantity <= 0) {
        toast.error("A cor selecionada está sem estoque");
        return;
      }
    }

    if (isInCart) {
      toast.info("Este adicional já está no carrinho!");
      return;
    }

    setIsAddingToCart(true);
    try {
      const existingProductItem = cart?.items?.find(
        (item) => item.product_id === productId
      );

      // Preparar mapeamento de cores se houver cor selecionada
      const colorMapping: Record<string, string> = {};
      if (selectedColor) {
        colorMapping[additional.id] = selectedColor;
      }

      if (existingProductItem) {
        // Se o produto já existe, precisamos remover o item antigo e adicionar um novo
        const currentAdditionals = existingProductItem.additional_ids || [];
        const newAdditionals = [...currentAdditionals, additional.id];

        // Combinar cores existentes com a nova cor selecionada
        const combinedColors = {
          ...existingProductItem.additional_colors,
          ...colorMapping,
        };

        // Remover o item existente primeiro
        removeFromCart(
          productId,
          existingProductItem.additional_ids,
          existingProductItem.customizations,
          existingProductItem.additional_colors
        );

        // Adicionar o novo item com todos os adicionais e cores
        await addToCart(
          productId,
          existingProductItem.quantity,
          newAdditionals,
          combinedColors,
          existingProductItem.customizations
        );

        toast.success(`${additional.name} adicionado ao produto no carrinho!`);
      } else {
        // Se o produto não existe no carrinho, adicionar normalmente
        await addToCart(productId, 1, [additional.id], colorMapping);
        toast.success(`Produto com ${additional.name} adicionado ao carrinho!`);
      }
    } catch (error) {
      console.error("Erro ao adicionar adicional ao carrinho:", error);
      toast.error("Erro ao adicionar adicional ao carrinho");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const stockAvailable = hasStock();
  const totalStock = getTotalStock();

  return (
    <div className="group flex flex-col justify-between relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xs transition-all duration-300 overflow-hidden">
      {/* Badge de estoque */}
      {!stockAvailable && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          Sem Estoque
        </div>
      )}
      {stockAvailable && totalStock <= 5 && (
        <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          Últimas {totalStock} unidades
        </div>
      )}

      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 w-full max-w-[200px] mx-auto">
        <Image
          src={additional.image_url || "/placeholder.svg"}
          alt={additional.name}
          fill
          className={`object-cover ${
            !stockAvailable ? "opacity-50 grayscale" : ""
          }`}
        />
      </div>
      <div className="px-2 flex flex-col py-5">
        <h3 className="text-base font-light text-gray-900">
          {additional.name}
        </h3>
        <span className="text-xl font-bold">
          {additional.price.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>

        {/* Informação de estoque */}
        <div className="mt-2 text-sm">
          {stockAvailable ? (
            <div className="flex items-center gap-1 text-green-600">
              <Package className="h-4 w-4" />
              <span className="font-medium">{totalStock} disponível(is)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Indisponível</span>
            </div>
          )}
        </div>

        {/* Seletor de cores */}
        {additional.colors && additional.colors.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-700">
              Selecione uma cor:
            </p>
            <div className="flex flex-wrap gap-2">
              {additional.colors.map((color) => {
                const colorHasStock = color.stock_quantity > 0;
                const isSelected = selectedColor === color.color_id;

                return (
                  <button
                    key={color.color_id}
                    onClick={() =>
                      colorHasStock && setSelectedColor(color.color_id)
                    }
                    disabled={!colorHasStock}
                    className={`relative group/color ${
                      colorHasStock
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-40"
                    }`}
                    title={`${color.color_name} - ${color.stock_quantity} disponível(is)`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-orange-500 ring-2 ring-orange-200 scale-110"
                          : colorHasStock
                          ? "border-gray-300 hover:border-orange-400"
                          : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color.color_hex_code }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                    {!colorHasStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45" />
                      </div>
                    )}
                    {/* Tooltip com nome da cor e estoque */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none">
                      {color.color_name}
                      <br />
                      {color.stock_quantity} un.
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedColor && (
              <p className="text-xs text-gray-600">
                Cor selecionada:{" "}
                <span className="font-semibold">
                  {getSelectedColorData()?.color_name}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="mt-4 w-full space-y-2">
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToCart || !stockAvailable}
            title={
              !stockAvailable
                ? "Sem estoque disponível"
                : "Adicionar ao Carrinho"
            }
            className={`w-full ${
              isInCart
                ? "bg-green-500 hover:bg-green-600"
                : !stockAvailable
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-rose-500 hover:bg-rose-600"
            }`}
          >
            {isAddingToCart ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adicionando...
              </>
            ) : isInCart ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Adicionado
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Adicionar
              </>
            )}
          </Button>
          <Link
            href={`/additional/${additional.id}`}
            className="cursor-pointer"
          >
            <Button title="Ver Detalhes" variant="outline" className="w-full">
              <EyeIcon className="h-4 w-4 mr-2" /> Ver Detalhes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdditionalCard;
