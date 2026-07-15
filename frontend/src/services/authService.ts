import { apiService } from './api';
import { AuthResponse, LoginCredentials, LoginResponse, RegisterData, User, VerifyLoginCredentials } from '@/types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return await apiService.post<LoginResponse>('/auth/login', credentials);
  }

  async verifyLogin(credentials: VerifyLoginCredentials): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/verify-login', credentials);
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  }

  async resendLoginCode(verificationToken: string): Promise<{ message: string; masked_email: string; expires_in: number }> {
    return await apiService.post('/auth/resend-login-code', {
      verification_token: verificationToken,
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
    }
  }

  async me(): Promise<User> {
    return await apiService.get<User>('/auth/me');
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/refresh');
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  }

  async forgotPassword(email: string): Promise<void> {
    await apiService.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, email: string, password: string): Promise<void> {
    await apiService.post('/auth/reset-password', {
      token,
      email,
      password,
      password_confirmation: password,
    });
  }

  // Profile methods
  async getProfile(userId?: number): Promise<any> {
    const url = userId ? `/profile/${userId}` : '/profile';
    return await apiService.get(url);
  }

  async updateProfile(data: any, userId?: number): Promise<void> {
    const url = userId ? `/profile/${userId}` : '/profile';
    // Use POST with _method=PUT for FormData to work properly with Laravel
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return await apiService.post(url, data);
    }
    return await apiService.put(url, data);
  }

  async changePassword(data: { current_password?: string; password: string; password_confirmation: string }, userId?: number): Promise<void> {
    const url = userId ? `/profile/change-password/${userId}` : '/profile/change-password';
    return await apiService.post(url, data);
  }

  async logoutAllDevices(userId?: number): Promise<void> {
    const url = userId ? `/profile/logout-all/${userId}` : '/profile/logout-all';
    return await apiService.post(url);
  }

  async getActivity(userId?: number): Promise<any> {
    const url = userId ? `/profile/activity/${userId}` : '/profile/activity';
    return await apiService.get(url);
  }

  // Admin methods
  async toggleUserStatus(userId: number): Promise<any> {
    return await apiService.post(`/profile/toggle-status/${userId}`);
  }

  async assignRole(userId: number, role: string): Promise<void> {
    return await apiService.post(`/profile/assign-role/${userId}`, { role });
  }
}

export const authService = new AuthService();


