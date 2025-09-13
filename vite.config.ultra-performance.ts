import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import million from 'million/compiler';

// 🚀 Ultra Performance Configuration for Production
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    
    plugins: [
      // Million.js للتحسين الفائق
      million.vite({ 
        auto: {
          threshold: 0.05, // تقليل threshold للمزيد من التحسين
          skip: ['svg', 'path', 'circle'] // تجاهل SVG elements
        }
      }),
      
      react({
        jsxImportSource: 'react',
        plugins: [
          // تحسين React للإنتاج
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }),

      // Bundle Analysis
      isProd && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      }),

      // Ultra Compression
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false,
        threshold: 1024, // ضغط الملفات الأكبر من 1KB
        compressionOptions: { 
          level: 11, // أقصى ضغط Brotli
        }
      }),
      
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false,
        threshold: 1024,
        compressionOptions: { 
          level: 9, // أقصى ضغط Gzip
        }
      })
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'lodash': 'lodash-es', // استخدام ES modules دائماً
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      mainFields: ['browser', 'module', 'main'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false, // إزالة source maps في الإنتاج
      target: 'es2022', // أحدث ES للمتصفحات الحديثة
      minify: 'esbuild', // esbuild أسرع بكثير من terser
      
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        
        output: {
          format: 'esm',
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];

            // تنظيم الأصول في مجلدات
            if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(assetInfo.name)) {
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
          
          // تقسيم الحزم المحسن للغاية
          manualChunks: (id) => {
            // Use strict path-based matching to avoid over-grouping
            const is = (re: RegExp) => re.test(id);

            // React core only
            if (is(/[\\/]node_modules[\\/]react[\\/]/) || is(/[\\/]node_modules[\\/]react-dom[\\/]/)) {
              return 'react-core';
            }

            // Router libs
            if (is(/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/) || is(/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/)) {
              return 'router';
            }

            // Supabase SDK
            if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) {
              return 'supabase';
            }

            // UI libraries (Radix, icons)
            if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/) || is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'ui-lib';
            }

            // Charts — match specific packages only
            if (is(/[\\/]node_modules[\\/]recharts[\\/]/) || is(/[\\/]node_modules[\\/]@nivo[\\/]/) || is(/[\\/]node_modules[\\/]chart\.js[\\/]/) || is(/[\\/]node_modules[\\/]react-chartjs-2[\\/]/)) {
              return 'charts';
            }

            // Utils
            if (is(/[\\/]node_modules[\\/]lodash(?:-es)?[\\/]/) || is(/[\\/]node_modules[\\/]date-fns[\\/]/) || is(/[\\/]node_modules[\\/]axios[\\/]/)) {
              return 'utils';
            }

            // Forms
            if (is(/[\\/]node_modules[\\/]react-hook-form[\\/]/) || is(/[\\/]node_modules[\\/]zod[\\/]/) || is(/[\\/]node_modules[\\/]@hookform[\\/]/)) {
              return 'forms';
            }

            // Everything else from node_modules
            if (is(/[\\/]node_modules[\\/]/)) {
              return 'vendor';
            }
          }
        },
        
        // تحسينات Rollup متقدمة
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false, // تحسين tree shaking
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        },
        
        external: [
          // استبعاد المكتبات الثقيلة غير المطلوبة
          'better-sqlite3',
          'sqlite3',
          'sql.js'
        ]
      },
      
      // تحسينات إضافية
      assetsInlineLimit: 4096, // تضمين الملفات الصغيرة
      chunkSizeWarningLimit: 1000, // تحذير للحزم الكبيرة
      reportCompressedSize: true, // عرض الأحجام المضغوطة
      
      // تحسين CSS
      cssCodeSplit: true,
      cssMinify: 'esbuild',
      
      // Module preload محسن
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          // تحميل الحزم الأساسية فقط
          return deps.filter(dep => 
            dep.includes('react-core') || 
            dep.includes('main')
          );
        }
      }
    },

    // تحسين التبعيات
    optimizeDeps: {
      force: false,
      
      include: [
        // الأساسيات فقط
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        'react-router-dom'
      ],
      
      exclude: [
        // استبعاد المكتبات الثقيلة
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'recharts', 'chart.js',
        '@monaco-editor/react',
        'jspdf', 'html2canvas'
      ],
      
      esbuildOptions: {
        target: 'es2022',
        keepNames: false, // تقليل الحجم
        minify: true
      }
    },

    // تحسين CSS
    css: {
      devSourcemap: false,
      modules: false,
      postcss: {
        plugins: [
          // إضافة autoprefixer و cssnano للتحسين
        ]
      }
    },

    // تحسين esbuild
    esbuild: {
      target: 'es2022',
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
      treeShaking: true
    },

    // Worker format
    worker: {
      format: 'es'
    },

    // Server config for development
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: {
        overlay: false
      }
    }
  };
});
