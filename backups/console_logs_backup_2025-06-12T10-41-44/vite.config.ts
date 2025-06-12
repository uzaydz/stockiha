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

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }) => {
  // تحميل متغيرات البيئة
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';
  
  return {
    base: '/',
    server: {
      host: true,
      port: 8080,
      strictPort: true,
      hmr: {
        host: 'localhost',
        clientPort: 8080,
        overlay: false, // إخفاء overlay الأخطاء أثناء التطوير
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
      watch: {
        usePolling: true,
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
      // 🚀 PERFORMANCE BOOST: Million.js للأداء الفائق
      million.vite({ 
        auto: false // تعطيل التحسين التلقائي لتجنب الأخطاء
      }),
      react(),
      nodePolyfills({
        protocolImports: true,
        include: [
          'path',
          'util', 
          'stream', 
          'buffer', 
          'process',
          'events',
          'assert',
          'http',
          'https',
          'os',
          'url',
          'zlib',
          'querystring',
          'crypto',
          'fs'
        ],
        globals: {
          Buffer: true,
          process: true,
          global: true
        },
      }),
      mode === 'development' && componentTagger(),
      contentTypePlugin(),
      rawContentPlugin(),
      // CSP تم تعطيله مؤقتاً لحل مشاكل الاتصال
      // env.VITE_DISABLE_CSP !== 'true' && csp({...}),
      // إضافة Bundle Analyzer للإنتاج
      isProduction && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // أو 'sunburst' أو 'network'
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
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: true, // Source map enabled for all builds for easier debugging
      // تحسينات بناء Electron + PERFORMANCE OPTIMIZATION
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      minify: isProduction ? 'terser' as const : false, // تغيير إلى terser للضغط الأفضل
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2 // تشغيل الضغط مرتين للحصول على نتائج أفضل
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        }
      } : undefined,
      // التأكد من أن جميع المسارات نسبية
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          format: 'esm' as ModuleFormat,
          // تقسيم الحزم الذكي لتحسين الأداء
          manualChunks: {
            // React والمكتبات الأساسية
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // مكتبات UI
            'ui-vendor': [
              'lucide-react',
              'framer-motion',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-slider',
              '@radix-ui/react-switch',
              '@radix-ui/react-progress',
            ],
            
            // Supabase وقواعد البيانات
            'database-vendor': ['@supabase/supabase-js'],
            
            // مكتبات أخرى
            'utils-vendor': [
              'date-fns',
              'clsx',
              'class-variance-authority',
              'tailwind-merge',
              'react-helmet-async',
              'zod',
              'react-hook-form',
              '@hookform/resolvers'
            ],

          },
          
          // تسمية الملفات المحسنة
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            
            if (/\.css$/i.test(assetInfo.name || '')) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            
            return `assets/[name]-[hash].${ext}`;
          },
        } as OutputOptions,
        external: ['perf_hooks'],
        
        // PERFORMANCE OPTIMIZATION: Tree shaking محسن
        treeshake: {
          preset: 'recommended' as const,
          manualPureFunctions: ['console.log', 'console.warn'],
        },
      },
      // تحسين ضغط الصور
      assetsInlineLimit: 4096, // 4KB
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 500, // تقليل حد التحذير لحجم الملف (500KB) لتحسين الأداء
      
      // PERFORMANCE OPTIMIZATION: CSS code splitting
      cssCodeSplit: true,
    },
    // تشغيل الشفرة في محتوى واحد في Electron
    optimizeDeps: {
      exclude: ['path-browserify', 'perf_hooks'],
      include: ['react', 'react-dom', '@supabase/supabase-js']
    },
    preview: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
    }
  };
});
