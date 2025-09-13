import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import million from "million/compiler";
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

// 🔒 حماية كود الإنتاج - Obfuscator Plugin
import obfuscator from 'rollup-plugin-obfuscator';

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

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  const isStoreBuild = process.env.VITE_BUILD_TARGET === 'store' || env.VITE_BUILD_TARGET === 'store';

  // تحميل متغيرات البيئة
  
  return {
    base: '/',
    envPrefix: 'VITE_', // ضمان حقن متغيرات VITE_ في import.meta.env
    server: {
      host: "0.0.0.0", // تغيير من "::" إلى "0.0.0.0" لضمان الوصول من جميع الأجهزة
      port: 8080,
      
      // 🚀 تحسين HMR للأداء الفائق
      hmr: {
        overlay: false, // تعطيل overlay لتقليل الضوضاء
        // استخدام منفذ مختلف لـ WebSocket لتجنب التضارب
        port: 24678,
        host: "localhost", // استخدام localhost بدلاً من 0.0.0.0 للـ HMR
        // 🚫 تقليل ثقل HMR في التطوير
        ...(isDev && {
          // تفعيل Fast Refresh
          fastRefresh: true,
          // تعطيل بعض ميزات HMR الثقيلة
          fullReload: false,
          // تقليل عدد محاولات الاتصال
          retryCount: 3,
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
      // Content Type Plugin - يجب أن يكون أولاً لإصلاح مشاكل MIME
      contentTypePlugin(),
      // Dev rewrite for store routes
      devStoreRewritePlugin(),
      
      // Instagram Compatibility Plugin
      instagramCompatibilityPlugin(),
      
      // Security Plugin - للتطوير فقط (لتجنب التضارب مع CSP plugin)
      isDev && securityPlugin(),
      
      // Dev Critical CSS Plugin - لخدمة critical.css في التطوير
      devCriticalCSSPlugin(),
      
      // Million.js configuration for performance optimization
      million.vite({
        auto: {
          threshold: 0.1,
          skip: [
            // SVG elements - ignore all SVG elements
            'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
            'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
            'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
            // Components with SVG - ignore components containing SVG
            'DashboardPreview', 'ChartComponent', 'SVGWrapper',
            // UI Components - ignore complex components
            'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger'
          ]
        },
        mode: 'react',
        server: true
      }),
      
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
          'frame-src': ["'self'"],
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
        threshold: 1024, // 1KB - ضغط ملفات أصغر لتحسين الأداء
        compressionOptions: { 
          level: 11, // أقصى ضغط
          windowBits: 22
        },
        filter: /\.(js|mjs|json|css|html|svg|txt|xml)$/i,
        verbose: false // تقليل logs في production
      }),
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz', 
        deleteOriginFile: false,
        threshold: 1024, // 1KB - ضغط ملفات أصغر
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
        // 🔀 Store-only build: alias heavy contexts to lightweight public stubs
        ...(isStoreBuild ? {
          '@/context/AuthContext': path.resolve(__dirname, './src/context/public/AuthPublicContext.tsx'),
          '@/context/TenantContext': path.resolve(__dirname, './src/context/public/TenantPublicContext.tsx'),
          '@/app-components/DashboardRoutes': path.resolve(__dirname, './src/stubs/EmptyComponent.tsx'),
          '@/app-components/RouteComponents': path.resolve(__dirname, './src/stubs/RouteComponents.stub.tsx'),
          '@/app-components/POSRoutesStandalone': path.resolve(__dirname, './src/stubs/EmptyComponent.tsx'),
          '@/components/routing/SmartProviderWrapper': path.resolve(__dirname, './src/stubs/EmptyComponent.tsx'),
        } : {}),
        
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
      __STORE_BUILD__: isStoreBuild,
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
      sourcemap: isDev ? 'inline' : false,
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
          store: path.resolve(__dirname, 'store.html'),
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
            // More granular chunking to reduce main bundle size
            const is = (re: RegExp) => re.test(id);

            // Group small internal runtime modules into one chunk to avoid many tiny requests
            const appCoreSmallPaths = [
              '/src/lib/themeManager',
              '/src/lib/headGuard',
              '/src/lib/requestDeduplicator',
              '/src/lib/supabase-unified',
              '/src/lib/supabase-client',
              '/src/lib/api/deduplicatedApi',
              '/src/utils/earlyPreload'
            ];
            if (appCoreSmallPaths.some((p) => id.includes(p))) {
              return 'app-core-small';
            }

            // Core React - keep React and ReactDOM together to avoid scheduler issues
            if (is(/[\\/]node_modules[\\/]react[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-dom[\\/]/) ||
                is(/[\\/]node_modules[\\/]scheduler[\\/]/)) {
              return 'react-core';
            }
            
            // Million optimization
            if (is(/[\\/]node_modules[\\/]million[\\/]/)) {
              return 'vendor-million';
            }

            // Router (essential but can be separate)
            if (is(/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/) || is(/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/)) {
              return 'router';
            }

            // Query client (separate from main)
            if (is(/[\\/]node_modules[\\/]@tanstack[\\/]react-query/)) {
              return 'query';
            }

            // Supabase (large, separate chunk)
            if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) {
              return 'supabase';
            }

            // Forms (used in specific pages)
            if (is(/[\\/]node_modules[\\/]react-hook-form[\\/]/) || is(/[\\/]node_modules[\\/]zod[\\/]/) || is(/[\\/]node_modules[\\/]@hookform[\\/]/)) {
              return 'forms';
            }

            // Utils (large but shared)
            if (is(/[\\/]node_modules[\\/]lodash(-es)?[\\/]/) || is(/[\\/]node_modules[\\/]date-fns[\\/]/)) {
              return 'utils';
            }

            // HTTP client
            if (is(/[\\/]node_modules[\\/]axios[\\/]/)) {
              return 'http';
            }

            // Charts - split by library to avoid loading all at once
            if (is(/[\\/]node_modules[\\/]chart\.js[\\/]/) || is(/[\\/]node_modules[\\/]react-chartjs-2[\\/]/)) {
              return 'vendor-chartjs';
            }
            if (is(/[\\/]node_modules[\\/]recharts[\\/]/)) {
              return 'vendor-recharts';
            }
            if (is(/[\\/]node_modules[\\/]@nivo[\\/]/)) {
              return 'vendor-nivo';
            }

            // PDF libs - separate (lazy loaded)
            if (is(/[\\/]node_modules[\\/]jspdf[\\/]/) || 
                is(/[\\/]node_modules[\\/]html2canvas[\\/]/) || 
                is(/[\\/]node_modules[\\/]jspdf-autotable[\\/]/)) {
              return 'vendor-pdf';
            }

            // Editors - separate (lazy loaded)
            if (is(/[\\/]node_modules[\\/]@monaco-editor[\\/]/) || 
                is(/[\\/]node_modules[\\/]@tinymce[\\/]/)) {
              return 'editors';
            }

            // Icons: split lucide-react to its own chunk for better caching
            if (is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'vendor-icons';
            }
            // Core UI utilities
            if (is(/[\\/]node_modules[\\/]class-variance-authority[\\/]/) ||
                is(/[\\/]node_modules[\\/]clsx[\\/]/) ||
                is(/[\\/]node_modules[\\/]tailwind-merge[\\/]/)) {
              return 'ui-core';
            }

            // Radix UI - keep together to avoid dependency issues
            if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/)) {
              return 'ui-radix';
            }

            // Animation
            if (is(/[\\/]node_modules[\\/]framer-motion[\\/]/)) {
              return 'animation';
            }

            // i18n (lazy loaded)
            if (is(/[\\/]node_modules[\\/]i18next/) || is(/[\\/]node_modules[\\/]react-i18next/)) {
              return 'i18n';
            }

            // Split remaining vendor libraries by size/type
            if (is(/[\\/]node_modules[\\/]/)) {
              const packageName = id.split('node_modules/')[1]?.split('/')[0];
              
              // Heavy libraries get their own chunks
              const heavyLibs = ['@monaco-editor', '@tinymce', 'html2canvas', 'jspdf', 'jimp'];
              if (heavyLibs.some(lib => packageName?.startsWith(lib))) {
                return `heavy-${packageName?.replace('@', '').replace('/', '-')}`;
              }
              
              // Medium-sized vendor chunk
              const mediumLibs = ['@radix-ui', '@heroicons', '@headlessui', 'framer-motion'];
              if (mediumLibs.some(lib => packageName?.startsWith(lib))) {
                return 'vendor-ui';
              }
              
              // Small vendor chunk
              return 'vendor-misc';
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
          'unenv/node/process'
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
                   id.includes('react-dom');
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
        chunkSizeWarningLimit: 5000,
        // تسريع التطوير
        sourcemap: true,
        minify: false,
      }),
    },
    // 🚀 PERFORMANCE OPTIMIZATION: Selective Pre-optimization
    optimizeDeps: {
      force: isDev,
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
        
        // Essential UI (أيقونات فقط) - لا ندرجها هنا لتفادي prebundle 1MB في dev
        
        // Core Polyfills (ضروري للتوافق)
        'util',
        'buffer',
        'use-sync-external-store',
        'use-sync-external-store/shim',
      ],
      
      // 🚨 استبعاد جميع المكتبات الثقيلة من التحسين المسبق  
      exclude: [
        // lucide-react كبير في dev، نمنعه من prebundle ليُقسم عند الطلب
        'lucide-react',
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
        
        // Heavy HTTP utilities (defer until needed)
        'axios-retry',
        
        // Heavy drag and drop
        '@dnd-kit/core', '@dnd-kit/sortable',
        'react-dnd', 'react-dnd-html5-backend',
        
        // Animation libraries (defer)
        'motion',
        
        // Large utility libraries
        'dayjs',
        'date-fns/locale',
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
        target: 'es2020',
        supported: {
          'top-level-await': true
        },
        plugins: [],
        keepNames: true,
        minify: false, // لا نضغط في optimizeDeps
        treeShaking: false // لا نقطع الشجرة في optimizeDeps
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
      // تفعيل cssnano في الإنتاج لخفض حجم CSS وإزالة التكرار
      // تم تعطيل cssnano مؤقتاً لتجنب مشكلة dynamic require
      // postcss: isProd ? {
      //   plugins: [
      //     require('cssnano')({ preset: 'default' })
      //   ]
      // } : undefined
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
