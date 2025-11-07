"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Upload,
  X,
  Type,
  CheckCircle2,
  Palette,
  Loader2,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CustomizationType,
  type CustomizationInput,
} from "@/app/types/customization";
import type {
  LayoutBase,
  ImageData,
  SlotDef,
} from "@/app/types/personalization";
import { getDirectImageUrl } from "@/app/helpers/drive-normalize";
import ClientPersonalizationEditor from "@/app/components/client-personalization-editor";
import useApi from "@/app/hooks/use-api";
import { ImageCropDialog } from "@/app/components/ui/image-crop-dialog";

interface Customization {
  id: string;
  name: string;
  description?: string;
  type: "BASE_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  isRequired: boolean;
  price: number;
  customization_data: {
    layouts?: Array<{
      id: string;
      name: string;
      model_url?: string;
      image_url?: string;
      slots?: SlotDef[];
    }>;
    fields?: Array<{
      id: string;
      label: string;
      placeholder?: string;
      max_length?: number;
    }>;
    base_layout?: {
      max_images: number;
      min_width?: number;
      min_height?: number;
      max_file_size_mb?: number;
      accepted_formats?: string[];
    };
    options?: Array<{
      id: string;
      label: string;
      value: string;
      price_adjustment?: number;
      image_url?: string;
      description?: string;
    }>;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  customizations: Customization[];
  onComplete: (hasCustomizations: boolean, data: CustomizationInput[]) => void;
  onPreviewChange?: (previewUrl: string | null) => void;
}

type ModalStep = "selection" | "editing";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function ItemCustomizationModal({
  isOpen,
  onClose,
  itemName,
  customizations,
  onComplete,
  onPreviewChange,
}: Props) {
  const [step, setStep] = useState<ModalStep>("selection");
  const [customizationData, setCustomizationData] = useState<
    Record<string, unknown>
  >({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File[]>>(
    {}
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullLayoutBase, setFullLayoutBase] = useState<LayoutBase | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<
    Record<string, boolean>
  >({});

  // 🔍 NOVO: Estado para layouts completos (com image_url)
  const [layoutsWithImages, setLayoutsWithImages] = useState<
    Record<
      string,
      { id: string; name: string; image_url: string; slots?: SlotDef[] }
    >
  >({});
  const [loadingLayouts, setLoadingLayouts] = useState(false);

  // Estados para crop de imagem
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [currentCustomizationId, setCurrentCustomizationId] = useState<
    string | null
  >(null);

  // Inicializar useApi hook
  const { getLayoutById } = useApi();

  // useEffect para buscar layouts completos quando modal abre
  useEffect(() => {
    if (!isOpen) return;

    const fetchLayouts = async () => {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (!baseLayoutCustom) return;

      const layouts = baseLayoutCustom.customization_data.layouts || [];
      if (layouts.length === 0) return;

      console.log(
        "🖼️ [fetchLayouts] Buscando layouts completos:",
        layouts.length
      );

      setLoadingLayouts(true);
      const fetchedLayouts: Record<
        string,
        { id: string; name: string; image_url: string; slots?: SlotDef[] }
      > = {};

      for (const layout of layouts) {
        try {
          console.log(`🔄 Buscando layout ${layout.id}...`);
          const fullLayout = await getLayoutById(layout.id);
          fetchedLayouts[layout.id] = {
            id: fullLayout.id,
            name: fullLayout.name,
            image_url: fullLayout.image_url,
            slots: fullLayout.slots,
          };
          console.log(`✅ Layout ${layout.id} carregado:`, {
            name: fullLayout.name,
            slotsCount: fullLayout.slots?.length || 0,
          });
        } catch (error) {
          console.error(`❌ Erro ao carregar layout ${layout.id}:`, error);
        }
      }

      setLayoutsWithImages(fetchedLayouts);
      setLoadingLayouts(false);
      console.log(
        "✅ [fetchLayouts] Todos layouts carregados:",
        fetchedLayouts
      );
    };

    fetchLayouts();
  }, [isOpen, customizations, getLayoutById]);

  // Callback para quando layout é selecionado - SEM useEffect!
  const handleLayoutSelect = useCallback(
    async (layoutId: string) => {
      setSelectedLayoutId(layoutId);
      setLoadingLayout(true);

      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (!baseLayoutCustom) return;

      const layout = baseLayoutCustom.customization_data.layouts?.find(
        (l) => l.id === layoutId
      );
      if (!layout) return;

      console.log("🎨 [handleLayoutSelect] Layout selecionado:", {
        layoutId,
        layoutName: layout.name,
        imageUrl: layout.image_url,
      });

      // Atualizar dados da customização
      setCustomizationData((prev) => ({
        ...prev,
        [baseLayoutCustom.id]: {
          layout_id: layoutId,
          layout_name: layout.name,
        },
      }));

      // Buscar layout completo com slots
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("appToken") || localStorage.getItem("token")
            : null;

        const response = await fetch(`${API_URL}/layouts/${layoutId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) throw new Error("Erro ao buscar layout");

        const layoutData: LayoutBase = await response.json();
        setFullLayoutBase(layoutData);

        const modelUrl =
          layoutData.item_type?.toLowerCase() === "caneca"
            ? "/3DModels/caneca.glb"
            : layoutData.item_type?.toLowerCase() === "quadro"
            ? "/3DModels/quadro.glb"
            : undefined;

        console.log("🎨 [handleLayoutSelect] Model URL determinado:", {
          itemType: layoutData.item_type,
          modelUrl,
        });

        setCustomizationData((prev) => ({
          ...prev,
          [baseLayoutCustom.id]: {
            ...((prev[baseLayoutCustom.id] as Record<string, unknown>) || {}),
            model_url: modelUrl,
            item_type: layoutData.item_type,
          },
        }));

        // Mudar para etapa de edição
        setStep("editing");
      } catch (err) {
        console.error("Erro ao carregar layout:", err);
        toast.error("Erro ao carregar detalhes do layout");
        setFullLayoutBase(null);
      } finally {
        setLoadingLayout(false);
      }
    },
    [customizations]
  );

  // Callback para quando a personalização é completada
  const handleLayoutComplete = useCallback(
    (images: ImageData[], previewUrl: string) => {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (!baseLayoutCustom) return;

      // Preservar dados existentes (incluindo model_url e layout_name)
      const existingData =
        (customizationData[baseLayoutCustom.id] as Record<string, unknown>) ||
        {};

      const updatedData = {
        ...customizationData,
        [baseLayoutCustom.id]: {
          ...existingData, // IMPORTANTE: preservar model_url e layout_name
          images,
          previewUrl,
        },
      };

      console.log("💾 [handleLayoutComplete] Dados salvos:", {
        existingData,
        newData: updatedData[baseLayoutCustom.id],
      });

      setCustomizationData(updatedData);

      if (onPreviewChange) {
        onPreviewChange(previewUrl);
      }

      setLoading(true);
      try {
        const result: CustomizationInput[] = [];

        customizations.forEach((custom) => {
          const data = updatedData[custom.id];

          if (custom.type === "BASE_LAYOUT" && data) {
            const layoutData = data as {
              layout_id?: string;
              layout_name?: string;
              model_url?: string;
              images?: ImageData[];
              previewUrl?: string;
            };
            if (layoutData.layout_id) {
              result.push({
                customizationRuleId: custom.id,
                customizationType: CustomizationType.LAYOUT_BASE,
                selectedLayoutId: layoutData.layout_id,
                data: {
                  id: layoutData.layout_id,
                  name: layoutData.layout_name || "",
                  model_url: layoutData.model_url,
                  images: layoutData.images || [],
                  previewUrl: layoutData.previewUrl,
                } as unknown as Record<string, unknown>,
              });
            }
          }
        });

        onComplete(result.length > 0, result);
        toast.success("Personalização salva!");
        onClose();

        setStep("selection");
        setFullLayoutBase(null);
        setSelectedLayoutId(null);
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar personalização");
      } finally {
        setLoading(false);
      }
    },
    [customizations, customizationData, onPreviewChange, onComplete, onClose]
  );

  const handleBackToSelection = useCallback(() => {
    setStep("selection");
    setFullLayoutBase(null);
    setSelectedLayoutId(null);
  }, []);

  const handleTextChange = useCallback(
    (customizationId: string, fieldId: string, value: string) => {
      setCustomizationData((prev) => ({
        ...prev,
        [customizationId]: {
          ...((prev[customizationId] as Record<string, unknown>) || {}),
          [fieldId]: value,
        },
      }));
    },
    []
  );

  const handleFileUpload = useCallback(
    (customizationId: string, files: FileList | null) => {
      console.log("🔵 [Modal] handleFileUpload chamado", {
        customizationId,
        files,
      });
      if (!files || files.length === 0) return;

      const customization = customizations.find(
        (c) => c.id === customizationId
      );
      if (!customization) return;

      const file = files[0]; // Pegar apenas o primeiro arquivo por vez
      console.log("🔵 [Modal] Arquivo selecionado:", file);

      // Determinar o aspect ratio baseado no tipo de customização
      let aspect: number | undefined;

      if (customization.type === "IMAGES") {
        // IMAGES sempre quadrado (1:1)
        aspect = 1;
        console.log("🔵 [Modal] Tipo IMAGES - aspect 1:1");
      } else if (customization.type === "BASE_LAYOUT") {
        // BASE_LAYOUT usa proporção dos slots se houver
        aspect = undefined;
        console.log("🔵 [Modal] Tipo BASE_LAYOUT - aspect undefined");
      }

      // Abrir dialog de crop
      console.log("🔵 [Modal] Abrindo dialog de crop...", { file, aspect });
      setFileToCrop(file);
      setCropAspect(aspect);
      setCurrentCustomizationId(customizationId);
      setCropDialogOpen(true);
    },
    [customizations]
  );

  const handleCropComplete = useCallback(
    (croppedImageUrl: string) => {
      console.log("🔵 [Modal] handleCropComplete chamado");
      if (!currentCustomizationId) return;

      const customization = customizations.find(
        (c) => c.id === currentCustomizationId
      );
      if (!customization) return;

      // Converter data URL para File
      fetch(croppedImageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], fileToCrop?.name || "cropped.png", {
            type: "image/png",
          });

          const maxImages =
            customization.customization_data.base_layout?.max_images || 10;
          const currentFiles = uploadingFiles[currentCustomizationId] || [];
          const totalFiles = [...currentFiles, file].slice(0, maxImages);

          setUploadingFiles((prev) => ({
            ...prev,
            [currentCustomizationId]: totalFiles,
          }));

          const filesData = totalFiles.map((f, index) => ({
            file: f,
            preview: URL.createObjectURL(f),
            position: index,
          }));

          setCustomizationData((prev) => ({
            ...prev,
            [currentCustomizationId]: filesData,
          }));

          console.log("🔵 [Modal] Arquivo adicionado com sucesso!");
        })
        .catch((error) => {
          console.error("Erro ao processar imagem cortada:", error);
        });
    },
    [currentCustomizationId, customizations, uploadingFiles, fileToCrop]
  );

  const handleRemoveFile = useCallback(
    (customizationId: string, index: number) => {
      const currentFiles = uploadingFiles[customizationId] || [];
      const newFiles = currentFiles.filter((_, i) => i !== index);

      setUploadingFiles((prev) => ({ ...prev, [customizationId]: newFiles }));

      const filesData = newFiles.map((file, idx) => ({
        file,
        preview: URL.createObjectURL(file),
        position: idx,
      }));

      setCustomizationData((prev) => ({
        ...prev,
        [customizationId]: filesData,
      }));
    },
    [uploadingFiles]
  );

  const handleOptionSelect = useCallback(
    (customizationId: string, optionId: string, optionLabel: string) => {
      setCustomizationData((prev) => ({
        ...prev,
        [customizationId]: { id: optionId, label: optionLabel },
      }));
    },
    []
  );

  const handleSave = useCallback(() => {
    setLoading(true);
    try {
      const result: CustomizationInput[] = [];

      customizations.forEach((custom) => {
        const data = customizationData[custom.id];

        if (custom.type === "TEXT" && data) {
          result.push({
            customizationRuleId: custom.id,
            customizationType: CustomizationType.TEXT,
            data: data as Record<string, unknown>,
          });
        } else if (custom.type === "BASE_LAYOUT" && data) {
          const layoutData = data as {
            layout_id?: string;
            images?: ImageData[];
            previewUrl?: string;
          };
          if (layoutData.layout_id) {
            result.push({
              customizationRuleId: custom.id,
              customizationType: CustomizationType.LAYOUT_BASE,
              selectedLayoutId: layoutData.layout_id,
              data: {
                id: layoutData.layout_id,
                images: layoutData.images || [],
                previewUrl: layoutData.previewUrl,
              } as unknown as Record<string, unknown>,
            });
          }
        } else if (custom.type === "IMAGES" && data) {
          result.push({
            customizationRuleId: custom.id,
            customizationType: CustomizationType.IMAGES,
            data: data as unknown as Record<string, unknown>,
          });
        } else if (custom.type === "MULTIPLE_CHOICE" && data) {
          result.push({
            customizationRuleId: custom.id,
            customizationType: CustomizationType.MULTIPLE_CHOICE,
            data: data as Record<string, unknown>,
          });
        }
      });

      onComplete(result.length > 0, result);
      toast.success("Personalização salva!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar personalização");
    } finally {
      setLoading(false);
    }
  }, [customizations, customizationData, onComplete, onClose]);

  // Renderizar seleção de layout
  const renderBaseLayoutSelection = (customization: Customization) => {
    const layouts = customization.customization_data.layouts || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200">
            <Sparkles className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <Label className="text-xl font-bold text-gray-900">
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Obrigatório
                </Badge>
              )}
            </Label>
            {customization.description && (
              <p className="text-sm text-gray-600 mt-1">
                {customization.description}
              </p>
            )}
          </div>
        </div>

        {layouts.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50">
            <Palette className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Nenhum layout disponível</p>
          </Card>
        ) : loadingLayouts ? (
          <Card className="p-8 text-center bg-gray-50">
            <Loader2 className="h-16 w-16 mx-auto text-purple-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Carregando layouts...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {layouts.map((layoutFromCustomization) => {
              const fullLayout =
                layoutsWithImages[layoutFromCustomization.id] ||
                layoutFromCustomization;
              const layoutKey = `layout-${fullLayout.id}`;
              const imageLoaded = imageLoadStates[layoutKey];

              const getProxiedImageUrl = (url: string): string => {
                if (!url) return "";

                if (url.startsWith("data:")) return url;

                if (
                  url.includes("drive.google.com") ||
                  url.includes("drive.usercontent.google.com")
                ) {
                  const normalizedUrl = getDirectImageUrl(url);
                  return `/api/proxy-image?url=${encodeURIComponent(
                    normalizedUrl
                  )}`;
                }

                return url;
              };

              const imageUrl = getProxiedImageUrl(fullLayout.image_url || "");

              console.log(`🖼️ [Layout ${fullLayout.name}]:`, {
                fullLayout,
              });

              const hasSlots = fullLayout.slots && fullLayout.slots.length > 0;

              return (
                <div
                  key={fullLayout.id}
                  className="group cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-2xl hover:scale-105 border-2 border-gray-200 hover:border-purple-300"
                  onClick={() => handleLayoutSelect(fullLayout.id)}
                >
                  <div className="relative aspect-video max-h-[200px] bg-gradient-to-br from-gray-50 to-gray-100">
                    {imageLoaded && !imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                      </div>
                    )}

                    {imageUrl ? (
                      <div className="relative w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={fullLayout.name}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={() => {
                            console.log(
                              `✅ [Layout ${fullLayout.name}] Imagem carregada!`
                            );
                            setImageLoadStates((prev) => ({
                              ...prev,
                              [layoutKey]: true,
                            }));
                          }}
                          onError={(e) => {
                            console.error(
                              `❌ [Layout ${fullLayout.name}] Erro ao carregar imagem:`,
                              e
                            );
                            setImageLoadStates((prev) => ({
                              ...prev,
                              [layoutKey]: false,
                            }));
                          }}
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Palette className="h-16 w-16 text-gray-300" />
                      </div>
                    )}

                    {/* Badge de slots */}
                    {hasSlots && (
                      <div className="absolute top-3 left-3 bg-purple-600 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Permite fotos
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/95 hover:bg-white font-semibold shadow-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Selecionar
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-white border-t-2 border-gray-100">
                    <h4 className="font-bold text-gray-900 text-center truncate">
                      {fullLayout.name}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loadingLayout && selectedLayoutId && (
          <Card className="p-12 bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-14 w-14 animate-spin text-purple-600" />
              <p className="text-base font-semibold text-gray-800">
                Carregando editor de personalização...
              </p>
              <p className="text-sm text-gray-600">Aguarde um momento</p>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderTextCustomization = (customization: Customization) => {
    const fields = customization.customization_data.fields || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Type className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <Label className="text-lg font-bold text-gray-900">
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Obrigatório
                </Badge>
              )}
            </Label>
            {customization.description && (
              <p className="text-sm text-gray-600 mt-1">
                {customization.description}
              </p>
            )}
          </div>
        </div>

        {fields.map((field) => {
          const data = customizationData[customization.id] as
            | Record<string, string>
            | undefined;
          const value = data?.[field.id] || "";

          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="font-medium">
                {field.label}
              </Label>
              <Input
                id={field.id}
                type="text"
                placeholder={field.placeholder}
                maxLength={field.max_length}
                value={value}
                onChange={(e) =>
                  handleTextChange(customization.id, field.id, e.target.value)
                }
                className="font-medium"
              />
              {field.max_length && (
                <p className="text-xs text-gray-500">
                  {value.length}/{field.max_length} caracteres
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderImageCustomization = (customization: Customization) => {
    const currentFiles = uploadingFiles[customization.id] || [];
    const maxImages =
      customization.customization_data.base_layout?.max_images || 10;
    const canAddMore = currentFiles.length < maxImages;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Upload className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <Label className="text-lg font-bold text-gray-900">
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Obrigatório
                </Badge>
              )}
            </Label>
            {customization.description && (
              <p className="text-sm text-gray-600 mt-1">
                {customization.description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {currentFiles.length}/{maxImages} imagens
            </p>
          </div>
        </div>

        {canAddMore && (
          <label
            htmlFor={`file-${customization.id}`}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Clique para adicionar imagens
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG ou WEBP (máx. 10MB)
            </p>
            <input
              id={`file-${customization.id}`}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) =>
                handleFileUpload(customization.id, e.target.files)
              }
            />
          </label>
        )}

        {currentFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {currentFiles.map((file, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveFile(customization.id, index)}
                  className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMultipleChoiceCustomization = (customization: Customization) => {
    const options = customization.customization_data.options || [];
    const data = customizationData[customization.id] as
      | { id?: string }
      | undefined;
    const selectedId = data?.id;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <Label className="text-lg font-bold text-gray-900">
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Obrigatório
                </Badge>
              )}
            </Label>
            {customization.description && (
              <p className="text-sm text-gray-600 mt-1">
                {customization.description}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <Card
                key={option.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-2 border-amber-500 bg-amber-50"
                    : "border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                }`}
                onClick={() =>
                  handleOptionSelect(customization.id, option.id, option.label)
                }
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={isSelected} className="border-2" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-gray-600 mt-1">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {option.price_adjustment && option.price_adjustment > 0 && (
                    <Badge
                      variant="outline"
                      className="text-amber-700 border-amber-300"
                    >
                      +R$ {option.price_adjustment.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === "selection"
              ? `Personalizar ${itemName}`
              : "Editar Personalização"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === "selection" ? (
            <div className="space-y-8">
              {customizations.map((customization) => {
                if (customization.type === "BASE_LAYOUT") {
                  return (
                    <div key={customization.id}>
                      {renderBaseLayoutSelection(customization)}
                    </div>
                  );
                }
                if (customization.type === "TEXT") {
                  return (
                    <div key={customization.id}>
                      {renderTextCustomization(customization)}
                    </div>
                  );
                }
                if (customization.type === "IMAGES") {
                  return (
                    <div key={customization.id}>
                      {renderImageCustomization(customization)}
                    </div>
                  );
                }
                if (customization.type === "MULTIPLE_CHOICE") {
                  return (
                    <div key={customization.id}>
                      {renderMultipleChoiceCustomization(customization)}
                    </div>
                  );
                }
                return null;
              })}

              {customizations.every((c) => c.type !== "BASE_LAYOUT") && (
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Salvar Personalização
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {fullLayoutBase && (
                <ClientPersonalizationEditor
                  layoutBase={fullLayoutBase}
                  onComplete={handleLayoutComplete}
                  onBack={handleBackToSelection}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Dialog de Crop de Imagem */}
      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setFileToCrop(null);
            setCurrentCustomizationId(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={cropAspect}
          title="Ajustar sua foto"
          description={
            cropAspect === 1
              ? "Recorte sua foto em formato quadrado"
              : "Ajuste sua foto para o tamanho ideal"
          }
        />
      )}
    </Dialog>
  );
}
