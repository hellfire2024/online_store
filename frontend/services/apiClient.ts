// API Client for Custom Threads Online Store
let API_BASE_URL = "/api";

export function setApiClientBaseUrl(url: string) {
  API_BASE_URL = url;
  apiClient.setBaseUrl(url);
  if (window && typeof window === "object") {
    (window as any).__API_BASE_URL__ = url;
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private inFlight: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { expiresAt: number; data: any }> = new Map();
  private activeRequests = 0;
  private requestQueue: Array<() => void> = [];
  private maxConcurrent = 3;
  private minSpacingMs = 120;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to load token from localStorage
    try {
      this.token = localStorage.getItem("auth_token");
      if (this.token) {
        console.log("[ApiClient] Token loaded from localStorage at init");
      }
    } catch (error) {
      console.warn(
        "[ApiClient] Could not load token from localStorage:",
        error,
      );
      this.token = null;
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private invalidateCache(endpoint: string): void {
    // Remove all cache entries for this resource and related resources
    const resourcePath = endpoint.split("/").slice(0, 2).join("/"); // e.g., "/settings" or "/products"

    for (const [key] of Array.from(this.cache.entries())) {
      if (key.includes(resourcePath)) {
        this.cache.delete(key);
      }
    }
  }

  private async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.requestQueue.push(resolve));
    }

    this.activeRequests += 1;
    try {
      const result = await fn();
      await new Promise((resolve) => setTimeout(resolve, this.minSpacingMs));
      return result;
    } finally {
      this.activeRequests -= 1;
      const next = this.requestQueue.shift();
      if (next) {
        next();
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const optHeaders = options.headers as any;
    if (optHeaders instanceof Headers) {
      optHeaders.forEach((value: string, key: string) => {
        headers[key] = value;
      });
    } else if (Array.isArray(optHeaders)) {
      for (const [key, value] of optHeaders) {
        headers[String(key)] = String(value);
      }
    } else if (optHeaders && typeof optHeaders === "object") {
      for (const [key, value] of Object.entries(optHeaders)) {
        headers[String(key)] = String(value);
      }
    }

    // Ensure token is loaded from localStorage if not already set
    if (!this.token && typeof localStorage !== "undefined") {
      try {
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          this.token = storedToken;
          console.log("[ApiClient] Token reloaded from localStorage");
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (endpoint.includes("/customer")) {
      console.warn(
        "[ApiClient] No token available for customer endpoint:",
        endpoint,
      );
    }

    const method = (options.method || "GET").toUpperCase();
    const cacheKey = `${method}:${endpoint}`;

    if (method === "GET") {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }

      const existing = this.inFlight.get(cacheKey);
      if (existing) {
        return existing as Promise<T>;
      }
    }

    const execute = async (): Promise<T> => {
      const maxRetries = 4;
      let attempt = 0;

      while (true) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`[API] ${method} ${url}`);
        const response = await fetch(url, {
          ...options,
          headers,
        });

        console.log(`[API] Response ${method} ${url}: ${response.status}`);

        if (response.ok) {
          if (response.status === 204) {
            // Invalidate cache on successful mutation
            if (method !== "GET") {
              this.invalidateCache(endpoint);
            }
            return {} as T;
          }

          const data = await this.parseJsonResponse(response, method, endpoint);

          if (method === "GET") {
            this.cache.set(cacheKey, {
              data,
              expiresAt: Date.now() + 60000,
            });
          } else {
            // Invalidate cache on successful mutation
            this.invalidateCache(endpoint);
          }

          return data as T;
        }

        if (response.status === 429 || response.status === 503) {
          const cachedFallback =
            method === "GET" ? this.cache.get(cacheKey) : undefined;
          if (cachedFallback) {
            return cachedFallback.data as T;
          }
        }

        if (
          (response.status === 429 || response.status === 503) &&
          attempt < maxRetries
        ) {
          attempt += 1;
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfterSeconds = retryAfterHeader
            ? parseInt(retryAfterHeader, 10)
            : NaN;
          const delayMs = Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : Math.min(500 * Math.pow(2, attempt), 5000) +
              Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const error = await response.json().catch((parseErr) => {
          console.error(
            `[API] Failed to parse JSON error for ${method} ${endpoint}:`,
            parseErr,
          );
          return null;
        });

        // Create a custom error object that includes the status code
        const createApiError = (message: string, status: number) => {
          const err: any = new Error(message);
          err.status = status;
          err.response = { status };
          return err;
        };

        if (error && typeof error === "object") {
          const validationErrors = (error as any).errors;
          if (Array.isArray(validationErrors) && validationErrors.length > 0) {
            const firstValidationError =
              validationErrors[0]?.msg || validationErrors[0]?.message;
            if (firstValidationError) {
              throw createApiError(
                String(firstValidationError),
                response.status,
              );
            }
          }

          const maybeError = (error as any).error || (error as any).message;
          if (maybeError) {
            throw createApiError(String(maybeError), response.status);
          }
        }

        throw createApiError(
          `HTTP ${response.status} ${response.statusText}`,
          response.status,
        );
      }
    };

    if (method === "GET") {
      const promise = this.enqueue(execute).finally(() => {
        this.inFlight.delete(cacheKey);
      });
      this.inFlight.set(cacheKey, promise);
      return promise as Promise<T>;
    }

    return this.enqueue(execute);
  }

  private async parseJsonResponse(
    response: Response,
    method: string,
    endpoint: string,
  ): Promise<any> {
    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();
    const bodyText = await response.text();

    if (!bodyText.trim()) {
      return {};
    }

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Expected JSON but received '${contentType || "unknown"}' for ${method} ${endpoint}`,
      );
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      throw new Error(`Invalid JSON response for ${method} ${endpoint}`);
    }
  }

  // Products
  products = {
    getAll: () => this.request<any[]>("/products"),
    getById: (id: string) => this.request<any>(`/products/${id}`),
    create: (data: any) =>
      this.request<any>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/products/${id}`, {
        method: "DELETE",
      }),
  };

  emailConfig = {
    test: (payload: { emailConfig?: any; testEmail: string }) =>
      this.request<any>("/email-config/test", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };

  // Galleries
  galleries = {
    getAll: () => this.request<any[]>("/galleries"),
    getImages: (galleryId: string) =>
      this.request<any[]>(`/galleries/${galleryId}/images`),
    create: (data: any) =>
      this.request<any>("/galleries", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    addImage: (galleryId: string, data: any) =>
      this.request<any>(`/galleries/${galleryId}/images`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateImage: (galleryId: string, imageId: string, data: any) =>
      this.request<any>(`/galleries/${galleryId}/images/${imageId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/galleries/${id}`, {
        method: "DELETE",
      }),
    deleteImage: (galleryId: string, imageId: string) =>
      this.request<void>(`/galleries/${galleryId}/images/${imageId}`, {
        method: "DELETE",
      }),
  };

  // Upload
  upload = {
    image: (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      return fetch(`${this.baseUrl}/upload/image`, {
        method: "POST",
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      });
    },
  };

  // Settings
  settings = {
    get: () => this.request<any>("/settings"),
    update: (data: any) =>
      this.request<any>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  };

  // Admin Users
  adminUsers = {
    getAll: () => this.request<any[]>("/admin-users"),
    getById: (id: string) => this.request<any>(`/admin-users/${id}`),
    create: (data: any) =>
      this.request<any>("/admin-users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/admin-users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/admin-users/${id}`, {
        method: "DELETE",
      }),
    toggleActive: (id: string) =>
      this.request<any>(`/admin-users/${id}/toggle-active`, {
        method: "PATCH",
      }),
  };

  // Customers
  customers = {
    getAll: () => this.request<any[]>("/customers"),
    getById: (id: string) => this.request<any>(`/customers/${id}`),
    register: (data: any) =>
      this.request<any>("/customers/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    create: (data: any) =>
      this.request<any>("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/customers/${id}`, {
        method: "DELETE",
      }),
    toggleActive: (id: string) =>
      this.request<any>(`/customers/${id}/toggle-active`, {
        method: "PATCH",
      }),
  };

  // Customer Addresses
  customerAddresses = {
    getAll: (customerId: string) =>
      this.request<any[]>(`/customer-addresses/${customerId}`),
    add: (customerId: string, address: any) =>
      this.request<any>(`/customer-addresses/${customerId}`, {
        method: "POST",
        body: JSON.stringify(address),
      }),
    update: (customerId: string, addressId: string, address: any) =>
      this.request<any>(`/customer-addresses/${customerId}/${addressId}`, {
        method: "PUT",
        body: JSON.stringify(address),
      }),
    delete: (customerId: string, addressId: string) =>
      this.request<void>(`/customer-addresses/${customerId}/${addressId}`, {
        method: "DELETE",
      }),
  };
  auth = {
    adminLogin: (username: string, password: string) =>
      this.request<{ token: string; admin: any }>("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    customerRegister: (
      firstName: string,
      lastName: string,
      email: string,
      password: string,
      phone?: string,
    ) =>
      this.request<{ token: string; customer: any }>(
        "/auth/customer/register",
        {
          method: "POST",
          body: JSON.stringify({ firstName, lastName, email, password, phone }),
        },
      ),
    customerLogin: (email: string, password: string) =>
      this.request<{ token: string; customer: any }>("/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    getCurrentCustomer: () =>
      this.request<any>("/auth/customer/me", {
        method: "GET",
      }),
    customerRequestPasswordReset: (email: string) =>
      this.request<{ success: boolean; message?: string }>(
        "/auth/customer/request-password-reset",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      ),
    customerChangePassword: (currentPassword: string, newPassword: string) =>
      this.request<{ success: boolean; message?: string }>(
        "/auth/customer/change-password",
        {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      ),
  };

  // Generic CRUD helpers for other entities
  private createCrud(resource: string) {
    return {
      getAll: () => this.request<any[]>(`/${resource}`),
      getById: (id: string) => this.request<any>(`/${resource}/${id}`),
      create: (data: any) =>
        this.request<any>(`/${resource}`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: any) =>
        this.request<any>(`/${resource}/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        this.request<void>(`/${resource}/${id}`, {
          method: "DELETE",
        }),
    };
  }

  pages = this.createCrud("pages");
  reviews = this.createCrud("reviews");
  staff = this.createCrud("staff");
  services = this.createCrud("services");
  orders = {
    getAll: () => this.request<any[]>("/orders"),
    getById: (id: string) => this.request<any>(`/orders/${id}`),
    getForCustomer: (customerId: string) =>
      this.request<any[]>(`/orders/customer/${customerId}`),
    create: (data: any) =>
      this.request<any>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/orders/${id}`, {
        method: "DELETE",
      }),
  };

  // Tickets with custom methods
  tickets = {
    getAll: () => this.request<any[]>("/tickets"),
    getForCustomer: (customerId: string) =>
      this.request<any[]>(
        `/tickets?customerId=${encodeURIComponent(customerId)}`,
      ),
    getById: (id: string) => this.request<any>(`/tickets/${id}`),
    create: (data: any) =>
      this.request<any>("/tickets", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/tickets/${id}`, {
        method: "DELETE",
      }),
    addReply: (id: string, author: "customer" | "support", message: string) =>
      this.request<any>(`/tickets/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ author, message }),
      }),
    sendEmail: (data: any) =>
      this.request<any>("/tickets/send-ticket-email", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };

  // Contact form submission
  contact = {
    submit: (data: {
      targetEmail?: string;
      subject: string;
      fields: Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        value: string;
      }>;
    }) =>
      this.request<any>("/contact", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
