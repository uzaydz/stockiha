import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";
import { instagramCompatibilityPlugin } from './src/middleware/instagram-compatibility';

// import csp from 'vite-plugin-csp-guard'; // مُعطل مؤقتاً
import type { Connect, ViteDevServer } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import type { ModuleFormat, OutputOptions } from 'rollup';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import million from 'million/compiler';
import { gzipSync, brotliCompressSync } from 'zlib';
import fs from 'fs';
import type { OutputAsset } from 'rollup';

// تكوين استيراد ملفات Markdown كنصوص
function rawContentPlugin(): Plugin {
  return {
    name: 'vite-plugin-raw-content',
    transform(code: string, id: string) {
      if (id.endsWith('?raw')) {
        const fileName = id.replace('?raw', '');
        if (fileName.endsWith('.md')) {
          // إرجاع محتوى الملف كنص
          const content = JSON.stringify(code);
          return `export default ${content};`;
        }
      }
      return null;
    }
  };
}

// Custom plugin to ensure correct content types
function lodashResolverPlugin(): Plugin {
  return {
    name: 'lodash-resolver',
    resolveId(id: string) {
      if (id.startsWith('lodash/')) {
        // Convert lodash/func to lodash-es/func automatically
        return `lodash-es/${id.slice(7)}`;
      }
      return null;
    }
  };
}

function contentTypePlugin(): Plugin {
  return {
    name: 'content-type-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Set proper content type for HTML files
        if (req.url === '/' || req.url?.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Vary', 'Accept-Encoding');
        }
        
        // 🎨 إعدادات خاصة لملفات الخطوط
        if (req.url?.endsWith('.woff2')) {
          res.setHeader('Content-Type', 'font/woff2');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        if (req.url?.endsWith('.woff')) {
          res.setHeader('Content-Type', 'font/woff');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        if (req.url?.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('Vary', 'Accept-Encoding');
        }
        
        // إضافة ترويسات للملفات JavaScript
        if (req.url?.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Vary', 'Accept-Encoding');
        }
        
        // إضافة ترويسات للملفات JSON
        if (req.url?.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Vary', 'Accept-Encoding');
        }
        
        // إضافة ترويسات للملفات SVG
        if (req.url?.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
          res.setHeader('Vary', 'Accept-Encoding');
        }
        
        next();
      });
    }
  };
}

function criticalCSSPlugin(): Plugin {
  return {
    name: 'critical-css-plugin',
    enforce: 'post',
    generateBundle(options, bundle) {
      // العثور على ملف CSS الرئيسي
      const cssFiles = Object.keys(bundle).filter(file => file.endsWith('.css'));
      
      if (cssFiles.length > 0) {
        const mainCssFile = cssFiles[0];
        const cssContent = bundle[mainCssFile] as OutputAsset;
        
        if (typeof cssContent.source === 'string') {
          // استخراج CSS الحيوي (أول 1000 سطر)
          const lines = cssContent.source.split('\n');
          const criticalLines = lines.slice(0, Math.min(1000, lines.length));
          const criticalCSS = criticalLines.join('\n');
          
          // إنشاء ملف CSS حيوي منفصل
          this.emitFile({
            type: 'asset',
            fileName: 'critical.css',
            source: criticalCSS
          });
          
          // CSS غير الحيوي (الباقي)
          const nonCriticalCSS = lines.slice(1000).join('\n');
          if (nonCriticalCSS.trim()) {
            this.emitFile({
              type: 'asset', 
              fileName: 'non-critical.css',
              source: nonCriticalCSS
            });
          }
        }
      }
    }
  };
}

// =================================================================
// 🚀 VITE CONFIG - إعدادات محسنة للأداء
// =================================================================

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';

  // تحميل متغيرات البيئة
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    server: {
      host: "0.0.0.0", // تغيير من "::" إلى "0.0.0.0" لضمان الوصول من جميع الأجهزة
      port: 8080,
      
      // 🚀 تحسين HMR للأداء الفائق
      hmr: {
        overlay: false, // تعطيل overlay لتقليل الضوضاء
        // استخدام نفس المنفذ لتجنب مشاكل WebSocket
        port: 8080,
        host: "0.0.0.0", // إضافة host للـ HMR
        // 🚫 تقليل ثقل HMR في التطوير
        ...(isDev && {
          // تفعيل Fast Refresh
          fastRefresh: true,
          // تعطيل بعض ميزات HMR الثقيلة
          fullReload: false,
          // تقليل عدد محاولات الاتصال
          retryCount: 2,
          // تعطيل overlay للأخطاء
          overlay: false,
        }),
      },
      
      // ⚡ تحسين مراقبة الملفات
      watch: {
        usePolling: false,
        interval: 250, // زيادة المهلة لتقليل عدد المراقبات
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/backups/**',
          '**/.git/**',
          '**/dist_electron/**',
          '**/logs/**',
          // تجاهل ملفات النسخ الاحتياطي والمؤقتة
          '**/*backup*/**',
          '**/*.log',
          '**/.DS_Store',
          '**/*.tmp',
          '**/*.temp'
        ],
        // تحسين استهلاك الذاكرة
        depth: 99,
        followSymlinks: false,
        ignoreInitial: true,
        // تجميع الأحداث
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 50
        }
      },
      
      cors: {
        origin: true, // السماح لجميع المصادر
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Content-Length', 'X-Content-Type-Options']
      },
      fs: {
        strict: false,
        allow: ['..']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      },
      proxy: {
        '/yalidine-api': {
          target: 'https://api.yalidine.app/v1',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/yalidine-api/, ''),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          },
          onProxyReq: (proxyReq: any, req: any) => {
            // HTTP headers are case-insensitive, Node.js converts them to lowercase
            const apiId = req.headers['x-api-id'] || req.headers['X-API-ID'];
            const apiToken = req.headers['x-api-token'] || req.headers['X-API-TOKEN'];
            
            if (apiId) {
              proxyReq.setHeader('X-API-ID', apiId);
            }
            if (apiToken) {
              proxyReq.setHeader('X-API-TOKEN', apiToken);
            }
            
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Accept', 'application/json');
            
            // Remove browser headers that might interfere
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('host');
            
          },
          configure: (proxy: any, _options: any) => {
            proxy.on('error', (err: any, req: any, res: any) => {
              
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                  error: true,
                  message: 'خطأ في الاتصال بـ API ياليدين',
                  details: err.message,
                  timestamp: new Date().toISOString()
                }));
              }
            });
            
            proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
            });
            
            proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
              
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'X-API-ID, X-API-TOKEN, Content-Type, Accept, Authorization';
              proxyRes.headers['Access-Control-Expose-Headers'] = 'day-quota-left, hour-quota-left, minute-quota-left, second-quota-left';
            });
          }
        },
        // توجيه طلبات API إلى خادم API المحلي
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        // A simplified proxy for Procolis
        '/api/proxy/procolis': {
          target: 'https://procolis.com/api_v1/',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/proxy\/procolis/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
            });
            proxy.on('error', (err, req, res) => {
              if (res && 'writeHead' in res && typeof (res as any).writeHead === 'function') {
                (res as any).writeHead(500, {
                  'Content-Type': 'application/json',
                });
                (res as any).end(JSON.stringify({ message: 'Proxy Error', error: err.message }));
              }
            });
          }
        },
      }
    },
    plugins: [
      // Instagram Compatibility Plugin - يجب أن يكون أولاً
      instagramCompatibilityPlugin(),
      
      // Million.js للتحسين الفائق
      million.vite({ 
        auto: true,
      }),
      
      // React مع Fast Refresh محسن
      react({
        // تعطيل StrictMode في التطوير لتقليل الرندرات
        ...(isDev && {
          jsxImportSource: '@emotion/react',
          babel: {
            plugins: [
              // تعطيل StrictMode في التطوير
              ['@babel/plugin-transform-react-jsx', { 
                runtime: 'automatic',
                development: true,
                useBuiltIns: true
              }]
            ]
          }
        })
      }),

      lodashResolverPlugin(),
      contentTypePlugin(),
      rawContentPlugin(),
      // CSP تم تعطيله مؤقتاً لحل مشاكل الاتصال
      // env.VITE_DISABLE_CSP !== 'true' && csp({...}),
      // إضافة Bundle Analyzer للإنتاج
      isProd && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // أو 'sunburst' أو 'network'
      }),

      // ضغط الملفات الناتجة (Brotli + Gzip)
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false,
        threshold: 1024,
        compressionOptions: { level: 11 },
      }),
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false,
        threshold: 1024,
        compressionOptions: { level: 9 },
      }),
      
      criticalCSSPlugin(),
      
      // 🎯 تعطيل nodePolyfills مؤقتاً لحل مشكلة unenv
      // nodePolyfills({
      //   globals: {
      //     Buffer: false, // تقليل الحمولة
      //     global: false,
      //     process: false, // تم تعطيله لتجنب مشاكل unenv
      //   },
      //   protocolImports: false,
      //   include: ['util', 'buffer'], // الأساسي فقط
      //   exclude: [
      //     'fs', 'path', 'os', 'crypto', 'stream', 'http', 'https',
      //     'url', 'querystring', 'timers', 'console', 'unenv', 'process',
      //     'unenv/node/process'
      //   ]
      // }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        
        // 🎯 تحسين للويب فقط - إزالة Node.js polyfills الثقيلة
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        
        // ✅ polyfills أساسية للويب فقط
        'util': 'util',
        'buffer': 'buffer',
        // 'process': false, // تعطيل process لتجنب مشاكل unenv
        // 'unenv/node/process': false, // تعطيل unenv/node/process
        
        // 🚀 Universal lodash resolver - handles ALL lodash imports automatically
        'lodash': 'lodash-es',
      },
      
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      
      // 🌐 تحسين للمتصفحات الحديثة
      mainFields: ['browser', 'module', 'main'],
      
      // ⚡ تحسين سرعة الـ resolution
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    define: {
      // 🌐 تحسين للويب فقط
      'global': 'globalThis',
      
      // ⚡ متغيرات البيئة الأساسية
      'import.meta.env.VITE_DOMAIN_PROXY': JSON.stringify(env.VITE_DOMAIN_PROXY || 'connect.ktobi.online'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001/api'),
      'import.meta.env.VITE_VERCEL_PROJECT_ID': JSON.stringify(env.VITE_VERCEL_PROJECT_ID || ''),
      'import.meta.env.VITE_VERCEL_API_TOKEN': JSON.stringify(env.VITE_VERCEL_API_TOKEN || ''),
      
      // 🎯 متغيرات التطبيق
      __DEV__: isDev,
      __PROD__: isProd,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      
      // ✅ متغيرات React الأساسية فقط
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      'process.env': JSON.stringify({
        NODE_ENV: isDev ? 'development' : 'production'
      }),
      
      // 🚫 تعطيل React DevTools في التطوير لتقليل الثقل
      ...(isDev && {
        // لا نقوم بتعطيل __REACT_DEVTOOLS_GLOBAL_HOOK__ في Vite 7 لتجنب الأخطاء
        // '__REACT_DEVTOOLS_GLOBAL_HOOK__': undefined,
        // 'global.__REACT_DEVTOOLS_GLOBAL_HOOK__': undefined
      }),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false, // استخدام inline source maps لأفضل توافق مع المتصفح
      // تحسينات بناء للمتصفحات القديمة - دعم أوسع
      target: 'es2020',
      minify: isProd ? 'terser' as const : false, // تعطيل minify في التطوير لرؤية الأكواد الأصلية
      terserOptions: isProd ? {
        compress: {
          drop_console: false,
          drop_debugger: true,
          unused: false,
          side_effects: false,
          passes: 1,
          toplevel: false,
          reduce_funcs: false,
          reduce_vars: false,
        },
        mangle: {
          safari10: true,
          keep_fnames: /^(deduplicateRequest|interceptFetch|POSDataProvider|DashboardDataContext|StoreDataContext|AuthSingleton|UnifiedRequestManager|initializeRequestSystems|checkUserRequires2FA|handleSuccessfulLogin|UltimateRequestController|PrintReceipt|useCompletePOSData|usePOSData|useTenant)$/,
          reserved: ['console', 'log', 'warn', 'error', 'info', 'require', 'exports', 'module', 'PrintReceipt', 'useCompletePOSData', 'default']
        },
        format: {
          comments: false,
          safari10: true,
        },
      } : undefined,
      // التأكد من أن جميع المسارات نسبية
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          format: 'esm' as ModuleFormat,

          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];

            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }

            if (/\.css$/i.test(assetInfo.name)) {
              return `assets/css/[name]-[hash].${ext}`;
            }

            return `assets/[name]-[hash].${ext}`;
          },
          manualChunks: {
            // 🚀 تكوين محسن وبسيط
            'vendor-core': [
              'react', 'react-dom', 'react/jsx-runtime',
              'react-router-dom', '@remix-run/router',
              '@tanstack/react-query'
            ],

            'ui-core': [
              'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge',
              '@radix-ui/react-slot'
            ],

            'vendor-utils': [
              'lodash-es', 'date-fns', 'axios',
              'react-hook-form', '@hookform/resolvers', 'zod'
            ]
          }
        } as OutputOptions,
        external: [
          'better-sqlite3',
          'sqlite3',
          'sql.js',
          'path',
          'fs',
          'os',
          'unenv',
          'process',
          'unenv/node/process'
        ],
        // تحسين خاص لـ Vercel
        preserveEntrySignatures: 'strict',
        // تخفيف قوة tree-shaking لمنع حذف الأكواد المهمة
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: "no-external",
          propertyReadSideEffects: true,
          tryCatchDeoptimization: true,
        },
        // ضمان ترتيب التحميل الصحيح
        makeAbsoluteExternalsRelative: false,
      },
      // 🎯 تحسين للويب فقط (بدون Electron)
      assetsInlineLimit: 8192, // 8KB - تجميع الصور الصغيرة لتقليل طلبات HTTP
      
      // 🎨 إعدادات خاصة لملفات الأصول
      assetsInclude: ['**/*.woff2', '**/*.woff', '**/*.ttf'],
      
      // 🚀 تحسين CommonJS للويب
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'preferred',
        ignoreTryCatch: false,
        strictRequires: false,
      },
      
      chunkSizeWarningLimit: 2000, // زيادة الحد للويب
      
      // 🎨 تقسيم CSS للأداء - معطل مؤقتاً لحل مشكلة الخطوط
      cssCodeSplit: true,
      
      // ⚡ تحسين module preloading للويب - تحميل الحزم الأساسية فقط
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          // تحميل الحزم الأساسية فقط فوراً - مع إصلاح مشكلة pos-print
          const coreDeps = deps.filter(dep =>
            dep.includes('vendor-core') ||
            // لا نقوم بعمل preload لموديولات ثقيلة مبكراً
            // dep.includes('ui-core') ||
            // dep.includes('ui-essentials') ||
            // dep.includes('pos-module') ||
            // dep.includes('supabase-core') ||
            dep.includes('main')
          );

          // تم دمج جميع مكونات POS في pos-module لتجنب مشاكل التبعيات

          return coreDeps;
        }
      },

      // 🚀 إعدادات خاصة للتطوير - تحسين تجربة DevTools
      ...(isDev && {
        // تعطيل تحسينات قد تؤثر على DevTools
        reportCompressedSize: false,
        // تقليل chunk size warning في التطوير
        chunkSizeWarningLimit: 5000,
      }),
    },
    // 🚀 PERFORMANCE OPTIMIZATION: Selective Pre-optimization
    optimizeDeps: {
      force: isDev,
      // ✅ تحسين مسبق للضروريات فقط (Core + UI Base)
      include: [
        // Core React (ضروري دائماً)
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime', 
        'react-dom',
        'react-dom/client',
        
        // Core Routing (ضروري للتنقل)
        'react-router-dom',
        'react-router',
        '@remix-run/router',
        
        // Essential State Management
        '@tanstack/react-query',
        
        // Essential Network
        '@supabase/supabase-js',
        
        // Essential Database
        'dexie',
        
        // Essential Utilities (needed by many components) 
        'lodash-es',
        
        // Common utilities that cause import issues
        'react-intersection-observer',
        'react-transition-group',
        'react-smooth',
        'reduce-css-calc',
        'eventemitter3',
        'is-retry-allowed',
        
        // Essential UI Base (خفيفة ومطلوبة)
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'classnames',
        
        // Essential Radix UI Components (ui-essentials)
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-slot',
        
        // Essential Animation (used in 285+ files)
        'framer-motion',
        
        // Core Polyfills Only
        'util',
        'buffer',
        
        // Essential React Utils
        'react-is',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'prop-types',
        'hoist-non-react-statics'
      ],
      
      // 🚨 استبعاد جميع المكتبات الثقيلة من التحسين المسبق  
      exclude: [
        // Heavy Charts & Graphics (keep these for lazy loading)
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'recharts', 'chart.js', 'react-chartjs-2',
      
        // Heavy Editors
        '@monaco-editor/react',
        '@tinymce/tinymce-react',
        
        // Heavy UI Libraries
        '@mui/material', '@mui/icons-material', '@mui/x-date-pickers',
        '@emotion/react', '@emotion/styled',
        'antd',
        
        // Heavy PDF & Image Processing
        'jspdf', 'jspdf-autotable',
        'html2canvas',
        'jimp',
        'potrace',
        
        // Lodash (causes chunking issues when pre-optimized)
        'lodash',
        
        // All Radix UI (load on demand) - باستثناء الأساسيات
        '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu', 
        '@radix-ui/react-hover-card',
        '@radix-ui/react-icons', '@radix-ui/react-label',
        '@radix-ui/react-menubar', '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover', '@radix-ui/react-progress',
        '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area',
        '@radix-ui/react-select', '@radix-ui/react-separator',
        '@radix-ui/react-slider', '@radix-ui/react-switch', 
        '@radix-ui/react-tabs', '@radix-ui/react-toast', 
        '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
        
        // Heavy Utilities
        'axios',
        'axios-retry',
        'unenv',
        'process',
        'unenv/node/process',
        
        // Monitoring (load async)
        '@sentry/react', '@sentry/browser', '@sentry/tracing', '@sentry/replay',
        
        // Context Providers (load on demand)
        './src/context/DashboardDataContext.tsx',
        './src/lib/cache/deduplication.ts'
      ],
      
      // 🔧 تحسين عملية الاكتشاف
      holdUntilCrawlEnd: false,
      
      // ⚡ تسريع عملية التحسين 
      esbuildOptions: {
        target: 'es2015',
        keepNames: true,
        minify: false, // لا نضغط في optimizeDeps
        treeShaking: false, // لا نقطع الشجرة في optimizeDeps
      }
    },
    preview: {
      port: 8080,
      host: true,
    },
    css: {
      devSourcemap: true, // تمكين Source Maps في CSS للتطوير لرؤية الأكواد الأصلية
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
      // 🎨 إعدادات CSS محسنة للخطوط
      modules: false,
      postcss: undefined // استخدام PostCSS الافتراضي
    },
    esbuild: {
      target: 'es2020',
      drop: isProd ? ['debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      // تحسينات لحل مشاكل التهيئة
      keepNames: true,
      treeShaking: true,
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
              // 🚫 تقليل ثقل esbuild في التطوير
        ...(isDev && {
          // تمكين Source Maps للتطوير لأفضل تجربة debugging
          sourcemap: true,
          // تقليل عدد التحذيرات
          logOverride: { 'this-is-undefined-in-esm': 'silent' },
        }),
    },
    worker: {
      format: 'es',
    },
  };
});
