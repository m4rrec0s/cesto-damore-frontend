import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Additional } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import { ShoppingCart, Check, Palette } from "lucide-react";
import { useState } from "react";
import { getInternalImageUrl, getPublicAssetUrl } from "@/lib/image-helper";

interface AdditionalCardProps {
  additional: Additional;
  productId: string;
  onCustomizeClick?: (additionalId: string) => void;
  onAddToCart?: (additionalId: string) => void;
  hasCustomizations?: boolean;
  isInCartExternal?: boolean;
  hasProductRequiredCustomizations?: boolean;
  hasCompletedProductCustomizations?: boolean;
}

const AdditionalCard = ({
  additional,
  productId,
  onCustomizeClick,
  onAddToCart,
  hasCustomizations = false,
  isInCartExternal = false,
  hasProductRequiredCustomizations = false,
  hasCompletedProductCustomizations = false,
}: AdditionalCardProps) => {
  const { cart } = useCartContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const allowsCustomization = additional.allows_customization || false;
  const hasRequiredCustomizations =
    allowsCustomization && additional.customizations?.some((c) => c.isRequired);

  const isInCart =
    isInCartExternal ||
    cart?.items?.some(
      (item) =>
        item.product_id === productId &&
        item.additional_ids?.includes(additional.id),
    ) ||
    false;

  const handleAddToCart = async () => {
    if (!productId || !additional.id) {
      console.error("Informações do produto ou adicional não encontradas");
      return;
    }

    if (
      hasProductRequiredCustomizations &&
      !hasCompletedProductCustomizations
    ) {
      return;
    }

    if (hasRequiredCustomizations && !hasCustomizations) {
      if (onCustomizeClick) {
        onCustomizeClick(additional.id);
      }
      return;
    }

    if (isInCart) {
      return;
    }

    setIsAddingToCart(true);
    try {
      if (onAddToCart) {
        await onAddToCart(additional.id);
      } else {
        console.error("Função de adicionar ao carrinho não disponível");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleDirectAddToCartClick = () => {
    if (!hasCompletedProductCustomizations) {
      return;
    }
    if (onAddToCart) {
      onAddToCart(additional.id);
    } else {
      console.error("Função de adicionar ao carrinho não disponível");
    }
  };

  return (
    <div className="group flex flex-col min-w-[150px] max-w-[300px] justify-between relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xs transition-all duration-300 overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
        {allowsCustomization && hasCustomizations && (
          <Badge className="bg-gray-600 text-white hover:bg-gray-700">
            ✓ Ok
          </Badge>
        )}
      </div>

      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 w-full max-w-[200px] mx-auto">
        <img
          src={getInternalImageUrl(additional.image_url) || getPublicAssetUrl("placeholder-v2.png")}
          alt={additional.name}
          className="absolute inset-0 h-full w-full object-cover object-center p-2 bg-white rounded-sm"
          loading="lazy"
          decoding="async"
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

        <div className="mt-4 w-full space-y-2">
          {allowsCustomization && hasRequiredCustomizations ? (
            <Button
              onClick={handleAddToCart}
              disabled={
                isAddingToCart ||
                (hasProductRequiredCustomizations &&
                  !hasCompletedProductCustomizations)
              }
              variant="outline"
              className="w-full border-gray-500 text-gray-600 hover:bg-gray-50"
              title={
                hasProductRequiredCustomizations &&
                !hasCompletedProductCustomizations
                  ? "Complete as personalizações do produto primeiro"
                  : hasCustomizations
                    ? "Editar e adicionar ao carrinho"
                    : "Personalizar e adicionar ao carrinho"
              }
            >
              <Palette className="h-4 w-4 mr-2" />
              {hasCustomizations ? "Editar" : "Personalizar"}
            </Button>
          ) : (
            <Button
              onClick={handleDirectAddToCartClick}
              disabled={isInCart || isAddingToCart}
              title={
                hasProductRequiredCustomizations &&
                !hasCompletedProductCustomizations
                  ? "Complete as personalizações do produto primeiro"
                  : "Adicionar ao Carrinho"
              }
              className={`w-full ${
                isInCart
                  ? "bg-green-500 hover:bg-green-600"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AdditionalCard;
