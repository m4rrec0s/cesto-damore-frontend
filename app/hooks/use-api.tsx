import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

/*
  Hook de API baseado no modelo fornecido (use-api.ts) porém adaptado
  às rotas do backend de Cesto d'Amore (routes.ts). Inclui cache leve em memória
  e métodos para autenticação, produtos, categorias, adicionais, tipos, pedidos e usuários.
*/

// ===== Enums =====
export enum FeedSectionType {
  RECOMMENDED_PRODUCTS = "RECOMMENDED_PRODUCTS",
  DISCOUNTED_PRODUCTS = "DISCOUNTED_PRODUCTS",
  FEATURED_CATEGORIES = "FEATURED_CATEGORIES",
  FEATURED_ADDITIONALS = "FEATURED_ADDITIONALS",
  CUSTOM_PRODUCTS = "CUSTOM_PRODUCTS",
  NEW_ARRIVALS = "NEW_ARRIVALS",
  BEST_SELLERS = "BEST_SELLERS",
}

// ===== Tipos do Feed =====
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
  max_items: number;
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
}

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

// Labels para exibição
export const FEED_SECTION_TYPE_LABELS: Record<FeedSectionType, string> = {
  [FeedSectionType.RECOMMENDED_PRODUCTS]: "Produtos Recomendados",
  [FeedSectionType.DISCOUNTED_PRODUCTS]: "Produtos com Desconto",
  [FeedSectionType.FEATURED_CATEGORIES]: "Categorias em Destaque",
  [FeedSectionType.FEATURED_ADDITIONALS]: "Adicionais em Destaque",
  [FeedSectionType.CUSTOM_PRODUCTS]: "Produtos Personalizados",
  [FeedSectionType.NEW_ARRIVALS]: "Novos Produtos",
  [FeedSectionType.BEST_SELLERS]: "Mais Vendidos",
};

// ===== Tipagens básicas =====
export interface LoginCredentials {
  email: string;
  password: string;
}
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}
export interface Category {
  id: string;
  name: string;
}
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  categories: Category[];
  type_id: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  categories: string[]; // Array of category IDs for API input
  type_id: string;
}
export interface Additional {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string;
}
export interface Type {
  id: string;
  name: string;
}
export interface CepInfo {
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  additional_info: {
    ibge_code: string;
    ddd: string;
  };
}
export interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationInfo;
}
export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  additional_ids?: string[];
  additionals?: { additional_id: string; quantity: number; price: number }[];
}
export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  delivery_address?: string | null;
  delivery_date?: string | null;
  shipping_price?: number | null;
  payment_method?: string | null;
  grand_total?: number | null;
}

// Resposta da API para feed público
export interface PublicFeedResponse {
  id: string;
  name: string;
  is_active: boolean;
  banners: PublicFeedBanner[];
  sections: PublicFeedSection[];
  configuration: {
    show_banners: boolean;
    show_recommended: boolean;
    show_discounted: boolean;
    show_categories: boolean;
    show_additionals: boolean;
    max_recommended: number;
    max_discounted: number;
    max_categories: number;
    max_additionals: number;
  };
}

export interface PublicFeedBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  background_color?: string;
  text_color?: string;
  button_color?: string;
  display_order: number;
}

export interface PublicFeedSection {
  id: string;
  title: string;
  section_type: string;
  display_order: number;
  max_items: number;
  show_view_all: boolean;
  view_all_url?: string;
  items: PublicFeedItem[];
}

export interface PublicFeedItem {
  id: string;
  item_type: "product" | "category" | "additional";
  item_id: string;
  display_order: number;
  is_featured: boolean;
  custom_title?: string;
  custom_subtitle?: string;
  item_data?: Record<string, unknown>;
}

interface CacheShape {
  users: unknown | null;
  products: unknown | null;
  categories: unknown | null;
  additionals: unknown | null;
  types: unknown | null;
  orders: unknown | null;
  feedConfigurations: unknown | null;
  [key: string]: unknown | null;
}

class ApiService {
  private static cache: CacheShape = {
    users: null,
    products: null,
    categories: null,
    additionals: null,
    types: null,
    orders: null,
    feedConfigurations: null,
  };

  private client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  });

  // ===== Utilidades de Cache =====
  static getCache() {
    return ApiService.cache;
  }
  clearAllCache() {
    Object.keys(ApiService.cache).forEach((k) => {
      ApiService.cache[k] = null;
    });
  }
  clearCache(key: string) {
    if (key in ApiService.cache) ApiService.cache[key] = null;
  }

  // ===== Interceptors (auth token) =====
  constructor() {
    this.client.interceptors.request.use((config) => {
      // Tentar pegar token do localStorage (compatibilidade)
      let token =
        typeof window !== "undefined" ? localStorage.getItem("appToken") : null;

      // Verificar se o token não é "undefined" como string e limpar se necessário
      if (token === "undefined" || token === "null" || !token) {
        // Limpar valor inválido do localStorage
        if (
          typeof window !== "undefined" &&
          (token === "undefined" || token === "null")
        ) {
          console.log("🧹 Limpando appToken inválido do localStorage:", token);
          localStorage.removeItem("appToken");
        }
        token = null;
      }

      // Se não encontrou appToken válido, tentar do localStorage antigo
      if (!token) {
        const oldToken =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (oldToken && oldToken !== "undefined" && oldToken !== "null") {
          token = oldToken;
          // Migrar token antigo para appToken se for válido
          if (typeof window !== "undefined") {
            console.log("🔄 Migrando token antigo para appToken");
            localStorage.setItem("appToken", oldToken);
            localStorage.removeItem("token");
          }
        }
      }

      // Debug logging
      if (config.url?.includes("/admin/feed")) {
        console.log("🔍 Interceptor Debug:", {
          url: config.url,
          method: config.method,
          hasWindow: typeof window !== "undefined",
          appTokenFromStorage:
            typeof window !== "undefined"
              ? localStorage.getItem("appToken")
              : "SSR",
          tokenFromStorage:
            typeof window !== "undefined"
              ? localStorage.getItem("token")
              : "SSR",
          finalToken: token,
          tokenLength: token ? token.length : 0,
          tokenPrefix: token ? token.substring(0, 20) + "..." : "NO_TOKEN",
          allLocalStorageKeys:
            typeof window !== "undefined" ? Object.keys(localStorage) : "SSR",
        });
      }

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor de resposta para corrigir URLs duplicadas
    this.client.interceptors.response.use((response) => {
      // Função auxiliar para corrigir URLs duplicadas
      const fixDuplicateApiUrl = (obj: unknown): unknown => {
        if (typeof obj === "string" && obj.includes("/api/api/")) {
          return obj.replace("/api/api/", "/api/");
        }
        if (Array.isArray(obj)) {
          return obj.map(fixDuplicateApiUrl);
        }
        if (obj && typeof obj === "object") {
          const fixed: Record<string, unknown> = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              fixed[key] = fixDuplicateApiUrl(
                (obj as Record<string, unknown>)[key]
              );
            }
          }
          return fixed;
        }
        return obj;
      };

      if (response.data) {
        response.data = fixDuplicateApiUrl(response.data);
      }

      return response;
    });
  }

  // ===== Auth =====
  register = async (data: RegisterCredentials) => {
    const res = await this.client.post("/auth/register", data);
    return res.data;
  };
  login = async (credentials: LoginCredentials) => {
    const res = await this.client.post("/auth/login", credentials);
    if (typeof window !== "undefined" && res.data?.appToken) {
      localStorage.setItem("appToken", res.data.appToken);
    }
    if (typeof window !== "undefined" && res.data?.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res.data;
  };
  google = async (googleToken: string) => {
    const res = await this.client.post("/auth/google", { token: googleToken });
    if (typeof window !== "undefined" && res.data?.appToken) {
      localStorage.setItem("appToken", res.data.appToken);
    }
    if (typeof window !== "undefined" && res.data?.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res.data;
  };
  logoutLocal = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("appToken");
      localStorage.removeItem("user");
    }
  };

  // ===== Users =====
  getUsers = async () => {
    if (ApiService.cache.users) return ApiService.cache.users;
    const res = await this.client.get("/users");
    ApiService.cache.users = res.data;
    return res.data;
  };
  getUser = async (id: string) => (await this.client.get(`/users/${id}`)).data;
  getCepInfo = async (zipCode: string): Promise<CepInfo> => {
    const res = await this.client.get(`/users/cep/${zipCode}`);
    return res.data;
  };
  createUser = async (payload: Partial<User>) => {
    const res = await this.client.post("/users", payload);
    this.clearCache("users");
    return res.data;
  };
  updateUser = async (id: string, payload: Partial<User>) => {
    const res = await this.client.put(`/users/${id}`, payload);
    this.clearCache("users");
    return res.data;
  };
  deleteUser = async (id: string) => {
    const res = await this.client.delete(`/users/${id}`);
    this.clearCache("users");
    return res.data;
  };

  // ===== Categories =====
  getCategories = async () => {
    if (ApiService.cache.categories) return ApiService.cache.categories;
    const res = await this.client.get("/categories");
    ApiService.cache.categories = res.data;
    return res.data;
  };
  getCategory = async (id: string) =>
    (await this.client.get(`/categories/${id}`)).data;
  createCategory = async (payload: Partial<Category>) => {
    const res = await this.client.post("/categories", payload);
    this.clearCache("categories");
    return res.data;
  };
  updateCategory = async (id: string, payload: Partial<Category>) => {
    const res = await this.client.put(`/categories/${id}`, payload);
    this.clearCache("categories");
    return res.data;
  };
  deleteCategory = async (id: string) => {
    const res = await this.client.delete(`/categories/${id}`);
    this.clearCache("categories");
    return res.data;
  };

  // ===== Types =====
  getTypes = async () => {
    if (ApiService.cache.types) return ApiService.cache.types;
    const res = await this.client.get("/types");
    ApiService.cache.types = res.data;
    return res.data;
  };
  getType = async (id: string) => (await this.client.get(`/types/${id}`)).data;
  createType = async (payload: Partial<Type>) => {
    const res = await this.client.post("/types", payload);
    this.clearCache("types");
    return res.data;
  };
  updateType = async (id: string, payload: Partial<Type>) => {
    const res = await this.client.put(`/types/${id}`, payload);
    this.clearCache("types");
    return res.data;
  };
  deleteType = async (id: string) => {
    const res = await this.client.delete(`/types/${id}`);
    this.clearCache("types");
    return res.data;
  };

  // ===== Additionals =====
  getAdditionals = async () => {
    if (ApiService.cache.additionals) return ApiService.cache.additionals;
    const res = await this.client.get("/additional");
    ApiService.cache.additionals = res.data;
    return res.data;
  };
  getAdditional = async (id: string) =>
    (await this.client.get(`/additional/${id}`)).data;
  createAdditional = async (
    payload: Partial<Additional>,
    imageFile?: File
  ): Promise<Additional> => {
    if (imageFile) {
      // Enviar como FormData com imagem
      const formData = new FormData();
      formData.append("name", payload.name || "");
      formData.append("description", payload.description || "");
      formData.append("price", payload.price?.toString() || "0");
      if (payload.discount)
        formData.append("discount", payload.discount.toString());
      formData.append("image", imageFile);

      const res = await this.client.post("/additional", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("additionals");
      return res.data;
    } else {
      // Enviar como JSON normal
      const res = await this.client.post("/additional", payload);
      this.clearCache("additionals");
      return res.data;
    }
  };
  updateAdditional = async (
    id: string,
    payload: Partial<Additional>,
    imageFile?: File
  ): Promise<Additional> => {
    if (imageFile) {
      // Enviar como FormData com imagem
      const formData = new FormData();
      if (payload.name) formData.append("name", payload.name);
      if (payload.description !== undefined)
        formData.append("description", payload.description);
      if (payload.price !== undefined)
        formData.append("price", payload.price.toString());
      if (payload.discount !== undefined)
        formData.append("discount", payload.discount.toString());
      formData.append("image", imageFile);

      const res = await this.client.put(`/additional/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("additionals");
      return res.data;
    } else {
      // Enviar como JSON normal
      const res = await this.client.put(`/additional/${id}`, payload);
      this.clearCache("additionals");
      return res.data;
    }
  };
  deleteAdditional = async (id: string) => {
    const res = await this.client.delete(`/additional/${id}`);
    this.clearCache("additionals");
    return res.data;
  };
  linkAdditionalToProduct = async (additionalId: string, productId: string) => {
    const res = await this.client.post(`/additional/${additionalId}/link`, {
      productId,
    });
    this.clearCache("additionals");
    this.clearCache("products");
    return res.data;
  };
  unlinkAdditionalFromProduct = async (
    additionalId: string,
    productId: string
  ) => {
    const res = await this.client.post(`/additional/${additionalId}/unlink`, {
      productId,
    });
    this.clearCache("additionals");
    this.clearCache("products");
    return res.data;
  };
  getAdditionalsByProduct = async (productId: string) => {
    const res = await this.client.get(`/products/${productId}/additionals`);
    return res.data;
  };

  // ===== Products =====
  getProducts = async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
    category_id?: string;
    type_id?: string;
  }): Promise<ProductsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.perPage)
      queryParams.append("perPage", params.perPage.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category_id)
      queryParams.append("category_id", params.category_id);
    if (params?.type_id) queryParams.append("type_id", params.type_id);

    const queryString = queryParams.toString();
    const url = `/products${queryString ? `?${queryString}` : ""}`;

    const res = await this.client.get(url);
    return res.data;
  };
  getProduct = async (id: string) =>
    (await this.client.get(`/products/${id}`)).data;
  createProduct = async (
    payload: Partial<ProductInput>,
    imageFile?: File
  ): Promise<Product> => {
    console.log("🔧 API createProduct - payload recebido:", payload);
    console.log("🔧 API createProduct - tem imagem?", !!imageFile);

    // TEMPORÁRIO: Desabilitar FormData para debug
    if (false && imageFile) {
    } else {
      // Enviar como JSON normal
      console.log("📦 Enviando como JSON:", payload);
      const res = await this.client.post("/products", payload);
      this.clearCache("products");
      return res.data;
    }
  };
  updateProduct = async (
    id: string,
    payload: Partial<ProductInput>,
    imageFile?: File
  ): Promise<Product> => {
    if (imageFile) {
      // Enviar como FormData com imagem
      const formData = new FormData();
      if (payload.name) formData.append("name", payload.name);
      if (payload.description !== undefined)
        formData.append("description", payload.description);
      if (payload.price !== undefined)
        formData.append("price", payload.price.toString());
      if (payload.categories)
        formData.append("categories", JSON.stringify(payload.categories));
      if (payload.type_id) formData.append("type_id", payload.type_id);
      if (payload.discount !== undefined)
        formData.append("discount", payload.discount.toString());
      formData.append("image", imageFile);

      const res = await this.client.put(`/products/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("products");
      return res.data;
    } else {
      // Enviar como JSON normal
      const res = await this.client.put(`/products/${id}`, payload);
      this.clearCache("products");
      return res.data;
    }
  };
  deleteProduct = async (id: string) => {
    const res = await this.client.delete(`/products/${id}`);
    this.clearCache("products");
    return res.data;
  };
  linkProduct = async (productId: string, relatedId: string) => {
    const res = await this.client.post(`/products/${productId}/link`, {
      relatedId,
    });
    this.clearCache("products");
    return res.data;
  };
  unlinkProduct = async (productId: string, relatedId: string) => {
    const res = await this.client.post(`/products/${productId}/unlink`, {
      relatedId,
    });
    this.clearCache("products");
    return res.data;
  };

  // ===== Upload de Imagens =====
  uploadImage = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await this.client.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  };

  // ===== Orders =====
  getOrders = async () => {
    if (ApiService.cache.orders) return ApiService.cache.orders;
    const res = await this.client.get("/orders");
    ApiService.cache.orders = res.data;
    return res.data;
  };
  getOrder = async (id: string) =>
    (await this.client.get(`/orders/${id}`)).data;
  createOrder = async (payload: {
    user_id: string;
    total_price: number;
    items: OrderItem[];
    delivery_address?: string | null;
    delivery_city: string;
    delivery_state: string;
    delivery_date?: Date | null;
    shipping_price?: number | null;
    payment_method?: string | null;
    grand_total?: number | null;
  }) => {
    console.log("📡 Enviando pedido para o backend:", payload);
    const res = await this.client.post("/orders", payload);
    console.log("✅ Resposta do backend:", res.data);
    this.clearCache("orders");
    return res.data;
  };
  deleteOrder = async (id: string) => {
    const res = await this.client.delete(`/orders/${id}`);
    this.clearCache("orders");
    return res.data;
  };

  // ===== Payments =====
  createPaymentPreference = async (payload: {
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
    }>;
    payer: {
      email: string;
      name?: string;
      identification?: {
        type: string;
        number: string;
      };
    };
    back_urls?: {
      success: string;
      failure: string;
      pending: string;
    };
    auto_return?: string;
    external_reference?: string;
  }) => {
    const res = await this.client.post("/payment/preference", payload);
    return res.data;
  };

  getPaymentStatus = async (paymentId: string) => {
    const res = await this.client.get(`/payment/${paymentId}/status`);
    return res.data;
  };

  getUserPayments = async () => {
    const res = await this.client.get("/payments/user");
    return res.data;
  };

  // ===== Checkout Transparente =====
  createTransparentPayment = async (payload: {
    orderId: string;
    token?: string;
    payment_method_id: "pix" | "credit_card" | "debit_card";
    issuer_id?: string;
    installments?: number;
    payer: {
      email: string;
      first_name?: string;
      last_name?: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  }) => {
    const res = await this.client.post("/payment/transparent", payload);
    return res.data;
  };

  getOrderForCheckout = async (orderId: string) => {
    try {
      console.log("🌐 Fazendo requisição para:", `/orders/${orderId}`);
      const res = await this.client.get(`/orders/${orderId}`);
      console.log("📦 Resposta recebida:", res.data);
      return res.data;
    } catch (error: unknown) {
      console.error("❌ Erro na requisição getOrderForCheckout:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response: {
            status: number;
            data: { error?: string; message?: string };
          };
        };
        console.error("📄 Status:", axiosError.response.status);
        console.error("📄 Data:", axiosError.response.data);
        throw new Error(
          axiosError.response.data?.error ||
            axiosError.response.data?.message ||
            "Erro na requisição"
        );
      }
      throw error;
    }
  };

  // ===== Payment Methods =====
  getPaymentMethods = async () => {
    const res = await this.client.get("/payment-methods");
    return res.data;
  };

  // ===== Feed =====
  getFeedConfigurations = async (): Promise<FeedConfiguration[]> => {
    console.log("🔍 getFeedConfigurations chamado");
    console.log("🔍 Cache atual:", ApiService.cache.feedConfigurations);

    if (ApiService.cache.feedConfigurations) {
      console.log("✅ Usando cache para Feed configurations");
      return ApiService.cache.feedConfigurations as FeedConfiguration[];
    }

    console.log("📡 Fazendo requisição para /admin/feed/configurations");
    const res = await this.client.get("/admin/feed/configurations");
    console.log("📦 Resposta recebida:", res.data);

    ApiService.cache.feedConfigurations = res.data;
    return res.data;
  };

  getFeedConfiguration = async (id: string): Promise<FeedConfiguration> => {
    const res = await this.client.get(`/admin/feed/configurations/${id}`);
    return res.data;
  };

  createFeedConfiguration = async (
    payload: CreateFeedConfigurationInput
  ): Promise<FeedConfiguration> => {
    const res = await this.client.post("/admin/feed/configurations", payload);
    ApiService.cache.feedConfigurations = null; // Invalidar cache
    return res.data;
  };

  updateFeedConfiguration = async (
    id: string,
    payload: UpdateFeedConfigurationInput
  ): Promise<FeedConfiguration> => {
    const res = await this.client.put(
      `/admin/feed/configurations/${id}`,
      payload
    );
    ApiService.cache.feedConfigurations = null; // Invalidar cache
    return res.data;
  };

  deleteFeedConfiguration = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/configurations/${id}`);
    ApiService.cache.feedConfigurations = null; // Invalidar cache
  };

  createFeedBanner = async (
    payload: CreateFeedBannerInput,
    imageFile?: File
  ): Promise<FeedBanner> => {
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      const res = await this.client.post("/admin/feed/banners", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ApiService.cache.feedConfigurations = null;
      return res.data;
    } else {
      const res = await this.client.post("/admin/feed/banners", payload);
      ApiService.cache.feedConfigurations = null;
      return res.data;
    }
  };

  updateFeedBanner = async (
    id: string,
    payload: UpdateFeedBannerInput,
    imageFile?: File
  ): Promise<FeedBanner> => {
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      const res = await this.client.put(`/admin/feed/banners/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ApiService.cache.feedConfigurations = null;
      return res.data;
    } else {
      const res = await this.client.put(`/admin/feed/banners/${id}`, payload);
      ApiService.cache.feedConfigurations = null;
      return res.data;
    }
  };

  deleteFeedBanner = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/banners/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  createFeedSection = async (
    payload: CreateFeedSectionInput
  ): Promise<FeedSection> => {
    const res = await this.client.post("/admin/feed/sections", payload);
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  updateFeedSection = async (
    id: string,
    payload: UpdateFeedSectionInput
  ): Promise<FeedSection> => {
    const res = await this.client.put(`/admin/feed/sections/${id}`, payload);
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  deleteFeedSection = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/sections/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  // ===== Feed Section Items =====
  createFeedSectionItem = async (
    data: CreateFeedSectionItemInput
  ): Promise<FeedSectionItem> => {
    const response = await this.client.post("/admin/feed/section-items", data);
    ApiService.cache.feedConfigurations = null;
    return response.data;
  };

  updateFeedSectionItem = async (
    id: string,
    data: UpdateFeedSectionItemInput
  ): Promise<FeedSectionItem> => {
    const response = await this.client.put(
      `/admin/feed/section-items/${id}`,
      data
    );
    ApiService.cache.feedConfigurations = null;
    return response.data;
  };

  deleteFeedSectionItem = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/section-items/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  // ===== Public Feed =====
  getPublicFeed = async (configId?: string): Promise<PublicFeedResponse> => {
    const params = configId ? `?configId=${configId}` : "";
    return (await this.client.get(`/feed${params}`)).data;
  };
}

export function useApi() {
  const [refreshToken, setRefreshToken] = useState(0);
  const invalidateCache = useCallback(() => setRefreshToken((v) => v + 1), []);

  const api = useMemo(() => new ApiService(), []);

  useEffect(() => {
    if (refreshToken > 0) api.clearAllCache();
  }, [refreshToken, api]);

  const clearSpecificCache = useCallback(
    (key: string) => api.clearCache(key),
    [api]
  );
  // Evita recriar objeto a cada render (quebrando dependências em useEffect em consumidores)
  const value = useMemo(
    () => ({
      ...api,
      invalidateCache,
      clearSpecificCache,
    }),
    [api, invalidateCache, clearSpecificCache]
  );

  return value;
}

export default useApi;
