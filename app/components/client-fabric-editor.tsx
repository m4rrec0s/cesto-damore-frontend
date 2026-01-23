"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Upload,
  Check,
  ArrowLeft,
  Type,
  ImageIcon,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import type { LayoutBase, ImageData } from "../types/personalization";
import { normalizeGoogleDriveUrl } from "../helpers/drive-normalize";
import { ImageCropDialog } from "./ui/image-crop-dialog";

interface ClientFabricEditorProps {
  layoutBase: LayoutBase;
  onComplete: (
    images: ImageData[],
    previewUrl: string,
    fabricState?: string,
    highQualityUrl?: string,
  ) => void;
  onBack: () => void;
  initialState?: string;
}

export default function ClientFabricEditor({
  layoutBase,
  onComplete,
  onBack,
  initialState,
}: ClientFabricEditorProps) {
  const [fabricRef, setFabricRef] = useState<FabricCanvas | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [editableTexts, setEditableTexts] = useState<Record<string, string>>(
    {},
  );
  const [colorableObjects, setColorableObjects] = useState<
    Array<{ id: string; color: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Crop states
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);

  // Initialize Fabric Canvas
  useEffect(() => {
    let canvas: FabricCanvas | null = null;

    const initFabric = async () => {
      try {
        const { Canvas, FabricImage } = await import("fabric");

        if (!canvasRef.current) return;

        canvas = new Canvas(canvasRef.current, {
          width: layoutBase.width,
          height: layoutBase.height,
          backgroundColor: "#ffffff",
          selection: false,
        });

        // Load existing state if available
        if (initialState) {
          await canvas.loadFromJSON(JSON.parse(initialState));
        } else if (layoutBase.fabric_json_state) {
          const state =
            typeof layoutBase.fabric_json_state === "string"
              ? JSON.parse(layoutBase.fabric_json_state)
              : layoutBase.fabric_json_state;
          await canvas.loadFromJSON(state);
        } else {
          // Fallback: load only base image as background
          const normalizedUrl = normalizeGoogleDriveUrl(layoutBase.image_url);
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(normalizedUrl)}`;

          const img = await FabricImage.fromURL(proxyUrl, {
            crossOrigin: "anonymous",
          });
          img.set({
            selectable: false,
            evented: false,
            scaleX: layoutBase.width / img.width!,
            scaleY: layoutBase.height / img.height!,
          });
          canvas.add(img);
          canvas.sendObjectToBack(img);
        }

        // Configure objects for client use
        const objects = canvas.getObjects();
        const colorable: Array<{ id: string; color: string }> = [];
        const texts: Record<string, string> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        objects.forEach((obj: any) => {
          // Identify frames and interactive elements
          const isFrame =
            obj.isFrame ||
            (obj.name &&
              typeof obj.name === "string" &&
              obj.name.includes("frame"));

          if (isFrame) {
            obj.set({
              selectable: false,
              evented: true,
              hoverCursor: "pointer",
            });
            obj.on("mousedown", () => {
              setCurrentFrameId(obj.id || obj.name);
              // Trigger upload hidden input or show choice
              const input = document.getElementById(
                `upload-${obj.id || obj.name}`,
              );
              if (input) input.click();
            });
          } else if (obj.isCustomizable) {
            obj.set({
              selectable: true,
              hasControls: true,
              lockMovementX: false,
              lockMovementY: false,
            });

            if (obj.type === "i-text" || obj.type === "text") {
              texts[obj.id || obj.name] = obj.text || "";
            }

            // Check if it's a colorable shape or text
            if (obj.fill) {
              colorable.push({
                id: obj.id || obj.name,
                color: typeof obj.fill === "string" ? obj.fill : "#000000",
              });
            }
          } else {
            // Lock everything else
            obj.set({
              selectable: false,
              evented: false,
            });
          }
        });

        setEditableTexts(texts);
        setColorableObjects(colorable);
        canvas.renderAll();
        setFabricRef(canvas);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao inicializar Fabric.js:", err);
        toast.error("Erro ao carregar editor");
      }
    };

    initFabric();

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [layoutBase, initialState]);

  const handleTextChange = (id: string, value: string) => {
    if (!fabricRef) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = fabricRef
      .getObjects()
      .find((o: any) => o.id === id || o.name === id);
    if (obj && (obj.type === "i-text" || obj.type === "text")) {
      obj.set("text", value);
      setEditableTexts((prev) => ({ ...prev, [id]: value }));
      fabricRef.renderAll();
    }
  };

  const handleColorChange = (id: string, color: string) => {
    if (!fabricRef) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = fabricRef
      .getObjects()
      .find((o: any) => o.id === id || o.name === id);
    if (obj) {
      obj.set("fill", color);
      setColorableObjects((prev) =>
        prev.map((o) => (o.id === id ? { ...o, color } : o)),
      );
      fabricRef.renderAll();
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    frameId: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToCrop(file);
      setCurrentFrameId(frameId);
      setCropDialogOpen(true);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!fabricRef || !currentFrameId) return;

    try {
      const { FabricImage, Rect, Circle } = await import("fabric");
      const img = await FabricImage.fromURL(croppedImageUrl, {
        crossOrigin: "anonymous",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const frame = fabricRef
        .getObjects()
        .find((o: any) => o.id === currentFrameId || o.name === currentFrameId);
      if (!frame) return;

      const frameWidth = frame.width * frame.scaleX;
      const frameHeight = frame.height * frame.scaleY;
      const center = frame.getCenterPoint();

      const scale = Math.max(
        frameWidth / img.width!,
        frameHeight / img.height!,
      );

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        selectable: true,
        hasControls: true,
        name: `uploaded-img-${currentFrameId}`,
      });

      // Create clip path based on frame
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let clipPath: any;
      if (frame.type === "circle") {
        clipPath = new Circle({
          radius: (frame as any).radius,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          absolutePositioned: true,
        });
      } else {
        clipPath = new Rect({
          width: (frame as any).width,
          height: (frame as any).height,
          rx: (frame as any).rx,
          ry: (frame as any).ry,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          absolutePositioned: true,
        });
      }

      img.set("clipPath", clipPath);

      // Remove previous image for this frame
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldImg = fabricRef
        .getObjects()
        .find((o: any) => o.name === `uploaded-img-${currentFrameId}`);
      if (oldImg) fabricRef.remove(oldImg);

      fabricRef.add(img);
      fabricRef.moveObjectTo(img, fabricRef.getObjects().indexOf(frame) + 1);

      // Optionally hide or fade the frame
      frame.set("opacity", 0.1);

      fabricRef.renderAll();
      toast.success("Imagem adicionada!");
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      toast.error("Erro ao adicionar imagem");
    }
  };

  const handleComplete = async () => {
    if (!fabricRef) return;

    try {
      // 1. Export Preview (low quality for cart)
      const previewUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 0.5,
      });

      // 2. Export High Quality (for backend/production)
      const highQualityUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 2, // 2x or 3x depending on layout size
      });

      // 3. Save State
      const state = JSON.stringify(
        (fabricRef as any).toJSON([
          "id",
          "name",
          "isFrame",
          "isCustomizable",
          "customData",
        ]),
      );

      // 4. Persist to Local Storage
      if (typeof window !== "undefined") {
        localStorage.setItem(`fabric-state-${layoutBase.id}`, state);
      }

      // Convert images to the expected format
      const images: ImageData[] = [];
      // We could extract individual images here if needed, but the final image is often enough

      onComplete(images, previewUrl, state, highQualityUrl);
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      toast.error("Erro ao salvar personalização");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="text-right">
          <h3 className="font-semibold text-lg">{layoutBase.name}</h3>
          <p className="text-sm text-gray-600">Arraste e edite os elementos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-neutral-100 rounded-xl p-4 flex items-center justify-center min-h-[500px] relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
          )}
          <div ref={containerRef} className="shadow-2xl bg-white">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <h4 className="font-bold flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-600" />
              Customização
            </h4>

            {Object.keys(editableTexts).length > 0 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  <Type className="h-3 w-3" /> Textos
                </Label>
                {Object.entries(editableTexts).map(([id, text]) => (
                  <div key={id} className="space-y-2">
                    <Label className="text-xs">{id}</Label>
                    <Input
                      value={text}
                      onChange={(e) => handleTextChange(id, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                <ImageIcon className="h-3 w-3" /> Imagens
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {fabricRef
                  ?.getObjects()
                  .filter(
                    (o: any) =>
                      o.isFrame ||
                      (o.name &&
                        typeof o.name === "string" &&
                        o.name.includes("frame")),
                  )
                  .map((frame: any) => (
                    <div
                      key={frame.id || frame.name}
                      className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-purple-400 cursor-pointer"
                      onClick={() =>
                        document
                          .getElementById(`upload-${frame.id || frame.name}`)
                          ?.click()
                      }
                    >
                      <Upload className="h-6 w-6 text-gray-400" />
                      <input
                        title="Fazer upload da Imagem"
                        id={`upload-${frame.id || frame.name}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e, frame.id || frame.name)
                        }
                      />
                    </div>
                  ))}
              </div>
            </div>

            {colorableObjects.length > 0 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  <Palette className="h-3 w-3" /> Cores
                </Label>
                <div className="grid grid-cols-1 gap-4">
                  {colorableObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Label className="text-xs truncate max-w-[100px]">
                        {obj.id}
                      </Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                          style={{ backgroundColor: obj.color }}
                        />
                        <input
                          title="Escolha a cor"
                          type="color"
                          value={obj.color}
                          onChange={(e) =>
                            handleColorChange(obj.id, e.target.value)
                          }
                          className="w-8 h-8 rounded p-0 border-0 cursor-pointer overflow-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
              onClick={handleComplete}
            >
              <Check className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </CardContent>
        </Card>
      </div>

      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setFileToCrop(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={1}
          title="Ajustar Imagem"
          description="Recorte sua foto para caber na moldura"
        />
      )}
    </div>
  );
}
