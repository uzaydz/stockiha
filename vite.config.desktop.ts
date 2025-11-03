import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import million from "million/compiler";
import Icons from 'unplugin-icons/vite';
import * as path from "path";

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './', // مسار نسبي للتطبيق المكتبي
    envPrefix: 'VITE_',

    // تسريع الخادم للتطبيق المكتبي
    server: {
      host: "localhost", // localhost فقط للتطبيق المكتبي
      port: 8080,
      strictPort: true,
      hmr: {
        host: 'localhost',
        protocol: 'ws',
        port: 8080,
        clientPort: 8080,
        overlay: false
      },
      // تسريع CORS للتطبيق المكتبي
      cors: false, // تعطيل CORS للتطبيق المكتبي
      fs: {
        strict: true,
        allow: ['.']
      }
    },
    
    plugins: [
      // React محسن للتطبيق المكتبي
      react({
        jsxImportSource: 'react'
      }),

      // Million.js محسن للأداء
      (process.env.VITE_ENABLE_MILLION === 'true' ? million.vite({
        auto: {
          threshold: 0.05, // عتبة أقل لتحسين أكبر
          skip: [
            // استثناء المزيد من المكونات الثقيلة
            'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
            'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
            'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
            'DashboardPreview', 'ChartComponent', 'SVGWrapper',
            'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger',
            // إضافة استثناءات للمكونات الثقيلة
            'DataTable', 'TableComponent', 'ComplexChart',
            'RichTextEditor', 'FileUpload', 'ImageGallery'
          ]
        },
        mode: 'react',
        server: isDev
      }) : null),

      // Icons محسن
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        autoInstall: false, // تعطيل لتسريع البناء
        defaultClass: 'icon',
        defaultStyle: 'display: inline-block; vertical-align: middle;'
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'lodash': 'lodash-es',
        'dayjs$': path.resolve(__dirname, './node_modules/dayjs/esm/index.js')
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      mainFields: ['module', 'browser', 'main'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    
    define: {
      __DESKTOP_APP__: true,
      __ELECTRON__: true,
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      'process.env': JSON.stringify({
        NODE_ENV: isDev ? 'development' : 'production'
      }),
      'import.meta.env.DEV': isDev,
      'import.meta.env.PROD': isProd,
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || 'https://stockiha.com')
    },
    
    build: {
      outDir: 'dist',
      cssMinify: isProd,
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      target: 'es2022',
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      } : undefined,
      
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          format: 'esm',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.name || 'asset';
            const info = assetName.split('.');
            const ext = info[info.length - 1];

            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetName)) {
              return `assets/images/[name]-[hash].${ext}`;
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetName)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }

            if (/\.css$/i.test(assetName)) {
              return `assets/css/[name]-[hash].${ext}`;
            }

            return `assets/[name]-[hash].${ext}`;
          },
          manualChunks: (id) => {
            const is = (re: RegExp) => re.test(id);

            // React core
            if (is(/[\\/]node_modules[\\/]react[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-dom[\\/]/) ||
                is(/[\\/]node_modules[\\/]scheduler[\\/]/)) {
              return 'react-core';
            }
            
            // Router
            if (is(/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/)) {
              return 'router';
            }

            // Supabase
            if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) {
              return 'supabase';
            }

            // UI Components
            if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/)) {
              return 'ui-radix';
            }

            // Utils
            if (is(/[\\/]node_modules[\\/]lodash(-es)?[\\/]/) || 
                is(/[\\/]node_modules[\\/]date-fns[\\/]/)) {
              return 'utils';
            }

            // Forms
            if (is(/[\\/]node_modules[\\/]react-hook-form[\\/]/) || 
                is(/[\\/]node_modules[\\/]zod[\\/]/)) {
              return 'forms';
            }

            // Charts
            if (is(/[\\/]node_modules[\\/]chart\.js[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-chartjs-2[\\/]/)) {
              return 'charts';
            }

            // Icons
            if (is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'icons';
            }

            // Animation
            if (is(/[\\/]node_modules[\\/]framer-motion[\\/]/)) {
              return 'animation';
            }

            // Remaining vendor
            if (is(/[\\/]node_modules[\\/]/)) {
              return 'vendor';
            }

            return undefined;
          }
        },
        external: [
          'electron',
          'path',
          'fs',
          'os'
        ]
      },
      
      assetsInlineLimit: 8192,
      reportCompressedSize: false,
      write: true,
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false
      },
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    
    // تحسينات هائلة للأداء في التطبيق المكتبي
    optimizeDeps: {
      force: isDev, // تفعيل في التطوير فقط
      include: [
        // المكتبات الأساسية فقط
        'react',
        'react/jsx-runtime',
        'react-dom/client',
        'react-router-dom',
        '@supabase/supabase-js',
        'clsx',
        'tailwind-merge',
        // إضافة Zustand للحالة
        'zustand',
        'axios-retry',
        'is-retry-allowed',
        'dayjs/esm/index.js'
      ],
      exclude: [
        // استثناء جميع المكتبات الثقيلة
        'lucide-react',
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'recharts', 'chart.js', 'react-chartjs-2',
        '@monaco-editor/react',
        '@tinymce/tinymce-react',
        'jspdf', 'jspdf-autotable',
        'html2canvas',
        'lodash',
        'lodash-es',
        // استثناء مكتبات إضافية ثقيلة
        'framer-motion',
        'motion',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        'react-dnd',
        'react-dnd-html5-backend',
        'date-fns',
        // استثناء مكتبات التطوير
        '@sentry/react',
        '@sentry/browser',
        '@sentry/tracing',
        '@sentry/replay'
      ],
      // تسريع عملية الكشف
      holdUntilCrawlEnd: false,
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        },
        plugins: [],
        keepNames: false, // تسريع
        minify: false,
        treeShaking: true
      }
    },
    
    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      postcss: './postcss.config.cjs'
    },
    
    esbuild: {
      target: 'es2020',
      drop: isProd ? ['debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      jsxDev: false,
      keepNames: true,
      treeShaking: true,
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd
    }
  };
});
