import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook centralizado para gerenciar customizações de um item
 * Unifica toda a lógica de CRUD, validação e comunicação com API
 */

export interface Customization {
  id: string;
  item_id: string;
  type: "DYNAMIC_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  name: string;
  description?: string;
  isRequired: boolean;
  customization_data: Record<string, unknown>;
  price: number;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicLayoutData {
  layouts: Array<{ id: string; name: string }>;
}

export interface TextCustomizationData {
  fields: Array<{
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
    max_length?: number;
  }>;
}

export interface ImageCustomizationData {
  dynamic_layout: {
    max_images: number;
    min_width?: number;
    min_height?: number;
    max_file_size_mb?: number;
    accepted_formats?: string[];
  };
}

export interface MultipleChoiceData {
  options: Array<{
    id: string;
    label: string;
    description?: string;
    price_modifier: number;
    image_url?: string;
    image_filename?: string;
  }>;
  min_selection: number;
  max_selection: number;
}

export type CustomizationData =
  | DynamicLayoutData
  | TextCustomizationData
  | ImageCustomizationData
  | MultipleChoiceData;

interface UseCustomizationManagerProps {
  itemId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useCustomizationManager({
  itemId,
}: UseCustomizationManagerProps) {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("appToken")
        : null;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    };
  }, []);

  /**
   * Buscar customizações de um item específico
   */
  const fetchCustomizations = useCallback(async () => {
    if (!itemId) {
      setCustomizations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/items/${itemId}/customizations`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar customizações");
      }

      const data = await response.json();

      const customizationsArray = Array.isArray(data)
        ? data
        : data.customizations || [];

      setCustomizations(customizationsArray);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar customizações";
      setError(message);
      console.error("Erro ao buscar customizações:", err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [itemId, getAuthHeaders]);

  /**
   * Criar nova customização
   */
  const createCustomization = useCallback(
    async (data: {
      type: Customization["type"];
      name: string;
      description?: string;
      isRequired: boolean;
      customization_data: Record<string, unknown>;
      price: number;
    }): Promise<Customization | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/customizations`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...data,
            item_id: itemId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "Erro ao criar customização",
          );
        }

        const created = await response.json();
        toast.success("Customização criada com sucesso!");

        await fetchCustomizations();

        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar customização";
        setError(message);
        console.error("Erro ao criar customização:", err);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [itemId, getAuthHeaders, fetchCustomizations],
  );

  /**
   * Atualizar customização existente
   */
  const updateCustomization = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        description?: string;
        isRequired?: boolean;
        customization_data?: Record<string, unknown>;
        price?: number;
      },
    ): Promise<Customization | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/customizations/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "Erro ao atualizar customização",
          );
        }

        const updated = await response.json();
        toast.success("Customização atualizada com sucesso!");

        await fetchCustomizations();

        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar customização";
        setError(message);
        console.error("Erro ao atualizar customização:", err);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, fetchCustomizations],
  );

  /**
   * Deletar customização
   */
  const deleteCustomization = useCallback(
    async (id: string): Promise<boolean> => {
      if (!confirm("Tem certeza que deseja deletar esta customização?")) {
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/customizations/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "Erro ao deletar customização",
          );
        }

        toast.success("Customização deletada com sucesso!");

        await fetchCustomizations();

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao deletar customização";
        setError(message);
        console.error("Erro ao deletar customização:", err);
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, fetchCustomizations],
  );

  /**
   * Carregar customizações ao montar ou quando itemId mudar
   */
  useEffect(() => {
    if (itemId) {
      fetchCustomizations();
    }
  }, [itemId, fetchCustomizations]);

  return {

    customizations,
    loading,
    error,

    fetchCustomizations,
    createCustomization,
    updateCustomization,
    deleteCustomization,
  };
}
