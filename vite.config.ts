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
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
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
      react(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
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
      sourcemap: !isProduction, // Source map only in development
      // تحسينات بناء Electron
      target: 'esnext',
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined,
      // التأكد من أن جميع المسارات نسبية
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // تجزئة الكود للمكتبات الرئيسية
            if (id.includes('node_modules')) {
              // تجميع React وكل المكتبات المتعلقة بـ React في حزمة واحدة
              if (id.includes('react') || 
                  id.includes('react-dom') ||
                  id.includes('react-use') || 
                  id.includes('use-') ||
                  id.includes('react-hook-form') || 
                  id.includes('@hookform') ||
                  id.includes('usehooks-ts')) {
                return 'vendor-react';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('@mui') || id.includes('@emotion')) {
                return 'vendor-mui';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-animation';
              }
              // تجميع المكتبات الأخرى
              return 'vendor-others';
            }
            // تجزئة مكونات صفحة المنتج
            if (id.includes('/components/store/product/')) {
              return 'product-components';
            }
            // تجزئة مكونات نموذج الطلب
            if (id.includes('/components/store/order-form/')) {
              return 'order-form-components';
            }
          },
          format: 'es',
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
        external: ['electron'],
      },
      // تحسين ضغط الصور
      assetsInlineLimit: 4096, // 4KB
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 1000, // زيادة حد التحذير لحجم الملف (1MB)
    },
    // تشغيل الشفرة في محتوى واحد في Electron
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        '@supabase/supabase-js',
        'buffer',
        'process',
        'stream-browserify',
        'path-browserify',
        'util',
        'crypto-browserify',
        'assert',
        'stream-http',
        'https-browserify',
        'os-browserify',
        'url',
        'browserify-zlib',
      ],
      exclude: ['electron'],
      // تجنب تخريج وحدات Node.js 
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        plugins: [
          {
            name: 'node-globals',
            setup(build: any) {
              // إعداد polyfills لوحدات Node.js
              build.onResolve({ filter: /^stream$|^http$|^url$|^crypto$|^https$|^zlib$|^util$|^events$|^path$|^fs$|^assert$/ }, (args: any) => {
                return { path: args.path, namespace: 'node-polyfills' };
              });
              
              build.onLoad({ filter: /.*/, namespace: 'node-polyfills' }, (args: any) => {
                let contents = '';
                if (args.path === 'stream') {
                  contents = `
                    export class Readable {
                      constructor() {}
                      static from() { return new Readable(); }
                      pipe() { return this; }
                      on() { return this; }
                    }
                    export class Writable {
                      constructor() {}
                      write() {}
                      end() {}
                      on() { return this; }
                    }
                    export class PassThrough extends Readable {
                      constructor() { super(); }
                    }
                    export class Transform extends Readable {
                      constructor() { super(); }
                    }
                    export default { Readable, Writable, PassThrough, Transform };
                  `;
                } else if (args.path === 'http') {
                  contents = `
                    export const STATUS_CODES = {
                      '200': 'OK',
                      '204': 'No Content',
                      '304': 'Not Modified',
                      '400': 'Bad Request',
                      '401': 'Unauthorized',
                      '403': 'Forbidden',
                      '404': 'Not Found',
                      '500': 'Internal Server Error'
                    };
                    export const request = () => {};
                    export const get = () => {};
                    export default { STATUS_CODES, request, get };
                  `;
                } else if (args.path === 'https') {
                  contents = `
                    export const request = () => {};
                    export const get = () => {};
                    export default { request, get };
                  `;
                } else if (args.path === 'url') {
                  contents = `
                    export class URL {
                      constructor(url, base) {
                        return new globalThis.URL(url, base);
                      }
                    }
                    export function parse(url) {
                      const parsed = new globalThis.URL(url);
                      return {
                        protocol: parsed.protocol,
                        hostname: parsed.hostname,
                        port: parsed.port,
                        pathname: parsed.pathname,
                        search: parsed.search,
                        hash: parsed.hash
                      };
                    }
                    export function format(urlObj) {
                      return urlObj.toString();
                    }
                    export default { URL, parse, format };
                  `;
                } else if (args.path === 'zlib') {
                  contents = `
                    export const createGzip = () => ({});
                    export const createUnzip = () => ({});
                    export default { createGzip, createUnzip };
                  `;
                } else if (args.path === 'crypto') {
                  contents = `
                    export const createHash = () => ({
                      update: () => ({}),
                      digest: () => '',
                    });
                    export const randomBytes = () => ({});
                    export default { createHash, randomBytes };
                  `;
                } else if (args.path === 'util') {
                  contents = `
                    export const inherits = () => {};
                    export const inspect = () => {};
                    export const promisify = (fn) => fn;
                    export const deprecate = (fn) => fn;
                    export default { inherits, inspect, promisify, deprecate };
                  `;
                } else if (args.path === 'events') {
                  contents = `
                    export class EventEmitter {
                      constructor() {}
                      on() { return this; }
                      once() { return this; }
                      off() { return this; }
                      emit() { return false; }
                    }
                    export default { EventEmitter };
                  `;
                } else if (args.path === 'path') {
                  contents = `
                    export const join = (...args) => args.join('/').replace(/\\/+/g, '/');
                    export const resolve = (...args) => args.join('/').replace(/\\/+/g, '/');
                    export const normalize = (path) => path.replace(/\\/+/g, '/');
                    export const dirname = (path) => path.split('/').slice(0, -1).join('/');
                    export const basename = (path) => path.split('/').pop();
                    export const extname = (path) => {
                      const base = basename(path);
                      const idx = base.lastIndexOf('.');
                      return idx !== -1 ? base.substring(idx) : '';
                    };
                    export default { join, resolve, normalize, dirname, basename, extname };
                  `;
                } else if (args.path === 'fs') {
                  contents = `
                    export const readFileSync = () => '';
                    export const writeFileSync = () => {};
                    export const existsSync = () => false;
                    export const mkdirSync = () => {};
                    export default { readFileSync, writeFileSync, existsSync, mkdirSync };
                  `;
                } else if (args.path === 'assert') {
                  contents = `
                    export const ok = () => {};
                    export const equal = () => {};
                    export const deepEqual = () => {};
                    export default { ok, equal, deepEqual };
                  `;
                }
                return { contents, loader: 'js' };
              });
            }
          }
        ]
      }
    },
    preview: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
    }
  };
});
