import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { dahuaStreamGatewayPlugin } from './vite-plugin-dahua-gateway.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dahuaStreamGatewayPlugin(),
    ...(process.env.ELECTRON === 'true' ? [electron({
      entry: 'electron/main.js',
    })] : [])
  ],
  base: './',
  server: {
    watch: {
      ignored: ['**/TaleemiDunya-Android-App/**', '**/whatsapp-ai-server/**', '**/dist/**', '**/node_modules/**'],
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('sweetalert2')) {
              return 'vendor-sweetalert';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'vendor-documents';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
          }
        },
      },
    },
  },
})
