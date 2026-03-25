import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL
    ? '/'
    : (process.env.NODE_ENV === 'production' ? '/memoboost/' : '/'),
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
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://memoboost-api.onrender.com/api' 
        : '/api'
    ),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'https://eimvhidyuqkkxxznoiog.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbXZoaWR5dXFra3h4em5vaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzOTUsImV4cCI6MjA3NTQ1MDM5NX0.MBIRvQ9XI_5phOb1MczoXn7CGVA3e4lwKJl0657lj08'
    )
  }
})