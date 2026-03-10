"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, CheckCircle2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CartCustomization } from "@/app/hooks/use-cart";
import { useApi, type CustomizationTypeValue } from "@/app/hooks/use-api";
import type { PhotoUploadData } from "@/app/hooks/use-customization";
import { ItemCustomizationModal } from "@/app/produto/[id]/components/itemCustomizationsModal";
import type {
  CustomizationInput,
  CustomizationType,
  SaveOrderItemCustomizationPayload,
} from "@/app/types/customization";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/card";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(
  /\/api\/?$/,
  "",
);

interface CartItemForReview {
  product_id: string;
  product: {
    name: string;
    image_url?: string | null;
  };

  additionals?: {
    id: string;
    item_id?: string;
    item?: { id: string; name: string };
    name?: string;
  }[];
  customizations?: CartCustomization[];
}

interface CustomizationsReviewProps {
  cartItems: CartItemForReview[];
  orderId?: string | null;
  onCustomizationUpdate?: (
    productId: string,
    customizations: CustomizationInput[],
    componentId?: string,
  ) => void;
  onCustomizationSaved?: () => void;
  onValidationStatusChange?: (status: {
    valid: boolean;
    source: "backend" | "local";
    recommendations?: string[];
    missingRequired?: CheckoutValidationIssue[];
    invalidCustomizations?: CheckoutValidationIssue[];
  }) => void;
}

interface AvailableCustomization {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  itemId: string;
  itemName: string;
  componentId: string;
  isAdditional?: boolean;
  customizationData?: Record<string, unknown>;
}

interface ProductValidation {
  orderItemId?: string;
  productId: string;
  productName: string;
  availableCustomizations: AvailableCustomization[];
  filledCustomizations: CartCustomization[];
  missingRequired: AvailableCustomization[];
  isComplete: boolean;
}

interface CheckoutValidationIssue {
  orderItemId?: string;
  productName?: string;
  itemName?: string;
  componentId?: string;
  customizationId?: string;
  customizationName?: string;
  reason: string;
}

interface CustomizationPreview {
  preview_url?: string;
  url?: string;
}

interface PersonalizationData {
  customization_type?: CustomizationTypeValue;
  title?: string;
  _customizationName?: string;
  is_required?: boolean | number;
  text?: string;
  photos?: PhotoUploadData[];
  previews?: string[];
  temp_file_ids?: Array<string | null | undefined>;
  selected_option?: string;
  selected_item_label?: string;
  selected_option_label?: string;
  label_selected?: string;
  componentId?: string;
  final_artwork?: CustomizationPreview;
  image?: CustomizationPreview;
  final_artworks?: CustomizationPreview[];
  previewUrl?: string;
  images?: Array<Record<string, unknown>>;
  count?: number;
  required_count?: number;
  [key: string]: unknown;
}

interface ModalCustomization {
  id: string;
  name: string;
  description?: string;
  type: "DYNAMIC_LAYOUT" | "TEXT" | "IMAGES" | "MULTIPLE_CHOICE";
  isRequired: boolean;
  price: number;
  customization_data: Record<string, unknown>;
}

type Customization = ModalCustomization;

const getCustomizationRuleId = (
  customization:
    | Pick<CartCustomization, "customization_id" | "data">
    | Record<string, unknown>
    | undefined,
): string | null => {
  if (!customization) return null;

  const directId =
    "customization_id" in customization
      ? customization.customization_id
      : undefined;
  if (typeof directId === "string" && directId.length > 0) {
    return directId.split(":")[0];
  }

  const data =
    (customization.data as Record<string, unknown> | undefined) ||
    (customization as Record<string, unknown>);
  const nestedId =
    (data.customizationRuleId as string) ||
    (data.ruleId as string) ||
    (data.customization_rule_id as string) ||
    null;

  return nestedId;
};

const normalizeAvailableCustomization = (
  customization: Record<string, unknown>,
): AvailableCustomization => ({
  id: (customization.id as string) || "",
  name: (customization.name as string) || "Personalização",
  type: mapCustomizationType((customization.type as string) || "TEXT"),
  isRequired: Boolean(customization.isRequired),
  itemId: (customization.itemId as string) || "",
  itemName: (customization.itemName as string) || "Item",
  componentId:
    (customization.componentId as string) ||
    (customization.itemId as string) ||
    "",
  isAdditional: Boolean(customization.isAdditional),
  customizationData: (customization.customizationData as Record<
    string,
    unknown
  >) ||
    (customization.customization_data as Record<string, unknown>) || {
      dynamic_layout: {
        max_images:
          (customization.max_images as number) ||
          (customization.max_files as number) ||
          (customization.max_items as number) ||
          (customization.maxItems as number) ||
          0,
      },
    },
});

const getRequiredImageCount = (
  customization?: Pick<AvailableCustomization, "customizationData">,
): number => {
  const customizationData = customization?.customizationData;
  const dynamicLayout = customizationData?.dynamic_layout as
    | { max_images?: number }
    | undefined;
  return (
    dynamicLayout?.max_images ||
    (customizationData?.max_images as number) ||
    (customizationData?.max_files as number) ||
    (customizationData?.max_items as number) ||
    (customizationData?.maxItems as number) ||
    0
  );
};

const buildPhotosFromPersonalizationData = (
  data: PersonalizationData,
): PhotoUploadData[] => {
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    return data.photos;
  }

  const previews = Array.isArray(data.previews) ? data.previews : [];
  const tempFileIds = Array.isArray(data.temp_file_ids)
    ? data.temp_file_ids
    : [];

  return previews
    .filter(
      (preview): preview is string =>
        typeof preview === "string" && preview.trim().length > 0,
    )
    .map((preview, index) => ({
      preview_url: preview,
      original_name: `image-${index + 1}`,
      position: index,
      temp_file_id:
        typeof tempFileIds[index] === "string" && tempFileIds[index]
          ? tempFileIds[index]
          : `persisted-${index}`,
    }));
};

const normalizeAssetUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${trimmed}` : trimmed;
  }

  return trimmed;
};

const isPersistedImageUrl = (value: string | undefined): boolean => {
  if (!value) return false;
  return !value.startsWith("data:") && !value.startsWith("blob:");
};

const getImageEntryKey = (
  photo: PhotoUploadData | Record<string, unknown>,
  index: number,
): string => {
  const candidate = photo as Record<string, unknown>;
  const tempFileId = candidate.temp_file_id;
  const previewUrl = candidate.preview_url;
  const url = candidate.url;

  if (typeof tempFileId === "string" && tempFileId.trim().length > 0) {
    return `temp:${tempFileId}`;
  }
  if (typeof previewUrl === "string" && previewUrl.trim().length > 0) {
    return `preview:${previewUrl}`;
  }
  if (typeof url === "string" && url.trim().length > 0) {
    return `url:${url}`;
  }

  return `index:${index}`;
};

const getUniqueImageEntries = (
  custom: CartCustomization | undefined,
): PhotoUploadData[] => {
  if (!custom) return [];

  const data = (custom.data as Record<string, unknown>) || {};
  const photos = [
    ...(Array.isArray(custom.photos) ? custom.photos : []),
    ...(Array.isArray(data.photos) ? (data.photos as PhotoUploadData[]) : []),
  ];

  const seen = new Set<string>();

  return photos.filter((photo, index) => {
    const key = getImageEntryKey(photo, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildNormalizedImageData = (
  source: PersonalizationData,
  fallbackPhotos?: PhotoUploadData[],
): PersonalizationData => {
  const photosSource =
    Array.isArray(source.photos) && source.photos.length > 0
      ? source.photos
      : Array.isArray(fallbackPhotos) && fallbackPhotos.length > 0
        ? fallbackPhotos
        : buildPhotosFromPersonalizationData(source);

  const seen = new Set<string>();
  const photos = photosSource
    .map((photo, index) => ({
      ...photo,
      preview_url: normalizeAssetUrl(photo.preview_url),
      url: normalizeAssetUrl((photo as { url?: string }).url),
      position: typeof photo.position === "number" ? photo.position : index,
    }))
    .filter((photo, index) => {
      const key = getImageEntryKey(photo, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const previews = Array.isArray(source.previews)
    ? source.previews
        .map((preview) => normalizeAssetUrl(preview))
        .filter((preview): preview is string => Boolean(preview))
    : photos
        .map(
          (photo) =>
            photo.preview_url ||
            normalizeAssetUrl((photo as { url?: string }).url),
        )
        .filter((preview): preview is string => Boolean(preview));

  return {
    ...source,
    photos,
    previews,
    temp_file_ids: Array.isArray(source.temp_file_ids)
      ? source.temp_file_ids
      : photos.map((photo) => photo.temp_file_id),
    count: photos.length,
  };
};

const getUploadedImageCount = (
  custom: CartCustomization | undefined,
): number => {
  if (!custom) return 0;

  const data = (custom.data as Record<string, unknown>) || {};
  const validPhotoUrls = getUniqueImageEntries(custom).filter(
    (photo) =>
      !!photo?.temp_file_id ||
      isPersistedImageUrl(photo?.preview_url) ||
      isPersistedImageUrl((photo as unknown as { url?: string }).url),
  ).length;

  const previews = Array.isArray(data.previews)
    ? (data.previews as string[]).filter((preview) =>
        isPersistedImageUrl(preview),
      ).length
    : 0;

  return validPhotoUrls > 0 ? validPhotoUrls : previews;
};

const isCustomizationFilled = (
  custom: CartCustomization | undefined,
  available?: AvailableCustomization,
): boolean => {
  if (!custom) return false;

  const data = (custom.data as any) || {};

  switch (custom.customization_type) {
    case "TEXT": {
      const text = custom.text?.trim() || "";
      return text.length >= 2;
    }
    case "MULTIPLE_CHOICE": {
      const hasOption = !!(
        custom.selected_option ||
        data.id ||
        data.selected_option_id
      );
      const hasLabel = !!(
        custom.label_selected ||
        custom.selected_option_label ||
        data.selected_option_label ||
        data.label ||
        custom.text
      );
      return hasOption || hasLabel;
    }
    case "IMAGES": {
      const requiredImageCount = getRequiredImageCount(available);
      const uploadedImageCount = getUploadedImageCount(custom);

      if (requiredImageCount > 0) {
        return uploadedImageCount >= requiredImageCount;
      }

      return uploadedImageCount > 0;
    }
    case "DYNAMIC_LAYOUT": {
      const fabricState = data.fabricState;
      const artworkUrl =
        custom.text ||
        data.image?.preview_url ||
        data.previewUrl ||
        data.finalArtwork?.preview_url ||
        data.final_artwork?.preview_url ||
        data.final_artworks?.[0]?.preview_url;

      const hasArtwork =
        !!artworkUrl &&
        !artworkUrl.startsWith("blob:") &&
        !artworkUrl.startsWith("data:");
      const hasFabric =
        !!fabricState &&
        (typeof fabricState === "string" ? fabricState.length > 20 : true);
      const hasLabel = !!(
        custom.label_selected ||
        custom.selected_item_label ||
        data.selected_item_label ||
        data.label_selected
      );

      return hasArtwork || hasFabric || hasLabel;
    }
    default:
      return !!custom.text || Object.keys(data).length > 0;
  }
};

const getCustomizationHint = (
  customization: AvailableCustomization,
  filled?: CartCustomization,
): string => {
  const requiredImageCount = getRequiredImageCount(customization);
  const uploadedImageCount = getUploadedImageCount(filled);
  const hints: Record<string, string> = {
    TEXT: `Digite um texto personalizado (mínimo 3 caracteres)`,
    MULTIPLE_CHOICE: `Selecione uma opção disponível`,
    IMAGES:
      requiredImageCount > 0
        ? `Envie ${requiredImageCount} foto(s). Atual: ${uploadedImageCount}/${requiredImageCount}`
        : `Envie pelo menos 1 foto (clique para fazer upload)`,
    DYNAMIC_LAYOUT: `Escolha um design e personalize-o (não esqueça de salvar)`,
  };

  return (
    hints[customization.type] ||
    `Complete a personalização "${customization.name}"`
  );
};

const extractCleanText = (text: string | undefined): string => {
  if (!text) return "";

  let cleaned = text;

  if (cleaned.startsWith("field-")) {
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex !== -1) {
      cleaned = cleaned.substring(colonIndex + 1).trim();

      const commaIndex = cleaned.indexOf(",");
      if (commaIndex !== -1) {
        cleaned = cleaned.substring(0, commaIndex).trim();
      }
    }
  }

  if (cleaned.includes(", text: ")) {
    const textMatch = cleaned.match(/,\s*text:\s*([^,]+)/);
    if (textMatch && textMatch[1]) {
      cleaned = textMatch[1].trim();
    }
  }

  if (cleaned.startsWith('"text: ') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(7, -1);
  } else if (cleaned.startsWith("text: ")) {
    cleaned = cleaned.substring(6);
  }

  try {
    if (cleaned.startsWith("{")) {
      const obj = JSON.parse(cleaned);
      if (obj.text) return obj.text;

      for (const key of Object.keys(obj)) {
        if (key.startsWith("field-")) {
          return obj[key];
        }
      }
    }
  } catch {}

  return cleaned;
};

const getCustomizationSummary = (custom: CartCustomization): string => {
  const data = (custom.data as Record<string, unknown>) || {};

  const getTextFallback = () => {
    const directText = extractCleanText(custom.text);
    if (directText) return directText;

    const dataText = extractCleanText((data.text as string) || "");
    if (dataText) return dataText;

    const fieldValues = Object.entries(data)
      .filter(([key, value]) => key.startsWith("field-") && !!value)
      .map(([, value]) => String(value).trim())
      .filter(Boolean);

    return fieldValues.join(" | ");
  };

  switch (custom.customization_type) {
    case "TEXT": {
      const cleanText = getTextFallback();
      return cleanText ? `Texto: "${cleanText}"` : "";
    }
    case "MULTIPLE_CHOICE":
      return (
        custom.label_selected ||
        custom.selected_option_label ||
        (data.selected_option_label as string) ||
        (data.label as string) ||
        (data.selected_option as string) ||
        ""
      );
    case "IMAGES":
      return getUploadedImageCount(custom) > 0
        ? `${getUploadedImageCount(custom)} foto(s)`
        : "";
    case "DYNAMIC_LAYOUT":
      return (
        custom.label_selected ||
        custom.selected_item_label ||
        (data.layout_name as string) ||
        "Design personalizado"
      );
    default:
      if (!isCustomizationFilled(custom)) return "";
      return "";
  }
};

const getCustomizationImageUrls = (custom: CartCustomization): string[] => {
  const data = (custom.data as Record<string, unknown>) || {};
  const urls: string[] = [];

  const addIfUrl = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      const normalized = normalizeAssetUrl(value);
      if (normalized) {
        urls.push(normalized);
      }
    }
  };

  if (Array.isArray(custom.photos)) {
    custom.photos.forEach((photo) => {
      addIfUrl(photo.preview_url);
      addIfUrl((photo as unknown as { url?: string }).url);
    });
  }

  const dataPhotos = data.photos;
  if (Array.isArray(dataPhotos)) {
    dataPhotos.forEach((photo) => {
      if (typeof photo === "string") addIfUrl(photo);
      if (typeof photo === "object" && photo !== null) {
        const p = photo as Record<string, unknown>;
        addIfUrl(p.preview_url);
        addIfUrl(p.url);
        addIfUrl(p.base64);
      }
    });
  }

  const dataImages = data.images;
  if (Array.isArray(dataImages)) {
    dataImages.forEach((image) => {
      if (typeof image === "string") addIfUrl(image);
      if (typeof image === "object" && image !== null) {
        const img = image as Record<string, unknown>;
        addIfUrl(img.preview_url);
        addIfUrl(img.url);
      }
    });
  }

  if (custom.customization_type === "DYNAMIC_LAYOUT") {
    addIfUrl(custom.text);
    addIfUrl(data.previewUrl);
    if (typeof data.final_artwork === "object" && data.final_artwork) {
      addIfUrl((data.final_artwork as Record<string, unknown>).preview_url);
    }
    if (typeof data.image === "object" && data.image) {
      addIfUrl((data.image as Record<string, unknown>).preview_url);
    }
  }

  return [...new Set(urls)];
};

const shouldShowMissingFileFallback = (
  customization: CartCustomization,
  fileValidation: Record<string, boolean>,
): boolean => {
  if (!customization.id || fileValidation[customization.id] !== false) {
    return false;
  }

  return getCustomizationImageUrls(customization).length === 0;
};

const isSameComponent = (
  filled: CartCustomization | undefined,
  available: AvailableCustomization,
): boolean => {
  const expectedComponentId = available.componentId || available.itemId;
  if (!expectedComponentId) return true;
  if (!filled?.componentId) return true;
  return filled.componentId === expectedComponentId;
};

const mapCustomizationType = (backendType: string): string => {
  const typeMap: Record<string, string> = {
    IMAGES: "IMAGES",
    TEXT: "TEXT",
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    DYNAMIC_LAYOUT: "DYNAMIC_LAYOUT",
  };
  return typeMap[backendType] || backendType;
};

const CustomizationFallback = ({
  customization,
  onEdit,
}: {
  customization: CartCustomization;
  onEdit: () => void;
}) => {
  return (
    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-800">
            Arquivo não encontrado: {customization.title}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Os arquivos desta personalização não estão mais disponíveis. Por
            favor, edite e faça o upload novamente.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-100"
        >
          Corrigir
        </Button>
      </div>
    </div>
  );
};

export function CustomizationsReview({
  cartItems,
  orderId,
  onCustomizationUpdate,
  onCustomizationSaved,
  onValidationStatusChange,
}: CustomizationsReviewProps) {
  const validationStatusChangeRef = useRef(onValidationStatusChange);
  useEffect(() => {
    validationStatusChangeRef.current = onValidationStatusChange;
  }, [onValidationStatusChange]);

  const {
    getProduct,
    getItemCustomizations,
    saveOrderItemCustomization,
    getOrderReviewData,
    validateOrderCustomizationsFiles,
  } = useApi();

  const [validations, setValidations] = useState<ProductValidation[]>([]);
  const [fileValidation, setFileValidation] = useState<Record<string, boolean>>(
    {},
  );
  const [backendValidationState, setBackendValidationState] = useState<{
    valid?: boolean;
    recommendations?: string[];
    missingRequired?: CheckoutValidationIssue[];
    invalidCustomizations?: CheckoutValidationIssue[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemName, setActiveItemName] = useState<string>("");
  const [activeCustomizations, setActiveCustomizations] = useState<
    Customization[]
  >([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeOrderItemId, setActiveOrderItemId] = useState<string | null>(
    null,
  );
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = useState(0);

  const fetchFileValidation = useCallback(async () => {
    if (!orderId) return;
    try {
      const result = await validateOrderCustomizationsFiles(orderId);
      if (result && result.files) {
        setFileValidation(result.files);
      }
      if (result && typeof result.valid === "boolean") {
        setBackendValidationState({
          valid: result.valid,
          recommendations: result.recommendations,
          missingRequired: result.missingRequired,
          invalidCustomizations: result.invalidCustomizations,
        });
        validationStatusChangeRef.current?.({
          valid: result.valid,
          source: "backend",
          recommendations: result.recommendations,
          missingRequired: result.missingRequired,
          invalidCustomizations: result.invalidCustomizations,
        });
      }
      return result;
    } catch (error) {
      console.error("Erro ao validar arquivos:", error);
      return null;
    }
  }, [orderId, validateOrderCustomizationsFiles]);

  const [activeInitialValues, setActiveInitialValues] = useState<
    Record<string, unknown>
  >({});

  const fetchAvailableCustomizations = useCallback(async () => {
    setIsLoading(true);

    if (orderId) {
      try {
        const [, reviewData] = await Promise.all([
          fetchFileValidation(),
          getOrderReviewData(orderId),
        ]);

        const results: ProductValidation[] = reviewData.map((data: any) => {
          const availableCustomizations = Array.isArray(
            data.availableCustomizations,
          )
            ? data.availableCustomizations.map(
                (avail: Record<string, unknown>): AvailableCustomization =>
                  normalizeAvailableCustomization(avail),
              )
            : [];

          const filled: CartCustomization[] = data.filledCustomizations.map(
            (f: any) => {
              const val = (f.value || {}) as PersonalizationData;

              const normalizedRuleId = getCustomizationRuleId({
                customization_id: f.customization_id,
                data: val,
              });

              const rule = availableCustomizations.find(
                (avail: AvailableCustomization) =>
                  avail.id === normalizedRuleId ||
                  f.customization_id === avail.componentId ||
                  (val.title &&
                    val.title.toLowerCase() === avail.name.toLowerCase()),
              );

              const inferredType =
                (rule?.type as CustomizationTypeValue) || "TEXT";

              return {
                id: f.id,
                customization_id: f.customization_id,
                customization_type:
                  (val.customization_type as CustomizationTypeValue) ||
                  inferredType,
                title:
                  (val.title as string) ||
                  rule?.name ||
                  (val._customizationName as string) ||
                  (val.label_selected as string) ||
                  "Personalização",
                is_required: Boolean(val.is_required || rule?.isRequired),
                text: val.text as string | undefined,
                photos: val.photos as PhotoUploadData[] | undefined,
                selected_option: val.selected_option as string | undefined,
                selected_item_label: val.selected_item_label as
                  | string
                  | undefined,
                label_selected:
                  (val.label_selected as string) ||
                  (val.selected_item_label as string) ||
                  (val.selected_option_label as string) ||
                  (val.text as string) ||
                  undefined,
                componentId: (val.componentId as string) || rule?.componentId,
                data: buildNormalizedImageData(val),
              };
            },
          );

          const missingRequired = availableCustomizations.filter(
            (avail: AvailableCustomization) => {
              const filledCustom = filled.find(
                (f) =>
                  (getCustomizationRuleId(f) === avail.id ||
                    f.title?.toLowerCase() === avail.name?.toLowerCase() ||
                    (f.data?.title as string)?.toLowerCase() ===
                      avail.name?.toLowerCase()) &&
                  isSameComponent(f, avail),
              );

              const isFilled = isCustomizationFilled(filledCustom, avail);
              return avail.isRequired && !isFilled;
            },
          );

          return {
            orderItemId: data.orderItemId,
            productId: data.productId,
            productName: data.productName,
            availableCustomizations,
            filledCustomizations: filled,
            missingRequired,
            isComplete: missingRequired.length === 0,
          };
        });

        setValidations(results);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("Erro ao buscar dados de revisão consolidados:", error);
        setValidations([]);
        setBackendValidationState({
          valid: false,
          recommendations: [
            "Não foi possível validar as personalizações no servidor. Tente novamente antes de prosseguir para o pagamento.",
          ],
          missingRequired: [],
          invalidCustomizations: [
            {
              reason:
                "Falha ao carregar a validação das personalizações diretamente do pedido.",
            },
          ],
        });
        validationStatusChangeRef.current?.({
          valid: false,
          source: "backend",
          recommendations: [
            "Não foi possível validar as personalizações no servidor. Tente novamente antes de prosseguir para o pagamento.",
          ],
          missingRequired: [],
          invalidCustomizations: [
            {
              reason:
                "Falha ao carregar a validação das personalizações diretamente do pedido.",
            },
          ],
        });
        setIsLoading(false);
        return;
      }
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id))];
    const results: ProductValidation[] = [];

    for (const productId of productIds) {
      const cartItem = cartItems.find((i) => i.product_id === productId);
      if (!cartItem) continue;

      try {
        const product = await getProduct(productId);
        const allAvailable: AvailableCustomization[] = [];

        if (product.components && product.components.length > 0) {
          for (const component of product.components) {
            if (!component.item_id || !component.item?.id) {
              console.warn(`Componente sem item_id válido:`, component);
              continue;
            }

            try {
              const configResponse = await getItemCustomizations(
                component.item_id,
              );
              const itemCustomizations = configResponse?.customizations || [];

              const mapped = itemCustomizations.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: mapCustomizationType(c.type),
                isRequired: c.isRequired,
                itemId: component.item_id,
                itemName:
                  configResponse?.item?.name || component.item?.name || "Item",
                componentId: component.id,
                isAdditional: false,
                customizationData: c.customization_data,
              }));

              allAvailable.push(...mapped);
            } catch (itemError) {
              console.warn(
                `Erro ao buscar customizações do item ${component.item_id}:`,
                itemError,
              );
            }
          }
        }

        if (cartItem.additionals && cartItem.additionals.length > 0) {
          for (const additional of cartItem.additionals) {
            if (!additional.item_id && !additional.item?.id) continue;
            const targetItemId = additional.item_id || additional.item?.id;

            if (!targetItemId) continue;

            try {
              const configResponse = await getItemCustomizations(targetItemId);
              const itemCustomizations = configResponse?.customizations || [];

              const mapped = itemCustomizations.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: mapCustomizationType(c.type),
                isRequired: c.isRequired,
                itemId: targetItemId,
                itemName:
                  additional.name ||
                  additional.item?.name ||
                  configResponse?.item?.name ||
                  "Adicional",
                componentId: additional.id,
                isAdditional: true,
                customizationData: c.customization_data,
              }));
              allAvailable.push(...mapped);
            } catch (err) {
              console.warn(`Erro customização adicional ${targetItemId}`, err);
            }
          }
        }

        const filled = cartItem.customizations || [];

        const missingRequired = allAvailable.filter((avail) => {
          const filledCustom = filled.find(
            (f) =>
              (f.customization_id === avail.id ||
                f.customization_id?.includes(avail.id)) &&
              (!f.componentId ||
                f.componentId === avail.componentId ||
                f.componentId === avail.itemId),
          );

          if (avail.isRequired && !isCustomizationFilled(filledCustom, avail)) {
            return true;
          }

          return false;
        });

        results.push({
          productId,
          productName: cartItem.product.name,
          availableCustomizations: allAvailable,
          filledCustomizations: filled,
          missingRequired,

          isComplete: missingRequired.length === 0,
        });
      } catch (error) {
        console.error(
          `Erro ao buscar customizações do produto ${productId}:`,
          error,
        );

        const filled = cartItem.customizations || [];
        const missingFromFilled = filled.filter(
          (f) => f.is_required && !isCustomizationFilled(f),
        );

        results.push({
          productId,
          productName: cartItem.product.name,
          availableCustomizations: [],
          filledCustomizations: filled,
          missingRequired: missingFromFilled.map((f) => ({
            id: f.customization_id || "",
            name: f.title,
            type: f.customization_type,
            isRequired: true,
            itemId: "",
            itemName: "",
            componentId: "",
          })),
          isComplete: missingFromFilled.length === 0,
        });
      }
    }

    setValidations(results);
    validationStatusChangeRef.current?.({
      valid: results.every((r) => r.isComplete),
      source: "local",
    });
    setIsLoading(false);
  }, [
    cartItems,
    orderId,
    getProduct,
    getItemCustomizations,
    getOrderReviewData,
    fetchFileValidation,
  ]);

  useEffect(() => {
    if (!orderId) return;

    if (cartItems.length > 0) {
      fetchAvailableCustomizations();
    } else {
      setValidations([]);
      setIsLoading(false);
    }
  }, [orderId, refreshVersion, fetchAvailableCustomizations, cartItems.length]);

  useEffect(() => {
    if (orderId) return;

    if (cartItems.length > 0) {
      fetchAvailableCustomizations();
    } else {
      setValidations([]);
      setIsLoading(false);
    }
  }, [orderId, cartItems, fetchAvailableCustomizations]);

  const deserializeCustomizationValue = (
    value: string | undefined,
  ): Record<string, unknown> => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn("Erro ao desserializar valor de customização:", e);
      return {};
    }
  };

  const handleEditItem = useCallback(
    async (
      productId: string,
      itemId: string,
      itemName: string,
      componentId: string,
      orderItemId?: string,
    ) => {
      try {
        const configResponse = await getItemCustomizations(itemId);
        const customizations = configResponse?.customizations || [];

        const modalCustoms: Customization[] = customizations.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type as
            | "DYNAMIC_LAYOUT"
            | "TEXT"
            | "IMAGES"
            | "MULTIPLE_CHOICE",
          isRequired: c.isRequired,
          price: c.price,
          customization_data: c.customization_data,
        }));

        let filled: CartCustomization[] = [];
        const modalRuleIds = new Set(modalCustoms.map((custom) => custom.id));

        if (orderId) {
          const validation =
            validations.find((v) => v.orderItemId === orderItemId) ||
            validations.find((v) => v.productId === productId);
          if (validation) {
            filled = validation.filledCustomizations.filter((f) => {
              const ruleId = getCustomizationRuleId(f);
              if (!ruleId || !modalRuleIds.has(ruleId)) {
                return false;
              }

              return !f.componentId || f.componentId === componentId;
            });
          }
        } else {
          const cartItem = cartItems.find((i) => i.product_id === productId);
          filled =
            cartItem?.customizations?.filter((f) => {
              const ruleId = getCustomizationRuleId(f);
              if (!ruleId || !modalRuleIds.has(ruleId)) {
                return false;
              }

              return !f.componentId || f.componentId === componentId;
            }) || [];
        }

        const initialData: Record<string, unknown> = {};

        filled.forEach((fc: CartCustomization) => {
          const ruleId = getCustomizationRuleId(fc);
          if (!ruleId) return;

          const originalData =
            typeof fc.data === "object" && fc.data !== null
              ? { ...(fc.data as Record<string, unknown>) }
              : {};

          if (typeof fc.value === "string") {
            const deserialized = deserializeCustomizationValue(fc.value);
            initialData[ruleId] =
              fc.customization_type === "IMAGES"
                ? buildNormalizedImageData(
                    deserialized as PersonalizationData,
                    fc.photos,
                  )
                : deserialized;
            return;
          }

          if (fc.customization_type === "TEXT") {
            initialData[ruleId] = Object.keys(originalData).length
              ? originalData
              : fc.text || "";
          } else if (fc.customization_type === "MULTIPLE_CHOICE") {
            initialData[ruleId] = Object.keys(originalData).length
              ? originalData
              : fc.selected_option;
          } else if (fc.customization_type === "IMAGES") {
            initialData[ruleId] = buildNormalizedImageData(
              originalData as PersonalizationData,
              fc.photos,
            );
          } else if (fc.customization_type === "DYNAMIC_LAYOUT") {
            initialData[ruleId] = Object.keys(originalData).length
              ? originalData
              : fc;
          }
        });

        setActiveInitialValues(initialData);
        setActiveItemId(itemId);
        setActiveItemName(itemName);
        setActiveCustomizations(modalCustoms);
        setActiveProductId(productId);
        setActiveOrderItemId(orderItemId || null);
        setActiveComponentId(componentId);
        setModalOpen(true);
      } catch (error) {
        console.error("Erro ao carregar customizações:", error);
      }
    },
    [getItemCustomizations, cartItems, orderId, validations, setModalOpen],
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleCustomizationComplete = useCallback(
    async (hasCustomizations: boolean, data: CustomizationInput[]) => {
      if (!hasCustomizations || !activeItemId) {
        setModalOpen(false);
        return;
      }

      if (orderId && activeOrderItemId) {
        setIsSaving(true);
        try {
          for (const customization of data) {
            const customData = customization.data as PersonalizationData;
            const highQualityUrl = (customData as any).highQualityUrl as
              | string
              | undefined;
            const previewUrl =
              highQualityUrl || (customData?.previewUrl as string | undefined);

            const sanitizedData = { ...customData };

            if (activeComponentId) {
              sanitizedData.componentId = activeComponentId;
            }

            if (sanitizedData.images && Array.isArray(sanitizedData.images)) {
              sanitizedData.images = sanitizedData.images.map(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ({ imageBuffer: _, ...rest }: Record<string, unknown>) => rest,
              );
            }

            const payload: SaveOrderItemCustomizationPayload = {
              customizationRuleId:
                customization.ruleId ||
                customization.customizationRuleId ||
                null,
              customizationType:
                customization.customizationType as CustomizationType,
              title:
                (customData?._customizationName as string) ||
                customization.customizationType,
              selectedLayoutId: customization.selectedLayoutId || null,
              data: sanitizedData || {},
            };

            if (customization.customizationType === "DYNAMIC_LAYOUT") {
              const fallbackPreviewUrl =
                (customData?.final_artwork as CustomizationPreview)
                  ?.preview_url ||
                (customData as any)?.finalArtwork?.preview_url ||
                (customData?.image as CustomizationPreview)?.preview_url ||
                (customData?.previewUrl as string | undefined) ||
                previewUrl;

              if (
                fallbackPreviewUrl &&
                fallbackPreviewUrl.startsWith("data:")
              ) {
                payload.finalArtwork = {
                  base64: fallbackPreviewUrl,
                  mimeType: "image/png",
                  fileName: "design-final.png",
                };
              } else if (fallbackPreviewUrl) {
                if (!sanitizedData.final_artwork) {
                  sanitizedData.final_artwork = {
                    preview_url: fallbackPreviewUrl,
                  };
                }
                if (!sanitizedData.image) {
                  sanitizedData.image = {
                    preview_url: fallbackPreviewUrl,
                  };
                }
                if (!sanitizedData.text) {
                  sanitizedData.text = fallbackPreviewUrl;
                }
              }
            }

            if (customization.customizationType === "IMAGES") {
              sanitizedData.photos =
                buildPhotosFromPersonalizationData(customData);
              sanitizedData.count = sanitizedData.photos.length;
              delete sanitizedData.files;
            }

            await saveOrderItemCustomization(
              orderId,
              activeOrderItemId,
              payload,
            );
          }

          toast.success("Personalização salva no pedido!");
          onCustomizationSaved?.();
          setRefreshVersion((value) => value + 1);
        } catch (error) {
          console.error(
            "❌ [CustomizationsReview] Erro ao salvar customização:",
            error,
          );
          toast.error("Erro ao salvar personalização. Tente novamente.");
        } finally {
          setIsSaving(false);
        }
      }

      if (activeProductId && onCustomizationUpdate) {
        onCustomizationUpdate(
          activeProductId,
          data,
          activeComponentId || undefined,
        );
      }

      setModalOpen(false);
      if (!orderId) {
        fetchAvailableCustomizations();
      }
    },
    [
      activeItemId,
      activeOrderItemId,
      activeProductId,
      activeComponentId,
      fetchAvailableCustomizations,
      orderId,
      onCustomizationUpdate,
      onCustomizationSaved,
      saveOrderItemCustomization,
      setModalOpen,
    ],
  );

  const hasRelevantValidations = validations.some(
    (v) =>
      v.availableCustomizations.length > 0 || v.filledCustomizations.length > 0,
  );

  if (!hasRelevantValidations && !isLoading) {
    return null;
  }

  const totalMissingLocal = validations.reduce(
    (acc, v) => acc + v.missingRequired.length,
    0,
  );
  const totalMissingBackend =
    (backendValidationState?.missingRequired?.length || 0) +
    (backendValidationState?.invalidCustomizations?.length || 0);
  const totalMissing =
    typeof backendValidationState?.valid === "boolean"
      ? totalMissingBackend
      : totalMissingLocal;
  const allComplete =
    typeof backendValidationState?.valid === "boolean"
      ? backendValidationState.valid
      : validations.length > 0 && validations.every((v) => v.isComplete);

  if (isLoading || isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isSaving
          ? "Salvando personalizações..."
          : "Verificando personalizações..."}
      </div>
    );
  }

  return (
    <>
      <Card className="bg-gray-50/50 p-4 sm:p-5 rounded-xl border border-gray-100 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Personalizações
            </h3>
            <p className="text-xs text-gray-500">
              Revise as informações antes do pagamento
            </p>
          </div>
          <div className="flex flex-col items-end">
            {allComplete ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50/50 rounded-full border border-green-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-semibold text-green-600">
                  Tudo OK
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/50 rounded-full border border-amber-100">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">
                  {totalMissing} pendente{totalMissing > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {validations.map((validation, vIdx) => {
            const itemsMap = new Map<
              string,
              {
                itemName: string;
                allCustomizations: AvailableCustomization[];
                missing: AvailableCustomization[];
                filled: CartCustomization[];
                itemId: string;
              }
            >();

            validation.availableCustomizations.forEach((avail) => {
              if (!avail.itemId) return;

              const componentIdKey = avail.componentId || avail.itemId;

              if (!itemsMap.has(componentIdKey)) {
                itemsMap.set(componentIdKey, {
                  itemName: avail.itemName,
                  allCustomizations: [],
                  missing: [],
                  filled: [],
                  itemId: avail.itemId,
                });
              }

              const entry = itemsMap.get(componentIdKey)!;
              entry.allCustomizations.push(avail);

              const filledCustom = validation.filledCustomizations.find(
                (f) =>
                  (f.customization_id === avail.id ||
                    f.customization_id?.split(":")[0] === avail.id ||
                    f.title?.toLowerCase() === avail.name?.toLowerCase() ||
                    (f.data?.title as string)?.toLowerCase() ===
                      avail.name?.toLowerCase()) &&
                  isSameComponent(f, avail),
              );

              const isFilled = isCustomizationFilled(filledCustom, avail);

              if (filledCustom && isFilled) {
                if (
                  !entry.filled.some(
                    (f) =>
                      f.id === filledCustom.id ||
                      (f.customization_id === filledCustom.customization_id &&
                        f.title === filledCustom.title),
                  )
                ) {
                  entry.filled.push(filledCustom);
                }
              } else if (avail.isRequired) {
                entry.missing.push(avail);
              }
            });

            if (itemsMap.size === 0) {
              return null;
            }

            return (
              <div
                key={
                  validation.orderItemId || `${validation.productId}-${vIdx}`
                }
                className="space-y-3"
              >
                {Array.from(itemsMap.entries()).map(
                  (
                    [componentId, { itemName, missing, filled, itemId }],
                    cIdx,
                  ) => {
                    const isIncomplete = missing.length > 0;
                    const currentItemData = itemsMap.get(componentId);
                    const isAdditionalContext =
                      currentItemData?.allCustomizations.some(
                        (c) => c.isAdditional,
                      ) || false;

                    return (
                      <div
                        key={`${componentId}-${cIdx}`}
                        className={`border rounded-sm p-3 transition-all ${
                          isIncomplete
                            ? "border-amber-200 bg-white"
                            : "border-gray-200 bg-white/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-1">
                              <div className="">
                                <h3 className="font-semibold text-xs text-gray-900">
                                  {validation.productName}
                                </h3>
                              </div>
                              {itemName && (
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <p className="text-[11px] text-gray-500 leading-tight">
                                    {itemName}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 h-4 border-gray-200 text-gray-600"
                                  >
                                    {isAdditionalContext
                                      ? "Adicional"
                                      : "Produto"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            {filled.length > 0 && (
                              <div className="max-w-[60%] flex flex-col gap-2">
                                {filled
                                  .filter((f) =>
                                    shouldShowMissingFileFallback(
                                      f,
                                      fileValidation,
                                    ),
                                  )
                                  .map((f, idx) => (
                                    <CustomizationFallback
                                      key={`fallback-${f.id}-${idx}`}
                                      customization={f}
                                      onEdit={() =>
                                        handleEditItem(
                                          validation.productId,
                                          itemId,
                                          itemName || "Item",
                                          componentId,
                                          validation.orderItemId,
                                        )
                                      }
                                    />
                                  ))}

                                <div className="flex flex-wrap gap-1.5">
                                  {filled
                                    .filter(
                                      (f) =>
                                        !shouldShowMissingFileFallback(
                                          f,
                                          fileValidation,
                                        ),
                                    )
                                    .map((f, idx) => {
                                      const summary =
                                        getCustomizationSummary(f);
                                      if (!summary) return null;
                                      return (
                                        <Badge
                                          key={`${f.id || f.customization_id}-${idx}`}
                                          variant="outline"
                                          className="bg-white border-gray-200 text-gray-600 font-medium text-[10px] py-0.5 px-2"
                                        >
                                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                                          <p>
                                            {f.title}: {summary}
                                          </p>
                                        </Badge>
                                      );
                                    })}
                                </div>

                                {filled
                                  .filter(
                                    (f) =>
                                      !shouldShowMissingFileFallback(
                                        f,
                                        fileValidation,
                                      ),
                                  )
                                  .map((f, idx) => {
                                    const previewUrls =
                                      getCustomizationImageUrls(f);
                                    if (previewUrls.length === 0) return null;
                                    return (
                                      <div
                                        key={`preview-${f.id || f.customization_id}-${idx}`}
                                        className="mt-1"
                                      >
                                        <p className="text-[10px] text-gray-500 mb-1">
                                          {f.title}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {previewUrls
                                            .slice(0, 4)
                                            .map((url, pIdx) => (
                                              <button
                                                key={`img-${pIdx}`}
                                                type="button"
                                                onClick={() =>
                                                  handleEditItem(
                                                    validation.productId,
                                                    itemId,
                                                    itemName || "Item",
                                                    componentId,
                                                    validation.orderItemId,
                                                  )
                                                }
                                                className="rounded border border-gray-200 hover:border-gray-400"
                                                title="Editar esta personalização"
                                              >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={url}
                                                  alt={`${f.title} ${pIdx + 1}`}
                                                  className="h-10 w-10 rounded object-cover"
                                                />
                                              </button>
                                            ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleEditItem(
                                validation.productId,
                                itemId,
                                itemName || "Item",
                                componentId,
                                validation.orderItemId,
                              )
                            }
                            className={`h-8 px-2 font-medium text-xs ${
                              isIncomplete
                                ? "text-amber-700 hover:bg-amber-100"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                            Editar
                          </Button>
                        </div>

                        {missing.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-amber-100">
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                              Pendentes ({missing.length})
                            </p>
                            <div className="grid grid-cols-1 gap-1">
                              {missing.map((m) => (
                                <div
                                  key={`${m.id}-${m.componentId}`}
                                  className="bg-amber-50/50 p-1.5 rounded border border-amber-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-100/50 text-amber-900 font-semibold text-[10px] py-0 px-1 border-0">
                                      {m.name}
                                    </Badge>
                                    <span className="text-[10px] text-amber-700 italic">
                                      {getCustomizationHint(
                                        m,
                                        validation.filledCustomizations.find(
                                          (f) =>
                                            (f.customization_id === m.id ||
                                              f.customization_id?.split(
                                                ":",
                                              )[0] === m.id) &&
                                            isSameComponent(f, m),
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            );
          })}
        </div>

        {allComplete && validations.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">
              Todas as personalizações foram preenchidas. Prossiga para o
              pagamento.
            </p>
          </div>
        )}

        {!allComplete &&
          ((backendValidationState?.missingRequired &&
            backendValidationState.missingRequired.length > 0) ||
            (backendValidationState?.invalidCustomizations &&
              backendValidationState.invalidCustomizations.length > 0)) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                Pendências validadas no servidor:
              </p>
              <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1">
                {[
                  ...(backendValidationState?.missingRequired || []),
                  ...(backendValidationState?.invalidCustomizations || []),
                ]
                  .slice(0, 4)
                  .map((issue, idx) => (
                    <li key={`issue-${idx}`}>
                      {issue.reason}
                      {issue.itemName ? ` (${issue.itemName})` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}

        {!allComplete &&
          backendValidationState?.recommendations &&
          backendValidationState.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                Recomendações de validação:
              </p>
              <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1">
                {backendValidationState.recommendations
                  .slice(0, 3)
                  .map((r, idx) => (
                    <li key={`rec-${idx}`}>{r}</li>
                  ))}
              </ul>
            </div>
          )}
      </Card>

      {activeItemId && (
        <ItemCustomizationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          itemId={activeItemId}
          itemName={activeItemName}
          customizations={activeCustomizations}
          onComplete={handleCustomizationComplete}
          initialValues={activeInitialValues}
        />
      )}
    </>
  );
}

export function validateCustomizations(
  cartItems: Array<{
    customizations?: CartCustomization[];
  }>,
): boolean {
  for (const item of cartItems) {
    for (const custom of item.customizations || []) {
      if (!custom.is_required) continue;
      if (!isCustomizationFilled(custom)) {
        return false;
      }
    }
  }
  return true;
}
