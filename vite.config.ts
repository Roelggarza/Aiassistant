import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// NOTE: base '/Aiassistant/' matches the GitHub Pages project site
// https://roelggarza.github.io/Aiassistant/ — change to '/' for a custom domain.
export default defineConfig({
  base: '/Aiassistant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we ship our own public/manifest.webmanifest
      workbox: {
        // Cache the app shell; API calls (Jev, Hermes gateway) always go to network.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.typesafe\.ai\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
