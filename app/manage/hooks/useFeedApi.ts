import { useState, useCallback } from "react";
import {
  FeedConfiguration,
  FeedBanner,
  FeedSection,
  CreateFeedConfigurationInput,
  UpdateFeedConfigurationInput,
  CreateFeedBannerInput,
  UpdateFeedBannerInput,
  CreateFeedSectionInput,
  UpdateFeedSectionInput,
} from "../types/feed";

export interface UseFeedApiResult {
  loading: boolean;
  error: string | null;

  // Configurações
  createConfiguration: (
    data: CreateFeedConfigurationInput
  ) => Promise<FeedConfiguration | null>;
  updateConfiguration: (
    id: string,
    data: UpdateFeedConfigurationInput
  ) => Promise<FeedConfiguration | null>;
  deleteConfiguration: (id: string) => Promise<boolean>;
  getConfigurations: () => Promise<FeedConfiguration[]>;
  getConfiguration: (id: string) => Promise<FeedConfiguration | null>;

  // Banners
  createBanner: (data: CreateFeedBannerInput) => Promise<FeedBanner | null>;
  updateBanner: (
    id: string,
    data: UpdateFeedBannerInput
  ) => Promise<FeedBanner | null>;
  deleteBanner: (id: string) => Promise<boolean>;

  // Seções
  createSection: (data: CreateFeedSectionInput) => Promise<FeedSection | null>;
  updateSection: (
    id: string,
    data: UpdateFeedSectionInput
  ) => Promise<FeedSection | null>;
  deleteSection: (id: string) => Promise<boolean>;

  // Utilitários
  clearError: () => void;
}

export const useFeedApi = (): UseFeedApiResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(
    async <T>(url: string, options: RequestInit = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        console.error("Erro na API:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Configurações
  const createConfiguration = useCallback(
    async (
      data: CreateFeedConfigurationInput
    ): Promise<FeedConfiguration | null> => {
      return apiCall<FeedConfiguration>("/api/feed/configurations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const updateConfiguration = useCallback(
    async (
      id: string,
      data: UpdateFeedConfigurationInput
    ): Promise<FeedConfiguration | null> => {
      return apiCall<FeedConfiguration>(`/api/feed/configurations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const deleteConfiguration = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await apiCall(`/api/feed/configurations/${id}`, {
        method: "DELETE",
      });
      return result !== null;
    },
    [apiCall]
  );

  const getConfigurations = useCallback(async (): Promise<
    FeedConfiguration[]
  > => {
    const result = await apiCall<FeedConfiguration[]>(
      "/api/feed/configurations"
    );
    return result || [];
  }, [apiCall]);

  const getConfiguration = useCallback(
    async (id: string): Promise<FeedConfiguration | null> => {
      return apiCall<FeedConfiguration>(`/api/feed/configurations/${id}`);
    },
    [apiCall]
  );

  // Banners
  const createBanner = useCallback(
    async (data: CreateFeedBannerInput): Promise<FeedBanner | null> => {
      return apiCall<FeedBanner>("/api/feed/banners", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const updateBanner = useCallback(
    async (
      id: string,
      data: UpdateFeedBannerInput
    ): Promise<FeedBanner | null> => {
      return apiCall<FeedBanner>(`/api/feed/banners/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const deleteBanner = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await apiCall(`/api/feed/banners/${id}`, {
        method: "DELETE",
      });
      return result !== null;
    },
    [apiCall]
  );

  // Seções
  const createSection = useCallback(
    async (data: CreateFeedSectionInput): Promise<FeedSection | null> => {
      return apiCall<FeedSection>("/api/feed/sections", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const updateSection = useCallback(
    async (
      id: string,
      data: UpdateFeedSectionInput
    ): Promise<FeedSection | null> => {
      return apiCall<FeedSection>(`/api/feed/sections/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [apiCall]
  );

  const deleteSection = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await apiCall(`/api/feed/sections/${id}`, {
        method: "DELETE",
      });
      return result !== null;
    },
    [apiCall]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    getConfigurations,
    getConfiguration,
    createBanner,
    updateBanner,
    deleteBanner,
    createSection,
    updateSection,
    deleteSection,
    clearError,
  };
};
