"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { ImageCrop, ImageCropApply, ImageCropContent } from "./image-crop";
import { CheckIcon, XIcon } from "lucide-react";

interface ImageCropDialogProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  aspect?: number;
  showAspectControls?: boolean;
  title?: string;
  description?: string;
}

export function ImageCropDialog({
  file,
  isOpen,
  onClose,
  onCropComplete,
  aspect,
  showAspectControls = false,
  title = "Ajustar imagem",
  description = "Recorte a imagem para o tamanho ideal",
}: ImageCropDialogProps) {
  const cropResultRef = useRef<string | null>(null);

  const handleCropReady = (croppedImage: string) => {
    cropResultRef.current = croppedImage;
  };

  const handleCancel = () => {
    cropResultRef.current = null;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden p-0 sm:max-h-[90vh] sm:w-[90vw]">
        <DialogHeader>
          <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {showAspectControls && null}
          <ImageCrop
            file={file}
            aspect={aspect}
            onCrop={handleCropReady}
            circularCrop={false}
            locked={false}
          >
            <div className="flex flex-col items-center gap-4">
              <ImageCropContent className="max-h-[50dvh] w-auto max-w-full sm:max-h-[60vh]" />
            </div>

            <DialogFooter className="mt-4 border-t border-neutral-200 pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" onClick={handleCancel}>
                <XIcon className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <ImageCropApply
                onClick={() => {
                  const result = cropResultRef.current;
                  if (result) {
                    cropResultRef.current = null;
                    onCropComplete(result);
                  }
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white h-9 px-4 rounded-md text-sm font-medium inline-flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                Confirmar
              </ImageCropApply>
            </DialogFooter>
          </ImageCrop>
        </div>
      </DialogContent>
    </Dialog>
  );
}
