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
              console.log('Proxy: Setting X-API-ID header');
            }
            if (apiToken) {
              proxyReq.setHeader('X-API-TOKEN', apiToken);
              console.log('Proxy: Setting X-API-TOKEN header');
            }
            
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Accept', 'application/json');
            
            // Remove browser headers that might interfere
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('host');
            
            console.log('Proxy request headers:', {
              'X-API-ID': apiId ? '***' : 'missing',
              'X-API-TOKEN': apiToken ? '***' : 'missing'
            });
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
              if (res && typeof res.writeHead === 'function') {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ message: 'Proxy Error', error: err.message }));
              }
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
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
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
        // إصلاح مشكلة WebSocket لـ Supabase - تعطيل ws module
        'ws': path.resolve(__dirname, 'src/utils/websocket-polyfill.ts'),
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
      // React environment variables
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
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
          drop_console: false,
          drop_debugger: true,
          unused: false,
          side_effects: false,
          passes: 2,
        },
        mangle: {
          safari10: true,
          keep_fnames: /^(deduplicateRequest|interceptFetch|POSDataProvider|DashboardDataContext|StoreDataContext|AuthSingleton|UnifiedRequestManager|initializeRequestSystems|checkUserRequires2FA|handleSuccessfulLogin|PerformanceTracker|UltimateRequestController)$/,
          reserved: ['console', 'log', 'warn', 'error', 'info', 'require', 'exports', 'module']
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
            'core-infra': [
              './src/lib/cache/deduplication.ts',
              './src/lib/authSingleton.ts',
              './src/lib/performance-tracking.ts'
            ],
            'pos-logic': [
              './src/context/POSDataContext.tsx',
            ],
            'dashboard-logic': [
              './src/context/DashboardDataContext.tsx'
            ],
            'store-logic': [
                './src/context/StoreContext.tsx'
            ]
          }
        } as OutputOptions,
        external: isProd ? [] : undefined,
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
      // تحسين ضغط الصور
      assetsInlineLimit: 4096, // 4KB
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        // تحسين hoisting لتجنب مشاكل التهيئة
        hoistTransitiveImports: false,
        ignoreTryCatch: false,
        strictRequires: false,
        // إصلاح مشكلة react-is و recharts و React context
        namedExports: {
          'react': ['createContext', 'useContext', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'Suspense', 'lazy', 'Fragment', 'createElement', 'Children', 'Component', 'PureComponent', 'memo', 'forwardRef', 'useImperativeHandle', 'useLayoutEffect', 'useReducer', 'useDeferredValue', 'useTransition', 'startTransition', 'cloneElement', 'isValidElement'],
          'react-dom': ['render', 'createRoot', 'hydrateRoot', 'findDOMNode', 'unmountComponentAtNode', 'createPortal', 'flushSync'],
          'react-router': ['createBrowserRouter', 'createHashRouter', 'createMemoryRouter', 'RouterProvider', 'useNavigate', 'useLocation', 'useParams', 'useSearchParams', 'Outlet', 'Navigate', 'Link', 'NavLink'],
          'react-router-dom': ['BrowserRouter', 'HashRouter', 'MemoryRouter', 'Routes', 'Route', 'Link', 'NavLink', 'useNavigate', 'useLocation', 'useParams', 'useSearchParams', 'Outlet', 'Navigate'],
          'react-is': ['isFragment', 'isValidElementType', 'isElement'],
          'recharts': ['ResponsiveContainer', 'LineChart', 'BarChart', 'PieChart', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'Legend', 'Line', 'Bar', 'Cell', 'RadialBarChart', 'RadialBar'],
        },
      },
      chunkSizeWarningLimit: 1000,
      
      // PERFORMANCE OPTIMIZATION: CSS code splitting
      cssCodeSplit: true,
      // تحسين خاص لـ React في Vercel
      modulePreload: {
        polyfill: true
      },
    },
    // تشغيل الشفرة في محتوى واحد في Electron
    optimizeDeps: {
      force: isDev,
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'react-router',
        '@remix-run/router',
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
        // إضافة recharts للتحسين المسبق مع تفاصيل أكثر
        'recharts',
        'recharts/es6',
        'recharts/es6/cartesian/CartesianGrid',
        'recharts/es6/chart/BarChart',
        'recharts/es6/chart/PieChart',
        'recharts/es6/chart/RadialBarChart',
        'recharts/es6/component/ResponsiveContainer',
        'recharts/es6/component/Tooltip',
        'recharts/es6/component/Legend',
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
        './src/context/POSDataContext.tsx',
        './src/lib/cache/deduplication.ts'
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
    },
    worker: {
      format: 'es',
    },
  };
});
