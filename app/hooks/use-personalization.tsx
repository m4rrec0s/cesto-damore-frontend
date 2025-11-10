import { useState, useCallback } from "react";
import type {
  LayoutBase,
  ImageData,
  CommitPersonalizationResponse,
} from "../types/personalization";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function usePersonalization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar layouts base disponíveis
   */
  const fetchLayoutBases = useCallback(
    async (itemType?: string): Promise<LayoutBase[]> => {
      try {
        setLoading(true);
        setError(null);

        const token =
          localStorage.getItem("token") || localStorage.getItem("appToken");
        const url = itemType
          ? `${API_URL}/admin/layouts?item_type=${itemType}`
          : `${API_URL}/admin/layouts`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar layouts");
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Converter arquivo para ImageData (com buffer)
   */
  const fileToImageData = useCallback(
    async (file: File, slotId: string): Promise<ImageData> => {
      try {
        // Ler arquivo como array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Obter dimensões
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          }
        );

        return {
          slotId,
          imageBuffer: uint8Array,
          mimeType: file.type,
          width: dimensions.width,
          height: dimensions.height,
          originalName: file.name,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao processar imagem";
        throw new Error(message);
      }
    },
    []
  );

  /**
   * Commit da personalização (finalizar)
   */
  const commitPersonalization = useCallback(
    async (
      orderId: string,
      itemId: string,
      layoutBaseId: string,
      images: ImageData[],
      configJson?: Record<string, unknown>
    ): Promise<CommitPersonalizationResponse> => {
      try {
        setLoading(true);
        setError(null);

        const token =
          localStorage.getItem("token") || localStorage.getItem("appToken");
        if (!token) {
          throw new Error("Usuário não autenticado");
        }

        // Converter ImageData para formato serializável
        const serializedImages = images.map((img) => ({
          slotId: img.slotId,
          imageBuffer: Array.from(img.imageBuffer as Uint8Array),
          mimeType: img.mimeType,
          width: img.width,
          height: img.height,
          originalName: img.originalName,
        }));

        const response = await fetch(
          `${API_URL}/orders/${orderId}/items/${itemId}/personalize/commit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              layoutBaseId,
              images: serializedImages,
              configJson: configJson || {},
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Erro ao finalizar personalização"
          );
        }

        const data: CommitPersonalizationResponse = await response.json();

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao finalizar";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Gera preview no backend a partir das imagens (envia buffers serializados)
   */
  const generatePreview = useCallback(
    async (
      layoutBaseId: string,
      images: Array<{
        slotId: string;
        imageBuffer: Uint8Array | Buffer;
        mimeType: string;
        width: number;
        height: number;
        originalName: string;
      }>,
      width: number = 800
    ): Promise<string> => {
      try {
        setLoading(true);
        setError(null);

        const token =
          localStorage.getItem("token") || localStorage.getItem("appToken");

        const serializedImages = images.map((img) => ({
          slotId: img.slotId,
          imageBuffer: Array.from(img.imageBuffer as Uint8Array),
          mimeType: img.mimeType,
          width: img.width,
          height: img.height,
          originalName: img.originalName,
        }));

        const response = await fetch(`${API_URL}/customizations/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            layoutBaseId,
            images: serializedImages,
            width,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao gerar preview");
        }

        const data = await response.json();
        return data.previewUrl as string;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao gerar preview";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    fetchLayoutBases,
    fileToImageData,
    commitPersonalization,
    generatePreview,
  };
}
