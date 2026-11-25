import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Versión nueva activa al momento (sin quedarse con la web vieja en caché).
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // La API, Swagger, la descarga del APK y Socket.IO nunca se sirven desde el SPA.
        navigateFallbackDenylist: [/^\/v\d+\//, /^\/docs/, /^\/socket\.io/],
      },
      manifest: {
        name: 'Karaoke Smart',
        short_name: 'Karaoke',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, host: true },
  test: { environment: 'jsdom' },
} as never);
