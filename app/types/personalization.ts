/**
 * Tipos para sistema de personalização de itens
 */

export interface SlotDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  fit?: "cover" | "contain";
}

export interface LayoutBase {
  id: string;
  name: string;
  title: string;
  item_type: string;
  previewImageUrl: string;
  model_url?: string;
  width: number;
  height: number;
  slots: SlotDef[];
  additional_time: number;
  productionTime?: number;
  fabric_json_state?: string | Record<string, unknown> | null;
  fabricJsonState?: string | Record<string, unknown> | null;
  is_dynamic?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLayoutBaseInput {
  name: string;
  item_type: string;
  width: number;
  height: number;
  slots: SlotDef[];
  additional_time?: number;
  image?: File;
}

export interface UpdateLayoutBaseInput {
  name?: string;
  width?: number;
  height?: number;
  slots?: SlotDef[];
  additional_time?: number;
  image?: File;
}

export interface ImageData {
  slotId: string;
  imageBuffer: Buffer | Uint8Array;
  mimeType: string;
  width: number;
  height: number;
  originalName: string;
}

export interface Personalization {
  id: string;
  order_id: string;
  item_id: string;
  layout_base_id?: string;
  dynamic_layout_id?: string;
  config_json: Record<string, unknown>;
  images: ImageData[];
  final_image_url?: string;
  created_at: string;
}

export interface CommitPersonalizationInput {
  layoutBaseId: string;
  configJson?: Record<string, unknown>;
  images: ImageData[];
}

export interface CommitPersonalizationResponse {
  personalizationId: string;
  finalImageUrl: string;
}

export interface PreviewRequest {
  layoutBaseId: string;
  images: ImageData[];
  width?: number;
}

export interface PreviewResponse {
  previewUrl: string;
}

export interface ItemWithLayout {
  id: string;
  name: string;
  type: string;
  allows_customization: boolean;
  layout_base_id?: string;
  layout_base?: LayoutBase;
}
