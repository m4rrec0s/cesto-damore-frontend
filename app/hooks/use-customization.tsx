import { useState, useEffect, useCallback } from "react";

export interface CustomizationType {
  id: string;
  customization_type:
    | "PHOTO_UPLOAD"
    | "ITEM_SUBSTITUTION"
    | "TEXT_INPUT"
    | "MULTIPLE_CHOICE";
  label: string;
  title?: string;
  description?: string;
  is_required: boolean;
  max_files?: number;
  max_items?: number;
  available_options?:
    | Array<{
        label: string;
        value: string;
        price_adjustment?: number;
      }>
    | {
        items: Array<{
          original_item: string;
          available_substitutes: Array<{
            item: string;
            price_adjustment: number;
          }>;
        }>;
      };
  display_order: number;
}

export interface PhotoUploadData {
  temp_file_id: string;
  original_name: string;
  position: number;
  preview_url?: string;
}

export interface CustomizationValue {
  customization_id: string;
  photos?: PhotoUploadData[];
  text?: string;
  selected_option?: string;
  selected_item?: {
    original_item: string;
    selected_item: string;
    price_adjustment: number;
  };
}

interface UploadedFile {
  id: string;
  original_name: string;
  size: number;
  mime_type: string;
  expires_at: string;
}

const SESSION_ID_KEY = "customization_session_id";
const CUSTOMIZATIONS_KEY = "customizations_data";

/**
 * Hook para gerenciar customizações de produtos/adicionais
 *
 * Funcionalidades:
 * - Gerenciar sessionId único por cliente
 * - Upload de fotos para servidor temporário
 * - Salvar customizações no localStorage
 * - Buscar regras de customização disponíveis
 * - Validar customizações obrigatórias
 */
export function useCustomization(
  itemId: string,
  itemType: "product" | "additional"
) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

  const [sessionId, setSessionId] = useState<string>("");
  const [customizations, setCustomizations] = useState<CustomizationValue[]>(
    []
  );
  const [availableCustomizations, setAvailableCustomizations] = useState<
    CustomizationType[]
  >([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Inicializar ou recuperar sessionId
   */
  useEffect(() => {
    let storedSessionId = localStorage.getItem(SESSION_ID_KEY);

    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      localStorage.setItem(SESSION_ID_KEY, storedSessionId);
    }

    setSessionId(storedSessionId);
  }, []);

  /**
   * Carregar customizações salvas do localStorage
   */
  useEffect(() => {
    const stored = localStorage.getItem(
      `${CUSTOMIZATIONS_KEY}_${itemType}_${itemId}`
    );
    if (stored) {
      try {
        setCustomizations(JSON.parse(stored));
      } catch (error) {
        console.error("Erro ao carregar customizações do localStorage:", error);
      }
    }
  }, [itemId, itemType]);

  /**
   * Salvar customizações no localStorage
   */
  const saveToLocalStorage = useCallback(
    (data: CustomizationValue[]) => {
      localStorage.setItem(
        `${CUSTOMIZATIONS_KEY}_${itemType}_${itemId}`,
        JSON.stringify(data)
      );
    },
    [itemId, itemType]
  );

  /**
   * Buscar customizações disponíveis para o item
   */
  const fetchAvailableCustomizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        itemType === "product"
          ? `/products/${itemId}/customizations`
          : `/additionals/${itemId}/customizations`;

      const response = await fetch(`${baseURL}${endpoint}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar customizações");
      }

      const data = await response.json();
      setAvailableCustomizations(data || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar customizações";
      setError(message);
      console.error("Erro ao buscar customizações:", err);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType, baseURL]);

  /**
   * Fazer upload de arquivo temporário
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      if (!sessionId) {
        setError("Session ID não disponível");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/customization/upload-temp`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao fazer upload");
        }

        const uploadedFile = await response.json();

        // Adicionar à lista de arquivos
        setUploadedFiles((prev) => [...prev, uploadedFile]);

        return uploadedFile;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erro ao fazer upload";
        setError(message);
        console.error("Erro ao fazer upload:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  /**
   * Deletar arquivo temporário
   */
  const deleteFile = useCallback(
    async (fileId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${baseURL}/customization/temp-file/${fileId}`,
          {
            method: "DELETE",
            headers: { "ngrok-skip-browser-warning": "true" },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao deletar arquivo");
        }

        // Remover da lista
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erro ao deletar arquivo";
        setError(message);
        console.error("Erro ao deletar arquivo:", err);
      } finally {
        setLoading(false);
      }
    },
    [baseURL]
  );

  /**
   * Atualizar valor de customização
   */
  const updateCustomization = useCallback(
    (customizationId: string, value: Partial<CustomizationValue>) => {
      setCustomizations((prev) => {
        const existingIndex = prev.findIndex(
          (c) => c.customization_id === customizationId
        );

        let updated: CustomizationValue[];

        if (existingIndex >= 0) {
          // Atualizar existente
          updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...value };
        } else {
          // Adicionar novo
          updated = [...prev, { customization_id: customizationId, ...value }];
        }

        saveToLocalStorage(updated);
        return updated;
      });
    },
    [saveToLocalStorage]
  );

  /**
   * Remover customização
   */
  const removeCustomization = useCallback(
    (customizationId: string) => {
      setCustomizations((prev) => {
        const updated = prev.filter(
          (c) => c.customization_id !== customizationId
        );
        saveToLocalStorage(updated);
        return updated;
      });
    },
    [saveToLocalStorage]
  );

  /**
   * Validar se todas as customizações obrigatórias foram preenchidas
   */
  const validateRequired = useCallback((): {
    isValid: boolean;
    missingFields: string[];
  } => {
    const missingFields: string[] = [];

    availableCustomizations.forEach((custom) => {
      if (!custom.is_required) return;

      const userValue = customizations.find(
        (c) => c.customization_id === custom.id
      );

      if (!userValue) {
        missingFields.push(custom.label);
        return;
      }

      // Validar por tipo
      switch (custom.customization_type) {
        case "PHOTO_UPLOAD":
          if (!userValue.photos || userValue.photos.length === 0) {
            missingFields.push(custom.label);
          }
          break;
        case "TEXT_INPUT":
          if (!userValue.text || userValue.text.trim() === "") {
            missingFields.push(custom.label);
          }
          break;
        case "MULTIPLE_CHOICE":
          if (!userValue.selected_option) {
            missingFields.push(custom.label);
          }
          break;
        case "ITEM_SUBSTITUTION":
          if (!userValue.selected_item) {
            missingFields.push(custom.label);
          }
          break;
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }, [availableCustomizations, customizations]);

  /**
   * Obter customização específica
   */
  const getCustomization = useCallback(
    (customizationId: string): CustomizationValue | undefined => {
      return customizations.find((c) => c.customization_id === customizationId);
    },
    [customizations]
  );

  /**
   * Limpar todas as customizações
   */
  const clearCustomizations = useCallback(() => {
    setCustomizations([]);
    localStorage.removeItem(`${CUSTOMIZATIONS_KEY}_${itemType}_${itemId}`);
  }, [itemId, itemType]);

  /**
   * Buscar arquivos da sessão
   */
  const fetchSessionFiles = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${baseURL}/customization/session/${sessionId}/files`,
        {
          headers: { "ngrok-skip-browser-warning": "true" },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar arquivos");
      }

      const data = await response.json();
      setUploadedFiles(data?.files || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar arquivos";
      setError(message);
      console.error("Erro ao buscar arquivos da sessão:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, baseURL]);

  return {
    // Estado
    sessionId,
    customizations,
    availableCustomizations,
    uploadedFiles,
    loading,
    error,

    // Métodos
    fetchAvailableCustomizations,
    uploadFile,
    deleteFile,
    updateCustomization,
    removeCustomization,
    getCustomization,
    validateRequired,
    clearCustomizations,
    fetchSessionFiles,
  };
}
