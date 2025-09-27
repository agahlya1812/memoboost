import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  base: process.env.NODE_ENV === 'production' ? '/memoboost/' : '/',
=======
  base: '/memoboost/',
>>>>>>> a2e33565188feef5fcf597a7844cb430c821ecaa
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
<<<<<<< HEAD
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://memoboost-api-xxxx.onrender.com/api' 
        : '/api'
    )
=======
>>>>>>> a2e33565188feef5fcf597a7844cb430c821ecaa
  }
})
