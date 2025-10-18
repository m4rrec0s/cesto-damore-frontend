"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Loader2, Upload, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { usePersonalization } from "../hooks/use-personalization";
import type { LayoutBase, ImageData, SlotDef } from "../types/personalization";

interface PersonalizationEditorProps {
  layoutBase: LayoutBase;
  onComplete?: (images: ImageData[], previewUrl: string) => void;
  onCancel?: () => void;
}

export default function PersonalizationEditor({
  layoutBase,
  onComplete,
  onCancel,
}: PersonalizationEditorProps) {
  const {
    loading,
    error,
    generateSessionId,
    uploadTempImage,
    deleteTempImage,
    generatePreview,
  } = usePersonalization();

  const [sessionId] = useState(() => generateSessionId());
  const [uploadedImages, setUploadedImages] = useState<Map<string, ImageData>>(
    new Map()
  );
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleFileUpload = async (slotId: string, file: File) => {
    try {
      // Validar tamanho
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens são permitidas");
        return;
      }

      const result = await uploadTempImage(file, slotId, sessionId);

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

      // Gerar preview automaticamente
      await handleGeneratePreview();
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
      toast.success("Imagem removida");

      // Atualizar preview
      await handleGeneratePreview();
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  const handleGeneratePreview = async () => {
    if (uploadedImages.size === 0) {
      setPreviewUrl("");
      return;
    }

    try {
      setGeneratingPreview(true);
      const images = Array.from(uploadedImages.values());
      const preview = await generatePreview(layoutBase.id, images, 800);
      setPreviewUrl(preview);
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleComplete = () => {
    if (uploadedImages.size === 0) {
      toast.error("Adicione pelo menos uma imagem");
      return;
    }

    const images = Array.from(uploadedImages.values());
    onComplete?.(images, previewUrl);
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

        {hasImage ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData.tempUrl}
              alt={imageData.originalName}
              className="w-full h-32 object-cover rounded"
            />
            <p className="text-sm text-muted-foreground">
              {imageData.originalName}
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded p-4 text-center">
            <Input
              type="file"
              accept="image/*"
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
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para enviar imagem
              </span>
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
          {layoutBase.slots.map((slot) => renderSlot(slot))}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleGeneratePreview}
              disabled={
                loading || generatingPreview || uploadedImages.size === 0
              }
              variant="outline"
              className="flex-1"
            >
              {generatingPreview ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Atualizar Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {generatingPreview ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : previewUrl ? (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full rounded-lg border"
              />
              <div className="flex gap-2">
                <Button onClick={handleComplete} className="flex-1">
                  Confirmar Personalização
                </Button>
                {onCancel && (
                  <Button onClick={onCancel} variant="outline">
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded">
              <p className="text-muted-foreground">
                Adicione imagens para ver o preview
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
