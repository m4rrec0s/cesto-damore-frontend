import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

/*
  Hook de API baseado no modelo fornecido (use-api.ts) porém adaptado
  às rotas do backend de Cesto d'Amore (routes.ts). Inclui cache leve em memória
  e métodos para autenticação, produtos, categorias, adicionais, tipos, pedidos e usuários.
*/

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

interface CacheShape {
  users: unknown | null;
  products: unknown | null;
  categories: unknown | null;
  additionals: unknown | null;
  types: unknown | null;
  orders: unknown | null;
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

      // Se não encontrou, tentar do localStorage antigo
      if (!token) {
        token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
