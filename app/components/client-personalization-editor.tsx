"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Trash2, Upload, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { dataURLtoBlob } from "@/app/lib/utils";
import { usePersonalization } from "../hooks/use-personalization";
import type { LayoutBase, ImageData, SlotDef } from "../types/personalization";
import { normalizeGoogleDriveUrl } from "../helpers/drive-normalize";
import { ImageCropDialog } from "./ui/image-crop-dialog";

interface ClientPersonalizationEditorProps {
  layoutBase: LayoutBase;
  onComplete: (images: ImageData[], previewUrl: string) => void;
  onBack: () => void;
  initialImages?: ImageData[];
}

export default function ClientPersonalizationEditor({
  layoutBase,
  onComplete,
  onBack,
  initialImages,
}: ClientPersonalizationEditorProps) {
  const { fileToImageData } = usePersonalization();

  const [uploadedImages, setUploadedImages] = useState<
    Map<string, ImageData & { previewUrl?: string }>
  >(new Map());
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const slotImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const loadBaseImage = async () => {
      try {
        const imageUrl = layoutBase.previewImageUrl;
        if (!imageUrl) return;

        if (imageUrl.startsWith("data:")) {
          const img = new Image();
          img.onload = () => {
            baseImageRef.current = img;
            setBaseImageLoaded(true);
            setTimeout(() => updateCanvasPreview(), 0);
          };
          img.src = imageUrl;
          return;
        }

        const normalizedUrl = normalizeGoogleDriveUrl(imageUrl);
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
          normalizedUrl,
        )}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Erro ao carregar imagem");

        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
          toast.error("Erro: Imagem não acessível");
          return;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const img = new Image();
        img.onload = () => {
          baseImageRef.current = img;
          setBaseImageLoaded(true);
          setTimeout(() => updateCanvasPreview(), 0);
        };
        img.src = base64;
      } catch (err) {
        console.error("Erro ao carregar imagem base:", err);
        toast.error("Erro ao carregar preview do layout");
      }
    };

    loadBaseImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutBase.previewImageUrl]);

  useEffect(() => {
    const restoreState = async () => {
      if (
        initialImages &&
        initialImages.length > 0 &&
        uploadedImages.size === 0
      ) {
        const newMap = new Map<string, ImageData & { previewUrl?: string }>();

        for (const imgData of initialImages) {
          if (!imgData.slotId) continue;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let previewUrl = (imgData as any).previewUrl;

          if (!previewUrl && imgData.imageBuffer) {
            const buffer = imgData.imageBuffer;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blob = new Blob([buffer as any], { type: imgData.mimeType });
            previewUrl = URL.createObjectURL(blob);
          }

          if (previewUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = previewUrl;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });

            slotImagesRef.current.set(imgData.slotId, img);
            newMap.set(imgData.slotId, { ...imgData, previewUrl });
          }
        }

        if (newMap.size > 0) {
          setUploadedImages(newMap);
          setTimeout(() => updateCanvasPreview(), 200);
        }
      }
    };

    restoreState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCanvasPreview = useCallback(() => {
    if (!canvasRef.current || !baseImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = layoutBase.width;
    canvas.height = layoutBase.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sortedSlots = [...layoutBase.slots].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
    );

    sortedSlots.forEach((slot) => {
      const imageData = uploadedImages.get(slot.id);
      const img = slotImagesRef.current.get(slot.id);
      ctx.save();

      const slotX = (slot.x / 100) * canvas.width;
      const slotY = (slot.y / 100) * canvas.height;
      const slotWidth = (slot.width / 100) * canvas.width;
      const slotHeight = (slot.height / 100) * canvas.height;

      if (slot.rotation) {
        ctx.translate(slotX + slotWidth / 2, slotY + slotHeight / 2);
        ctx.rotate((slot.rotation * Math.PI) / 180);
        ctx.translate(-(slotX + slotWidth / 2), -(slotY + slotHeight / 2));
      }

      ctx.beginPath();
      ctx.rect(slotX, slotY, slotWidth, slotHeight);
      ctx.clip();

      if (img?.complete) {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const slotRatio = slotWidth / slotHeight;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > slotRatio) {
          drawHeight = slotHeight;
          drawWidth = drawHeight * imgRatio;
          offsetX = (slotWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = slotWidth;
          drawHeight = drawWidth / imgRatio;
          offsetX = 0;
          offsetY = (slotHeight - drawHeight) / 2;
        }

        ctx.drawImage(
          img,
          slotX + offsetX,
          slotY + offsetY,
          drawWidth,
          drawHeight,
        );
      } else if (!imageData) {
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 2;
        ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

        ctx.fillStyle = "#6b7280";
        const fontSize = Math.max(14, Math.floor(slotHeight * 0.15));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("📷", slotX + slotWidth / 2, slotY + slotHeight / 2 - 10);
        ctx.font = `${fontSize * 0.6}px sans-serif`;
        ctx.fillText(
          "Adicione sua foto",
          slotX + slotWidth / 2,
          slotY + slotHeight / 2 + 15,
        );
      } else {
      }

      ctx.restore();
    });

    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);
  }, [layoutBase, uploadedImages]);

  const handleFileUpload = async (slotId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    const aspect = 1;

    setFileToCrop(file);
    setCropAspect(aspect);
    setCurrentSlotId(slotId);
    setCropDialogOpen(true);
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!currentSlotId) return;

    try {

      const blob = dataURLtoBlob(croppedImageUrl);
      const file = new File([blob], "cropped-image.png", {
        type: "image/png",
      });

      const previewUrl = URL.createObjectURL(file);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = previewUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      slotImagesRef.current.set(currentSlotId, img);

      const imageData = await fileToImageData(file, currentSlotId);

      setUploadedImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentSlotId, { ...imageData, previewUrl });
        return newMap;
      });

      setTimeout(() => {
        updateCanvasPreview();
      }, 100);

      toast.success("Foto adicionada!");
    } catch (err) {
      console.error("Erro ao processar imagem cortada:", err);
      toast.error("Erro ao adicionar foto");
    }
  };
  const handleRemoveImage = (slotId: string) => {
    const imageData = uploadedImages.get(slotId);
    if (imageData?.previewUrl) {
      URL.revokeObjectURL(imageData.previewUrl);
    }

    setUploadedImages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(slotId);
      return newMap;
    });

    slotImagesRef.current.delete(slotId);
    updateCanvasPreview();
    toast.success("Foto removida");
  };

  const getPreviewUrl = useCallback((): string | null => {
    if (!canvasRef.current?.width || !canvasRef.current?.height) return null;
    try {
      return canvasRef.current.toDataURL("image/png");
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
      return null;
    }
  }, []);

  const handleComplete = () => {

    if (layoutBase.slots.length > 0 && uploadedImages.size === 0) {
      toast.error("Adicione pelo menos uma foto");
      return;
    }

    const previewUrl = getPreviewUrl();

    if (!previewUrl) {
      toast.error("Erro ao gerar preview. Tente novamente.");
      return;
    }

    const images = Array.from(uploadedImages.values());
    onComplete(images, previewUrl);
  };

  const renderSlot = (slot: SlotDef, index: number) => {
    const imageData = uploadedImages.get(slot.id);
    const hasImage = !!imageData;

    return (
      <div key={slot.id} className="group relative">
        {hasImage ? (
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData.previewUrl || ""}
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveImage(slot.id)}
                className="rounded-full h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs font-medium">Foto {index + 1}</p>
            </div>
          </div>
        ) : (
          <label
            htmlFor={`upload-${slot.id}`}
            className="block aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer"
          >
            <div className="h-full flex flex-col items-center justify-center gap-2 p-4">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                Foto {index + 1}
              </p>
              <p className="text-xs text-gray-500 text-center">
                Clique para adicionar
              </p>
            </div>
            <Input
              id={`upload-${slot.id}`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(slot.id, file);
              }}
              className="hidden"
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos layouts
        </Button>
        <div className="text-right">
          <h3 className="font-semibold text-lg">{layoutBase.name}</h3>
          <p className="text-sm text-gray-600">
            {uploadedImages.size} de {layoutBase.slots.length} fotos adicionadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <Label className="text-lg font-semibold">
                Adicione suas fotos
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Escolha {layoutBase.slots.length} foto(s) para personalizar sua{" "}
                {layoutBase.item_type}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {layoutBase.slots.map((slot, index) => renderSlot(slot, index))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <Label className="text-lg font-semibold">Preview 2D</Label>
              <p className="text-sm text-gray-600 mt-1">
                Veja como ficará sua personalização
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 min-h-[400px] flex items-center justify-center">
              {baseImageLoaded ? (
                <div className="relative w-full max-w-md aspect-square">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain border-4 border-white rounded-lg shadow-2xl"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      Carregando preview...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button
          onClick={handleComplete}
          disabled={layoutBase.slots.length > 0 && uploadedImages.size === 0}
          className="bg-purple-600 hover:bg-purple-700 gap-2"
        >
          <Check className="h-4 w-4" />
          Confirmar Personalização
        </Button>
      </div>

      
      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setFileToCrop(null);
            setCurrentSlotId(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={cropAspect}
          title="Ajustar sua foto"
          description="Recorte sua foto em formato quadrado (1:1)"
        />
      )}
    </div>
  );
}
