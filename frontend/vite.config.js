import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const normalizedBasePath = process.env.BASE_PATH?.trim();
const base = normalizedBasePath
  ? normalizedBasePath.startsWith('/')
    ? normalizedBasePath
    : `/${normalizedBasePath}`
  : process.env.GITHUB_ACTIONS && repositoryName
    ? `/${repositoryName}/`
    : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Medição de Rotas',
        short_name: 'Medição',
        theme_color: '#5D52D1',
        background_color: '#14132B',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      },
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
