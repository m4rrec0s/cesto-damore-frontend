// Tipos para o sistema de Feed
export interface FeedConfiguration {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  banners?: FeedBanner[];
  sections?: FeedSection[];
}

export interface FeedBanner {
  id: string;
  feed_config_id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  text_color?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeedSection {
  id: string;
  feed_config_id: string;
  title: string;
  section_type: FeedSectionType;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  items?: FeedSectionItem[];
}

export interface FeedSectionItem {
  id: string;
  feed_section_id: string;
  item_type: "product" | "category" | "additional";
  item_id: string;
  display_order: number;
  is_featured: boolean;
  custom_title?: string;
  custom_subtitle?: string;
  created_at: string;
  updated_at: string;
  item_data?: Record<string, unknown>; // Dados do produto/categoria/adicional
}

export enum FeedSectionType {
  RECOMMENDED_PRODUCTS = "RECOMMENDED_PRODUCTS",
  DISCOUNTED_PRODUCTS = "DISCOUNTED_PRODUCTS",
  FEATURED_CATEGORIES = "FEATURED_CATEGORIES",
  FEATURED_ADDITIONALS = "FEATURED_ADDITIONALS",
  CUSTOM_PRODUCTS = "CUSTOM_PRODUCTS",
  NEW_ARRIVALS = "NEW_ARRIVALS",
  BEST_SELLERS = "BEST_SELLERS",
}

// Inputs para criação e atualização
export interface CreateFeedConfigurationInput {
  name: string;
  is_active?: boolean;
}

export interface UpdateFeedConfigurationInput {
  name?: string;
  is_active?: boolean;
}

export interface CreateFeedBannerInput {
  feed_config_id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  text_color?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateFeedBannerInput {
  title?: string;
  subtitle?: string;
  image_url?: string;
  link_url?: string;
  text_color?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateFeedSectionInput {
  feed_config_id: string;
  title: string;
  section_type: FeedSectionType;
  is_visible?: boolean;
  display_order?: number;
  max_items?: number;
}

export interface UpdateFeedSectionInput {
  title?: string;
  section_type?: FeedSectionType;
  is_visible?: boolean;
  display_order?: number;
  max_items?: number;
}

export interface CreateFeedSectionItemInput {
  feed_section_id: string;
  item_type: "product" | "category" | "additional";
  item_id: string;
  display_order?: number;
  is_featured?: boolean;
  custom_title?: string;
  custom_subtitle?: string;
}

export interface UpdateFeedSectionItemInput {
  item_type?: "product" | "category" | "additional";
  item_id?: string;
  display_order?: number;
  is_featured?: boolean;
  custom_title?: string;
  custom_subtitle?: string;
}

// Resposta da API
export interface FeedResponse {
  id: string;
  name: string;
  is_active: boolean;
  banners: FeedBannerResponse[];
  sections: FeedSectionResponse[];
}

export interface FeedBannerResponse {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  text_color?: string;
  is_active: boolean;
  display_order: number;
}

export interface FeedSectionResponse {
  id: string;
  title: string;
  section_type: FeedSectionType;
  is_visible: boolean;
  display_order: number;
  max_items: number;
  items: FeedItemResponse[];
}

export interface FeedItemResponse {
  id: string;
  item_type: string;
  item_id: string;
  display_order: number;
  is_featured: boolean;
  custom_title?: string;
  custom_subtitle?: string;
  item_data?: Record<string, unknown>;
}

// Utilitários para labels
export const FEED_SECTION_TYPE_LABELS: Record<FeedSectionType, string> = {
  [FeedSectionType.RECOMMENDED_PRODUCTS]: "Produtos Recomendados",
  [FeedSectionType.DISCOUNTED_PRODUCTS]: "Produtos com Desconto",
  [FeedSectionType.FEATURED_CATEGORIES]: "Categorias em Destaque",
  [FeedSectionType.FEATURED_ADDITIONALS]: "Adicionais em Destaque",
  [FeedSectionType.CUSTOM_PRODUCTS]: "Produtos Personalizados",
  [FeedSectionType.NEW_ARRIVALS]: "Novos Produtos",
  [FeedSectionType.BEST_SELLERS]: "Mais Vendidos",
};
