import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-switch'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 600,
    // Enable minification
    minify: 'esbuild',
    // Generate source maps only in development
    sourcemap: mode === 'development',
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.png", "robots.txt", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-192.png", "pwa-maskable-512.png"],
      manifest: {
        name: "FarmEye - খামার থাকবে সবসময় নজরে",
        short_name: "FarmEye",
        description: "স্মার্ট পোল্ট্রি ফার্ম মনিটরিং - A Nexiot Labs Product",
        theme_color: "#1F7A63",
        background_color: "#f0f7f5",
        display: "standalone",
        display_override: ["standalone"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        id: "farmeye-app",
        categories: ["productivity", "utilities", "business"],
        lang: "bn",
        dir: "ltr",
        prefer_related_applications: false,
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "FarmEye Dashboard",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "FarmEye Desktop",
          },
        ],
        shortcuts: [
          {
            name: "ড্যাশবোর্ড",
            short_name: "Dashboard",
            description: "View farm dashboard",
            url: "/",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "কন্ট্রোল",
            short_name: "Control",
            description: "Control devices",
            url: "/control",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        // Do NOT precache index.html — always fetch fresh from network so
        // installed PWAs pick up new builds immediately on next navigation.
        globIgnores: ["**/index.html"],
        // Do not let Workbox precache index.html as SPA fallback; navigation
        // is handled by the NetworkFirst runtime rule below for fresh updates.
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/api/, /^\/~oauth/],
        // Force immediate activation of new SW
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on new SW activation
        cleanupOutdatedCaches: true,
        // Import push notification handlers into the generated SW
        importScripts: ['/sw.js'],
        runtimeCaching: [
          {
            // Always fetch the HTML shell from network first so updates
            // appear immediately. Falls back to cache only when offline.
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' || url.pathname.endsWith('/index.html'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-shell',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24, // 1 day fallback
              },
            },
          },
          {
            // Live farm data and auth must never be served from stale SW cache.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
}));
