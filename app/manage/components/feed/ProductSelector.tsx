"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, Package } from "lucide-react";
import { useApi, Product, FeedSectionItem } from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import Image from "next/image";
import { getInternalImageUrl } from "@/lib/image-helper";

interface ProductSelectorProps {
  sectionId: string;
  selectedItems: FeedSectionItem[];
  onUpdate: () => void;
}

export default function ProductSelector({
  sectionId,
  selectedItems,
  onUpdate,
}: ProductSelectorProps) {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({ perPage: 100 });
      setProducts(response.products);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      alert("Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase());

    const isAlreadySelected = selectedItems.some(
      (item) => item.item_id === product.id
    );

    return matchesSearch && !isAlreadySelected;
  });

  const handleAddProduct = async (productId: string) => {
    try {
      setAdding(true);

      await api.createFeedSectionItem({
        feed_section_id: sectionId,
        item_type: "product",
        item_id: productId,
        display_order: selectedItems.length,
        is_featured: false,
      });

      alert("Produto adicionado com sucesso!");
      onUpdate();
      setSearchTerm("");
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Erro ao adicionar produto.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveProduct = async (itemId: string) => {
    if (!confirm("Deseja remover este produto da seção?")) {
      return;
    }

    try {
      await api.deleteFeedSectionItem(itemId);
      alert("Produto removido com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      alert("Erro ao remover produto.");
    }
  };

  const getProductById = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  return (
    <div className="space-y-4">
      {/* Produtos selecionados */}
      <div>
        <h4 className="text-sm font-semibold mb-3">
          Produtos Selecionados ({selectedItems.length})
        </h4>

        {selectedItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Nenhum produto selecionado ainda
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item) => {
              const product = getProductById(item.item_id);
              if (!product) return null;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                >
                  {/* Imagem do produto */}
                  {product.image_url && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      <Image
                        src={getInternalImageUrl(product.image_url)}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm truncate">
                      {product.name}
                    </h5>
                    <p className="text-xs text-gray-500">
                      R$ {product.price.toFixed(2)}
                      {product.discount && product.discount > 0 && (
                        <span className="ml-2 text-green-600">
                          -{product.discount}%
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Botão remover */}
                  <button
                    onClick={() => handleRemoveProduct(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Remover produto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adicionar produtos */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Adicionar Produtos</h4>

        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome ou ID do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de produtos disponíveis */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-500">Carregando produtos...</p>
          </div>
        ) : searchTerm && filteredProducts.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Nenhum produto encontrado</p>
          </div>
        ) : searchTerm && filteredProducts.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
            {filteredProducts.slice(0, 10).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
              >
                {/* Imagem */}
                {product.image_url && (
                  <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={getInternalImageUrl(product.image_url)}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-sm truncate">
                    {product.name}
                  </h5>
                  <p className="text-xs text-gray-500">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>

                {/* Botão adicionar */}
                <Button
                  size="sm"
                  onClick={() => handleAddProduct(product.id)}
                  disabled={adding}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {filteredProducts.length > 10 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Mostrando 10 de {filteredProducts.length} resultados. Refine sua
                busca para ver mais.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Digite para buscar produtos disponíveis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
