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

  const finalPrice = props.discount
    ? props.price - (props.discount * props.price) / 100
    : props.price;

  return (
    <>
      <div className="group flex flex-col relative w-full h-full bg-white rounded-xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-gray-100">
        <Link href={`/produto/${props.id}`} className="block flex-1">
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <Image
              src={props.image_url || "/placeholder.svg"}
              alt={props.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />

            {/* Discount Badge */}
            {props.discount && props.discount > 0 ? (
              <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                -{props.discount.toFixed(0)}%
              </div>
            ) : null}

            {/* Categories */}
            {props.categoryNames && props.categoryNames.length > 0 ? (
              <div className="absolute bottom-2 left-2 gap-1 flex">
                {props.categoryNames[0] && (
                  <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                    {props.categoryNames[0]}
                  </div>
                )}
                {props.categoryNames.length > 1 && (
                  <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                    +{props.categoryNames.length - 1}
                  </div>
                )}
              </div>
            ) : props.categoryName ? (
              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                {props.categoryName}
              </div>
            ) : null}
          </div>

          <div className="p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors min-h-[2.5rem]">
              {props.name}
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                {props.discount && props.discount > 0 ? (
                  <span className="text-xs text-gray-400 line-through">
                    {props.price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                ) : null}
                <span className="text-lg font-bold text-gray-900">
                  {finalPrice.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="p-3 pt-0">
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
            onClick={handleAddToCart}
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
