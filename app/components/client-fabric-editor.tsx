"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Upload,
  Check,
  ArrowLeft,
  Sparkles,
  Type,
  ImageIcon,
  Palette,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { LayoutBase, ImageData } from "../types/personalization";
import { ImageCropDialog } from "./ui/image-crop-dialog";
import Image from "next/image";
import { dataURLtoBlob } from "@/app/lib/utils";

const INTERNAL_DPI_MULTIPLIER = 2;

const loadGoogleFont = (fontFamily: string) => {
  if (
    typeof document === "undefined" ||
    document.getElementById(`font-${fontFamily.replace(/\s+/g, "-")}`)
  )
    return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = `font-${fontFamily.replace(/\s+/g, "-")}`;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
      /\s+/g,
      "+",
    )}:wght@400;700&display=swap`;

    const timeout = setTimeout(() => {
      console.warn(`Font load timeout: ${fontFamily}`);
      resolve(null);
    }, 3000);

    link.onload = () => {
      document.fonts
        .load(`1em "${fontFamily}"`)
        .then(() => {
          clearTimeout(timeout);
          resolve(null);
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(null);
        });
    };
    link.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    document.head.appendChild(link);
  });
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const initRunRef = useRef(0);

  const [editableTexts, setEditableTexts] = useState<Record<string, string>>(
    {},
  );
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [localImages, setLocalImages] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      if (!layoutBase.id) return {};
      const saved = localStorage.getItem(`client-design-imgs-${layoutBase.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);
  const [workspaceZoom, setWorkspaceZoom] = useState(0.4);

  useEffect(() => {
    if (layoutBase.id && Object.keys(localImages).length > 0) {
      localStorage.setItem(
        `client-design-imgs-${layoutBase.id}`,
        JSON.stringify(localImages),
      );
    }
  }, [localImages, layoutBase.id]);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    const parentContainer = containerRef.current?.parentElement;
    if (!parentContainer) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {

        const { width: availWidth, height: availHeight } = entry.contentRect;

        const margin = 32;
        const maxWidth = Math.max(availWidth - margin, 150);
        const maxHeight = Math.max(availHeight - margin, 150);

        const layoutWidth = Number(layoutBase.width) || 378;
        const layoutHeight = Number(layoutBase.height) || 567;

        const zoomW = maxWidth / layoutWidth;
        const zoomH = maxHeight / layoutHeight;

        const scaleFactor = Math.min(zoomW, zoomH);

        const finalZoom = Math.min(scaleFactor, 1.1);

        setWorkspaceZoom(Math.max(0.1, finalZoom));
      }
    });

    observer.observe(parentContainer);

    return () => observer.disconnect();
  }, [layoutBase.width, layoutBase.height]);

  useEffect(() => {
    if (fabricRef) {
      const width = layoutBase.width || 378;
      const height = layoutBase.height || 567;

      fabricRef.setDimensions(
        {
          width: width * INTERNAL_DPI_MULTIPLIER,
          height: height * INTERNAL_DPI_MULTIPLIER,
        },
        { backstoreOnly: true },
      );

      fabricRef.setDimensions(
        {
          width: `${width * workspaceZoom}px`,
          height: `${height * workspaceZoom}px`,
        },
        { cssOnly: true },
      );

      fabricRef.setViewportTransform([
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
      ]);

      fabricRef.calcOffset();
      fabricRef.renderAll();
    }
  }, [workspaceZoom, fabricRef, layoutBase.width, layoutBase.height]);

  const addFramePlaceholder = async (canvas: any, frame: any) => {
    const { FabricImage, Rect, Circle } = await import("fabric");

    frame.set("fill", "#f3f4f6");

    const center = frame.getCenterPoint();
    const frameWidth = frame.width * frame.scaleX;
    const frameHeight = frame.height * frame.scaleY;

    try {
      const placeholderImg = await FabricImage.fromURL(
        "/placeholder_design.png",
        { crossOrigin: "anonymous" },
      );

      const scale = Math.max(
        frameWidth / placeholderImg.width!,
        frameHeight / placeholderImg.height!,
      );

      placeholderImg.set({
        scaleX: scale,
        scaleY: scale,
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        opacity: 0.5,
        name: `placeholder-img-${frame.id || frame.name}`,
        angle: frame.angle || 0,
      });

      let mask: any;
      if (frame.type === "circle") {
        mask = new Circle({
          radius: (frame as any).radius || frame.width / 2,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          angle: frame.angle || 0,
          absolutePositioned: true,
        });
      } else {
        mask = new Rect({
          width: frame.width,
          height: frame.height,
          rx: frame.rx,
          ry: frame.ry,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          angle: frame.angle || 0,
          absolutePositioned: true,
        });
      }

      placeholderImg.set("clipPath", mask);

      canvas.add(placeholderImg);
      canvas.renderAll();
    } catch (err) {
      console.error("Erro ao carregar placeholder:", err);
    }
  };

  const loadLocalImageToFrame = async (
    canvas: any,
    frame: any,
    url: string,
  ) => {
    const { FabricImage, Rect, Circle } = await import("fabric");

    const frameId = frame.id || frame.name;
    const placeholders = canvas
      .getObjects()
      .filter(
        (o: any) =>
          o.name === `placeholder-icon-${frameId}` ||
          o.name === `placeholder-text-${frameId}` ||
          o.name === `placeholder-img-${frameId}`,
      );
    placeholders.forEach((p: any) => canvas.remove(p));

    try {
      let finalUrl = url;
      if (finalUrl.startsWith("/")) {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/api$/,
          "",
        );
        finalUrl = `${apiBase}${finalUrl}`;
      }

      const img = await FabricImage.fromURL(finalUrl, {
        crossOrigin: "anonymous",
      });

      const frameWidth = frame.width * frame.scaleX;
      const frameHeight = frame.height * frame.scaleY;
      const center = frame.getCenterPoint();

      frame.set({ fill: "transparent", stroke: "transparent", opacity: 0 });

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
        angle: frame.angle || 0,
        selectable: true,
        hasControls: true,
        name: `uploaded-img-${frameId}`,
        objectCaching: false,
      });

      let mask: any;
      if (frame.type === "circle") {
        mask = new Circle({
          radius: (frame as any).radius || frame.width / 2,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          angle: frame.angle || 0,
          absolutePositioned: true,
        });
      } else {
        mask = new Rect({
          width: frame.width,
          height: frame.height,
          rx: frame.rx,
          ry: frame.ry,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          originX: "center",
          originY: "center",
          left: center.x,
          top: center.y,
          angle: frame.angle || 0,
          absolutePositioned: true,
        });
      }

      img.set("clipPath", mask);

      const oldImg = canvas
        .getObjects()
        .find((o: any) => o.name === `uploaded-img-${frameId}`);
      if (oldImg) canvas.remove(oldImg);

      canvas.add(img);
      canvas.moveObjectTo(img, canvas.getObjects().indexOf(frame) + 1);
      canvas.renderAll();
    } catch (err) {
      console.error("Erro ao carregar imagem no frame:", err);
      toast.error("Erro ao carregar imagem");
    }
  };

  useEffect(() => {
    let canvasInstance: FabricCanvas | null = null;
    let isMounted = true;
    const runId = ++initRunRef.current;

    const isCanvasAlive = (canvas: FabricCanvas | null) => {
      if (!canvas) return false;
      const anyCanvas = canvas as any;
      return Boolean(anyCanvas?.contextContainer && anyCanvas?.lowerCanvasEl);
    };

    const initFabric = async () => {
      try {
        const { Canvas, FabricObject } = await import("fabric");

        if (!containerRef.current || !isMounted || runId !== initRunRef.current)
          return;

        FabricObject.ownDefaults.objectCaching = false;
        FabricObject.ownDefaults.minScaleLimit = 0.05;
        FabricObject.ownDefaults.selectable = false;
        FabricObject.ownDefaults.evented = false;

        containerRef.current.innerHTML = "";
        const canvasEl = document.createElement("canvas");
        containerRef.current.appendChild(canvasEl);

        const width = layoutBase.width || 378;
        const height = layoutBase.height || 567;

        canvasInstance = new Canvas(canvasEl, {
          backgroundColor: "#ffffff",
          selection: false,
          interactive: false,
          preserveObjectStacking: true,
        });

        canvasInstance.setDimensions(
          {
            width: width * INTERNAL_DPI_MULTIPLIER,
            height: height * INTERNAL_DPI_MULTIPLIER,
          },
          { backstoreOnly: true },
        );

        canvasInstance.setDimensions(
          {
            width: `${width * workspaceZoom}px`,
            height: `${height * workspaceZoom}px`,
          },
          { cssOnly: true },
        );

        if (!canvasInstance.contextTop && !canvasInstance.contextContainer) {

          canvasInstance.setDimensions({
            width: width * INTERNAL_DPI_MULTIPLIER,
            height: height * INTERNAL_DPI_MULTIPLIER,
          });
        }

        const stateToLoad =
          initialState ||
          layoutBase.fabricJsonState ||
          layoutBase.fabric_json_state;

        if (stateToLoad) {
          try {
            const state =
              typeof stateToLoad === "string"
                ? JSON.parse(stateToLoad)
                : stateToLoad;

            if (state.objects) {
              const fontsToLoad = new Set<string>();
              state.objects.forEach((obj: any) => {
                if (obj.fontFamily && obj.fontFamily !== "Arial") {
                  fontsToLoad.add(obj.fontFamily);
                }
              });
              if (fontsToLoad.size > 0) {
                await Promise.all(
                  Array.from(fontsToLoad).map((f) => loadGoogleFont(f)),
                );

                await new Promise((r) => setTimeout(r, 250));
              }

              if (
                !isMounted ||
                runId !== initRunRef.current ||
                !isCanvasAlive(canvasInstance)
              ) {
                return;
              }

              const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(
                /\/api$/,
                "",
              );

              state.objects = state.objects.map((obj: any) => {
                if (obj.type === "i-text" || obj.type === "IText") {
                  obj.type = "textbox";
                }

                if (obj.type === "Image" || obj.type === "image") {
                  let src = obj.src || "";
                  if (src.startsWith("/")) {
                    src = `${apiBase}${src}`;
                  } else if (
                    src.includes("localhost") &&
                    !apiBase.includes("localhost")
                  ) {
                    src = src.replace(/https?:\/\/localhost:\d+/, apiBase);
                  }
                  obj.src = src;
                }

                return {
                  ...obj,
                  objectCaching: false,
                  selectable: false,
                  evented: false,
                };
              });
            }

            if (isCanvasAlive(canvasInstance)) {
              await canvasInstance.loadFromJSON(state);
            }
          } catch (jsonErr) {
            console.error(
              "Erro ao carregar estado parcial do canvas:",
              jsonErr,
            );
          }
        }

        if (
          !isMounted ||
          runId !== initRunRef.current ||
          !isCanvasAlive(canvasInstance)
        ) {
          return;
        }

        canvasInstance.setViewportTransform([
          INTERNAL_DPI_MULTIPLIER,
          0,
          0,
          INTERNAL_DPI_MULTIPLIER,
          0,
          0,
        ]);

        if (!isMounted) {
          if (isCanvasAlive(canvasInstance)) {
            canvasInstance.dispose();
          }
          return;
        }

        const objects = canvasInstance.getObjects();
        const texts: Record<string, string> = {};
        const labels: Record<string, string> = {};

        for (const obj of objects as any[]) {

          obj.set({
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hoverCursor: "default",
          });

          const isFrame =
            obj.isFrame === true ||
            obj.name === "photo-frame" ||
            obj.name === "image-frame" ||
            (obj.name && obj.name.includes("frame")) ||
            (obj.customData && obj.customData.isFrame === true);

          if (isFrame) {
            obj.isFrame = true;
            const id = obj.id || obj.name;
            labels[id] = obj.name || "Moldura de Foto";

            const hasImg = objects.some(
              (o: any) => o.name === `uploaded-img-${id}`,
            );

            if (!hasImg && !localImages[id]) {
              await addFramePlaceholder(canvasInstance, obj);
            } else if (localImages[id]) {

              await loadLocalImageToFrame(canvasInstance, obj, localImages[id]);
            }
          } else if (obj.isCustomizable) {
            if (obj.type === "textbox" || obj.type === "i-text") {
              const id = obj.id || obj.name;
              texts[id] = obj.text || "";
              labels[id] = obj.name || "Campo de Texto";
            }
          }
        }

        if (isMounted) {
          setEditableTexts(texts);
          setFieldLabels(labels);
          canvasInstance.renderAll();
          setFabricRef(canvasInstance);
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Erro ao inicializar Fabric.js:", err);
        if (isMounted) {
          setLoading(false);
          toast.error("Erro ao carregar editor");
        }
      }
    };

    initFabric();

    return () => {
      isMounted = false;
      if (canvasInstance && isCanvasAlive(canvasInstance)) {
        canvasInstance.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutBase, initialState]);

  const handleTextChange = (id: string, value: string) => {
    if (!fabricRef) return;
    const obj = fabricRef
      .getObjects()
      .find((o: any) => o.id === id || o.name === id);
    if (obj && (obj.type === "textbox" || obj.type === "i-text")) {
      obj.set("text", value);
      setEditableTexts((prev) => ({ ...prev, [id]: value }));
      fabricRef.renderAll();
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    frameId: string,
  ) => {
    const file = e.target.files?.[0];
    if (file && fabricRef) {

      const frame = fabricRef
        .getObjects()
        .find((o: any) => o.id === frameId || o.name === frameId);
      if (frame) {
        const width = frame.width * frame.scaleX;
        const height = frame.height * frame.scaleY;
        setCropAspect(width / height);
      } else {
        setCropAspect(undefined);
      }

      setFileToCrop(file);
      setCurrentFrameId(frameId);
      setCropDialogOpen(true);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!fabricRef || !currentFrameId) return;

    setIsProcessingImage(true);
    const tid = toast.loading("Processando imagem...");

    try {

      const blob = dataURLtoBlob(croppedImageUrl);
      const file = new File([blob], `crop_${currentFrameId}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
      const token =
        localStorage.getItem("token") || localStorage.getItem("appToken") || "";

      const uploadRes = await fetch(`${API_URL}/uploads/temp`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!uploadRes.ok) throw new Error("Falha no upload");

      const uploadData = await uploadRes.json();
      let finalUrl = uploadData.data?.url || uploadData.url || uploadData.path;

      if (!finalUrl) throw new Error("URL não retornada");

      if (finalUrl.startsWith("/")) {
        finalUrl = `${API_URL.replace(/\/api$/, "")}${finalUrl}`;
      }

      setLocalImages((prev) => ({ ...prev, [currentFrameId]: finalUrl }));

      const frame = fabricRef
        .getObjects()
        .find((o: any) => o.id === currentFrameId || o.name === currentFrameId);
      if (frame) {
        await loadLocalImageToFrame(fabricRef, frame, finalUrl);
      }

      toast.success("Imagem aplicada!", { id: tid });
    } catch (err) {
      console.error("Erro no processamento da imagem:", err);
      toast.error("Erro ao salvar imagem", { id: tid });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleComplete = async () => {
    if (!fabricRef) return;

    const tid = toast.loading("Gerando arquivos finais...");
    try {

      const originalTransform = [...(fabricRef as any).viewportTransform];
      (fabricRef as any).setViewportTransform([
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
      ]);

      const highQualityUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 4 / INTERNAL_DPI_MULTIPLIER,
        enableRetinaScaling: false,
      });

      const previewUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 2 / INTERNAL_DPI_MULTIPLIER,
        enableRetinaScaling: false,
      });

      (fabricRef as any).setViewportTransform(originalTransform);

      const state = JSON.stringify(fabricRef.toJSON());

      const images: any[] = Object.entries(localImages).map(
        ([frameId, url]) => ({
          id: frameId,
          url: url,
          preview_url: url,
        }),
      );

      onComplete(images as ImageData[], previewUrl, state, highQualityUrl);
      toast.success("Design concluído!", { id: tid });
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      toast.error("Erro ao salvar", { id: tid });
    }
  };

  return (
    <div className="flex flex-col h-[82vh] min-h-[600px] overflow-hidden bg-gray-50/70">
      
      <header className="shrink-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Button
              variant="ghost"
              onClick={onBack}
              className="gap-1.5 sm:gap-2 text-gray-700 hover:text-rose-600 hover:bg-rose-50/70 -ml-2 sm:-ml-3"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">
                Alterar Layout
              </span>
            </Button>

            <div className="text-right">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-tight">
                {layoutBase.name}
              </h3>
              <p className="text-[10px] sm:text-xs font-medium text-rose-600/90 uppercase tracking-wider mt-0.5">
                Edição em Tempo Real
              </p>
            </div>
          </div>
        </div>
      </header>

      
      <main className="flex-1 flex flex-col lg:flex-row w-full px-4 sm:px-6 lg:px-10 py-4 lg:py-6 gap-4 lg:gap-8 overflow-hidden min-h-0">
        
        <section className="flex-[1.2] lg:flex-1 w-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden relative flex flex-col">
            {loading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-rose-500" />
                <p className="text-sm font-medium text-gray-700">
                  Inicializando estúdio...
                </p>
              </div>
            )}

            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-gray-50/30 overflow-hidden relative min-h-0">
              <div
                ref={containerRef}
                className="bg-white border-4 sm:border-6 border-white shadow-2xl rounded-xl pointer-events-none overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  width: (layoutBase.width || 378) * workspaceZoom,
                  height: (layoutBase.height || 567) * workspaceZoom,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>

            <div className="py-3 px-4 bg-gray-50/70 border-t border-gray-100 text-center flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                Visualização em Tempo Real
              </div>
            </div>
          </div>
        </section>

        
        <aside className="w-full flex-1 lg:flex-none lg:w-80 xl:w-96 flex flex-col gap-6 lg:gap-8 overflow-y-auto h-full custom-scrollbar px-1 lg:px-2 pb-6 lg:pb-0 shrink-0 border-l border-gray-100/50 bg-white/50 lg:backdrop-blur-sm">
          <Card className="border border-rose-100/60 shadow-md bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5 sm:p-6 lg:p-7 space-y-6 lg:space-y-7">
              
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <Palette className="h-5 w-5 text-rose-600" />
                </div>
                <h4 className="font-semibold text-gray-800 text-lg">
                  Personalizações
                </h4>
              </div>

              
              {Object.keys(editableTexts).length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <Type className="h-4 w-4" />
                    Textos editáveis
                  </div>

                  <div className="space-y-4">
                    {Object.entries(editableTexts).map(([id, text]) => {
                      const obj = fabricRef
                        ?.getObjects()
                        .find((o: any) => (o.id || o.name) === id);
                      const maxChars = (obj as any)?.maxChars || 50;
                      const isLongText = maxChars > 20;

                      return (
                        <div key={id} className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            {fieldLabels[id] || "Campo de texto"}
                          </Label>

                          {isLongText ? (
                            <Textarea
                              value={text}
                              onChange={(e) =>
                                handleTextChange(id, e.target.value)
                              }
                              maxLength={maxChars}
                              className="min-h-[70px] sm:min-h-[90px] resize-none border-gray-200 focus:border-rose-400 focus:ring-rose-100/40 text-sm"
                              placeholder="Escreva algo especial..."
                            />
                          ) : (
                            <Input
                              value={text}
                              onChange={(e) =>
                                handleTextChange(id, e.target.value)
                              }
                              maxLength={maxChars}
                              className="h-11 border-gray-200 focus:border-rose-400 focus:ring-rose-100/40"
                              placeholder="Escreva algo especial..."
                            />
                          )}

                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Limite: {maxChars} caracteres</span>
                            <span
                              className={
                                text.length === maxChars
                                  ? "text-rose-600 font-medium"
                                  : ""
                              }
                            >
                              {text.length}/{maxChars}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              
              <div className="space-y-5 pt-5 border-t border-dashed border-gray-200">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <ImageIcon className="h-4 w-4" />
                  Molduras de fotos
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                  {fabricRef
                    ?.getObjects()
                    .filter((o: any) => o.isFrame)
                    .map((frame: any, index: number) => {
                      const id = frame.id || frame.name;
                      const label = fieldLabels[id] || `Foto ${index + 1}`;
                      let imageUrl = localImages[id];

                      if (imageUrl?.startsWith("/")) {
                        const apiBase = (
                          process.env.NEXT_PUBLIC_API_URL || ""
                        ).replace(/\/api$/, "");
                        imageUrl = `${apiBase}${imageUrl}`;
                      }

                      const hasImage = !!imageUrl;

                      return (
                        <div key={`${id}-${index}`} className="space-y-2">
                          <Label className="text-xs font-medium text-gray-600 block text-center truncate">
                            {label}
                          </Label>

                          <div
                            className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                            ${
                              hasImage
                                ? "border-rose-400 shadow-sm hover:shadow-md"
                                : "border-dashed border-gray-300 hover:border-rose-300 bg-gray-50/60 hover:bg-rose-50/30"
                            }`}
                            onClick={() =>
                              document.getElementById(`upload-${id}`)?.click()
                            }
                          >
                            {hasImage ? (
                              <Image
                                src={imageUrl}
                                alt={`Foto ${label}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Upload className="h-7 w-7 text-gray-400 group-hover:text-rose-500 transition-colors" />
                              </div>
                            )}

                            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm border border-white/80">
                              {hasImage ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Upload className="h-4 w-4 text-rose-600" />
                              )}
                            </div>

                            <Input
                              id={`upload-${id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] rounded-xl gap-2"
            onClick={handleComplete}
            disabled={isProcessingImage}
          >
            {isProcessingImage ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Concluir e Salvar
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400 font-medium tracking-wide">
            Garantia de Qualidade • Cesto dAmore
          </p>
        </aside>
      </main>

      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setFileToCrop(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={cropAspect}
          title="Ajuste sua Foto"
          description="Posicione a foto para que ela preencha perfeitamente a moldura"
        />
      )}
    </div>
  );
}
