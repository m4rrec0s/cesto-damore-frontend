"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useApi } from "./use-api";
import type {
  CustomizationData,
  CustomizationState,
  PreviewResponse,
  ValidationResult,
} from "../types/customization";

interface CustomizationContextValue {
  state: CustomizationState | null;
  loading: boolean;
  error: string | null;

  loadRules: (productId: string) => Promise<void>;

  updateCustomization: (ruleId: string, data: CustomizationData) => void;

  generatePreview: () => Promise<PreviewResponse | null>;

  validate: () => Promise<ValidationResult>;

  reset: () => void;
}

const CustomizationContext = createContext<
  CustomizationContextValue | undefined
>(undefined);

interface CustomizationProviderProps {
  children: React.ReactNode;
}

export function CustomizationProvider({
  children,
}: CustomizationProviderProps) {
  const api = useApi();
  const [state, setState] = useState<CustomizationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(
    async (productId: string) => {
      setLoading(true);
      setError(null);

      try {

        await api.get(`/customizations/${productId}`);

        setState({
          productId,
          data: {},
          previewUrl: undefined,
        });
      } catch (err) {
        console.error("Erro ao carregar regras de customização:", err);
        setError("Não foi possível carregar as opções de customização");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const updateCustomization = useCallback(
    (ruleId: string, data: CustomizationData) => {
      setState((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          data: {
            ...prev.data,
            [ruleId]: data,
          },
        };
      });
    },
    []
  );

  const generatePreview =
    useCallback(async (): Promise<PreviewResponse | null> => {
      if (!state) return null;

      setLoading(true);
      try {

        const customizationData: Record<string, unknown> = {};

        for (const [ruleId, data] of Object.entries(state.data)) {
          customizationData[ruleId] = data;
        }

        const response = (await api.post("/customization/preview", {
          productId: state.productId,
          customizationData,
        })) as PreviewResponse;

        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            previewUrl: response.previewUrl,
            model3dUrl: response.model3d,
          };
        });

        return response;
      } catch (err) {
        console.error("Erro ao gerar preview:", err);
        return null;
      } finally {
        setLoading(false);
      }
    }, [api, state]);

  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (!state) {
      return { valid: false, errors: ["Nenhuma customização carregada"] };
    }

    try {

      const customizations = Object.entries(state.data).map(
        ([ruleId, data]) => ({
          rule_id: ruleId,
          data,
        })
      );

      const response = (await api.post("/customization/validate", {
        productId: state.productId,
        customizations,
      })) as ValidationResult;

      return response;
    } catch (err) {
      console.error("Erro ao validar customizações:", err);
      return {
        valid: false,
        errors: ["Erro ao validar customizações"],
      };
    }
  }, [api, state]);

  const reset = useCallback(() => {
    setState(null);
    setError(null);
  }, []);

  const value: CustomizationContextValue = {
    state,
    loading,
    error,
    loadRules,
    updateCustomization,
    generatePreview,
    validate,
    reset,
  };

  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomizationContext() {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error(
      "useCustomizationContext must be used within CustomizationProvider"
    );
  }
  return context;
}
