// API Client for Custom Threads Online Store
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

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

  // Auth
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
  customers = this.createCrud('customers');
  orders = this.createCrud('orders');
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
