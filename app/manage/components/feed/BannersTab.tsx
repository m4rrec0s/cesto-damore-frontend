"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

import {
  FeedBanner,
  CreateFeedBannerInput,
  UpdateFeedBannerInput,
} from "../../types/feed";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ColorPicker } from "@/app/components/ui/color-picker";
import { Toggle } from "@/app/components/ui/toggle";
import { cn } from "@/app/lib/utils";
import { useApi } from "@/app/hooks/use-api";
import Image from "next/image";

interface BannersTabProps {
  configurationId: string;
  banners: FeedBanner[];
  onUpdate: () => void;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  text_color: string;
  is_active: boolean;
  imageFile?: File;
}

export default function BannersTab({
  configurationId,
  banners,
  onUpdate,
}: BannersTabProps) {
  const api = useApi();
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<FeedBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<BannerFormData>({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    text_color: "#FFFFFF",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      image_url: "",
      link_url: "",
      text_color: "#FFFFFF",
      is_active: true,
    });
    setImagePreview(null);
    setEditingBanner(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Armazena o arquivo para enviar junto com o formulário
    setUploadingImage(true);
    setImagePreview(URL.createObjectURL(file));

    // Guarda o arquivo no estado (será enviado no submit)
    setFormData((prev) => ({
      ...prev,
      imageFile: file,
    }));

    setUploadingImage(false);
  };

  const handleEdit = (banner: FeedBanner) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      text_color: banner.text_color || "#FFFFFF",
      is_active: banner.is_active,
    });
    setImagePreview(banner.image_url);
    setEditingBanner(banner);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Por favor, preencha o título do banner");
      return;
    }

    if (!formData.imageFile && !formData.image_url) {
      alert("Por favor, faça upload de uma imagem");
      return;
    }

    setLoading(true);

    try {
      if (editingBanner) {
        // Ao editar, enviar o arquivo se houver um novo
        await api.updateFeedBanner(
          editingBanner.id,
          {
            title: formData.title,
            subtitle: formData.subtitle,
            link_url: formData.link_url,
            text_color: formData.text_color,
            is_active: formData.is_active,
          } as UpdateFeedBannerInput,
          formData.imageFile
        );
        alert("Banner atualizado com sucesso!");
      } else {
        // Ao criar, o arquivo é obrigatório
        if (!formData.imageFile) {
          alert("Por favor, selecione uma imagem");
          return;
        }

        await api.createFeedBanner(
          {
            feed_config_id: configurationId,
            title: formData.title,
            subtitle: formData.subtitle,
            link_url: formData.link_url,
            text_color: formData.text_color,
            is_active: formData.is_active,
            display_order: banners.length,
          } as CreateFeedBannerInput,
          formData.imageFile
        );
        alert("Banner criado com sucesso!");
      }

      resetForm();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar banner:", error);
      alert("Erro ao salvar banner.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) {
      return;
    }

    try {
      await api.deleteFeedBanner(bannerId);
      alert("Banner excluído com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir banner:", error);
      alert("Erro ao excluir banner.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Banners do Feed</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os banners que aparecerão no topo da página inicial
          </p>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Banner
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">
              {editingBanner ? "Editar Banner" : "Novo Banner"}
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
            {/* Upload de Imagem */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Imagem do Banner *
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                {imagePreview ? (
                  <div className="relative w-full h-48 mb-4">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Clique para fazer upload da imagem
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="banner-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="banner-upload"
                  className={cn(
                    "inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200",
                    uploadingImage && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploadingImage ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span>
                      {imagePreview ? "Trocar Imagem" : "Selecionar Imagem"}
                    </span>
                  )}
                </label>
              </div>
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
                placeholder="Ex: Promoção de Natal"
                className="w-full"
                required
              />
            </div>

            {/* Subtítulo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Subtítulo (opcional)
              </label>
              <Input
                type="text"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                placeholder="Ex: Até 50% de desconto em cestas selecionadas"
                className="w-full"
              />
            </div>

            {/* Link do Banner */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4" />
                Link do Banner (opcional)
              </label>
              <Input
                type="text"
                value={formData.link_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    link_url: e.target.value,
                  }))
                }
                placeholder="/produtos ou https://..."
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                URL para onde o usuário será redirecionado ao clicar no banner
              </p>
            </div>

            {/* Cor do Texto */}
            <ColorPicker
              label="Cor do Texto"
              value={formData.text_color}
              onChange={(color) =>
                setFormData((prev) => ({ ...prev, text_color: color }))
              }
            />

            {/* Status */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <label htmlFor="is_active" className="text-sm font-medium">
                  Banner ativo
                </label>
                <p className="text-xs text-gray-500">
                  Banners ativos serão exibidos na página inicial
                </p>
              </div>
              <Toggle
                id="is_active"
                pressed={formData.is_active}
                onPressedChange={(pressed) =>
                  setFormData((prev) => ({ ...prev, is_active: pressed }))
                }
                aria-label="Ativar banner"
              >
                {formData.is_active ? "Ativo" : "Inativo"}
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
                disabled={loading || uploadingImage}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span>{editingBanner ? "Atualizar" : "Criar"} Banner</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de banners */}
      {!showForm && (
        <div className="grid gap-4">
          {banners.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum banner configurado
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro banner para exibir na página inicial
              </p>
            </div>
          ) : (
            banners
              .sort((a, b) => a.display_order - b.display_order)
              .map((banner) => (
                <div
                  key={banner.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      <Image
                        src={banner.image_url || "/banner-placeholder.png"}
                        alt={banner.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{banner.title}</h4>
                            {banner.is_active ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                <Eye className="h-3 w-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                                <EyeOff className="h-3 w-3" />
                                Inativo
                              </span>
                            )}
                          </div>
                          {banner.subtitle && (
                            <p className="text-sm text-gray-600 mb-2">
                              {banner.subtitle}
                            </p>
                          )}
                          {banner.link_url && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              Link: {banner.link_url}
                            </p>
                          )}
                          {banner.text_color && (
                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span>Cor do texto:</span>
                              <span
                                className="inline-block w-4 h-4 rounded border border-gray-300"
                                style={{ backgroundColor: banner.text_color }}
                              />
                              <span className="font-mono">
                                {banner.text_color}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEdit(banner)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(banner.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
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
