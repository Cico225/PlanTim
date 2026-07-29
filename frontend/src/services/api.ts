import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Always use relative URL for Vite proxy to work correctly
// Vite proxy will forward /api requests to backend
const API_URL = '/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (!config.method) {
          config.method = 'get';
        }
        // Ako je FormData, ne postavljaj Content-Type - axios će automatski postaviti sa boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        if (error.response) {
          const { status, data } = error.response;

          // Handle specific status codes
          switch (status) {
            case 401:
              // Unauthorized - clear auth and redirect to login
              localStorage.removeItem('token');
              localStorage.removeItem('auth-storage');
              window.location.href = '/login';
              toast.error('Sesija je istekla. Molimo prijavite se ponovo.');
              break;

            case 403:
              toast.error('Nemate dozvolu za ovu akciju.');
              break;

            case 404:
              // Don't show toast for optional/non-critical endpoints
              const silentEndpoints = [
                '/app-version', 
                '/inbox/can-send', 
                '/inbox/unread-count',
                '/hrm/', // HRM endpoints might not all be implemented yet
              ];
              const shouldSilence = silentEndpoints.some(ep => error.config?.url?.includes(ep));
              if (!shouldSilence && error.config?.url) {
                // Only show error if it's not a silent endpoint
                console.warn('404 error for:', error.config.url);
                // Don't show toast - just log to console to avoid annoying users
                // toast.error('Resurs nije pronađen.');
              }
              break;

            case 422:
              // Validation errors
              if (data.errors) {
                const firstError = Object.values(data.errors)[0];
                if (Array.isArray(firstError)) {
                  toast.error(firstError[0]);
                }
              } else if (data.message) {
                toast.error(data.message);
              }
              break;

            case 500:
              toast.error('Greška na serveru. Pokušajte ponovo.');
              break;

            default:
              toast.error(data.message || 'Došlo je do greške.');
          }
        } else if (error.request) {
          toast.error('Nema odgovora od servera. Provjerite internet konekciju.');
        } else {
          toast.error('Greška pri slanju zahtjeva.');
        }

        return Promise.reject(error);
      }
    );
  }

  // GET request
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  // POST request
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  // PUT request
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return response.data;
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch<T>(url, data);
    return response.data;
  }

  // DELETE request
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
  }

  // Upload file
  async upload<T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.api.post<T>(url, formData, {
      // Ne postavljaj Content-Type eksplicitno - axios će automatski postaviti sa boundary za FormData
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  // Download file
  async download(url: string, filename?: string, params?: Record<string, unknown>): Promise<void> {
    const response = await this.api.get(url, {
      responseType: 'blob',
      params,
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    let resolvedFilename = filename;
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
      if (utf8Match?.[1]) {
        resolvedFilename = decodeURIComponent(utf8Match[1]);
      } else if (plainMatch?.[1]) {
        resolvedFilename = plainMatch[1];
      }
    }

    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = resolvedFilename || 'download';
    link.click();
    window.URL.revokeObjectURL(link.href);
  }
}

export const apiService = new ApiService();


