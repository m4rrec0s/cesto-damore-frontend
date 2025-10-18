import { useState, useCallback } from "react";
import type {
  LayoutBase,
  CreateLayoutBaseInput,
} from "../types/personalization";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * Hook para gerenciar APIs de Layout Base
 * Separação de lógica de API com autenticação via token
 */
export function useLayoutApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obter token de autenticação do localStorage
   * Busca por 'token' ou 'appToken' (retrocompatibilidade)
   */
  const getAuthHeaders = useCallback(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("appToken");

    if (!token) {
      throw new Error("Usuário não autenticado. Faça login novamente.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  /**
   * Obter headers para FormData (sem Content-Type)
   */
  const getAuthHeadersForFormData = useCallback(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("appToken");

    if (!token) {
      throw new Error("Usuário não autenticado. Faça login novamente.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  /**
   * Buscar todos os layouts base
   */
  const fetchLayouts = useCallback(async (): Promise<LayoutBase[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/layouts`, {
        headers: {
          ...getAuthHeaders(),
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar layouts");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar layouts";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Buscar layout por ID
   */
  const fetchLayoutById = useCallback(
    async (id: string): Promise<LayoutBase> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/admin/layouts/${id}`, {
          headers: {
            ...getAuthHeaders(),
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao buscar layout");
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao buscar layout";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Criar novo layout base
   */
  const createLayout = useCallback(
    async (
      layoutData: CreateLayoutBaseInput,
      imageFile: File
    ): Promise<LayoutBase> => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("name", layoutData.name);
        formData.append("item_type", layoutData.item_type);
        formData.append("width", layoutData.width.toString());
        formData.append("height", layoutData.height.toString());
        formData.append("slots", JSON.stringify(layoutData.slots));
        formData.append("image", imageFile);

        const response = await fetch(`${API_URL}/admin/layouts`, {
          method: "POST",
          headers: {
            ...getAuthHeadersForFormData(),
          },
          body: formData,
        });

        if (!response.ok) {
          // Tratar erros específicos
          if (response.status === 401) {
            throw new Error("Sessão expirada. Faça login novamente.");
          }
          if (response.status === 403) {
            throw new Error("Você não tem permissão para realizar esta ação.");
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || errorData.message || "Erro ao criar layout"
          );
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar layout";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeadersForFormData]
  );

  /**
   * Atualizar layout existente
   */
  const updateLayout = useCallback(
    async (
      id: string,
      layoutData: Partial<CreateLayoutBaseInput>,
      imageFile?: File
    ): Promise<LayoutBase> => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();

        if (layoutData.name) formData.append("name", layoutData.name);
        if (layoutData.item_type)
          formData.append("item_type", layoutData.item_type);
        if (layoutData.width)
          formData.append("width", layoutData.width.toString());
        if (layoutData.height)
          formData.append("height", layoutData.height.toString());
        if (layoutData.slots)
          formData.append("slots", JSON.stringify(layoutData.slots));
        if (imageFile) formData.append("image", imageFile);

        const response = await fetch(`${API_URL}/admin/layouts/${id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeadersForFormData(),
          },
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessão expirada. Faça login novamente.");
          }
          if (response.status === 403) {
            throw new Error("Você não tem permissão para realizar esta ação.");
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || errorData.message || "Erro ao atualizar layout"
          );
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar layout";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeadersForFormData]
  );

  /**
   * Deletar layout
   */
  const deleteLayout = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/admin/layouts/${id}`, {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessão expirada. Faça login novamente.");
          }
          if (response.status === 403) {
            throw new Error("Você não tem permissão para realizar esta ação.");
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || errorData.message || "Erro ao deletar layout"
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao deletar layout";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Upload de imagem isolado (caso necessário)
   */
  const uploadImage = useCallback(
    async (file: File): Promise<{ url: string }> => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/uploads`, {
          method: "POST",
          headers: {
            ...getAuthHeadersForFormData(),
          },
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessão expirada. Faça login novamente.");
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || errorData.message || "Erro ao fazer upload"
          );
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao fazer upload";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeadersForFormData]
  );

  return {
    loading,
    error,
    fetchLayouts,
    fetchLayoutById,
    createLayout,
    updateLayout,
    deleteLayout,
    uploadImage,
  };
}
