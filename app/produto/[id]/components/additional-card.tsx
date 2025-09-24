import { Button } from "@/app/components/ui/button";
import { Additional } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import { EyeIcon, ShoppingCart, Check } from "lucide-react";
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

    if (isInCart) {
      toast.info("Este adicional já está no carrinho!");
      return;
    }

    setIsAddingToCart(true);
    try {
      const existingProductItem = cart?.items?.find(
        (item) => item.product_id === productId
      );

      if (existingProductItem) {
        // Se o produto já existe, precisamos remover o item antigo e adicionar um novo
        const currentAdditionals = existingProductItem.additional_ids || [];
        const newAdditionals = [...currentAdditionals, additional.id];

        // Remover o item existente primeiro
        removeFromCart(productId, existingProductItem.additional_ids);

        // Adicionar o novo item com todos os adicionais
        await addToCart(
          productId,
          existingProductItem.quantity,
          newAdditionals
        );

        toast.success(`${additional.name} adicionado ao produto no carrinho!`);
      } else {
        // Se o produto não existe no carrinho, adicionar normalmente
        await addToCart(productId, 1, [additional.id]);
        toast.success(`Produto com ${additional.name} adicionado ao carrinho!`);
      }
    } catch (error) {
      console.error("Erro ao adicionar adicional ao carrinho:", error);
      toast.error("Erro ao adicionar adicional ao carrinho");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="group flex flex-col justify-between relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xs transition-all duration-300 overflow-hidden">
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
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            title="Adicionar ao Carrinho"
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
