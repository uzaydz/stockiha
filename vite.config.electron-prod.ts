/**
 * Vite Configuration for Electron Production Build
 * تكوين محسّن للإنتاج - يقلل حجم التطبيق بشكل كبير
 *
 * الهدف: تقليل حجم التطبيق من ~230MB إلى ~80-100MB
 */

import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import million from "million/compiler";
import Icons from 'unplugin-icons/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import * as path from "path";
import * as fs from "fs";

// Plugin لخدمة ملفات PowerSync Worker و WASM
function powersyncProductionPlugin(): Plugin {
  return {
    name: 'powersync-production-plugin',
    enforce: 'pre',
    generateBundle(options, bundle) {
      // إزالة source maps من الـ bundle
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.map')) {
          delete bundle[fileName];
        }
      }
    }
  };
}

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production' || command === 'build';
  const env = loadEnv(mode, process.cwd(), '');

  console.log(`🚀 [Vite] Building for ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`📦 [Vite] Optimizations: sourcemap=${!isProd}, minify=${isProd}`);

  return {
    base: './',
    envPrefix: 'VITE_',

    plugins: [
      // PowerSync plugins
      wasm(),
      topLevelAwait(),

      // Production optimization plugin
      powersyncProductionPlugin(),

      // React with SWC (faster than Babel)
      react({
        jsxImportSource: 'react'
      }),

      // Million.js for production
      isProd ? million.vite({
        auto: {
          threshold: 0.05,
          skip: [
            'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
            'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
            'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
            'DashboardPreview', 'ChartComponent', 'SVGWrapper',
            'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger',
            'DataTable', 'TableComponent', 'ComplexChart',
            'RichTextEditor', 'FileUpload', 'ImageGallery'
          ]
        },
        mode: 'react',
        server: false
      }) : null,

      // Icons - optimized
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        autoInstall: false,
        defaultClass: 'icon',
        defaultStyle: 'display: inline-block; vertical-align: middle;'
      })
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        '@radix-ui/react-compose-refs': path.resolve(__dirname, './src/lib/radix-compose-refs-patched.ts'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'lodash': 'lodash-es',
        'es-toolkit/compat': path.resolve(__dirname, './src/shims/es-toolkit/compat'),
        'use-sync-external-store/with-selector.js': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/with-selector': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/shim/with-selector.js': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/shim/index.js': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/shim/with-selector': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/shim': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'dayjs$': path.resolve(__dirname, './node_modules/dayjs/esm/index.js')
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      mainFields: ['module', 'browser', 'main'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },

    define: {
      __DESKTOP_APP__: true,
      __ELECTRON__: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': JSON.stringify({ NODE_ENV: 'production' }),
      'import.meta.env.DEV': false,
      'import.meta.env.PROD': true,
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || 'https://stockiha.com'),
      'import.meta.env.VITE_POWERSYNC_URL': JSON.stringify(env.VITE_POWERSYNC_URL || '')
    },

    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()],
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      target: 'es2022',

      // ⚡ التحسينات الرئيسية للحجم
      sourcemap: false,           // ❌ لا source maps في الإنتاج
      minify: 'terser',           // ✅ ضغط الكود
      cssMinify: true,            // ✅ ضغط CSS

      terserOptions: {
        compress: {
          drop_console: true,       // إزالة console.log
          drop_debugger: true,      // إزالة debugger
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          passes: 2,                // تمريرتين للضغط الأفضل
          dead_code: true,          // إزالة الكود الميت
          unused: true,             // إزالة المتغيرات غير المستخدمة
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          if_return: true,
          join_vars: true,
          collapse_vars: true,
          reduce_vars: true,
        },
        mangle: {
          safari10: true,
          properties: false,        // لا نغير أسماء الخصائص للحفاظ على التوافق
        },
        format: {
          comments: false,          // إزالة التعليقات
          ascii_only: true,
        },
        // الحفاظ على أسماء الفئات للـ React DevTools (اختياري)
        keep_classnames: false,
        keep_fnames: false,
      },

      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          format: 'esm',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.name || 'asset';
            const ext = assetName.split('.').pop();

            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetName)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetName)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            if (/\.css$/i.test(assetName)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },

          // ⚡ تقسيم الكود المحسّن
          manualChunks: (id) => {
            // React ecosystem
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'react-core';
            }

            // Router
            if (id.includes('node_modules/react-router')) {
              return 'router';
            }

            // Supabase
            if (id.includes('node_modules/@supabase/')) {
              return 'supabase';
            }

            // PowerSync
            if (id.includes('node_modules/@powersync/') ||
                id.includes('node_modules/@journeyapps/')) {
              return 'powersync';
            }

            // UI - Radix
            if (id.includes('node_modules/@radix-ui/')) {
              return 'ui-radix';
            }

            // Forms
            if (id.includes('node_modules/react-hook-form/') ||
                id.includes('node_modules/zod/') ||
                id.includes('node_modules/@hookform/')) {
              return 'forms';
            }

            // Charts - lazy loaded
            if (id.includes('node_modules/chart.js/') ||
                id.includes('node_modules/react-chartjs-2/') ||
                id.includes('node_modules/recharts/') ||
                id.includes('node_modules/@nivo/')) {
              return 'charts';
            }

            // PDF/Excel - lazy loaded
            if (id.includes('node_modules/jspdf') ||
                id.includes('node_modules/exceljs/') ||
                id.includes('node_modules/xlsx/')) {
              return 'export-tools';
            }

            // Animation
            if (id.includes('node_modules/framer-motion/')) {
              return 'animation';
            }

            // Date utilities
            if (id.includes('node_modules/date-fns/') ||
                id.includes('node_modules/dayjs/')) {
              return 'date-utils';
            }

            // Icons
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons';
            }

            // Lodash
            if (id.includes('node_modules/lodash')) {
              return 'lodash';
            }

            // Other vendors
            if (id.includes('node_modules/')) {
              return 'vendor';
            }

            return undefined;
          }
        },
        external: ['electron', 'path', 'fs', 'os', 'crypto'],

        // تحسينات إضافية
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        }
      },

      // إعدادات إضافية
      assetsInlineLimit: 4096,        // تصغير الحد (4KB بدلاً من 8KB)
      reportCompressedSize: true,     // عرض الحجم المضغوط
      chunkSizeWarningLimit: 1000,    // تحذير عند 1MB
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      commonjsOptions: {
        transformMixedEsModules: true,
        ignoreTryCatch: true,
      }
    },

    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react-dom/client',
        'react-router-dom',
        '@supabase/supabase-js',
        'clsx',
        'tailwind-merge',
        'zustand',
      ],
      exclude: [
        '@powersync/web',
        '@journeyapps/wa-sqlite',
        'lucide-react',
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'chart.js', 'react-chartjs-2',
        'jspdf', 'jspdf-autotable',
        'exceljs', 'xlsx',
        'framer-motion',
        '@sentry/react', '@sentry/browser',
      ],
      esbuildOptions: {
        target: 'es2020',
        supported: { 'top-level-await': true },
        treeShaking: true,
        minify: true,
      }
    },

    css: {
      devSourcemap: false,
      postcss: './postcss.config.cjs'
    },

    esbuild: {
      target: 'es2020',
      drop: ['debugger', 'console'],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    }
  };
});
