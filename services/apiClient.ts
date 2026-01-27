// API Client for Custom Threads Online Store
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

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

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
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
    delete: (id: string) => this.request<void>(`/galleries/${id}`, {
      method: 'DELETE',
    }),
    deleteImage: (galleryId: string, imageId: string) => 
      this.request<void>(`/galleries/${galleryId}/images/${imageId}`, {
        method: 'DELETE',
      }),
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
  orders = this.createCrud('orders');
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
