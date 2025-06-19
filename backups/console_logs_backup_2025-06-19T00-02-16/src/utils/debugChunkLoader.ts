// أداة تشخيص متطورة لفحص مشاكل chunks
export class ChunkDiagnostics {
  private static instance: ChunkDiagnostics;
  private loadedChunks: Set<string> = new Set();
  private failedChunks: Set<string> = new Set();
  private chunkErrors: Map<string, Error[]> = new Map();

  static getInstance(): ChunkDiagnostics {
    if (!this.instance) {
      this.instance = new ChunkDiagnostics();
    }
    return this.instance;
  }

  init() {
    this.interceptScriptLoading();
    this.interceptErrors();
    this.monitorChunkLoading();
    this.setupConsoleCommands();
  }

  private interceptScriptLoading() {
    const originalAppendChild = Element.prototype.appendChild;
    const self = this;
    
    Element.prototype.appendChild = function<T extends Node>(this: Element, node: T): T {
      if (node instanceof HTMLScriptElement && node.src) {
        const chunkName = self.extractChunkName(node.src);
        console.log(`🔄 Loading chunk: ${chunkName}`, {
          src: node.src,
          async: node.async,
          defer: node.defer,
          type: node.type
        });
        
        node.addEventListener('load', () => {
          ChunkDiagnostics.getInstance().onChunkLoaded(chunkName, node.src);
        });
        
        node.addEventListener('error', (error) => {
          ChunkDiagnostics.getInstance().onChunkError(chunkName, node.src, error);
        });
      }
      
      return originalAppendChild.call(this, node);
    };
  }

  private extractChunkName(src: string): string {
    const match = src.match(/\/([^\/]+)-[a-zA-Z0-9]+\.js$/);
    return match ? match[1] : 'unknown';
  }

  private interceptErrors() {
    const originalErrorHandler = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && message.includes('Cannot access')) {
        this.analyzeInitializationError(message, source, lineno, colno, error);
      }
      
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      if (event.reason?.message?.includes('Cannot access')) {
        this.analyzeInitializationError(event.reason.message, '', 0, 0, event.reason);
      }
    });
  }

  private analyzeInitializationError(message: string, source?: string, lineno?: number, colno?: number, error?: Error) {
    const chunkName = source ? this.extractChunkName(source) : 'unknown';
    
    console.group(`🔍 تحليل خطأ التهيئة في ${chunkName}`);
    console.error('📝 الرسالة:', message);
    console.error('📁 المصدر:', source);
    console.error('📍 السطر:', lineno, 'العمود:', colno);
    console.error('🐛 الخطأ:', error);
    
    // تحليل متقدم للخطأ
    this.analyzeChunkDependencies(chunkName);
    this.checkReactContext(chunkName);
    this.suggestFix(chunkName, message);
    
    console.groupEnd();
    
    // حفظ الخطأ للمراجعة
    if (!this.chunkErrors.has(chunkName)) {
      this.chunkErrors.set(chunkName, []);
    }
    this.chunkErrors.get(chunkName)!.push(error || new Error(message));
  }

  private analyzeChunkDependencies(chunkName: string) {
    console.log(`🔗 تحليل تبعيات ${chunkName}:`);
    
    // فحص React chunks
    if (chunkName.includes('react')) {
      console.log('⚛️ React chunk detected - checking dependencies...');
      this.checkReactDependencies();
    }
    
    // فحص Router chunks
    if (chunkName.includes('router') || chunkName.includes('routing')) {
      console.log('🛣️ Router chunk detected - checking React availability...');
      this.checkRouterDependencies();
    }
    
    // فحص Vendor chunks
    if (chunkName.includes('vendor')) {
      console.log('📦 Vendor chunk detected - checking load order...');
      this.checkVendorLoadOrder();
    }
  }

  private checkReactContext(chunkName: string) {
    console.log(`🔍 فحص React Context في ${chunkName}:`);
    
    try {
      if (typeof window !== 'undefined' && (window as any).React) {
        const React = (window as any).React;
        console.log('✅ React متوفر:', {
          version: React.version,
          createContext: typeof React.createContext,
          useContext: typeof React.useContext,
          useState: typeof React.useState,
          useEffect: typeof React.useEffect
        });
      } else {
        console.warn('❌ React غير متوفر في window');
      }
      
      // فحص React في modules
      if (typeof require !== 'undefined') {
        try {
          const React = require('react');
          console.log('✅ React متوفر في modules:', React.version);
        } catch (e) {
          console.warn('❌ فشل في تحميل React من modules:', e);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في فحص React:', error);
    }
  }

  private checkReactDependencies() {
    const reactAPIs = [
      'createContext', 'useContext', 'useState', 'useEffect', 
      'useMemo', 'useCallback', 'useRef', 'Fragment', 'createElement'
    ];
    
    reactAPIs.forEach(api => {
      try {
        const available = (window as any).React?.[api];
        console.log(`${available ? '✅' : '❌'} React.${api}:`, typeof available);
      } catch (e) {
        console.error(`❌ خطأ في فحص React.${api}:`, e);
      }
    });
  }

  private checkRouterDependencies() {
    const routerAPIs = [
      'BrowserRouter', 'Routes', 'Route', 'Link', 'useNavigate', 'useLocation'
    ];
    
    routerAPIs.forEach(api => {
      try {
        const available = (window as any).ReactRouterDOM?.[api];
        console.log(`${available ? '✅' : '❌'} ReactRouterDOM.${api}:`, typeof available);
      } catch (e) {
        console.error(`❌ خطأ في فحص ReactRouterDOM.${api}:`, e);
      }
    });
  }

  private checkVendorLoadOrder() {
    const expectedOrder = ['react-vendor', 'vendor', 'index'];
    const loadedOrder = Array.from(this.loadedChunks);
    
    console.log('📋 ترتيب التحميل المتوقع:', expectedOrder);
    console.log('📋 ترتيب التحميل الفعلي:', loadedOrder);
    
    const isCorrectOrder = expectedOrder.every((chunk, index) => {
      const actualIndex = loadedOrder.findIndex(loaded => loaded.includes(chunk));
      return actualIndex === -1 || actualIndex >= index;
    });
    
    console.log(`${isCorrectOrder ? '✅' : '❌'} ترتيب التحميل صحيح:`, isCorrectOrder);
  }

  private suggestFix(chunkName: string, message: string) {
    console.group('💡 اقتراحات الحل:');
    
    if (message.includes('Cannot access') && chunkName.includes('react')) {
      console.log('🔧 مشكلة في React vendor chunk:');
      console.log('   1. فصل React عن React Router');
      console.log('   2. استخدام external للـ React');
      console.log('   3. تحسين rollup treeshaking');
      console.log('   4. إضافة modulePreload للـ React');
    }
    
    if (chunkName.includes('router')) {
      console.log('🔧 مشكلة في Router chunk:');
      console.log('   1. التأكد من تحميل React أولاً');
      console.log('   2. استخدام dynamic imports للـ Router');
      console.log('   3. إضافة Suspense wrapper');
    }
    
    console.groupEnd();
  }

  private monitorChunkLoading() {
    // مراقبة تحميل الـ chunks
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLScriptElement && node.src) {
            const chunkName = this.extractChunkName(node.src);
            console.log(`📥 Script added to DOM: ${chunkName}`);
          }
        });
      });
    });
    
    observer.observe(document.head, { childList: true });
    observer.observe(document.body, { childList: true });
  }

  private setupConsoleCommands() {
    // إضافة أوامر console للتشخيص
    (window as any).chunkDiag = {
      status: () => this.getStatus(),
      errors: () => this.getErrors(),
      analyze: () => this.analyzeAll(),
      fix: () => this.suggestFixAll(),
      reload: () => this.reloadFailedChunks()
    };
    
    console.log('🛠️ أوامر التشخيص متوفرة:');
    console.log('   chunkDiag.status() - حالة الـ chunks');
    console.log('   chunkDiag.errors() - الأخطاء المسجلة');
    console.log('   chunkDiag.analyze() - تحليل شامل');
    console.log('   chunkDiag.fix() - اقتراحات الحل');
    console.log('   chunkDiag.reload() - إعادة تحميل الـ chunks الفاشلة');
  }

  private onChunkLoaded(chunkName: string, src: string) {
    this.loadedChunks.add(chunkName);
    console.log(`✅ Chunk loaded successfully: ${chunkName}`, src);
  }

  private onChunkError(chunkName: string, src: string, error: Event) {
    this.failedChunks.add(chunkName);
    console.error(`❌ Chunk failed to load: ${chunkName}`, src, error);
  }

  getStatus() {
    return {
      loaded: Array.from(this.loadedChunks),
      failed: Array.from(this.failedChunks),
      errors: Object.fromEntries(this.chunkErrors)
    };
  }

  getErrors() {
    return Object.fromEntries(this.chunkErrors);
  }

  analyzeAll() {
    console.group('🔍 تحليل شامل للـ Chunks');
    console.log('الـ Chunks المحملة:', Array.from(this.loadedChunks));
    console.log('الـ Chunks الفاشلة:', Array.from(this.failedChunks));
    console.log('الأخطاء:', Object.fromEntries(this.chunkErrors));
    this.checkVendorLoadOrder();
    this.checkReactDependencies();
    console.groupEnd();
  }

  suggestFixAll() {
    console.group('💡 اقتراحات الحل الشاملة');
    
    if (this.failedChunks.size > 0) {
      console.log('🔧 حل الـ Chunks الفاشلة:');
      this.failedChunks.forEach(chunk => {
        console.log(`   - إعادة تحميل ${chunk}`);
      });
    }
    
    if (this.chunkErrors.size > 0) {
      console.log('🔧 حل أخطاء التهيئة:');
      console.log('   1. فصل React dependencies');
      console.log('   2. استخدام external modules');
      console.log('   3. تحسين chunk splitting');
      console.log('   4. إضافة polyfills');
    }
    
    console.groupEnd();
  }

  reloadFailedChunks() {
    console.log('🔄 إعادة تحميل الـ Chunks الفاشلة...');
    window.location.reload();
  }
}

// تهيئة تلقائية
if (typeof window !== 'undefined') {
  const diagnostics = ChunkDiagnostics.getInstance();
  diagnostics.init();
  
  console.log('🚀 نظام تشخيص الـ Chunks مفعل!');
  console.log('استخدم chunkDiag.analyze() للتحليل الشامل');
} 