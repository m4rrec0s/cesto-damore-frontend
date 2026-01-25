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

// Multiplicador para renderização interna de alta qualidade
const INTERNAL_DPI_MULTIPLIER = 2;

const loadGoogleFont = (fontFamily: string) => {
  if (
    typeof document === "undefined" ||
    document.getElementById(`font-${fontFamily.replace(/\s+/g, "-")}`)
  )
    return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.id = `font-${fontFamily.replace(/\s+/g, "-")}`;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
      /\s+/g,
      "+",
    )}:wght@400;700&display=swap`;
    link.onload = () => {
      document.fonts.load(`1em "${fontFamily}"`).then(resolve).catch(resolve);
    };
    link.onerror = reject;
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
  const [workspaceZoom, setWorkspaceZoom] = useState(1);

  // Persistir imagens locais
  useEffect(() => {
    if (layoutBase.id && Object.keys(localImages).length > 0) {
      localStorage.setItem(
        `client-design-imgs-${layoutBase.id}`,
        JSON.stringify(localImages),
      );
    }
  }, [localImages, layoutBase.id]);

  // Crop states
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Calcular zoom ideal baseado no container
  useEffect(() => {
    const updateZoom = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth - 40;
      const layoutWidth = layoutBase.width || 378;
      // Garantir que o zoom não seja zero
      const calculatedZoom =
        containerWidth > 0 ? containerWidth / layoutWidth : 1;
      const newZoom = Math.max(0.2, Math.min(1, calculatedZoom));
      setWorkspaceZoom(newZoom);
    };

    updateZoom();
    window.addEventListener("resize", updateZoom);
    return () => window.removeEventListener("resize", updateZoom);
  }, [layoutBase.width]);

  // Sincronizar zoom do canvas
  useEffect(() => {
    if (fabricRef) {
      const width = layoutBase.width || 378;
      const height = layoutBase.height || 567;

      // 1. Ajustar a resolução interna (Backstore) - Constante para nitidez
      fabricRef.setDimensions(
        {
          width: width * INTERNAL_DPI_MULTIPLIER,
          height: height * INTERNAL_DPI_MULTIPLIER,
        },
        { backstoreOnly: true },
      );

      // 2. Ajustar o tamanho visual (CSS) - O zoom é via CSS
      fabricRef.setDimensions(
        {
          width: `${width * workspaceZoom}px`,
          height: `${height * workspaceZoom}px`,
        },
        { cssOnly: true },
      );

      // 3. Zoom interno fixo para nitidez (Resetando transform para evitar desalinhamento)
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

  // Funções Auxiliares de Placeholders
  const addFramePlaceholder = async (canvas: any, frame: any) => {
    const { Text } = await import("fabric");

    // Fundo cinza suave
    frame.set("fill", "#f3f4f6");

    const center = frame.getCenterPoint();
    const frameSize = Math.min(
      frame.width * frame.scaleX,
      frame.height * frame.scaleY,
    );

    const icon = new Text("📷", {
      fontSize: frameSize * 0.3,
      left: center.x,
      top: center.y - 10,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
      name: `placeholder-icon-${frame.id || frame.name}`,
    });

    const label = new Text("Clique para adicionar foto", {
      fontSize: frameSize * 0.08,
      left: center.x,
      top: center.y + 20,
      originX: "center",
      originY: "center",
      fill: "#9ca3af",
      selectable: false,
      evented: false,
      name: `placeholder-text-${frame.id || frame.name}`,
    });

    canvas.add(icon, label);
    canvas.renderAll();
  };

  const loadLocalImageToFrame = async (
    canvas: any,
    frame: any,
    url: string,
  ) => {
    const { FabricImage, Rect, Circle } = await import("fabric");

    // Remover placeholders se existirem
    const frameId = frame.id || frame.name;
    const placeholders = canvas
      .getObjects()
      .filter(
        (o: any) =>
          o.name === `placeholder-icon-${frameId}` ||
          o.name === `placeholder-text-${frameId}`,
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

      // Ajustar frame para transparente
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
        selectable: true,
        hasControls: true,
        name: `uploaded-img-${frameId}`,
        objectCaching: false,
      });

      // Clip Path
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
          absolutePositioned: true,
        });
      }

      img.set("clipPath", mask);

      // Remover imagem anterior se existir
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

  // Initialize Fabric Canvas
  useEffect(() => {
    let canvasInstance: FabricCanvas | null = null;
    let isMounted = true;

    const initFabric = async () => {
      try {
        const { Canvas, FabricObject } = await import("fabric");

        if (!containerRef.current || !isMounted) return;

        // Configurações globais - CLIENTE NÃO EDITA NO CANVAS DIRETAMENTE
        FabricObject.ownDefaults.objectCaching = false;
        FabricObject.ownDefaults.minScaleLimit = 0.05;
        FabricObject.ownDefaults.selectable = false;
        FabricObject.ownDefaults.evented = false;

        // Limpar container
        containerRef.current.innerHTML = "";
        const canvasEl = document.createElement("canvas");
        containerRef.current.appendChild(canvasEl);

        const width = layoutBase.width || 378;
        const height = layoutBase.height || 567;

        canvasInstance = new Canvas(canvasEl, {
          backgroundColor: "#ffffff",
          selection: false,
          interactive: false, // BLOQUEIA INTERAÇÃO DIRETA
          preserveObjectStacking: true,
        });

        // Configurar dimensões internas (backstore) - Atributos 'width' e 'height'
        canvasInstance.setDimensions(
          {
            width: width * INTERNAL_DPI_MULTIPLIER,
            height: height * INTERNAL_DPI_MULTIPLIER,
          },
          { backstoreOnly: true },
        );

        // Configurar dimensões visuais (CSS) - Isso sincroniza o container e ambos os canvas
        canvasInstance.setDimensions(
          {
            width: `${width * workspaceZoom}px`,
            height: `${height * workspaceZoom}px`,
          },
          { cssOnly: true },
        );

        if (!canvasInstance.contextTop && !canvasInstance.contextContainer) {
          // Fallback se algo deu errado na inicialização
          canvasInstance.setDimensions({
            width: width * INTERNAL_DPI_MULTIPLIER,
            height: height * INTERNAL_DPI_MULTIPLIER,
          });
        }

        // Load State - Suportar tanto camelCase quando snake_case do backend
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

            // 1. ANTES DE CARREGAR: Encontrar e carregar fontes específicas do layout
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
              }

              // 2. Normalizar e Preparar Objetos
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
                  selectable: false, // Cliente não seleciona
                  evented: false, // Cliente não interage
                };
              });
            }

            console.log(
              "🎨 Carregando estado no editor:",
              state.objects?.length,
              "objetos",
            );

            await canvasInstance.loadFromJSON(state);
          } catch (jsonErr) {
            console.error(
              "Erro ao carregar estado parcial do canvas:",
              jsonErr,
            );
          }
        }

        // Garantir o zoom interno fixo (DPI) APÓS o carregamento do JSON
        canvasInstance.setViewportTransform([
          INTERNAL_DPI_MULTIPLIER,
          0,
          0,
          INTERNAL_DPI_MULTIPLIER,
          0,
          0,
        ]);

        if (!isMounted) {
          canvasInstance.dispose();
          return;
        }

        // Configurar objetos
        const objects = canvasInstance.getObjects();
        const texts: Record<string, string> = {};
        const labels: Record<string, string> = {};

        for (const obj of objects as any[]) {
          // Bloquear tudo novamente para garantir
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

          // Identificar frames de fotos
          const isFrame =
            obj.isFrame === true ||
            obj.name === "photo-frame" ||
            obj.name === "image-frame" ||
            (obj.name && obj.name.includes("frame")) ||
            (obj.customData && obj.customData.isFrame === true);

          if (isFrame) {
            obj.isFrame = true;
            const id = obj.id || obj.name;
            labels[id] = obj.label || "Moldura de Foto";

            // Se não tem imagem (nem no canvas nem local), add placeholder
            const hasImg = objects.some(
              (o: any) => o.name === `uploaded-img-${id}`,
            );

            if (!hasImg && !localImages[id]) {
              await addFramePlaceholder(canvasInstance, obj);
            } else if (localImages[id]) {
              // Recarregar imagem local se existir
              await loadLocalImageToFrame(canvasInstance, obj, localImages[id]);
            }
          } else if (obj.isCustomizable) {
            if (obj.type === "textbox" || obj.type === "i-text") {
              const id = obj.id || obj.name;
              texts[id] = obj.text || "";
              labels[id] = obj.label || id;
            }
          }
        }

        if (isMounted) {
          setEditableTexts(texts);
          setFieldLabels(labels);
          canvasInstance.renderAll();
          setFabricRef(canvasInstance);
          setLoading(false);
          console.log("✅ Fabric.js inicializado com sucesso");
        }
      } catch (err) {
        console.error("❌ Erro ao inicializar Fabric.js:", err);
        if (isMounted) {
          setLoading(false); // Liberar a tela mesmo com erro parcial
          toast.error("Erro ao carregar editor");
        }
      }
    };

    initFabric();

    return () => {
      isMounted = false;
      if (canvasInstance) canvasInstance.dispose();
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
    if (file) {
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
      // 1. Converter DataURL para Blob para upload
      const res = await fetch(croppedImageUrl);
      const blob = await res.blob();
      const file = new File([blob], `crop_${currentFrameId}.png`, {
        type: "image/png",
      });

      // 2. Upload para o Servidor (Logic de Imagem Temporária)
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

      // Garantir que a URL seja absoluta
      if (finalUrl.startsWith("/")) {
        finalUrl = `${API_URL.replace(/\/api$/, "")}${finalUrl}`;
      }

      // 3. Atualizar Estado Local
      setLocalImages((prev) => ({ ...prev, [currentFrameId]: finalUrl }));

      // 4. Carregar no Canvas
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
      // Garantir captura total do canvas resetando viewport
      const originalTransform = [...(fabricRef as any).viewportTransform];
      (fabricRef as any).setViewportTransform([
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
        INTERNAL_DPI_MULTIPLIER,
        0,
        0,
      ]);

      // High Quality Export (3x base)
      const highQualityUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 3 / INTERNAL_DPI_MULTIPLIER,
        enableRetinaScaling: false,
      });

      // Preview for Cart (0.8x base)
      const previewUrl = fabricRef.toDataURL({
        format: "png",
        multiplier: 0.8 / INTERNAL_DPI_MULTIPLIER,
        enableRetinaScaling: false,
      });

      // Restaurar viewport para o usuário
      (fabricRef as any).setViewportTransform(originalTransform);

      // State with IDs
      const state = JSON.stringify(fabricRef.toJSON());

      // Mapear imagens para o formato esperado
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
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-purple-100 shadow-sm">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 hover:bg-purple-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Alterar Layout
        </Button>
        <div className="text-right">
          <h3 className="font-bold text-gray-900">{layoutBase.name}</h3>
          <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">
            Edição em Tempo Real
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lado Esquerdo: Preview Fixo */}
        <div className="lg:col-span-2 lg:sticky lg:top-4 bg-neutral-100 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[550px] relative shadow-inner">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-2xl">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-gray-600">
                Inicializando Estúdio...
              </p>
            </div>
          )}

          <div
            ref={containerRef}
            className="shadow-2xl bg-white border-8 border-white rounded-sm pointer-events-none"
          />

          <div className="mt-4 flex gap-4 text-xs text-gray-400 font-medium uppercase tracking-widest">
            <Sparkles className="h-3 w-3" /> Visualização em Tempo Real
          </div>
        </div>

        {/* Lado Direito: Menu com Scroll */}
        <div className="lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-8">
          <Card className="border-2 border-purple-50 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 border-b pb-4 mb-4">
                <Palette className="h-5 w-5 text-purple-600" />
                <h4 className="font-bold text-gray-800">
                  Suas Personalizações
                </h4>
              </div>

              {Object.keys(editableTexts).length > 0 && (
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <Type className="h-3 w-3" /> Textos Editáveis
                  </Label>
                  {Object.entries(editableTexts).map(([id, text]) => (
                    <div key={id} className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">
                        {fieldLabels[id] || id}
                      </Label>
                      <Input
                        value={text}
                        onChange={(e) => handleTextChange(id, e.target.value)}
                        className="border-gray-200 focus:border-purple-400 focus:ring-purple-100 h-11"
                        placeholder="Escreva algo especial..."
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-dashed">
                <Label className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" /> Molduras de Fotos
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {fabricRef
                    ?.getObjects()
                    .filter((o: any) => o.isFrame)
                    .map((frame: any) => {
                      const id = frame.id || frame.name;
                      const label = fieldLabels[id] || "Sua Foto";
                      let imageUrl = localImages[id];

                      // Normalizar URL para exibição no preview da sidebar
                      if (imageUrl && imageUrl.startsWith("/")) {
                        const apiBase = (
                          process.env.NEXT_PUBLIC_API_URL || ""
                        ).replace(/\/api$/, "");
                        imageUrl = `${apiBase}${imageUrl}`;
                      }

                      const hasImage = !!imageUrl;
                      return (
                        <div key={id} className="space-y-2">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase truncate block text-center">
                            {label}
                          </Label>
                          <div
                            className={`relative aspect-square rounded-xl flex items-center justify-center border-2 border-dashed transition-all cursor-pointer ${
                              hasImage
                                ? "border-purple-500 bg-purple-50"
                                : "border-gray-200 bg-gray-50 hover:border-purple-300"
                            }`}
                            onClick={() =>
                              document.getElementById(`upload-${id}`)?.click()
                            }
                          >
                            {hasImage ? (
                              <Image
                                src={imageUrl}
                                className="w-full h-full object-cover rounded-lg"
                                alt="Upload"
                                width={100}
                                height={100}
                                unoptimized
                              />
                            ) : (
                              <Upload className="h-6 w-6 text-gray-400" />
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-100">
                              {hasImage ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Upload className="h-3 w-3 text-purple-600" />
                              )}
                            </div>
                            <input
                              id={`upload-${id}`}
                              title={`Upload imagem para ${id}`}
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
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl gap-2 rounded-2xl transition-all active:scale-95"
            onClick={handleComplete}
            disabled={isProcessingImage}
          >
            {isProcessingImage ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check className="h-6 w-6" />
            )}
            Concluir e Salvar
          </Button>

          <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Garantia de Qualidade Cesto dAmore
          </p>
        </div>
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
          title="Ajuste sua Foto"
          description="Posicione a foto para que ela preencha perfeitamente a moldura"
        />
      )}
    </div>
  );
}
