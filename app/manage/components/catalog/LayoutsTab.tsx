"use client";

import { useCallback, useEffect, useState } from "react";
import LayoutBaseManager from "@/app/manage/components/layout-base-manager";
import { useLayoutApi } from "@/app/hooks/use-layout-api";
import type {
  LayoutBase,
  CreateLayoutBaseInput,
} from "@/app/types/personalization";
import { toast } from "sonner";

export function LayoutsTab() {
  const {
    fetchLayouts,
    createLayout: apiCreateLayout,
    updateLayout: apiUpdateLayout,
    deleteLayout: apiDeleteLayout,
    loading,
  } = useLayoutApi();

  const [layouts, setLayouts] = useState<LayoutBase[]>([]);

  const loadLayouts = useCallback(async () => {
    try {
      const data = await fetchLayouts();
      setLayouts(data);
    } catch (error) {
      console.error("Erro ao carregar layouts:", error);
      toast.error("Erro ao carregar layouts");
    }
  }, [fetchLayouts]);

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  const createLayout = async (data: CreateLayoutBaseInput, imageFile: File) => {
    await apiCreateLayout(data, imageFile);
  };

  const updateLayout = async (
    id: string,
    data: CreateLayoutBaseInput,
    imageFile?: File
  ) => {
    await apiUpdateLayout(id, data, imageFile);
  };

  const deleteLayout = async (id: string) => {
    await apiDeleteLayout(id);
  };

  const onLayoutSelect = async () => {};

  return (
    <div>
      <LayoutBaseManager
        layouts={layouts}
        onLayoutSelect={onLayoutSelect}
        updateLayout={updateLayout}
        createLayout={createLayout}
        deleteLayout={deleteLayout}
        loadLayouts={loadLayouts}
        loading={loading}
      />
    </div>
  );
}

export default LayoutsTab;
