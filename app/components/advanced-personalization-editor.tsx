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
import { Trash2, Upload, DownloadIcon } from "lucide-react";
import { Model3DViewer } from "../produto/[id]/components/Model3DViewer";
import { toast } from "sonner";
import { usePersonalization } from "../hooks/use-personalization";
import type { LayoutBase, ImageData, SlotDef } from "../types/personalization";

const normalizeGoogleDriveUrl = (url: string): string => {
  if (!url) return url;

  if (
    !url.includes("drive.google.com") &&
    !url.includes("drive.usercontent.google.com")
  ) {
    return url;
  }

  // Extrair FILE_ID de diferentes formatos
  let fileId = null;

  // Formato: /file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];

  // Formato: ?id=FILE_ID ou &id=FILE_ID
  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  // Se encontrou FILE_ID, retornar URL de download direto
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
};

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
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);

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
          img.onload = () => {
            baseImageRef.current = img;
            setBaseImageLoaded(true);
            setTimeout(() => updateCanvasPreview(), 0);
          };
          img.onerror = () => {
            toast.error("Erro ao carregar imagem base64");
          };
          img.src = layoutBase.image_url;
          return;
        }

        // Para URLs do Google Drive, fazer fetch e converter para base64
        // Normalizar URL do Google Drive para formato de download direto
        const normalizedUrl = normalizeGoogleDriveUrl(layoutBase.image_url);

        // Usar Next.js Image Proxy para contornar CORS
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
          normalizedUrl
        )}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(
            `Falha ao carregar imagem via proxy: ${response.status}`
          );
        }

        const blob = await response.blob();

        // Verificar se o blob é uma imagem válida
        if (!blob.type.startsWith("image/")) {
          toast.error(
            "Erro: Imagem do Google Drive não acessível. Por favor, faça upload da imagem novamente.",
            { duration: 5000 }
          );
          setBaseImageLoaded(false);
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
        img.onerror = () => {
          toast.error(
            "Erro ao processar imagem. Formato inválido ou corrompido."
          );
        };
        img.src = base64;
      } catch (err) {
        console.error("Erro ao carregar imagem base:", err);
        toast.error("Erro ao carregar imagem do layout.");
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

  const updateCanvasPreview = useCallback(() => {
    if (!showCanvasPreview || !canvasRef.current || !baseImageRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = layoutBase.width;
    canvas.height = layoutBase.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    const sortedSlots = [...layoutBase.slots].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
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

      // Clip para o slot (respeita rotação)
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotWidth, slotHeight);
      ctx.clip();

      // Sem imagem: desenhar placeholder (bg-gray-800) com texto centralizado
      if (!imageData) {
        ctx.fillStyle = "#1f2937"; // tailwind bg-gray-800
        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);

        ctx.fillStyle = "#ffffff";
        const fontSize = Math.max(12, Math.floor(slotHeight * 0.12));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "SUA FOTO AQUI",
          slotX + slotWidth / 2,
          slotY + slotHeight / 2
        );
      } else if (!img || !img.complete) {
        // Caso a imagem exista mas não esteja pronta, desenhar placeholder simples
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
      } else {
        // Desenhar imagem do slot
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
          drawHeight
        );
      }

      ctx.restore();
    });
  }, [layoutBase, uploadedImages, showCanvasPreview]);

  const handleFileUpload = async (slotId: string, file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens são permitidas");
        return;
      }

      const result = await uploadTempImage(file, slotId, sessionId);

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

  // 3D preview state
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [previewTextureUrl, setPreviewTextureUrl] = useState<string | null>(
    null
  );

  // Gerar textura a partir do canvas **antes** de entrar no modo 3D
  const handleSwitchTo3D = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas não disponível para gerar preview 3D.");
      return;
    }

    // Forçar redraw e esperar um pequeno intervalo para garantir que o canvas esteja pronto
    try {
      updateCanvasPreview();
    } catch {
      /* ignore */
    }

    await new Promise((r) => setTimeout(r, 80));

    const preview = getPreviewUrl();
    if (!preview) {
      toast.error("Preview 2D não disponível. Aguarde o carregamento.");
      return;
    }

    setPreviewTextureUrl(preview);
    setViewMode("3d");
  };

  const handleComplete = async () => {
    if (uploadedImages.size === 0) {
      toast.error("Adicione pelo menos uma imagem");
      return;
    }

    const previewUrl = getPreviewUrl();

    if (!previewUrl) {
      toast.error("Preview não disponível. Aguarde o carregamento.");
      return;
    }

    const images = Array.from(uploadedImages.values());
    onComplete?.(images, previewUrl);
  };

  const handleDownloadPreview = () => {
    const previewUrl = getPreviewUrl();

    if (!previewUrl) {
      toast.error("Nenhum preview disponível");
      return;
    }

    const link = document.createElement("a");
    link.href = previewUrl;
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
              className="object-cover rounded w-[150px] h-[150px]"
            />
            <p className="text-sm text-muted-foreground truncate">
              {imageData.originalName}
            </p>
            <p className="text-xs text-muted-foreground">
              {imageData.width} × {imageData.height}px
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded overflow-hidden max-w-[150px] max-h-[150px] aspect-square flex items-center justify-center">
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

            {/* Placeholder visual para slots vazios */}
            <Label
              htmlFor={`upload-${slot.id}`}
              className="cursor-pointer flex flex-col items-center justify-center p-6 text-center text-muted-foreground text-xs"
            >
              <Upload className="h-6 w-6 mb-2" />
              Clique para enviar
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {layoutBase.slots.map((slot) => renderSlot(slot))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview</span>
            <div className="flex gap-2 items-center">
              <div className="inline-flex rounded-md border bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  className={
                    viewMode === "2d"
                      ? "px-3 py-1 text-sm bg-rose-500 text-white rounded"
                      : "px-3 py-1 text-sm text-slate-700 rounded"
                  }
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={handleSwitchTo3D}
                  className={
                    viewMode === "3d"
                      ? "px-3 py-1 text-sm bg-rose-500 text-white rounded"
                      : "px-3 py-1 text-sm text-slate-700 rounded"
                  }
                >
                  3D
                </button>
              </div>
            </div>
            <Button onClick={handleDownloadPreview} variant="outline" size="sm">
              <DownloadIcon /> Baixar Preview
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div>
            {viewMode === "2d" ? (
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg shadow-sm"
                style={{ display: baseImageLoaded ? "block" : "none" }}
              />
            ) : (
              // 3D Preview
              <div className="w-full h-full min-h-[400px]">
                {previewTextureUrl ? (
                  <Model3DViewer
                    modelUrl={
                      layoutBase.item_type?.toLowerCase() === "caneca"
                        ? "/3DModels/caneca.glb"
                        : "/3DModels/quadro.glb"
                    }
                    materialColor="#ffffff"
                    textures={
                      layoutBase.item_type?.toLowerCase() === "caneca"
                        ? (() => {
                            // Configurações do cilindro (baseadas em teste-customizacao)
                            const CYLINDER_RADIUS = 0.46;
                            const CYLINDER_SEGMENTS = 200;
                            const CYLINDER_HANDLE_GAP = Math.PI / 8; // espaço reservado para as asas
                            const PRINT_AREA_HEIGHT = 0.95; // altura da área de impressão em metros
                            const FULL_WRAP_MAX_THETA =
                              Math.PI * 2 - CYLINDER_HANDLE_GAP * 2;

                            // Estimar largura em metros usando a proporção do layout (px)
                            const widthMeters =
                              (layoutBase.width / layoutBase.height) *
                              PRINT_AREA_HEIGHT;

                            // Converter largura linear (m) para ângulo (radianos)
                            let thetaLength = widthMeters / CYLINDER_RADIUS;
                            if (!isFinite(thetaLength) || thetaLength <= 0) {
                              thetaLength = Math.PI / 2;
                            }
                            // Limitar para não invadir as asas
                            thetaLength = Math.min(
                              thetaLength,
                              FULL_WRAP_MAX_THETA
                            );

                            // Usar configurações padrão do viewer para theta start/length

                            return [
                              {
                                areaId: "preview",
                                imageUrl: previewTextureUrl,
                                position: { x: 0, y: 0.35, z: 0 },
                                dimensions: {
                                  width: widthMeters,
                                  height: PRINT_AREA_HEIGHT,
                                },
                                mapping: "cylinder",
                                cylinder: {
                                  radius: CYLINDER_RADIUS,
                                  height: PRINT_AREA_HEIGHT,
                                  segments: CYLINDER_SEGMENTS,
                                  // Não passar thetaStart/thetaLength -> usar defaults do Model3DViewer
                                },
                              },
                            ];
                          })()
                        : [
                            {
                              areaId: "preview",
                              imageUrl: previewTextureUrl,
                              position: { x: 0, y: 0, z: 0.05 },
                              dimensions: { width: 1, height: 0.7 },
                              mapping: "plane",
                            },
                          ]
                    }
                    className="h-[400px] w-full"
                    autoRotate={false}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Gerando textura 3D...
                    </p>
                    {previewTextureUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewTextureUrl}
                        alt="Preview textura 3D"
                        className="max-h-28 max-w-full rounded border"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {process.env.NODE_ENV === "development" && (
              <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                <p>
                  <strong>Debug:</strong> Base: {baseImageLoaded ? "✅" : "⏳"}{" "}
                  | Imagens: {uploadedImages.size} | Canvas:{" "}
                  {canvasRef.current?.width || 0}x
                  {canvasRef.current?.height || 0}
                </p>
                <p className="text-blue-600">
                  URL: {layoutBase.image_url.substring(0, 50)}...
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t">
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
