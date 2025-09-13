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

// Enhanced Code Splitting Configuration for Ultra Performance
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    envPrefix: 'VITE_',
    
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: {
        overlay: false,
        port: 24678,
        host: "localhost",
      },
      watch: {
        usePolling: false,
        interval: 250,
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/backups/**',
          '**/.git/**',
          '**/dist_electron/**',
          '**/logs/**',
          '**/*backup*/**',
          '**/*.log',
          '**/.DS_Store',
          '**/*.tmp',
          '**/*.temp'
        ],
        depth: 99,
        followSymlinks: false,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 50
        }
      },
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Content-Length', 'X-Content-Type-Options']
      },
      fs: {
        strict: false,
        allow: ['..']
      }
    },

    plugins: [
      contentTypePlugin(),
      instagramCompatibilityPlugin(),
      isDev && securityPlugin(),
      
      million.vite({
        auto: {
          threshold: 0.1,
          skip: [
            'svg', 'circle', 'path', 'polygon', 'polyline', 'defs',
            'linearGradient', 'stop', 'pattern', 'rect', 'g', 'text',
            'ellipse', 'line', 'image', 'use', 'clipPath', 'mask',
            'DashboardPreview', 'ChartComponent', 'SVGWrapper',
            'AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger'
          ]
        },
        mode: 'react',
        server: true
      }),
      
      react({
        jsxImportSource: 'react',
      }),

      // Bundle Analysis
      isProd && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),

      // Enhanced Compression
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false,
        threshold: 512, // Lower threshold for better optimization
        compressionOptions: { 
          level: 11,
          windowBits: 22
        },
        filter: /\.(js|mjs|json|css|html|svg|txt|xml)$/i,
        verbose: false
      }),
      
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz', 
        deleteOriginFile: false,
        threshold: 512,
        compressionOptions: { 
          level: 9,
          windowBits: 15,
          memLevel: 9,
          strategy: 0,
          chunkSize: 16 * 1024
        },
        filter: /\.(js|mjs|json|css|html|txt|xml|svg|woff2?)$/i,
        verbose: false
      }),

    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'util': 'util',
        'buffer': 'buffer',
        'lodash': 'lodash-es',
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      mainFields: ['browser', 'module', 'main'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },

    define: {
      'global': 'globalThis',
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'),
      '__DEV__': false,
      '__PROD__': isProd,
      '__VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      'process.env': JSON.stringify({
        NODE_ENV: isDev ? 'development' : 'production'
      }),
      'import.meta.env.DEV': isDev,
      'import.meta.env.PROD': isProd,
    },

    build: {
      outDir: 'dist',
      cssMinify: true,
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      target: 'es2022',
      minify: isProd ? 'esbuild' as const : false,
      
      // Enhanced Build Configuration for Code Splitting
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          format: 'esm' as ModuleFormat,
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
            
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
          
          // 🚀 ENHANCED CODE SPLITTING STRATEGY
          manualChunks: (id) => {
            const is = (re: RegExp) => re.test(id);

            // 1. CORE REACT - Essential, keep small and together
            if (is(/[\\/]node_modules[\\/]react[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-dom[\\/]/) ||
                is(/[\\/]node_modules[\\/]scheduler[\\/]/)) {
              return 'vendor-react';
            }

            // 2. ROUTER - Critical path, separate chunk
            if (is(/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/) || 
                is(/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/)) {
              return 'vendor-router';
            }

            // 3. UI LIBRARIES - Group by usage pattern
            if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/)) {
              return 'vendor-radix';
            }
            
            if (is(/[\\/]node_modules[\\/]lucide-react[\\/]/)) {
              return 'vendor-icons';
            }

            // 4. CHARTS & VISUALIZATIONS - Heavy, separate chunks
            if (is(/[\\/]node_modules[\\/]@nivo[\\/]/)) {
              return 'vendor-nivo';
            }
            
            if (is(/[\\/]node_modules[\\/]recharts[\\/]/) || 
                is(/[\\/]node_modules[\\/]chart\.js[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-chartjs-2[\\/]/)) {
              return 'vendor-charts';
            }

            // 5. HEAVY EDITORS - Separate each one
            if (is(/[\\/]node_modules[\\/]@monaco-editor[\\/]/)) {
              return 'vendor-monaco';
            }
            
            if (is(/[\\/]node_modules[\\/]@tinymce[\\/]/)) {
              return 'vendor-tinymce';
            }

            // 6. PDF & IMAGE PROCESSING - Heavy utilities
            if (is(/[\\/]node_modules[\\/]jspdf[\\/]/) || 
                is(/[\\/]node_modules[\\/]jspdf-autotable[\\/]/)) {
              return 'vendor-pdf';
            }
            
            if (is(/[\\/]node_modules[\\/]html2canvas[\\/]/) || 
                is(/[\\/]node_modules[\\/]jimp[\\/]/) || 
                is(/[\\/]node_modules[\\/]potrace[\\/]/)) {
              return 'vendor-image';
            }

            // 7. DATA & QUERY - Backend communication
            if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) {
              return 'vendor-supabase';
            }
            
            if (is(/[\\/]node_modules[\\/]@tanstack[\\/]react-query/)) {
              return 'vendor-query';
            }
            
            if (is(/[\\/]node_modules[\\/]axios[\\/]/) || 
                is(/[\\/]node_modules[\\/]axios-retry[\\/]/)) {
              return 'vendor-http';
            }

            // 8. FORMS & VALIDATION
            if (is(/[\\/]node_modules[\\/]react-hook-form[\\/]/) || 
                is(/[\\/]node_modules[\\/]zod[\\/]/) || 
                is(/[\\/]node_modules[\\/]@hookform[\\/]/)) {
              return 'vendor-forms';
            }

            // 9. UTILITIES - Group common utilities
            if (is(/[\\/]node_modules[\\/]lodash(-es)?[\\/]/) || 
                is(/[\\/]node_modules[\\/]date-fns[\\/]/) || 
                is(/[\\/]node_modules[\\/]dayjs[\\/]/)) {
              return 'vendor-utils';
            }

            // 10. DRAG & DROP - Interactive features
            if (is(/[\\/]node_modules[\\/]@dnd-kit[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-dnd[\\/]/) || 
                is(/[\\/]node_modules[\\/]react-dnd-html5-backend[\\/]/)) {
              return 'vendor-dnd';
            }

            // 11. ANIMATION & MOTION
            if (is(/[\\/]node_modules[\\/]framer-motion[\\/]/) || 
                is(/[\\/]node_modules[\\/]motion[\\/]/)) {
              return 'vendor-animation';
            }

            // 12. INTERNATIONALIZATION
            if (is(/[\\/]node_modules[\\/]i18next/) || 
                is(/[\\/]node_modules[\\/]react-i18next/)) {
              return 'vendor-i18n';
            }

            // 13. MONITORING & ANALYTICS
            if (is(/[\\/]node_modules[\\/]@sentry[\\/]/)) {
              return 'vendor-monitoring';
            }

            // 14. QR CODES & BARCODES
            if (is(/[\\/]node_modules[\\/]qrcode/) || 
                is(/[\\/]node_modules[\\/]qr-code-styling/) || 
                is(/[\\/]node_modules[\\/]react-barcode/)) {
              return 'vendor-codes';
            }

            // 15. PERFORMANCE OPTIMIZATION
            if (is(/[\\/]node_modules[\\/]million[\\/]/)) {
              return 'vendor-million';
            }

            // 16. APP-SPECIFIC CHUNKS - Split by feature area
            
            // POS System Components
            if (is(/[\\/]src[\\/]pages[\\/]POS/) || 
                is(/[\\/]src[\\/]components[\\/]pos[\\/]/) ||
                is(/[\\/]src[\\/]pages[\\/]dashboard[\\/].*pos/i)) {
              return 'app-pos';
            }

            // Store Editor & Customization
            if (is(/[\\/]src[\\/]pages[\\/].*store.*editor/i) || 
                is(/[\\/]src[\\/]features[\\/]store-editor[\\/]/) ||
                is(/[\\/]src[\\/]features[\\/]visual-editor[\\/]/)) {
              return 'app-store-editor';
            }

            // Analytics & Charts Pages
            if (is(/[\\/]src[\\/]pages[\\/].*analytics/i) || 
                is(/[\\/]src[\\/]pages[\\/].*financial/i) ||
                is(/[\\/]src[\\/]components[\\/]charts[\\/]/)) {
              return 'app-analytics';
            }

            // Product Management
            if (is(/[\\/]src[\\/]pages[\\/].*product/i) || 
                is(/[\\/]src[\\/]components[\\/]products[\\/]/)) {
              return 'app-products';
            }

            // Order Management  
            if (is(/[\\/]src[\\/]pages[\\/].*order/i) || 
                is(/[\\/]src[\\/]components[\\/]orders[\\/]/)) {
              return 'app-orders';
            }

            // Customer Management
            if (is(/[\\/]src[\\/]pages[\\/].*customer/i) || 
                is(/[\\/]src[\\/]components[\\/]customers[\\/]/)) {
              return 'app-customers';
            }

            // Settings & Configuration
            if (is(/[\\/]src[\\/]pages[\\/].*settings/i) || 
                is(/[\\/]src[\\/]components[\\/]settings[\\/]/)) {
              return 'app-settings';
            }

            // Course/Education System
            if (is(/[\\/]src[\\/]pages[\\/].*course/i) || 
                is(/[\\/]src[\\/]components[\\/]courses[\\/]/)) {
              return 'app-courses';
            }

            // Remaining vendor packages - group by size
            if (is(/[\\/]node_modules[\\/]/)) {
              const packageName = id.split('node_modules/')[1]?.split('/')[0];
              
              // Large packages get their own chunks
              const largePackages = ['@emotion', '@mui', 'antd'];
              if (largePackages.some(pkg => packageName?.startsWith(pkg))) {
                return `vendor-${packageName?.replace('@', '').replace('/', '-')}`;
              }
              
              // Medium vendor chunk for remaining packages
              return 'vendor-misc';
            }

            // Default chunk for app code not caught above
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
        ],
        
        // Enhanced tree-shaking for maximum optimization
        treeshake: {
          preset: 'smallest',
          moduleSideEffects: (id) => {
            // Keep side effects only for critical modules
            return id.includes('.css') || 
                   id.includes('polyfill') || 
                   id.includes('@supabase') ||
                   id.includes('react-dom') ||
                   id.includes('million');
          },
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false,
          manualPureFunctions: [
            'React.memo', 'React.forwardRef', 'React.createContext',
            'clsx', 'cn', 'twMerge', 'console.log', 'console.warn',
            'million.block', 'million.component'
          ],
        },
      },
      
      // Enhanced asset optimization
      assetsInlineLimit: 4096, // 4KB - smaller files inline
      chunkSizeWarningLimit: 500, // Stricter chunk size warnings
      cssCodeSplit: true, // Split CSS by chunk
      
      // Enhanced module preload strategy
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          // Preload only critical chunks
          const criticalChunks = [
            'vendor-react',
            'vendor-router', 
            'vendor-radix', // Core UI
            'main'
          ];
          
          const criticalDeps = deps.filter(dep => {
            return criticalChunks.some(chunk => dep.includes(chunk)) ||
                   dep.includes('.css'); // Always preload CSS
          });

          // Sort by priority
          return criticalDeps.sort((a, b) => {
            if (a.includes('vendor-react')) return -1;
            if (b.includes('vendor-react')) return 1;
            if (a.includes('vendor-router')) return -1;
            if (b.includes('vendor-router')) return 1;
            if (a.includes('.css')) return -1;
            if (b.includes('.css')) return 1;
            return 0;
          });
        }
      },
    },

    // Enhanced dependency optimization
    optimizeDeps: {
      force: isDev,
      
      // Critical dependencies for fast dev startup
      include: [
        'react',
        'react/jsx-runtime',
        'react-dom/client',
        'react-router-dom',
        'clsx',
        'tailwind-merge',
        'util',
        'buffer',
      ],
      
      // Exclude heavy libraries from pre-bundling
      exclude: [
        // Heavy UI libraries
        'lucide-react',
        '@radix-ui/react-accordion',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-hover-card',
        '@radix-ui/react-label',
        '@radix-ui/react-menubar',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-progress',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slider',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',
        '@radix-ui/react-tooltip',
        
        // Heavy libraries that should be code-split
        '@nivo/bar', '@nivo/line', '@nivo/pie',
        'recharts', 'chart.js', 'react-chartjs-2',
        '@monaco-editor/react',
        '@tinymce/tinymce-react',
        'jspdf', 'jspdf-autotable',
        'html2canvas',
        'jimp',
        'potrace',
        'framer-motion',
        'motion',
        '@dnd-kit/core', '@dnd-kit/sortable',
        'react-dnd', 'react-dnd-html5-backend',
        '@sentry/react', '@sentry/browser',
        'i18next', 'react-i18next',
        'lodash', 'lodash-es',
        'dayjs',
        'date-fns',
      ],
      
      esbuildOptions: {
        target: 'es2022',
        supported: {
          'top-level-await': true
        },
        keepNames: true,
        minify: false,
        treeShaking: true
      }
    },

    css: {
      devSourcemap: true,
      modules: false,
      postcss: undefined
    },

    esbuild: {
      target: 'es2022',
      drop: isProd ? ['debugger'] : [],
      legalComments: 'none',
      jsx: 'automatic',
      jsxImportSource: 'react',
      jsxDev: false,
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
