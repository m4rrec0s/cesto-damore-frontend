"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud, Trash2, RotateCcw } from "lucide-react";

import {
  Model3DViewer,
  type ModelTextureConfig,
} from "@/app/produto/[id]/components/Model3DViewer";
import { ColorPicker } from "@/app/components/ui/color-picker";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";

const PRINT_AREA = {
  width: 3,
  height: 0.95,
  frontZ: 0.92,
  backZ: -0.92,
  baseY: 0.35,
};

const CYLINDER_RADIUS = 0.46;
const CYLINDER_SEGMENTS = 200;
const CYLINDER_HANDLE_GAP = Math.PI / 8;
const CYLINDER_START_OFFSET = 1.4;
const TWO_PI = Math.PI * 2;
const MAX_THETA_LENGTH = Math.PI * 1.95;
const FULL_WRAP_MAX_THETA = TWO_PI - CYLINDER_HANDLE_GAP * 2;

export default function Customizacao3DTestePage() {
  const [mugColor, setMugColor] = useState("#ffffff");
  const [message, setMessage] = useState("Cesto d'Amore");
  const [customizationMode, setCustomizationMode] = useState<"text" | "image">(
    "text"
  );
  const [uppercase, setUppercase] = useState(false);
  const [textColor, setTextColor] = useState("#1f2937");
  const [textScale, setTextScale] = useState(1);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [mirrorBack, setMirrorBack] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const textures = useMemo<ModelTextureConfig[]>(() => {
    const configs: ModelTextureConfig[] = [];
    const yPosition = PRINT_AREA.baseY + verticalOffset;
    const baseImageDimensions = {
      width: PRINT_AREA.width,
      height: PRINT_AREA.height,
    };

    if (customizationMode === "image" && imagePreview) {
      const thetaLengthRaw = baseImageDimensions.width / CYLINDER_RADIUS;
      const isFullWrap = thetaLengthRaw >= FULL_WRAP_MAX_THETA;
      const thetaLength = Math.min(
        thetaLengthRaw,
        isFullWrap ? FULL_WRAP_MAX_THETA : MAX_THETA_LENGTH
      );
      const sharedCylinder = {
        radius: CYLINDER_RADIUS,
        height: baseImageDimensions.height,
        segments: CYLINDER_SEGMENTS,
        thetaLength,
      };

      if (isFullWrap) {
        const thetaStart = CYLINDER_HANDLE_GAP + CYLINDER_START_OFFSET;

        configs.push({
          areaId: "wrap-image",
          imageUrl: imagePreview,
          position: { x: 0, y: yPosition, z: 0 },
          dimensions: baseImageDimensions,
          mapping: "cylinder",
          cylinder: {
            ...sharedCylinder,
            thetaStart,
          },
        });
      } else {
        // Para imagens menores, centralizar na frente (π/2 = 90°, lado direito olhando de frente)
        configs.push({
          areaId: "front-image",
          imageUrl: imagePreview,
          position: { x: 0, y: yPosition, z: 0 },
          dimensions: baseImageDimensions,
          mapping: "cylinder",
          cylinder: {
            ...sharedCylinder,
            thetaStart: Math.PI / 2 - thetaLength / 2,
          },
        });

        if (mirrorBack) {
          configs.push({
            areaId: "back-image",
            imageUrl: imagePreview,
            position: { x: 0, y: yPosition, z: 0 },
            dimensions: baseImageDimensions,
            mapping: "cylinder",
            cylinder: {
              ...sharedCylinder,
              thetaStart: (3 * Math.PI) / 2 - thetaLength / 2,
            },
          });
        }
      }
    }

    if (customizationMode === "text" && message.trim().length > 0) {
      const textDimensions = {
        width: PRINT_AREA.width * textScale,
        height: PRINT_AREA.height * 0.6 * textScale,
      };
      const textStyle = {
        color: textColor,
        fontFamily: "Poppins",
        fontWeight: uppercase ? "800" : "700",
        fontSize: Math.round(66 * textScale),
        textAlign: "center" as CanvasTextAlign,
        padding: 72,
        lineHeight: 1.15,
        uppercase,
      };

      const finalText = uppercase ? message.toUpperCase() : message;

      configs.push({
        areaId: "front-text",
        text: finalText,
        position: { x: 0, y: yPosition, z: PRINT_AREA.frontZ + 0.004 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: textDimensions,
        textStyle,
      });

      if (mirrorBack) {
        configs.push({
          areaId: "back-text",
          text: finalText,
          position: { x: 0, y: yPosition, z: PRINT_AREA.backZ - 0.004 },
          rotation: { x: 0, y: Math.PI, z: 0 },
          dimensions: textDimensions,
          textStyle,
        });
      }
    }

    return configs;
  }, [
    customizationMode,
    imagePreview,
    message,
    mirrorBack,
    textColor,
    textScale,
    uppercase,
    verticalOffset,
  ]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageName(file.name);
    setCustomizationMode("image");
  };

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageName(null);
    setCustomizationMode("text");
  };

  const resetConfiguration = () => {
    setMugColor("#ffffff");
    setMessage("Cesto d'Amore");
    setUppercase(false);
    setTextColor("#1f2937");
    setTextScale(1);
    setVerticalOffset(0);
    setMirrorBack(true);
    setAutoRotate(true);
    setCustomizationMode("text");
    clearImage();
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <Badge variant="outline" className="border-rose-200 text-rose-500">
            Laboratório 3D
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Teste de Customização de Caneca 3D
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Ajuste a mensagem, cores e imagens para visualizar em tempo real
            como a caneca será apresentada. Esta página é um sandbox para
            evoluir a experiência do produto principal.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/80 p-4 shadow-xl shadow-slate-900/30">
              <Model3DViewer
                modelUrl="/3DModels/caneca.glb"
                className="h-[520px]"
                textures={textures}
                materialColor={mugColor}
                autoRotate={autoRotate}
                rotateSpeed={0.35}
              />
            </div>
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Interações</CardTitle>
                <CardDescription>
                  Escolha o modo de personalização e ajuste utilitários gerais
                  da visualização.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Modo de personalização
                  </span>
                  <div className="inline-flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        customizationMode === "text" ? "secondary" : "outline"
                      }
                      onClick={() => setCustomizationMode("text")}
                    >
                      Texto
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        customizationMode === "image" ? "secondary" : "outline"
                      }
                      onClick={() => setCustomizationMode("image")}
                    >
                      Imagem
                    </Button>
                  </div>
                  {customizationMode === "image" && !imagePreview && (
                    <span className="text-xs text-rose-500">
                      Faça upload de uma arte para visualizar na caneca.
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant={autoRotate ? "secondary" : "outline"}
                    onClick={() => setAutoRotate((prev) => !prev)}
                  >
                    {autoRotate ? "Desativar" : "Ativar"} rotação automática
                  </Button>
                  <Button variant="outline" onClick={resetConfiguration}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurar padrão
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Cor da caneca</CardTitle>
                <CardDescription>
                  Defina a cor base aplicada ao modelo 3D inteiro. Utilize o
                  seletor para experimentar variações.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ColorPicker
                  value={mugColor}
                  onChange={setMugColor}
                  label="Cor principal"
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Mensagem personalizada</CardTitle>
                <CardDescription>
                  Edite o texto exibido na área de impressão, ajuste a cor e
                  posicione a mensagem na altura desejada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {customizationMode === "text" ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="mug-message">Texto da caneca</Label>
                      <Input
                        id="mug-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Escreva uma mensagem especial"
                        maxLength={45}
                      />
                      <p className="text-xs text-slate-500">
                        Até 45 caracteres. Use quebras de linha com Shift+Enter
                        para criar layout multilinha.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cor do texto</Label>
                        <ColorPicker
                          value={textColor}
                          onChange={setTextColor}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="uppercase-toggle"
                          className="flex items-center gap-2"
                        >
                          <input
                            id="uppercase-toggle"
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                            checked={uppercase}
                            onChange={(event) =>
                              setUppercase(event.target.checked)
                            }
                            aria-label="Aplicar caixa alta ao texto"
                          />
                          Aplicar caixa alta
                        </Label>
                        <p className="text-xs text-slate-500">
                          Converter todo o texto para maiúsculas mantém
                          consistência em estampas institucionais.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="text-scale">Tamanho do texto</Label>
                      <input
                        id="text-scale"
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.05"
                        value={textScale}
                        onChange={(event) =>
                          setTextScale(Number(event.target.value))
                        }
                        className="w-full accent-rose-500"
                        aria-label="Tamanho do texto impresso"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Menor</span>
                        <span>{Math.round(textScale * 100)}%</span>
                        <span>Maior</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Ative o modo <strong>Texto</strong> para editar a mensagem
                    impressa.
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="vertical-offset">Altura do conteúdo</Label>
                  <input
                    id="vertical-offset"
                    type="range"
                    min="-0.35"
                    max="0.35"
                    step="0.01"
                    value={verticalOffset}
                    onChange={(event) =>
                      setVerticalOffset(Number(event.target.value))
                    }
                    className="w-full accent-rose-500"
                    aria-label="Ajustar altura do conteúdo na caneca"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Mais baixo</span>
                    <span>{verticalOffset.toFixed(2)}m no eixo Y</span>
                    <span>Mais alto</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                    checked={mirrorBack}
                    onChange={(event) => setMirrorBack(event.target.checked)}
                    aria-label="Repetir personalização no verso"
                  />
                  Repetir personalização também no verso da caneca
                </label>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Upload de imagem</CardTitle>
                <CardDescription>
                  Faça upload de uma arte para aplicar sobre a área de
                  impressão. Utilize PNG com fundo transparente quando possível.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button asChild>
                    <label
                      htmlFor="image-upload"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Selecionar imagem
                    </label>
                  </Button>
                  {imageName && (
                    <span
                      className="truncate text-sm text-slate-600"
                      title={imageName}
                    >
                      {imageName}
                    </span>
                  )}
                  {imagePreview && (
                    <Button variant="ghost" size="sm" onClick={clearImage}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>

                {imagePreview && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Pré-visualização 2D
                    </p>
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Pré-visualização da estampa"
                        className="h-48 w-full object-contain bg-slate-50"
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Recomendações: 1200x700 px, 300 dpi, formato PNG ou JPG.
                  Ajustaremos a textura automaticamente na área de impressão.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
