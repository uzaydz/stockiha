import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import csp from 'vite-plugin-csp-guard';
import type { Connect, ViteDevServer } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import type { ModuleFormat, OutputOptions } from 'rollup';

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
              console.error('Procolis proxy error:', err);
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
      // إضافة CSP plugin فقط إذا لم يكن معطلاً في متغيرات البيئة
      env.VITE_DISABLE_CSP !== 'true' && csp({
        dev: {
          run: true, // تشغيل في وضع التطوير
        },
        policy: {
          'connect-src': [
            "'self'",
            'https://api.vercel.com',
            'https://*.vercel.com',
            'https://*.vercel.app',
            'https://*.supabase.co',
            'https://*.supabase.in',
            'wss://*.supabase.co',
            'https://api.yalidine.app',
            'https://procolis.com',
            'https://*.sentry.io',
            'https://www.facebook.com',
            'https://graph.facebook.com',
            'https://www.google-analytics.com',
            'https://analytics.google.com',
            'https://ads.tiktok.com',
            'https://analytics.tiktok.com',
            'ws://localhost:*',
            'wss://localhost:*',
            'http://localhost:*',
            'http://127.0.0.1:*',
            'ws://127.0.0.1:*'
          ],
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.gpteng.co',
            'https://connect.facebook.net',
            'https://*.facebook.net',
            'https://www.facebook.com',
            'https://*.facebook.com',
            'https://analytics.tiktok.com',
            'https://*.tiktok.com',
            'https://www.googletagmanager.com',
            'https://*.google-analytics.com',
            'https://*.googleadservices.com'
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com'
          ],
          'font-src': [
            "'self'",
            'https://fonts.gstatic.com'
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://*.supabase.co',
            'https://*.supabase.in',
            'https://cdn.jsdelivr.net',
            'https://images.unsplash.com',
            'https://maps.googleapis.com',
            'https://*.googleusercontent.com',
            'https://www.gravatar.com',
            'https://secure.gravatar.com',
            'https://www.facebook.com',
            'https://*.facebook.com',
            'https://analytics.tiktok.com',
            'https://*.tiktok.com',
            'https://www.googletagmanager.com',
            'https://*.google-analytics.com',
            'https://*.googleadservices.com',
            'https://cdn.salla.sa'
          ]
        },
        build: {
          sri: true // تفعيل Subresource Integrity
        }
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
      // تحسينات بناء Electron
      target: 'esnext',
      minify: false, // تعطيل التصغير مؤقتًا للتشخيص
      terserOptions: isProduction ? {
        compress: {
          drop_console: true, // قد نرغب في تعطيل هذا أيضًا لرؤية أي console.logs من المكتبات
          drop_debugger: true
        }
      } : undefined,
      // التأكد من أن جميع المسارات نسبية
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          format: 'esm' as ModuleFormat,
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          }
        } as OutputOptions,
        external: ['perf_hooks'],
      },
      // تحسين ضغط الصور
      assetsInlineLimit: 4096, // 4KB
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 1000, // زيادة حد التحذير لحجم الملف (1MB)
    },
    // تشغيل الشفرة في محتوى واحد في Electron
    optimizeDeps: {
      exclude: ['path-browserify', 'perf_hooks']
    },
    preview: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
    }
  };
});
