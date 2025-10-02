"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  FeedSection,
  FeedSectionType,
  FEED_SECTION_TYPE_LABELS,
  CreateFeedSectionInput,
  UpdateFeedSectionInput,
} from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Toggle } from "@/app/components/ui/toggle";
import { useApi } from "@/app/hooks/use-api";
import ProductSelector from "./ProductSelector";

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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

  // Configuração do drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reordenar localmente
    const reorderedSections = arrayMove(sections, oldIndex, newIndex);

    // Atualizar display_order no backend
    try {
      const updatePromises = reorderedSections.map((section, index) =>
        api.updateFeedSection(section.id, { display_order: index })
      );

      await Promise.all(updatePromises);
      onUpdate();
    } catch (error) {
      console.error("Erro ao reordenar seções:", error);
      alert("Erro ao reordenar seções.");
    }
  };

  // Componente interno para tornar cada seção draggable
  function SortableSectionCard({ section }: { section: FeedSection }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isExpanded = expandedSection === section.id;
    const isCustomProducts =
      section.section_type === FeedSectionType.CUSTOM_PRODUCTS;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="border rounded-lg bg-white hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              title="Arrastar para reordenar"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Conteúdo */}
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
                {isCustomProducts && section.items && (
                  <span className="ml-2">
                    • {section.items.length} produtos selecionados
                  </span>
                )}
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {isCustomProducts && (
                <button
                  onClick={() =>
                    setExpandedSection(isExpanded ? null : section.id)
                  }
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                  title={isExpanded ? "Ocultar produtos" : "Gerenciar produtos"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
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

        {/* Painel expansível com ProductSelector */}
        {isExpanded && isCustomProducts && (
          <div className="border-t bg-gray-50 p-4">
            <ProductSelector
              sectionId={section.id}
              selectedItems={section.items || []}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>
    );
  }

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
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <label htmlFor="is_visible" className="text-sm font-medium">
                  Seção visível
                </label>
                <p className="text-xs text-gray-500">
                  Seções visíveis aparecerão na página inicial
                </p>
              </div>
              <Toggle
                id="is_visible"
                pressed={formData.is_visible}
                onPressedChange={(pressed) =>
                  setFormData((prev) => ({ ...prev, is_visible: pressed }))
                }
                aria-label="Tornar seção visível"
              >
                {formData.is_visible ? "Visível" : "Oculta"}
              </Toggle>
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
        <div className="space-y-4">
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sections
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((section) => (
                      <SortableSectionCard key={section.id} section={section} />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
