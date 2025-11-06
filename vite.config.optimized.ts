/**
 * Vite Config المحسن - للأداء والـ Code Splitting
 *
 * التحسينات:
 * - Code splitting محسن
 * - Chunk size optimization
 * - Tree shaking محسن
 * - Build optimization
 * - Bundle analysis
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // استخدام SWC للأداء الأفضل
        jsxImportSource: '@emotion/react',
        plugins: [
          // تمكين Fast Refresh
          ['@swc/plugin-emotion', {}],
        ],
      }),

      // Bundle size analysis (في وضع التطوير فقط)
      !isProduction &&
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    // ========================================================================
    // Resolve Configuration
    // ========================================================================
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@context': path.resolve(__dirname, './src/context'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@types': path.resolve(__dirname, './src/types'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },

    // ========================================================================
    // Server Configuration
    // ========================================================================
    server: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: false,
      open: false,
    },

    // ========================================================================
    // Build Configuration (Optimized)
    // ========================================================================
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction, // فقط في التطوير
      minify: isProduction ? 'esbuild' : false,
      cssMinify: isProduction,

      // Chunk size warnings
      chunkSizeWarningLimit: 500, // 500KB

      rollupOptions: {
        output: {
          // ================================================================
          // Manual Chunks - Code Splitting المحسن
          // ================================================================
          manualChunks: (id) => {
            // 1. Node Modules Chunking
            if (id.includes('node_modules')) {
              // React Core (always needed)
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }

              // React Router
              if (id.includes('react-router')) {
                return 'vendor-router';
              }

              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }

              // TanStack Query
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }

              // UI Libraries
              if (
                id.includes('@radix-ui') ||
                id.includes('@headlessui') ||
                id.includes('@heroui')
              ) {
                return 'vendor-ui';
              }

              // Form Libraries
              if (
                id.includes('react-hook-form') ||
                id.includes('@hookform') ||
                id.includes('zod')
              ) {
                return 'vendor-forms';
              }

              // Charts (lazy loaded)
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'vendor-charts';
              }

              // PDF/Export (lazy loaded)
              if (
                id.includes('jspdf') ||
                id.includes('html2canvas') ||
                id.includes('html2pdf')
              ) {
                return 'vendor-pdf';
              }

              // Image Processing (lazy loaded)
              if (id.includes('jimp') || id.includes('browser-image-compression')) {
                return 'vendor-images';
              }

              // Editors (lazy loaded)
              if (id.includes('@monaco-editor') || id.includes('@tinymce')) {
                return 'vendor-editors';
              }

              // Other vendor code
              return 'vendor-misc';
            }

            // 2. Feature-based Chunking
            // POS Features
            if (id.includes('/pages/POS') || id.includes('/context/POS')) {
              return 'feature-pos';
            }

            // Orders Features
            if (id.includes('/pages/Orders') || id.includes('/context/Orders')) {
              return 'feature-orders';
            }

            // Products Features
            if (id.includes('/pages/Product')) {
              return 'feature-products';
            }

            // Store/Shop Features
            if (id.includes('/pages/Store') || id.includes('/pages/Shop')) {
              return 'feature-store';
            }

            // Dashboard Features
            if (id.includes('/pages/Dashboard')) {
              return 'feature-dashboard';
            }

            // Settings Features
            if (id.includes('/pages/Settings')) {
              return 'feature-settings';
            }

            // 3. Shared Components
            if (id.includes('/components/ui/')) {
              return 'shared-ui';
            }

            if (id.includes('/components/')) {
              return 'shared-components';
            }

            // 4. Context/State
            if (id.includes('/context/')) {
              return 'app-context';
            }

            // 5. Utils/Hooks
            if (id.includes('/utils/') || id.includes('/hooks/')) {
              return 'app-utils';
            }
          },

          // Chunk file naming
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name;

            // Vendor chunks في مجلد منفصل
            if (name.startsWith('vendor-')) {
              return 'assets/vendor/[name]-[hash].js';
            }

            // Feature chunks
            if (name.startsWith('feature-')) {
              return 'assets/features/[name]-[hash].js';
            }

            // Shared chunks
            if (name.startsWith('shared-')) {
              return 'assets/shared/[name]-[hash].js';
            }

            // App chunks
            if (name.startsWith('app-')) {
              return 'assets/app/[name]-[hash].js';
            }

            // Default
            return 'assets/js/[name]-[hash].js';
          },

          // Asset file naming
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';

            // Images
            if (/\.(png|jpe?g|gif|svg|ico|webp|avif)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]';
            }

            // Fonts
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }

            // CSS
            if (/\.css$/i.test(name)) {
              return 'assets/css/[name]-[hash][extname]';
            }

            // Default
            return 'assets/[name]-[hash][extname]';
          },

          // Entry file naming
          entryFileNames: 'assets/js/[name]-[hash].js',
        },

        // ================================================================
        // Tree Shaking Optimization
        // ================================================================
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },

      // ================================================================
      // esbuild Configuration
      // ================================================================
      esbuild: {
        // إزالة console.log في الإنتاج
        drop: isProduction ? ['console', 'debugger'] : [],
        // Minify identifiers
        minifyIdentifiers: isProduction,
        minifySyntax: isProduction,
        minifyWhitespace: isProduction,
        // Legal comments
        legalComments: 'none',
      },

      // ================================================================
      // CSS Configuration
      // ================================================================
      cssCodeSplit: true,
      cssMinify: isProduction,

      // ================================================================
      // Asset Inlining
      // ================================================================
      assetsInlineLimit: 4096, // 4KB - inline assets smaller than this
    },

    // ========================================================================
    // Optimization Configuration
    // ========================================================================
    optimizeDeps: {
      include: [
        // React ecosystem
        'react',
        'react-dom',
        'react-router-dom',

        // State management
        'zustand',
        '@tanstack/react-query',

        // UI
        'clsx',
        'tailwind-merge',

        // Utils
        'lodash-es',
        'date-fns',
      ],

      exclude: [
        // Heavy libraries (lazy load)
        '@monaco-editor/react',
        '@tinymce/tinymce-react',
        'jspdf',
        'html2canvas',
        'jimp',
      ],

      // esbuild options
      esbuildOptions: {
        target: 'es2020',
      },
    },

    // ========================================================================
    // Define Global Constants
    // ========================================================================
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // ========================================================================
    // Preview Configuration
    // ========================================================================
    preview: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: false,
    },
  };
});
