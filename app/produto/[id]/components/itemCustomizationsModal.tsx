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
import { Label } from "@/app/components/ui/label";
import {
  Upload,
  X,
  Type,
  CheckCircle2,
  Palette,
  Loader2,
  Sparkles,
  ImageIcon,
  Check,
  Clock,
} from "lucide-react";
import { motion } from "motion/react";
import { AnimatedFramesLoader } from "@/app/components/ui/animated-frames-loader";
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
import Image from "next/image";
import { getInternalImageUrl } from "@/lib/image-helper";

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
      additional_time?: number;
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
  onImagesUpdate?: (
    itemId: string,
    imageCount: number,
    maxImages: number
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
    {}
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
        image_url: string;
        slots?: SlotDef[];
        additional_time?: number;
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
        (c) => c.type === "BASE_LAYOUT"
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
          image_url: string;
          slots?: SlotDef[];
          item_type?: string;
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
            image_url: fullLayout.image_url,
            slots: fullLayout.slots,
            item_type: fullLayout.item_type,
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
            image_url: fullLayout.image_url,
            slots: fullLayout.slots,
            item_type: fullLayout.item_type,
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
        (c) => c.type === "BASE_LAYOUT"
      );
      if (!baseLayoutCustom) return;

      const layout = baseLayoutCustom.customization_data.layouts?.find(
        (l) => l.id === layoutId
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

          const response = await fetch(`${API_URL}/layouts/${layoutId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!response.ok) throw new Error("Erro ao buscar layout");

          layoutData = (await response.json()) as LayoutBase;
          layoutCacheRef.current[layoutId] = layoutData;
        }

        setFullLayoutBase(layoutData);

        const modelUrl =
          layoutData.item_type?.toLowerCase() === "caneca"
            ? "/3DModels/caneca.glb"
            : layoutData.item_type?.toLowerCase() === "quadro"
            ? "/3DModels/quadro.glb"
            : undefined;

        setCustomizationData((prev) => ({
          ...prev,
          [baseLayoutCustom.id]: {
            ...((prev[baseLayoutCustom.id] as Record<string, unknown>) || {}),
            model_url: modelUrl,
            item_type: layoutData.item_type,
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
    [customizations]
  );

  // ✅ Initialize customizationData from initialValues (fallback for reopening modal)
  useEffect(() => {
    if (!isOpen) return;

    if (initialValues && Object.keys(initialValues).length > 0) {
      console.log(
        "🔄 [ItemCustomizationModal] Initializing with:",
        initialValues
      );

      // ✅ Processar initialValues para garantir estrutura correta
      const processedData: Record<string, unknown> = {};

      for (const [customId, value] of Object.entries(initialValues)) {
        console.log(`🔍 [ItemCustomizationModal] Processing ${customId}:`, {
          valueType: typeof value,
          value: value instanceof Object ? Object.keys(value as object) : value,
        });

        // Se value é um objeto (vem desserializado do backend)
        if (value && typeof value === "object") {
          const obj = value as Record<string, unknown>;

          // Se tem "customization_type" e "title", é um objeto completo desserializado
          if (obj.customization_type) {
            // Processar baseado no tipo
            if (obj.customization_type === "TEXT") {
              // Se tem "fields", estruturar corretamente
              if (obj.fields && typeof obj.fields === "object") {
                processedData[customId] = obj.fields;
              } else {
                // Senão, guardar o objeto todo
                processedData[customId] = obj;
              }
            } else if (obj.customization_type === "MULTIPLE_CHOICE") {
              // Para MULTIPLE_CHOICE, tentar extrair selected_option
              processedData[customId] = obj.selected_option || obj;
            } else if (obj.customization_type === "IMAGES") {
              // Para IMAGES, tentar extrair photos
              processedData[customId] = obj.photos || obj;
            } else if (obj.customization_type === "BASE_LAYOUT") {
              // Para BASE_LAYOUT, manter todo o objeto
              processedData[customId] = obj;
            } else {
              processedData[customId] = obj;
            }
          } else {
            // Se não tem customization_type, é um mapeamento direto
            processedData[customId] = value;
          }
        } else {
          // Se é um valor simples (string, number, array), manter como está
          processedData[customId] = value;
        }
      }

      console.log("🔄 [ItemCustomizationModal] Processed data:", processedData);
      setCustomizationData(processedData);

      // ✅ Restore BASE_LAYOUT state if present
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (baseLayoutCustom) {
        const layoutData = processedData[baseLayoutCustom.id] as
          | Record<string, unknown>
          | undefined;
        const layoutId = layoutData?.layout_id as string | undefined;

        if (layoutId) {
          console.log("🎨 Restoring layout selection:", layoutId);
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
    async (images: ImageData[], previewUrl: string) => {
      const baseLayoutCustom = customizations.find(
        (c) => c.type === "BASE_LAYOUT"
      );
      if (!baseLayoutCustom) return;

      // 🔄 DEFERRED UPLOAD: We simply save the preview URL (which might be base64)
      // The actual upload will happen in `client-product-page.tsx` when adding to cart.

      const existingData =
        (customizationData[baseLayoutCustom.id] as Record<string, unknown>) ||
        {};

      const updatedData = {
        ...customizationData,
        [baseLayoutCustom.id]: {
          ...existingData,
          images,
          previewUrl, // Can be base64
        },
      };

      setCustomizationData(updatedData);

      if (onPreviewChange) {
        onPreviewChange(previewUrl);
      }

      const result: CustomizationInput[] = [];

      customizations.forEach((custom) => {
        const data = updatedData[custom.id];

        if (custom.type === "BASE_LAYOUT" && data) {
          const layoutData = data as {
            layout_id?: string;
            layout_name?: string;
            model_url?: string;
            item_type?: string;
            images?: ImageData[];
            previewUrl?: string;
          };
          if (layoutData.layout_id) {
            // Get additional_time from cached full layout
            const cachedLayout = layoutCacheRef.current[layoutData.layout_id];
            result.push({
              ruleId: custom.id,
              customizationRuleId: custom.id,
              customizationType: CustomizationType.BASE_LAYOUT,
              selectedLayoutId: layoutData.layout_id,
              data: {
                id: layoutData.layout_id,
                name: layoutData.layout_name || "",
                model_url: layoutData.model_url,
                item_type: layoutData.item_type,
                images: layoutData.images || [],
                image: {
                  preview_url: layoutData.previewUrl,
                },
                previewUrl: layoutData.previewUrl,
                _customizationName: custom.name,
                additional_time:
                  cachedLayout?.additional_time ||
                  fullLayoutBase?.additional_time ||
                  0,
              } as unknown as Record<string, unknown>,
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
      fullLayoutBase?.additional_time,
    ]
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
      } else if (customization.type === "BASE_LAYOUT") {
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
        (c) => c.id === customizationId
      );
      if (!customization) return;

      const fileArray = Array.from(files);

      setCurrentCustomizationId(customizationId);
      setImagesCustomizationId(customizationId);
      setPendingFiles((prev) => [...prev, ...fileArray]);
    },
    [customizations]
  );

  const handleCropComplete = useCallback(
    (croppedImageUrl: string) => {
      console.log("✅ [Crop] Complete triggered");
      if (!currentCustomizationId) {
        console.warn("⚠️ [Crop] No current customization ID");
        return;
      }

      const customization = customizations.find(
        (c) => c.id === currentCustomizationId
      );
      if (!customization) return;

      fetch(croppedImageUrl)
        .then((res) => res.blob())
        .then(async (blob) => {
          const file = new File([blob], fileToCrop?.name || "cropped.png", {
            type: "image/png",
          });

          const maxImages =
            customization.customization_data.base_layout?.max_images || 10;

          // Use Ref to get latest files, avoiding stale closures
          const currentFiles =
            uploadingFilesRef.current[currentCustomizationId] || [];
          console.log(
            "💾 [Crop] Saving. Current:",
            currentFiles.length,
            "Max:",
            maxImages
          );

          const totalFiles = [...currentFiles, file].slice(0, maxImages);

          setUploadingFiles((prev) => ({
            ...prev,
            [currentCustomizationId]: totalFiles,
          }));

          // Notificar pai sobre o número de imagens adicionadas
          if (onImagesUpdate && itemId) {
            console.log("📸 [onImagesUpdate] Chamando callback:", {
              itemId: itemId,
              current: totalFiles.length,
              max: maxImages,
            });
            onImagesUpdate(itemId, totalFiles.length, maxImages);
          }

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
    [currentCustomizationId, customizations, fileToCrop, onImagesUpdate, itemId]
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

      // Notificar pai sobre o novo número de imagens
      const customization = customizations.find(
        (c) => c.id === customizationId
      );
      if (customization && customization.type === "IMAGES" && onImagesUpdate) {
        const maxImages =
          customization.customization_data.base_layout?.max_images || 10;
        console.log("📸 [handleRemoveFile] Atualizando contador:", {
          itemId: itemId,
          newCount: newFiles.length,
          max: maxImages,
        });
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
    [uploadingFiles, customizations, itemId, onImagesUpdate]
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
                <span className="ml-2 text-sm text-red-500 font-medium">
                  * Obrigatório
                </span>
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
                  let normalizedUrl = getDirectImageUrl(url);
                  // Optimize Drive images with thumbnail parameter
                  if (normalizedUrl.includes("drive.google.com")) {
                    normalizedUrl += "&sz=w500";
                  }
                  return `/api/proxy-image?url=${encodeURIComponent(
                    normalizedUrl
                  )}`;
                }

                return url;
              };

              const imageUrl = getProxiedImageUrl(fullLayout.image_url || "");
              const hasSlots = fullLayout.slots && fullLayout.slots.length > 0;
              const isQuadro = fullLayout.item_type?.toLowerCase() === "quadro";

              return (
                <div
                  key={fullLayout.id}
                  className={`group cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-2xl hover:scale-105 border-2 border-gray-200 hover:border-purple-300 ${
                    isQuadro ? "rounded-lg shadow-lg" : ""
                  }`}
                  onClick={() => handleLayoutSelect(fullLayout.id)}
                >
                  {/* Para quadros: aspect-square para parecer um quadro real. Para outros: aspect-video */}
                  <div
                    className={`relative bg-gradient-to-br from-gray-50 to-gray-100 ${
                      isQuadro
                        ? "aspect-square p-3"
                        : "aspect-video max-h-[200px]"
                    }`}
                  >
                    {/* Moldura visual para quadros */}
                    {isQuadro && (
                      <div className="absolute inset-2 border-4 border-amber-800/30 rounded-sm pointer-events-none z-10 shadow-inner" />
                    )}

                    {imageLoaded && !imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                      </div>
                    )}

                    {imageUrl ? (
                      <div
                        className={`relative w-full h-full ${
                          isQuadro ? "p-1" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={fullLayout.name}
                          className={`w-full h-full transition-all duration-300 ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                          } ${
                            isQuadro ? "object-contain rounded" : "object-cover"
                          }`}
                          onLoad={() => {
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

                    {hasSlots && (
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="bg-purple-600 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Permite fotos
                        </div>
                        {fullLayout.additional_time ? (
                          <div>
                            <div className="bg-purple-600 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg flex items-center gap-1">
                              <Clock className="h-3 w-3" />+
                              {fullLayout.additional_time} min
                            </div>
                          </div>
                        ) : null}
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
        {/* Cabeçalho com vibe papel antigo */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 shadow-sm relative overflow-hidden">
          {/* Texture papel antigo */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage:
                'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.8"/></svg>\')',
            }}
          />

          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-amber-100 shadow-sm">
              <Type className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <Label
                className="text-lg font-bold text-amber-900"
                style={{
                  textShadow: "1px 1px 2px rgba(0,0,0,0.05)",
                  fontFamily: '"Georgia", serif',
                }}
              >
                {customization.name}
                {customization.isRequired && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p
                  className="text-sm text-amber-800 mt-1"
                  style={{
                    fontStyle: "italic",
                    fontFamily: '"Georgia", serif',
                    opacity: 0.8,
                  }}
                >
                  {customization.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {fields.map((field) => {
          // ✅ Tentar restaurar de customizationData OU initialValues
          let data = customizationData[customization.id] as
            | Record<string, string>
            | undefined;

          // Se não temos dados em customizationData, tentar de initialValues
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

        {/* Botão de Confirmar para Texto */}
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
                  const textParts = fields
                    .map((f) => `${f.label}: ${data[f.id] || ""}`)
                    .join("\n");

                  result.push({
                    ruleId: customization.id,
                    customizationType: CustomizationType.TEXT,
                    data: {
                      text: textParts,
                      fields: data,
                      _customizationName: customization.name,
                      _priceAdjustment: customization.price || 0,
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
                    >) || {}
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
      customization.customization_data.base_layout?.max_images || 10;

    // ✅ FIX: Se não temos files em uploadingFiles, tentar restaurar de customizationData ou initialValues
    if (currentFiles.length === 0) {
      const dataFromState = customizationData[customization.id];
      if (Array.isArray(dataFromState) && dataFromState.length > 0) {
        currentFiles = dataFromState as unknown as File[];
      } else if (
        initialValues &&
        Array.isArray(initialValues[customization.id])
      ) {
        const initialPhotos = initialValues[customization.id] as unknown[];
        // Se são strings ou objetos com preview_url, manter para referência
        console.log(
          `✅ [renderImageCustomization] Restaurou ${initialPhotos.length} imagens de initialValues`
        );
      }
    }

    // const canAddMore = currentFiles.length < maxImages;
    const hasImages = currentFiles.length > 0;

    return (
      <div className="space-y-4 pb-5">
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-200">
              <Upload className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <Label className="text-lg font-bold text-green-900">
                {customization.name}
                {customization.isRequired && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p className="text-sm text-green-800 mt-1">
                  {customization.description}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-green-700 mt-2 ml-11">
            {currentFiles.length}/{maxImages} imagens
          </p>
        </div>

        {currentFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-green-200">
            {currentFiles.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow"
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
                  className="flex flex-row items-center justify-between border-2 border-dashed border-green-300 rounded-xl p-4 cursor-pointer hover:border-green-600 hover:bg-green-50/80 transition-all bg-green-50/30 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full group-hover:bg-green-200 transition-colors">
                      <Upload className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900 group-hover:text-green-700">
                        Adicionar Foto {globalIndex + 1}
                      </p>
                      <p className="text-xs text-green-600">
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

                  <div className="bg-white border border-green-200 px-3 py-1 rounded text-xs font-medium text-green-700">
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
                    | Array<{
                        file: File;
                        preview: string;
                        position: number;
                        base64?: string;
                        mime_type?: string;
                        size?: number;
                      }>
                    | undefined;

                  if (filesData && filesData.length > 0) {
                    result.push({
                      ruleId: customization.id,
                      customizationRuleId: customization.id,
                      customizationType: CustomizationType.IMAGES,
                      data: {
                        files: filesData.map((item) => item.file),
                        previews: filesData.map(
                          (item) => item.base64 || item.preview
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
            opt.id === initialValue || opt.value === initialValue
        );
      } else if (initialValue !== null && typeof initialValue === "object") {
        // Object: verificar se tem id property
        const objValue = initialValue as Record<string, unknown>;
        if (typeof objValue.id === "string") {
          matchedOption = options.find(
            (opt: (typeof options)[0]) => opt.id === objValue.id
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
        <div className="p-4 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-200">
              <CheckCircle2 className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <Label className="text-lg font-bold text-rose-900">
                {customization.name}
                {customization.isRequired && (
                  <Badge
                    variant="destructive"
                    className="ml-2 text-xs text-white"
                  >
                    Obrigatório
                  </Badge>
                )}
              </Label>
              {customization.description && (
                <p className="text-sm text-rose-800 mt-1">
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-rose-500 bg-gradient-to-r from-rose-50 to-pink-50 shadow-md"
                      : "border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50/30"
                  }`}
                  onClick={() =>
                    handleOptionSelect(
                      customization.id,
                      option.id,
                      option.label
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isSelected ? 1.2 : 1,
                        backgroundColor: isSelected
                          ? "rgb(244 63 94)"
                          : "rgb(254 226 226)",
                      }}
                      className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-rose-300 flex items-center justify-center"
                    >
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </motion.div>
                    <Image
                      src={
                        getInternalImageUrl(option.image_url) ||
                        "/placeholder.png"
                      }
                      alt={option.label}
                      width={64}
                      height={64}
                      quality={90}
                      className="w-16 h-16 object-cover rounded-md border-2 border-rose-200"
                    />
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          isSelected ? "text-rose-900" : "text-rose-800"
                        }`}
                      >
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-xs text-rose-700 mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {option.price_adjustment && option.price_adjustment > 0 && (
                      <Badge
                        variant="outline"
                        className="text-rose-700 border-rose-300 bg-rose-50"
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
            className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent border-t-2 border-rose-200 shadow-2xl"
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
                        result.push({
                          ruleId: custom.id,
                          customizationType: CustomizationType.MULTIPLE_CHOICE,
                          data: {
                            id: choiceData.id,
                            label: choiceData.label || "",
                            _customizationName: custom.name,
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
        // Evitar fechar o dialog se está em andamento operação de crop de imagem ou processando arquivos
        if (
          !newOpen &&
          (cropDialogOpen || pendingFiles.length > 0 || isCropping)
        ) {
          console.log(
            "⛔ [Dialog] Tentativa bloqueada - cropDialogOpen:",
            cropDialogOpen,
            "pendingFiles:",
            pendingFiles.length,
            "isCropping:",
            isCropping
          );
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
          // Prevenir fechamento quando clica fora durante crop ou processamento
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            console.log("🛡️ [DialogContent] onPointerDownOutside bloqueado");
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevenir interação externa durante crop ou processamento
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            console.log("🛡️ [DialogContent] onInteractOutside bloqueado");
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevenir fechamento por ESC durante crop ou processamento
          if (cropDialogOpen || pendingFiles.length > 0 || isCropping) {
            console.log("🛡️ [DialogContent] onEscapeKeyDown bloqueado");
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
            </div>
          ) : (
            <div>
              {fullLayoutBase && (
                <ClientPersonalizationEditor
                  layoutBase={fullLayoutBase}
                  onComplete={handleLayoutComplete}
                  onBack={handleBackToSelection}
                  initialImages={
                    (
                      customizationData[fullLayoutBase.id] as
                        | { images?: unknown }
                        | undefined
                    )?.images as ImageData[]
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
