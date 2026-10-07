import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// GitHub Pages serves the app from /<repo>/, so the base path comes from the build (BASE_PATH=/Onda/).
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'favicon.svg'],
      injectManifest: {
        // Latin UI fonts are precached; the large CJK / Arabic subset chunks are cached at runtime on first use.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/*-latin-*.woff2'],
        // iOS fetches launch images itself at install time; no need to hold them in the cache.
        globIgnores: ['splash/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        id: './',
        name: 'Onda',
        short_name: 'Onda',
        description: 'Experiment with how you live. Habit experiments and immersive worlds of practice.',
        lang: 'en',
        start_url: './?source=pwa',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1F2F6',
        theme_color: '#F1F2F6',
        categories: ['lifestyle', 'health', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Lagos', url: './?tab=lagos', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Ondas', url: './?tab=ondas', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('../content', import.meta.url)),
      '@shared': fileURLToPath(new URL('../supabase/functions/_shared', import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: false, cssCodeSplit: true },
})
