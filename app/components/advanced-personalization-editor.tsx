"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Loader2, Upload, Trash2, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { usePersonalization } from "../hooks/use-personalization";
import type { LayoutBase, ImageData, SlotDef } from "../types/personalization";

interface AdvancedPersonalizationEditorProps {
  layoutBase: LayoutBase;
  onComplete?: (images: ImageData[], previewUrl: string) => void;
  onCancel?: () => void;
  showCanvasPreview?: boolean; // Preview instantâneo com Canvas 2D
}

export default function AdvancedPersonalizationEditor({
  layoutBase,
  onComplete,
  onCancel,
  showCanvasPreview = true,
}: AdvancedPersonalizationEditorProps) {
  const {
    loading,
    error,
    generateSessionId,
    uploadTempImage,
    deleteTempImage,
  } = usePersonalization();

  const [sessionId] = useState(() => generateSessionId());
  const [uploadedImages, setUploadedImages] = useState<Map<string, ImageData>>(
    new Map()
  );
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [canvasPreview, setCanvasPreview] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const slotImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Carregar imagem base (Google Drive requer proxy/fetch)
  useEffect(() => {
    const loadBaseImage = async () => {
      try {
        // Se a URL já for base64, usar diretamente
        if (layoutBase.image_url.startsWith("data:")) {
          const img = new Image();
          img.src = layoutBase.image_url;
          img.onload = () => {
            baseImageRef.current = img;
            updateCanvasPreview();
          };
          return;
        }

        // Para URLs do Google Drive, fazer fetch e converter para base64
        console.log("📥 Carregando imagem do Google Drive...");

        // Usar Next.js Image Proxy para contornar CORS
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
          layoutBase.image_url
        )}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error("Falha ao carregar imagem via proxy");
        }

        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const img = new Image();
        img.src = base64;
        img.onload = () => {
          baseImageRef.current = img;
          updateCanvasPreview();
          console.log("✅ Imagem base carregada com sucesso");
        };
      } catch (err) {
        console.error("❌ Erro ao carregar imagem base:", err);
        toast.error(
          "Erro ao carregar imagem do layout. Verifique as permissões do Google Drive."
        );
      }
    };

    loadBaseImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutBase.image_url]);

  // Atualizar canvas preview quando imagens mudarem
  useEffect(() => {
    if (showCanvasPreview) {
      updateCanvasPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImages, showCanvasPreview]);

  /**
   * Renderizar preview instantâneo no Canvas 2D
   */
  const updateCanvasPreview = useCallback(() => {
    if (!showCanvasPreview || !canvasRef.current || !baseImageRef.current)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar canvas com as dimensões do layout base
    canvas.width = layoutBase.width;
    canvas.height = layoutBase.height;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar imagem base
    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    // Ordenar slots por zIndex
    const sortedSlots = [...layoutBase.slots].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    // Desenhar cada slot com imagem
    sortedSlots.forEach((slot) => {
      const imageData = uploadedImages.get(slot.id);
      if (!imageData) return;

      const img = slotImagesRef.current.get(slot.id);
      if (!img || !img.complete) return;

      ctx.save();

      // Converter percentuais para pixels
      const slotX = (slot.x / 100) * canvas.width;
      const slotY = (slot.y / 100) * canvas.height;
      const slotWidth = (slot.width / 100) * canvas.width;
      const slotHeight = (slot.height / 100) * canvas.height;

      // Aplicar rotação se houver
      if (slot.rotation) {
        ctx.translate(slotX + slotWidth / 2, slotY + slotHeight / 2);
        ctx.rotate((slot.rotation * Math.PI) / 180);
        ctx.translate(-(slotX + slotWidth / 2), -(slotY + slotHeight / 2));
      }

      // Calcular escala para cover
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const slotRatio = slotWidth / slotHeight;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > slotRatio) {
        // Imagem mais larga que o slot
        drawHeight = slotHeight;
        drawWidth = drawHeight * imgRatio;
        offsetX = (slotWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Imagem mais alta que o slot
        drawWidth = slotWidth;
        drawHeight = drawWidth / imgRatio;
        offsetX = 0;
        offsetY = (slotHeight - drawHeight) / 2;
      }

      // Clipar para o slot
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotWidth, slotHeight);
      ctx.clip();

      // Desenhar imagem
      ctx.drawImage(
        img,
        slotX + offsetX,
        slotY + offsetY,
        drawWidth,
        drawHeight
      );

      ctx.restore();
    });

    // Converter canvas para data URL
    const dataUrl = canvas.toDataURL("image/png");
    setCanvasPreview(dataUrl);
  }, [layoutBase, uploadedImages, showCanvasPreview]);

  const handleFileUpload = async (slotId: string, file: File) => {
    try {
      // Validar tamanho
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens são permitidas");
        return;
      }

      const result = await uploadTempImage(file, slotId, sessionId);

      // Carregar imagem para o canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = result.tempUrl;
      img.onload = () => {
        slotImagesRef.current.set(slotId, img);
        updateCanvasPreview();
      };

      setUploadedImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(slotId, {
          slotId,
          tempId: result.tempId,
          tempUrl: result.tempUrl,
          width: result.width,
          height: result.height,
          originalName: result.originalName,
        });
        return newMap;
      });

      toast.success("Imagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro no upload:", err);
    }
  };

  const handleRemoveImage = async (slotId: string) => {
    const imageData = uploadedImages.get(slotId);
    if (!imageData) return;

    try {
      await deleteTempImage(imageData.tempId);
      setUploadedImages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(slotId);
        return newMap;
      });
      slotImagesRef.current.delete(slotId);
      updateCanvasPreview();
      toast.success("Imagem removida");
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  const handleGenerateFinalPreview = async () => {
    if (uploadedImages.size === 0) {
      toast.error("Adicione pelo menos uma imagem");
      return;
    }

    try {
      setGeneratingPreview(true);
      // Usar o canvas preview que já está sendo gerado localmente
      if (canvasPreview) {
        setPreviewUrl(canvasPreview);
        toast.success("Preview final gerado!");
      } else {
        // Forçar atualização do canvas
        updateCanvasPreview();
        // Aguardar um pouco para o canvas renderizar
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (canvasPreview) {
          setPreviewUrl(canvasPreview);
          toast.success("Preview final gerado!");
        } else {
          toast.error("Erro ao gerar preview. Tente novamente.");
        }
      }
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
      toast.error("Erro ao gerar preview final");
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleComplete = async () => {
    if (uploadedImages.size === 0) {
      toast.error("Adicione pelo menos uma imagem");
      return;
    }

    // Usar canvas preview (já gerado automaticamente)
    const finalPreview = canvasPreview || previewUrl;

    if (!finalPreview) {
      toast.error("Preview não disponível. Aguarde o carregamento.");
      return;
    }

    const images = Array.from(uploadedImages.values());
    onComplete?.(images, finalPreview);
  };

  const handleDownloadPreview = () => {
    if (!canvasPreview && !previewUrl) {
      toast.error("Nenhum preview disponível");
      return;
    }

    const link = document.createElement("a");
    link.href = canvasPreview || previewUrl;
    link.download = `preview-${layoutBase.name}-${Date.now()}.png`;
    link.click();
    toast.success("Preview baixado!");
  };

  const renderSlot = (slot: SlotDef) => {
    const imageData = uploadedImages.get(slot.id);
    const hasImage = !!imageData;

    return (
      <div key={slot.id} className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Slot: {slot.id}</Label>
          {hasImage && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRemoveImage(slot.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Posição: {slot.x.toFixed(1)}%, {slot.y.toFixed(1)}% | Tamanho:{" "}
          {slot.width.toFixed(1)}% × {slot.height.toFixed(1)}%
        </div>

        {hasImage ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData.tempUrl}
              alt={imageData.originalName}
              className="w-full h-32 object-cover rounded"
            />
            <p className="text-sm text-muted-foreground truncate">
              {imageData.originalName}
            </p>
            <p className="text-xs text-muted-foreground">
              {imageData.width} × {imageData.height}px
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded p-4 text-center">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(slot.id, file);
                }
              }}
              className="hidden"
              id={`upload-${slot.id}`}
            />
            <Label
              htmlFor={`upload-${slot.id}`}
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para enviar imagem
              </span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG, WebP ou GIF (máx. 10MB)
              </span>
            </Label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Personalize seu item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-semibold">{layoutBase.name}</p>
            <p className="text-muted-foreground">
              {layoutBase.width} × {layoutBase.height}px
            </p>
            <p className="text-muted-foreground">
              {layoutBase.slots.length} slot(s) disponível(is)
            </p>
          </div>

          {layoutBase.slots.map((slot) => renderSlot(slot))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview</span>
            {(canvasPreview || previewUrl) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPreview}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canvas Preview (instantâneo) */}
          {showCanvasPreview && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Preview Instantâneo (Canvas 2D)
              </Label>
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border shadow-sm"
                style={{ display: canvasPreview ? "block" : "none" }}
              />
              {!canvasPreview && uploadedImages.size === 0 && (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded">
                  <p className="text-muted-foreground">
                    Adicione imagens para ver o preview
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview Final (servidor) */}
          {previewUrl && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Preview Final (Servidor - Alta Qualidade)
              </Label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview Final"
                className="w-full rounded-lg border shadow-sm"
              />
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={handleGenerateFinalPreview}
              disabled={
                loading || generatingPreview || uploadedImages.size === 0
              }
              variant="outline"
              className="w-full"
            >
              {generatingPreview ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Gerar Preview Final (Alta Qualidade)
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={loading || uploadedImages.size === 0}
                className="flex-1"
              >
                Confirmar Personalização
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="outline">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
