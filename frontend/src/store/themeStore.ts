import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeMode } from '@/types';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      setTheme: (theme: ThemeMode) => {
        set({ theme });
      },

      toggleTheme: () => {
        const { theme } = get();
        const nextTheme: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'black' : 'light';
        set({ theme: nextTheme });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);


