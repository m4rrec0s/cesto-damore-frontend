"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Loader2 } from "lucide-react";

import {
  FeedSection,
  FeedSectionType,
  FEED_SECTION_TYPE_LABELS,
  CreateFeedSectionInput,
  UpdateFeedSectionInput,
} from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useApi } from "@/app/hooks/use-api";

interface SectionsTabProps {
  configurationId: string;
  sections: FeedSection[];
  onUpdate: () => void;
}

interface SectionFormData {
  title: string;
  section_type: FeedSectionType;
  is_visible: boolean;
  max_items: number;
}

export default function SectionsTab({
  configurationId,
  sections,
  onUpdate,
}: SectionsTabProps) {
  const api = useApi();
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<FeedSection | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SectionFormData>({
    title: "",
    section_type: FeedSectionType.RECOMMENDED_PRODUCTS,
    is_visible: true,
    max_items: 6,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      section_type: FeedSectionType.RECOMMENDED_PRODUCTS,
      is_visible: true,
      max_items: 6,
    });
    setEditingSection(null);
    setShowForm(false);
  };

  const handleEdit = (section: FeedSection) => {
    setFormData({
      title: section.title,
      section_type: section.section_type,
      is_visible: section.is_visible,
      max_items: section.max_items || 6,
    });
    setEditingSection(section);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Por favor, preencha o título da seção");
      return;
    }

    setLoading(true);

    try {
      if (editingSection) {
        await api.updateFeedSection(editingSection.id, {
          title: formData.title,
          section_type: formData.section_type,
          is_visible: formData.is_visible,
          max_items: formData.max_items,
        } as UpdateFeedSectionInput);
        alert("Seção atualizada com sucesso!");
      } else {
        await api.createFeedSection({
          feed_config_id: configurationId,
          title: formData.title,
          section_type: formData.section_type,
          is_visible: formData.is_visible,
          display_order: sections.length,
          max_items: formData.max_items,
        } as CreateFeedSectionInput);
        alert("Seção criada com sucesso!");
      }

      resetForm();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar seção:", error);
      alert("Erro ao salvar seção.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta seção?")) {
      return;
    }

    try {
      await api.deleteFeedSection(sectionId);
      alert("Seção excluída com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir seção:", error);
      alert("Erro ao excluir seção.");
    }
  };

  const getSectionTypeDescription = (type: FeedSectionType): string => {
    const descriptions: Record<FeedSectionType, string> = {
      [FeedSectionType.RECOMMENDED_PRODUCTS]:
        "Produtos recomendados automaticamente",
      [FeedSectionType.DISCOUNTED_PRODUCTS]: "Produtos com desconto ativo",
      [FeedSectionType.FEATURED_CATEGORIES]: "Categorias em destaque",
      [FeedSectionType.FEATURED_ADDITIONALS]: "Adicionais em destaque",
      [FeedSectionType.CUSTOM_PRODUCTS]: "Produtos selecionados manualmente",
      [FeedSectionType.NEW_ARRIVALS]: "Produtos mais recentes",
      [FeedSectionType.BEST_SELLERS]: "Produtos mais vendidos",
    };
    return descriptions[type] || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Seções do Feed</h3>
          <p className="text-sm text-muted-foreground">
            Configure as seções que aparecerão na página inicial. Cada seção
            mostra até 6 itens.
          </p>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Seção
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">
              {editingSection ? "Editar Seção" : "Nova Seção"}
            </h4>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Fechar formulário"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Seção */}
            <div className="space-y-2">
              <label
                htmlFor="section_type"
                className="block text-sm font-medium"
              >
                Tipo de Seção *
              </label>
              <select
                id="section_type"
                value={formData.section_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    section_type: e.target.value as FeedSectionType,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.entries(FEED_SECTION_TYPE_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
              <p className="text-xs text-gray-500">
                {getSectionTypeDescription(formData.section_type)}
              </p>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Título *</label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Promoções da Semana"
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500">
                Este título aparecerá acima da seção na página inicial
              </p>
            </div>

            {/* Máximo de Itens */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Máximo de Itens
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.max_items}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_items: parseInt(e.target.value) || 6,
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Quantidade máxima de itens a serem exibidos nesta seção (1-20)
              </p>
            </div>

            {/* Informações automáticas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-900 mb-2">
                ℹ️ Configuração da Seção
              </p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Configure quantos itens deseja exibir (entre 1 e 20)</li>
                <li>
                  Para seções automáticas, os produtos são selecionados
                  dinamicamente
                </li>
                <li>
                  Para <strong>Produtos Personalizados</strong>, você pode
                  escolher manualmente os produtos
                </li>
              </ul>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <input
                id="is_visible"
                type="checkbox"
                checked={formData.is_visible}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_visible: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_visible" className="text-sm font-medium">
                Seção visível
              </label>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={resetForm}
                variant="outline"
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span>{editingSection ? "Atualizar" : "Criar"} Seção</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de seções */}
      {!showForm && (
        <div className="grid gap-4">
          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma seção configurada
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira seção para organizar o conteúdo da página
                inicial
              </p>
            </div>
          ) : (
            sections
              .sort((a, b) => a.display_order - b.display_order)
              .map((section) => (
                <div
                  key={section.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{section.title}</h4>
                        {section.is_visible ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                            <Eye className="h-3 w-3" />
                            Visível
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                            <EyeOff className="h-3 w-3" />
                            Oculta
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {FEED_SECTION_TYPE_LABELS[section.section_type]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getSectionTypeDescription(section.section_type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Máximo de itens: <strong>{section.max_items}</strong>
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(section)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(section.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
