import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 注意：這裡必須是 '/您的GitHub儲存庫名稱/'，前後都要有斜線
  base: '/admin-panel/', 
})