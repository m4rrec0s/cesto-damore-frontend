import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

export enum FeedSectionType {
  RECOMMENDED_PRODUCTS = "RECOMMENDED_PRODUCTS",
  DISCOUNTED_PRODUCTS = "DISCOUNTED_PRODUCTS",
  FEATURED_CATEGORIES = "FEATURED_CATEGORIES",
  FEATURED_ADDITIONALS = "FEATURED_ADDITIONALS",
  CUSTOM_PRODUCTS = "CUSTOM_PRODUCTS",
  NEW_ARRIVALS = "NEW_ARRIVALS",
  BEST_SELLERS = "BEST_SELLERS",
}

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
}

export interface UpdateFeedSectionInput {
  title?: string;
  section_type?: FeedSectionType;
  is_visible?: boolean;
  display_order?: number;
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

export const FEED_SECTION_TYPE_LABELS: Record<FeedSectionType, string> = {
  [FeedSectionType.RECOMMENDED_PRODUCTS]: "Produtos Recomendados",
  [FeedSectionType.DISCOUNTED_PRODUCTS]: "Produtos com Desconto",
  [FeedSectionType.FEATURED_CATEGORIES]: "Categorias em Destaque",
  [FeedSectionType.FEATURED_ADDITIONALS]: "Adicionais em Destaque",
  [FeedSectionType.CUSTOM_PRODUCTS]: "Produtos Personalizados",
  [FeedSectionType.NEW_ARRIVALS]: "Novos Produtos",
  [FeedSectionType.BEST_SELLERS]: "Mais Vendidos",
};

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
  phone?: string | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}
export interface Category {
  id: string;
  name: string;
}

export interface Components {
  id: string;
  product_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  item: Item;
}

export interface ProductComponent {
  id: string;
  product_id: string;
  item_id: string;
  quantity: number;
  item: Item;
}

export interface CategoryProduct {
  category: {
    id: string;
    name: string;
  };
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
  production_time?: number;
  components?: ProductComponent[];
  customizations?: Customization[];
  related_products?: Omit<Product, "components" | "related_products">[];
  created_at: string;
  updated_at: string;
}

export interface ProductForm {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  categories: Category[];
  type_id: string;
  components?: CategoryProduct[];
  related_products?: Omit<Product, "components" | "related_products">[];
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  categories: string[];
  type_id: string;
  production_time?: number;
}
export interface Additional {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  image_url?: string;
  stock_quantity?: number;
  allows_customization?: boolean;
  customizations?: Customization[];
  compatible_products?: Array<{
    product_id: string;
    product_name: string;
    custom_price: number | null;
    is_active: boolean;
  }>;
}

export interface CustomizationOption {
  id: string;
  label: string;
  image_url?: string;
  description?: string;
  image_filename?: string;
  price_modifier: number;
}

export interface CustomizationDataMultipleChoice {
  options: CustomizationOption[];
  max_selection?: number;
  min_selection?: number;
  [key: string]: unknown;
}

export interface Customization {
  id: string;
  name: string;
  description?: string;
  item_id: string;
  price: number;
  isRequired: boolean;
  type: CustomizationTypeValue;
  customization_data: CustomizationDataMultipleChoice | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  type: "caneca" | "quadro";
  stock_quantity: number;
  base_price: number;
  discount: number;
  image_url: string;
  allows_customization: boolean;
  layout_base_id: string | null;
  created_at: string;
  updated_at: string;
  additionals: Additional[];
  customizations: Customization[];
  layout_base?: {
    id: string;
    additional_time: number;
  };
}

export interface Color {
  id: string;
  name: string;
  hex_code: string;
  created_at: string;
  updated_at: string;
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

export interface ItemsResponse {
  items: Item[];
  pagination: PaginationInfo;
}
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

export type CustomizationTypeValue =
  | "DYNAMIC_LAYOUT"
  | "IMAGES"
  | "TEXT"
  | "MULTIPLE_CHOICE";

export type CustomizationAvailableOptions =
  | Array<{
      label: string;
      value: string;
      price_adjustment?: number;
    }>
  | {
      items: Array<{
        original_item: string;
        available_substitutes: Array<{
          item: string;
          price_adjustment: number;
        }>;
      }>;
    };

export interface OrderItemAdditional {
  id: string;
  additional_id: string;
  quantity: number;
  price: number;
  additional?: Additional;
}

export interface OrderItemCustomizationSummary {
  id: string;
  customization_id?: string | null;
  title: string;
  customization_type: CustomizationTypeValue;
  google_drive_url?: string | null;
  value?: string | null;
}

export interface OrderItemDetailed {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
  additionals: OrderItemAdditional[];
  customizations: OrderItemCustomizationSummary[];
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  price: number;
  additionals?: { additional_id: string; quantity: number; price: number }[];
}

export interface Order {
  id: string;
  status: OrderStatus;
  user_id: string;
  user?: User & { phone?: string | null };
  items: OrderItemDetailed[];
  total: number;
  discount?: number | null;
  created_at: string;
  updated_at: string;
  delivery_address?: string | null;
  complement?: string | null;
  send_anonymously?: boolean | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_method?: string | null;
  delivery_date?: string | null;
  shipping_price?: number | null;
  payment_method?: string | null;
  grand_total?: number | null;
  recipient_phone?: string | null;
  payment?: {
    id: string;
    status: string;
    payment_method?: string | null;
    approved_at?: string | null;
    mercado_pago_id?: string | null;
    webhook_attempts?: number | null;
    last_webhook_at?: string | null;
  } | null;
}

export interface CustomizationRule {
  id: string;
  customization_type: CustomizationTypeValue;
  title: string;
  description?: string | null;
  is_required: boolean;
  max_items?: number | null;
  available_options?: CustomizationAvailableOptions | null;
  display_order: number;
  product_id?: string | null;
  additional_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomizationRuleInput {
  customization_type: CustomizationTypeValue;
  title: string;
  description?: string;
  is_required?: boolean;
  max_items?: number | null;
  available_options?: CustomizationAvailableOptions | null;
  display_order?: number;
}

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
  pagination?: {
    totalSections: number;
    page: number;
    perPage: number;
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

export interface N8NCustomer {
  number: string;
  name?: string | null;
  last_message_sent?: string | null;
  service_status?: string | null;
  already_a_customer?: boolean;
  follow_up?: boolean;
}

export interface AppUserWithOrders {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  role: string;
  created_at: string;
  orders: Array<{
    id: string;
    status: string;
    total_price: number;
    created_at: string;
  }>;
}

export interface CombinedCustomerInfo {
  n8n_customer?: N8NCustomer;
  app_user?: AppUserWithOrders;
  has_app_account: boolean;
  total_orders: number;
  last_order_status?: string;
}

export interface CustomerListResponse {
  customers: N8NCustomer[];
  total: number;
  page: number;
  limit: number;
}

export interface UpsertCustomerInput {
  number: string;
  name?: string;
  service_status?: string;
  already_a_customer?: boolean;
  follow_up?: boolean;
}

export interface SendMessageInput {
  message: string;
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
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

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

  constructor() {
    this.client.interceptors.request.use((config) => {

      config.headers = config.headers || {};

      config.headers["ngrok-skip-browser-warning"] = "true";

      let token =
        typeof window !== "undefined" ? localStorage.getItem("appToken") : null;

      if (token === "undefined" || token === "null" || !token) {

        if (
          typeof window !== "undefined" &&
          (token === "undefined" || token === "null")
        ) {
          localStorage.removeItem("appToken");
        }
        token = null;
      }

      if (!token) {
        const oldToken =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (oldToken && oldToken !== "undefined" && oldToken !== "null") {
          token = oldToken;

          if (typeof window !== "undefined") {
            localStorage.setItem("appToken", oldToken);
            localStorage.removeItem("token");
          }
        }
      }

      if (config.url?.includes("/admin/feed")) {
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    this.client.interceptors.response.use((response) => {
      if (response.data) {
        response.data = response.data;
      }

      return response;
    });
  }

  get = async (url: string) => {
    const res = await this.client.get(url);
    return res.data;
  };

  post = async (url: string, data: unknown) => {
    const res = await this.client.post(url, data);
    return res.data;
  };

  put = async (url: string, data: unknown) => {
    const res = await this.client.put(url, data);
    return res.data;
  };

  delete = async (url: string) => {
    const res = await this.client.delete(url);
    return res.data;
  };

  register = async (data: RegisterCredentials) => {
    const res = await this.client.post("/auth/register", data);
    return res.data;
  };
  login = async (credentials: LoginCredentials) => {
    const res = await this.client.post("/auth/login", credentials);
    if (typeof window !== "undefined" && res.data?.appToken) {
      localStorage.setItem("appToken", res.data.appToken);
    }
    if (typeof window !== "undefined" && res.data?.user?.id) {
      localStorage.setItem("userId", res.data.user.id);
    }
    return res.data;
  };
  google = async (
    googleToken: string,
    userInfo?: {
      email: string | null;
      name: string | null;
      imageUrl: string | null;
    },
  ) => {
    const payload: {
      idToken: string;
      email?: string;
      name?: string;
      imageUrl?: string;
    } = {
      idToken: googleToken,
    };

    if (userInfo) {
      if (userInfo.email) payload.email = userInfo.email;
      if (userInfo.name) payload.name = userInfo.name;
      if (userInfo.imageUrl) payload.imageUrl = userInfo.imageUrl;
    }

    const res = await this.client.post("/auth/google", payload);
    if (typeof window !== "undefined" && res.data?.appToken) {
      localStorage.setItem("appToken", res.data.appToken);
    }
    if (typeof window !== "undefined" && res.data?.user?.id) {
      localStorage.setItem("userId", res.data.user.id);
    }
    return res.data;
  };
  logoutLocal = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("appToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("tokenTimestamp");
    }
  };

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

  getAdditionals = async () => {
    if (ApiService.cache.additionals) return ApiService.cache.additionals;
    const res = await this.client.get("/additional");
    ApiService.cache.additionals = res.data;
    return res.data;
  };
  /**
   * Lista items unificados (novo endpoint)
   * GET /items
   */
  getItems = async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
    id?: string;
  }): Promise<ItemsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.perPage)
      queryParams.append("per_page", params.perPage.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.id) queryParams.append("id", params.id);

    const queryString = queryParams.toString();
    const url = `/items${queryString ? `?${queryString}` : ""}`;

    const res = await this.client.get(url);
    return res.data;
  };
  getItemsByProduct = async (productId: string): Promise<Item[]> => {
    const res = await this.client.get("/items", { params: { productId } });
    return res.data;
  };
  getAdditional = async (id: string) =>
    (await this.client.get(`/additional/${id}`)).data;
  createAdditional = async (
    payload: Partial<Additional> & {
      colors?: Array<{ color_id: string; stock_quantity: number }>;
    },
    imageFile?: File,
  ): Promise<Additional> => {
    if (imageFile) {

      const formData = new FormData();
      formData.append("name", payload.name || "");
      formData.append("description", payload.description || "");
      formData.append("price", payload.price?.toString() || "0");
      if (payload.discount)
        formData.append("discount", payload.discount.toString());
      if (payload.stock_quantity !== undefined)
        formData.append("stock_quantity", payload.stock_quantity.toString());
      if (payload.colors)
        formData.append("colors", JSON.stringify(payload.colors));
      formData.append("image", imageFile);

      const res = await this.client.post("/additional", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("additionals");
      return res.data;
    } else {

      const res = await this.client.post("/additional", payload);
      this.clearCache("additionals");
      return res.data;
    }
  };
  updateAdditional = async (
    id: string,
    payload: Partial<Additional>,
    imageFile?: File,
  ): Promise<Additional> => {
    if (imageFile) {

      const formData = new FormData();
      if (payload.name) formData.append("name", payload.name);
      if (payload.description !== undefined)
        formData.append("description", payload.description);
      if (payload.price !== undefined)
        formData.append("price", payload.price.toString());
      if (payload.discount !== undefined)
        formData.append("discount", payload.discount.toString());
      if (payload.stock_quantity !== undefined)
        formData.append("stock_quantity", payload.stock_quantity.toString());
      formData.append("image", imageFile);

      const res = await this.client.put(`/additional/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("additionals");
      return res.data;
    } else {

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
  linkAdditionalToProduct = async (
    additionalId: string,
    productId: string,
    customPrice?: number,
  ) => {
    const res = await this.client.post(`/additional/${additionalId}/link`, {
      productId,
      customPrice,
    });
    this.clearCache("additionals");
    this.clearCache("products");
    return res.data;
  };
  unlinkAdditionalFromProduct = async (
    additionalId: string,
    productId: string,
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

  addProductComponent = async (
    productId: string,
    component: { item_id: string; quantity: number },
  ) => {
    const res = await this.client.post(
      `/products/${productId}/components`,
      component,
    );
    this.clearCache("products");
    return res.data;
  };
  updateProductComponent = async (
    componentId: string,
    data: { quantity: number },
  ) => {
    const res = await this.client.put(`/components/${componentId}`, data);
    this.clearCache("products");
    return res.data;
  };
  removeProductComponent = async (componentId: string) => {
    const res = await this.client.delete(`/components/${componentId}`);
    this.clearCache("products");
    return res.data;
  };
  getProductComponents = async (productId: string) => {
    const res = await this.client.get(`/products/${productId}/components`);
    return res.data;
  };

  getProducts = async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
    category_id?: string;
    type_id?: string;
    only_active?: boolean;
  }): Promise<ProductsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.perPage)
      queryParams.append("per_page", params.perPage.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category_id)
      queryParams.append("category_id", params.category_id);
    if (params?.type_id) queryParams.append("type_id", params.type_id);

    const onlyActive =
      params?.only_active !== undefined ? params.only_active : true;
    if (onlyActive) {
      queryParams.append("only_active", "true");
    }

    const queryString = queryParams.toString();
    const url = `/products${queryString ? `?${queryString}` : ""}`;

    if (!queryString && ApiService.cache.products) {
      return ApiService.cache.products as ProductsResponse;
    }

    const res = await this.client.get(url);

    if (!queryString) {
      ApiService.cache.products = res.data;
    }

    return res.data;
  };

  getProduct = async (id: string): Promise<Product> =>
    (await this.client.get(`/products/${id}`)).data;

  createProduct = async (
    payload: Partial<ProductInput>,
    imageFile?: File,
  ): Promise<Product> => {
    if (imageFile) {

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
      if (payload.production_time !== undefined)
        formData.append("production_time", payload.production_time.toString());
      formData.append("image", imageFile);

      const res = await this.client.post("/products", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("products");
      return res.data;
    } else {
      const res = await this.client.post("/products", payload);
      this.clearCache("products");
      return res.data;
    }
  };
  updateProduct = async (
    id: string,
    payload: Partial<ProductInput>,
    imageFile?: File,
  ): Promise<Product> => {
    if (imageFile) {

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
      if (payload.production_time !== undefined)
        formData.append("production_time", payload.production_time.toString());
      formData.append("image", imageFile);

      const res = await this.client.put(`/products/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.clearCache("products");
      return res.data;
    } else {

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

  getOrders = async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await this.client.get("/orders", { params });
    return res.data;
  };
  getOrder = async (id: string) =>
    (await this.client.get(`/orders/${id}`)).data;
  createOrder = async (payload: {
    user_id: string;
    items: OrderItemInput[];
    delivery_address?: string | null;
    delivery_city?: string;
    delivery_state?: string;
    delivery_date?: Date | null;
    payment_method?: "pix" | "card";
    recipient_phone?: string;
    discount?: number;
    is_draft?: boolean;
    send_anonymously?: boolean;
    complement?: string;
    delivery_method?: "delivery" | "pickup";
  }) => {
    try {

      const sanitized = this.stripBase64FromOrderPayload(
        payload as Record<string, unknown>,
      );
      const res = await this.client.post("/orders", sanitized);
      this.clearCache("orders");
      return res.data;
    } catch (error: unknown) {
      console.error("API.createOrder failed:", {
        payload,
        error:
          (error as unknown as { response?: { data?: unknown } })?.response
            ?.data || error,
      });
      throw error;
    }
  };
  deleteOrder = async (id: string) => {
    const res = await this.client.delete(`/orders/${id}`);
    this.clearCache("orders");
    return res.data;
  };

  deleteAllCanceledOrders = async () => {
    const res = await this.client.delete("/orders/canceled");
    this.clearCache("orders");
    return res.data;
  };

  updateOrderItems = async (id: string, items: OrderItemInput[]) => {
    try {
      const res = await this.client.put(`/orders/${id}/items`, { items });
      this.clearCache("orders");
      return res.data;
    } catch (error: unknown) {

      console.error("API.updateOrderItems failed", {
        id,
        items,
        error:
          (error as unknown as { response?: { data?: unknown } })?.response
            ?.data || error,
      });
      throw error;
    }
  };

  updateOrderMetadata = async (
    id: string,
    metadata: {
      send_anonymously?: boolean;
      complement?: string;
      delivery_address?: string | null;
      delivery_city?: string | null;
      delivery_state?: string | null;
      recipient_phone?: string | null;
      delivery_date?: string | Date | null;
      shipping_price?: number;
      delivery_method?: "delivery" | "pickup";
      payment_method?: "pix" | "card";
      discount?: number;
    },
  ) => {
    const payload = { ...metadata } as {
      delivery_date?: string | Date | null;
      [key: string]: unknown;
    };
    if (payload.delivery_date instanceof Date) {
      payload.delivery_date = payload.delivery_date.toISOString();
    }
    const res = await this.client.put(`/orders/${id}/metadata`, payload);
    this.clearCache("orders");
    return res.data;
  };

  updateOrderStatus = async (
    id: string,
    status: OrderStatus,
    options?: { notifyCustomer?: boolean },
  ) => {
    const res = await this.client.patch(`/orders/${id}/status`, {
      status,
      notifyCustomer: options?.notifyCustomer,
    });
    this.clearCache("orders");
    return res.data;
  };

  /**
   * Busca customizações de um produto (legado - retrocompatibilidade)
   */
  getProductCustomizations = async (
    productId: string,
  ): Promise<CustomizationRule[]> => {
    const res = await this.client.get(`/products/${productId}/customizations`);
    return res.data;
  };

  /**
   * Busca customizações de um adicional (legado - retrocompatibilidade)
   */
  getAdditionalCustomizations = async (
    additionalId: string,
  ): Promise<CustomizationRule[]> => {
    const res = await this.client.get(
      `/additionals/${additionalId}/customizations`,
    );
    return res.data;
  };

  createProductCustomization = async (
    productId: string,
    data: CustomizationRuleInput,
  ): Promise<CustomizationRule> => {
    const res = await this.client.post(`/admin/customization/product`, {
      ...data,
      product_id: productId,
    });
    return res.data;
  };

  updateProductCustomization = async (
    customizationId: string,
    data: CustomizationRuleInput,
  ): Promise<CustomizationRule> => {
    const res = await this.client.put(
      `/admin/customization/product/${customizationId}`,
      data,
    );
    return res.data;
  };

  deleteProductCustomization = async (customizationId: string) => {
    const res = await this.client.delete(
      `/admin/customization/product/${customizationId}`,
    );
    return res.data;
  };

  createAdditionalCustomization = async (
    additionalId: string,
    data: CustomizationRuleInput,
  ): Promise<CustomizationRule> => {
    const res = await this.client.post(`/admin/customization/additional`, {
      ...data,
      additional_id: additionalId,
    });
    return res.data;
  };

  updateAdditionalCustomization = async (
    customizationId: string,
    data: CustomizationRuleInput,
  ): Promise<CustomizationRule> => {
    const res = await this.client.put(
      `/admin/customization/additional/${customizationId}`,
      data,
    );
    return res.data;
  };

  deleteAdditionalCustomization = async (customizationId: string) => {
    const res = await this.client.delete(
      `/admin/customization/additional/${customizationId}`,
    );
    return res.data;
  };

  /**
   * Valida customizações de um produto
   */
  validateCustomizations = async (
    productId: string,
    customizations: Array<{
      rule_id: string;
      data: Record<string, unknown>;
    }>,
  ): Promise<{ valid: boolean; errors: string[] }> => {
    const res = await this.client.post("/customization/validate", {
      productId,
      customizations,
    });
    return res.data;
  };

  /**
   * Gera preview de customização
   */
  generateCustomizationPreview = async (
    productId: string,
    customizationData: Record<string, unknown>,
  ): Promise<{
    previewUrl?: string;
    model3d?: string;
    message?: string;
  }> => {
    const res = await this.client.post("/customization/preview", {
      productId,
      customizationData,
    });
    return res.data;
  };

  getItemCustomizations = async (
    itemId: string,
  ): Promise<import("../types/customization").CustomizationConfigResponse> => {
    const res = await this.client.get(`/items/${itemId}/customizations`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    return res.data;
  };

  getCustomizationsByReference = async (
    referenceId: string,
  ): Promise<{
    itemType: "PRODUCT" | "ADDITIONAL";
    config: import("../types/customization").CustomizationConfigResponse | null;
  }> => {
    const res = await this.client.get(
      `/customizations/reference/${referenceId}`,
    );
    return res.data;
  };

  validateCustomizationsV2 = async (payload: {
    itemId: string;
    inputs: import("../types/customization").CustomizationInput[];
  }): Promise<import("../types/customization").ValidationResponse> => {
    const res = await this.client.post("/customizations/validate", payload);
    return res.data;
  };

  generatePreview = async (payload: {
    layoutId: string;
    customizations: import("../types/customization").CustomizationInput[];
  }): Promise<import("../types/customization").PreviewPayload> => {
    const res = await this.client.post("/customizations/preview", payload);
    return res.data;
  };

  getLayoutById = async (
    layoutId: string,
  ): Promise<import("../types/personalization").LayoutBase> => {
    const res = await this.client.get(`/layouts/dynamic/${layoutId}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    return res.data;
  };

  private activePollers: Record<string, number> = {};

  pollOrderCustomizations(
    orderId: string,
    onUpdate: (customizations: unknown[]) => void,
    interval = 10000,
  ) {
    if (typeof window === "undefined") return () => {};
    if (this.activePollers[orderId]) clearInterval(this.activePollers[orderId]);
    const id = window.setInterval(async () => {
      try {
        const res = await this.client.get(`/orders/${orderId}/customizations`);
        onUpdate(res.data);
      } catch {

      }
    }, interval);
    this.activePollers[orderId] = id;
    return () => {
      clearInterval(id);
      delete this.activePollers[orderId];
    };
  }

  stopOrderCustomizationsPolling(orderId: string) {
    if (this.activePollers[orderId]) {
      clearInterval(this.activePollers[orderId]);
      delete this.activePollers[orderId];
    }
  }

  listOrderCustomizations = async (
    orderId: string,
  ): Promise<{
    orderId: string;
    items: Array<{
      id: string;
      order_id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      product: {
        id: string;
        name: string;
      };
      customizations: Array<{
        id: string;
        order_item_id: string;
        customization_rule_id: string | null;
        customization_type: string;
        title: string;
        customization_data: string;
        created_at: string;
        updated_at: string;
      }>;
    }>;
  }> => {
    const res = await this.client.get(`/orders/${orderId}/customizations`);
    return res.data;
  };

  getCustomizationReviewData = async (
    orderId: string,
  ): Promise<
    Array<{
      orderItemId: string;
      productId: string;
      productName: string;
      availableCustomizations: Array<{
        id: string;
        name: string;
        type: string;
        isRequired: boolean;
        itemId: string;
        itemName: string;
        componentId: string;
      }>;
      filledCustomizations: Array<{
        id: string;
        order_item_id: string;
        customization_id: string;
        value: Record<string, unknown> | null;
      }>;
    }>
  > => {
    const res = await this.client.get(`/customization/review/${orderId}`);
    return res.data;
  };

  private stripBase64FromCustomizationPayload(
    payload: import("../types/customization").SaveOrderItemCustomizationPayload,
  ) {

    const clone = JSON.parse(JSON.stringify(payload));

    function removeBase64(obj: unknown) {
      if (!obj || typeof obj !== "object") return;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (typeof val === "string") {

          if (val.startsWith("data:") || val.startsWith("blob:")) {
            delete record[key];
            continue;
          }
        }
        if (key === "base64" || key === "base64Data") {
          delete record[key];
          continue;
        }
        if (Array.isArray(val)) {
          val.forEach((v) => removeBase64(v));
        } else if (typeof val === "object") {
          removeBase64(val);
        }
      }
    }

    if (clone.data) removeBase64(clone.data);

    return clone as import("../types/customization").SaveOrderItemCustomizationPayload;
  }

  private stripBase64FromOrderPayload(payload: Record<string, unknown>) {
    const clone = JSON.parse(JSON.stringify(payload));

    function removeBase64(obj: unknown) {
      if (!obj || typeof obj !== "object") return;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];

        if (Array.isArray(val)) {
          val.forEach((item) => removeBase64(item));
          continue;
        }

        if (val && typeof val === "object") {
          removeBase64(val);
          continue;
        }

        if (key === "base64" || key === "base64Data") {
          delete record[key];
          continue;
        }

        if (typeof val === "string") {
          if (val.startsWith("data:") || val.startsWith("blob:")) {

            delete record[key];
            continue;
          }
        }
      }
    }

    if (clone.data && typeof clone.data === "object") {
      removeBase64(clone.data);
    }
    if (clone.finalArtwork && typeof clone.finalArtwork === "object") {
      removeBase64(clone.finalArtwork);
    }
    if (clone.finalArtworks && Array.isArray(clone.finalArtworks)) {
      clone.finalArtworks.forEach((artwork: unknown) => {
        removeBase64(artwork);
      });
    }

    if (Array.isArray(clone.items)) {
      clone.items.forEach((it: unknown) => {
        const item = it as Record<string, unknown>;
        if (!item.customizations) return;

        (item.customizations as unknown[]).forEach((c: unknown) => {
          const customization = c as Record<string, unknown>;
          try {

            if (typeof customization.value === "string") {
              const parsed = JSON.parse(customization.value as string);
              removeBase64(parsed);
              customization.value = JSON.stringify(parsed);
            } else if (typeof customization.value === "object") {
              removeBase64(customization.value);
            }

            if (
              customization.customization_data &&
              typeof customization.customization_data === "object"
            ) {
              removeBase64(customization.customization_data);
            }
          } catch {
            removeBase64(customization);
          }
        });
      });
    }

    return clone as import("../types/customization").SaveOrderItemCustomizationPayload;
  }

  saveOrderItemCustomization = async (
    orderId: string,
    itemId: string,
    payload: import("../types/customization").SaveOrderItemCustomizationPayload,
  ): Promise<{
    id: string;
    order_item_id: string;
    customization_rule_id: string | null;
    customization_type: string;
    title: string;
    customization_data: string;
    created_at: string;
    updated_at: string;
  }> => {
    const payloadSanitized = payload;

    if (
      payloadSanitized.customizationType === "DYNAMIC_LAYOUT" &&
      payloadSanitized.selectedLayoutId
    ) {
      try {
        const layout = await this.getLayoutById(
          payloadSanitized.selectedLayoutId,
        );
        if (layout && layout.title) {
          payloadSanitized.data = payloadSanitized.data || {};
          (payloadSanitized.data as Record<string, unknown>)[
            "selected_layout_title"
          ] = layout.title;
        }
      } catch {

      }
    }

    const res = await this.client.post(
      `/orders/${orderId}/items/${itemId}/customizations`,
      payloadSanitized,
    );
    return res.data;
  };

  uploadCustomizationImage = async (
    imageFile: File,
  ): Promise<{
    success: boolean;
    imageUrl: string;
    filename: string;
    mimeType: string;
    size: number;
  }> => {
    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await this.client.post(
      "/customization/upload-image",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  };

  uploadTempImage = async (
    imageFile: File,
  ): Promise<{
    success: boolean;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    originalName: string;
  }> => {
    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await this.client.post("/temp/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  };

  /**
   * Valida se uma imagem temporária ainda existe no servidor
   * Tenta fazer um HEAD request ou GET simples para verificar
   * Retorna true se a imagem existe, false caso contrário
   */
  validateTempImageExists = async (imageUrl: string): Promise<boolean> => {
    if (!imageUrl) return false;
    try {

      await Promise.race([
        this.client.head(imageUrl),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  deleteTempFile = async (filename: string): Promise<{ success: boolean }> => {
    const res = await this.client.delete(`/temp/files/${filename}`);
    return res.data;
  };

  deleteCustomizationImage = async (filename: string): Promise<void> => {
    await this.client.delete(`/customization/image/${filename}`);
  };

  listAllConstraints = async (): Promise<
    Array<{
      id: string;
      target_item_id: string;
      target_item_type: "PRODUCT" | "ADDITIONAL";
      target_item_name: string | null;
      constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
      related_item_id: string;
      related_item_type: "PRODUCT" | "ADDITIONAL";
      related_item_name: string | null;
      message: string | null;
      created_at: string;
      updated_at: string;
    }>
  > => {
    const res = await this.client.get("/admin/constraints");
    return res.data;
  };

  getConstraintsByItem = async (
    itemType: "PRODUCT" | "ADDITIONAL",
    itemId: string,
  ): Promise<
    Array<{
      id: string;
      target_item_id: string;
      target_item_type: "PRODUCT" | "ADDITIONAL";
      target_item_name: string | null;
      constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
      related_item_id: string;
      related_item_type: "PRODUCT" | "ADDITIONAL";
      related_item_name: string | null;
      message: string | null;
      created_at: string;
      updated_at: string;
    }>
  > => {
    const res = await this.client.get(
      `/admin/constraints/item/${itemType}/${itemId}`,
    );
    return res.data;
  };

  searchItemsForConstraints = async (
    query: string,
  ): Promise<{
    products: Array<{
      id: string;
      name: string;
      type: "PRODUCT";
      image_url: string | null;
    }>;
    additionals: Array<{
      id: string;
      name: string;
      type: "ADDITIONAL";
      image_url: string | null;
    }>;
  }> => {
    const res = await this.client.get(
      `/admin/constraints/search?q=${encodeURIComponent(query)}`,
    );
    return res.data;
  };

  createConstraint = async (payload: {
    target_item_id: string;
    target_item_type: "PRODUCT" | "ADDITIONAL";
    constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
    related_item_id: string;
    related_item_type: "PRODUCT" | "ADDITIONAL";
    message?: string;
  }): Promise<{
    id: string;
    target_item_id: string;
    target_item_type: "PRODUCT" | "ADDITIONAL";
    target_item_name: string | null;
    constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
    related_item_id: string;
    related_item_type: "PRODUCT" | "ADDITIONAL";
    related_item_name: string | null;
    message: string | null;
    created_at: string;
    updated_at: string;
  }> => {
    const res = await this.client.post("/admin/constraints", payload);
    return res.data;
  };

  /**
   * Atualiza um constraint
   * PUT /admin/constraints/:constraintId
   */
  updateConstraint = async (
    constraintId: string,
    payload: Partial<{
      target_item_id: string;
      target_item_type: "PRODUCT" | "ADDITIONAL";
      constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
      related_item_id: string;
      related_item_type: "PRODUCT" | "ADDITIONAL";
      message: string;
    }>,
  ): Promise<{
    id: string;
    target_item_id: string;
    target_item_type: "PRODUCT" | "ADDITIONAL";
    target_item_name: string | null;
    constraint_type: "MUTUALLY_EXCLUSIVE" | "REQUIRES";
    related_item_id: string;
    related_item_type: "PRODUCT" | "ADDITIONAL";
    related_item_name: string | null;
    message: string | null;
    created_at: string;
    updated_at: string;
  }> => {
    const res = await this.client.put(
      `/admin/constraints/${constraintId}`,
      payload,
    );
    return res.data;
  };

  /**
   * Deleta um constraint
   * DELETE /admin/constraints/:constraintId
   */
  deleteConstraint = async (constraintId: string): Promise<void> => {
    await this.client.delete(`/admin/constraints/${constraintId}`);
  };

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

  createTransparentPayment = async (payload: {
    orderId: string;
    payerEmail: string;
    payerName: string;
    payerDocument: string;
    payerDocumentType: "CPF" | "CNPJ";
    paymentMethodId: "pix" | "credit_card" | "debit_card";
    cardToken?: string;
    cardholderName?: string;
    installments?: number;
    issuer_id?: string;
    payment_method_id?: string;
  }) => {

    if (
      !payload.orderId ||
      payload.orderId === "null" ||
      payload.orderId === "undefined"
    ) {
      console.error(
        "❌ Tentativa de pagamento com orderId inválido:",
        payload.orderId,
      );
      throw new Error(
        "ID do pedido inválido. Por favor, tente recarregar a página.",
      );
    }

    try {
      const res = await this.client.post(
        "/payment/transparent-checkout",
        payload,
      );
      return res.data;
    } catch (error: unknown) {

      if (axios.isAxiosError(error) && error.response?.data) {
        const responseData = error.response.data as {
          error?: string;
          details?: string;
          status_detail?: string;
        };

        const friendlyMessage = responseData.error || responseData.details;
        if (friendlyMessage) {
          throw new Error(friendlyMessage);
        }
      }
      throw error;
    }
  };

  getOrderForCheckout = async (orderId: string) => {
    try {
      const res = await this.client.get(`/orders/${orderId}`);
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
            "Erro na requisição",
        );
      }
      throw error;
    }
  };

  getOrderByUserId = async (userId: string) => {
    const res = await this.client.get(`/users/${userId}/orders`);
    return res.data;
  };

  /**
   * Busca o pedido pendente de pagamento do usuário
   */
  getPendingOrder = async (userId: string) => {
    if (!userId) {
      throw new Error("ID do usuário é obrigatório");
    }
    try {
      const res = await this.client.get(`/users/${userId}/orders/pending`);
      return res.data;
    } catch (error: unknown) {

      if (axios.isAxiosError(error) && error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

  /**
   * Cancela um pedido pendente
   */
  cancelOrder = async (orderId: string) => {
    const res = await this.client.post(`/orders/${orderId}/cancel`);
    return res.data;
  };

  getPaymentMethods = async () => {
    const res = await this.client.get("/payment-methods");
    return res.data;
  };

  createCardToken = async (payload: {
    cardNumber: string;
    securityCode: string;
    expirationMonth: string;
    expirationYear: string;
    cardholderName: string;
    identificationType: string;
    identificationNumber: string;
  }) => {
    const res = await this.client.post("/mercadopago/create-token", payload);
    return res.data;
  };

  getCardIssuers = async (payload: {
    bin: string;
    paymentMethodId?: string;
  }) => {
    const res = await this.client.post("/mercadopago/get-issuers", payload);
    return res.data;
  };

  getInstallments = async (
    amount: number,
    bin: string,
    paymentMethodId?: string,
  ) => {
    const res = await this.client.post("/mercadopago/get-installments", {
      amount,
      bin,
      paymentMethodId,
    });
    return res.data;
  };

  getFeedConfigurations = async (): Promise<FeedConfiguration[]> => {
    if (ApiService.cache.feedConfigurations) {
      return ApiService.cache.feedConfigurations as FeedConfiguration[];
    }

    const res = await this.client.get("/admin/feed/configurations");

    ApiService.cache.feedConfigurations = res.data;
    return res.data;
  };

  getFeedConfiguration = async (id: string): Promise<FeedConfiguration> => {
    const res = await this.client.get(`/admin/feed/configurations/${id}`);
    return res.data;
  };

  createFeedConfiguration = async (
    payload: CreateFeedConfigurationInput,
  ): Promise<FeedConfiguration> => {
    const res = await this.client.post("/admin/feed/configurations", payload);
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  updateFeedConfiguration = async (
    id: string,
    payload: UpdateFeedConfigurationInput,
  ): Promise<FeedConfiguration> => {
    const res = await this.client.put(
      `/admin/feed/configurations/${id}`,
      payload,
    );
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  deleteFeedConfiguration = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/configurations/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  createFeedBanner = async (
    payload: CreateFeedBannerInput,
    imageFile?: File,
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
    imageFile?: File,
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
    payload: CreateFeedSectionInput,
  ): Promise<FeedSection> => {
    const res = await this.client.post("/admin/feed/sections", payload);
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  updateFeedSection = async (
    id: string,
    payload: UpdateFeedSectionInput,
  ): Promise<FeedSection> => {
    const res = await this.client.put(`/admin/feed/sections/${id}`, payload);
    ApiService.cache.feedConfigurations = null;
    return res.data;
  };

  deleteFeedSection = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/sections/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  createFeedSectionItem = async (
    data: CreateFeedSectionItemInput,
  ): Promise<FeedSectionItem> => {
    const response = await this.client.post("/admin/feed/section-items", data);
    ApiService.cache.feedConfigurations = null;
    return response.data;
  };

  updateFeedSectionItem = async (
    id: string,
    data: UpdateFeedSectionItemInput,
  ): Promise<FeedSectionItem> => {
    const response = await this.client.put(
      `/admin/feed/section-items/${id}`,
      data,
    );
    ApiService.cache.feedConfigurations = null;
    return response.data;
  };

  deleteFeedSectionItem = async (id: string): Promise<void> => {
    await this.client.delete(`/admin/feed/section-items/${id}`);
    ApiService.cache.feedConfigurations = null;
  };

  getPublicFeed = async (
    configId?: string,
    page?: number,
    perPage?: number,
  ): Promise<PublicFeedResponse> => {
    const cacheKey = `publicFeed_${configId || "default"}_page_${
      page ?? "all"
    }_per_${perPage ?? "all"}`;

    if (ApiService.cache[cacheKey]) {
      return ApiService.cache[cacheKey] as PublicFeedResponse;
    }

    const paramsArr: string[] = [];
    if (configId) paramsArr.push(`config_id=${configId}`);
    if (page !== undefined) paramsArr.push(`page=${page}`);
    if (perPage !== undefined) paramsArr.push(`perPage=${perPage}`);
    const queryString = paramsArr.length ? `?${paramsArr.join("&")}` : "";
    const response = await this.client.get(`/feed${queryString}`);

    ApiService.cache[cacheKey] = response.data;

    return response.data;
  };

  getStockReport = async (threshold: number = 5) => {
    const res = await this.client.get(`/reports/stock?threshold=${threshold}`);
    return res.data;
  };

  getCriticalStock = async () => {
    const res = await this.client.get("/reports/stock/critical");
    return res.data;
  };

  checkLowStock = async (threshold: number = 3) => {
    const res = await this.client.get(
      `/reports/stock/check?threshold=${threshold}`,
    );
    return res.data;
  };

  listCustomers = async (filters?: {
    follow_up?: boolean;
    service_status?: string;
    already_a_customer?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CustomerListResponse> => {
    const params = new URLSearchParams();
    if (filters?.follow_up !== undefined)
      params.append("follow_up", String(filters.follow_up));
    if (filters?.service_status)
      params.append("service_status", filters.service_status);
    if (filters?.already_a_customer !== undefined)
      params.append("already_a_customer", String(filters.already_a_customer));
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.offset) params.append("offset", String(filters.offset));

    const response = await this.client.get(`/customers?${params.toString()}`);
    return response.data;
  };

  getCustomerInfo = async (phone: string): Promise<CombinedCustomerInfo> => {
    const response = await this.client.get(`/customers/${phone}`);
    return response.data;
  };

  upsertCustomer = async (data: UpsertCustomerInput): Promise<N8NCustomer> => {
    const response = await this.client.post("/customers", data);
    return response.data;
  };

  updateCustomerFollowUp = async (
    phone: string,
    followUp: boolean,
  ): Promise<{ success: boolean }> => {
    const response = await this.client.patch(`/customers/${phone}/follow-up`, {
      follow_up: followUp,
    });
    return response.data;
  };

  updateCustomerServiceStatus = async (
    phone: string,
    status: string,
  ): Promise<{ success: boolean }> => {
    const response = await this.client.patch(
      `/customers/${phone}/service-status`,
      { service_status: status },
    );
    return response.data;
  };

  updateCustomerStatus = async (
    phone: string,
    alreadyCustomer: boolean,
  ): Promise<{ success: boolean }> => {
    const response = await this.client.patch(
      `/customers/${phone}/customer-status`,
      { already_a_customer: alreadyCustomer },
    );
    return response.data;
  };

  updateCustomerName = async (
    phone: string,
    name: string,
  ): Promise<{ success: boolean }> => {
    const response = await this.client.patch(`/customers/${phone}/name`, {
      name,
    });
    return response.data;
  };

  sendMessageToCustomer = async (
    phone: string,
    message: string,
  ): Promise<{ success: boolean; customer?: N8NCustomer }> => {
    const response = await this.client.post(
      `/customers/${phone}/send-message`,
      { message },
    );
    return response.data;
  };

  getFollowUpCustomers = async (): Promise<CombinedCustomerInfo[]> => {
    const response = await this.client.get("/customers/follow-up");
    return response.data;
  };

  syncAppUserToN8N = async (userId: string): Promise<{ success: boolean }> => {
    const response = await this.client.post(`/customers/sync/${userId}`);
    return response.data;
  };

  getItemConstraints = async (
    itemId: string,
    itemType: "PRODUCT" | "ADDITIONAL",
  ) => {
    const res = await this.client.get(
      `/constraints/item/${itemType}/${itemId}`,
    );
    return res.data;
  };

  getOrderReviewData = async (orderId: string) => {
    const res = await this.client.get(`/customization/review/${orderId}`);
    return res.data;
  };

  validateOrderCustomizationsFiles = async (orderId: string) => {

    const res = await this.client.get(
      `/orders/${orderId}/customizations/validate`,
    );
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
    [api],
  );

  const value = useMemo(
    () => ({
      ...api,
      invalidateCache,
      clearSpecificCache,
    }),
    [api, invalidateCache, clearSpecificCache],
  );

  return value;
}

export default useApi;
