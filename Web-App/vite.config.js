import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Odoo ngrok URL ────────────────────────────────────────────────────────────
// Doit correspondre à ODOO_URL dans backend/.env
const ODOO_URL = 'https://leandra-trichomic-flexibly.ngrok-free.dev'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Trafic Laravel API
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Trafic Odoo direct (web app)
      '/odoo': {
        target: ODOO_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/odoo/, ''),
        secure: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    }
  }
})
