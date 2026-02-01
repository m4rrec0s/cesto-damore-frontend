"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import {
  Upload,
  X,
  Type,
  CheckCircle2,
  Palette,
  Loader2,
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { AnimatedFramesLoader } from "@/app/components/ui/animated-frames-loader";
import { toast } from "sonner";
import { dataURLtoBlob } from "@/app/lib/utils";
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
import ClientFabricEditor from "@/app/components/client-fabric-editor";
import useApi from "@/app/hooks/use-api";
import { ImageCropDialog } from "@/app/components/ui/image-crop-dialog";
import Image from "next/image";
import { getInternalImageUrl } from "@/lib/image-helper";

interface ProcessedFile {
  file: File;
  preview: string;
  position: number;
  base64: string;
  mime_type: string;
  size: number;
}

interface Customization {
  id: string;
  name: string;
  description?: string;
  type: "DYNAMIC_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  isRequired: boolean;
  price: number;
  customization_data: {
    layouts?: Array<{
      id: string;
      name: string;
      model_url?: string;
      image_url?: string;
      additional_time?: number;
      slots?: SlotDef[];
    }>;
    fields?: Array<{
      id: string;
      label: string;
      placeholder?: string;
      max_length?: number;
    }>;
    dynamic_layout?: {
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
  onImagesUpdate?: (
    itemId: string,
    imageCount: number,
    maxImages: number,
  ) => void;
  initialValues?: Record<string, unknown>;
}

type ModalStep = "selection" | "editing";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function ItemCustomizationModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  customizations,
  onComplete,
  onPreviewChange,
  onImagesUpdate,
  initialValues,
}: Props) {
  const [step, setStep] = useState<ModalStep>("selection");
  const [customizationData, setCustomizationData] = useState<
    Record<string, unknown>
  >({});

  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File[]>>(
    {},
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullLayoutBase, setFullLayoutBase] = useState<LayoutBase | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<
    Record<string, boolean>
  >({});

  const [layoutsWithImages, setLayoutsWithImages] = useState<
    Record<
      string,
      {
        id: string;
        name: string;
        previewImageUrl: string;
        slots?: SlotDef[];
        additional_time?: number;
        productionTime?: number;
        item_type?: string;
      }
    >
  >({});
  const layoutCacheRef = useRef<Record<string, LayoutBase | undefined>>({});
  const [loadingLayouts, setLoadingLayouts] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [currentCustomizationId, setCurrentCustomizationId] = useState<
    string | null
  >(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [imagesCustomizationId, setImagesCustomizationId] = useState<
    string | null
  >(null);

  const uploadingFilesRef = useRef(uploadingFiles);
  useEffect(() => {
    uploadingFilesRef.current = uploadingFiles;
  }, [uploadingFiles]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isCropping, setIsCropping] = useState(false);

  const { getLayoutById } = useApi();

  useEffect(() => {
    if (!isOpen) return;

    const fetchLayouts = async () => {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "DYNAMIC_LAYOUT",
      );
      if (!baseLayoutCustom) return;

      const layouts = baseLayoutCustom.customization_data.layouts || [];
      if (layouts.length === 0) return;

      setLoadingLayouts(true);
      const fetchedLayouts: Record<
        string,
        {
          id: string;
          name: string;
          previewImageUrl: string;
          slots?: SlotDef[];
          item_type?: string;
          additional_time?: number;
          productionTime?: number;
        }
      > = {};

      // Use Promise.all to fetch in parallel, but skip if cached
      const toFetch = layouts.filter((l) => !layoutCacheRef.current[l.id]);
      const fetchPromises = toFetch.map(async (l) => {
        try {
          const fullLayout = await getLayoutById(l.id);
          layoutCacheRef.current[l.id] = fullLayout;
          return {
            id: fullLayout.id,
            name: fullLayout.name,
            previewImageUrl: fullLayout.previewImageUrl,
            slots: fullLayout.slots,
            item_type: fullLayout.item_type,
            additional_time: fullLayout.additional_time,
            productionTime: fullLayout.productionTime,
          };
        } catch (error) {
          console.error(`❌ Erro ao carregar layout ${l.id}:`, error);
          return null;
        }
      });

      const fetched = await Promise.all(fetchPromises);
      for (const item of fetched) {
        if (item) fetchedLayouts[item.id] = item;
      }

      // Reuse cached layouts for those already fetched earlier
      for (const layout of layouts) {
        if (layoutCacheRef.current[layout.id] && !fetchedLayouts[layout.id]) {
          const fullLayout = layoutCacheRef.current[layout.id]!;
          fetchedLayouts[layout.id] = {
            id: fullLayout.id,
            name: fullLayout.name,
            previewImageUrl: fullLayout.previewImageUrl,
            slots: fullLayout.slots,
            item_type: fullLayout.item_type,
            additional_time: fullLayout.additional_time,
            productionTime: fullLayout.productionTime,
          };
        }
      }

      setLayoutsWithImages(fetchedLayouts);
      setLoadingLayouts(false);
    };

    fetchLayouts();
  }, [isOpen, customizations, getLayoutById]);

  const handleLayoutSelect = useCallback(
    async (layoutId: string) => {
      setSelectedLayoutId(layoutId);
      setLoadingLayout(true);

      const baseLayoutCustom = customizations.find(
        (c) => c.type === "DYNAMIC_LAYOUT",
      );
      if (!baseLayoutCustom) return;

      const layout = baseLayoutCustom.customization_data.layouts?.find(
        (l) => l.id === layoutId,
      );
      if (!layout) return;

      setLoading(true);
      setCustomizationData((prev) => ({
        ...prev,
        [baseLayoutCustom.id]: {
          layout_id: layoutId,
          layout_name: layout.name,
        },
      }));

      setLoading(false);

      try {
        let layoutData: LayoutBase | undefined = layoutCacheRef.current[
          layoutId
        ] as LayoutBase | undefined;

        if (!layoutData) {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("appToken") ||
                localStorage.getItem("token")
              : null;

          const response = await fetch(
            `${API_URL}/layouts/dynamic/${layoutId}`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "ngrok-skip-browser-warning": "true",
              },
            },
          );

          if (!response.ok) throw new Error("Erro ao buscar layout");

          const rawData = (await response.json()) as LayoutBase & {
            baseImageUrl?: string;
          };

          if (rawData && !rawData.previewImageUrl && rawData.baseImageUrl) {
            rawData.previewImageUrl = rawData.baseImageUrl;
          }

          layoutData = rawData;

          if (layoutData) layoutCacheRef.current[layoutId] = layoutData;
        }

        if (!layoutData) throw new Error("Layout não encontrado");

        setFullLayoutBase(layoutData as LayoutBase);

        const apiType = (layoutData as unknown as { type?: string }).type;
        const normalizedType = apiType?.toLowerCase();
        const modelUrl =
          normalizedType === "mug" || normalizedType === "caneca"
            ? "/3DModels/caneca.glb"
            : normalizedType === "frame" || normalizedType === "quadro"
              ? "/3DModels/quadro.glb"
              : undefined;

        // Normalizar para os novos tipos
        const standardType =
          normalizedType === "caneca"
            ? "mug"
            : normalizedType === "quadro"
              ? "frame"
              : normalizedType;

        setCustomizationData((prev) => ({
          ...prev,
          [baseLayoutCustom.id]: {
            ...((prev[baseLayoutCustom.id] as Record<string, unknown>) || {}),
            model_url: modelUrl,
            item_type: standardType,
          },
        }));

        setStep("editing");
      } catch (err) {
        console.error("Erro ao carregar layout:", err);
        toast.error("Erro ao carregar detalhes do layout");
        setFullLayoutBase(null);
      } finally {
        setLoadingLayout(false);
      }
    },
    [customizations],
  );

  // ✅ Initialize customizationData from initialValues (fallback for reopening modal)
  useEffect(() => {
    if (!isOpen) return;

    if (initialValues && Object.keys(initialValues).length > 0) {
      const newData: Record<string, unknown> = {};

      customizations.forEach((c) => {
        const val = initialValues[c.id];
        if (val) {
          if (c.type === "MULTIPLE_CHOICE") {
            if (typeof val === "object" && val !== null) {
              const obj = val as Record<string, unknown>;
              newData[c.id] = {
                id: obj.selected_option || obj.id,
                label: obj.selected_option_label || obj.label,
              };
            } else if (typeof val === "string") {
              const options = c.customization_data.options || [];
              const matched = options.find(
                (o) => o.id === val || o.value === val,
              );
              newData[c.id] = {
                id: val,
                label: matched?.label || "",
              };
            }
          } else if (c.type === "TEXT") {
            // Se o valor for um objeto com campo 'text', extrair
            if (
              typeof val === "object" &&
              val !== null &&
              "fields" in (val as Record<string, unknown>)
            ) {
              newData[c.id] = (val as Record<string, unknown>).fields;
            } else {
              newData[c.id] = val;
            }
          } else {
            newData[c.id] = val;
          }
        }
      });

      setCustomizationData(newData);

      // ✅ Restore DYNAMIC_LAYOUT state if present
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "DYNAMIC_LAYOUT",
      );
      if (baseLayoutCustom) {
        const layoutData = newData[baseLayoutCustom.id] as
          | Record<string, unknown>
          | undefined;
        const layoutId = layoutData?.layout_id as string | undefined;

        if (layoutId) {
          handleLayoutSelect(layoutId);
        }
      }
    } else {
      setCustomizationData({});
      setStep("selection");
      setSelectedLayoutId(null);
      setFullLayoutBase(null);
    }
  }, [isOpen, initialValues, customizations, handleLayoutSelect]);

  const handleLayoutComplete = useCallback(
    async (
      images: ImageData[],
      previewUrl: string,
      fabricState?: string,
      highQualityUrl?: string,
    ) => {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "DYNAMIC_LAYOUT",
      );
      if (!baseLayoutCustom) return;

      const existingData =
        (customizationData[baseLayoutCustom.id] as Record<string, unknown>) ||
        {};

      const apiProductionTime = (
        fullLayoutBase as unknown as { productionTime?: number }
      )?.productionTime;
      const updatedData = {
        ...customizationData,
        [baseLayoutCustom.id]: {
          ...existingData,
          images,
          previewUrl,
          fabricState,
          highQualityUrl,
          // ✅ CRITICAL: Manter dados do layout selecionado
          item_type: existingData.item_type,
          model_url: existingData.model_url,
          layout_id: existingData.layout_id,
          layout_name: existingData.layout_name,
          additional_time:
            apiProductionTime || existingData.additional_time || 0,
        },
      };

      setCustomizationData(updatedData);

      if (onPreviewChange) {
        onPreviewChange(previewUrl);
      }

      const result: CustomizationInput[] = [];

      customizations.forEach((custom) => {
        const data = updatedData[custom.id];

        if (custom.type === "DYNAMIC_LAYOUT" && data) {
          const layoutData = data as {
            layout_id?: string;
            layout_name?: string;
            model_url?: string;
            item_type?: string;
            images?: ImageData[];
            previewUrl?: string;
            fabricState?: string;
            highQualityUrl?: string;
            additional_time?: number;
          };
          if (layoutData.layout_id) {
            const cachedLayout = layoutCacheRef.current[layoutData.layout_id];
            // ✅ CORREÇÃO: API retorna 'productionTime' (não 'additional_time')
            const apiProductionTime =
              (cachedLayout as unknown as { productionTime?: number })
                ?.productionTime ||
              (fullLayoutBase as unknown as { productionTime?: number })
                ?.productionTime;
            result.push({
              ruleId: custom.id,
              customizationRuleId: custom.id,
              customizationType: CustomizationType.DYNAMIC_LAYOUT,
              selectedLayoutId: layoutData.layout_id,
              data: {
                id: layoutData.layout_id,
                layout_id: layoutData.layout_id,
                name: layoutData.layout_name || "",
                model_url: layoutData.model_url,
                item_type: layoutData.item_type,
                images: layoutData.images || [],
                fabricState: layoutData.fabricState,
                previewUrl: layoutData.previewUrl,
                highQualityUrl: layoutData.highQualityUrl,
                additional_time:
                  layoutData.additional_time || apiProductionTime || 0,
                _customizationName: custom.name,
                _priceAdjustment: custom.price,
              },
            });
          }
        }
      });

      onComplete(result.length > 0, result);
      toast.success("Design aplicado! (Será salvo ao adicionar ao carrinho)");

      setStep("selection");
      setFullLayoutBase(null);
      setSelectedLayoutId(null);
    },
    [
      customizations,
      customizationData,
      onPreviewChange,
      onComplete,
      fullLayoutBase,
    ],
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
    [],
  );

  // Effect to process the next file in the queue
  useEffect(() => {
    if (pendingFiles.length > 0 && !isCropping && !cropDialogOpen) {
      const nextFile = pendingFiles[0];
      const customId = currentCustomizationId;

      // Safety check: we need a customization ID target
      if (!customId) return;

      const customization = customizations.find((c) => c.id === customId);
      if (!customization) return;

      let aspect: number | undefined;

      if (customization.type === "IMAGES") {
        aspect = 1;
      } else if (customization.type === "DYNAMIC_LAYOUT") {
        aspect = undefined;
      }

      setFileToCrop(nextFile);
      setCropAspect(aspect);
      setIsCropping(true);
      setCropDialogOpen(true);
    }
  }, [
    pendingFiles,
    isCropping,
    cropDialogOpen,
    currentCustomizationId,
    customizations,
  ]);

  const handleFileUpload = useCallback(
    (customizationId: string, files: FileList | null) => {
      if (!files || files.length === 0) return;

      const customization = customizations.find(
        (c) => c.id === customizationId,
      );
      if (!customization) return;

      const fileArray = Array.from(files);

      setCurrentCustomizationId(customizationId);
      setImagesCustomizationId(customizationId);
      setPendingFiles((prev) => [...prev, ...fileArray]);
    },
    [customizations],
  );

  const handleCropComplete = useCallback(
    async (croppedImageUrl: string) => {
      if (!currentCustomizationId) {
        console.warn("⚠️ [Crop] No current customization ID");
        return;
      }

      const customization = customizations.find(
        (c) => c.id === currentCustomizationId,
      );
      if (!customization) return;

      try {
        const blob = dataURLtoBlob(croppedImageUrl);
        const file = new File([blob], fileToCrop?.name || "cropped.png", {
          type: "image/png",
        });

        const maxImages =
          customization.customization_data.dynamic_layout?.max_images || 10;

        // Use Ref to get latest files, avoiding stale closures
        const currentFiles =
          uploadingFilesRef.current[currentCustomizationId] || [];

        const totalFiles = [...currentFiles, file].slice(0, maxImages);

        setUploadingFiles((prev) => ({
          ...prev,
          [currentCustomizationId]: totalFiles,
        }));

        // Notificar pai sobre o número de imagens adicionadas
        if (onImagesUpdate && itemId) {
          onImagesUpdate(itemId, totalFiles.length, maxImages);
        }

        // Processar arquivos para preview/base64
        const processedFiles: ProcessedFile[] = [];
        for (let i = 0; i < totalFiles.length; i++) {
          const f = totalFiles[i];
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          });
          const base64 = await base64Promise;

          processedFiles.push({
            file: f,
            preview: URL.createObjectURL(f),
            position: i,
            base64,
            mime_type: f.type,
            size: f.size,
          });
        }

        setCustomizationData((prev) => ({
          ...prev,
          [currentCustomizationId]: processedFiles,
        }));
      } catch (error) {
        console.error("❌ [Crop] Erro ao processar imagem:", error);
      }
    },
    [
      currentCustomizationId,
      customizations,
      fileToCrop,
      onImagesUpdate,
      itemId,
    ],
  );

  const handleDetailsConfirm = (croppedImageUrl: string) => {
    handleCropComplete(croppedImageUrl);

    // Remove processed file from queue
    setPendingFiles((prev) => prev.slice(1));
    setCropDialogOpen(false);
    setFileToCrop(null);

    setTimeout(() => {
      setIsCropping(false);
    }, 500);
  };

  // const handleCropCancel = () => {
  //   // If canceled, we also remove it from queue to avoid getting stuck
  //   setPendingFiles((prev) => prev.slice(1));
  //   setCropDialogOpen(false);
  //   setFileToCrop(null);
  //   setIsCropping(false);
  // };

  const handleRemoveFile = useCallback(
    async (customizationId: string, index: number) => {
      const currentFiles = uploadingFiles[customizationId] || [];
      const newFiles = currentFiles.filter((_, i) => i !== index);

      setUploadingFiles((prev) => ({ ...prev, [customizationId]: newFiles }));
      const customization = customizations.find(
        (c) => c.id === customizationId,
      );
      if (customization && customization.type === "IMAGES" && onImagesUpdate) {
        const maxImages =
          customization.customization_data.dynamic_layout?.max_images || 10;
        onImagesUpdate(itemId, newFiles.length, maxImages);
      }

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
    [uploadingFiles, customizations, itemId, onImagesUpdate],
  );

  const handleOptionSelect = useCallback(
    (customizationId: string, optionId: string, optionLabel: string) => {
      setCustomizationData((prev) => ({
        ...prev,
        [customizationId]: { id: optionId, label: optionLabel },
      }));
    },
    [],
  );

  const renderDynamicLayoutSelection = (customization: Customization) => {
    const layouts = customization.customization_data.layouts || [];

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold text-gray-900">
            {customization.name}
            {customization.isRequired && (
              <span className="ml-2 text-sm text-red-500">*</span>
            )}
          </Label>
          {customization.description && (
            <p className="text-sm text-gray-600 mt-1">
              {customization.description}
            </p>
          )}
        </div>

        {layouts.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50">
            <Palette className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Nenhum layout disponível</p>
          </Card>
        ) : loadingLayouts ? (
          <Card className="p-8 text-center bg-gray-50">
            <Loader2 className="h-16 w-16 mx-auto text-rose-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Carregando layouts...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
                  let normalizedUrl = getDirectImageUrl(url);
                  if (normalizedUrl.includes("drive.google.com")) {
                    normalizedUrl += "&sz=w500";
                  }
                  return `/proxy-image?url=${encodeURIComponent(
                    normalizedUrl,
                  )}`;
                }

                return url;
              };

              const imageUrl = getProxiedImageUrl(
                (fullLayout as { previewImageUrl?: string; image_url?: string })
                  .previewImageUrl ||
                  (
                    fullLayout as {
                      previewImageUrl?: string;
                      image_url?: string;
                    }
                  ).image_url ||
                  "",
              );
              const isQuadro =
                (
                  fullLayout as { item_type?: string }
                ).item_type?.toLowerCase() === "frame";

              return (
                <div
                  key={fullLayout.id}
                  className="group cursor-pointer transition-all max-h-fit overflow-hidden hover:shadow-lg border-2 border-gray-200 hover:border-gray-900 rounded-xl"
                  onClick={() => handleLayoutSelect(fullLayout.id)}
                >
                  <div className="relative bg-gray-50">
                    {imageLoaded && !imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-rose-600" />
                      </div>
                    )}

                    {imageUrl ? (
                      <div
                        className={`relative w-full h-full ${
                          isQuadro ? "p-1" : ""
                        }`}
                      >
                        <Image
                          src={imageUrl}
                          alt={fullLayout.name}
                          className={`w-full h-full transition-all duration-300 object-contain ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                          } ${isQuadro ? "" : ""}`}
                          width={400}
                          height={200}
                          onLoad={() => {
                            setImageLoadStates((prev) => ({
                              ...prev,
                              [layoutKey]: true,
                            }));
                          }}
                          onError={(e) => {
                            console.error(
                              `[Layout ${fullLayout.name}] Erro ao carregar imagem:`,
                              e,
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

                    <div className="absolute inset-0 bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <div className="p-3 bg-white">
                    <h4 className="font-medium text-sm text-gray-900 text-center truncate">
                      {fullLayout.name}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loadingLayout && selectedLayoutId && (
          <Card className="p-12 bg-gradient-to-br from-rose-50 to-pink-50">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-14 w-14 animate-spin text-rose-600" />
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
        {/* Cabeçalho Minimalista */}
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-neutral-100 shadow-sm">
              <Type className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <Label className="text-lg font-bold text-neutral-900">
                {customization.name}
                {customization.isRequired && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p className="text-sm text-neutral-600 mt-1">
                  {customization.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {fields.map((field) => {
          let data = customizationData[customization.id] as
            | Record<string, string>
            | undefined;

          if (!data && initialValues && initialValues[customization.id]) {
            const initialValue = initialValues[customization.id] as unknown;
            if (typeof initialValue === "object" && initialValue !== null) {
              data = initialValue as Record<string, string>;
            }
          }

          const value = data?.[field.id] || "";

          return (
            <div key={field.id} className="space-y-2">
              <Label
                htmlFor={field.id}
                className="font-medium text-amber-900"
                style={{
                  fontFamily: '"Georgia", serif',
                }}
              >
                {field.label}
              </Label>
              {field.max_length && field.max_length > 20 ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  maxLength={field.max_length}
                  value={value}
                  onChange={(e) =>
                    handleTextChange(customization.id, field.id, e.target.value)
                  }
                  className="bg-gradient-to-b from-yellow-50 to-white border-amber-200 focus:border-amber-500 focus:ring-amber-200 text-gray-800 placeholder:text-amber-400 shadow-inner min-h-[100px]"
                  style={{
                    fontFamily: '"Georgia", serif',
                    letterSpacing: "0.5px",
                  }}
                />
              ) : (
                <Input
                  id={field.id}
                  type="text"
                  placeholder={field.placeholder}
                  maxLength={field.max_length}
                  value={value}
                  onChange={(e) =>
                    handleTextChange(customization.id, field.id, e.target.value)
                  }
                  className="bg-gradient-to-b from-yellow-50 to-white border-amber-200 focus:border-amber-500 focus:ring-amber-200 text-gray-800 placeholder:text-amber-400 shadow-inner"
                  style={{
                    fontFamily: '"Georgia", serif',
                    letterSpacing: "0.5px",
                  }}
                />
              )}
              {field.max_length && (
                <p
                  className="text-xs text-amber-700"
                  style={{ fontFamily: '"Georgia", serif' }}
                >
                  {value.length}/{field.max_length} caracteres
                </p>
              )}
            </div>
          );
        })}

        <motion.div
          className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent border-t-2 border-amber-200 shadow-2xl"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="max-w-6xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setCustomizationData((prev) => ({
                  ...prev,
                  [customization.id]: {},
                }))
              }
              className="flex-1"
              disabled={loading}
            >
              Limpar
            </Button>
            <Button
              onClick={() => {
                const result: CustomizationInput[] = [];
                const data = customizationData[customization.id] as
                  | Record<string, string>
                  | undefined;

                if (data && Object.keys(data).length > 0) {
                  // Se houver apenas um campo, não repetir o label (ex: "Mesagem: Te amo") -> "Te amo"
                  const textParts =
                    fields.length === 1
                      ? data[fields[0].id] || ""
                      : fields
                          .map((f) => `${f.label}: ${data[f.id] || ""}`)
                          .join("\n");

                  // ✅ Enviar apenas o texto limpo para o backend
                  result.push({
                    ruleId: customization.id,
                    customizationType: CustomizationType.TEXT,
                    data: {
                      text: textParts,
                    } as unknown as Record<string, unknown>,
                  });
                }

                onComplete(result.length > 0, result);
                toast.success("Texto confirmado!");
              }}
              className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={
                loading ||
                !(
                  customizationData[customization.id] &&
                  Object.values(
                    (customizationData[customization.id] as Record<
                      string,
                      string
                    >) || {},
                  )
                    .join("")
                    .trim().length >= 3
                )
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderImageCustomization = (customization: Customization) => {
    let currentFiles = uploadingFiles[customization.id] || [];
    const maxImages =
      customization.customization_data.dynamic_layout?.max_images || 10;

    // ✅ FIX: Se não temos files em uploadingFiles, tentar restaurar de customizationData ou initialValues
    if (currentFiles.length === 0) {
      const dataFromState = customizationData[customization.id];
      if (Array.isArray(dataFromState) && dataFromState.length > 0) {
        currentFiles = dataFromState as unknown as File[];
      } else if (
        initialValues &&
        Array.isArray(initialValues[customization.id])
      ) {
      }
    }

    const hasImages = currentFiles.length > 0;

    return (
      <div className="space-y-4 pb-5">
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-100">
              <Upload className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <Label className="text-lg font-bold text-neutral-900">
                {customization.name}
                {customization.isRequired && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p className="text-sm text-neutral-600 mt-1">
                  {customization.description}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2 ml-11">
            {currentFiles.length}/{maxImages} imagens
          </p>
        </div>

        {currentFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-neutral-200">
            {currentFiles.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-200 shadow-sm hover:shadow-md transition-shadow"
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
                  className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full opacity-100 shadow-sm"
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-1 truncate px-1">
                  Foto {index + 1}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {Array.from({
            length: Math.max(0, maxImages - currentFiles.length),
          }).map((_, relativeIndex) => {
            const globalIndex = currentFiles.length + relativeIndex;
            return (
              <div key={`empty-slot-${globalIndex}`}>
                <label
                  htmlFor={`file-${customization.id}-${globalIndex}`}
                  className="flex flex-row items-center justify-between border-2 border-dashed border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-all bg-neutral-50/30 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-neutral-100 p-2 rounded-full group-hover:bg-neutral-200 transition-colors">
                      <Upload className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700">
                        Adicionar Foto {globalIndex + 1}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Clique para selecionar
                      </p>
                    </div>
                  </div>

                  <input
                    id={`file-${customization.id}-${globalIndex}`}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      handleFileUpload(customization.id, e.target.files);
                      e.target.value = ""; // Reset input to allow selecting the same file again or triggering change
                    }}
                  />

                  <div className="bg-white border border-neutral-200 px-3 py-1 rounded text-xs font-medium text-neutral-600">
                    Selecionar
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        {hasImages && currentFiles.length === maxImages && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent border-t-2 border-green-200 shadow-2xl"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="max-w-6xl mx-auto flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadingFiles((prev) => ({
                    ...prev,
                    [customization.id]: [],
                  }));
                  setCustomizationData((prev) => ({
                    ...prev,
                    [customization.id]: undefined,
                  }));
                }}
                className="flex-1"
              >
                Limpar
              </Button>
              <Button
                onClick={() => {
                  const result: CustomizationInput[] = [];
                  const filesData = customizationData[customization.id] as
                    | ProcessedFile[]
                    | undefined;

                  if (filesData && filesData.length > 0) {
                    result.push({
                      ruleId: customization.id,
                      customizationRuleId: customization.id,
                      customizationType: CustomizationType.IMAGES,
                      data: {
                        files: filesData.map((item) => item.file),
                        previews: filesData.map(
                          (item) => item.base64 || item.preview,
                        ),
                        count: filesData.length,
                        _customizationName: customization.name,
                        _priceAdjustment: customization.price || 0,
                      } as unknown as Record<string, unknown>,
                    });
                  }

                  onComplete(result.length > 0, result);
                  toast.success("Imagens confirmadas!");
                }}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderMultipleChoiceCustomization = (customization: Customization) => {
    const options = customization.customization_data.options || [];

    // ✅ FIX: Usar initialValues como fallback se customizationData está vazio
    let data = customizationData[customization.id] as
      | { id?: string; label?: string }
      | undefined;

    // Se não temos dados selecionados, procurar nos initialValues
    if (
      !data &&
      initialValues &&
      Object.prototype.hasOwnProperty.call(initialValues, customization.id)
    ) {
      const initialValue: unknown = initialValues[customization.id];
      let matchedOption: (typeof options)[0] | undefined;

      if (typeof initialValue === "string") {
        // String: procurar pela opção correspondente
        matchedOption = options.find(
          (opt: (typeof options)[0]) =>
            opt.id === initialValue || opt.value === initialValue,
        );
      } else if (initialValue !== null && typeof initialValue === "object") {
        // Object: verificar se tem id property
        const objValue = initialValue as Record<string, unknown>;
        if (typeof objValue.id === "string") {
          matchedOption = options.find(
            (opt: (typeof options)[0]) => opt.id === objValue.id,
          );
        }
      }

      if (matchedOption && matchedOption.id && matchedOption.label) {
        data = {
          id: matchedOption.id,
          label: matchedOption.label,
        };
        // Atualizar state com o fallback
        setCustomizationData((prev) => ({
          ...prev,
          [customization.id]: data,
        }));
      }
    }

    const selectedId = data?.id;
    const selectedLabel = data?.label;

    return (
      <div className="space-y-4 pb-5">
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-100">
              <CheckCircle2 className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <Label className="text-lg font-bold text-neutral-900">
                {customization.name}
                {customization.isRequired && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p className="text-sm text-neutral-600 mt-1">
                  {customization.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="h-[40vh] space-y-2 overflow-y-auto px-5">
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-neutral-900 bg-neutral-50 shadow-sm"
                      : "border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50"
                  }`}
                  onClick={() =>
                    handleOptionSelect(
                      customization.id,
                      option.id,
                      option.label,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isSelected ? 1.1 : 1,
                        backgroundColor: isSelected
                          ? "rgb(23 23 23)"
                          : "transparent",
                      }}
                      className="flex-shrink-0 w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center"
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </motion.div>
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-neutral-100">
                      <Image
                        src={
                          getInternalImageUrl(option.image_url) ||
                          "/placeholder.png"
                        }
                        alt={option.label}
                        fill
                        quality={90}
                        className="object-cover bg-neutral-50"
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          isSelected ? "text-neutral-900" : "text-neutral-700"
                        }`}
                      >
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {option.price_adjustment && option.price_adjustment > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-neutral-100 text-neutral-900 font-bold"
                      >
                        +R$ {option.price_adjustment.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {selectedId && selectedLabel && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-neutral-200 shadow-2xl"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="max-w-6xl mx-auto flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setCustomizationData((prev) => ({
                    ...prev,
                    [customization.id]: {},
                  }))
                }
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={() => {
                  const result: CustomizationInput[] = [];
                  customizations.forEach((custom) => {
                    const data = customizationData[custom.id];
                    if (custom.type === "MULTIPLE_CHOICE" && data) {
                      const choiceData = data as {
                        id?: string;
                        label?: string;
                      };
                      if (choiceData.id) {
                        // ✅ Encontrar o price_adjustment da opção selecionada
                        const selectedOption =
                          custom.customization_data.options?.find(
                            (opt: { id: string }) => opt.id === choiceData.id,
                          );
                        const priceAdjustment =
                          (selectedOption as { price_adjustment?: number })
                            ?.price_adjustment || 0;

                        result.push({
                          ruleId: custom.id,
                          customizationType: CustomizationType.MULTIPLE_CHOICE,
                          data: {
                            id: choiceData.id, // ✅ id no nível raiz para validação
                            selected_option: choiceData.id,
                            selected_option_label: choiceData.label || "",
                            _customizationName: custom.name,
                            _priceAdjustment: priceAdjustment,
                          } as unknown as Record<string, unknown>,
                        });
                      }
                    }
                  });
                  onComplete(result.length > 0, result);
                  toast.success("Opção selecionada!");
                }}
                className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (
          !newOpen &&
          (cropDialogOpen || pendingFiles.length > 0 || isCropping)
        ) {
          return;
        }
        if (!newOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            e.preventDefault();
          }
        }}
      >
        {loading && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center z-[60]">
            <AnimatedFramesLoader />
          </div>
        )}

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
                if (customization.type === "DYNAMIC_LAYOUT") {
                  return (
                    <div key={customization.id}>
                      {renderDynamicLayoutSelection(customization)}
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
            </div>
          ) : (
            <div>
              {fullLayoutBase && (
                <ClientFabricEditor
                  layoutBase={fullLayoutBase}
                  onBack={handleBackToSelection}
                  onComplete={handleLayoutComplete}
                  initialState={
                    (
                      customizationData[fullLayoutBase.id] as
                        | { fabricState?: string }
                        | undefined
                    )?.fabricState
                  }
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
          onCropComplete={handleDetailsConfirm}
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
