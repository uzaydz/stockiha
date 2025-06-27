// Network Interceptor - يعترض جميع طلبات الشبكة ويسجل تفاصيلها
import { queryRecorder } from '@/lib/query-recorder';

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  type: 'fetch' | 'xhr' | 'supabase';
  status?: number;
  response?: any;
  error?: any;
  duration?: number;
  size?: number;
  cached?: boolean;
  initiator?: {
    file?: string;
    line?: number;
    column?: number;
    functionName?: string;
    stackTrace?: string;
  };
  performanceMetrics?: {
    dns?: number;
    tcp?: number;
    ttfb?: number;
    download?: number;
    total?: number;
  };
}

class NetworkInterceptor {
  private requests: Map<string, NetworkRequest> = new Map();
  private listeners: Set<(request: NetworkRequest) => void> = new Set();
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private isIntercepting: boolean = false;

  constructor() {
    this.originalFetch = window.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  startIntercepting() {
    if (this.isIntercepting) return;
    this.isIntercepting = true;
    
    this.interceptFetch();
    this.interceptXHR();
  }

  stopIntercepting() {
    if (!this.isIntercepting) return;
    this.isIntercepting = false;
    
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
  }

  private interceptFetch() {
    const self = this;
    
    window.fetch = async function(...args) {
      const startTime = performance.now();
      const requestId = self.generateRequestId();
      
      // استخراج معلومات الطلب
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      const method = init?.method || 'GET';
      const headers = self.extractHeaders(init?.headers);
      const body = init?.body;
      
      // الحصول على معلومات المستدعي
      const initiator = self.getCallStackInfo();
      
      // تسجيل بداية الطلب
      const request: NetworkRequest = {
        id: requestId,
        url,
        method,
        headers,
        body: self.parseBody(body),
        timestamp: Date.now(),
        type: url.includes('supabase') ? 'supabase' : 'fetch',
        initiator
      };
      
      self.addRequest(request);
      
      try {
        // تنفيذ الطلب الأصلي
        const response = await self.originalFetch.apply(window, args);
        const endTime = performance.now();
        
        // نسخ الاستجابة لقراءتها دون التأثير على الأصلية
        const responseClone = response.clone();
        const responseData = await self.parseResponse(responseClone);
        
        // تحديث معلومات الطلب
        request.status = response.status;
        request.response = responseData;
        request.duration = endTime - startTime;
        request.size = self.calculateSize(responseData);
        request.cached = response.headers.get('x-cache') === 'HIT';
        
        // الحصول على مقاييس الأداء
        request.performanceMetrics = self.getPerformanceMetrics(url, startTime);
        
        self.updateRequest(request);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        request.error = error;
        request.duration = endTime - startTime;
        
        self.updateRequest(request);
        
        throw error;
      }
    };
  }

  private interceptXHR() {
    const self = this;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      this._requestId = self.generateRequestId();
      this._method = method;
      this._url = url;
      this._startTime = performance.now();
      
      return self.originalXHROpen.apply(this, [method, url, ...args] as any);
    };
    
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const requestId = xhr._requestId;
      const initiator = self.getCallStackInfo();
      
      // تسجيل بداية الطلب
      const request: NetworkRequest = {
        id: requestId,
        url: xhr._url,
        method: xhr._method,
        headers: {},
        body: self.parseBody(body),
        timestamp: Date.now(),
        type: 'xhr',
        initiator
      };
      
      // استخراج الهيدرز
      xhr.addEventListener('loadstart', () => {
        const headers: Record<string, string> = {};
        // لا يمكن الحصول على الهيدرز المرسلة في XHR
        request.headers = headers;
        self.addRequest(request);
      });
      
      // معالجة الاستجابة
      xhr.addEventListener('loadend', async () => {
        const endTime = performance.now();
        
        request.status = xhr.status;
        request.duration = endTime - xhr._startTime;
        
        try {
          request.response = self.parseXHRResponse(xhr);
          request.size = self.calculateSize(request.response);
        } catch (error) {
          request.error = error;
        }
        
        request.performanceMetrics = self.getPerformanceMetrics(xhr._url, xhr._startTime);
        
        self.updateRequest(request);
      });
      
      // معالجة الأخطاء
      xhr.addEventListener('error', () => {
        const endTime = performance.now();
        
        request.error = new Error('Network request failed');
        request.duration = endTime - xhr._startTime;
        
        self.updateRequest(request);
      });
      
      return self.originalXHRSend.apply(this, [body] as any);
    };
  }

  private getCallStackInfo() {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    
    // تخطي الأسطر الأولى التي تشير إلى هذا الملف
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('network-interceptor') && 
          !line.includes('node_modules') &&
          !line.includes('webpack')) {
        
        const match = line.match(/at\s+(?:(.+?)\s+)?\((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            functionName: match[1] || 'anonymous',
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
            stackTrace: stack
          };
        }
      }
    }
    
    return { stackTrace: stack };
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private extractHeaders(headers?: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (!headers) return result;
    
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else {
      Object.assign(result, headers);
    }
    
    return result;
  }

  private parseBody(body: any): any {
    if (!body) return null;
    
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    
    if (body instanceof FormData) {
      const result: Record<string, any> = {};
      body.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    
    return body;
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType.includes('text/')) {
        return await response.text();
      } else if (contentType.includes('image/')) {
        return { type: 'image', size: response.headers.get('content-length') };
      } else {
        return await response.blob();
      }
    } catch (error) {
      return { error: 'Failed to parse response', originalError: error };
    }
  }

  private parseXHRResponse(xhr: XMLHttpRequest): any {
    const contentType = xhr.getResponseHeader('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        return JSON.parse(xhr.responseText);
      } else {
        return xhr.responseText;
      }
    } catch {
      return xhr.responseText;
    }
  }

  private calculateSize(data: any): number {
    if (!data) return 0;
    
    if (typeof data === 'string') {
      return new Blob([data]).size;
    } else if (data instanceof Blob) {
      return data.size;
    } else if (typeof data === 'object') {
      return new Blob([JSON.stringify(data)]).size;
    }
    
    return 0;
  }

  private getPerformanceMetrics(url: string, startTime: number) {
    const entries = performance.getEntriesByName(url);
    const entry = entries[entries.length - 1] as PerformanceResourceTiming;
    
    if (entry && entry.startTime >= startTime - 100) {
      return {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
        total: entry.responseEnd - entry.startTime
      };
    }
    
    return undefined;
  }

  private addRequest(request: NetworkRequest) {
    this.requests.set(request.id, request);
    this.notifyListeners(request);
    
    // حفظ في queryRecorder إذا كان طلب Supabase
    if (request.type === 'supabase') {
      this.recordSupabaseQuery(request);
    }
  }

  private updateRequest(request: NetworkRequest) {
    this.requests.set(request.id, request);
    this.notifyListeners(request);
    
    // تحديث في queryRecorder إذا كان طلب Supabase
    if (request.type === 'supabase') {
      this.updateSupabaseQuery(request);
    }
  }

  private recordSupabaseQuery(request: NetworkRequest) {
    // استخراج معلومات الاستعلام من URL
    const url = new URL(request.url);
    const table = url.pathname.split('/').pop() || 'unknown';
    
    queryRecorder.recordQuery({
      id: request.id,
      method: request.method,
      table,
      query: url.search,
      timestamp: request.timestamp,
      component: request.initiator?.functionName || 'unknown',
      filePath: request.initiator?.file,
      duration: 0,
      status: 'pending'
    });
  }

  private updateSupabaseQuery(request: NetworkRequest) {
    queryRecorder.updateQuery(request.id, {
      duration: request.duration || 0,
      status: request.error ? 'error' : 'success',
      response: request.response,
      error: request.error
    });
  }

  private notifyListeners(request: NetworkRequest) {
    this.listeners.forEach(listener => listener(request));
  }

  // واجهة عامة
  addListener(listener: (request: NetworkRequest) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (request: NetworkRequest) => void) {
    this.listeners.delete(listener);
  }

  getRequests(): NetworkRequest[] {
    return Array.from(this.requests.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getRequestById(id: string): NetworkRequest | undefined {
    return this.requests.get(id);
  }

  clearRequests() {
    this.requests.clear();
  }

  getStatistics() {
    const requests = this.getRequests();
    const last5Minutes = Date.now() - 5 * 60 * 1000;
    const recentRequests = requests.filter(r => r.timestamp > last5Minutes);
    
    return {
      total: requests.length,
      recent: recentRequests.length,
      byType: {
        fetch: requests.filter(r => r.type === 'fetch').length,
        xhr: requests.filter(r => r.type === 'xhr').length,
        supabase: requests.filter(r => r.type === 'supabase').length
      },
      byStatus: {
        success: requests.filter(r => r.status && r.status >= 200 && r.status < 300).length,
        error: requests.filter(r => r.error || (r.status && r.status >= 400)).length,
        pending: requests.filter(r => !r.status && !r.error).length
      },
      averageDuration: recentRequests.length > 0 
        ? recentRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / recentRequests.length
        : 0,
      totalSize: recentRequests.reduce((sum, r) => sum + (r.size || 0), 0),
      cachedRequests: requests.filter(r => r.cached).length
    };
  }

  findDuplicateRequests(timeWindow: number = 1000): NetworkRequest[][] {
    const requests = this.getRequests();
    const duplicates: NetworkRequest[][] = [];
    const seen = new Set<string>();
    
    requests.forEach((request, index) => {
      const key = `${request.method}-${request.url}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
        // البحث عن طلبات مماثلة في نفس النافذة الزمنية
        const similar = requests.slice(index + 1).filter(r => 
          r.method === request.method &&
          r.url === request.url &&
          Math.abs(r.timestamp - request.timestamp) < timeWindow
        );
        
        if (similar.length > 0) {
          duplicates.push([request, ...similar]);
        }
      }
    });
    
    return duplicates;
  }
}

// إنشاء مثيل واحد
export const networkInterceptor = new NetworkInterceptor();

// بدء الاعتراض تلقائياً في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  networkInterceptor.startIntercepting();
}
