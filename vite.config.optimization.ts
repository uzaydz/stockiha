import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { splitVendorChunkPlugin } from 'vite';

// =================================================================
// تكوين Vite محسن للأداء والتقسيم الذكي للحزم
// =================================================================

export default defineConfig({
  plugins: [
    react({
      // تحسين React للإنتاج
      babel: {
        plugins: [
          // إزالة PropTypes في الإنتاج
          ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    }),
    // تقسيم حزم المكتبات الخارجية
    splitVendorChunkPlugin(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // =================================================================
  // تحسينات البناء للإنتاج
  // =================================================================
  build: {
    // تحسين خيارات الإنتاج
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false, // إيقاف source maps للإنتاج
    
    // تقسيم الحزم الذكي
    rollupOptions: {
      output: {
        // تقسيم الحزم بناءً على الاستخدام
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
          
          // مكونات المتجر - تقسيم ذكي
          'store-components': [
            './src/components/store/StoreBanner',
            './src/components/store/ProductCategories',
            './src/components/store/FeaturedProducts',
            './src/components/store/CustomerTestimonials',
            './src/components/store/StoreAbout',
            './src/components/store/StoreContact',
            './src/components/store/StoreServices',
            './src/components/store/CustomizableStoreFooter'
          ],
        },
        
        // تسمية الملفات المحسنة
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') : 
            'chunk';
          
          return `assets/js/[name]-[hash].js`;
        },
        
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
      },
      
      // تحسينات الحزم الخارجية
      external: (id) => {
        // لا نريد جعل أي مكتبة خارجية في هذا المشروع
        return false;
      },
    },
    
    // حد أقصى لحجم الحزمة
    chunkSizeWarningLimit: 500, // 500KB بدلاً من الافتراضي 2MB
    
    // تحسين CSS
    cssCodeSplit: true,
    
    // ضغط الأصول
    assetsInlineLimit: 4096, // 4KB - ملفات أصغر تصبح inline
  },

  // =================================================================
  // تحسينات الخادم التطويري
  // =================================================================
  server: {
    port: 3000,
    host: true,
    
    // Pre-bundling للمكتبات الكبيرة
    hmr: {
      overlay: false, // إيقاف overlay للأخطاء لتحسين الأداء
    },
  },

  // =================================================================
  // تحسين التبعيات
  // =================================================================
  optimizeDeps: {
    include: [
      // تجميع مسبق للمكتبات الكبيرة
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
      'date-fns',
      'react-helmet-async'
    ],
    exclude: [
      // استبعاد المكتبات التي لا تحتاج تجميع مسبق
    ],
  },

  // =================================================================
  // تحسين Esbuild
  // =================================================================
  esbuild: {
    // إزالة console.log في الإنتاج
    drop: ['console', 'debugger'],
    
    // تحسين إضافي
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },

  // =================================================================
  // متغيرات البيئة
  // =================================================================
  define: {
    // تعريف متغيرات مفيدة للأداء
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },

  // =================================================================
  // تحسينات إضافية
  // =================================================================
  preview: {
    port: 3000,
    host: true,
  },

  // Cache للتطوير
  cacheDir: 'node_modules/.vite',
}); 