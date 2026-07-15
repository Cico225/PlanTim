import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LoginVerificationResponse, User } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, recaptchaToken?: string | null) => Promise<LoginVerificationResponse | void>;
  verifyLogin: (verificationToken: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, recaptchaToken?: string | null) => {
        set({ isLoading: true });
        try {
          const credentials: any = { email, password };
          if (recaptchaToken) {
            credentials.recaptcha_token = recaptchaToken;
          }
          const response = await authService.login(credentials);

          if ('requires_verification' in response && response.requires_verification) {
            set({ isLoading: false });
            return response;
          }

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyLogin: async (verificationToken: string, code: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.verifyLogin({
            verification_token: verificationToken,
            code,
          });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.register({
            name,
            email,
            password,
            password_confirmation: password,
          });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed, continuing with local logout:', error);
        } finally {
          // Clear state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          
          // Clear localStorage manually to ensure it's cleared
          localStorage.removeItem('token');
          localStorage.removeItem('auth-storage');
          
          // Redirect to login
          window.location.href = '/login';
        }
      },

      checkAuth: async () => {
        // First, try to get token from zustand persist storage
        const persistedState = localStorage.getItem('auth-storage');
        let token = null;
        
        if (persistedState) {
          try {
            const parsed = JSON.parse(persistedState);
            token = parsed?.state?.token || null;
          } catch (e) {
            console.warn('Failed to parse auth-storage:', e);
          }
        }
        
        // Fallback to direct localStorage token
        if (!token) {
          token = localStorage.getItem('token');
        }
        
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        try {
          const user = await authService.me();
          set({ user, token, isAuthenticated: true });
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);


