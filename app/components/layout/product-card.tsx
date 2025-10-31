import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useCartContext } from "@/app/hooks/cart-context";
import { useAuth } from "@/app/hooks/use-auth";
import { useRouter } from "next/navigation";
import { CartSheet } from "@/app/components/cart-sheet";
import { toast } from "sonner";

interface ProductCardProps {
  props: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    categoryName?: string;
    categoryNames?: string[];
    discount?: number;
  };
}

export function ProductCard({ props }: ProductCardProps) {
  const { addToCart } = useCartContext();
  const { user } = useAuth();
  const router = useRouter();
  const [showCartSheet, setShowCartSheet] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    try {
      await addToCart(props.id, 1);
      toast.success("Produto adicionado ao carrinho");
      setShowCartSheet(true);
    } catch (error) {
      console.error("❌ Erro ao adicionar produto:", error);
      toast.error("Erro ao adicionar produto ao carrinho");
    }
  };
  return (
    <>
      <div className="group flex flex-col justify-between relative w-full h-auto bg-white rounded-2xl hover:shadow-xs overflow-hidden">
        <Link href={`/produto/${props.id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 max-w-[300px] mx-auto">
            <Image
              src={props.image_url || "/placeholder.svg"}
              alt={props.name}
              fill
              className="object-cover"
            />

            {props.categoryNames && props.categoryNames.length > 0 ? (
              <div className="absolute top-3 left-3 gap-1 flex opacity-80">
                {props.categoryNames[0] && (
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                    {props.categoryNames[0]}
                  </div>
                )}
                {props.categoryNames.length > 1 && (
                  <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                    +{props.categoryNames.length - 1}
                  </div>
                )}
              </div>
            ) : props.categoryName ? (
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                {props.categoryName}
              </div>
            ) : null}
          </div>

          <div className="p-4 space-y-3 flex flex-col overflow-hidden h-28">
            <div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors min-h-[2.5rem]">
                {props.name}
              </h3>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col">
                <div className="text-sm text-gray-500 line-through">
                  {props.discount
                    ? props.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : null}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {props.discount
                    ? (
                        props.price -
                        (props.discount * props.price) / 100
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : props.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </div>
              </div>
              {props.discount && props.discount > 0 ? (
                <div className="text-xs text-green-500 px-2 py-1 rounded-full font-medium">
                  {`${props.discount.toFixed(0)}% OFF`}
                </div>
              ) : null}
            </div>
          </div>
        </Link>
        <div className="p-4 pt-0 mt-2">
          <Button
            size="sm"
            className="w-full bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
            onClick={handleAddToCart}
            title="Adicionar ao carrinho"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <CartSheet
        isOpen={showCartSheet}
        onClose={() => setShowCartSheet(false)}
      />
    </>
  );
}
