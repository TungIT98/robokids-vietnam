import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'
import visualizer from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'favicon.ico', 'models/**/*.glb'],
      manifest: {
        name: 'RoboKids Vietnam',
        short_name: 'RoboKids',
        description: 'STEM Robotics Education Platform for Vietnamese children',
        theme_color: '#0a0a1a',
        background_color: '#0a0a1a',
        display: 'standalone',
        icons: [
          {
            src: 'robokids-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'robokids-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Maximum file size to cache (default is 2MB, increase for bundle analysis)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Pre-cache critical assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching for API calls and models
        runtimeCaching: [
          {
            // Cache Blockly toolsets for offline use
            urlPattern: /^https:\/\/blockly.*\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'blockly-toolsets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache 3D models (astronaut.glb, robot.glb)
            urlPattern: /\/models\/.*\.glb$/,
            handler: 'CacheFirst',
            options: {
              cacheName: '3d-models',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache API responses (graceful degradation)
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          }
        ]
      }
    }),
    compression({
      include: [/\.js$/, /\.css$/, /\.html$/, /\.svg$/, /\.json$/],
      exclude: [/\.glb$/, /\.gltf$/], // 3D models need Draco compression, not gzip
    }),
    visualizer({ filename: 'dist/stats.html' }),
  ],
  server: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-chakra': ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          'vendor-blockly': ['blockly'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-ui': ['framer-motion', 'recharts', '@tanstack/react-query'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})