import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import Icons from 'unplugin-icons/vite';
import * as path from "path";
import { instagramCompatibilityPlugin } from './src/middleware/instagram-compatibility';
import { securityPlugin } from './src/plugins/security-plugin';
import { contentTypePlugin } from './src/plugins/content-type-plugin';

import csp from 'vite-plugin-csp-guard';
import type { Connect, ViteDevServer } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import type { ModuleFormat, OutputOptions } from 'rollup';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { gzipSync, brotliCompressSync } from 'zlib';
import fs from 'fs';
import type { OutputAsset } from 'rollup';
import desktopConfig from './vite.config.desktop';

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

// Plugin to fix is-retry-allowed CommonJS module exports
function fixRetryAllowedPlugin(): Plugin {
  return {
    name: 'fix-retry-allowed',
    enforce: 'pre',
    resolveId(id: string) {
      if (id === 'is-retry-allowed') {
        return '\0is-retry-allowed-virtual';
      }
      return null;
    },
    load(id: string) {
      if (id === '\0is-retry-allowed-virtual') {
        return `
          import isRetryAllowed from 'is-retry-allowed/index.js';
          export default isRetryAllowed;
          export { isRetryAllowed };
        `;
      }
      return null;
    }
  };
}

// Plugin to redirect use-sync-external-store to React 19 built-in
function useSyncExternalStorePlugin(): Plugin {
  return {
    name: 'use-sync-external-store-redirect',
    enforce: 'pre',
    resolveId(id: string) {
      if (
        id === 'use-sync-external-store' ||
        id === 'use-sync-external-store/shim' ||
        id === 'use-sync-external-store/shim/with-selector'
      ) {
        return path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts');
      }
      return null;
    }
  };
}


// Plugin لخدمة critical.css في التطوير
function devCriticalCSSPlugin(): Plugin {
  return {
    name: 'dev-critical-css-plugin',
    apply: 'serve', // للتطوير فقط
    configureServer(server) {
      server.middlewares.use('/critical.css', (req, res, next) => {
        // قراءة محتوى critical.css من المصدر
        const criticalCSSPath = path.resolve(__dirname, 'src/styles/critical.css');
        if (fs.existsSync(criticalCSSPath)) {
          const criticalCSS = fs.readFileSync(criticalCSSPath, 'utf-8');
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(criticalCSS);
        } else {
          // إرسال CSS فارغ إذا لم يوجد الملف
          res.setHeader('Content-Type', 'text/css');
          res.end('/* Critical CSS not found in development */');
        }
      });
    }
  };
}

// Dev middleware: rewrite product V3 deep-links to store.html so store SPA handles routing
function devStoreRewritePlugin(): Plugin {
  return {
    name: 'dev-store-rewrite',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = (req.originalUrl || req.url || '').split('?')[0];
          const accept = String(req.headers['accept'] || '');
          // Only intercept navigation requests expecting HTML
          if (!accept.includes('text/html')) return next();

          // Match store product routes
          const matches = (
            /^\/product-purchase-max-v3\//.test(url) ||
            /^\/product\//.test(url)
          );
          if (!matches) return next();

          const storeHtmlPath = path.resolve(__dirname, 'store.html');
          if (!fs.existsSync(storeHtmlPath)) return next();

          const raw = fs.readFileSync(storeHtmlPath, 'utf-8');
          const html = await server.transformIndexHtml(url, raw);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (e) {
          next(e as any);
        }
      });
    }
  };
}

function criticalCSSPlugin(): Plugin {
  return {
    name: 'critical-css-plugin',
    enforce: 'post',
    apply: 'build', // تطبيق هذا البلاجن في البناء فقط، وليس في التطوير
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

export default desktopConfig as any;

const WEB_CONFIG = defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  // تم إزالة إعدادات store build - البناء يركز على الموقع الرئيسي فقط

  // تحميل متغيرات البيئة

  return {
    base: './',
    envPrefix: 'VITE_', // ضمان حقن متغيرات VITE_ في import.meta.env
    server: {
      host: "0.0.0.0", // تغيير من "::" إلى "0.0.0.0" لضمان الوصول من جميع الأجهزة
      port: 8080,
      strictPort: false, // السماح باستخدام منفذ بديل إذا كان 8080 مشغولاً

      // 🚀 تحسين HMR للأداء الفائق وتقليل التكرارات
      hmr: {
        overlay: false,
      },

      // ⚡ تحسين مراقبة الملفات لتقليل التكرارات
      watch: {
        usePolling: false,
        interval: 500, // زيادة المهلة بشكل كبير لتقليل عدد المراقبات
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
          '**/*.temp',
          // تجاهل ملفات الكاش والمؤقتة
          '**/.cache/**',
          '**/cache/**',
          '**/*.cache',
          // تجاهل ملفات service worker
          '**/sw.js',
          '**/sw.ts',
          // تجاهل ملفات الخرائط المصدرية في التطوير
          '**/*.map'
        ],
        // تحسين استهلاك الذاكرة
        depth: 50, // تقليل العمق لتقليل التحقق
        followSymlinks: false,
        ignoreInitial: true,
        // تجميع الأحداث وتقليل الحساسية
        awaitWriteFinish: {
          stabilityThreshold: 100, // زيادة العتبة لتقليل التكرارات
          pollInterval: 100 // زيادة فترة الاستطلاع
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
      // Redirect use-sync-external-store to React 19 polyfill - MUST be first
      useSyncExternalStorePlugin(),

      // Fix retry-allowed module
      fixRetryAllowedPlugin(),

      // Content Type Plugin - يجب أن يكون أولاً لإصلاح مشاكل MIME
      contentTypePlugin(),
      // تم إزالة devStoreRewritePlugin - البناء يركز على الموقع الرئيسي فقط

      // Instagram Compatibility Plugin
      instagramCompatibilityPlugin(),

      // Security Plugin - للتطوير فقط (لتجنب التضارب مع CSP plugin)
      isDev && securityPlugin(),

      // Dev Critical CSS Plugin - لخدمة critical.css في التطوير
      devCriticalCSSPlugin(),

      // Icons plugin for tree-shaking
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        autoInstall: true,
        defaultClass: 'icon',
        defaultStyle: 'display: inline-block; vertical-align: middle;',
      }),

      // Million.js configuration for performance optimization - DISABLED temporarily
      // million.vite({
      //   auto: {
      //     threshold: 0.1,
      //     skip: [
      //       // SVG elements - ignore all SVG elements
      //       'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
      //       'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
      //       'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
      //       // Components with SVG - ignore components containing SVG
      //       'DashboardPreview', 'ChartComponent', 'SVGWrapper',
      //       // UI Components - ignore complex components
      //       'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger'
      //     ]
      //   },
      //   mode: 'react',
      //   server: true
      // }),

      // React مع Fast Refresh محسن
      react({
        // إعدادات محسنة للأداء
        jsxImportSource: 'react',
      }),

      lodashResolverPlugin(),
      rawContentPlugin(),
      // CSP آمنة مع nonce support - معطلة في التطوير لتجنب مشاكل eval
      !isDev && env.VITE_DISABLE_CSP !== 'true' && csp({
        policy: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            "'unsafe-inline'", // للتطوير - سيتم تحسينها لاحقاً
            "'unsafe-eval'", // ضروري لـ Vite في التطوير ومكتبات Forms (zod, react-hook-form)
            'https://connect.facebook.net',
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://js.sentry-cdn.com',
          ],
          'script-src-elem': [
            "'self'",
            "'unsafe-inline'",
            'https://connect.facebook.net',
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://analytics.tiktok.com',
            'https://js.sentry-cdn.com',
            'https://static.cloudflareinsights.com',
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'", // ضروري للـ CSS الديناميكي
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
          ],
          'style-src-elem': [
            "'self'",
            "'unsafe-inline'", // للأنماط المضمنة
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
          ],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
          'connect-src': [
            "'self'",
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.yalidine.app',
            'https://api.cloudflare.com',
            'https://dns.google.com',
            'https://openrouter.ai',
            'https://api.zrexpress.dz',
            'https://api.ecotrack.dz',
            'https://*.ecotrack.dz',
            'https://cloudflareinsights.com', // Cloudflare Analytics
            'https://*.cloudflareinsights.com', // Cloudflare Analytics subdomains
            'https://static.cloudflareinsights.com', // Cloudflare Analytics static
            'https://www.google-analytics.com', // Google Analytics
            'https://region1.google-analytics.com', // Google Analytics
            'https://stats.g.doubleclick.net', // Google Analytics
            'https://analytics.tiktok.com', // TikTok Analytics
            'https://business-api.tiktok.com', // TikTok Business API
            'https://connect.facebook.net', // Facebook Pixel
            'https://www.facebook.com', // Facebook Pixel
            'ws://localhost:*', // للـ HMR
            'http://localhost:*'
          ],
          'frame-src': ["'self'", 'https://player.vimeo.com', 'https://api.vadoo.tv'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"]
        },
        dev: {
          run: isDev
        }
      }),
      // إضافة Bundle Analyzer للإنتاج
      isProd && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // أو 'sunburst' أو 'network'
      }),

      // ضغط الملفات الناتجة (Brotli + Gzip) - محسن للأداء الفائق
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false,
        threshold: 512, // 512B - ضغط جميع الملفات تقريباً
        compressionOptions: {
          level: 11, // أقصى ضغط
          windowBits: 22
        },
        filter: /\.(js|mjs|json|css|html|svg|txt|xml|woff2?)$/i,
        verbose: false // تقليل logs في production
      }),
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false,
        threshold: 512, // 512B - ضغط جميع الملفات تقريباً
        compressionOptions: {
          level: 9, // أقصى ضغط Gzip
          windowBits: 15,
          memLevel: 9, // زيادة ذاكرة الضغط
          strategy: 0, // أقصى ضغط
          chunkSize: 16 * 1024 // تحسين حجم الـ chunk
        },
        filter: /\.(js|mjs|json|css|html|txt|xml|svg|woff2?)$/i,
        verbose: false
      }),

      // criticalCSSPlugin() معطّل مؤقتاً لتجنب تقسيم CSS غير دقيق يسبب FOUC
      // criticalCSSPlugin(),

      // 🔒 حماية كود الإنتاج - Obfuscator (للإنتاج فقط)
      // تعطيل obfuscator مؤقتاً لتجنب مشاكل التوافق
      // isProd && obfuscator({
      //   stringArray: true,
      //   rotateStringArray: true
      // }),

      // 🚀 Plugin لتحسين render blocking
      // ملاحظة: إيقاف إزالة روابط CSS في الإنتاج لأنها تسبب FOUC وتقطعات
      {
        name: 'render-blocking-optimizer',
        enforce: 'post' as const,
        transformIndexHtml(html: string) {
          // إضافة defer لملف الدخول (إرشادي) دون التلاعب بروابط CSS
          const out = html.replace(
            /<script\s+type="module"\s+src="\/src\/main\.tsx"><\/script>/,
            '<script type="module" src="/src/main.tsx" defer></script>'
          );
          return out;
        }
      },

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

        // 🔧 إصلاح مشكلة compose-refs مع React 19
        '@radix-ui/react-compose-refs': path.resolve(__dirname, './src/lib/radix-compose-refs-patched.ts'),

        // 🎯 تحسين للويب فقط - إزالة Node.js polyfills الثقيلة
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),

        // React 19 built-in hooks - redirect external package to our polyfill
        'use-sync-external-store/shim/with-selector': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store/shim': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),
        'use-sync-external-store': path.resolve(__dirname, './src/polyfills/use-sync-external-store.ts'),

        // ✅ polyfills أساسية للويب فقط
        'util': 'util',
        'buffer': 'buffer',
        'stream': path.resolve(__dirname, './src/polyfills/stream.ts'),
        'node:stream': path.resolve(__dirname, './src/polyfills/stream.ts'),
        // 'process': false, // تعطيل process لتجنب مشاكل unenv
        // 'unenv/node/process': false, // تعطيل unenv/node/process

        // 🚀 Universal lodash resolver - handles ALL lodash imports automatically
        'lodash': 'lodash-es',
        // Force dayjs to resolve to the ESM build to retain default export semantics
        'dayjs$': path.resolve(__dirname, './node_modules/dayjs/esm/index.js'),
        'es-toolkit/compat': path.resolve(__dirname, './src/shims/es-toolkit/compat'),
        // تم إزالة store build aliases - البناء يركز على الموقع الرئيسي فقط

        // 🎯 Lazy Loading Aliases - تحويل تلقائي للاستيرادات الثقيلة
        // Note: framer-motion alias removed to avoid hook complexity
      },

      dedupe: ['react', 'react-dom', 'react-router-dom'],

      // 🌐 تحسين للمتصفحات الحديثة
      mainFields: ['browser', 'module', 'main'],

      // ⚡ تحسين سرعة الـ resolution
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    define: {
      __STORE_BUILD__: false,
      // 🌐 تحسين للويب فقط
      'global': 'globalThis',

      // ⚡ متغيرات البيئة الأساسية - محدثة لـ Cloudflare
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'),
      'import.meta.env.VITE_DOMAIN_PROXY': JSON.stringify(env.VITE_DOMAIN_PROXY || 'connect.ktobi.online'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_DEPLOYMENT_PLATFORM': JSON.stringify(env.VITE_DEPLOYMENT_PLATFORM || 'cloudflare'),
      'import.meta.env.VITE_CLOUDFLARE_API_TOKEN': JSON.stringify(env.VITE_CLOUDFLARE_API_TOKEN || ''),
      'import.meta.env.VITE_CLOUDFLARE_ZONE_ID': JSON.stringify(env.VITE_CLOUDFLARE_ZONE_ID || ''),
      'import.meta.env.VITE_CLOUDFLARE_PROJECT_NAME': JSON.stringify(env.VITE_CLOUDFLARE_PROJECT_NAME || 'stockiha'),
      'import.meta.env.VITE_DEFAULT_ORGANIZATION_ID': JSON.stringify(env.VITE_DEFAULT_ORGANIZATION_ID || ''),
      'import.meta.env.VITE_YALIDINE_DEFAULT_ORG_ID': JSON.stringify(env.VITE_YALIDINE_DEFAULT_ORG_ID || 'fed872f9-1ade-4351-b020-5598fda976fe'),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || 'https://stockiha.com'),

      // 🎯 متغيرات التطبيق
      __DEV__: false, // تعطيل jsxDEV لتحسين الأداء
      __PROD__: isProd,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),

      // ✅ متغيرات React الأساسية فقط
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      'process.env': JSON.stringify({
        NODE_ENV: isDev ? 'development' : 'production'
      }),

      // 🔧 متغيرات Vite الإضافية
      'import.meta.env.DEV': isDev,
      'import.meta.env.PROD': isProd,

      // 🚫 تعطيل React DevTools في التطوير لتقليل الثقل
      ...(isDev && {
        // لا نقوم بتعطيل __REACT_DEVTOOLS_GLOBAL_HOOK__ في Vite 7 لتجنب الأخطاء
        // '__REACT_DEVTOOLS_GLOBAL_HOOK__': undefined,
        // 'global.__REACT_DEVTOOLS_GLOBAL_HOOK__': undefined
      }),
    },
    build: {
      outDir: 'dist',
      cssMinify: true,
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false, // إيقاف source maps في الإنتاج لتقليل الحجم
      target: 'es2022', // تحديث للمتصفحات الحديثة لتحسين الأداء
      minify: isProd ? 'esbuild' as const : false, // esbuild أسرع من terser بـ 20-50x
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
          manualChunks: (id) => {
            // 🚀 Simplified & Optimized Chunking Strategy
            // تم تبسيط الاستراتيجية من 25 chunk إلى 13 chunk - تحسين 48%
            const is = (re: RegExp) => re.test(id);

            // 1. React Core (Must be separate for optimal caching)
            if (is(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/)) {
              return 'react-core';
            }

            // 2. Router (Critical for navigation)
            if (is(/[\\/]node_modules[\\/](react-router-dom|@remix-run)[\\/]/)) {
              return 'router';
            }

            // 3. Network (Supabase + Axios)
            if (is(/[\\/]node_modules[\\/](@supabase|axios)[\\/]/)) {
              return 'network';
            }

            // 4. UI Core (Radix + Class utilities)
            if (is(/[\\/]node_modules[\\/](@radix-ui|clsx|class-variance-authority|tailwind-merge)[\\/]/)) {
              return 'ui-core';
            }

            // 5. Icons (Lucide only)
            if (is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'icons';
            }

            // 6. Forms & Validation (Heavy, but used together)
            if (is(/[\\/]node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/)) {
              return 'forms';
            }

            // 7. Charts (All charts together - lazy loaded)
            if (is(/[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts|@nivo)[\\/]/)) {
              return 'charts';
            }

            // 8. PDF & Image Processing (Heavy - lazy loaded)
            if (is(/[\\/]node_modules[\\/](jspdf|html2canvas|jspdf-autotable|qrcode|qr-code-styling|browser-image-compression)[\\/]/)) {
              return 'pdf-images';
            }

            // 9. Editors (Very heavy - lazy loaded)
            if (is(/[\\/]node_modules[\\/](@monaco-editor|@tinymce)[\\/]/)) {
              return 'editors';
            }

            // 10. Animation (Framer Motion)
            if (is(/[\\/]node_modules[\\/](framer-motion|motion)[\\/]/)) {
              return 'animation';
            }

            // 11. Utils (Date, Lodash, etc.)
            if (is(/[\\/]node_modules[\\/](lodash-es|lodash|date-fns|dayjs|moment|chance|ramda|underscore)[\\/]/)) {
              return 'utils';
            }

            // 12. TanStack Query
            if (is(/[\\/]node_modules[\\/]@tanstack[\\/]react-query/)) {
              return 'query';
            }

            // 13. Remaining vendor code
            if (is(/[\\/]node_modules[\\/]/)) {
              return 'vendor';
            }

            return undefined;
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
          'unenv/node/process',
          'punycode',
          'url'
        ],
        // تحسين خاص لـ Cloudflare Pages
        preserveEntrySignatures: 'exports-only',
        // تفعيل tree-shaking قوي للإنتاج
        treeshake: {
          preset: 'smallest',
          moduleSideEffects: (id) => {
            // Keep side effects for CSS and critical modules
            return id.includes('.css') ||
              id.includes('polyfill') ||
              id.includes('@supabase') ||
              id.includes('react-dom') ||
              id.includes('@radix-ui') ||      // UI components need side effects
              id.includes('framer-motion') ||  // Animation library
              id.includes('lucide-react');     // Icon library
          },
          propertyReadSideEffects: false, // تحسين أقوى
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false,
          // منع حذف exports المهمة
          manualPureFunctions: [
            'React.memo', 'React.forwardRef', 'React.createContext',
            'clsx', 'cn', 'twMerge'
          ],
        },
        // ضمان ترتيب التحميل الصحيح
        makeAbsoluteExternalsRelative: false,
      },
      // 🎯 تحسين للويب فقط (بدون Electron)
      assetsInlineLimit: 4096, // 4KB - تجميع الصور الصغيرة لتقليل طلبات HTTP
      // 🚀 تحسين إضافي لتقليل الطلبات
      reportCompressedSize: false, // إيقاف تقارير الحجم المضغوط
      write: true, // تفعيل الكتابة المباشرة

      // 🎨 إعدادات خاصة لملفات الأصول
      assetsInclude: ['**/*.woff2', '**/*.woff', '**/*.ttf'],

      // 🚀 تحسين CommonJS للويب
      commonjsOptions: {
        include: [/node_modules/],
        exclude: [/node_modules\/(url|punycode)\//],
        transformMixedEsModules: true,
        requireReturnsDefault: 'preferred',
        ignoreTryCatch: false,
        strictRequires: false,
        esmExternals: true,
        // Force default export for CJS modules that need it
        defaultIsModuleExports: true,
      },

      chunkSizeWarningLimit: 500, // 500KB - حد واقعي للتحذيرات

      // 🎨 تقسيم CSS للأداء - مُفعّل مع تحسينات
      cssCodeSplit: true,

      // ⚡ تحسين module preloading للويب - محسن لتقليل render blocking
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          // تصفية ذكية للتبعيات الحرجة فقط
          const criticalDeps = deps.filter(dep => {
            // CSS حرج فقط
            if (dep.includes('.css')) {
              return dep.includes('index-') || dep.includes('critical');
            }

            // JS حرج فقط
            const criticalChunks = ['react-core', 'router', 'main-'];
            return criticalChunks.some(chunk => dep.includes(chunk));
          });

          // تحديد أولوية التحميل
          return criticalDeps.sort((a, b) => {
            if (a.includes('react-core')) return -1;
            if (b.includes('react-core')) return 1;
            if (a.includes('.css')) return -1;
            if (b.includes('.css')) return 1;
            return 0;
          });
        }
      },

      // 🚀 إعدادات خاصة للتطوير - تحسين تجربة DevTools
      ...(isDev && {
        // تعطيل تحسينات قد تؤثر على DevTools
        reportCompressedSize: false,
        // تقليل chunk size warning في التطوير
        chunkSizeWarningLimit: 1000, // 1MB للتطوير
        // تسريع التطوير
        sourcemap: true,
        minify: false,
      }),
    },
    // 🚀 PERFORMANCE OPTIMIZATION: Selective Pre-optimization
    optimizeDeps: {
      force: isDev,
      esbuildOptions: {
        target: 'esnext',
        supported: {
          'top-level-await': true
        },
        keepNames: true,
        minify: false,
        treeShaking: false,
        // Better CommonJS interop for problematic modules
        mainFields: ['module', 'main'],
        conditions: ['import', 'module', 'default'],
      },
      // ✅ تحسين مسبق للضروريات المطلقة فقط - تقليل startup time
      include: [
        // Core React (فقط الأساسي)
        'react',
        'react/jsx-runtime',
        'react-dom/client',

        // Core Routing (فقط للتنقل الأساسي)
        'react-router-dom',

        // Essential Network (أساسي للتطبيق)
        '@supabase/supabase-js',

        // Essential Utils (خفيف ومطلوب)
        'clsx',
        'tailwind-merge',

        // CJS-only modules - prebundled for proper default interop
        'is-retry-allowed',
      ],

      // 🚨 استبعاد جميع المكتبات الثقيلة من التحسين المسبق
      exclude: [
        // React 19 built-ins (no longer needed as external packages)
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/shim/with-selector',

        // lucide-react كبير في dev، نمنعه من prebundle ليُقسم عند الطلب
        'lucide-react',
        // Heavy Charts & Graphics (keep these for lazy loading)
        'chart.js', 'react-chartjs-2', 'recharts',
        '@nivo/core', '@nivo/bar', '@nivo/line', '@nivo/pie',

        // Heavy Editors
        '@monaco-editor/react',
        '@tinymce/tinymce-react',

        // Heavy UI Libraries
        '@mui/material', '@mui/icons-material', '@mui/x-date-pickers',
        '@emotion/react', '@emotion/styled',
        'antd',

        // Heavy PDF & Image Processing (MUST be lazy)
        'jspdf', 'jspdf-autotable',
        'html2canvas',
        'jimp',
        'potrace',
        'qrcode',
        'qr-code-styling',

        // Lodash (causes chunking issues when pre-optimized)
        'lodash',

        // Non-essential Radix UI (load on demand) - excluding core dependencies
        '@radix-ui/react-accordion', '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
        '@radix-ui/react-collapsible', '@radix-ui/react-context-menu',
        '@radix-ui/react-hover-card', '@radix-ui/react-icons',
        '@radix-ui/react-label', '@radix-ui/react-menubar',
        '@radix-ui/react-navigation-menu', '@radix-ui/react-popover',
        '@radix-ui/react-progress', '@radix-ui/react-radio-group',
        '@radix-ui/react-scroll-area', '@radix-ui/react-select',
        '@radix-ui/react-separator', '@radix-ui/react-slider',
        '@radix-ui/react-switch', '@radix-ui/react-tabs',
        '@radix-ui/react-toast', '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',

        // Heavy drag and drop
        '@dnd-kit/core', '@dnd-kit/sortable',
        'react-dnd', 'react-dnd-html5-backend',

        // Animation libraries (defer)
        'motion',

        // Large utility libraries
        'date-fns/locale',
        'unenv',
        'process',
        'unenv/node/process',

        // Node.js polyfills that cause circular dependencies
        'url',
        'punycode',

        // Monitoring (load async)
        '@sentry/react', '@sentry/browser', '@sentry/tracing', '@sentry/replay',

        // Context Providers (load on demand)
        './src/context/DashboardDataContext.tsx',
        './src/lib/cache/deduplication.ts'
      ],

      // 🔧 تحسين عملية الاكتشاف
      holdUntilCrawlEnd: false,
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
      // تفعيل PostCSS - يستخدم postcss.config.cjs
      postcss: './postcss.config.cjs'
    },
    esbuild: {
      target: 'es2020',
      // إبقاء console في الإنتاج لأغراض التشخيص
      drop: isProd ? ['debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      jsxDev: false, // تعطيل jsxDev بشكل صريح
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
