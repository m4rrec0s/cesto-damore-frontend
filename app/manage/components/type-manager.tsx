"use client";

import { useState } from "react";
import { Type as ProductType, useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { Plus, Search, Edit2, Trash2, Grid3X3 } from "lucide-react";

interface TypeManagerProps {
  types: ProductType[];
  onUpdate: () => void;
}

interface TypeForm {
  name: string;
}

export function TypeManager({ types, onUpdate }: TypeManagerProps) {
  const api = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TypeForm>({
    name: "",
  });

  const filteredTypes = types.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (type?: ProductType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({
      name: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingType) {
        await api.updateType(editingType.id, formData);
      } else {
        await api.createType(formData);
      }
      handleCloseModal();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar tipo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm("Tem certeza que deseja excluir este tipo?")) return;

    setLoading(true);
    try {
      await api.deleteType(typeId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir tipo:", error);
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
            placeholder="Buscar tipos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            aria-label="Buscar tipos"
          />
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {/* Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Grid3X3 className="h-4 w-4 text-purple-600" />
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(type)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(type.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <h3 className="font-medium text-gray-900 text-sm">{type.name}</h3>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTypes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Grid3X3 className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum tipo encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Tente ajustar o termo de busca"
              : "Comece criando seu primeiro tipo de produto"}
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingType ? "Editar Tipo" : "Novo Tipo"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  placeholder="Nome do tipo"
                  aria-label="Nome do tipo"
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
                    : editingType
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
