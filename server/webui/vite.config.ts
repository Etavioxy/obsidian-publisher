import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  appType: 'spa',
  base: '/',
  plugins: [UnoCSS()],
  
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },

  build: {
    target: 'ES2020',
    minify: 'terser',
    sourcemap: false,
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },

  publicDir: 'public',
});
