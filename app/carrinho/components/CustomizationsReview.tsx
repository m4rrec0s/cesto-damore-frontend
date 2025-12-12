"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Palette,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Download,
} from "lucide-react";
import type { CartCustomization } from "@/app/hooks/use-cart";
import Image from "next/image";

interface CustomizationsReviewProps {
  cartItems: Array<{
    product_id: string;
    product: {
      name: string;
      image_url?: string | null;
    };
    customizations?: CartCustomization[];
  }>;
}

interface ImageStatus {
  url: string;
  isValid: boolean;
  isChecking: boolean;
  error?: string;
}

export function CustomizationsReview({ cartItems }: CustomizationsReviewProps) {
  const [imageStates, setImageStates] = useState<Map<string, ImageStatus>>(
    new Map()
  );
  const [isValidating, setIsValidating] = useState(false);

  // Verificar se há itens com customizações
  const itemsWithCustomizations = cartItems.filter(
    (item) => item.customizations && item.customizations.length > 0
  );

  // Validar disponibilidade de imagens na VPS
  const validateImageUrl = async (url: string): Promise<boolean> => {
    if (!url) return false;

    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Iniciar validação de imagens quando o componente montar
  useEffect(() => {
    const validateAllImages = async () => {
      setIsValidating(true);
      const newStates = new Map<string, ImageStatus>();

      // Coletar todas as imagens
      for (const item of itemsWithCustomizations) {
        for (const custom of item.customizations || []) {
          if (custom.customization_type === "IMAGES" && custom.photos) {
            for (const photo of custom.photos) {
              const url = photo.preview_url || photo.base64;
              if (url && !newStates.has(url)) {
                newStates.set(url, {
                  url,
                  isValid: false,
                  isChecking: true,
                });
              }
            }
          }
        }
      }

      // Validar cada imagem
      for (const [url] of newStates) {
        const isValid = await validateImageUrl(url);
        newStates.set(url, {
          url,
          isValid,
          isChecking: false,
          error: isValid ? undefined : "Imagem expirada ou indisponível",
        });
      }

      setImageStates(newStates);
      setIsValidating(false);
    };

    if (itemsWithCustomizations.length > 0) {
      validateAllImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  // Verificar customizações obrigatórias faltantes
  const missingRequired = itemsWithCustomizations.flatMap((item) =>
    (item.customizations || [])
      .filter((c) => c.is_required)
      .filter((c) => {
        // Validar se está preenchido
        if (c.customization_type === "TEXT") {
          return !c.text || c.text.trim().length === 0;
        }
        if (c.customization_type === "MULTIPLE_CHOICE") {
          return !c.selected_option;
        }
        if (c.customization_type === "BASE_LAYOUT") {
          return !c.label_selected && !c.selected_item;
        }
        if (c.customization_type === "IMAGES") {
          return !c.photos || c.photos.length === 0;
        }
        return false;
      })
      .map((c) => ({ product: item.product.name, customization: c.title }))
  );

  // Verificar imagens expiradas
  const expiredImages = itemsWithCustomizations.flatMap((item) =>
    (item.customizations || [])
      .filter((c) => c.customization_type === "IMAGES")
      .filter((c) => {
        if (!c.photos) return false;
        return c.photos.some((photo) => {
          const url = photo.preview_url || photo.base64 || "";
          if (!url) return false;
          const status = imageStates.get(url);
          return status && !status.isValid && !status.isChecking;
        });
      })
      .map((c) => ({ product: item.product.name, customization: c.title }))
  );

  if (itemsWithCustomizations.length === 0) {
    return null; // Não mostrar nada se não houver customizações
  }

  const hasErrors = missingRequired.length > 0 || expiredImages.length > 0;
  const isStillValidating = isValidating;

  return (
    <Card
      className={
        hasErrors ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-rose-600" />
          Revisão de Personalizações
          {isStillValidating ? (
            <Badge className="ml-auto bg-blue-600">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Validando...
            </Badge>
          ) : hasErrors ? (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              {missingRequired.length + expiredImages.length} problema(s)
            </Badge>
          ) : (
            <Badge className="ml-auto bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Erros de customizações obrigatórias */}
        {missingRequired.length > 0 && (
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-r-lg">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Personalizações Obrigatórias Pendentes
            </h4>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              {missingRequired.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.product}:</strong> {item.customization}
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-3">
              Volte à página do produto e preencha as personalizações
              obrigatórias antes de continuar.
            </p>
          </div>
        )}

        {/* Erros de imagens expiradas */}
        {expiredImages.length > 0 && (
          <div className="bg-white border-l-4 border-orange-500 p-4 rounded-r-lg">
            <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Imagens Expiradas
            </h4>
            <p className="text-sm text-orange-700 mb-2">
              Algumas imagens temporárias expiraram. É necessário enviar
              novamente:
            </p>
            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
              {expiredImages.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.product}:</strong> {item.customization}
                </li>
              ))}
            </ul>
            <p className="text-xs text-orange-600 mt-3">
              Volte à página do produto e envie as imagens novamente.
            </p>
          </div>
        )}

        {/* Detalhes das customizações */}
        <div className="space-y-3">
          {itemsWithCustomizations.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-lg border border-gray-200"
            >
              <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {item.product.name}
                <Badge variant="outline" className="text-xs">
                  {item.customizations?.length || 0} personalização(ões)
                </Badge>
              </h5>
              <div className="space-y-3">
                {item.customizations?.map((custom, cidx) => {
                  const isFilled = (() => {
                    if (custom.customization_type === "TEXT") {
                      return custom.text && custom.text.trim().length > 0;
                    }
                    if (custom.customization_type === "MULTIPLE_CHOICE") {
                      return Boolean(custom.selected_option);
                    }
                    if (custom.customization_type === "BASE_LAYOUT") {
                      return Boolean(
                        custom.label_selected || custom.selected_item
                      );
                    }
                    if (custom.customization_type === "IMAGES") {
                      return custom.photos && custom.photos.length > 0;
                    }
                    return true;
                  })();

                  const hasExpiredImages = (() => {
                    if (
                      custom.customization_type === "IMAGES" &&
                      custom.photos
                    ) {
                      return custom.photos.some((photo) => {
                        const url = photo.preview_url || photo.base64 || "";
                        if (!url) return false;
                        const status = imageStates.get(url);
                        return status && !status.isValid && !status.isChecking;
                      });
                    }
                    return false;
                  })();

                  return (
                    <div
                      key={cidx}
                      className={`p-4 rounded border space-y-3 ${
                        custom.is_required && !isFilled
                          ? "border-red-300 bg-red-50"
                          : hasExpiredImages
                          ? "border-orange-300 bg-orange-50"
                          : "border-gray-200"
                      }`}
                    >
                      {/* Cabeçalho da customização */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {custom.title}
                            </span>
                            {custom.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isFilled && !hasExpiredImages ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : custom.is_required && !isFilled ? (
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        ) : hasExpiredImages ? (
                          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                      </div>

                      {/* Conteúdo da customização com preview */}
                      <div className="text-sm space-y-2">
                        {/* TEXT */}
                        {custom.customization_type === "TEXT" && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium mb-1">
                              📝 Mensagem:
                            </p>
                            {custom.text ? (
                              <p className="text-gray-900 italic font-medium">
                                &quot;{custom.text}&quot;
                              </p>
                            ) : (
                              <p className="text-red-600 font-semibold">
                                ⚠️ Não preenchido
                              </p>
                            )}
                          </div>
                        )}

                        {/* MULTIPLE_CHOICE */}
                        {custom.customization_type === "MULTIPLE_CHOICE" && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded border border-purple-200">
                            <p className="text-xs text-purple-600 font-medium mb-1">
                              🎯 Opção Selecionada:
                            </p>
                            {custom.selected_option ? (
                              <p className="text-gray-900 font-medium">
                                {custom.label_selected ||
                                  custom.selected_option_label ||
                                  custom.selected_option}
                              </p>
                            ) : (
                              <p className="text-red-600 font-semibold">
                                ⚠️ Não selecionado
                              </p>
                            )}
                          </div>
                        )}

                        {/* BASE_LAYOUT */}
                        {custom.customization_type === "BASE_LAYOUT" && (
                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded border border-yellow-200">
                            <p className="text-xs text-yellow-700 font-medium mb-1">
                              🎨 Layout Selecionado:
                            </p>
                            {custom.label_selected || custom.selected_item ? (
                              <p className="text-gray-900 font-medium">
                                {custom.label_selected ||
                                  (typeof custom.selected_item === "string"
                                    ? custom.selected_item
                                    : custom.selected_item?.selected_item ||
                                      "Layout")}
                              </p>
                            ) : (
                              <p className="text-red-600 font-semibold">
                                ⚠️ Não selecionado
                              </p>
                            )}
                          </div>
                        )}

                        {/* IMAGES */}
                        {custom.customization_type === "IMAGES" && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 font-medium flex items-center gap-1">
                              <ImageIcon className="h-4 w-4" />
                              Fotos enviadas ({custom.photos?.length || 0})
                            </div>
                            {custom.photos && custom.photos.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {custom.photos.map((photo, pidx) => {
                                  const photoUrl =
                                    photo.preview_url || photo.base64;
                                  const imageStatus = imageStates.get(
                                    photoUrl || ""
                                  );
                                  const isExpired =
                                    imageStatus &&
                                    !imageStatus.isValid &&
                                    !imageStatus.isChecking;

                                  return (
                                    <div
                                      key={pidx}
                                      className={`relative w-full aspect-square rounded border-2 overflow-hidden group ${
                                        isExpired
                                          ? "border-orange-300 bg-orange-50"
                                          : "border-green-300 bg-green-50"
                                      }`}
                                    >
                                      {imageStatus?.isChecking && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                                          <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                        </div>
                                      )}
                                      {photoUrl && (
                                        <>
                                          {photoUrl.startsWith("data:") ? (
                                            <Image
                                              src={photoUrl}
                                              alt={`Foto ${pidx + 1}`}
                                              fill
                                              className={`object-cover transition-opacity ${
                                                imageStatus?.isChecking
                                                  ? "opacity-50"
                                                  : ""
                                              }`}
                                            />
                                          ) : (
                                            <Image
                                              src={photoUrl}
                                              alt={`Foto ${pidx + 1}`}
                                              fill
                                              className={`object-cover transition-opacity ${
                                                imageStatus?.isChecking
                                                  ? "opacity-50"
                                                  : isExpired
                                                  ? "opacity-40"
                                                  : ""
                                              }`}
                                              onError={() => {
                                                setImageStates((prev) => {
                                                  const newStates = new Map(
                                                    prev
                                                  );
                                                  if (photoUrl) {
                                                    newStates.set(photoUrl, {
                                                      url: photoUrl,
                                                      isValid: false,
                                                      isChecking: false,
                                                      error:
                                                        "Falha ao carregar imagem",
                                                    });
                                                  }
                                                  return newStates;
                                                });
                                              }}
                                            />
                                          )}
                                        </>
                                      )}
                                      {isExpired && (
                                        <div className="absolute inset-0 bg-orange-600/20 flex items-center justify-center">
                                          <AlertTriangle className="h-5 w-5 text-orange-700" />
                                        </div>
                                      )}
                                      {/* Google Drive Link */}
                                      {photo.google_drive_url && (
                                        <a
                                          href={photo.google_drive_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-blue-600/90 py-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                          title="Abrir no Google Drive"
                                        >
                                          <Download className="h-3 w-3" />
                                          <span className="text-xs font-medium">
                                            Drive
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-red-600 font-semibold">
                                ⚠️ Nenhuma foto enviada
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Aviso de imagem expirada */}
                      {hasExpiredImages && (
                        <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800 font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Imagens temporárias expiraram. Envie novamente na
                          página do produto.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sucesso */}
        {!hasErrors && !isStillValidating && (
          <div className="bg-white border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                <strong>Tudo certo!</strong> Todas as personalizações foram
                validadas e estão prontas.
              </span>
            </p>
          </div>
        )}

        {/* Bloqueio de checkout se houver erros */}
        {hasErrors && !isStillValidating && (
          <div className="pt-4 border-t border-red-200">
            <p className="text-xs text-red-700 font-semibold mb-3">
              ⚠️ Você não pode prosseguir com erros nas personalizações. Corrija
              os problemas acima antes de continuar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function validateCustomizations(
  cartItems: Array<{
    customizations?: CartCustomization[];
  }>
): boolean {
  const itemsWithCustomizations = cartItems.filter(
    (item) => item.customizations && item.customizations.length > 0
  );

  for (const item of itemsWithCustomizations) {
    for (const custom of item.customizations || []) {
      if (!custom.is_required) continue;

      if (custom.customization_type === "TEXT") {
        if (!custom.text || custom.text.trim().length === 0) return false;
      } else if (custom.customization_type === "MULTIPLE_CHOICE") {
        if (!custom.selected_option) return false;
      } else if (custom.customization_type === "BASE_LAYOUT") {
        if (!custom.label_selected && !custom.selected_item) return false;
      } else if (custom.customization_type === "IMAGES") {
        if (!custom.photos || custom.photos.length === 0) return false;
      }
    }
  }

  return true;
}
