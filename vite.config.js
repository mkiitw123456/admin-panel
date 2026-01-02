import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel 部署請使用 '/' (根目錄)，或者直接刪除這一行也可以
  base: '/', 
})