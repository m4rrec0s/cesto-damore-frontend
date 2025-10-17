"use client";

import { useState } from "react";
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
  layout_data: {
    model_url: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

export default function BaseLayoutCustomizationForm({
  data,
  onChange,
  itemId,
}: Props) {
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([]);
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>(
    data.layouts?.map((l) => l.id) || []
  );
  const [loading, setLoading] = useState(false);

  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/layouts?itemId=${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const toggleLayout = (layoutId: string) => {
    const layout = availableLayouts.find((l) => l.id === layoutId);
    if (!layout) return;

    const isSelected = selectedLayouts.includes(layoutId);
    const updatedSelected = isSelected
      ? selectedLayouts.filter((id) => id !== layoutId)
      : [...selectedLayouts, layoutId];

    setSelectedLayouts(updatedSelected);

    const layouts = availableLayouts
      .filter((l) => updatedSelected.includes(l.id))
      .map((l) => ({
        id: l.id,
        name: l.name,
        model_url: l.layout_data.model_url,
      }));

    onChange({ layouts });
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
        <p className="mb-4">Nenhum layout 3D encontrado para este item.</p>
        <p className="text-sm">
          Crie layouts 3D na página de gerenciamento de layouts primeiro.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Selecione os Layouts 3D Disponíveis
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
                {layout.layout_data.print_areas && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {layout.layout_data.print_areas.length} área(s) de impressão
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Modelo 3D: {layout.layout_data.model_url.split("/").pop()}
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
