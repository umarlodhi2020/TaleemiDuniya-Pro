import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    watch: {
      ignored: ['**/TaleemiDunya-Android-App/**', '**/whatsapp-ai-server/**', '**/dist/**', '**/node_modules/**'],
    },
  },
})

