import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
// import csp from 'vite-plugin-csp-guard'; // مُعطل مؤقتاً
import type { Connect, ViteDevServer } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import type { ModuleFormat, OutputOptions } from 'rollup';
import { visualizer } from 'rollup-plugin-visualizer';
import million from 'million/compiler';

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
function contentTypePlugin(): Plugin {
  return {
    name: 'content-type-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Set proper content type for HTML files
        if (req.url === '/' || req.url?.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
        next();
      });
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
      host: "::",
      port: 8080,
      // تحسين HMR
      hmr: {
        overlay: isDev,
      },
      // تحسين الذاكرة
      watch: {
        usePolling: false,
        interval: 100,
      },
      cors: true,
      fs: {
        strict: false,
        allow: ['..']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff'
      },
      proxy: {
        '/yalidine-api': {
          target: 'https://api.yalidine.app/v1',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/yalidine-api/, ''),
          headers: {
            // إضافة رؤوس إضافية هنا إذا لزم الأمر
          },
          onProxyReq: (proxyReq: any, req: any) => {
            // نسخ الرؤوس من الطلب الأصلي إلى طلب الوكيل
            if (req.headers['x-api-id']) {
              proxyReq.setHeader('X-API-ID', req.headers['x-api-id'] as string);
            }
            if (req.headers['x-api-token']) {
              proxyReq.setHeader('X-API-TOKEN', req.headers['x-api-token'] as string);
            }
            // تنظيف رأس Origin لتجنب مشاكل CORS
            proxyReq.removeHeader('origin');
          },
          configure: (proxy: any, _options: any) => {
            proxy.on('error', (err: any, _req: any, _res: any) => {
              
            });
            proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
              
            });
            proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
              
              // إضافة رؤوس CORS للاستجابة
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'X-API-ID, X-API-TOKEN, Content-Type, Accept';
            });
          }
        },
        // توجيه طلبات API إلى خادم API المحلي
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        // إضافة وسيط لخدمة Procolis لحل مشكلة CORS
        '/api/proxy/procolis': {
          target: 'https://procolis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/api\/proxy\/procolis/, '/api_v1'),
          onProxyReq: (proxyReq: any, req: any) => {
            // نقل رؤوس الطلب الأصلي إلى طلب الوسيط
            if (req.headers['token']) {
              proxyReq.setHeader('token', req.headers['token'] as string);
            }
            if (req.headers['key']) {
              proxyReq.setHeader('key', req.headers['key'] as string);
            }
            // إزالة رأس Origin لتجنب مشاكل CORS
            proxyReq.removeHeader('origin');
          },
          configure: (proxy: any, _options: any) => {
            proxy.on('error', (err: any, _req: any, _res: any) => {
            });
            proxy.on('proxyRes', (proxyRes: any, _req: any, _res: any) => {
              // إضافة رؤوس CORS للاستجابة
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'token, key, Content-Type, Accept';
            });
          }
        },
      }
    },
    plugins: [
      // Million.js للتحسين الفائق
      million.vite({ 
        auto: true,
      }),
      
      react(),
      
      // Component tagger للتطوير فقط
      isDev && componentTagger(),
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
      
      // إضافة Node.js polyfills لحل مشكلة util module
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
        include: ['util', 'stream', 'buffer', 'process', 'crypto'],
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        stream: 'stream-browserify',
        path: 'path-browserify',
        util: 'util',
        buffer: 'buffer',
        crypto: 'crypto-browserify',
        assert: 'assert',
        http: 'stream-http',
        https: 'https-browserify',
        os: 'os-browserify',
        url: 'url',
        zlib: 'browserify-zlib',
        fs: 'memfs',
        // إصلاح مشكلة lodash CommonJS
        'lodash/get': 'lodash-es/get',
        'lodash/isString': 'lodash-es/isString',
        'lodash/isNaN': 'lodash-es/isNaN',
        'lodash/isNumber': 'lodash-es/isNumber',
        'lodash/isObject': 'lodash-es/isObject',
        'lodash/isArray': 'lodash-es/isArray',
        'lodash/isFunction': 'lodash-es/isFunction',
        'lodash/isEmpty': 'lodash-es/isEmpty',
        'lodash/isNil': 'lodash-es/isNil',
        'lodash/isUndefined': 'lodash-es/isUndefined',
        'lodash/pick': 'lodash-es/pick',
        'lodash/omit': 'lodash-es/omit',
        'lodash/merge': 'lodash-es/merge',
        'lodash/clone': 'lodash-es/clone',
        'lodash/cloneDeep': 'lodash-es/cloneDeep',
        'lodash/debounce': 'lodash-es/debounce',
        'lodash/throttle': 'lodash-es/throttle',
        // إصلاح مشكلة react-is
        'react-is': 'react-is',
        // إصلاح مشكلة recharts
        'recharts': 'recharts',
      },
      dedupe: ['react', 'react-dom'],
      // تحسينات للتوافق مع Electron
      mainFields: ['browser', 'module', 'jsnext:main', 'jsnext']
    },
    define: {
      '__dirname': JSON.stringify('/'),
      'process.env': process.env,
      'process.type': JSON.stringify(process.env.NODE_ENV === 'production' ? 'renderer' : ''),
      // إضافة متغيرات لدعم Electron
      'global': 'globalThis',
      // Polyfills للوحدات الضرورية
      'Buffer': ['buffer', 'Buffer'],
      'process': 'process',
      'import.meta.env.VITE_DOMAIN_PROXY': JSON.stringify(env.VITE_DOMAIN_PROXY || 'connect.ktobi.online'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001/api'),
      'import.meta.env.VITE_VERCEL_PROJECT_ID': JSON.stringify(env.VITE_VERCEL_PROJECT_ID || ''),
      'import.meta.env.VITE_VERCEL_API_TOKEN': JSON.stringify(env.VITE_VERCEL_API_TOKEN || ''),
      __DEV__: isDev,
      __PROD__: isProd,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: isDev,
      // تحسينات بناء Electron + PERFORMANCE OPTIMIZATION
      target: 'es2020',
      minify: isProd ? 'terser' as const : false, // تغيير إلى terser للضغط الأفضل
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: {
          safari10: true,
        },
        format: {
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
          // تقسيم الحزم الذكي لتحسين الأداء
          manualChunks: (id) => {
            // Vendor chunks - مكتبات خارجية
            if (id.includes('node_modules')) {
              // React ecosystem
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              
              // UI Libraries
              if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority')) {
                return 'ui-vendor';
              }
              
              // Routing & State Management
              if (id.includes('react-router') || id.includes('@tanstack/react-query') || id.includes('zustand')) {
                return 'routing-vendor';
              }
              
              // Forms & Validation
              if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
                return 'forms-vendor';
              }
              
              // Charts & Analytics
              if (id.includes('recharts') || id.includes('chart.js') || id.includes('d3')) {
                return 'charts-vendor';
              }
              
              // Date & Time
              if (id.includes('date-fns') || id.includes('moment') || id.includes('dayjs')) {
                return 'date-vendor';
              }
              
              // Supabase & Database
              if (id.includes('@supabase') || id.includes('postgres')) {
                return 'supabase-vendor';
              }
              
              // PDF & File Processing
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('file-saver')) {
                return 'pdf-vendor';
              }
              
              // Other large vendors
              if (id.includes('lodash') || id.includes('ramda')) {
                return 'utils-vendor';
              }
              
              // Default vendor chunk for smaller libraries
              return 'vendor';
            }
            
            // Application chunks - أجزاء التطبيق
            
            // Store & E-commerce
            if (id.includes('/store/') || id.includes('/components/store/')) {
              return 'store-chunk';
            }
            
            // Dashboard & Admin
            if (id.includes('/dashboard/') || id.includes('/admin/')) {
              return 'dashboard-chunk';
            }
            
            // POS System
            if (id.includes('/pos/') || id.includes('POS')) {
              return 'pos-chunk';
            }
            
            // Authentication
            if (id.includes('/auth/') || id.includes('/components/auth/')) {
              return 'auth-chunk';
            }
            
            // Forms & Builders
            if (id.includes('/form/') || id.includes('/builder/') || id.includes('FormBuilder')) {
              return 'forms-chunk';
            }
            
            // Reports & Analytics
            if (id.includes('/reports/') || id.includes('/analytics/') || id.includes('Analytics')) {
              return 'analytics-chunk';
            }
            
            // Settings & Configuration
            if (id.includes('/settings/') || id.includes('Settings')) {
              return 'settings-chunk';
            }
            
            // Landing Pages & Marketing
            if (id.includes('/landing/') || id.includes('Landing')) {
              return 'landing-chunk';
            }
            
            // Utils & Helpers
            if (id.includes('/utils/') || id.includes('/lib/') || id.includes('/helpers/')) {
              return 'utils-chunk';
            }
            
            // Context & Providers
            if (id.includes('/context/') || id.includes('Context') || id.includes('Provider')) {
              return 'context-chunk';
            }
            
            // Hooks
            if (id.includes('/hooks/') || id.includes('use')) {
              return 'hooks-chunk';
            }
          },
          
          // تحسين أسماء الملفات
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/js/[name]-[hash].js`;
          },
          
          entryFileNames: 'assets/js/[name]-[hash].js',
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
        } as OutputOptions,
        external: isProd ? [] : undefined,
      },
      // تحسين ضغط الصور
      assetsInlineLimit: 4096, // 4KB
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        // إصلاح مشكلة react-is و recharts
        namedExports: {
          'react-is': ['isFragment', 'isValidElementType', 'isElement'],
          'recharts': ['ResponsiveContainer', 'LineChart', 'BarChart', 'PieChart', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'Legend', 'Line', 'Bar', 'Cell'],
        },
      },
      chunkSizeWarningLimit: 1000,
      
      // PERFORMANCE OPTIMIZATION: CSS code splitting
      cssCodeSplit: true,
    },
    // تشغيل الشفرة في محتوى واحد في Electron
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        '@supabase/supabase-js',
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        // إضافة polyfills للنود
        'util',
        'stream-browserify',
        'buffer',
        'process',
        // إضافة lodash-es للتحسين المسبق
        'lodash-es/get',
        'lodash-es/isString', 
        'lodash-es/isNaN',
        'lodash-es/isNumber',
        'lodash-es/isObject',
        'lodash-es/isArray',
        'lodash-es/isFunction',
        'lodash-es/isEmpty',
        'lodash-es/isNil',
        'lodash-es/isUndefined',
        'lodash-es/pick',
        'lodash-es/omit',
        'lodash-es/merge',
        'lodash-es/clone',
        'lodash-es/cloneDeep',
        'lodash-es/debounce',
        'lodash-es/throttle',
        // إضافة react-is للتحسين المسبق
        'react-is',
        // إضافة recharts للتحسين المسبق
        'recharts',
      ],
      exclude: [
        // استبعاد المكتبات الثقيلة من التحسين المسبق
        'jspdf',
        'html2canvas',
        // استبعاد lodash القديم لصالح lodash-es
        'lodash/get',
        'lodash/isString',
        'lodash/isNaN', 
        'lodash/isNumber',
        'lodash/isObject',
        'lodash/isArray',
        'lodash/isFunction',
        'lodash/isEmpty',
        'lodash/isNil',
        'lodash/isUndefined',
        'lodash/pick',
        'lodash/omit',
        'lodash/merge',
        'lodash/clone',
        'lodash/cloneDeep',
        'lodash/debounce',
        'lodash/throttle',
      ],
    },
    preview: {
      port: 8080,
      host: true,
    },
    css: {
      devSourcemap: isDev,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
    esbuild: {
      target: 'es2020',
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    worker: {
      format: 'es',
    },
  };
});
