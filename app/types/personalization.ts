/**
 * Tipos para sistema de personalização de itens
 */

// ===== Slot Definition =====
export interface SlotDef {
  id: string;
  x: number; // % do left relativo à base (0-100)
  y: number; // % do top relativo à base (0-100)
  width: number; // % da largura da base
  height: number; // % da altura da base
  rotation?: number; // graus
  zIndex?: number;
  fit?: "cover" | "contain";
}

// ===== Layout Base =====
export interface LayoutBase {
  id: string;
  name: string;
  item_type: string; // "caneca" | "quadro" | ...
  image_url: string; // URL da imagem base
  width: number; // px reais da imagem base
  height: number;
  slots: SlotDef[];
  created_at: string;
  updated_at: string;
}

export interface CreateLayoutBaseInput {
  name: string;
  item_type: string;
  width: number;
  height: number;
  slots: SlotDef[];
  image?: File; // Arquivo da imagem base
}

export interface UpdateLayoutBaseInput {
  name?: string;
  width?: number;
  height?: number;
  slots?: SlotDef[];
  image?: File;
}

// ===== Temp Upload =====
export interface TempUploadResponse {
  tempId: string;
  tempUrl: string;
  width: number;
  height: number;
  originalName: string;
}

export interface TempFile {
  id: string;
  session_id: string;
  slot_id?: string;
  file_path: string;
  mime_type: string;
  original_name: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  expires_at: string;
}

// ===== Image Data =====
export interface ImageData {
  slotId: string;
  tempId: string;
  tempUrl: string;
  width: number;
  height: number;
  originalName: string;
}

// ===== Personalization =====
export interface Personalization {
  id: string;
  order_id: string;
  item_id: string;
  layout_base_id: string;
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

// ===== Preview =====
export interface PreviewRequest {
  layoutBaseId: string;
  images: ImageData[];
  width?: number; // Largura máxima do preview (default: 800)
}

export interface PreviewResponse {
  previewUrl: string; // Data URL (base64)
}

// ===== Item com Layout Base =====
export interface ItemWithLayout {
  id: string;
  name: string;
  type: string;
  allows_customization: boolean;
  layout_base_id?: string;
  layout_base?: LayoutBase;
}
