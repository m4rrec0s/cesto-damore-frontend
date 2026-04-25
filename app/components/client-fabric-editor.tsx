"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import {
  Upload,
  Check,
  ArrowLeft,
  Type,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { LayoutBase, ImageData } from "../types/personalization";
import { ImageCropDialog } from "./ui/image-crop-dialog";
import Image from "next/image";
import { dataURLtoBlob } from "@/app/lib/utils";
import { getPublicAssetUrl } from "@/lib/image-helper";

const INTERNAL_DPI_MULTIPLIER = 2;
const BACKEND_PROXY_BASE = "/api/backend";

const toBackendAssetUrl = (value: string): string => {
  if (!value) return value;
  if (value.startsWith(`${BACKEND_PROXY_BASE}/`)) return value;
  if (value.startsWith("/")) return `${BACKEND_PROXY_BASE}${value}`;

  try {
    const parsed = new URL(value);
    const isLocalhostSource =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isBackendAssetPath = parsed.pathname.startsWith("/uploads/");

    if (isLocalhostSource || isBackendAssetPath) {
      return `${BACKEND_PROXY_BASE}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return value;
  }

  return value;
};

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
  const wrapperRef = useRef<HTMLDivElement>(null);
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
  const [workspaceZoom, setWorkspaceZoom] = useState(0.6);

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

  // Observa o wrapper do canvas (coluna esquerda) para calcular zoom
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: availWidth, height: availHeight } = entry.contentRect;

        const margin = 24;
        const maxWidth = Math.max(availWidth - margin, 80);
        const maxHeight = Math.max(availHeight - margin, 80);

        const layoutWidth = Number(layoutBase.width) || 378;
        const layoutHeight = Number(layoutBase.height) || 567;

        const zoomW = maxWidth / layoutWidth;
        const zoomH = maxHeight / layoutHeight;

        const finalZoom = Math.min(zoomW, zoomH, 1.1);
        setWorkspaceZoom(Math.max(0.1, finalZoom));
      }
    });

    observer.observe(wrapper);
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
    const generatedFallbackPlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="100%" stop-color="#e5e7eb"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#bg)"/>
        <rect x="220" y="140" width="760" height="520" rx="40" fill="#d1d5db"/>
        <circle cx="430" cy="340" r="70" fill="#9ca3af"/>
        <path d="M260 600l210-170 120 100 150-130 240 200z" fill="#9ca3af"/>
      </svg>`,
    )}`;

    try {
      const placeholderSources = [
        getPublicAssetUrl("placeholder_design-v2.png"),
        getPublicAssetUrl("placeholder-v2.png"),
        generatedFallbackPlaceholder,
      ];

      let placeholderImg: any = null;
      for (const source of placeholderSources) {
        try {
          placeholderImg = await FabricImage.fromURL(source, {
            crossOrigin: "anonymous",
          });
          if (placeholderImg) break;
        } catch {
          // Try next source.
        }
      }

      if (!placeholderImg) {
        console.warn("Placeholder não pôde ser carregado em nenhuma origem.");
        return;
      }

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
      const finalUrl = toBackendAssetUrl(url);

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

              state.objects = state.objects.map((obj: any) => {
                if (obj.type === "i-text" || obj.type === "IText") {
                  obj.type = "textbox";
                }

                if (obj.type === "Image" || obj.type === "image") {
                  let src = obj.src || "";
                  src = toBackendAssetUrl(src);
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

    try {
      const blob = dataURLtoBlob(croppedImageUrl);
      const file = new File([blob], `crop_${currentFrameId}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", file);

      const token =
        localStorage.getItem("token") || localStorage.getItem("appToken") || "";

      const uploadRes = await fetch(`${BACKEND_PROXY_BASE}/uploads/temp`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!uploadRes.ok) {
        let errorDetails = `HTTP ${uploadRes.status}`;
        try {
          const errorBody = await uploadRes.json();
          errorDetails =
            errorBody?.error ||
            errorBody?.details ||
            errorBody?.message ||
            errorDetails;
        } catch {}
        throw new Error(`Falha no upload: ${errorDetails}`);
      }

      const uploadData = await uploadRes.json();
      let finalUrl = uploadData.data?.url || uploadData.url || uploadData.path;

      if (!finalUrl) throw new Error("URL não retornada");
      finalUrl = toBackendAssetUrl(finalUrl);

      setLocalImages((prev) => ({ ...prev, [currentFrameId]: finalUrl }));

      const frame = fabricRef
        .getObjects()
        .find((o: any) => o.id === currentFrameId || o.name === currentFrameId);
      if (frame) {
        await loadLocalImageToFrame(fabricRef, frame, finalUrl);
      }

      setCropDialogOpen(false);
      setFileToCrop(null);
      setCurrentFrameId(null);
    } catch (err) {
      console.error("Erro no processamento da imagem:", err);
      toast.error("Erro ao salvar imagem");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleComplete = async () => {
    if (!fabricRef) return;

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
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      toast.error("Erro ao salvar");
    }
  };

  const frames = fabricRef?.getObjects().filter((o: any) => o.isFrame) ?? [];
  const hasTexts = Object.keys(editableTexts).length > 0;
  const hasFrames = frames.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {layoutBase.name}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div
          ref={wrapperRef}
          className="relative flex w-full h-[40vh] md:h-[500px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <div className="flex flex-col items-center gap-1.5 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                <p className="text-xs">Carregando...</p>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            className="flex justify-center pointer-events-none shrink-0 overflow-hidden w-full h-full"
          />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto">
          {hasTexts && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <Type className="h-3 w-3" />
                Textos
              </div>

              {Object.entries(editableTexts).map(([id, text]) => {
                const obj = fabricRef
                  ?.getObjects()
                  .find((o: any) => (o.id || o.name) === id);
                const maxChars = (obj as any)?.maxChars || 50;
                const isLongText = maxChars > 20;

                return (
                  <div key={id} className="flex flex-col gap-1">
                    <Label className="text-[11px] font-medium text-gray-600">
                      {fieldLabels[id] || "Campo de texto"}
                    </Label>

                    {isLongText ? (
                      <Textarea
                        value={text}
                        onChange={(e) => handleTextChange(id, e.target.value)}
                        maxLength={maxChars}
                        className="min-h-[64px] resize-none border-gray-200 text-xs"
                        placeholder="Texto"
                      />
                    ) : (
                      <Input
                        value={text}
                        onChange={(e) => handleTextChange(id, e.target.value)}
                        maxLength={maxChars}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="Texto"
                      />
                    )}

                    <div className="text-right text-[10px] text-gray-400">
                      <span
                        className={
                          text.length === maxChars
                            ? "font-medium text-rose-500"
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
          )}

          {hasFrames && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <ImageIcon className="h-3 w-3" />
                Fotos
              </div>

              {isProcessingImage && (
                <div className="rounded-md border border-rose-100 bg-rose-50 p-2">
                  <Progress value={70} className="h-1" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                {frames.map((frame: any, index: number) => {
                  const id = frame.id || frame.name;
                  const label = fieldLabels[id] || `${index + 1}`;
                  let imageUrl = localImages[id];
                  if (imageUrl) imageUrl = toBackendAssetUrl(imageUrl);
                  const hasImage = !!imageUrl;

                  return (
                    <div key={`${id}-${index}`} className="flex flex-col gap-1">
                      <p className="truncate text-center text-[10px] font-medium text-gray-500">
                        {label}
                      </p>

                      <div
                        className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all
                          ${
                            hasImage
                              ? "border-rose-400 hover:border-rose-500"
                              : "border-dashed border-gray-300 bg-gray-50 hover:border-rose-300"
                          }`}
                        onClick={() =>
                          document.getElementById(`upload-${id}`)?.click()
                        }
                      >
                        {hasImage ? (
                          <Image
                            src={imageUrl}
                            alt={label}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-gray-300 group-hover:text-rose-400 transition-colors" />
                          </div>
                        )}

                        <div className="absolute bottom-1.5 right-1.5 rounded-full border border-white/80 bg-white/90 p-0.5 shadow-sm">
                          {hasImage ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Upload className="h-3 w-3 text-rose-500" />
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
          )}

          <div className="flex-1" />

          <Button
            size="sm"
            className="h-9 w-full gap-1.5 rounded-lg bg-rose-600 text-sm font-semibold hover:bg-rose-700"
            onClick={handleComplete}
            disabled={isProcessingImage}
          >
            {isProcessingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>

      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setFileToCrop(null);
            setCurrentFrameId(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={cropAspect}
          isProcessing={isProcessingImage}
          title="Ajuste sua Foto"
          description="Posicione a foto para que ela preencha perfeitamente a moldura"
        />
      )}
    </div>
  );
}
