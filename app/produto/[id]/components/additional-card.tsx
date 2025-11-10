import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Additional } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import { ShoppingCart, Check, Palette } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";

interface AdditionalCardProps {
  additional: Additional;
  productId: string;
  onCustomizeClick?: (additionalId: string) => void;
  onAddToCart?: (additionalId: string) => void; // Adicionar diretamente sem modal
  hasCustomizations?: boolean;
  hasProductRequiredCustomizations?: boolean; // Se o produto tem customizações obrigatórias
  hasCompletedProductCustomizations?: boolean; // Se as customizações do produto foram completadas
}

const AdditionalCard = ({
  additional,
  productId,
  onCustomizeClick,
  onAddToCart,
  hasCustomizations = false,
  hasProductRequiredCustomizations = false,
  hasCompletedProductCustomizations = false,
}: AdditionalCardProps) => {
  const { cart } = useCartContext();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  console.log(`🎴 [AdditionalCard ${additional.name}] Props:`, {
    additionalId: additional.id,
    hasCustomizations,
    hasProductRequiredCustomizations,
    hasCompletedProductCustomizations,
  });

  console.log(`🔍 [AdditionalCard ${additional.name}] Dados do adicional:`, {
    allows_customization: additional.allows_customization,
    customizations: additional.customizations,
    customizationsLength: additional.customizations?.length,
    hasRequiredCustomizations: additional.customizations?.some(
      (c) => c.isRequired
    ),
  });

  // Verificar se o adicional permite customização
  const allowsCustomization = additional.allows_customization || false;

  // Verificar se tem customizações obrigatórias
  const hasRequiredCustomizations =
    allowsCustomization && additional.customizations?.some((c) => c.isRequired);

  const isInCart =
    cart?.items?.some(
      (item) =>
        item.product_id === productId &&
        item.additional_ids?.includes(additional.id)
    ) || false;

  const handleAddToCart = async () => {
    console.log("🔍 [AdditionalCard] handleAddToCart chamado:", {
      additionalId: additional.id,
      additionalName: additional.name,
      hasRequiredCustomizations,
      hasCustomizations,
      hasProductRequiredCustomizations,
      hasCompletedProductCustomizations,
    });

    if (!productId || !additional.id) {
      toast.error("Erro: Informações do produto ou adicional não encontradas");
      return;
    }

    // Verificar se completou customizações do produto primeiro
    if (
      hasProductRequiredCustomizations &&
      !hasCompletedProductCustomizations
    ) {
      console.log("⚠️ [AdditionalCard] Bloqueado: produto não customizado");
      toast.warning(
        "Complete as personalizações obrigatórias do produto antes de adicionar adicionais"
      );
      return;
    }

    // Se o adicional tem customizações obrigatórias e não foram completadas
    if (hasRequiredCustomizations && !hasCustomizations) {
      console.log("🎨 [AdditionalCard] Abrindo modal de customização");
      // Abrir modal de customização
      if (onCustomizeClick) {
        onCustomizeClick(additional.id);
      } else {
        toast.warning("Este adicional requer personalização");
      }
      return;
    }

    // Se chegou aqui, pode adicionar ao carrinho
    if (isInCart) {
      console.log("ℹ️ [AdditionalCard] Adicional já está no carrinho");
      toast.info("Este adicional já está no carrinho!");
      return;
    }

    console.log("✅ [AdditionalCard] Adicionando ao carrinho via onAddToCart");
    setIsAddingToCart(true);
    try {
      // Se tem customizações, chamar callback de adicionar ao carrinho
      if (onAddToCart) {
        await onAddToCart(additional.id);
      } else {
        console.error("❌ [AdditionalCard] onAddToCart não está definido!");
        toast.error("Função de adicionar ao carrinho não disponível");
      }
    } catch (error) {
      console.error("❌ [AdditionalCard] Erro ao adicionar:", error);
      toast.error("Erro ao adicionar adicional ao carrinho");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="group flex flex-col max-w-[200px] justify-between relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xs transition-all duration-300 overflow-hidden">
      {/* Badges */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
        {allowsCustomization && hasCustomizations && (
          <Badge className="bg-purple-600 text-white hover:bg-purple-700">
            ✓ Personalizado
          </Badge>
        )}
      </div>

      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 w-full max-w-[200px] mx-auto">
        <Image
          src={additional.image_url || "/placeholder.svg"}
          alt={additional.name}
          fill
          className="object-cover"
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
          {/* Botão de adicionar/personalizar */}
          {allowsCustomization && hasRequiredCustomizations ? (
            // Se tem customizações obrigatórias, sempre mostrar como "Personalizar"
            <Button
              onClick={handleAddToCart}
              disabled={
                isAddingToCart ||
                (hasProductRequiredCustomizations &&
                  !hasCompletedProductCustomizations)
              }
              variant="outline"
              className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
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
              {hasCustomizations ? "Editar Personalização" : "Personalizar"}
            </Button>
          ) : (
            // Se não tem customizações obrigatórias, botão normal de adicionar
            <Button
              onClick={handleAddToCart}
              disabled={
                isAddingToCart ||
                (hasProductRequiredCustomizations &&
                  !hasCompletedProductCustomizations)
              }
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
