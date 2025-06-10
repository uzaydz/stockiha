# 🚀 دليل تطبيق تحسينات الأداء على المتجر

## 📋 ملخص التحسينات المطلوبة

بناءً على تحليل PageSpeed Insights، إليك خطة التطبيق الشاملة:

### 🎯 **المشاكل الحرجة المكتشفة:**
- **الأداء**: 37/100 → **الهدف**: 85+/100
- **FCP**: 17.1s → **الهدف**: < 2.5s
- **LCP**: 26.1s → **الهدف**: < 4s
- **TBT**: 350ms → **الهدف**: < 200ms
- **JavaScript**: 2,144 KiB → **الهدف**: < 500 KiB

---

## 🔧 **خطوات التطبيق**

### الخطوة 1: **تحديث تكوين Vite**

#### 1.1 نسخ احتياطي من التكوين الحالي:
```bash
cp vite.config.ts vite.config.backup.ts
```

#### 1.2 دمج التحسينات مع التكوين الحالي:
```typescript
// إضافة هذه التحسينات إلى vite.config.ts الحالي

// في قسم build، أضف:
build: {
  // Target modern browsers for smaller bundles
  target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  
  // Rollup optimization
  rollupOptions: {
    output: {
      // Advanced chunking strategy
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'routing': ['react-router-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'store-components': [
          'src/components/store/LazyStoreComponents',
          'src/components/store/StoreTracking',
          'src/components/store/StoreServices'
        ],
      },
      
      // Optimized file names
      chunkFileNames: 'js/[name]-[hash].js',
      entryFileNames: 'js/[name]-[hash].js',
      assetFileNames: (assetInfo) => {
        const extType = assetInfo.name?.split('.').pop() || '';
        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
          return `img/[name]-[hash][extname]`;
        }
        if (/css/i.test(extType)) {
          return `css/[name]-[hash][extname]`;
        }
        return `assets/[name]-[hash][extname]`;
      },
    },
    
    // Tree shaking
    treeshake: {
      preset: 'recommended',
      manualPureFunctions: ['console.log', 'console.warn'],
    },
  },
  
  // Chunk size warning
  chunkSizeWarningLimit: 500,
  
  // CSS code splitting
  cssCodeSplit: true,
  
  // Minification
  minify: 'esbuild',
},
```

### الخطوة 2: **تطبيق StorePage المحسن**

#### 2.1 العثور على ملف StorePage الحالي:
```bash
find src -name "*StorePage*" -type f
```

#### 2.2 استبدال StorePage في الـ Routes:

<function_calls>
<invoke name="grep_search">
<parameter name="query">StorePage