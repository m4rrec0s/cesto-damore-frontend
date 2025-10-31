"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus, ChevronLeft } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";
import useApi, {
  Additional,
  Customization,
  Item,
  Product,
} from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { Model3DViewer } from "./Model3DViewer";
import AdditionalCard from "./additional-card";
import Link from "next/link";
import { ProductCard } from "@/app/components/layout/product-card";
import { useRouter } from "next/navigation";
import { ClientCustomizationPanel } from "@/app/components/customization/ClientCustomizationPanel";
import customizationClientService from "@/app/services/customization-client-service";
import type {
  SaveOrderItemCustomizationPayload,
  CustomizationTypeValue,
} from "@/app/types/customization";
import { Separator } from "@/app/components/ui/separator";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ClientProductPage = ({ id }: { id: string }) => {
  const { getProduct, getAdditionalsByProduct, getItemsByProduct } = useApi();
  const { addToCart } = useCartContext();

  const [product, setProduct] = useState<Product>({} as Product);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>(
    []
  );
  const [components, setComponents] = useState<Item[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<Item | null>(null);
  const [itemCustomizationPayloads, setItemCustomizationPayloads] = useState<
    Record<string, SaveOrderItemCustomizationPayload | undefined>
  >({});
  const isUploading = false;

  const handleCustomizationComplete = useCallback(
    async (itemId: string, hasCustomizations: boolean) => {
      try {
        if (hasCustomizations) {
          const payload =
            await customizationClientService.buildOrderItemCustomizationPayload(
              selectedComponent?.name || product.name || "Personalização"
            );
          setItemCustomizationPayloads((prev) => ({
            ...prev,
            [itemId]: payload,
          }));
          toast.success("Personalização salva para o item");
        } else {
          setItemCustomizationPayloads((prev) => {
            const copy = { ...prev };
            delete copy[itemId];
            return copy;
          });
        }
      } catch (err) {
        console.error("Erro ao finalizar customização:", err);
        toast.error("Falha ao salvar customização");
      } finally {
        try {
          customizationClientService.clearSession();
        } catch (e) {
          console.error("Erro ao limpar sessão de customização:", e);
        }
      }
    },
    [product.name, selectedComponent?.name]
  );

  const router = useRouter();

  // Memoized wrapper to pass to ClientCustomizationPanel so the prop identity
  // doesn't change on every render (prevents the child from re-running effects)
  const onCustomizationComplete = useCallback(
    (has: boolean) => {
      if (!selectedComponent) return;
      handleCustomizationComplete(selectedComponent.id, has);
    },
    [handleCustomizationComplete, selectedComponent]
  );

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(id);
        setProduct(data);
        if (
          data.components &&
          Array.isArray(data.components) &&
          data.components.length > 0
        ) {
          const itemsFromProduct = data.components
            .map((c: { item?: Item | null }) => c.item)
            .filter(Boolean) as Item[];
          setComponents(itemsFromProduct);
        } else {
          await fetchComponents();
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        toast.error("Erro ao carregar produto");
      } finally {
        setLoadingProduct(false);
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

    const fetchComponents = async () => {
      try {
        const data = await getItemsByProduct(id);
        setComponents(data || []);
      } catch (error) {
        console.error("Erro ao carregar componentes:", error);
        toast.error("Erro ao carregar componentes");
      }
    };

    const run = async () => {
      await fetchProduct();
      fetchAdditionals();
    };

    run();
  }, [id, getProduct, getAdditionalsByProduct, getItemsByProduct]);

  const customizationTotal = useMemo(() => 0, []);

  const basePrice = useMemo(() => {
    if (!product.price) return 0;
    const discount = product.discount || 0;
    return product.price * (1 - discount / 100);
  }, [product.price, product.discount]);

  const unitPriceWithCustomizations = useMemo(
    () => Number((basePrice + customizationTotal).toFixed(2)),
    [basePrice, customizationTotal]
  );

  const totalPriceForQuantity = useMemo(
    () => unitPriceWithCustomizations * quantity,
    [unitPriceWithCustomizations, quantity]
  );

  // const currentConfigSignature = useMemo(
  //   () => serializeCustomizationsSignature(cartCustomizations),
  //   [cartCustomizations]
  // );

  const currentImageUrl =
    selectedComponent?.image_url || product.image_url || "/placeholder.svg";
  const currentName = selectedComponent?.name || product.name;

  const shouldShow3D = useMemo(() => {
    if (!selectedComponent) return false;
    if (!selectedComponent.allows_customization) return false;
    if (
      selectedComponent.type !== "caneca" &&
      selectedComponent.type !== "quadro"
    )
      return false;
    // Mostrar 3D se o componente tiver um layout base associado
    return Boolean(selectedComponent.layout_base_id);
  }, [selectedComponent]);

  // photo upload helpers removed (product-level rules deprecated)

  const handleAddToCart = async () => {
    if (!product.id) return;

    if (isUploading) {
      toast.info("Aguarde finalizar o carregamento das personalizações.");
      return;
    }

    if (missingRequiredFields.length > 0) {
      toast.error(
        `Complete as personalizações obrigatórias: ${missingRequiredFields.join(
          ", "
        )}`
      );
      return;
    }

    setMissingRequiredFields([]);
    setAddingToCart(true);

    try {
      // Converter payloads de item em customizações compatíveis com o carrinho
      const cartCustomizations: CartCustomization[] = Object.entries(
        itemCustomizationPayloads
      )
        .filter(([, v]) => Boolean(v))
        .map(([itemId, payload]) => {
          const customizationId =
            (payload?.customizationRuleId as string) ||
            (`item_${itemId}` as string);
          const customizationType =
            (payload?.customizationType as unknown as CustomizationTypeValue) ||
            ("MULTIPLE_CHOICE" as CustomizationTypeValue);

          return {
            customization_id: customizationId,
            title: payload?.title || `Personalização do item ${itemId}`,
            customization_type: customizationType,
            is_required: false,
            price_adjustment: (payload?.data?.price_adjustment as number) || 0,
            text: payload?.data?.text as string | undefined,
            selected_option: payload?.data?.selected_option as
              | string
              | undefined,
            selected_item: payload?.data
              ?.selected_item as CartCustomization["selected_item"],
            photos: undefined,
          } as CartCustomization;
        });

      await addToCart(
        product.id,
        quantity,
        undefined,
        undefined,
        cartCustomizations
      );
      toast.success("Produto adicionado ao carrinho!");
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      toast.error("Erro ao adicionar produto ao carrinho");
    } finally {
      setAddingToCart(false);
    }
  };

  const hasDiscount = product.discount && product.discount > 0;

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!product.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
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
      <div className="max-w-none sm:max-w-[90%] mx-auto px-4 py-8">
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:underline">
            Início
          </Link>
          <span className="mx-2">›</span>
          <Link
            href={`/categoria/${product.categories?.[0]?.id}`}
            className="hover:underline"
          >
            {product.categories?.[0]?.name || "Produtos"}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative aspect-square w-full max-w-md mx-auto">
              <Button
                variant={"ghost"}
                onClick={() => router.back()}
                className="absolute text-white hover:text-neutral-100 top-3 left-3 z-10 bg-black/30 hover:bg-black/50 backdrop-blur-lg px-0 py-0 p-0 rounded-full shadow-sm cursor-pointer border"
              >
                <ChevronLeft size={24} />
              </Button>

              {shouldShow3D ? (
                <Model3DViewer
                  modelUrl={
                    selectedComponent?.layout_base_id
                      ? `/api/models/${selectedComponent.layout_base_id}`
                      : undefined
                  }
                  className="w-full h-full"
                  autoRotate={true}
                  rotateSpeed={0.3}
                  baseScale={6}
                />
              ) : (
                <Image
                  src={currentImageUrl}
                  alt={currentName}
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
              )}
              {hasDiscount && (
                <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                  -{product.discount}%
                </Badge>
              )}
            </div>

            <h2 className="font-semibold text-lg">Componentes</h2>
            <div className="flex gap-2 overflow-x-auto">
              <>
                <div
                  key="product-default"
                  className={cn(
                    "relative w-[100px] h-[100px] bg-gray-200 rounded-lg border-2 flex-shrink-0 cursor-pointer",
                    selectedComponent === null
                      ? "border-blue-500 ring-2 ring-blue-100"
                      : "border-gray-300"
                  )}
                  title="Imagem padrão do produto"
                >
                  <Button
                    asChild
                    className="w-full h-full p-0 rounded-lg overflow-hidden"
                    onClick={() => setSelectedComponent(null)}
                    aria-label="Selecionar imagem do produto"
                  >
                    <Image
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name || "Produto"}
                      fill
                      className="object-cover rounded-lg"
                      priority
                    />
                  </Button>
                </div>

                {components &&
                  components.length > 0 &&
                  components.map((component) => (
                    <div
                      key={component.id}
                      className={cn(
                        "relative w-[100px] h-[100px] bg-gray-200 rounded-lg border-2 flex-shrink-0 cursor-pointer",
                        selectedComponent?.id === component.id
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-gray-300"
                      )}
                      title={component.name}
                    >
                      <Button
                        asChild
                        className="w-full h-full p-0 rounded-lg overflow-hidden"
                        onClick={() => setSelectedComponent(component)}
                        aria-label={`Selecionar componente ${component.name}`}
                      >
                        <Image
                          src={component.image_url || "/placeholder.svg"}
                          alt={component.name}
                          fill
                          className="object-cover rounded-lg"
                          priority
                        />
                      </Button>
                    </div>
                  ))}
              </>
            </div>
            {selectedComponent && selectedComponent.allows_customization && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">
                  Customizações do item: {selectedComponent.name}
                </h3>
                <ClientCustomizationPanel
                  itemType="PRODUCT"
                  itemId={selectedComponent.id}
                  onComplete={onCustomizationComplete}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 h-6">
                <span className="text-sm md:text-base text-gray-500">Novo</span>
                <Separator orientation="vertical" />
                <span className="text-sm md:text-base text-gray-500">
                  +1000 Vendidos
                </span>
              </div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                {product.name}
              </h1>
              <div className="space-y-2">
                {hasDiscount ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl lg:text-4xl font-light text-gray-900">
                        {formatCurrency(basePrice)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        {formatCurrency(product.price)}
                      </span>
                      <Badge variant="destructive">-{product.discount}%</Badge>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Você economiza {formatCurrency(product.price - basePrice)}
                    </p>
                  </div>
                ) : (
                  <span className="text-2xl lg:text-4xl font-light text-gray-900">
                    {formatCurrency(product.price || 0)}
                  </span>
                )}
              </div>
            </div>

            <div>
              {/* Seção: Personalizações dos Itens (agrupar por item) */}
              <h3 className="font-medium text-gray-900 mb-2">
                Personalizações dos Itens
              </h3>
              <div className="space-y-4 mb-6">
                {components && components.length > 0 ? (
                  components.map((item) => {
                    const customizations = (item as Item).customizations || [];
                    return (
                      <div
                        key={item.id}
                        className="rounded-md bg-white p-3 border"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800">
                            {item.name}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {item.allows_customization
                              ? "Permite personalização"
                              : "Sem personalização"}
                          </span>
                        </div>

                        {customizations && customizations.length > 0 ? (
                          <ul className="mt-3 space-y-2">
                            {customizations.map((c: Customization) => {
                              const map = (() => {
                                switch (c.type) {
                                  case "BASE_LAYOUT":
                                    return {
                                      label: "Layout 3D",
                                      color: "bg-purple-500",
                                    };
                                  case "TEXT":
                                    return {
                                      label: "Texto",
                                      color: "bg-blue-500",
                                    };
                                  case "IMAGES":
                                    return {
                                      label: "Imagens",
                                      color: "bg-green-500",
                                    };
                                  case "MULTIPLE_CHOICE":
                                    return {
                                      label: "Múltipla Escolha",
                                      color: "bg-yellow-500",
                                    };
                                  default:
                                    return {
                                      label: c.type || "Personalização",
                                      color: "bg-gray-500",
                                    };
                                }
                              })();

                              return (
                                <li
                                  key={c.id}
                                  className="flex items-start justify-between gap-4 p-3 rounded-md border border-border bg-muted/10"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {c.name}
                                        {c.isRequired && (
                                          <span className="text-red-500 ml-1">
                                            *
                                          </span>
                                        )}
                                      </span>
                                      <Badge className={map.color}>
                                        {map.label}
                                      </Badge>
                                      {typeof c.price === "number" &&
                                        c.price > 0 && (
                                          <span className="text-xs text-emerald-600 font-medium ml-2">
                                            +{formatCurrency(c.price)}
                                          </span>
                                        )}
                                    </div>
                                    {c.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {c.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Item: {item.name}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground italic mt-2">
                            Sem customizações disponíveis
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum componente encontrado para este produto.
                  </p>
                )}
              </div>

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
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart || isUploading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
              size="lg"
            >
              {addingToCart ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Adicionando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Adicionar por {formatCurrency(totalPriceForQuantity)}
                </>
              )}
            </Button>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Descrição do Produto
            </h3>
            <div className="prose">
              {product.description ? (
                <div
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-gray-500 italic">Sem descrição.</p>
              )}
            </div>
          </div>

          <div className="">
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
          </div>
        </div>
        <div className="w-full mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Produtos relacionados
          </h2>
          <div className="w-full text-center">
            {product.related_products && product.related_products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {product.related_products.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    props={{
                      id: relatedProduct.id,
                      name: relatedProduct.name,
                      image_url: relatedProduct.image_url || "/placeholder.svg",
                      price: relatedProduct.price,
                      discount: relatedProduct.discount,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-center">
                Nenhum produto relacionado encontrado.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProductPage;
