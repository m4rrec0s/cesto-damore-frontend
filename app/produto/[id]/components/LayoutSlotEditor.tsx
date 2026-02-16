"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Upload, X, Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { dataURLtoBlob } from "@/app/lib/utils";
import type { LayoutBase, ImageData } from "@/app/types/personalization";
import { getDirectImageUrl } from "@/app/helpers/drive-normalize";
import { Model3DViewer } from "./Model3DViewer";
import { ImageCropDialog } from "@/app/components/ui/image-crop-dialog";

interface LayoutSlotEditorProps {
  layoutBase: LayoutBase;
  onImagesChange: (images: ImageData[]) => void;
  onPreviewChange: (previewUrl: string | null) => void;
}

interface SlotImageData {
  file: File;
  preview: string;
  imageData?: ImageData;
}

export function LayoutSlotEditor({
  layoutBase,
  onImagesChange,
  onPreviewChange,
}: LayoutSlotEditorProps) {
  const [slotImages, setSlotImages] = useState<Record<string, SlotImageData>>(
    {},
  );
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<
    "edit" | "preview-2d" | "preview-3d"
  >("edit");
  const [previewTextureUrl, setPreviewTextureUrl] = useState<string | null>(
    null,
  );

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
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          baseImageRef.current = img;
          setBaseImageLoaded(true);
          updateCanvasPreview();
        };

        img.onerror = () => {
          toast.error("Erro ao carregar imagem base do layout");
        };

        const normalizedUrl = getDirectImageUrl(layoutBase.previewImageUrl);

        if (normalizedUrl.includes("drive.google.com")) {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
            normalizedUrl,
          )}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error("Erro ao carregar via proxy");
          const blob = await response.blob();
          img.src = URL.createObjectURL(blob);
        } else {
          img.src = normalizedUrl;
        }
      } catch (err) {
        console.error("Erro ao carregar imagem base:", err);
        toast.error("Erro ao carregar layout");
      }
    };

    loadBaseImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutBase.previewImageUrl]);

  const updateCanvasPreview = useCallback(() => {
    if (!canvasRef.current || !baseImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = layoutBase.width;
    canvas.height = layoutBase.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sortedSlots = [...layoutBase.slots].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
    );

    sortedSlots.forEach((slot) => {
      const slotImageData = slotImages[slot.id];
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

      if (!slotImageData) {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
        ctx.fillStyle = "#ffffff";
        const fontSize = Math.max(12, Math.floor(slotHeight * 0.12));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "SUA FOTO AQUI",
          slotX + slotWidth / 2,
          slotY + slotHeight / 2,
        );
      } else if (img && img.complete) {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const slotRatio = slotWidth / slotHeight;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > slotRatio) {
          drawHeight = slotHeight;
          drawWidth = drawHeight * imgRatio;
          offsetX = -(drawWidth - slotWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = slotWidth;
          drawHeight = drawWidth / imgRatio;
          offsetX = 0;
          offsetY = -(drawHeight - slotHeight) / 2;
        }

        ctx.drawImage(
          img,
          slotX + offsetX,
          slotY + offsetY,
          drawWidth,
          drawHeight,
        );
      }

      ctx.restore();
    });

    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    try {
      const previewUrl = canvas.toDataURL("image/png");
      onPreviewChange(previewUrl);
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
    }
  }, [layoutBase, slotImages, onPreviewChange]);

  useEffect(() => {
    if (baseImageLoaded) {
      updateCanvasPreview();
    }
  }, [slotImages, baseImageLoaded, updateCanvasPreview, viewMode]);

  const fileToImageData = async (
    file: File,
    slotId: string,
  ): Promise<ImageData> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      },
    );

    return {
      slotId,
      imageBuffer: uint8Array,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      originalName: file.name,
    };
  };

  const handleFileUpload = async (slotId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    const slot = layoutBase.slots.find((s) => s.id === slotId);
    const aspect = slot
      ? (slot.width * layoutBase.width) / (slot.height * layoutBase.height)
      : 1;

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

      const imageData = await fileToImageData(file, currentSlotId);
      const preview = URL.createObjectURL(file);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = preview;
      img.onload = () => {
        slotImagesRef.current.set(currentSlotId, img);
        updateCanvasPreview();
      };

      setSlotImages((prev) => ({
        ...prev,
        [currentSlotId]: { file, preview, imageData },
      }));

      const allImages = Object.values({
        ...slotImages,
        [currentSlotId]: { file, preview, imageData },
      })
        .map((d) => d.imageData!)
        .filter(Boolean);

      onImagesChange(allImages);

      toast.success("Imagem adicionada ao slot");
    } catch (err) {
      console.error("Erro no upload:", err);
      toast.error("Erro ao processar imagem");
    }
  };

  const handleRemoveImage = async (slotId: string) => {
    const imageData = slotImages[slotId];
    if (!imageData) return;

    try {
      URL.revokeObjectURL(imageData.preview);

      setSlotImages((prev) => {
        const newSlots = { ...prev };
        delete newSlots[slotId];
        return newSlots;
      });

      slotImagesRef.current.delete(slotId);
      updateCanvasPreview();

      const newSlotImages = { ...slotImages };
      delete newSlotImages[slotId];
      const allImages = Object.values(newSlotImages)
        .map((d) => d.imageData!)
        .filter(Boolean);

      onImagesChange(allImages);

      toast.success("Imagem removida");
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  const handleDownloadPreview = () => {
    if (!canvasRef.current) {
      toast.error("Preview não disponível");
      return;
    }

    try {
      const previewUrl = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = `preview-${layoutBase.name}-${Date.now()}.png`;
      link.click();
      toast.success("Preview baixado!");
    } catch (err) {
      console.error("Erro ao baixar:", err);
      toast.error("Erro ao baixar preview");
    }
  };

  const getPreviewUrl = useCallback((): string | null => {
    if (!canvasRef.current?.width || !canvasRef.current?.height) {
      return null;
    }

    try {
      return canvasRef.current.toDataURL("image/png");
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
      return null;
    }
  }, []);

  const handleSwitchTo3D = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas não disponível para gerar preview 3D.");
      return;
    }

    if (!layoutBase.model_url) {
      toast.error("Este layout não possui modelo 3D disponível.");
      return;
    }

    try {
      updateCanvasPreview();
    } catch {}

    await new Promise((r) => setTimeout(r, 80));

    const preview = getPreviewUrl();
    if (!preview) {
      toast.error("Preview 2D não disponível. Aguarde o carregamento.");
      return;
    }

    setPreviewTextureUrl(preview);
    setViewMode("preview-3d");
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                {viewMode === "edit"
                  ? "Personalize com suas fotos"
                  : "Visualizar Resultado"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {viewMode === "edit"
                  ? "Adicione suas imagens em cada espaço disponível"
                  : "Veja como ficará seu produto personalizado"}
              </p>
            </div>
            <div className="flex gap-2">
              {viewMode === "edit" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode("preview-2d")}
                    disabled={Object.keys(slotImages).length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Preview
                  </Button>
                </>
              ) : (
                <>
                  <div className="inline-flex rounded-md border bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("preview-2d")}
                      className={
                        viewMode === "preview-2d"
                          ? "px-3 py-1 text-sm bg-purple-500 text-white rounded"
                          : "px-3 py-1 text-sm text-slate-700 rounded"
                      }
                    >
                      2D
                    </button>
                    {layoutBase.model_url && (
                      <button
                        type="button"
                        onClick={handleSwitchTo3D}
                        className={
                          viewMode === "preview-3d"
                            ? "px-3 py-1 text-sm bg-purple-500 text-white rounded"
                            : "px-3 py-1 text-sm text-slate-700 rounded"
                        }
                      >
                        3D
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode("edit")}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Editar Fotos
                  </Button>
                  <Button
                    onClick={handleDownloadPreview}
                    disabled={!baseImageLoaded}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "edit" ? (
            <div className="space-y-4">
              {layoutBase.slots.map((slot, index) => {
                const hasImage = !!slotImages[slot.id];

                return (
                  <div
                    key={slot.id}
                    className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs">
                          {index + 1}
                        </span>
                        Foto {index + 1}
                      </Label>
                      {hasImage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(slot.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>

                    {hasImage ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slotImages[slot.id].preview}
                          alt={slotImages[slot.id].file.name}
                          className="object-cover rounded-lg shadow-md w-full max-w-[200px] h-[200px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          ✅ {slotImages[slot.id].file.name}
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-purple-300 rounded-lg overflow-hidden w-full max-w-[200px] h-[200px] flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-400 transition-colors">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(slot.id, file);
                          }}
                          className="hidden"
                          id={`upload-slot-${slot.id}`}
                        />
                        <Label
                          htmlFor={`upload-slot-${slot.id}`}
                          className="cursor-pointer flex flex-col items-center justify-center p-6 w-full h-full"
                        >
                          <Upload className="h-12 w-12 text-purple-400 mb-3" />
                          <span className="text-sm font-medium text-center text-purple-700">
                            Clique para adicionar
                          </span>
                          <span className="text-xs text-center text-purple-600 mt-1">
                            sua foto aqui
                          </span>
                        </Label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewMode === "preview-2d" ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto border-2 border-purple-200 rounded-lg shadow-xl"
                    style={{
                      maxHeight: "600px",
                      display: baseImageLoaded ? "block" : "none",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : viewMode === "preview-3d" &&
            layoutBase.model_url &&
            previewTextureUrl ? (
            <div className="w-full min-h-[500px] bg-gray-50 rounded-lg p-4">
              <Model3DViewer
                modelUrl={layoutBase.model_url}
                materialColor="#ffffff"
                textures={[
                  layoutBase.item_type?.toLowerCase() === "caneca"
                    ? {
                        areaId: "main",
                        imageUrl: previewTextureUrl,
                        mapping: "cylinder" as const,
                        cylinder: (() => {
                          const CYLINDER_RADIUS = 0.46;
                          const PRINT_AREA_HEIGHT = 0.95;
                          const CYLINDER_HANDLE_GAP = Math.PI / 8;
                          const FULL_WRAP_MAX_THETA =
                            Math.PI * 2 - CYLINDER_HANDLE_GAP * 2;

                          const widthMeters =
                            (layoutBase.width / layoutBase.height) *
                            PRINT_AREA_HEIGHT;
                          let thetaLength = widthMeters / CYLINDER_RADIUS;
                          if (!isFinite(thetaLength) || thetaLength <= 0) {
                            thetaLength = Math.PI / 2;
                          }
                          thetaLength = Math.min(
                            thetaLength,
                            FULL_WRAP_MAX_THETA,
                          );

                          return {
                            radius: CYLINDER_RADIUS,
                            height: PRINT_AREA_HEIGHT,
                            segments: 200,
                            thetaStart: CYLINDER_HANDLE_GAP,
                            thetaLength: thetaLength,
                          };
                        })(),
                      }
                    : {
                        areaId: "main",
                        imageUrl: previewTextureUrl,
                        mapping: "plane" as const,
                      },
                ]}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      
      {viewMode === "edit" && <canvas ref={canvasRef} className="hidden" />}

      
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
