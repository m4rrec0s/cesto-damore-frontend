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
import {
  getDirectImageUrl,
  normalizeGoogleDriveUrl,
} from "../helpers/drive-normalize";

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
  const { loading, error, fileToImageData } = usePersonalization();

  // Items (para associar customizações). Carregado via API /items.
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // MULTIPLE_CHOICE options (local management + upload support)
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<
    Array<{
      id: string;
      label: string;
      imageUrl?: string | null;
      filename?: string | null;
      uploading?: boolean;
    }>
  >([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/items`);
        if (!res.ok) throw new Error("Erro ao buscar items");
        const data = (await res.json()) as Array<{
          id?: string;
          name?: string;
        }>;
        // Map minimal shape
        const mapped = (data || []).map((it) => ({
          id: it.id || "",
          name: it.name || "(sem nome)",
        }));
        setItems(mapped);
      } catch (err) {
        console.warn("Não foi possível carregar items para associação:", err);
      }
    };

    fetchItems();
  }, []);

  // Upload de imagem para opção MULTIPLE_CHOICE
  const uploadOptionImage = async (file: File, optionId: string) => {
    try {
      setMultipleChoiceOptions((prev) =>
        prev.map((o) => (o.id === optionId ? { ...o, uploading: true } : o)),
      );

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("appToken") || localStorage.getItem("token")
          : null;
      const form = new FormData();
      form.append("image", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customization/upload-image`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erro ao enviar imagem");
      }

      const data = await res.json();

      setMultipleChoiceOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? {
                ...o,
                imageUrl: data.imageUrl || data.imageUrl || data.imageUrl,
                filename: data.filename || data.filename,
                uploading: false,
              }
            : o,
        ),
      );

      toast.success("Imagem carregada para opção");
    } catch (err) {
      console.error("Erro upload option image:", err);
      toast.error((err as Error).message || "Erro ao enviar imagem");
      setMultipleChoiceOptions((prev) =>
        prev.map((o) => (o.id === optionId ? { ...o, uploading: false } : o)),
      );
    }
  };

  const deleteOptionImage = async (optionId: string) => {
    try {
      const opt = multipleChoiceOptions.find((o) => o.id === optionId);
      if (!opt?.filename) {
        setMultipleChoiceOptions((prev) =>
          prev.map((o) =>
            o.id === optionId ? { ...o, imageUrl: null, filename: null } : o,
          ),
        );
        return;
      }

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("appToken") || localStorage.getItem("token")
          : null;
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/customization/image/${encodeURIComponent(opt.filename)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!res.ok) throw new Error("Erro ao deletar imagem");

      setMultipleChoiceOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? { ...o, imageUrl: undefined, filename: undefined }
            : o,
        ),
      );
      toast.success("Imagem removida");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover imagem");
    }
  };

  const [uploadedImages, setUploadedImages] = useState<
    Map<string, ImageData & { previewUrl?: string }>
  >(new Map());
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const slotImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const loadBaseImage = async () => {
      try {
        const imageUrl = layoutBase.previewImageUrl;

        if (!imageUrl) {
          console.warn("Layout sem imagem base!");
          return;
        }

        if (imageUrl.startsWith("data:")) {
          const img = new Image();
          img.onload = () => {
            baseImageRef.current = img;
            setBaseImageLoaded(true);
            setTimeout(() => updateCanvasPreview(), 0);
          };
          img.onerror = () => {
            toast.error("Erro ao carregar imagem base64");
          };
          img.src = imageUrl;
          return;
        }

        const normalizedUrl = normalizeGoogleDriveUrl(imageUrl);

        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
          normalizedUrl,
        )}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(
            `Falha ao carregar imagem via proxy: ${response.status}`,
          );
        }

        const blob = await response.blob();

        if (!blob.type.startsWith("image/")) {
          toast.error(
            "Erro: Imagem do Google Drive não acessível. Por favor, faça upload da imagem novamente.",
            { duration: 5000 },
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
            "Erro ao processar imagem. Formato inválido ou corrompido.",
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
  }, [layoutBase.previewImageUrl]);

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
          slotY + slotHeight / 2,
        );
      } else if (!img || !img.complete) {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
      } else {
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

      const imageData = await fileToImageData(file, slotId);

      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = previewUrl;
      img.onload = () => {
        slotImagesRef.current.set(slotId, img);
        updateCanvasPreview();
      };

      setUploadedImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(slotId, { ...imageData, previewUrl });
        return newMap;
      });

      toast.success("Imagem carregada para preview");
    } catch (err) {
      console.error("Erro no upload:", err);
    }
  };

  const handleRemoveImage = async (slotId: string) => {
    const imageData = uploadedImages.get(slotId);
    if (!imageData) return;

    try {
      if (imageData.previewUrl) URL.revokeObjectURL(imageData.previewUrl);
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

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [previewTextureUrl, setPreviewTextureUrl] = useState<string | null>(
    null,
  );

  const handleSwitchTo3D = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas não disponível para gerar preview 3D.");
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
              src={imageData.previewUrl || ""}
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
                              FULL_WRAP_MAX_THETA,
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
                  URL:{" "}
                  {getDirectImageUrl(layoutBase.previewImageUrl).substring(
                    0,
                    50,
                  )}
                  ...
                </p>
              </div>
            )}

            {/* Associe esta customização a um item (opcional) */}
            <div className="mt-4">
              <Label>Associar a Item (opcional)</Label>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum item disponível
                </p>
              ) : (
                <select
                  aria-label="Associar item"
                  value={selectedItemId || ""}
                  onChange={(e) => setSelectedItemId(e.target.value || null)}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Não associar --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* MULTIPLE_CHOICE: gerenciar opções com imagens */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Opções (Multiple Choice)</Label>
                <Button
                  size="sm"
                  onClick={() =>
                    setMultipleChoiceOptions((prev) => [
                      ...prev,
                      {
                        id: `opt-${Date.now()}-${Math.floor(
                          Math.random() * 1000,
                        )}`,
                        label: `Opção ${prev.length + 1}`,
                      },
                    ])
                  }
                >
                  + Adicionar opção
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {multipleChoiceOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma opção adicionada
                  </p>
                )}

                {multipleChoiceOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <Input
                      value={opt.label}
                      onChange={(e) =>
                        setMultipleChoiceOptions((prev) =>
                          prev.map((o) =>
                            o.id === opt.id
                              ? { ...o, label: e.target.value }
                              : o,
                          ),
                        )
                      }
                      className="flex-1"
                    />

                    <input
                      aria-label={`Enviar imagem para ${opt.label}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadOptionImage(file, opt.id);
                      }}
                    />

                    {opt.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={opt.imageUrl}
                        alt={opt.label}
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setMultipleChoiceOptions((prev) =>
                          prev.filter((o) => o.id !== opt.id),
                        )
                      }
                    >
                      Remover
                    </Button>
                    {opt.filename && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteOptionImage(opt.id)}
                      >
                        Remover imagem
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
