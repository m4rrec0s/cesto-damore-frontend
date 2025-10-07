// ================ NEW REFACTORED TYPES ================

export type RuleType =
  | "PHOTO_UPLOAD"
  | "TEXT_INPUT"
  | "OPTION_SELECT"
  | "ITEM_SUBSTITUTION";

export type ConstraintType = "MUTUALLY_EXCLUSIVE" | "REQUIRES";

export type ItemType = "PRODUCT" | "ADDITIONAL";

export interface ProductRule {
  id: string;
  product_type_id: string;
  rule_type: RuleType;
  title: string;
  description?: string;
  required: boolean;
  max_items?: number | null;
  conflict_with?: string[] | null;
  dependencies?: string[] | null;
  available_options?: Record<string, unknown> | unknown[];
  preview_image_url?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ItemConstraint {
  id: string;
  target_item_id: string;
  target_item_type: ItemType;
  constraint_type: ConstraintType;
  related_item_id: string;
  related_item_type: ItemType;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductType {
  id: string;
  name: string;
  category: "PERSONALIZADA" | "MODELO_PRONTO";
  delivery_type: "PRONTA_ENTREGA" | "PRAZO_24H";
  stock_quantity?: number | null;
  has_3d_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomizationData {
  photos?: Array<{
    temp_file_id?: string;
    original_name?: string;
    preview_url?: string;
    position: number;
  }>;
  text?: string;
  selected_option?: string;
  selected_item?: {
    original_item: string;
    selected_item: string;
    price_adjustment: number;
  };
  [key: string]: unknown;
}

export interface CustomizationState {
  productId: string;
  rules: ProductRule[];
  data: Record<string, CustomizationData>;
  previewUrl?: string;
  model3dUrl?: string;
}

export interface PreviewResponse {
  previewUrl?: string;
  model3d?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ================ LEGACY TYPES (Mantidos para retrocompatibilidade) ================

export type CustomizationTypeValue =
  | "PHOTO_UPLOAD"
  | "TEXT_INPUT"
  | "MULTIPLE_CHOICE"
  | "ITEM_SUBSTITUTION";

export interface CustomizationRule {
  id: string;
  product_id?: string;
  additional_id?: string;
  customization_type: CustomizationTypeValue;
  title: string;
  description?: string;
  is_required: boolean;
  max_items?: number | null;
  available_options?: CustomizationAvailableOptions | null;
  preview_image_url?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CustomizationAvailableOptions =
  | Array<{
      id?: string;
      label: string;
      value: string;
      price_adjustment?: number;
    }>
  | Record<string, unknown>;

export interface CustomizationRuleInput {
  customization_type: CustomizationTypeValue;
  title: string;
  description?: string;
  is_required?: boolean;
  max_items?: number | null;
  available_options?: CustomizationAvailableOptions | null;
  display_order?: number;
}
