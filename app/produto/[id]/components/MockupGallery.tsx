"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicAssetUrl } from "@/lib/image-helper";
import { cn } from "@/app/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export interface MockupVertex {
  x: number;
  y: number;
}

export interface MockupRule {
  id: number;
  src: string;
  name: string;
  vertices: [MockupVertex, MockupVertex, MockupVertex, MockupVertex];
}

interface MockupGalleryProps {
  designUrl: string;
  itemType?: string;
  className?: string;
  mockupRules?: MockupRule[];
  previewAspect?: number;
}

type Point = { x: number; y: number };
type FabricCanvasLike = {
  clear: () => void;
  setDimensions: (dimensions: { width: number; height: number }) => void;
  add: (obj: unknown) => void;
  renderAll: () => void;
  dispose: () => void;
};

const buildRectVertices = (
  leftPct: number,
  topPct: number,
  widthPct: number,
  heightPct: number,
  rotateDeg = 0,
): [MockupVertex, MockupVertex, MockupVertex, MockupVertex] => {
  const cx = leftPct / 100;
  const cy = topPct / 100;
  const w = widthPct / 100;
  const h = heightPct / 100;
  const hw = w / 2;
  const hh = h / 2;
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotate = (x: number, y: number): MockupVertex => ({
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos,
  });

  return [
    rotate(-hw, -hh),
    rotate(hw, -hh),
    rotate(hw, hh),
    rotate(-hw, hh),
  ];
};

const FRAME_MOCKUPS: MockupRule[] = [
  {
    id: 1,
    src: getPublicAssetUrl("mockups/frame/mockup1.jpg"),
    name: "Ambiente 1",
    vertices: buildRectVertices(50, 50, 100, 79, 0),
  },
  {
    id: 2,
    src: getPublicAssetUrl("mockups/frame/mockup2.jpg"),
    name: "Ambiente 2",
    vertices: buildRectVertices(49.5, 48, 31, 80, 0),
  },
  {
    id: 3,
    src: getPublicAssetUrl("mockups/frame/mockup3.jpg"),
    name: "Ambiente 3",
    vertices: buildRectVertices(53, 50, 44, 100, 0),
  },
  {
    id: 4,
    src: getPublicAssetUrl("mockups/frame/mockup4.jpg"),
    name: "Ambiente 4",
    vertices: buildRectVertices(52, 45, 38, 52, 3),
  },
  {
    id: 5,
    src: getPublicAssetUrl("mockups/frame/mockup5.jpg"),
    name: "Ambiente 5",
    vertices: buildRectVertices(51, 47.5, 60, 72, -0.5),
  },
];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Erro ao carregar imagem: ${src}`));
    image.src = src;
  });

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const drawTriangle = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  src: [Point, Point, Point],
  dst: [Point, Point, Point],
) => {
  const [s0, s1, s2] = src;
  const [d0, d1, d2] = dst;

  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-6) return;

  const a =
    (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const b =
    (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const c =
    (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const d =
    (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    denom;
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    denom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
};

const drawImageInQuad = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  quad: [Point, Point, Point, Point],
  subdivisions = 40,
) => {
  const [tl, tr, br, bl] = quad;
  const step = 1 / subdivisions;

  for (let i = 0; i < subdivisions; i += 1) {
    const t0 = i * step;
    const t1 = (i + 1) * step;

    const left0 = lerpPoint(tl, bl, t0);
    const right0 = lerpPoint(tr, br, t0);
    const left1 = lerpPoint(tl, bl, t1);
    const right1 = lerpPoint(tr, br, t1);

    const sy0 = t0 * image.height;
    const sy1 = t1 * image.height;

    drawTriangle(
      ctx,
      image,
      [
        { x: 0, y: sy0 },
        { x: image.width, y: sy0 },
        { x: image.width, y: sy1 },
      ],
      [left0, right0, right1],
    );

    drawTriangle(
      ctx,
      image,
      [
        { x: 0, y: sy0 },
        { x: image.width, y: sy1 },
        { x: 0, y: sy1 },
      ],
      [left0, right1, left1],
    );
  }
};

const renderMockupWithFabric = async (
  fabricCanvas: FabricCanvasLike,
  backgroundSrc: string,
  designSrc: string,
  vertices: [MockupVertex, MockupVertex, MockupVertex, MockupVertex],
) => {
  const [{ FabricImage }, backgroundImage, designImage] = await Promise.all([
    import("fabric"),
    loadImage(backgroundSrc),
    loadImage(designSrc),
  ]);

  const width = backgroundImage.naturalWidth || backgroundImage.width;
  const height = backgroundImage.naturalHeight || backgroundImage.height;

  fabricCanvas.clear();
  fabricCanvas.setDimensions({ width, height });

  const backgroundObject = await FabricImage.fromURL(backgroundSrc, {
    crossOrigin: "anonymous",
  });
  backgroundObject.set({
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
  });
  fabricCanvas.add(backgroundObject);

  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext("2d");
  if (!overlayCtx) {
    throw new Error("Falha ao inicializar canvas de mockup");
  }

  const quad: [Point, Point, Point, Point] = [
    { x: vertices[0].x * width, y: vertices[0].y * height },
    { x: vertices[1].x * width, y: vertices[1].y * height },
    { x: vertices[2].x * width, y: vertices[2].y * height },
    { x: vertices[3].x * width, y: vertices[3].y * height },
  ];

  drawImageInQuad(overlayCtx, designImage, quad, 48);

  const overlayUrl = overlayCanvas.toDataURL("image/png");
  const overlayObject = await FabricImage.fromURL(overlayUrl, {
    crossOrigin: "anonymous",
  });
  overlayObject.set({
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
  });
  fabricCanvas.add(overlayObject);

  fabricCanvas.renderAll();
};

export function MockupGallery({
  designUrl,
  itemType,
  className,
  mockupRules,
  previewAspect,
}: MockupGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<FabricCanvasLike | null>(null);

  const normalizedType = itemType?.toLowerCase();
  const isFrameType = normalizedType === "frame" || normalizedType === "quadro";

  const activeMockups = useMemo(() => {
    if (Array.isArray(mockupRules) && mockupRules.length > 0) {
      return mockupRules;
    }
    return FRAME_MOCKUPS;
  }, [mockupRules]);

  const safeIndex =
    activeMockups.length > 0 ? Math.min(currentIndex, activeMockups.length - 1) : 0;
  const currentMockup = activeMockups[safeIndex];

  const next = useCallback(
    () =>
      setCurrentIndex((prev) => {
        if (activeMockups.length === 0) return 0;
        return (prev + 1) % activeMockups.length;
      }),
    [activeMockups.length],
  );
  const prev = useCallback(
    () =>
      setCurrentIndex((prev) => {
        if (activeMockups.length === 0) return 0;
        return (prev - 1 + activeMockups.length) % activeMockups.length;
      }),
    [activeMockups.length],
  );

  useEffect(() => {
    if (currentIndex > safeIndex) {
      setCurrentIndex(safeIndex);
    }
  }, [currentIndex, safeIndex]);

  useEffect(() => {
    let mounted = true;

    const ensureCanvas = async () => {
      const canvasElement = canvasElementRef.current;
      if (!canvasElement) return;

      if (!fabricCanvasRef.current) {
        const { StaticCanvas } = await import("fabric");
        fabricCanvasRef.current = new StaticCanvas(canvasElement, {
          selection: false,
          renderOnAddRemove: true,
        });
      }
    };

    const render = async () => {
      if (!isFrameType || !currentMockup || !designUrl) return;

      try {
        setIsRendering(true);
        setImageError(false);
        await ensureCanvas();
        if (!mounted || !fabricCanvasRef.current) return;

        await renderMockupWithFabric(
          fabricCanvasRef.current,
          currentMockup.src,
          designUrl,
          currentMockup.vertices,
        );
      } catch (error) {
        console.error("❌ [MockupGallery] Erro ao renderizar mockup com fabric:", error);
        if (mounted) setImageError(true);
      } finally {
        if (mounted) setIsRendering(false);
      }
    };

    render();

    return () => {
      mounted = false;
    };
  }, [currentMockup, designUrl, isFrameType]);

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  if (!isFrameType) {
    return null;
  }

  if (imageError) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-gray-100", className)}>
        <div
          className="relative w-full flex items-center justify-center p-8"
          style={{ aspectRatio: previewAspect || 1 }}
        >
          <img src={designUrl} alt="Seu Design" className="max-h-full max-w-full object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative group overflow-hidden rounded-xl bg-white", className)}>
      <div
        className="relative w-full bg-gray-50"
        style={{ aspectRatio: previewAspect || 1 }}
      >
        {isRendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <Loader2 className="h-7 w-7 animate-spin text-rose-600" />
          </div>
        )}
        <canvas
          ref={canvasElementRef}
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            onClick={prev}
            className="rounded-full bg-white/90 hover:bg-white shadow-md h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={next}
            className="rounded-full bg-white/90 hover:bg-white shadow-md h-9 w-9"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {activeMockups.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ir para mockup ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === safeIndex ? "bg-white w-6" : "bg-white/50 w-1.5",
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-white border-t text-center">
        <span className="text-sm font-medium text-gray-700">{currentMockup.name}</span>
      </div>
    </div>
  );
}
