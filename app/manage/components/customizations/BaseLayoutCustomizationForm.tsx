"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { getDirectImageUrl } from "@/app/helpers/drive-normalize";

/**
 * Interface para Layout Base
 */
interface Layout {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  model_url?: string;
  print_areas?: Array<{
    id: string;
    label: string;
    width: number;
    height: number;
    x?: number;
    y?: number;
    z?: number;
  }>;
}

/**
 * Dados de customização BASE_LAYOUT
 */
interface BaseLayoutData {
  layouts: Array<{
    id: string;
    name: string;
  }>;
}

interface Props {
  data: BaseLayoutData;
  itemId: string;
  onChange: (data: BaseLayoutData) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Componente de formulário para customização BASE_LAYOUT
 *
 * ARQUITETURA ANTI-LOOP:
 * 1. Estado local desacoplado (localSelectedIds)
 * 2. Comparação por conteúdo (não referência)
 * 3. Botão explícito de confirmação "Aplicar Seleção"
 * 4. useCallback com deps vazias para handlers estáveis
 * 5. useEffect com comparação profunda via JSON.stringify
 */
export default function BaseLayoutCustomizationForm({
  data,
  itemId,
  onChange,
}: Props) {
  // ===== ESTADO LOCAL DESACOPLADO =====
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Ref para armazenar último conteúdo recebido (evitar loops)
  const lastDataContentRef = useRef<string>("");

  /**
   * PRINCÍPIO 1: Inicializar estado local APENAS quando data mudar de conteúdo
   * Comparação por JSON.stringify, não por referência
   */
  useEffect(() => {
    const incomingIds = data?.layouts?.map((l) => l.id).sort() || [];
    const incomingContent = JSON.stringify(incomingIds);

    // Só atualiza se o CONTEÚDO realmente mudou
    if (incomingContent !== lastDataContentRef.current) {
      lastDataContentRef.current = incomingContent;
      setLocalSelectedIds(incomingIds);
      setHasChanges(false);
    }
  }, [data]);

  /**
   * PRINCÍPIO 3: Função de busca estável (useCallback sem deps)
   */
  const fetchAvailableLayouts = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("appToken");

      const response = await fetch(`${API_URL}/admin/layouts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar layouts");
      }

      const layouts = await response.json();
      setAvailableLayouts(Array.isArray(layouts) ? layouts : []);
    } catch (error) {
      console.error("Erro ao buscar layouts:", error);
      toast.error("Erro ao carregar layouts disponíveis");
      setAvailableLayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * PRINCÍPIO 2: Buscar layouts disponíveis APENAS quando itemId mudar
   */
  useEffect(() => {
    if (itemId) {
      fetchAvailableLayouts();
    }
  }, [itemId, fetchAvailableLayouts]);

  /**
   * Detectar se há mudanças pendentes
   */
  useEffect(() => {
    const currentIds = localSelectedIds.slice().sort();
    const savedIds = (data?.layouts?.map((l) => l.id) || []).slice().sort();
    const hasChanged = JSON.stringify(currentIds) !== JSON.stringify(savedIds);
    setHasChanges(hasChanged);
  }, [localSelectedIds, data]);

  /**
   * PRINCÍPIO 4: Toggle de checkbox - altera APENAS estado local
   * NÃO propaga para o pai automaticamente
   */
  const toggleLayout = useCallback((layoutId: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(layoutId)
        ? prev.filter((id) => id !== layoutId)
        : [...prev, layoutId]
    );
  }, []);

  /**
   * PRINCÍPIO 5: Botão explícito para aplicar mudanças
   * Só então propaga para o pai via onChange
   */
  const applySelection = useCallback(() => {
    const selectedLayouts = availableLayouts
      .filter((layout) => localSelectedIds.includes(layout.id))
      .map((layout) => ({
        id: layout.id,
        name: layout.name,
      }));

    // COMPARAÇÃO POR CONTEÚDO antes de chamar onChange
    const newContent = JSON.stringify(selectedLayouts);
    const currentContent = JSON.stringify(data?.layouts || []);

    if (newContent !== currentContent) {
      onChange({ layouts: selectedLayouts });
      toast.success("Seleção de layouts atualizada!");
    } else {
      toast.info("Nenhuma alteração detectada");
    }

    setHasChanges(false);
  }, [localSelectedIds, availableLayouts, onChange, data]);

  /**
   * Cancelar mudanças pendentes
   */
  const cancelChanges = useCallback(() => {
    const savedIds = data?.layouts?.map((l) => l.id) || [];
    setLocalSelectedIds(savedIds);
    setHasChanges(false);
    toast.info("Alterações canceladas");
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">
            🎨 Layouts Base Disponíveis
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Selecione os layouts 3D que o cliente poderá escolher
          </p>
        </div>
        {localSelectedIds.length > 0 && (
          <Badge variant="secondary">
            {localSelectedIds.length} selecionado(s)
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-8 flex items-center justify-center">
          <LoadingSpinner />
        </Card>
      )}

      {/* Empty State */}
      {!loading && availableLayouts.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-700 font-medium">
            Nenhum layout disponível para este item
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Crie layouts primeiro na seção de &quot;Layouts 3D&quot;
          </p>
        </Card>
      )}

      {/* Layouts Grid */}
      {!loading && availableLayouts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableLayouts.map((layout) => {
              const isSelected = localSelectedIds.includes(layout.id);

              return (
                <Card
                  key={layout.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSelected
                    ? "border-purple-500 border-2 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => toggleLayout(layout.id)}
                >
                  {/* Preview Image */}
                  <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden bg-gray-100">
                    {layout.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(() => {
                          const url = layout.image_url;
                          if (!url) return "";
                          if (url.startsWith("data:")) return url;
                          if (
                            url.includes("drive.google.com") ||
                            url.includes("drive.usercontent.google.com")
                          ) {
                            const normalizedUrl = getDirectImageUrl(url);
                            return `/api/proxy-image?url=${encodeURIComponent(
                              normalizedUrl
                            )}`;
                          }
                          return url;
                        })()}
                        alt={layout.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Layout Info */}
                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleLayout(layout.id)}
                      />
                      <Label className="font-semibold cursor-pointer flex-1">
                        {layout.name}
                      </Label>
                    </div>

                    {layout.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {layout.description}
                      </p>
                    )}

                    {layout.print_areas && layout.print_areas.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>📐</span>
                        <span>
                          {layout.print_areas.length} área(s) de impressão
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">
                    Você tem alterações não salvas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelChanges}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applySelection}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aplicar Seleção
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Info Card */}
          {!hasChanges && localSelectedIds.length > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5" />
                <p className="text-sm">
                  <strong>{localSelectedIds.length} layout(s)</strong>{" "}
                  configurado(s) para este item
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
