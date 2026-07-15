/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Dark mode colors
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Black mode (OLED)
        black: {
          DEFAULT: '#000000',
          light: '#0a0a0a',
          card: '#111111',
          border: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gift-open': 'giftOpen 1s ease-out',
        'slide-in-right': 'slideInRight 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
        'edel-appear': 'edelAppear 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both',
        'edel-talk': 'edelTalk 0.38s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'edel-bar': 'edelBarPulse 0.32s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'edel-bar-alt': 'edelBarPulseAlt 0.4s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'edel-aura': 'edelAura 1s ease-in-out infinite',
        'edel-glow-ring': 'edelGlowRing 0.75s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        giftOpen: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        edelAppear: {
          '0%': { transform: 'translateY(1rem) scale(0.92)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        edelTalk: {
          '0%, 100%': { transform: 'scale(1, 1) rotate(0deg)' },
          '12%': { transform: 'scale(1.1, 0.88) rotate(-2deg)' },
          '28%': { transform: 'scale(0.9, 1.14) rotate(2.2deg)' },
          '45%': { transform: 'scale(1.08, 0.92) rotate(-1.5deg)' },
          '62%': { transform: 'scale(0.94, 1.1) rotate(1.8deg)' },
          '78%': { transform: 'scale(1.05, 0.95) rotate(-0.8deg)' },
          '90%': { transform: 'scale(0.98, 1.04) rotate(0.5deg)' },
        },
        edelBarPulse: {
          '0%, 100%': { transform: 'scaleY(0.12)', opacity: '0.45' },
          '50%': { transform: 'scaleY(1.35)', opacity: '1' },
        },
        edelBarPulseAlt: {
          '0%, 100%': { transform: 'scaleY(0.25)', opacity: '0.55' },
          '50%': { transform: 'scaleY(0.85)', opacity: '0.95' },
        },
        edelAura: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.88)' },
          '50%': { opacity: '0.85', transform: 'scale(1.18)' },
        },
        edelGlowRing: {
          '0%, 100%': {
            boxShadow:
              '0 0 0 3px rgba(157, 23, 77, 0.55), 0 0 28px 4px rgba(157, 23, 77, 0.35), 0 12px 28px -6px rgba(131, 24, 67, 0.45)',
          },
          '50%': {
            boxShadow:
              '0 0 0 10px rgba(157, 23, 77, 0.15), 0 0 40px 8px rgba(236, 72, 153, 0.45), 0 18px 44px -4px rgba(157, 23, 77, 0.55)',
          },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 20px -3px rgba(0, 0, 0, 0.1), 0 12px 25px -2px rgba(0, 0, 0, 0.06)',
        'hard': '0 10px 40px -3px rgba(0, 0, 0, 0.15), 0 20px 35px -2px rgba(0, 0, 0, 0.08)',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}

