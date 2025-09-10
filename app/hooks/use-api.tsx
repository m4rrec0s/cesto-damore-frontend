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
}
export interface Category {
  id: string;
  name: string;
  description?: string;
}
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  categoryId?: string;
  typeId?: string;
}
export interface Additional {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}
export interface Type {
  id: string;
  name: string;
}
export interface OrderItem {
  productId: string;
  quantity: number;
  additionalIds?: string[];
}
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
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
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ===== Auth =====
  register = async (data: RegisterCredentials) => {
    const res = await this.client.post("/auth/register", data);
    return res.data;
  };
  login = async (credentials: LoginCredentials) => {
    const res = await this.client.post("/auth/login", credentials);
    if (typeof window !== "undefined" && res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res.data;
  };
  google = async (googleToken: string) => {
    const res = await this.client.post("/auth/google", { token: googleToken });
    if (typeof window !== "undefined" && res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res.data;
  };
  logoutLocal = () => {
    if (typeof window !== "undefined") localStorage.removeItem("token");
  };

  // ===== Users =====
  getUsers = async () => {
    if (ApiService.cache.users) return ApiService.cache.users;
    const res = await this.client.get("/users");
    ApiService.cache.users = res.data;
    return res.data;
  };
  getUser = async (id: string) => (await this.client.get(`/users/${id}`)).data;
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
  createAdditional = async (payload: Partial<Additional>) => {
    const res = await this.client.post("/additional", payload);
    this.clearCache("additionals");
    return res.data;
  };
  updateAdditional = async (id: string, payload: Partial<Additional>) => {
    const res = await this.client.put(`/additional/${id}`, payload);
    this.clearCache("additionals");
    return res.data;
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

  // ===== Products =====
  getProducts = async () => {
    if (ApiService.cache.products) return ApiService.cache.products;
    const res = await this.client.get("/products");
    ApiService.cache.products = res.data;
    return res.data;
  };
  getProduct = async (id: string) =>
    (await this.client.get(`/products/${id}`)).data;
  createProduct = async (payload: Partial<Product>) => {
    const res = await this.client.post("/products", payload);
    this.clearCache("products");
    return res.data;
  };
  updateProduct = async (id: string, payload: Partial<Product>) => {
    const res = await this.client.put(`/products/${id}`, payload);
    this.clearCache("products");
    return res.data;
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
  createOrder = async (payload: { userId: string; items: OrderItem[] }) => {
    const res = await this.client.post("/orders", payload);
    this.clearCache("orders");
    return res.data;
  };
  deleteOrder = async (id: string) => {
    const res = await this.client.delete(`/orders/${id}`);
    this.clearCache("orders");
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
