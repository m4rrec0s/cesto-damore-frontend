"use client";
import { Additional, useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { ImageUpload } from "../../components/ui/image-upload";
import { Plus, Search, Edit2, Trash2, Link2, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AdditionalManagerProps {
  additionals: Additional[];
  onUpdate: () => void;
}

interface AdditionalForm {
  name: string;
  description: string;
  price: number;
  image_url: string;
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
  const [formData, setFormData] = useState<AdditionalForm>({
    name: "",
    description: "",
    price: 0,
    image_url: "",
  });

  const filteredAdditionals = additionals.filter(
    (additional) =>
      additional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      additional.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (additional?: Additional) => {
    if (additional) {
      setEditingAdditional(additional);
      setFormData({
        name: additional.name,
        description: additional.description || "",
        price: additional.price,
        image_url: additional.image_url || "",
      });
    } else {
      setEditingAdditional(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        image_url: "",
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
      image_url: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAdditional) {
        await api.updateAdditional(editingAdditional.id, formData);
      } else {
        await api.createAdditional(formData);
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

      {/* Additionals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdditionals.map((additional) => (
          <div
            key={additional.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="aspect-video bg-gray-100 relative">
              {additional.image_url ? (
                <Image
                  src={additional.image_url}
                  alt={additional.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Upload className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">
                  {additional.name}
                </h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(additional)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(additional.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {additional.description || "Sem descrição"}
              </p>

              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-green-600">
                  {additional.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Vincular
                </Button>
              </div>
            </div>
          </div>
        ))}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAdditional ? "Editar Adicional" : "Novo Adicional"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Nome do adicional"
                    aria-label="Nome do adicional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    aria-label="Preço do adicional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem do Adicional
                </label>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: url,
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Descrição do adicional..."
                  aria-label="Descrição do adicional"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {loading
                    ? "Salvando..."
                    : editingAdditional
                    ? "Atualizar"
                    : "Criar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
