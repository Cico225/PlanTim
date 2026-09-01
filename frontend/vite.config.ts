import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// HTTPS — server cert (mreza) ili localhost fallback
function getHttpsConfig() {
  const candidates = [
    ['certs/server-key.pem', 'certs/server-cert.pem'],
    ['certs/localhost-key.pem', 'certs/localhost-cert.pem'],
  ]

  for (const [keyFile, certFile] of candidates) {
    const keyPath = path.resolve(__dirname, keyFile)
    const certPath = path.resolve(__dirname, certFile)
    try {
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      }
    } catch {
      // try next pair
    }
  }

  console.warn('HTTPS certificates not found in frontend/certs/ — run GENERATE_VITE_SSL_CERT.bat')
  return false
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    host: true,
    https: getHttpsConfig(),
    // Interna mreza — dozvoli pristup preko LAN IP (npr. 192.168.1.126)
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-icons'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: false,
    },
  },
})

