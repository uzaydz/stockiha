import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import million from "million/compiler";
import Icons from 'unplugin-icons/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import * as path from "path";
import * as fs from "fs";

// Plugin لخدمة ملفات PowerSync Worker و WASM في التطبيق المكتبي
function powersyncDesktopWorkerPlugin(): Plugin {
  // مسار wa-sqlite في pnpm
  const waSqlitePath = path.resolve(__dirname, 'node_modules/.pnpm/@journeyapps+wa-sqlite@1.3.3/node_modules/@journeyapps/wa-sqlite/dist');
  const viteDepsPath = path.resolve(__dirname, 'node_modules/.vite/deps');

  return {
    name: 'powersync-desktop-worker-plugin',
    enforce: 'pre', // تشغيل قبل جميع الـ plugins الأخرى
    configureServer(server) {
      // إضافة middleware في بداية السلسلة لضمان أولوية معالجة WASM
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const cleanUrl = url.split('?')[0];

        // معالجة CORS preflight requests
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Max-Age', '86400');
          res.statusCode = 204;
          res.end();
          return;
        }

        // 1. خدمة ملفات WASM بأولوية قصوى (من أي مسار)
        if (cleanUrl.endsWith('.wasm')) {
          const fileName = path.basename(cleanUrl);

          // البحث في عدة مسارات - الأولوية لمجلد Vite deps
          const searchPaths = [
            // 1. مجلد Vite deps (للملفات المنسوخة) - أولوية قصوى
            path.join(viteDepsPath, fileName),
            // 2. مجلد wa-sqlite الأصلي
            path.join(waSqlitePath, fileName),
            // 3. مجلد public/powersync
            path.resolve(__dirname, 'public/powersync', fileName),
            // 4. مجلد public
            path.resolve(__dirname, 'public', fileName),
          ];

          for (const filePath of searchPaths) {
            if (fs.existsSync(filePath)) {
              console.log(`[WASM] ✅ Serving: ${fileName}`);
              const content = fs.readFileSync(filePath);
              res.setHeader('Content-Type', 'application/wasm');
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            }
          }

          console.warn(`[WASM] ❌ Not found: ${fileName}`);
        }

        // 2. خدمة ملفات من node_modules/.vite/deps/ مع MIME type صحيح
        if (cleanUrl.includes('/node_modules/.vite/deps/') && cleanUrl.endsWith('.wasm')) {
          const fileName = path.basename(cleanUrl);
          const filePath = path.join(viteDepsPath, fileName);

          if (fs.existsSync(filePath)) {
            console.log(`[WASM] ✅ Serving from deps: ${fileName}`);
            const content = fs.readFileSync(filePath);
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.end(content);
            return;
          }
        }

        // 3. خدمة ملفات Worker (من أي مسار، بما في ذلك node_modules)
        if (cleanUrl.includes('WASQLiteDB.worker.js') ||
          cleanUrl.includes('SharedSyncImplementation.worker.js') ||
          cleanUrl.includes('worker.js')) {
          const fileName = path.basename(cleanUrl);

          // البحث في عدة مسارات
          const searchPaths = [
            path.resolve(__dirname, 'public/powersync', fileName),
            path.resolve(__dirname, 'public/powersync/sync', fileName),
            path.resolve(__dirname, 'public', fileName),
            // محاولة العثور على الملف في node_modules إذا كان موجوداً
            path.resolve(__dirname, 'node_modules/@powersync/web/lib/src/worker/sync', fileName),
            path.resolve(__dirname, 'node_modules/@powersync/web/lib/src/worker', fileName),
          ];

          for (const filePath of searchPaths) {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath);
              res.setHeader('Content-Type', 'application/javascript');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              res.end(content);
              return;
            }
          }

          // إذا لم نجد الملف، نعيد استجابة فارغة بدلاً من خطأ
          // (لأن useWebWorker: false، لكن المكتبة قد تحاول تحميل الملف)
          console.warn(`[Worker] ⚠️ Worker file not found: ${fileName}, serving empty response (workers disabled)`);
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end('// Worker disabled - useWebWorker: false');
          return;
        }

        // 4. خدمة ملفات powersync/ الأخرى
        if (cleanUrl.includes('/powersync/') && !cleanUrl.endsWith('.map')) {
          const fileName = path.basename(cleanUrl);
          const filePath = path.resolve(__dirname, 'public/powersync', fileName);

          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(content);
            return;
          }
        }

        // 5. ⚡ خدمة ملفات UMD chunks التي تطلبها Workers
        // هذه الملفات تُطلب من المسار الجذري مثل:
        // /node_modules_journeyapps_wa-sqlite_dist_wa-sqlite_mjs.umd.js
        if (cleanUrl.includes('node_modules_') && cleanUrl.endsWith('.umd.js')) {
          const fileName = path.basename(cleanUrl);
          const filePath = path.resolve(__dirname, 'public/powersync', fileName);

          if (fs.existsSync(filePath)) {
            console.log(`[UMD] ✅ Serving chunk: ${fileName}`);
            const content = fs.readFileSync(filePath);
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(content);
            return;
          } else {
            console.warn(`[UMD] ❌ Chunk not found: ${fileName}`);
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = false; // إجبار وضع التطوير لرؤية جميع logs
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './', // مسار نسبي للتطبيق المكتبي
    envPrefix: 'VITE_',

    // تسريع الخادم للتطبيق المكتبي
    server: {
      host: "127.0.0.1", // Avoid IPv6 (::1) binding issues on some setups
      port: 8080,
      strictPort: true,
      hmr: {
        host: '127.0.0.1',
        protocol: 'ws',
        port: 8080,
        clientPort: 8080,
        overlay: false
      },
      // تسريع CORS للتطبيق المكتبي
      cors: true, // تفعيل CORS للسماح بتحميل Workers
      fs: {
        strict: false, // تقليل القيود للسماح بالوصول إلى worker files
        allow: ['.', 'node_modules/@powersync', 'node_modules/@journeyapps']
      },
      // ملاحظة: لا نضيف COEP headers هنا لأنها تمنع تحميل Workers
      // إذا احتجنا SharedArrayBuffer، سنضيف COEP للملفات المحددة فقط
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },

    plugins: [
      // ⚡ PowerSync plugins - MUST be first for WASM and async support
      wasm(),
      topLevelAwait(),

      // PowerSync Worker Plugin - لخدمة ملفات Worker بشكل صحيح
      powersyncDesktopWorkerPlugin(),

      // React محسن للتطبيق المكتبي
      react({
        jsxImportSource: 'react'
      }),

      // Million.js محسن للأداء
      (process.env.VITE_ENABLE_MILLION === 'true' ? million.vite({
        auto: {
          threshold: 0.05, // عتبة أقل لتحسين أكبر
          skip: [
            // استثناء المزيد من المكونات الثقيلة
            'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
            'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
            'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
            'DashboardPreview', 'ChartComponent', 'SVGWrapper',
            'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger',
            // إضافة استثناءات للمكونات الثقيلة
            'DataTable', 'TableComponent', 'ComplexChart',
            'RichTextEditor', 'FileUpload', 'ImageGallery'
          ]
        },
        mode: 'react',
        server: isDev
      }) : null),

      // Icons محسن
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        autoInstall: false, // تعطيل لتسريع البناء
        defaultClass: 'icon',
        defaultStyle: 'display: inline-block; vertical-align: middle;'
      })
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // 🔧 إصلاح مشكلة compose-refs مع React 19
        '@radix-ui/react-compose-refs': path.resolve(__dirname, './src/lib/radix-compose-refs-patched.ts'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'lodash': 'lodash-es',
        'es-toolkit/compat': path.resolve(__dirname, './src/shims/es-toolkit/compat'),
        // eventemitter3: استخدام الحزمة الأصلية مباشرة لتجنب دوران alias
        // react-is: استخدم الحزمة الأصلية مباشرة لتفادي دوران alias
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
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      'process.env': JSON.stringify({
        NODE_ENV: isDev ? 'development' : 'production'
      }),
      'import.meta.env.DEV': isDev, // true في التطوير، false في الإنتاج
      'import.meta.env.PROD': !isDev, // false في التطوير، true في الإنتاج
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || 'https://stockiha.com'),
      // ⚡ PowerSync Configuration
      'import.meta.env.VITE_POWERSYNC_URL': JSON.stringify(env.VITE_POWERSYNC_URL || '')
    },

    // إعدادات Workers - تكوين PowerSync
    // ⚡ استخدام 'es' format لتجنب مشاكل code-splitting مع IIFE
    // في الـ production build، IIFE يسبب خطأ:
    // "UMD and IIFE output formats are not supported for code-splitting builds"
    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()],
    },

    build: {
      outDir: 'dist',
      cssMinify: false, // تعطيل CSS minify للتطبيق المكتبي
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: true, // تفعيل sourcemap للتشخيص
      target: 'es2022',
      minify: false, // تعطيل minify تماماً للتطبيق المكتبي لتجنب مشاكل initialization
      // terserOptions تم تعطيلها لتجنب مشاكل في Electron
      // terserOptions: isProd ? {
      //   compress: {
      //     drop_console: true,
      //     drop_debugger: true,
      //     pure_funcs: ['console.log', 'console.info', 'console.debug']
      //   },
      //   mangle: {
      //     safari10: true
      //   },
      //   format: {
      //     comments: false
      //   }
      // } : undefined,

      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          landing: path.resolve(__dirname, 'landing.html')
        },
        output: {
          format: 'esm',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.name || 'asset';
            const info = assetName.split('.');
            const ext = info[info.length - 1];

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
          manualChunks: (id) => {
            const is = (re: RegExp) => re.test(id);

            // React core
            if (is(/[\\/]node_modules[\\/]react[\\/]/) ||
              is(/[\\/]node_modules[\\/]react-dom[\\/]/) ||
              is(/[\\/]node_modules[\\/]scheduler[\\/]/)) {
              return 'react-core';
            }

            // Router
            if (is(/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/)) {
              return 'router';
            }

            // Supabase
            if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) {
              return 'supabase';
            }

            // UI Components
            if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/)) {
              return 'ui-radix';
            }

            // Utils
            if (is(/[\\/]node_modules[\\/]lodash(-es)?[\\/]/) ||
              is(/[\\/]node_modules[\\/]date-fns[\\/]/)) {
              return 'utils';
            }

            // Forms
            if (is(/[\\/]node_modules[\\/]react-hook-form[\\/]/) ||
              is(/[\\/]node_modules[\\/]zod[\\/]/)) {
              return 'forms';
            }

            // Charts
            if (is(/[\\/]node_modules[\\/]chart\.js[\\/]/) ||
              is(/[\\/]node_modules[\\/]react-chartjs-2[\\/]/)) {
              return 'charts';
            }

            // Icons
            if (is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'icons';
            }

            // Animation
            if (is(/[\\/]node_modules[\\/]framer-motion[\\/]/)) {
              return 'animation';
            }

            // Remaining vendor
            if (is(/[\\/]node_modules[\\/]/)) {
              return 'vendor';
            }

            return undefined;
          }
        },
        external: [
          'electron',
          'path',
          'fs',
          'os'
        ]
      },

      assetsInlineLimit: 8192,
      reportCompressedSize: false,
      write: true,
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false
      },
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },

    // تحسينات هائلة للأداء في التطبيق المكتبي
    optimizeDeps: {
      force: isDev, // تفعيل في التطوير فقط
      include: [
        // المكتبات الأساسية فقط
        'react',
        'react/jsx-runtime',
        'react-dom/client',
        'react-router-dom',
        'react-is',
        'react-redux',
        '@supabase/supabase-js',
        'clsx',
        'tailwind-merge',
        // إضافة Zustand للحالة
        'zustand',
        'axios-retry',
        'is-retry-allowed',
        'dayjs/esm/index.js',
        // ✅ Prebundle deps causing Outdated Optimize Dep in Electron dev
        'react-day-picker',
        'cmdk',
        // 'js-logger' removed to avoid resolution errors
        'recharts',
        'react-smooth',
        'prop-types'
      ],
      // ✅ Force CommonJS interop for deps that are imported as ESM default/named
      // Fixes: "does not provide an export named 'default'" for prop-types in Electron dev
      needsInterop: ['prop-types', 'react-is'],
      exclude: [
        // ⚡ PowerSync - MUST be excluded (contains workers and WASM)
        '@powersync/web',
        '@journeyapps/wa-sqlite',

        // استثناء جميع المكتبات الثقيلة
        'lucide-react',
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'chart.js', 'react-chartjs-2',
        '@monaco-editor/react',
        '@tinymce/tinymce-react',
        'jspdf', 'jspdf-autotable',
        'html2canvas',
        'lodash',
        'lodash-es',
        // استثناء مكتبات إضافية ثقيلة
        'framer-motion',
        'motion',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        'react-dnd',
        'react-dnd-html5-backend',
        'date-fns',
        // استثناء مكتبات التطوير
        '@sentry/react',
        '@sentry/browser',
        '@sentry/tracing',
        '@sentry/replay'
      ],
      // انتظر اكتمال الزحف قبل التقديم لتجنب 504 Outdated Optimize Dep
      holdUntilCrawlEnd: true,
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        },
        plugins: [],
        keepNames: false, // تسريع
        minify: false,
        treeShaking: true
      }
    },

    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      postcss: './postcss.config.cjs'
    },

    esbuild: {
      target: 'es2020',
      drop: isProd ? ['debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      jsxDev: false,
      keepNames: true,
      treeShaking: true,
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd
    }
  };
});
