"use client";

import useApi, { Additional, Product } from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import Image from "next/image";
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import AdditionalCard from "./additional-card";

const ClientProductPage = ({ id }: { id: string }) => {
  const { getProduct, getAdditionalsByProduct } = useApi();
  const { cart, addToCart } = useCartContext();
  const [product, setProduct] = useState<Product>({} as Product);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [additionals, setAdditionals] = useState<Additional[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(id);
        setProduct(data);
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        toast.error("Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    };

    const fetchAdditionals = async () => {
      try {
        const data = await getAdditionalsByProduct(id);
        setAdditionals(data || []);
      } catch (error) {
        console.error("Erro ao carregar informações adicionais:", error);
        toast.error("Erro ao carregar informações adicionais");
      }
    };

    fetchProduct();
    fetchAdditionals();
  }, [id, getProduct, getAdditionalsByProduct]);

  const handleAddToCart = async () => {
    if (!product.id) return;

    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      toast.success("Produto adicionado ao carrinho!");
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      toast.error("Erro ao adicionar produto ao carrinho");
    } finally {
      setAddingToCart(false);
    }
  };

  const isInCart =
    cart?.items?.some((item) => item.product_id === product.id) || false;

  const effectivePrice = product.price
    ? product.price * (1 - (product.discount || 0) / 100)
    : 0;
  const hasDiscount = product.discount && product.discount > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!product.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Produto não encontrado
          </h1>
          <p className="text-gray-600">
            O produto que você está procurando não existe ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <span>Início</span>
          <span className="mx-2">›</span>
          <span>{product.categories?.[0]?.name || "Produtos"}</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Imagem do Produto */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="relative aspect-square w-full max-w-md mx-auto">
                <Image
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
                {hasDiscount && (
                  <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                    -{product.discount}%
                  </Badge>
                )}
              </div>
            </Card>

            {/* Miniaturas (placeholder para futuras imagens) */}
            <div className="flex gap-2 overflow-x-auto">
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0"></div>
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0"></div>
              <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300 flex-shrink-0"></div>
            </div>
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            {/* Título e Avaliação */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(0 avaliações)</span>
              </div>
            </div>

            {/* Preço */}
            <Card className="p-6">
              <div className="space-y-2">
                {hasDiscount ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-900">
                        R$ {effectivePrice.toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <Badge variant="destructive">-{product.discount}%</Badge>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Você economiza R${" "}
                      {(product.price - effectivePrice).toFixed(2)}
                    </p>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    R$ {product.price?.toFixed(2) || "0.00"}
                  </span>
                )}
              </div>
            </Card>

            {/* Quantidade e Adicionar ao Carrinho */}
            <Card className="p-6">
              <div className="space-y-4">
                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Botão Adicionar ao Carrinho */}
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                  size="lg"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Adicionando...
                    </>
                  ) : isInCart ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Já no carrinho
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Adicionar ao carrinho
                    </>
                  )}
                </Button>

                {/* Ações secundárias */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    Favoritar
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </Card>

            {/* Informações de Entrega */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Descrição do Produto
              </h3>
              <div className="prose">
                {product.description ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    Nenhuma descrição disponível para este produto.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Adicionais</h2>
            {additionals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {additionals.map((additional) => (
                  <AdditionalCard
                    key={additional.id}
                    additional={additional}
                    productId={product.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Nenhum adicional disponível para este produto.
              </p>
            )}
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Produtos relacionados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-square bg-gray-200 rounded mb-2"></div>
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Produto {i + 1}
                </h3>
                <p className="text-sm font-bold text-gray-900">R$ 29,90</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProductPage;
