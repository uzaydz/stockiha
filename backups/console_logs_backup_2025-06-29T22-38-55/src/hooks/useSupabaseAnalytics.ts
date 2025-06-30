import { useState, useEffect, useCallback } from 'react';

export interface SupabaseCall {
  id: string;
  timestamp: number;
  operation: string;
  table?: string;
  duration: number;
  success: boolean;
  error?: string;
  sourceFile: string;
  sourceLine: number;
  stackTrace: string[];
  dataSize?: number;
  method: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'auth' | 'storage' | 'realtime';
  query?: any;
  response?: any;
}

export interface AnalyticsStats {
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  slowestCall: SupabaseCall | null;
  mostActiveFile: string;
  callsByMethod: Record<string, number>;
  callsByFile: Record<string, number>;
  recentCalls: SupabaseCall[];
}

class SupabaseAnalytics {
  private calls: SupabaseCall[] = [];
  private listeners: ((calls: SupabaseCall[]) => void)[] = [];
  private maxCalls = 1000;

  // إضافة methods عامة للوصول إلى الخصائص private
  public addCallDirect(call: SupabaseCall) {
    this.calls.unshift(call);
    if (this.calls.length > this.maxCalls) {
      this.calls = this.calls.slice(0, this.maxCalls);
    }
    this.notifyListeners();
  }

  public getCallsArray(): SupabaseCall[] {
    return this.calls;
  }

  public getListenersArray(): ((calls: SupabaseCall[]) => void)[] {
    return this.listeners;
  }

  public setCallsArray(newCalls: SupabaseCall[]) {
    this.calls = newCalls;
  }

  addCall(
    operation: string,
    method: SupabaseCall['method'],
    startTime: number,
    endTime: number,
    success: boolean,
    table?: string,
    error?: string,
    query?: any,
    response?: any
  ) {
    // الحصول على معلومات المصدر من stack trace محسّن
    const error_obj = new Error();
    const stack = error_obj.stack?.split('\n') || [];
    
    console.log('📍 Full stack trace:', stack); // للتشخيص
    
    // تصفية مطوّرة للعثور على المصدر الحقيقي
    const relevantStack = stack
      .filter(line => 
        (line.includes('.ts') || line.includes('.tsx') || line.includes('.js') || line.includes('.jsx')) &&
        !line.includes('useSupabaseAnalytics') &&
        !line.includes('supabase-unified') &&
        !line.includes('supabase-js') &&
        !line.includes('node_modules') &&
        !line.includes('chunk-') &&
        !line.includes('logCall') &&
        !line.includes('createTrackedClient') &&
        !line.includes('@supabase') &&
        !line.includes('addCall') &&
        !line.includes('Promise.then') &&
        !line.includes('async') &&
        !line.includes('queryBuilder.select') &&
        !line.includes('then@') &&
        !line.includes('fulfilled@')
      );

    console.log('🎯 Relevant stack:', relevantStack); // للتشخيص

    let sourceFile = 'unknown';
    let sourceLine = 0;
    
    if (relevantStack.length > 0) {
      const callerLine = relevantStack[0];
      console.log('🔍 Selected stack line:', callerLine); // للتشخيص
      
      // تحسين regex patterns
      const patterns = [
        /\(([^)]+):(\d+):\d+\)/, // Pattern: (file:line:col)
        /at ([^:]+):(\d+):\d+/, // Pattern: at file:line:col
        /([^@]+)@([^:]+):(\d+):\d+/, // Pattern: function@file:line:col
        /\/([^/:]+):(\d+):\d+/, // Pattern: /file:line:col
        /([^\/\s]+\.(?:ts|tsx|js|jsx)):(\d+):\d+/, // Pattern: filename.ext:line:col
        /([^\/\s]+\.(?:ts|tsx|js|jsx))\?[^:]*:(\d+):\d+/ // Pattern: filename.ext?query:line:col
      ];
      
      for (const pattern of patterns) {
        const match = callerLine.match(pattern);
        if (match) {
          let fullPath = match[1];
          let lineNumber = parseInt(match[2]);
          
          // في حالة التطابق مع النمط الثالث
          if (match[3]) {
            fullPath = match[2];
            lineNumber = parseInt(match[3]);
          }
          
          // استخراج اسم الملف فقط وإزالة query parameters
          sourceFile = fullPath.split('/').pop()?.split('?')[0] || fullPath;
          sourceLine = lineNumber;
          
          console.log('✅ Found source:', { sourceFile, sourceLine }); // للتشخيص
          break;
        }
      }
    }
    
    const call: SupabaseCall = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: startTime,
      operation,
      table,
      duration: endTime - startTime,
      success,
      error,
      sourceFile,
      sourceLine,
      stackTrace: relevantStack.slice(0, 5),
      method,
      query: query ? JSON.stringify(query).length > 1000 ? '[Large Query]' : query : undefined,
      response: response && success ? (JSON.stringify(response).length > 1000 ? '[Large Response]' : response) : undefined,
      dataSize: response && response.data ? JSON.stringify(response.data).length : undefined
    };

    this.calls.unshift(call);
    
    if (this.calls.length > this.maxCalls) {
      this.calls = this.calls.slice(0, this.maxCalls);
    }

    this.notifyListeners();
  }

  getCalls(): SupabaseCall[] {
    return [...this.calls];
  }

  getStats(): AnalyticsStats {
    if (this.calls.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        slowestCall: null,
        mostActiveFile: '',
        callsByMethod: {},
        callsByFile: {},
        recentCalls: []
      };
    }

    const successfulCalls = this.calls.filter(call => call.success);
    const callsByMethod: Record<string, number> = {};
    const callsByFile: Record<string, number> = {};

    this.calls.forEach(call => {
      callsByMethod[call.method] = (callsByMethod[call.method] || 0) + 1;
      callsByFile[call.sourceFile] = (callsByFile[call.sourceFile] || 0) + 1;
    });

    const mostActiveFile = Object.entries(callsByFile)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    const slowestCall = [...this.calls]
      .sort((a, b) => b.duration - a.duration)[0] || null;

    return {
      totalCalls: this.calls.length,
      successRate: (successfulCalls.length / this.calls.length) * 100,
      averageResponseTime: this.calls.reduce((sum, call) => sum + call.duration, 0) / this.calls.length,
      slowestCall,
      mostActiveFile,
      callsByMethod,
      callsByFile,
      recentCalls: this.calls.slice(0, 10)
    };
  }

  subscribe(listener: (calls: SupabaseCall[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.calls]));
  }

  clear() {
    this.calls = [];
    this.notifyListeners();
  }
}

const analytics = new SupabaseAnalytics();

export const useSupabaseAnalytics = () => {
  const [calls, setCalls] = useState<SupabaseCall[]>([]);
  const [stats, setStats] = useState<AnalyticsStats>(analytics.getStats());

  useEffect(() => {
    const unsubscribe = analytics.subscribe((newCalls) => {
      setCalls(newCalls);
      setStats(analytics.getStats());
    });

    setCalls(analytics.getCalls());
    setStats(analytics.getStats());

    return unsubscribe;
  }, []);

  const clearAnalytics = useCallback(() => {
    analytics.clear();
  }, []);

  return {
    calls,
    stats,
    clearAnalytics
  };
};

export { analytics as supabaseAnalytics };