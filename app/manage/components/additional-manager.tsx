"use client";
import { Additional, Color, useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { ImageUpload } from "../../components/ui/image-upload";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  Palette,
  X,
  Package,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface AdditionalManagerProps {
  additionals: Additional[];
  onUpdate: () => void;
}

interface AdditionalForm {
  name: string;
  description: string;
  price: number;
  discount: number;
  stock_quantity: number;
  image_url: string;
  imageFile?: File;
  colors: Array<{
    color_id: string;
    stock_quantity: number;
    color_name: string;
    color_hex_code: string;
  }>;
}

export function AdditionalManager({
  additionals,
  onUpdate,
}: AdditionalManagerProps) {
  const api = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdditional, setEditingAdditional] = useState<Additional | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [formData, setFormData] = useState<AdditionalForm>({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    stock_quantity: 0,
    image_url: "",
    imageFile: undefined,
    colors: [],
  });

  // Carregar cores disponíveis
  useEffect(() => {
    const loadColors = async () => {
      setLoadingColors(true);
      try {
        const colors = await api.getColors();
        setAvailableColors(colors);
      } catch (error) {
        console.error("Erro ao carregar cores:", error);
      } finally {
        setLoadingColors(false);
      }
    };
    loadColors();
  }, [api]);

  const filteredAdditionals = additionals.filter(
    (additional) =>
      additional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      additional.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFinalPrice = (price: number, discount: number = 0) => {
    return price * (1 - discount / 100);
  };

  const getDiscountAmount = (price: number, discount: number = 0) => {
    return price * (discount / 100);
  };

  const handleOpenModal = (additional?: Additional) => {
    if (additional) {
      setEditingAdditional(additional);
      setFormData({
        name: additional.name,
        description: additional.description || "",
        price: additional.price,
        discount: additional.discount || 0,
        image_url: additional.image_url || "",
        imageFile: undefined,
        colors: additional.colors || [],
        stock_quantity: additional.stock_quantity || 0,
      });
    } else {
      setEditingAdditional(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        discount: 0,
        image_url: "",
        imageFile: undefined,
        colors: [],
        stock_quantity: 0,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdditional(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      discount: 0,
      image_url: "",
      imageFile: undefined,
      colors: [],
      stock_quantity: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { imageFile, ...additionalData } = formData;
      if (editingAdditional) {
        await api.updateAdditional(
          editingAdditional.id,
          additionalData,
          imageFile
        );
      } else {
        await api.createAdditional(additionalData, imageFile);
      }
      handleCloseModal();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar adicional:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (additionalId: string) => {
    if (!confirm("Tem certeza que deseja excluir este adicional?")) return;

    setLoading(true);
    try {
      await api.deleteAdditional(additionalId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir adicional:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar adicionais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-label="Buscar adicionais"
          />
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Adicional
        </Button>
      </div>

      {/* Additionals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Preço Final</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="text-center">Cores</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdditionals.map((additional) => (
              <TableRow key={additional.id}>
                <TableCell>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {additional.image_url ? (
                      <Image
                        src={additional.image_url}
                        alt={additional.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{additional.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {additional.description || "Sem descrição"}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {additional.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {additional.discount ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                      {additional.discount}%
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  {getFinalPrice(
                    additional.price,
                    additional.discount
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell className="text-center">
                  {additional.colors && additional.colors.length > 0 ? (
                    <div className="flex flex-col items-center gap-1">
                      {additional.colors.map((color) => (
                        <div
                          key={color.color_id}
                          className="flex items-center gap-1 text-xs"
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.color_hex_code }}
                          />
                          <span className="text-gray-600">
                            {color.stock_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (additional.stock_quantity || 0) > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {additional.stock_quantity || 0}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {additional.colors && additional.colors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {additional.colors.map((color) => (
                        <div
                          key={color.color_id}
                          className="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: color.color_hex_code }}
                          title={color.color_name}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(additional)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(additional.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {filteredAdditionals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Plus className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum adicional encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Tente ajustar o termo de busca"
              : "Comece criando seu primeiro adicional"}
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Adicional
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                {editingAdditional ? "Editar Adicional" : "Novo Adicional"}
              </h2>
              <p className="text-orange-100 text-sm mt-1">
                {editingAdditional
                  ? "Atualize as informações do adicional"
                  : "Preencha os dados para criar um novo adicional"}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]"
            >
              {/* Seção Principal */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  Informações Principais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nome do Adicional *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Digite o nome do adicional"
                      aria-label="Nome do adicional"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Preços */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Preços e Descontos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preço Original (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price === 0 ? "" : String(formData.price)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cleaned =
                          raw.startsWith("0") && !raw.startsWith("0.")
                            ? raw.replace(/^0+/, "")
                            : raw;
                        setFormData((prev) => ({
                          ...prev,
                          price: cleaned === "" ? 0 : parseFloat(cleaned),
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      aria-label="Preço do adicional"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={
                        formData.discount === 0 ? "" : String(formData.discount)
                      }
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          discount: Math.min(100, Math.max(0, value)),
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      aria-label="Desconto do adicional"
                    />
                    {formData.discount > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200 mt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Preço final:</span>
                          <span className="font-bold text-green-600">
                            {getFinalPrice(
                              formData.price,
                              formData.discount
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600">Economia:</span>
                          <span className="font-medium text-red-500">
                            -
                            {getDiscountAmount(
                              formData.price,
                              formData.discount
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção de Imagem */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Imagem do Adicional
                </h3>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url, file) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: url,
                      imageFile: file,
                    }))
                  }
                  onRemove={() =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: "",
                      imageFile: undefined,
                    }))
                  }
                  className="w-full"
                />
              </div>

              {/* Seção de Estoque */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Package className="h-5 w-5 text-indigo-500 mr-2" />
                  Controle de Estoque
                </h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Estoque Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        stock_quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Quantidade em estoque"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se você adicionar cores, o estoque será gerenciado
                    individualmente por cor.
                  </p>
                </div>
              </div>

              {/* Seção de Cores */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Palette className="h-5 w-5 text-pink-500 mr-2" />
                  Cores Disponíveis (Opcional)
                </h3>

                {loadingColors ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">
                      Carregando cores...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Lista de cores selecionadas */}
                    {formData.colors.length > 0 && (
                      <div className="bg-white rounded-lg border border-pink-200 p-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Cores Selecionadas:
                        </p>
                        {formData.colors.map((colorItem, index) => (
                          <div
                            key={colorItem.color_id}
                            className="flex items-center gap-3 bg-gray-50 rounded-lg p-2"
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
                              style={{
                                backgroundColor: colorItem.color_hex_code,
                              }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {colorItem.color_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {colorItem.color_hex_code}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={colorItem.stock_quantity}
                              onChange={(e) => {
                                const newColors = [...formData.colors];
                                newColors[index].stock_quantity =
                                  parseInt(e.target.value) || 0;
                                setFormData((prev) => ({
                                  ...prev,
                                  colors: newColors,
                                }));
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Estoque"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newColors = formData.colors.filter(
                                  (_, i) => i !== index
                                );
                                setFormData((prev) => ({
                                  ...prev,
                                  colors: newColors,
                                }));
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Remover cor"
                              aria-label="Remover cor"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Seletor de novas cores */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Adicionar Cor:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {availableColors
                          .filter(
                            (color) =>
                              !formData.colors.some(
                                (c) => c.color_id === color.id
                              )
                          )
                          .map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  colors: [
                                    ...prev.colors,
                                    {
                                      color_id: color.id,
                                      color_name: color.name,
                                      color_hex_code: color.hex_code,
                                      stock_quantity: 0,
                                    },
                                  ],
                                }));
                              }}
                              className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg hover:border-pink-400 hover:bg-pink-50 transition-all"
                            >
                              <div
                                className="w-6 h-6 rounded-full border-2 border-gray-300"
                                style={{ backgroundColor: color.hex_code }}
                              />
                              <span className="text-sm text-gray-700">
                                {color.name}
                              </span>
                            </button>
                          ))}
                      </div>
                      {availableColors.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Nenhuma cor cadastrada no sistema. Crie cores primeiro
                          na página de gerenciamento.
                        </p>
                      ) : (
                        availableColors.filter(
                          (color) =>
                            !formData.colors.some(
                              (c) => c.color_id === color.id
                            )
                        ).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            Todas as cores disponíveis foram adicionadas.
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de Descrição */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Descrição
                </h3>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Descreva o adicional detalhadamente..."
                  aria-label="Descrição do adicional"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="flex-1 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </div>
                  ) : (
                    <>
                      {editingAdditional
                        ? "Atualizar Adicional"
                        : "Criar Adicional"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
