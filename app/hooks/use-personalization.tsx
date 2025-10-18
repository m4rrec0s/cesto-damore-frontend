import { useState, useCallback } from "react";
import type {
  LayoutBase,
  TempUploadResponse,
  ImageData,
  PreviewResponse,
  CommitPersonalizationResponse,
} from "../types/personalization";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export function usePersonalization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Limpar imagens antigas do sessionStorage (mais de 1 hora)
   * sessionStorage é limpo automaticamente ao fechar a aba
   */
  const cleanOldImages = useCallback(() => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora (sessionStorage já limpa ao fechar)

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      // Apenas limpar imagens temporárias (não o session_id)
      if (key?.startsWith("personalization_temp_")) {
        try {
          const data = JSON.parse(sessionStorage.getItem(key) || "{}");
          if (data.timestamp && now - data.timestamp > maxAge) {
            sessionStorage.removeItem(key);
            console.log(`🧹 Imagem antiga removida: ${key}`);
          }
        } catch (err) {
          console.error(`Erro ao limpar ${key}:`, err);
          // Se não conseguir fazer parse, remove a chave inválida
          sessionStorage.removeItem(key);
        }
      }
    }
  }, []);

  /**
   * Gerar sessionId único para upload temporário
   */
  const generateSessionId = useCallback((): string => {
    const stored = sessionStorage.getItem("personalization_session_id");
    if (stored) return stored;

    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("personalization_session_id", sessionId);
    return sessionId;
  }, []);

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
   * Comprimir imagem antes de salvar
   */
  const compressImage = useCallback(
    async (file: File, maxWidth: number = 1200): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas não suportado"));
              return;
            }

            // Calcular dimensões mantendo proporção
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Desenhar imagem redimensionada
            ctx.drawImage(img, 0, 0, width, height);

            // Converter para base64 com qualidade 0.85
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            resolve(compressed);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    []
  );

  /**
   * Upload de imagem temporária - Salva no sessionStorage (limpa ao fechar aba)
   */
  const uploadTempImage = useCallback(
    async (
      file: File,
      slotId: string,
      sessionId?: string
    ): Promise<TempUploadResponse> => {
      try {
        setLoading(true);
        setError(null);

        const sid = sessionId || generateSessionId();

        // Comprimir imagem para economizar espaço
        console.log(
          `📦 Comprimindo imagem: ${file.name} (${(file.size / 1024).toFixed(
            0
          )}KB)`
        );
        const base64 = await compressImage(file, 1200);
        console.log(
          `✅ Imagem comprimida: ${(base64.length / 1024).toFixed(0)}KB`
        );

        // Obter dimensões da imagem comprimida
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = base64;
          }
        );

        // Gerar ID único para a imagem
        const tempId = `temp_${sid}_${slotId}_${Date.now()}`;

        // Salvar no sessionStorage (limpa automaticamente ao fechar aba)
        const imageData = {
          tempId,
          slotId,
          originalName: file.name,
          width: dimensions.width,
          height: dimensions.height,
          base64,
          timestamp: Date.now(),
        };

        sessionStorage.setItem(
          `personalization_${tempId}`,
          JSON.stringify(imageData)
        );

        // Limpar imagens antigas (mais de 1h)
        cleanOldImages();

        // Retornar resposta compatível
        const response: TempUploadResponse = {
          tempId,
          tempUrl: base64, // URL base64 para exibição
          originalName: file.name,
          width: dimensions.width,
          height: dimensions.height,
        };

        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro no upload";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [generateSessionId, cleanOldImages, compressImage]
  );

  /**
   * Deletar imagem temporária - Remove do sessionStorage
   */
  const deleteTempImage = useCallback(async (tempId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Remover do sessionStorage
      sessionStorage.removeItem(`personalization_${tempId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao deletar";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Recuperar imagem base64 do sessionStorage
   */
  const getImageFromStorage = useCallback((tempId: string): string | null => {
    try {
      const key = `personalization_${tempId}`;
      const data = sessionStorage.getItem(key);
      if (!data) return null;

      const imageData = JSON.parse(data);
      return imageData.base64 || null;
    } catch (err) {
      console.error(`Erro ao recuperar imagem ${tempId}:`, err);
      return null;
    }
  }, []);

  /**
   * Gerar preview da composição
   */
  const generatePreview = useCallback(
    async (
      layoutBaseId: string,
      images: ImageData[],
      width?: number
    ): Promise<string> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/preview/compose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            layoutBaseId,
            images,
            width,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao gerar preview");
        }

        const data: PreviewResponse = await response.json();
        return data.previewUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro no preview";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
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
              images,
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

        // Limpar sessionId após commit bem-sucedido
        sessionStorage.removeItem("personalization_session_id");

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

  return {
    loading,
    error,
    generateSessionId,
    fetchLayoutBases,
    uploadTempImage,
    deleteTempImage,
    getImageFromStorage,
    generatePreview,
    commitPersonalization,
    cleanOldImages,
  };
}
