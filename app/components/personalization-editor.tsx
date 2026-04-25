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
import { Alert, AlertDescription } from "../components/ui/alert";
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
  const { loading, error, fileToImageData, generatePreview } =
    usePersonalization();

  const [uploadedImages, setUploadedImages] = useState<
    Map<string, ImageData & { previewUrl?: string }>
  >(new Map());
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const hasActiveUploads = Object.values(uploadProgress).some(
    (progress) => progress > 0 && progress < 100,
  );

  useEffect(() => {
    if (error) {
      setFeedbackMessage(error);
    }
  }, [error]);

  const handleFileUpload = async (slotId: string, file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) {
        setFeedbackMessage("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setFeedbackMessage("Apenas imagens são permitidas");
        return;
      }

      setFeedbackMessage(null);
      setUploadProgress((prev) => ({ ...prev, [slotId]: 20 }));
      const imageData = await fileToImageData(file, slotId);
      setUploadProgress((prev) => ({ ...prev, [slotId]: 70 }));
      const previewUrl = URL.createObjectURL(file);
      setUploadedImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(slotId, { ...imageData, previewUrl });
        return newMap;
      });
      setUploadProgress((prev) => ({ ...prev, [slotId]: 100 }));
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[slotId];
          return next;
        });
      }, 400);

      await handleGeneratePreview();
    } catch (err) {
      console.error("Erro no upload:", err);
      setFeedbackMessage("Não foi possível processar a imagem.");
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
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

      await handleGeneratePreview();
    } catch (err) {
      console.error("Erro ao remover:", err);
      setFeedbackMessage("Não foi possível remover a imagem.");
    }
  };

  const handleGeneratePreview = async () => {
    if (uploadedImages.size === 0) {
      setPreviewUrl("");
      return;
    }

    try {
      setGeneratingPreview(true);
      const images = Array.from(uploadedImages.values()).map((img) => ({
        slotId: img.slotId,
        imageBuffer: img.imageBuffer,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        originalName: img.originalName,
      }));
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
      setFeedbackMessage("Adicione pelo menos uma imagem");
      return;
    }

    setFeedbackMessage(null);
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
            <img
              src={
                (imageData as ImageData & { previewUrl?: string }).previewUrl ||
                ""
              }
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
        {uploadProgress[slot.id] ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Enviando imagem...</p>
            <div className="h-1.5 w-full rounded bg-gray-200">
              <div
                className="h-1.5 rounded bg-purple-600 transition-all"
                style={{ width: `${uploadProgress[slot.id]}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <Card>
        <CardHeader>
          <CardTitle>Personalize seu item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{feedbackMessage}</AlertDescription>
            </Alert>
          ) : null}
          {layoutBase.slots.map((slot) => renderSlot(slot))}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleGeneratePreview}
              disabled={
                loading ||
                generatingPreview ||
                uploadedImages.size === 0 ||
                hasActiveUploads
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
