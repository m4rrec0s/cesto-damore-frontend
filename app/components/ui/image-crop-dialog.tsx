"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { ImageCrop, ImageCropContent } from "./image-crop";
import { CheckIcon, XIcon } from "lucide-react";

interface ImageCropDialogProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  aspect?: number;
  title?: string;
  description?: string;
}

export function ImageCropDialog({
  file,
  isOpen,
  onClose,
  onCropComplete,
  aspect,
  title = "Ajustar imagem",
  description = "Recorte a imagem para o tamanho ideal",
}: ImageCropDialogProps) {
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

  const handleCropComplete = (croppedImage: string) => {
    setCroppedImageUrl(croppedImage);
  };

  const handleConfirm = () => {
    if (croppedImageUrl) {
      onCropComplete(croppedImageUrl);
      onClose();
      setCroppedImageUrl(null);
    }
  };

  const handleCancel = () => {
    setCroppedImageUrl(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ImageCrop
            file={file}
            aspect={aspect}
            onCrop={handleCropComplete}
            circularCrop={false}
            locked={false}
          >
            <div className="flex flex-col items-center gap-4">
              <ImageCropContent className="max-h-[60vh] w-auto max-w-full" />
            </div>
          </ImageCrop>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <XIcon className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!croppedImageUrl}
            className="bg-rose-500 hover:bg-rose-600"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
