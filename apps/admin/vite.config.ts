import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  server: { port: 5174, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } },
})
