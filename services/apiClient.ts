// API Client for Custom Threads Online Store
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private inFlight: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { expiresAt: number; data: any }> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private invalidateCache(endpoint: string): void {
    // Remove all cache entries for this resource and related resources
    const resourcePath = endpoint.split('/').slice(0, 2).join('/'); // e.g., "/settings" or "/products"
    
    for (const [key] of Array.from(this.cache.entries())) {
      if (key.includes(resourcePath)) {
        this.cache.delete(key);
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
    } else if (optHeaders && typeof optHeaders === 'object') {
      for (const [key, value] of Object.entries(optHeaders)) {
        headers[String(key)] = String(value);
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = `${method}:${endpoint}`;

    if (method === 'GET') {
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
      const maxRetries = 1;
      let attempt = 0;

      while (true) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });

        if (response.ok) {
          if (response.status === 204) {
            // Invalidate cache on successful mutation
            if (method !== 'GET') {
              this.invalidateCache(endpoint);
            }
            return {} as T;
          }

          const data = await response.json();

          if (method === 'GET') {
            this.cache.set(cacheKey, {
              data,
              expiresAt: Date.now() + 15000,
            });
          } else {
            // Invalidate cache on successful mutation
            this.invalidateCache(endpoint);
          }

          return data as T;
        }

        if (response.status === 429 || response.status === 503) {
          const cachedFallback = method === 'GET' ? this.cache.get(cacheKey) : undefined;
          if (cachedFallback) {
            return cachedFallback.data as T;
          }
        }

        if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
          attempt += 1;
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
          const delayMs = Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : Math.min(300 * Math.pow(2, attempt), 1500);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
    };

    if (method === 'GET') {
      const promise = execute().finally(() => {
        this.inFlight.delete(cacheKey);
      });
      this.inFlight.set(cacheKey, promise);
      return promise as Promise<T>;
    }

    return execute();
  }

  // Products
  products = {
    getAll: () => this.request<any[]>('/products'),
    getById: (id: string) => this.request<any>(`/products/${id}`),
    create: (data: any) => this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    }),
  };

  // Galleries
  galleries = {
    getAll: () => this.request<any[]>('/galleries'),
    getImages: (galleryId: string) => this.request<any[]>(`/galleries/${galleryId}/images`),
    create: (data: any) => this.request<any>('/galleries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    addImage: (galleryId: string, data: any) => this.request<any>(`/galleries/${galleryId}/images`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateImage: (galleryId: string, imageId: string, data: any) => this.request<any>(`/galleries/${galleryId}/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/galleries/${id}`, {
      method: 'DELETE',
    }),
    deleteImage: (galleryId: string, imageId: string) => 
      this.request<void>(`/galleries/${galleryId}/images/${imageId}`, {
        method: 'DELETE',
      }),
  };

  // Upload
  upload = {
    image: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      return fetch(`${this.baseUrl}/upload/image`, {
        method: 'POST',
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },
  };

  // Settings
  settings = {
    get: () => this.request<any>('/settings'),
    update: (data: any) => this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  };

  // Admin Users
  adminUsers = {
    getAll: () => this.request<any[]>('/admin-users'),
    getById: (id: string) => this.request<any>(`/admin-users/${id}`),
    create: (data: any) => this.request<any>('/admin-users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/admin-users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/admin-users/${id}`, {
      method: 'DELETE',
    }),
    toggleActive: (id: string) => this.request<any>(`/admin-users/${id}/toggle-active`, {
      method: 'PATCH',
    }),
  };

  // Customers
  customers = {
    getAll: () => this.request<any[]>('/customers'),
    getById: (id: string) => this.request<any>(`/customers/${id}`),
    register: (data: any) => this.request<any>('/customers/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    create: (data: any) => this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/customers/${id}`, {
      method: 'DELETE',
    }),
    toggleActive: (id: string) => this.request<any>(`/customers/${id}/toggle-active`, {
      method: 'PATCH',
    }),
  };
  auth = {
    adminLogin: (username: string, password: string) => 
      this.request<{ token: string; admin: any }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    customerRegister: (name: string, email: string, password: string) =>
      this.request<{ token: string; customer: any }>('/auth/customer/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    customerLogin: (email: string, password: string) =>
      this.request<{ token: string; customer: any }>('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  };

  // Generic CRUD helpers for other entities
  private createCrud(resource: string) {
    return {
      getAll: () => this.request<any[]>(`/${resource}`),
      getById: (id: string) => this.request<any>(`/${resource}/${id}`),
      create: (data: any) => this.request<any>(`/${resource}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (id: string, data: any) => this.request<any>(`/${resource}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
      delete: (id: string) => this.request<void>(`/${resource}/${id}`, {
        method: 'DELETE',
      }),
    };
  }

  pages = this.createCrud('pages');
  reviews = this.createCrud('reviews');
  staff = this.createCrud('staff');
  services = this.createCrud('services');
  orders = {
    getAll: () => this.request<any[]>('/orders'),
    getById: (id: string) => this.request<any>(`/orders/${id}`),
    getForCustomer: (customerId: string) =>
      this.request<any[]>(`/orders/customer/${customerId}`),
    create: (data: any) => this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/orders/${id}`, {
      method: 'DELETE',
    }),
  };
  
  // Tickets with custom methods
  tickets = {
    getAll: () => this.request<any[]>('/tickets'),
    getForCustomer: (customerId: string) =>
      this.request<any[]>(`/tickets?customerId=${encodeURIComponent(customerId)}`),
    getById: (id: string) => this.request<any>(`/tickets/${id}`),
    create: (data: any) => this.request<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/tickets/${id}`, {
      method: 'DELETE',
    }),
    addReply: (id: string, author: 'customer' | 'support', message: string) => 
      this.request<any>(`/tickets/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ author, message }),
      }),
    sendEmail: (data: any) => this.request<any>('/tickets/send-ticket-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
