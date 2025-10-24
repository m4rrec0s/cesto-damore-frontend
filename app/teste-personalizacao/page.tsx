"use client";

import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdvancedPersonalizationEditor from "../components/advanced-personalization-editor";
import { usePersonalization } from "../hooks/use-personalization";
import type { LayoutBase, ImageData } from "../types/personalization";
import Image from "next/image";
import { getDirectImageUrl } from "../helpers/drive-normalize";

export default function TestePersonalizacaoPage() {
  const { loading, fetchLayoutBases } = usePersonalization();
  const [layouts, setLayouts] = useState<LayoutBase[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutBase | null>(null);
  const [personalizedImages, setPersonalizedImages] = useState<ImageData[]>([]);
  const [finalPreview, setFinalPreview] = useState<string>("");

  useEffect(() => {
    loadLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLayouts = async () => {
    try {
      const data = await fetchLayoutBases();
      setLayouts(data);
      if (data.length > 0) {
        setSelectedLayout(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar layouts:", error);
      toast.error("Erro ao carregar layouts");
    }
  };

  const handleComplete = (images: ImageData[], previewUrl: string) => {
    setPersonalizedImages(images);
    setFinalPreview(previewUrl);
    toast.success("Personalização concluída!");

    console.log("Imagens personalizadas:", images);
    console.log("Preview URL:", previewUrl);
  };

  const handleReset = () => {
    setPersonalizedImages([]);
    setFinalPreview("");
    setSelectedLayout(layouts[0] || null);
  };

  if (loading && layouts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teste de Personalização</h1>
        <p className="text-muted-foreground">
          Sistema novo de personalização com layouts base e slots
        </p>
      </div>

      {layouts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Nenhum layout base encontrado. Crie um no painel administrativo.
            </p>
          </CardContent>
        </Card>
      ) : !selectedLayout ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecione um Layout</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {layouts.map((layout) => (
              <Card
                key={layout.id}
                className="cursor-pointer hover:border-primary"
                onClick={() => setSelectedLayout(layout)}
              >
                <CardContent className="p-4">
                  <Image
                    src={getDirectImageUrl(layout.image_url)}
                    alt={layout.name}
                    className="w-full h-40 object-cover rounded mb-2"
                    width={400}
                    height={160}
                  />
                  <h3 className="font-semibold">{layout.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {layout.item_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {layout.slots.length} slot(s)
                  </p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : personalizedImages.length === 0 ? (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Button variant="outline" onClick={() => setSelectedLayout(null)}>
              ← Voltar
            </Button>
            <div>
              <h2 className="font-semibold">{selectedLayout.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedLayout.item_type} - {selectedLayout.width}x
                {selectedLayout.height}px
              </p>
            </div>
          </div>

          <AdvancedPersonalizationEditor
            layoutBase={selectedLayout}
            onComplete={handleComplete}
            onCancel={() => setSelectedLayout(null)}
            showCanvasPreview={true}
          />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Personalização Finalizada!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={finalPreview}
                alt="Preview final"
                className="w-full max-w-2xl mx-auto rounded-lg border"
              />
            </div>

            <div className="bg-muted p-4 rounded">
              <h3 className="font-semibold mb-2">Dados da Personalização:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(
                  {
                    layoutId: selectedLayout.id,
                    layoutName: selectedLayout.name,
                    images: personalizedImages.map((img) => ({
                      slotId: img.slotId,
                      originalName: img.originalName,
                      dimensions: `${img.width}x${img.height}`,
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReset}>Nova Personalização</Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(personalizedImages)
                  );
                  toast.success("Dados copiados!");
                }}
              >
                Copiar JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
