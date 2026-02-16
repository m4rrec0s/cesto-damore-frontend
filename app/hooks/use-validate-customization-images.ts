import { useCallback } from "react";
import { useApi } from "./use-api";

export interface ValidationResult {
  isValid: boolean;
  invalidImages: string[];
  message?: string;
}

/**
 * Hook para validar se as imagens de customização ainda existem no servidor
 * Se alguma imagem tiver sido deletada, retorna isValid=false e lista as imagens inválidas
 * Também valida se customizações obrigatórias têm imagens
 *
 * Uso:
 * const { validateCustomizationImages, removeInvalidImages } = useValidateCustomizationImages();
 *
 * const result = await validateCustomizationImages(cartCustomizations);
 * if (!result.isValid) {
 *   const cleaned = removeInvalidImages(cartCustomizations, result.invalidImages);
 *
 * }
 */
export function useValidateCustomizationImages() {
  const api = useApi();

  const validateCustomizationImages = useCallback(
    async (
      customizations: Array<{
        customization_type?: string;
        title?: string;
        is_required?: boolean;
        photos?: Array<{ preview_url?: string }>;
        image?: { preview_url?: string };
        text?: string;
      }>,
    ): Promise<ValidationResult> => {
      const invalidImages: string[] = [];
      const missingImages: string[] = [];

      if (!customizations || customizations.length === 0) {
        return { isValid: true, invalidImages: [] };
      }

      const urlsToValidate: Array<{
        url: string;
        customizationType: string;
        customizationTitle: string;
      }> = [];

      customizations.forEach((custom) => {
        const customizationType = custom.customization_type || "UNKNOWN";
        const customizationTitle = custom.title || customizationType;

        if (customizationType === "IMAGES" && custom.photos) {
          custom.photos.forEach((photo) => {
            if (photo.preview_url) {

              if (
                photo.preview_url.includes("/uploads/temp/") ||
                photo.preview_url.includes("https://api")
              ) {
                urlsToValidate.push({
                  url: photo.preview_url,
                  customizationType: "IMAGES",
                  customizationTitle,
                });
              }
            }
          });
        }

        if (customizationType === "DYNAMIC_LAYOUT") {
          if (custom.image?.preview_url) {
            if (
              custom.image.preview_url.includes("/uploads/temp/") ||
              custom.image.preview_url.includes("https://api")
            ) {
              urlsToValidate.push({
                url: custom.image.preview_url,
                customizationType: "DYNAMIC_LAYOUT",
                customizationTitle,
              });
            }
          } else if (custom.is_required) {

            missingImages.push(
              `${customizationTitle} - Imagem obrigatória não foi enviada`,
            );
          }
        }
      });

      if (missingImages.length > 0) {
        return {
          isValid: false,
          invalidImages: missingImages,
          message: `${
            missingImages.length
          } customização(ões) obrigatória(s) sem imagem:\n${missingImages.join(
            "\n",
          )}`,
        };
      }

      if (urlsToValidate.length === 0) {
        return { isValid: true, invalidImages: [] };
      }

      const validationPromises = urlsToValidate.map((item) =>
        api
          .validateTempImageExists(item.url)
          .then((exists) => ({
            url: item.url,
            exists,
            customizationType: item.customizationType,
            customizationTitle: item.customizationTitle,
          }))
          .catch(() => ({
            url: item.url,
            exists: false,
            customizationType: item.customizationType,
            customizationTitle: item.customizationTitle,
          })),
      );

      const results = await Promise.all(validationPromises);

      results.forEach((result) => {
        if (!result.exists) {
          invalidImages.push(result.url);
        }
      });

      if (invalidImages.length > 0) {
        return {
          isValid: false,
          invalidImages,
          message: `${invalidImages.length} imagem(ns) expirou(aram) ou foi(foram) deletada(s). Por favor, faça upload novamente.`,
        };
      }

      return { isValid: true, invalidImages: [] };
    },
    [api],
  );

  /**
   * Remove imagens inválidas do objeto de customização
   * Útil para limpar customizações após validação falhar
   */
  const removeInvalidImages = useCallback(
    (
      customizations: Array<{
        customization_type?: string;
        photos?: Array<{ preview_url?: string }>;
        image?: { preview_url?: string };
      }>,
      invalidImageUrls: string[],
    ) => {
      return customizations
        .map((custom) => {
          const clone = { ...custom };

          if (clone.customization_type === "IMAGES" && clone.photos) {
            clone.photos = clone.photos.filter(
              (photo) =>
                !invalidImageUrls.includes(photo.preview_url || "") &&
                photo.preview_url,
            );

            if (clone.photos.length === 0) {
              return null;
            }
          }

          if (clone.customization_type === "DYNAMIC_LAYOUT" && clone.image) {
            if (invalidImageUrls.includes(clone.image.preview_url || "")) {
              clone.image = undefined;
            }
          }

          return clone;
        })
        .filter((item) => item !== null);
    },
    [],
  );

  return {
    validateCustomizationImages,
    removeInvalidImages,
  };
}
