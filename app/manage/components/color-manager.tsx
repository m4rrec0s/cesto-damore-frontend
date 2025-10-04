"use client";

import { Color, useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { Plus, Search, Edit2, Trash2, Palette, X, Check } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";

interface ColorManagerProps {
  colors: Color[];
  onUpdate: () => void;
}

interface ColorForm {
  name: string;
  hex_code: string;
}

export function ColorManager({ colors, onUpdate }: ColorManagerProps) {
  const api = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ColorForm>({
    name: "",
    hex_code: "#000000",
  });

  const filteredColors = colors.filter((color) =>
    color.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (color?: Color) => {
    if (color) {
      setEditingColor(color);
      setFormData({
        name: color.name,
        hex_code: color.hex_code,
      });
    } else {
      setEditingColor(null);
      setFormData({
        name: "",
        hex_code: "#000000",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingColor(null);
    setFormData({
      name: "",
      hex_code: "#000000",
    });
  };

  const isValidHexCode = (hex: string): boolean => {
    const hexPattern = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(hex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    if (!formData.name.trim()) {
      toast.error("Nome da cor é obrigatório");
      return;
    }

    if (!isValidHexCode(formData.hex_code)) {
      toast.error("Código hexadecimal inválido. Use formato #RRGGBB ou #RGB");
      return;
    }

    setLoading(true);

    try {
      const colorData = {
        name: formData.name.trim(),
        hex_code: formData.hex_code.toUpperCase(),
      };

      if (editingColor) {
        await api.updateColor(editingColor.id, colorData);
        toast.success("Cor atualizada com sucesso!");
      } else {
        await api.createColor(colorData);
        toast.success("Cor criada com sucesso!");
      }

      handleCloseModal();
      onUpdate();
    } catch (error: unknown) {
      console.error("Erro ao salvar cor:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao salvar cor";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (colorId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta cor?")) return;

    setLoading(true);
    try {
      await api.deleteColor(colorId);
      toast.success("Cor deletada com sucesso!");
      onUpdate();
    } catch (error: unknown) {
      console.error("Erro ao excluir cor:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao excluir cor. Ela pode estar em uso.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cores pré-definidas populares
  const popularColors = [
    { name: "Vermelho", hex: "#FF0000" },
    { name: "Rosa", hex: "#FFC0CB" },
    { name: "Azul", hex: "#0000FF" },
    { name: "Verde", hex: "#00FF00" },
    { name: "Amarelo", hex: "#FFFF00" },
    { name: "Roxo", hex: "#800080" },
    { name: "Laranja", hex: "#FFA500" },
    { name: "Preto", hex: "#000000" },
    { name: "Branco", hex: "#FFFFFF" },
    { name: "Dourado", hex: "#FFD700" },
    { name: "Prata", hex: "#C0C0C0" },
    { name: "Marrom", hex: "#8B4513" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-label="Buscar cores"
          />
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Cor
        </Button>
      </div>

      {/* Colors Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Visualização</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Código Hex</TableHead>
              <TableHead className="text-center">Em Uso</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredColors.map((color) => (
              <TableRow key={color.id}>
                <TableCell>
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                    style={{ backgroundColor: color.hex_code }}
                    title={color.name}
                  />
                </TableCell>
                <TableCell className="font-medium">{color.name}</TableCell>
                <TableCell>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {color.hex_code}
                  </code>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-gray-500 text-sm">-</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(color)}
                      className="h-8 w-8 p-0"
                      title="Editar cor"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(color.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Deletar cor"
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
      {filteredColors.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Palette className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma cor encontrada
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Tente ajustar o termo de busca"
              : "Comece criando sua primeira cor"}
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Cor
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingColor ? "Editar Cor" : "Nova Cor"}
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">
                    {editingColor
                      ? "Atualize as informações da cor"
                      : "Crie uma nova cor para seus adicionais"}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  aria-label="Fechar modal"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]"
            >
              {/* Preview da cor */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-2xl mx-auto mb-4 transition-all duration-300"
                    style={{ backgroundColor: formData.hex_code }}
                  />
                  <p className="text-sm font-medium text-gray-700">
                    Pré-visualização
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.hex_code}
                  </p>
                </div>
              </div>

              {/* Nome da cor */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nome da Cor *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Ex: Vermelho Vivo, Azul Claro..."
                />
              </div>

              {/* Código hexadecimal */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Código Hexadecimal *
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.hex_code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hex_code: e.target.value,
                      }))
                    }
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    aria-label="Seletor de cor"
                    title="Escolher cor"
                  />
                  <input
                    type="text"
                    required
                    value={formData.hex_code}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith("#")) {
                        value = "#" + value;
                      }
                      setFormData((prev) => ({ ...prev, hex_code: value }));
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                    placeholder="#RRGGBB"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Formato: #RRGGBB (ex: #FF0000) ou #RGB (ex: #F00)
                </p>
              </div>

              {/* Cores populares */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cores Populares
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {popularColors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: prev.name || color.name,
                          hex_code: color.hex,
                        }))
                      }
                      className="aspect-square rounded-lg border-2 border-gray-300 hover:border-purple-400 hover:scale-110 transition-all relative group"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {formData.hex_code === color.hex && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de ação */}
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
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </div>
                  ) : (
                    <>{editingColor ? "Atualizar Cor" : "Criar Cor"}</>
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
