"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
// import Image from "next/image";
import { Image as ImageIcon, Type, Check, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { useApi } from "@/app/hooks/use-api";
import customizationClientService, {
  CustomizationStateData,
} from "@/app/services/customization-client-service";
import type {
  CustomizationConfigResponse,
  ProductRuleDTO,
  LegacyCustomizationDTO,
  LayoutDTO,
} from "@/app/types/customization";

interface ClientCustomizationPanelProps {
  itemType: "PRODUCT" | "ADDITIONAL";
  itemId: string;
  onComplete?: (hasCustomizations: boolean) => void;
}

export function ClientCustomizationPanel({
  itemType,
  itemId,
  onComplete,
}: ClientCustomizationPanelProps) {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CustomizationConfigResponse | null>(
    null
  );
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);

  const loadCustomizationConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getItemCustomizations(itemType, itemId);
      setConfig(data);

      if (data.item.allowsCustomization) {
        customizationClientService.initializeSession(itemType, itemId, data);
      } else {
        onComplete?.(false);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      toast.error("Erro ao carregar opções de customização");
      onComplete?.(false);
    } finally {
      setLoading(false);
    }
  }, [itemType, itemId, api, onComplete]);

  useEffect(() => {
    loadCustomizationConfig();
  }, [loadCustomizationConfig]);

  const allRules = [
    ...(config?.rules || []).map((r) => ({ ...r, isLegacy: false })),
    ...(config?.legacyRules || []).map((r) => ({ ...r, isLegacy: true })),
  ];

  const currentRule = allRules[currentRuleIndex];

  const handleNext = () => {
    if (currentRuleIndex < allRules.length - 1) {
      setCurrentRuleIndex(currentRuleIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentRuleIndex > 0) {
      setCurrentRuleIndex(currentRuleIndex - 1);
    }
  };

  const handleComplete = async () => {
    const validation = customizationClientService.validateRequiredRules();

    if (!validation.valid) {
      toast.error(
        `Campos obrigatórios não preenchidos: ${validation.missingRules.join(
          ", "
        )}`
      );
      return;
    }

    // Validar com o backend
    try {
      const inputs = customizationClientService.buildCustomizationInputs();
      const response = await api.validateCustomizationsV2({
        itemType,
        itemId,
        inputs,
      });

      if (!response.valid) {
        toast.error(`Erros de validação: ${response.errors.join(", ")}`);
        return;
      }

      if (response.warnings.length > 0) {
        response.warnings.forEach((warning) => toast.warning(warning));
      }

      onComplete?.(true);
    } catch (error) {
      console.error("Erro ao validar customizações:", error);
      toast.error("Erro ao validar customizações");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!config || !config.item.allowsCustomization) {
    return null;
  }

  if (allRules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma customização disponível
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Passo {currentRuleIndex + 1} de {allRules.length}
        </div>
        <div className="flex gap-2">
          {allRules.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full ${
                index <= currentRuleIndex ? "bg-purple-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current rule */}
      {currentRule && (
        <CustomizationRuleStep
          rule={currentRule}
          layouts={config.layouts}
          onUpdate={(data) => {
            const ruleId = currentRule.id;
            customizationClientService.updateCustomization(ruleId, data);
          }}
        />
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentRuleIndex === 0}
        >
          Voltar
        </Button>
        <Button
          onClick={handleNext}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {currentRuleIndex === allRules.length - 1 ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Concluir
            </>
          ) : (
            "Próximo"
          )}
        </Button>
      </div>
    </div>
  );
}

interface CustomizationRuleStepProps {
  rule: (ProductRuleDTO | LegacyCustomizationDTO) & { isLegacy: boolean };
  layouts: LayoutDTO[];
  onUpdate: (data: CustomizationStateData) => void;
}

function CustomizationRuleStep({
  rule,
  layouts,
  onUpdate,
}: CustomizationRuleStepProps) {
  const [data, setData] = useState<CustomizationStateData>({});

  const updateData = (updates: Partial<CustomizationStateData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    onUpdate(newData);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const photos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    updateData({ photos });
    toast.success(`${files.length} foto(s) adicionada(s)`);
  };

  const isRequired = rule.isLegacy
    ? (rule as LegacyCustomizationDTO).isRequired
    : (rule as ProductRuleDTO).required;

  const ruleType = rule.isLegacy
    ? (rule as LegacyCustomizationDTO).customizationType
    : (rule as ProductRuleDTO).ruleType;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {rule.title}
              {isRequired && (
                <Badge variant="destructive" className="text-xs">
                  Obrigatório
                </Badge>
              )}
            </CardTitle>
            {rule.description && (
              <CardDescription className="mt-2">
                {rule.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PHOTO_UPLOAD */}
        {(ruleType === "PHOTO_UPLOAD" || ruleType === "LAYOUT_WITH_PHOTOS") && (
          <div className="space-y-4">
            <Label htmlFor="photo-upload" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Enviar Fotos
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="cursor-pointer"
            />
            {data.photos && data.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {data.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEXT_INPUT */}
        {ruleType === "TEXT_INPUT" && (
          <div className="space-y-2">
            <Label htmlFor="text-input" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Mensagem Personalizada
            </Label>
            <Textarea
              id="text-input"
              placeholder="Digite sua mensagem..."
              value={(data.texts?.[0] as string) || ""}
              onChange={(e) => updateData({ texts: [e.target.value] })}
              rows={4}
            />
          </div>
        )}

        {/* LAYOUT_PRESET */}
        {ruleType === "LAYOUT_PRESET" && (
          <div className="space-y-2">
            <Label>Escolha um Layout</Label>
            <div className="grid grid-cols-2 gap-4">
              {layouts.map((layout) => (
                <Card
                  key={layout.id}
                  className={`cursor-pointer transition-all hover:border-purple-600 ${
                    data.selectedLayoutId === layout.id
                      ? "border-2 border-purple-600"
                      : ""
                  }`}
                  onClick={() => updateData({ selectedLayoutId: layout.id })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={layout.baseImageUrl}
                    alt={layout.name}
                    className="h-32 w-full rounded-t-lg object-cover"
                  />
                  <CardContent className="p-4">
                    <p className="font-medium">{layout.name}</p>
                    {layout.description && (
                      <p className="text-sm text-muted-foreground">
                        {layout.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* OPTION_SELECT / MULTIPLE_CHOICE */}
        {(ruleType === "OPTION_SELECT" || ruleType === "MULTIPLE_CHOICE") && (
          <div className="space-y-2">
            <Label>Escolha uma Opção</Label>
            <Select
              value={data.selectedOptions?.main || ""}
              onValueChange={(value) =>
                updateData({ selectedOptions: { main: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {/* Renderizar opções disponíveis */}
                <SelectItem value="option1">Opção 1</SelectItem>
                <SelectItem value="option2">Opção 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
