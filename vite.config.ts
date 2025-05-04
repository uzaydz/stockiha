import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "localhost",
      port: 8080,
      // Setup for supporting subdomains in development
      hmr: {
        host: 'localhost',
        clientPort: 8080,
      },
      // إضافة إعدادات CORS و MIME
      cors: true,
      fs: {
        strict: false,
        allow: ['..']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/javascript; charset=utf-8'
      }
    },
    base: '/',
    plugins: [
      react(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
      }),
      mode === 'development' &&
      componentTagger(),
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
      '__dirname': JSON.stringify(path.dirname(new URL(import.meta.url).pathname)),
      'process.env': process.env,
      'process.type': JSON.stringify(process.env.NODE_ENV === 'production' ? 'renderer' : ''),
      // إضافة متغيرات لدعم Electron
      'global': 'globalThis',
      // Polyfills للوحدات الضرورية
      'Buffer': ['buffer', 'Buffer'],
      'process': 'process',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: true,
      // تحسينات بناء Electron
      target: 'esnext',
      minify: isProduction,
      // التأكد من أن جميع المسارات نسبية
      rollupOptions: {
        output: {
          manualChunks: undefined,
          format: 'es',
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
        external: ['electron'],
      },
      // تجنب مشاكل تقسيم الشفرة في Electron
      commonjsOptions: {
        transformMixedEsModules: true,
      }
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
            setup(build) {
              // إعداد polyfills لوحدات Node.js
              build.onResolve({ filter: /^stream$|^http$|^url$|^crypto$|^https$|^zlib$|^util$|^events$|^path$|^fs$|^assert$/ }, args => {
                return { path: args.path, namespace: 'node-polyfills' };
              });
              
              build.onLoad({ filter: /.*/, namespace: 'node-polyfills' }, args => {
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
    }
  };
});
