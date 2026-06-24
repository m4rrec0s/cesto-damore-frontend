"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { compressImage } from "@/app/lib/utils";
import { getPublicAssetUrl } from "@/lib/image-helper";
import { jsPDF } from "jspdf";
import {
  getFrameKey,
  normalizeImageIds,
  validateCustomization,
  extractRawFrameId,
  type LayoutImage,
} from "@/app/lib/frame-utils";

const INTERNAL_DPI_MULTIPLIER = 2;
const BACKEND_PROXY_BASE = "/api/backend";

const toBackendAssetUrl = (value: string): string => {
  if (!value) return value;
  if (value.startsWith(`${BACKEND_PROXY_BASE}/`)) return value;
  if (value.startsWith("data:")) return value;
  if (value.startsWith("blob:")) return value;
  if (value.includes(`${BACKEND_PROXY_BASE}/`)) return value;
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
    pdfUrl?: string,
  ) => void;
  onBack: () => void;
  initialState?: string;
  initialImages?: Record<string, string>;
  initialTexts?: Record<string, string>;
}

export default function ClientFabricEditor({
  layoutBase,
  onComplete,
  onBack,
  initialState,
  initialImages,
  initialTexts,
}: ClientFabricEditorProps) {
  const [fabricRef, setFabricRef] = useState<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initRunRef = useRef(0);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const [editableTexts, setEditableTexts] = useState<Record<string, string>>(
    {},
  );
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [allFrames, setAllFrames] = useState<any[]>([]);
  const multiPageRef = useRef<{ pages: any[]; activePageIndex: number }>({
    pages: [],
    activePageIndex: 0,
  });
  const [localImages, setLocalImages] = useState<Record<string, string>>(() => {
    if (initialImages && Object.keys(initialImages).length > 0)
      return initialImages;
    if (typeof window === "undefined") return {};
    try {
      if (!layoutBase.id) return {};
      const saved = localStorage.getItem(`client-design-imgs-${layoutBase.id}`);
      if (!saved) return {};
      const raw = JSON.parse(saved);

      // Support both old format (plain object) and new format ({ _ts, data })
      let parsed: Record<string, string>;
      if (raw._ts && raw.data) {
        // Expire after 24h
        if (Date.now() - raw._ts > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(`client-design-imgs-${layoutBase.id}`);
          return {};
        }
        parsed = raw.data;
      } else {
        // Old format without timestamp — treat as expired
        localStorage.removeItem(`client-design-imgs-${layoutBase.id}`);
        return {};
      }

      if (Object.keys(parsed).length === 0) return {};

      // Use the normalize function from frame-utils
      const fabricState =
        layoutBase.fabricJsonState || layoutBase.fabric_json_state;
      if (fabricState) {
        const imagesArray: LayoutImage[] = Object.entries(parsed).map(
          ([id, url]) => ({ id, url, preview_url: url }),
        );
        const normalized = normalizeImageIds(imagesArray, fabricState);
        const result: Record<string, string> = {};
        for (const img of normalized) {
          result[img.id] = img.url;
        }
        return result;
      }

      return parsed;
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);
  const [workspaceZoom, setWorkspaceZoom] = useState(0.6);
  const localImagesRef = useRef(localImages);

  const localImagesCreatedAt = useRef<number>(
    (() => {
      if (typeof window === "undefined" || !layoutBase.id) return Date.now();
      try {
        const saved = localStorage.getItem(`client-design-imgs-${layoutBase.id}`);
        if (saved) {
          const raw = JSON.parse(saved);
          if (raw._ts) return raw._ts as number;
        }
      } catch {}
      return Date.now();
    })(),
  );

  useEffect(() => {
    localImagesRef.current = localImages;
    if (layoutBase.id && Object.keys(localImages).length > 0) {
      localStorage.setItem(
        `client-design-imgs-${layoutBase.id}`,
        JSON.stringify({ _ts: localImagesCreatedAt.current, data: localImages }),
      );
    }
  }, [localImages, layoutBase.id]);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [currentFramePageIndex, setCurrentFramePageIndex] = useState<
    number | null
  >(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  type UploadStatus = "idle" | "uploading" | "done" | "error";
  const [frameUploadStatus, setFrameUploadStatus] = useState<
    Record<string, UploadStatus>
  >({});
  const uploadControllers = useRef<Record<string, AbortController>>({});
  const [renderKey, setRenderKey] = useState(0);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    totalFrames: number;
    filledFrames: number;
  } | null>(null);

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

  // Atualiza validação quando imagens mudam
  useEffect(() => {
    const stateSource =
      initialState ||
      layoutBase.fabricJsonState ||
      layoutBase.fabric_json_state;
    if (!stateSource) return;

    let fabricState: any;
    try {
      fabricState =
        typeof stateSource === "string" ? JSON.parse(stateSource) : stateSource;
    } catch {
      return;
    }

    const imagesForValidation: LayoutImage[] = Object.entries(localImages).map(
      ([k, v]) => ({ id: k, url: v, preview_url: v }),
    );
    const result = validateCustomization(imagesForValidation, fabricState);
    setValidationResult({
      valid: result.valid,
      totalFrames: result.totalFrames,
      filledFrames: result.filledFrames,
    });
  }, [localImages, initialState, layoutBase]);

  const addFramePlaceholder = useCallback(async (canvas: any, frame: any) => {
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

      // Use contain (Math.min) para placeholder aparecer completo
      const scale =
        Math.min(
          frameWidth / placeholderImg.width!,
          frameHeight / placeholderImg.height!,
        ) * 0.8; // 80% para deixar margem

      placeholderImg.set({
        scaleX: scale,
        scaleY: scale,
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        opacity: 0.4,
        name: `placeholder-img-${extractRawFrameId(frame.id || frame.name)}`,
        angle: frame.angle || 0,
      });

      // Não adicionar clipPath no placeholder para mostrar a imagem completa
      canvas.add(placeholderImg);
      canvas.renderAll();
    } catch (err) {
      console.error("Erro ao carregar placeholder:", err);
    }
  }, []);

  const loadLocalImageToFrame = useCallback(
    async (canvas: any, frame: any, url: string) => {
      const { FabricImage, Rect, Circle } = await import("fabric");

      const frameId = extractRawFrameId(frame.id || frame.name);
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

        // Usar cache de HTMLImageElement para evitar re-download
        let imgEl: HTMLImageElement;
        if (imageCache.current.has(finalUrl)) {
          imgEl = imageCache.current.get(finalUrl)!;
        } else {
          imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new window.Image();
            el.crossOrigin = "anonymous";
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = finalUrl;
          });
          imageCache.current.set(finalUrl, imgEl);
        }

        const img = new FabricImage(imgEl);

        if (!img || !img.width) {
          return;
        }

        const frameWidth = frame.width * frame.scaleX;
        const frameHeight = frame.height * frame.scaleY;
        const center = frame.getCenterPoint();

        // Ocultar frame SOMENTE após imagem carregada com sucesso
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
    },
    [],
  );

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

        // Adicionar isFrame aos campos customizados serializados
        const originalToObject = FabricObject.prototype.toObject;
        FabricObject.prototype.toObject = function (propertiesToInclude = []) {
          return originalToObject.call(this, [
            ...propertiesToInclude,
            "id",
            "isFrame",
            "customData",
            "isCustomizable",
            "name",
          ]);
        };

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

            const isMultiPage = Array.isArray(state?.pages);
            const pages = isMultiPage ? state.pages : [];
            const activePageIndex = 0;
            multiPageRef.current = { pages, activePageIndex };

            const stateForCanvas =
              isMultiPage && pages[0] ? pages[0].canvasState : state;

            const objectsForDetection = stateForCanvas?.objects || [];

            if (objectsForDetection.length > 0) {
              const fontsToLoad = new Set<string>();
              objectsForDetection.forEach((obj: any) => {
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

              stateForCanvas.objects = objectsForDetection.map((obj: any) => {
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
              await canvasInstance.loadFromJSON(stateForCanvas);
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

        const { texts, labels } = await processCanvasObjects(canvasInstance);

        // Apply initialTexts if provided (re-editing from editorState)
        if (initialTexts && Object.keys(initialTexts).length > 0) {
          for (const obj of canvasInstance.getObjects() as any[]) {
            if (
              obj.isCustomizable &&
              (obj.type === "textbox" || obj.type === "i-text")
            ) {
              const key = obj.id || obj.name;
              if (key && initialTexts[key]) {
                obj.set("text", initialTexts[key]);
              }
            }
          }
          canvasInstance.renderAll();
        }

        if (isMounted) {
          setEditableTexts(
            initialTexts && Object.keys(initialTexts).length > 0
              ? { ...texts, ...initialTexts }
              : texts,
          );
          setFieldLabels(labels);

          const collectedFrames: any[] = [];
          if (multiPageRef.current.pages.length > 0) {
            for (let pi = 0; pi < multiPageRef.current.pages.length; pi++) {
              const pg = multiPageRef.current.pages[pi];
              const pgObjects = pg.canvasState?.objects || [];
              for (const obj of pgObjects) {
                const isFrame =
                  obj.isFrame === true ||
                  obj.name === "photo-frame" ||
                  obj.name === "image-frame" ||
                  (obj.name &&
                    obj.name.includes("frame") &&
                    !obj.name.startsWith("placeholder-") &&
                    !obj.name.startsWith("uploaded-")) ||
                  (obj.customData && obj.customData.isFrame === true);
                if (isFrame && (obj.id || obj.name)) {
                  const rawFid = extractRawFrameId(obj.id || obj.name);
                  const isMp = multiPageRef.current.pages.length > 1;
                  const fid = getFrameKey(pi, rawFid);
                  collectedFrames.push({
                    ...obj,
                    pageId: pg.id,
                    pageIndex: pi,
                    label: isMp
                      ? `P${pi + 1} - ${obj.name || "Foto"}`
                      : obj.name || "Foto",
                    _frameId: fid,
                    _rawFrameId: rawFid,
                    _pagePrefix: isMp ? `p${pi}_` : "",
                  });
                }
              }
            }
          } else {
            // Single-page: collect from live canvas
            for (const obj of canvasInstance.getObjects() as any[]) {
              if (obj.isFrame && (obj.id || obj.name)) {
                const rawFid = extractRawFrameId(obj.id || obj.name);
                const fid = getFrameKey(0, rawFid);
                collectedFrames.push({
                  ...obj,
                  pageIndex: 0,
                  label: obj.name || "Foto",
                  _frameId: fid,
                  _rawFrameId: rawFid,
                  _pagePrefix: "",
                });
              }
            }
          }

          setAllFrames(collectedFrames);

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

  const processCanvasObjects = useCallback(
    async (canvas: FabricCanvas, pageIndex?: number) => {
      const objects = [...canvas.getObjects()]; // Snapshot to avoid mutation during iteration
      const texts: Record<string, string> = {};
      const labels: Record<string, string> = {};

      const currentPageIndex =
        pageIndex ?? multiPageRef.current.activePageIndex;
      const imageLoadPromises: Promise<void>[] = [];

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
          (obj.name &&
            obj.name.includes("frame") &&
            !obj.name.startsWith("placeholder-") &&
            !obj.name.startsWith("uploaded-")) ||
          (obj.customData && obj.customData.isFrame === true);

        if (isFrame && (obj.id || obj.name)) {
          obj.isFrame = true;
          const rawFid = extractRawFrameId(obj.id || obj.name);
          const fid = getFrameKey(currentPageIndex, rawFid);
          labels[rawFid] = obj.name || "Moldura de Foto";

          const hasImg = objects.some(
            (o: any) => o.name === `uploaded-img-${rawFid}`,
          );
          const hasPlaceholder = objects.some(
            (o: any) => o.name === `placeholder-img-${rawFid}`,
          );

          if (!hasImg && !hasPlaceholder && !localImagesRef.current[fid]) {
            await addFramePlaceholder(canvas, obj);
          } else if (!hasImg && localImagesRef.current[fid]) {
            // Carregar imagem em paralelo (não bloqueia o loop)
            imageLoadPromises.push(
              loadLocalImageToFrame(canvas, obj, localImagesRef.current[fid]),
            );
          } else if (hasImg) {
            obj.set({ fill: "transparent", stroke: "transparent", opacity: 0 });
          }
        } else if (obj.isCustomizable) {
          if (obj.type === "textbox" || obj.type === "i-text") {
            const fid = obj.id || obj.name;
            texts[fid] = obj.text || "";
            labels[fid] = obj.name || "Campo de Texto";
          }
        }
      }

      // Carregar imagens em paralelo
      if (imageLoadPromises.length > 0) {
        Promise.all(imageLoadPromises).then(() => canvas.requestRenderAll());
      }

      return { texts, labels, imageLoadPromises };
    },
    [addFramePlaceholder, loadLocalImageToFrame],
  );

  const handleTextChange = (id: string, value: string) => {
    if (!fabricRef) return;
    const obj = fabricRef
      .getObjects()
      .find(
        (o: any) =>
          o.id === id ||
          o.name === id ||
          extractRawFrameId(o.id || o.name) === id,
      );
    if (obj && (obj.type === "textbox" || obj.type === "i-text")) {
      obj.set("text", value);
      setEditableTexts((prev) => ({ ...prev, [id]: value }));
      fabricRef.renderAll();
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    frameId: string,
    frameWidth?: number,
    frameHeight?: number,
    framePageIndex?: number,
  ) => {
    const file = e.target.files?.[0];
    if (file && fabricRef) {
      if (frameWidth && frameHeight) {
        setCropAspect(frameWidth / frameHeight);
      } else {
        const frame = fabricRef
          .getObjects()
          .find(
            (o: any) =>
              extractRawFrameId(o.id || o.name) === frameId &&
              (o.isFrame ||
                o.isCustomizable ||
                o.type === "Rect" ||
                o.type === "rect"),
          );
        if (frame) {
          const width = frame.width * frame.scaleX;
          const height = frame.height * frame.scaleY;
          setCropAspect(width / height);
        } else {
          setCropAspect(undefined);
        }
      }

      setFileToCrop(file);
      setCurrentFrameId(frameId);
      setCurrentFramePageIndex(framePageIndex ?? null);
      setCropDialogOpen(true);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!fabricRef || !currentFrameId) return;

    const frameId = currentFrameId;
    const framePageIndex = currentFramePageIndex;

    setIsProcessingImage(true);

    try {
      // 1. Compress the cropped image to JPEG
      const dataUrl = croppedImageUrl;
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1]);
      const u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const rawBlob = new Blob([u8], { type: mime });
      const compressedBlob = await compressImage(rawBlob);

      // 2. objectURL for instant preview
      const localUrl = URL.createObjectURL(compressedBlob);

      const pageIdx =
        framePageIndex !== null
          ? framePageIndex
          : multiPageRef.current.activePageIndex;
      const imageKey = getFrameKey(pageIdx, frameId);

      setLocalImages((prev) => ({ ...prev, [imageKey]: localUrl }));
      setRenderKey((n) => n + 1);

      const frame = fabricRef
        .getObjects()
        .find(
          (o: any) =>
            extractRawFrameId(o.id || o.name) === frameId &&
            (o.isFrame || o.isCustomizable || o.type === "Rect" || o.type === "rect"),
        );
      if (frame) {
        await loadLocalImageToFrame(fabricRef, frame, localUrl);
        fabricRef.requestRenderAll();
      }

      // Close dialog immediately — preview is already rendered
      setCropDialogOpen(false);
      setFileToCrop(null);
      setCurrentFrameId(null);
      setCurrentFramePageIndex(null);
      setIsProcessingImage(false);

      // 3. Background upload
      // Cancel any existing upload for this frame
      if (uploadControllers.current[frameId]) {
        uploadControllers.current[frameId].abort();
      }
      const controller = new AbortController();
      uploadControllers.current[frameId] = controller;
      setFrameUploadStatus((s) => ({ ...s, [frameId]: "uploading" }));

      const formData = new FormData();
      formData.append(
        "file",
        new File([compressedBlob], `crop_${frameId}.jpg`, { type: "image/jpeg" }),
      );

      const token =
        localStorage.getItem("token") || localStorage.getItem("appToken") || "";

      const uploadRes = await fetch(`${BACKEND_PROXY_BASE}/uploads/temp`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: {
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!uploadRes.ok) {
        let errorDetails = `HTTP ${uploadRes.status}`;
        try {
          const errorBody = await uploadRes.json();
          errorDetails = errorBody?.error || errorBody?.details || errorBody?.message || errorDetails;
        } catch {}
        throw new Error(`Falha no upload: ${errorDetails}`);
      }

      const uploadData = await uploadRes.json();
      let serverUrl = uploadData.data?.url || uploadData.url || uploadData.path;
      if (!serverUrl) throw new Error("URL não retornada");
      serverUrl = toBackendAssetUrl(serverUrl);

      // 4. Swap objectURL → serverURL
      setLocalImages((prev) => ({ ...prev, [imageKey]: serverUrl }));
      URL.revokeObjectURL(localUrl);
      setFrameUploadStatus((s) => ({ ...s, [frameId]: "done" }));
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Erro no processamento da imagem:", err);
      toast.error("Erro ao enviar imagem. Tente novamente.");
      setFrameUploadStatus((s) => ({ ...s, [currentFrameId ?? frameId]: "error" }));
      setIsProcessingImage(false);
    }
  };

  const handleComplete = useCallback(async () => {
    if (!fabricRef || isProcessingImage) return;

    setIsProcessingImage(true);
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

      const isMultiPage = multiPageRef.current.pages.length > 0;

      let previewUrl: string;
      let highQualityUrl: string;
      let pdfUrl: string | undefined;

      if (isMultiPage && multiPageRef.current.pages.length > 1) {
        // Multi-page: export each page individually, then composite + PDF
        const { Canvas: FabricCanvas } = await import("fabric");
        const pages = multiPageRef.current.pages;
        const pageExports: Array<{
          dataUrl: string;
          width: number;
          height: number;
        }> = [];

        const originalPageIndex = multiPageRef.current.activePageIndex;

        for (let i = 0; i < pages.length; i++) {
          const pageCanvasState = pages[i].canvasState;
          // Always use base layout dimensions (pages may have stale backstore dimensions)
          const pgW = layoutBase.width || 378;
          const pgH = layoutBase.height || 567;

          const tempCanvas = new FabricCanvas(
            document.createElement("canvas"),
            { width: pgW, height: pgH },
          );

          await tempCanvas.loadFromJSON(pageCanvasState);

          tempCanvas.setDimensions({ width: pgW, height: pgH });
          tempCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

          // Temporarily set activePageIndex so processCanvasObjects uses correct frame keys
          multiPageRef.current.activePageIndex = i;
          const { imageLoadPromises } = await processCanvasObjects(
            tempCanvas,
            i,
          );
          multiPageRef.current.activePageIndex = originalPageIndex;

          // Wait for all images to load before exporting
          if (imageLoadPromises && imageLoadPromises.length > 0) {
            await Promise.all(imageLoadPromises);
          }

          tempCanvas.renderAll();

          const dataUrl = tempCanvas.toDataURL({
            format: "png",
            multiplier: 4,
            enableRetinaScaling: false,
          });

          pageExports.push({
            dataUrl,
            width: pgW,
            height: pgH,
          });

          tempCanvas.dispose();
        }

        // Composite all pages vertically (at export resolution)
        const exportMultiplier = 4;
        const totalHeight = pageExports.reduce(
          (sum, p) => sum + p.height * exportMultiplier,
          0,
        );
        const maxWidth = Math.max(
          ...pageExports.map((p) => p.width * exportMultiplier),
        );

        const compositeCanvas = document.createElement("canvas");
        compositeCanvas.width = maxWidth;
        compositeCanvas.height = totalHeight;
        const ctx = compositeCanvas.getContext("2d")!;

        let yOffset = 0;
        for (const page of pageExports) {
          const img = new window.Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = page.dataUrl;
          });
          ctx.drawImage(
            img,
            0,
            yOffset,
            page.width * exportMultiplier,
            page.height * exportMultiplier,
          );
          yOffset += page.height * exportMultiplier;
        }

        highQualityUrl = compositeCanvas.toDataURL("image/png");
        previewUrl = compositeCanvas.toDataURL("image/png", 0.92);

        // Generate PDF
        try {
          // Use first page dimensions for PDF format
          const canvasW = pageExports[0].width;
          const canvasH = pageExports[0].height;
          const aspectRatio = canvasW / canvasH;
          let pdfWidthCm: number, pdfHeightCm: number;

          if (layoutBase.item_type === "mug") {
            pdfWidthCm = 20;
            pdfHeightCm = 9.4;
          } else {
            // Default: use canvas aspect ratio scaled to A4-ish size
            // Assume longest side is 30cm for frames
            if (aspectRatio >= 1) {
              pdfWidthCm = 30;
              pdfHeightCm = 30 / aspectRatio;
            } else {
              pdfHeightCm = 30;
              pdfWidthCm = 30 * aspectRatio;
            }
          }

          const orientation =
            pdfWidthCm > pdfHeightCm ? "landscape" : "portrait";
          const pdf = new jsPDF({
            orientation,
            unit: "cm",
            format: [pdfWidthCm, pdfHeightCm],
            compress: true,
          });

          for (let i = 0; i < pageExports.length; i++) {
            if (i > 0) {
              pdf.addPage([pdfWidthCm, pdfHeightCm], orientation);
            }
            pdf.addImage(
              pageExports[i].dataUrl,
              "PNG",
              0,
              0,
              pdf.internal.pageSize.getWidth(),
              pdf.internal.pageSize.getHeight(),
            );
          }

          pdfUrl = pdf.output("dataurlstring");
        } catch (pdfErr) {
          console.error("Erro ao gerar PDF:", pdfErr);
          // Continue without PDF — preview/hq images are still available
        }
      } else {
        // Single-page: export live canvas + generate PDF
        highQualityUrl = fabricRef.toDataURL({
          format: "png",
          multiplier: 4 / INTERNAL_DPI_MULTIPLIER,
          enableRetinaScaling: false,
        });

        previewUrl = fabricRef.toDataURL({
          format: "png",
          multiplier: 2 / INTERNAL_DPI_MULTIPLIER,
          enableRetinaScaling: false,
        });

        // Generate single-page PDF
        try {
          const canvasW = fabricRef.width / INTERNAL_DPI_MULTIPLIER;
          const canvasH = fabricRef.height / INTERNAL_DPI_MULTIPLIER;
          const aspectRatio = canvasW / canvasH;
          let pdfWidthCm: number, pdfHeightCm: number;

          if (layoutBase.item_type === "mug") {
            pdfWidthCm = 20;
            pdfHeightCm = 9.4;
          } else {
            if (aspectRatio >= 1) {
              pdfWidthCm = 30;
              pdfHeightCm = 30 / aspectRatio;
            } else {
              pdfHeightCm = 30;
              pdfWidthCm = 30 * aspectRatio;
            }
          }

          const orientation =
            pdfWidthCm > pdfHeightCm ? "landscape" : "portrait";
          const pdf = new jsPDF({
            orientation,
            unit: "cm",
            format: [pdfWidthCm, pdfHeightCm],
          });

          pdf.addImage(highQualityUrl, "PNG", 0, 0, pdfWidthCm, pdfHeightCm);

          pdfUrl = pdf.output("dataurlstring");
        } catch (pdfErr) {
          console.error("Erro ao gerar PDF single-page:", pdfErr);
        }
      }

      (fabricRef as any).setViewportTransform(originalTransform);

      let state: string;
      if (isMultiPage) {
        const currentPageState = JSON.parse(JSON.stringify(fabricRef.toJSON()));
        currentPageState.objects = (currentPageState.objects || []).filter(
          (o: any) =>
            !o.name?.startsWith("placeholder-") &&
            !o.name?.startsWith("uploaded-img-"),
        );
        const updatedPages = multiPageRef.current.pages.map(
          (pg: any, i: number) =>
            i === multiPageRef.current.activePageIndex
              ? { ...pg, canvasState: currentPageState }
              : pg,
        );
        state = JSON.stringify({ pages: updatedPages });
      } else {
        state = JSON.stringify(fabricRef.toJSON());
      }

      const images: LayoutImage[] = Object.entries(localImages).map(
        ([frameId, url]) => ({
          id: frameId,
          url: url,
          preview_url: url,
        }),
      );

      onComplete(
        images as unknown as ImageData[],
        previewUrl,
        state,
        highQualityUrl,
        pdfUrl,
      );
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      toast.error("Erro ao salvar");
    } finally {
      setIsProcessingImage(false);
    }
  }, [
    fabricRef,
    localImages,
    onComplete,
    processCanvasObjects,
    isProcessingImage,
  ]);

  const isMultiPage = multiPageRef.current.pages.length > 0;
  const displayFrames = allFrames;
  const hasTexts = Object.keys(editableTexts).length > 0;
  const hasFrames = displayFrames.length > 0;

  return (
    <div className="flex min-h-0 w-full flex-col gap-3 p-3">
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
        {isMultiPage && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {multiPageRef.current.pages.map((pg: any, idx: number) => (
              <button
                key={pg.id || idx}
                data-vaul-no-drag
                onPointerDown={(e) => e.stopPropagation()}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (
                    !fabricRef ||
                    idx === multiPageRef.current.activePageIndex
                  )
                    return;
                  try {
                    // Save current page state WITHOUT dynamic objects (placeholders/uploaded)
                    const rawState = JSON.parse(
                      JSON.stringify(fabricRef.toJSON()),
                    );
                    rawState.objects = (rawState.objects || []).filter(
                      (o: any) =>
                        !o.name?.startsWith("placeholder-") &&
                        !o.name?.startsWith("uploaded-img-"),
                    );
                    const updatedPages = multiPageRef.current.pages.map(
                      (p: any, i: number) =>
                        i === multiPageRef.current.activePageIndex
                          ? { ...p, canvasState: rawState }
                          : p,
                    );
                    multiPageRef.current.pages = updatedPages;
                    multiPageRef.current.activePageIndex = idx;
                    // Processar URLs antes de carregar e filtrar objetos dinâmicos
                    const pageState = JSON.parse(
                      JSON.stringify(updatedPages[idx].canvasState),
                    );
                    if (pageState.objects) {
                      pageState.objects = pageState.objects
                        .filter(
                          (obj: any) =>
                            !obj.name?.startsWith("placeholder-") &&
                            !obj.name?.startsWith("uploaded-img-"),
                        )
                        .map((obj: any) => {
                          if (
                            (obj.type === "Image" || obj.type === "image") &&
                            obj.src
                          ) {
                            obj.src = toBackendAssetUrl(obj.src);
                          }
                          return obj;
                        });
                    }
                    await fabricRef.loadFromJSON(pageState);
                    // Atualizar dimensões se a página tem tamanho diferente
                    const pgWidth = pageState.width || layoutBase.width || 378;
                    const pgHeight =
                      pageState.height || layoutBase.height || 567;
                    fabricRef.setDimensions(
                      {
                        width: pgWidth * INTERNAL_DPI_MULTIPLIER,
                        height: pgHeight * INTERNAL_DPI_MULTIPLIER,
                      },
                      { backstoreOnly: true },
                    );
                    fabricRef.setDimensions(
                      {
                        width: `${pgWidth * workspaceZoom}px`,
                        height: `${pgHeight * workspaceZoom}px`,
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
                    // Restaurar propriedades custom que loadFromJSON não preserva
                    const pageObjects =
                      updatedPages[idx].canvasState?.objects || [];
                    const objMap = new Map(
                      pageObjects.map((o: any) => [o.id, o]),
                    );
                    fabricRef.getObjects().forEach((obj: any) => {
                      const srcObj = objMap.get(obj.id);
                      if (srcObj?.isFrame) obj.isFrame = true;
                      if (srcObj?.isCustomizable) obj.isCustomizable = true;
                    });
                    const { texts, labels } = await processCanvasObjects(
                      fabricRef,
                      idx,
                    );
                    setEditableTexts(texts);
                    setFieldLabels(labels);
                    fabricRef.calcOffset();
                    fabricRef.requestRenderAll();
                  } catch (err) {
                    console.error("[PageSwitch] ERRO:", err);
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
                  idx === multiPageRef.current.activePageIndex
                    ? "bg-rose-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {pg.name || `Página ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
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

              <div
                className="grid grid-cols-3 gap-2 lg:grid-cols-4"
                key={`grid-${renderKey}`}
                data-frame-grid
              >
                {displayFrames.map((frame: any, index: number) => {
                  const id = frame._frameId || frame.id || frame.name;
                  const rawId = frame._rawFrameId || frame.id || frame.name;
                  const displayLabel =
                    frame.label || fieldLabels[rawId] || `${index + 1}`;
                  const domId = id;
                  let imageUrl = localImages[id];
                  if (imageUrl) imageUrl = toBackendAssetUrl(imageUrl);
                  const hasImage = !!imageUrl;

                  return (
                    <div
                      key={`${domId}-${index}`}
                      className="flex flex-col gap-1"
                    >
                      <p className="truncate text-center text-[10px] font-medium text-gray-500">
                        {displayLabel}
                      </p>

                      <div
                        className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all
                          ${
                            hasImage
                              ? "border-rose-400 hover:border-rose-500"
                              : "border-dashed border-gray-300 bg-gray-50 hover:border-rose-300"
                          }`}
                        onClick={() =>
                          document.getElementById(`upload-${domId}`)?.click()
                        }
                      >
                        {hasImage ? (
                          <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={displayLabel}
                            className="absolute inset-0 w-full h-full object-cover z-10"
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
                          id={`upload-${domId}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageUpload(
                              e,
                              rawId,
                              frame.width * (frame.scaleX || 1),
                              frame.height * (frame.scaleY || 1),
                              frame.pageIndex,
                            )
                          }
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
            className="flex h-9 w-full gap-1.5 rounded-lg bg-rose-600 text-sm font-semibold hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleComplete}
            disabled={
              isProcessingImage ||
              !validationResult ||
              !validationResult.valid ||
              Object.values(frameUploadStatus).some((s) => s === "uploading") ||
              Object.values(frameUploadStatus).some((s) => s === "error")
            }
          >
            {isProcessingImage ||
            Object.values(frameUploadStatus).some((s) => s === "uploading") ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : Object.values(frameUploadStatus).some((s) => s === "error") ? (
              <>Erro no upload</>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Salvar
              </>
            )}
          </Button>

          {validationResult && validationResult.totalFrames > 0 && (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px]">
              <span className="text-gray-500">
                {validationResult.filledFrames} de{" "}
                {validationResult.totalFrames} fotos
              </span>
              <span
                className={
                  validationResult.valid
                    ? "font-medium text-green-600"
                    : "font-medium text-amber-600"
                }
              >
                {validationResult.valid
                  ? "Completo"
                  : `${validationResult.totalFrames - validationResult.filledFrames} faltando`}
              </span>
            </div>
          )}
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
            setCurrentFramePageIndex(null);
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
