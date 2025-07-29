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
      if (event.reason?.message?.includes('Cannot access')) {
        this.analyzeInitializationError(event.reason.message, '', 0, 0, event.reason);
      }
    });
  }

  private analyzeInitializationError(message: string, source?: string, lineno?: number, colno?: number, error?: Error) {
    const chunkName = source ? this.extractChunkName(source) : 'unknown';

    // تحليل متقدم للخطأ
    this.analyzeChunkDependencies(chunkName);
    this.checkReactContext(chunkName);
    this.suggestFix(chunkName, message);

    // حفظ الخطأ للمراجعة
    if (!this.chunkErrors.has(chunkName)) {
      this.chunkErrors.set(chunkName, []);
    }
    this.chunkErrors.get(chunkName)!.push(error || new Error(message));
  }

  private analyzeChunkDependencies(chunkName: string) {
    
    // فحص React chunks
    if (chunkName.includes('react')) {
      this.checkReactDependencies();
    }
    
    // فحص Router chunks
    if (chunkName.includes('router') || chunkName.includes('routing')) {
      this.checkRouterDependencies();
    }
    
    // فحص Vendor chunks
    if (chunkName.includes('vendor')) {
      this.checkVendorLoadOrder();
    }
  }

  private checkReactContext(chunkName: string) {
    
    try {
      if (typeof window !== 'undefined' && (window as any).React) {
        const React = (window as any).React;
      } else {
      }
      
      // فحص React في modules
      if (typeof require !== 'undefined') {
        try {
          const React = require('react');
        } catch (e) {
        }
      }
    } catch (error) {
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
      } catch (e) {
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
      } catch (e) {
      }
    });
  }

  private checkVendorLoadOrder() {
    const expectedOrder = ['react-vendor', 'vendor', 'index'];
    const loadedOrder = Array.from(this.loadedChunks);

    const isCorrectOrder = expectedOrder.every((chunk, index) => {
      const actualIndex = loadedOrder.findIndex(loaded => loaded.includes(chunk));
      return actualIndex === -1 || actualIndex >= index;
    });
    
  }

  private suggestFix(chunkName: string, message: string) {
    
    if (message.includes('Cannot access') && chunkName.includes('react')) {
    }
    
    if (chunkName.includes('router')) {
    }
    
  }

  private monitorChunkLoading() {
    // مراقبة تحميل الـ chunks
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLScriptElement && node.src) {
            const chunkName = this.extractChunkName(node.src);
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
    
  }

  private onChunkLoaded(chunkName: string, src: string) {
    this.loadedChunks.add(chunkName);
  }

  private onChunkError(chunkName: string, src: string, error: Event) {
    this.failedChunks.add(chunkName);
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
    this.checkVendorLoadOrder();
    this.checkReactDependencies();
  }

  suggestFixAll() {
    
    if (this.failedChunks.size > 0) {
      this.failedChunks.forEach(chunk => {
      });
    }
    
    if (this.chunkErrors.size > 0) {
    }
    
  }

  reloadFailedChunks() {
    window.location.reload();
  }
}

// تهيئة تلقائية
if (typeof window !== 'undefined') {
  const diagnostics = ChunkDiagnostics.getInstance();
  diagnostics.init();
  
}
