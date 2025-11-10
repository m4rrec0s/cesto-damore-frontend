"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/app/components/ui/badge";
import { useApi } from "@/app/hooks/use-api";
import customizationClientService, {
  CustomizationStateData,
} from "@/app/services/customization-client-service";
import type { CustomizationConfigResponse } from "@/app/types/customization";

interface ClientCustomizationPanelProps {
  itemId: string;
  onComplete?: (hasCustomizations: boolean) => void;
}

export function ClientCustomizationPanel({
  itemId,
  onComplete,
}: ClientCustomizationPanelProps) {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CustomizationConfigResponse | null>(
    null
  );
  const [customizations, setCustomizations] = useState<
    Array<{
      id: string;
      type: string;
      name: string;
      description?: string;
      isRequired: boolean;
      customization_data: Record<string, unknown>;
      price: number;
    }>
  >([]);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);

  useEffect(() => {
    const loadCustomizationConfig = async () => {
      try {
        setLoading(true);
        const data = await api.getItemCustomizations(itemId);
        setConfig(data);

        if (data.item.allowsCustomization && data.customizations) {
          setCustomizations(data.customizations);
          customizationClientService.initializeSession(itemId, data);
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
    };

    loadCustomizationConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const currentCustomization = customizations[currentRuleIndex];

  const handleNext = () => {
    if (currentRuleIndex < customizations.length - 1) {
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

  if (customizations.length === 0) {
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
          Passo {currentRuleIndex + 1} de {customizations.length}
        </div>
        <div className="flex gap-2">
          {customizations.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full ${
                index <= currentRuleIndex ? "bg-purple-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current customization */}
      {currentCustomization && (
        <CustomizationRuleStep
          customization={currentCustomization}
          onUpdate={(data) => {
            customizationClientService.updateCustomization(
              currentCustomization.id,
              data
            );
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
          {currentRuleIndex === customizations.length - 1 ? (
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
  customization: {
    id: string;
    type: string;
    name: string;
    description?: string;
    isRequired: boolean;
    customization_data: Record<string, unknown>;
    price: number;
  };
  onUpdate: (data: CustomizationStateData) => void;
}

function CustomizationRuleStep({
  customization,
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

    // Converter cada arquivo para base64
    const photoPromises = Array.from(files).map(async (file) => {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      return {
        file,
        preview: URL.createObjectURL(file),
        base64, // ✅ Dados base64 para upload ao Drive
        mime_type: file.type,
        size: file.size,
      };
    });

    const photos = await Promise.all(photoPromises);

    updateData({ photos });
    toast.success(`${files.length} foto(s) adicionada(s)`);
  };

  const options = customization.customization_data.options as
    | Array<{
        id: string;
        label: string;
        image_url?: string;
        price_modifier?: number;
      }>
    | undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {customization.name}
              {customization.isRequired && (
                <Badge variant="destructive" className="text-xs">
                  Obrigatório
                </Badge>
              )}
            </CardTitle>
            {customization.description && (
              <CardDescription className="mt-2">
                {customization.description}
              </CardDescription>
            )}
            {customization.price > 0 && (
              <p className="text-sm text-emerald-600 font-medium mt-2">
                +R$ {customization.price.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IMAGES */}
        {customization.type === "IMAGES" && (
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

        {/* TEXT */}
        {customization.type === "TEXT" && (
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

        {/* MULTIPLE_CHOICE */}
        {customization.type === "MULTIPLE_CHOICE" && options && (
          <div className="space-y-2">
            <Label>Escolha uma Opção</Label>
            <div className="grid grid-cols-2 gap-4">
              {options.map((option) => {
                const API_URL = process.env.NEXT_PUBLIC_API_URL;
                const imageUrl = option.image_url
                  ? option.image_url.startsWith("http")
                    ? option.image_url
                    : `${API_URL}${option.image_url}`
                  : null;

                return (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all hover:border-purple-600 ${
                      data.selectedOptions?.main === option.id
                        ? "border-2 border-purple-600"
                        : ""
                    }`}
                    onClick={() =>
                      updateData({ selectedOptions: { main: option.id } })
                    }
                  >
                    {imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={option.label}
                        className="h-32 w-full rounded-t-lg object-cover"
                      />
                    )}
                    <CardContent className="p-4">
                      <p className="font-medium">{option.label}</p>
                      {option.price_modifier && option.price_modifier > 0 && (
                        <p className="text-sm text-emerald-600 font-medium mt-1">
                          +R$ {option.price_modifier.toFixed(2)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
