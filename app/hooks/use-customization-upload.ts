"use client";

import { useState, useCallback } from "react";
import { useApi } from "./use-api";

interface UploadedImage {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

interface UseCustomizationUploadReturn {
  isLoading: boolean;
  error: string | null;
  uploadedImages: UploadedImage[];
  uploadImage: (file: File) => Promise<UploadedImage | null>;
  deleteImage: (filename: string) => Promise<boolean>;
  deleteAllImages: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook para gerenciar upload de imagens temporárias (durante customização)
 *
 * Novo fluxo pós-migração para temp files:
 * 1. Upload de imagem -> /temp/upload (salva em /storage/temp)
 * 2. Retorna URL temporária que será usada durante a customização
 * 3. Ao finalizar pedido (webhook), backend busca arquivo do temp
 * 4. Faz upload final para Google Drive
 * 5. Deleta arquivo temporário
 */
export function useCustomizationUpload(): UseCustomizationUploadReturn {
  const api = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const uploadImage = useCallback(
    async (file: File): Promise<UploadedImage | null> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!file.type.startsWith("image/")) {
          throw new Error("Por favor, selecione uma imagem válida");
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error("Arquivo muito grande (máximo 10MB)");
        }

        const result = await api.uploadTempImage(file);

        if (!result.success || !result.url) {
          throw new Error("Falha ao fazer upload da imagem");
        }

        const uploadedImage: UploadedImage = {
          filename: result.filename,
          url: result.url,
          size: result.size,
          mimeType: result.mimeType,
          originalName: result.originalName,
        };

        setUploadedImages((prev) => [...prev, uploadedImage]);

        return uploadedImage;
      } catch (err: unknown) {
        const errorMsg =
          (err as Error).message || "Erro ao fazer upload da imagem";
        console.error(`❌ Erro no upload:`, err);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const deleteImage = useCallback(
    async (filename: string): Promise<boolean> => {
      try {
        await api.deleteTempFile(filename);

        setUploadedImages((prev) =>
          prev.filter((img) => img.filename !== filename)
        );

        return true;
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || "Erro ao deletar imagem";
        console.error(`❌ Erro ao deletar:`, err);
        setError(errorMsg);
        return false;
      }
    },
    [api]
  );

  const deleteAllImages = useCallback(async (): Promise<boolean> => {
    try {
      let failed = 0;

      for (const image of uploadedImages) {
        const deleted = await deleteImage(image.filename);
        if (!deleted) {
          failed++;
        }
      }

      if (failed === 0) {
        return true;
      } else {
        console.warn(`⚠️ ${failed} imagem(ns) não puderam ser deletadas`);
        return false;
      }
    } catch (err: unknown) {
      console.error(`❌ Erro ao deletar todas as imagens:`, err);
      return false;
    }
  }, [uploadedImages, deleteImage]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    uploadedImages,
    uploadImage,
    deleteImage,
    deleteAllImages,
    clearError,
  };
}

export default useCustomizationUpload;
