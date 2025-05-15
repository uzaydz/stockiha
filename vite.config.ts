import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import type { Connect, ViteDevServer } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';

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
      }
    },
    plugins: [
      react({
        jsxRuntime: 'automatic',
        // تحسين تحميل React
        fastRefresh: true,
      }),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
        // مكتبات مطلوبة للعمل في المتصفح
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
        // ضبط المكتبات لتعمل في المتصفح
        globals: {
          Buffer: true,
          process: true,
          global: true,
          module: true
        },
      }),
      mode === 'development' &&
      componentTagger(),
      contentTypePlugin(), // Add our custom content type plugin
      rawContentPlugin(), // إضافة إضافة استيراد ملفات Markdown
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // الـ Polyfills للتوافق مع المتصفح
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
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
          format: 'es',
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          // إضافة نوع وحدة صريح لجميع ملفات JavaScript
          hoistTransitiveImports: false,
          minifyInternalExports: true,
          generatedCode: {
            preset: 'es2015',
            constBindings: true
          }
        },
        external: ['electron'],
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
      include: ['react', 'react-dom'],
      exclude: ['path-browserify']
    },
    preview: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
    }
  };
});
