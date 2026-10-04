import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Skinport не віддає CORS-заголовків, тому в dev/preview ходимо через локальний проксі
const skinport = { '/skinport': { target: 'https://api.skinport.com', changeOrigin: true,
  rewrite: p => p.replace(/^\/skinport/, ''), headers: { 'Accept-Encoding': 'br' } } };
export default defineConfig({
  // Відносні шляхи: працює на GitHub Pages за будь-якої назви репозиторію, на своєму домені й з локальної папки
  base: './',
  plugins: [react()],
  // JSON як JSON.parse('...') — на телефонах парситься в рази швидше за великий JS-літерал
  json: { stringify: true },
  build: {
    target: 'es2020', cssMinify: true, chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { manualChunks: id => id.includes('node_modules') ? 'vendor' : /data\/(skins|cases)\.json/.test(id) ? 'data' : undefined } },
  },
  server: { proxy: skinport }, preview: { proxy: skinport },
});
