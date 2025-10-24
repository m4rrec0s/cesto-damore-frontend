"use client";

import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/app/lib/auth-utils";

interface PrintArea {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { width: number; height: number };
}

interface Layout {
  id: string;
  name: string;
  image_url: string;
  item_type?: string;
  layout_data?: {
    model_url?: string;
    print_areas?: PrintArea[];
  };
}

interface BaseLayoutData {
  layouts: Array<{
    id: string;
    name: string;
    model_url: string;
  }>;
}

interface Props {
  data: BaseLayoutData;
  onChange: (data: BaseLayoutData) => void;
  itemId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function BaseLayoutCustomizationForm({ data, onChange, itemId }: Props) {
  const [selectionMode, setSelectionMode] = useState<"ALL" | "MANUAL">(
    "MANUAL"
  );
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([]);
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>(
    data.layouts?.map((l) => l.id) || []
  );
  const [loading, setLoading] = useState(false);

  // Ref para evitar loops infinitos
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);
  const lastSentData = useRef<string>("");

  // Atualizar ref quando onChange mudar (sem causar re-render)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Fetch layouts quando itemId mudar
  useEffect(() => {
    if (itemId) {
      fetchLayouts();
    }
  }, []);

  // Sincronizar selectedLayouts com onChange - SOLUÇÃO DEFINITIVA
  useEffect(() => {
    // Pular na montagem inicial se já tem data
    if (isInitialMount.current && data.layouts?.length > 0) {
      isInitialMount.current = false;
      const initialKey = JSON.stringify(data.layouts.map((l) => l.id).sort());
      lastSentData.current = initialKey;
      return;
    }

    isInitialMount.current = false;

    if (availableLayouts.length === 0) return;

    const layouts = availableLayouts
      .filter((l) => selectedLayouts.includes(l.id))
      .map((l) => ({
        id: l.id,
        name: l.name,
        model_url: l.layout_data?.model_url || "",
      }));

    // Comparar apenas os IDs ordenados
    const currentKey = JSON.stringify(layouts.map((l) => l.id).sort());

    if (currentKey !== lastSentData.current) {
      lastSentData.current = currentKey;
      // Usar a ref para evitar dependência circular
      onChangeRef.current({ layouts });
    }
  }, [selectedLayouts, availableLayouts, data.layouts]);

  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/layouts?itemId=${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const layouts = await response.json();
        setAvailableLayouts(layouts);
      } else {
        toast.error("Erro ao buscar layouts");
      }
    } catch (error) {
      console.error("Erro ao buscar layouts:", error);
      toast.error("Erro ao buscar layouts");
    } finally {
      setLoading(false);
    }
  };

  const toggleLayout = useCallback((layoutId: string) => {
    setSelectedLayouts((prev) => {
      const isSelected = prev.includes(layoutId);
      if (isSelected) {
        return prev.filter((id) => id !== layoutId);
      }
      return [...prev, layoutId];
    });
  }, []);

  const handleSelectAllByType = useCallback(
    (type: string) => {
      const matched =
        type === "ALL"
          ? availableLayouts.map((l) => l.id)
          : availableLayouts
              .filter((l) => l.item_type === type)
              .map((l) => l.id);

      setSelectedLayouts((prev) => {
        // Verificar se realmente mudou
        const prevSorted = [...prev].sort().join(",");
        const matchedSorted = [...matched].sort().join(",");

        if (prevSorted === matchedSorted) {
          return prev;
        }

        return matched;
      });
    },
    [availableLayouts]
  );

  const handleSelectionModeChange = (mode: "ALL" | "MANUAL") => {
    setSelectionMode(mode);
    if (mode === "ALL") {
      handleSelectAllByType(selectedType);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!itemId) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Selecione um item primeiro para carregar os layouts disponíveis
      </Card>
    );
  }

  if (availableLayouts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p className="mb-4">Nenhum layout encontrado para este item.</p>
        <p className="text-sm">
          Crie layouts na página de gerenciamento de layouts primeiro.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Label className="text-sm">Modo de seleção</Label>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="layoutSelectionMode"
              checked={selectionMode === "MANUAL"}
              onChange={() => handleSelectionModeChange("MANUAL")}
            />
            <span>Selecionar manualmente</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="layoutSelectionMode"
              checked={selectionMode === "ALL"}
              onChange={() => handleSelectionModeChange("ALL")}
            />
            <span>Selecionar por tipo</span>
          </label>
        </div>
      </div>

      {selectionMode === "ALL" && (
        <div className="flex items-center space-x-4">
          <Label className="text-sm">Tipo</Label>
          <select
            value={selectedType}
            onChange={(e) => {
              const t = e.target.value;
              setSelectedType(t);
              handleSelectAllByType(t);
            }}
            className="border rounded px-2 py-1"
            aria-label="Selecionar tipo de layout"
          >
            <option value="ALL">Todos os tipos</option>
            {Array.from(
              new Set(availableLayouts.map((l) => l.item_type).filter(Boolean))
            ).map((t) => (
              <option key={t} value={t!}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Selecione os Layouts Disponíveis
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchLayouts}
        >
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableLayouts.map((layout) => (
          <Card
            key={layout.id}
            className={`p-4 cursor-pointer transition-all ${
              selectedLayouts.includes(layout.id)
                ? "ring-2 ring-primary"
                : "hover:bg-accent"
            }`}
            onClick={() => toggleLayout(layout.id)}
          >
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={selectedLayouts.includes(layout.id)}
                onCheckedChange={() => toggleLayout(layout.id)}
              />
              <div className="flex-1">
                <h4 className="font-medium">{layout.name}</h4>
                {layout.layout_data?.print_areas?.length ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {layout.layout_data.print_areas.length} área(s) de impressão
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1">
                  Modelo:{" "}
                  {layout.layout_data?.model_url
                    ? layout.layout_data.model_url.split("/").pop()
                    : "—"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedLayouts.length > 0 && (
        <Card className="p-4 bg-muted">
          <p className="text-sm">
            <strong>{selectedLayouts.length}</strong> layout(s) selecionado(s)
          </p>
        </Card>
      )}
    </div>
  );
}

export default React.memo(BaseLayoutCustomizationForm);
