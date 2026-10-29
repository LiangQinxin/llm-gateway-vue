import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
    // 本地开发联调代理：/api/v1 与 /v1 均转发到后端服务
    // 注意用 /api/ 而非 /api，避免页面路由 /apikeys 被误匹配
    proxy: {
      '/api/': {
        target: 'http://localhost:8091',
        changeOrigin: true,
      },
      '/v1/': {
        target: 'http://localhost:8091',
        changeOrigin: true,
      },
    },
  },
})
