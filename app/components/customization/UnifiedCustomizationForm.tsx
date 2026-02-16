"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { useApi } from "@/app/hooks/use-api";
import AdvancedPersonalizationEditor from "../advanced-personalization-editor";
import type {
  CustomizationConfigResponse,
  CustomizationInput,
} from "@/app/types/customization";
import type { LayoutBase, ImageData } from "@/app/types/personalization";
import Image from "next/image";
import { getInternalImageUrl } from "@/lib/image-helper";

interface UnifiedCustomizationFormProps {
  itemId: string;
  onPreviewChange?: (previewUrl: string | null) => void;
  onComplete?: (hasCustomizations: boolean, data: CustomizationInput[]) => void;
  globalSelections?: Record<string, { itemId: string; label: string }[]>;
}

interface CustomizationData {
  [customizationId: string]: {
    type: string;
    value: unknown;
    completed: boolean;
  };
}

export function UnifiedCustomizationForm({
  itemId,
  onPreviewChange,
  onComplete,
  globalSelections = {},
}: UnifiedCustomizationFormProps) {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CustomizationConfigResponse | null>(
    null,
  );
  const [customizationData, setCustomizationData] = useState<CustomizationData>(
    {},
  );
  const [layoutBase, setLayoutBase] = useState<LayoutBase | null>(null);
  const [constraints, setConstraints] = useState<
    Array<{
      id: string;
      constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
      target_item_id: string;
      target_item_type: string;
      related_item_id: string;
      related_item_type: string;
      message?: string;
    }>
  >([]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const data = await api.getItemCustomizations(itemId);
        setConfig(data);

        const hasCustomizations =
          data.customizations && data.customizations.length > 0;
        const allowsCustomization =
          data.item?.allowsCustomization ??
          data.item?.allows_customization ??
          hasCustomizations;

        if (!allowsCustomization || !data.customizations) {
          onComplete?.(false, []);
          return;
        }

        try {
          const constraintsData = await api.getItemConstraints(
            itemId,
            "ADDITIONAL",
          );
          setConstraints(constraintsData);
        } catch (err) {
          console.error("Erro ao carregar restrições:", err);

          setConstraints([]);
        }

        const layoutCustomization = data.customizations.find(
          (c) => c.type === "LAYOUT_BASE",
        );
        const itemLayoutId = (data.item as { layout_base_id?: string })
          .layout_base_id;
        if (layoutCustomization && itemLayoutId) {
          try {

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/layouts/dynamic/${itemLayoutId}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              },
            );
            if (response.ok) {
              const layout = await response.json();
              setLayoutBase(layout);
            }
          } catch (err) {
            console.error("Erro ao carregar layout base:", err);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        toast.error("Erro ao carregar opções de customização");
        onComplete?.(false, []);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  /**
   * Verifica e aplica restrições ao selecionar uma opção
   * Se houver conflito MUTUALLY_EXCLUSIVE, desmarca a opção conflitante automaticamente
   */
  const handleOptionSelect = async (
    customizationId: string,
    optionId: string,
    optionLabel: string,
  ) => {

    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        optionId,
      );

    let allConstraints = [...constraints];

    if (isValidUUID) {
      try {

        const optionConstraints = await api.getItemConstraints(
          optionId,
          "ADDITIONAL",
        );
        allConstraints = [...constraints, ...optionConstraints];
      } catch (err) {
        console.error("Erro ao buscar restrições da opção:", err);

      }
    }

    const mutuallyExclusiveConstraints = allConstraints.filter(
      (c) =>
        c.constraint_type === "MUTUALLY_EXCLUSIVE" &&
        (c.target_item_id === optionId || c.related_item_id === optionId),
    );

    if (mutuallyExclusiveConstraints.length > 0) {

      for (const constraint of mutuallyExclusiveConstraints) {
        const conflictingOptionId =
          constraint.target_item_id === optionId
            ? constraint.related_item_id
            : constraint.target_item_id;

        for (const [otherItemId, selections] of Object.entries(
          globalSelections,
        )) {
          if (otherItemId !== itemId) {

            const hasConflict = selections.some(
              (sel) => sel.itemId === conflictingOptionId,
            );

            if (hasConflict) {
              const conflictingSelection = selections.find(
                (sel) => sel.itemId === conflictingOptionId,
              );
              toast.error(
                constraint.message ||
                  `Não é possível selecionar "${optionLabel}" pois "${conflictingSelection?.label}" já está selecionado em outro componente.`,
              );
              return;
            }
          }
        }
      }

      setCustomizationData((prev) => {
        const newData = { ...prev };

        mutuallyExclusiveConstraints.forEach((constraint) => {
          const conflictingOptionId =
            constraint.target_item_id === optionId
              ? constraint.related_item_id
              : constraint.target_item_id;

          Object.keys(newData).forEach((customizationKey) => {
            const data = newData[customizationKey];
            if (data.type === "MULTIPLE_CHOICE") {
              const value = data.value as
                | { id: string; label: string }
                | undefined;
              if (value?.id === conflictingOptionId) {

                delete newData[customizationKey];

                toast.info(
                  constraint.message ||
                    `"${value.label}" foi desmarcado pois não é compatível com "${optionLabel}"`,
                );
              }
            }
          });
        });

        newData[customizationId] = {
          type: "MULTIPLE_CHOICE",
          value: { id: optionId, label: optionLabel },
          completed: true,
        };

        return newData;
      });
    } else {

      handleCustomizationChange(customizationId, "MULTIPLE_CHOICE", {
        id: optionId,
        label: optionLabel,
      });
      return;
    }

    setTimeout(() => autoSaveCustomizations(), 150);
  };

  const handleCustomizationChange = (
    customizationId: string,
    type: string,
    value: unknown,
    completed: boolean = true,
  ) => {
    setCustomizationData((prev) => ({
      ...prev,
      [customizationId]: { type, value, completed },
    }));

    autoSaveCustomizations();
  };

  const autoSaveCustomizations = () => {
    if (!config) return;

    setTimeout(() => {
      const inputs: CustomizationInput[] = Object.entries(
        customizationData,
      ).map(([id, data]) => {
        const customization = config.customizations.find((c) => c.id === id);
        const customizationName = customization?.name || "Personalização";

        let dataValue: Record<string, unknown>;
        if (data.type === "TEXT") {
          dataValue = {
            text: data.value,
            _customizationName: customizationName,
          };
        } else {
          dataValue = {
            ...(typeof data.value === "object" && data.value !== null
              ? (data.value as Record<string, unknown>)
              : { value: data.value }),
            _customizationName: customizationName,
          };
        }

        return {
          ruleId: id,
          customizationType:
            data.type as CustomizationInput["customizationType"],
          data: dataValue,
        };
      });

      onComplete?.(inputs.length > 0, inputs);
    }, 100);
  };

  const handleFileUpload = async (
    customizationId: string,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

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
        base64,
        mime_type: file.type,
        size: file.size,
      };
    });

    const photos = await Promise.all(photoPromises);

    handleCustomizationChange(customizationId, "IMAGES", photos);
    toast.success(`${files.length} foto(s) adicionada(s)`);
  };

  const handleLayoutBaseComplete = (
    images: ImageData[],
    previewUrl: string,
  ) => {
    onPreviewChange?.(previewUrl);

    const layoutCustomization = config?.customizations.find(
      (c) => c.type === "LAYOUT_BASE",
    );
    if (layoutCustomization) {
      handleCustomizationChange(
        layoutCustomization.id,
        "LAYOUT_BASE",
        { images, previewUrl },
        true,
      );
    }

    toast.success("Personalização do layout concluída!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const hasCustomizations =
    config.customizations && config.customizations.length > 0;
  const allowsCustomization =
    config.item?.allowsCustomization ??
    config.item?.allows_customization ??
    hasCustomizations;

  if (!allowsCustomization || !config.customizations) {
    return null;
  }

  if (config.customizations.length === 0) {
    return null;
  }

  const layoutBaseCustomization = config.customizations.find(
    (c) => c.type === "LAYOUT_BASE",
  );
  const otherCustomizations = config.customizations.filter(
    (c) => c.type !== "LAYOUT_BASE",
  );

  return (
    <div className="space-y-4 w-full">
      {layoutBaseCustomization && layoutBase && (
        <div className="mb-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {layoutBaseCustomization.name}
                {layoutBaseCustomization.isRequired && (
                  <span className="ml-2 text-sm text-red-500">*</span>
                )}
              </h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <AdvancedPersonalizationEditor
                layoutBase={layoutBase}
                onComplete={handleLayoutBaseComplete}
                onCancel={() => {}}
                showCanvasPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      
      <div className="w-full space-y-4">
        {otherCustomizations.map((customization) => (
          <div key={customization.id} className="space-y-2 w-full">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {customization.name}
                {customization.isRequired && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </h4>
              {customization.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {customization.description}
                </p>
              )}
              {customization.price > 0 && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  +R$ {customization.price.toFixed(2)}
                </p>
              )}
            </div>
            <div className="w-full">
              
              {customization.type === "TEXT" && (
                <div className="space-y-2">
                  <Textarea
                    id={`text-${customization.id}`}
                    placeholder="Digite sua mensagem..."
                    value={
                      (customizationData[customization.id]?.value as string) ||
                      ""
                    }
                    onChange={(e) =>
                      handleCustomizationChange(
                        customization.id,
                        "TEXT",
                        e.target.value,
                        e.target.value.trim().length > 0,
                      )
                    }
                    rows={3}
                    className="w-full"
                  />
                </div>
              )}

              
              {customization.type === "IMAGES" && (
                <div className="space-y-3">
                  <Input
                    id={`photo-${customization.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      handleFileUpload(customization.id, e.target.files)
                    }
                    className="w-full cursor-pointer"
                  />
                  {customizationData[customization.id]?.value != null &&
                  Array.isArray(customizationData[customization.id].value) ? (
                    <PhotoPreviewGrid
                      photos={
                        customizationData[customization.id].value as Array<{
                          preview: string;
                        }>
                      }
                    />
                  ) : null}
                </div>
              )}

              
              {customization.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      customization.customization_data.options as Array<{
                        id: string;
                        label: string;
                        image_url?: string;
                        price_modifier?: number;
                      }>
                    )?.map((option) => {
                      const API_URL = process.env.NEXT_PUBLIC_API_URL;
                      const imageUrl = option.image_url
                        ? option.image_url.startsWith("http")
                          ? option.image_url
                          : `${API_URL}${option.image_url}`
                        : null;

                      const isSelected =
                        (
                          customizationData[customization.id]?.value as
                            | { id: string }
                            | undefined
                        )?.id === option.id;

                      return (
                        <div
                          key={option.id}
                          className={`p-3 cursor-pointer transition-all rounded-lg border-2 ${
                            isSelected
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                          onClick={() =>
                            handleOptionSelect(
                              customization.id,
                              option.id,
                              option.label,
                            )
                          }
                        >
                          <div className="flex items-center gap-3">
                            {imageUrl && (
                              <div className="w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                <Image
                                  src={getInternalImageUrl(imageUrl)}
                                  alt={option.label}
                                  fill
                                  className="object-cover"
                                  priority
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {option.label}
                              </p>
                              {option.price_modifier &&
                                option.price_modifier > 0 && (
                                  <p className="text-xs text-green-600 mt-0.5">
                                    +R$ {option.price_modifier.toFixed(2)}
                                  </p>
                                )}
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-gray-900 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoPreviewGrid({ photos }: { photos: Array<{ preview: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        <div key={index} className="relative aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.preview}
            alt={`Preview ${index + 1}`}
            className="h-full w-full rounded-lg object-contain bg-neutral-50 border-2"
          />
        </div>
      ))}
    </div>
  );
}
