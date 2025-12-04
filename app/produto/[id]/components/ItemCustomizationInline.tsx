"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  AlertCircle,
  Save,
} from "lucide-react";
import Image from "next/image";
import {
  CustomizationType,
  type CustomizationInput,
} from "@/app/types/customization";
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
  itemId: string;
  itemName: string;
  customizations: Customization[];
  onComplete: (hasCustomizations: boolean, data: CustomizationInput[]) => void;
  onPreviewChange?: (previewUrl: string | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function ItemCustomizationInline({
  customizations,
  onComplete,
  onPreviewChange,
}: Props) {
  const [customizationData, setCustomizationData] = useState<
    Record<string, unknown>
  >({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File[]>>(
    {}
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para crop de imagem
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [currentCustomizationId, setCurrentCustomizationId] = useState<
    string | null
  >(null);

  // Verificar mudanças
  useEffect(() => {
    const hasData = Object.keys(customizationData).length > 0;
    setHasChanges(hasData);
  }, [customizationData]);

  // Atualizar preview quando layout mudar
  useEffect(() => {
    if (onPreviewChange && selectedLayoutId) {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (baseLayoutCustom?.customization_data.layouts) {
        const layout = baseLayoutCustom.customization_data.layouts.find(
          (l) => l.id === selectedLayoutId
        );
        if (layout) {
          onPreviewChange(layout.model_url || layout.image_url || null);
        }
      }
    }
  }, [selectedLayoutId, customizations, onPreviewChange]);

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
      console.log("🔵 handleFileUpload chamado", { customizationId, files });
      if (!files || files.length === 0) return;

      const customization = customizations.find(
        (c) => c.id === customizationId
      );
      if (!customization) return;

      const file = files[0]; // Pegar apenas o primeiro arquivo por vez
      console.log("🔵 Arquivo selecionado:", file);

      // Determinar o aspect ratio baseado no tipo de customização
      let aspect: number | undefined;

      if (customization.type === "IMAGES") {
        // IMAGES sempre quadrado (1:1)
        aspect = 1;
        console.log("🔵 Tipo IMAGES - aspect 1:1");
      } else if (customization.type === "BASE_LAYOUT") {
        // BASE_LAYOUT usa proporção dos slots se houver
        // Por enquanto, deixar livre (undefined) ou calcular baseado nos slots
        aspect = undefined;
        console.log("🔵 Tipo BASE_LAYOUT - aspect undefined");
      }

      // Abrir dialog de crop
      console.log("🔵 Abrindo dialog de crop...", { file, aspect });
      setFileToCrop(file);
      setCropAspect(aspect);
      setCurrentCustomizationId(customizationId);
      setCropDialogOpen(true);
    },
    [customizations]
  );

  const handleCropComplete = useCallback(
    (croppedImageUrl: string) => {
      if (!currentCustomizationId) return;

      const customization = customizations.find(
        (c) => c.id === currentCustomizationId
      );
      if (!customization) return;

      // Converter data URL para File
      fetch(croppedImageUrl)
        .then((res) => res.blob())
        .then(async (blob) => {
          const file = new File([blob], "cropped-image.png", {
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

          // Converter cada arquivo para base64
          const filesDataPromises = totalFiles.map(async (f, index) => {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(f);
            });
            const base64 = await base64Promise;

            return {
              file: f,
              preview: URL.createObjectURL(f),
              position: index,
              base64, // ✅ Dados base64 para upload ao Drive
              mime_type: f.type,
              size: f.size,
            };
          });

          const filesData = await Promise.all(filesDataPromises);

          setCustomizationData((prev) => ({
            ...prev,
            [currentCustomizationId]: filesData,
          }));
        })
        .catch((error) => {
          console.error("Erro ao processar imagem cortada:", error);
        });
    },
    [currentCustomizationId, customizations, uploadingFiles]
  );

  const handleRemoveFile = useCallback(
    async (customizationId: string, index: number) => {
      const currentFiles = uploadingFiles[customizationId] || [];
      const newFiles = currentFiles.filter((_, i) => i !== index);

      setUploadingFiles((prev) => ({
        ...prev,
        [customizationId]: newFiles,
      }));

      // Converter cada arquivo para base64
      const filesDataPromises = newFiles.map(async (file, idx) => {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;

        return {
          file,
          preview: URL.createObjectURL(file),
          position: idx,
          base64, // ✅ Dados base64 para upload ao Drive
          mime_type: file.type,
          size: file.size,
        };
      });

      const filesData = await Promise.all(filesDataPromises);

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
        [customizationId]: {
          id: optionId,
          label: optionLabel,
        },
      }));
    },
    []
  );

  const handleLayoutSelect = useCallback(
    (layoutId: string) => {
      setSelectedLayoutId(layoutId);

      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (baseLayoutCustom) {
        const layout = baseLayoutCustom.customization_data.layouts?.find(
          (l) => l.id === layoutId
        );
        if (layout) {
          setCustomizationData((prev) => ({
            ...prev,
            [baseLayoutCustom.id]: {
              layout_id: layoutId,
              layout_name: layout.name,
            },
          }));
        }
      }
    },
    [customizations]
  );

  const handleAutoSave = useCallback(() => {
    const result: CustomizationInput[] = [];

    customizations.forEach((custom) => {
      const data = customizationData[custom.id];
      if (!data) return;

      let customizationType: CustomizationType;
      switch (custom.type) {
        case "BASE_LAYOUT":
          customizationType = CustomizationType.BASE_LAYOUT;
          break;
        case "TEXT":
          customizationType = CustomizationType.TEXT;
          break;
        case "IMAGES":
          customizationType = CustomizationType.IMAGES;
          break;
        case "MULTIPLE_CHOICE":
          customizationType = CustomizationType.MULTIPLE_CHOICE;
          break;
        default:
          return;
      }

      const baseData = { ...data, _customizationName: custom.name } as Record<
        string,
        unknown
      >;

      // Ensure selectedLayoutId is present for BASE_LAYOUT
      const selectedLayoutIdField =
        ((baseData as Record<string, unknown>).layout_id as string) ||
        ((baseData as Record<string, unknown>).id as string);

      result.push({
        ruleId: custom.id,
        customizationType,
        selectedLayoutId: selectedLayoutIdField || undefined,
        data: baseData,
      });
    });

    onComplete(result.length > 0, result);
  }, [customizations, customizationData, onComplete]);

  // Auto-save quando há mudanças
  useEffect(() => {
    if (hasChanges) {
      handleAutoSave();
    }
  }, [hasChanges, handleAutoSave]);

  const renderBaseLayoutCustomization = (customization: Customization) => {
    const layouts = customization.customization_data.layouts || [];

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <Label className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="text-xs">
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
          <p className="text-sm text-gray-500 italic">
            Nenhum layout disponível
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {layouts.map((layout) => {
              const isSelected = selectedLayoutId === layout.id;

              return (
                <Card
                  key={layout.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "border-purple-500 border-2 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleLayoutSelect(layout.id)}
                >
                  <div className="p-3 space-y-2">
                    <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100">
                      {layout.image_url ? (
                        <Image
                          src={layout.image_url}
                          alt={layout.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <Palette className="w-8 h-8" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleLayoutSelect(layout.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium truncate">
                        {layout.name}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTextCustomization = (customization: Customization) => {
    const fields = customization.customization_data.fields || [];

    return (
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-500" />
            {customization.name}
            {customization.isRequired && (
              <Badge variant="destructive" className="text-xs">
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

        {fields.map((field) => {
          const data =
            (customizationData[customization.id] as Record<string, unknown>) ||
            {};
          const value = (data[field.id] as string) || "";

          return (
            <div key={field.id} className="space-y-2">
              <Label className="text-sm">{field.label}</Label>
              <Input
                type="text"
                placeholder={field.placeholder || "Digite aqui..."}
                value={value}
                onChange={(e) =>
                  handleTextChange(customization.id, field.id, e.target.value)
                }
                maxLength={field.max_length}
              />
              {field.max_length && (
                <p className="text-xs text-gray-500 text-right">
                  {value.length} / {field.max_length} caracteres
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
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-500" />
            {customization.name}
            {customization.isRequired && (
              <Badge variant="destructive" className="text-xs">
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

        {canAddMore && (
          <label
            htmlFor={`upload-${customization.id}`}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-6 h-6 mb-1 text-gray-400" />
              <p className="text-xs text-gray-500">
                {currentFiles.length} de {maxImages} foto(s)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Clique para adicionar uma foto
              </p>
            </div>
            <input
              id={`upload-${customization.id}`}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                console.log("🔴 INPUT onChange disparado!", e.target.files);
                handleFileUpload(customization.id, e.target.files);
              }}
            />
          </label>
        )}

        {currentFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {currentFiles.map((file, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveFile(customization.id, index)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
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
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-yellow-500" />
            {customization.name}
            {customization.isRequired && (
              <Badge variant="destructive" className="text-xs">
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

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            const imageUrl = option.image_url
              ? option.image_url.startsWith("http")
                ? option.image_url
                : `${API_URL}${option.image_url}`
              : null;

            return (
              <button
                key={option.id}
                onClick={() =>
                  handleOptionSelect(customization.id, option.id, option.label)
                }
                className={`w-full flex items-center justify-between p-3 border rounded-lg transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt={option.label}
                      className="w-10 h-10 rounded object-cover border"
                    />
                  )}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>
                {option.price_adjustment && option.price_adjustment !== 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {option.price_adjustment > 0 ? "+" : ""}R${" "}
                    {option.price_adjustment.toFixed(2)}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (customizations.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Nenhuma customização disponível para este item</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {customizations
        .sort((a) => (a.isRequired ? -1 : 1))
        .map((customization) => (
          <Card key={customization.id} className="p-4 bg-white">
            {customization.type === "BASE_LAYOUT" &&
              renderBaseLayoutCustomization(customization)}
            {customization.type === "TEXT" &&
              renderTextCustomization(customization)}
            {customization.type === "IMAGES" &&
              renderImageCustomization(customization)}
            {customization.type === "MULTIPLE_CHOICE" &&
              renderMultipleChoiceCustomization(customization)}
          </Card>
        ))}

      {hasChanges && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800 text-sm">
            <Save className="w-4 h-4" />
            <p>Personalização salva automaticamente!</p>
          </div>
        </Card>
      )}

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
    </div>
  );
}
