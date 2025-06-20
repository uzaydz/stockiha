// Error Logger - نظام تسجيل الأخطاء والتحذيرات المتقدم
export interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  source: {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
    component?: string;
    stackTrace?: string;
  };
  context?: {
    userId?: string;
    organizationId?: string;
    route?: string;
    userAgent?: string;
    url?: string;
    sessionId?: string;
  };
  errorType?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  count?: number; // عدد مرات حدوث نفس الخطأ
  resolved?: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  lastOccurred: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
}

class ErrorLogger {
  private logs: Map<string, ErrorLog> = new Map();
  private listeners: Set<(log: ErrorLog) => void> = new Set();
  private patterns: Map<string, ErrorPattern> = new Map();
  private isInitialized: boolean = false;
  private errorCounts: Map<string, number> = new Map();
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // اعتراض console.error
    this.interceptConsoleError();
    
    // اعتراض الأخطاء غير المعالجة
    this.interceptUnhandledErrors();
    
    // اعتراض الوعود المرفوضة
    this.interceptUnhandledRejections();
    
    // اعتراض أخطاء React
    this.interceptReactErrors();
  }

  private interceptConsoleError() {
    const originalError = console.error;
    const self = this;
    
    console.error = function(...args) {
      // تسجيل الخطأ
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const source = self.getCallSource();
      
      self.logError({
        level: 'error',
        message,
        source,
        errorType: 'console.error',
        tags: ['console'],
        context: self.getCurrentContext()
      });
      
      // استدعاء console.error الأصلي
      originalError.apply(console, args);
    };
  }

  private interceptUnhandledErrors() {
    const self = this;
    
    window.addEventListener('error', (event) => {
      self.logError({
        level: 'error',
        message: event.message,
        source: {
          file: event.filename,
          line: event.lineno,
          column: event.colno,
          stackTrace: event.error?.stack
        },
        errorType: 'unhandled',
        tags: ['unhandled', 'global'],
        context: self.getCurrentContext(),
        metadata: {
          error: event.error,
          target: event.target
        }
      });
    });
  }

  private interceptUnhandledRejections() {
    const self = this;
    
    window.addEventListener('unhandledrejection', (event) => {
      let message = 'Unhandled Promise Rejection';
      let metadata: any = {};
      
      if (event.reason) {
        if (event.reason instanceof Error) {
          message = event.reason.message;
          metadata.stack = event.reason.stack;
        } else if (typeof event.reason === 'string') {
          message = event.reason;
        } else {
          message = JSON.stringify(event.reason);
          metadata.reason = event.reason;
        }
      }
      
      self.logError({
        level: 'error',
        message,
        source: {
          stackTrace: metadata.stack
        },
        errorType: 'unhandled-rejection',
        tags: ['promise', 'unhandled'],
        context: self.getCurrentContext(),
        metadata
      });
    });
  }

  private interceptReactErrors() {
    // هذا سيتم تنفيذه في React Error Boundary
    // سنضيف hook لذلك لاحقاً
  }

  private getCallSource() {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    
    // تخطي الأسطر الأولى التي تشير إلى هذا الملف
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('error-logger') && 
          !line.includes('node_modules') &&
          !line.includes('webpack')) {
        
        const match = line.match(/at\s+(?:(.+?)\s+)?\((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1] || 'anonymous',
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

  private getCurrentContext() {
    return {
      url: window.location.href,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // واجهة عامة لتسجيل الأخطاء
  logError(options: Omit<ErrorLog, 'id' | 'timestamp'>) {
    const errorKey = this.generateErrorKey(options.message, options.source.file);
    const existingCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, existingCount + 1);

    const log: ErrorLog = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      count: existingCount + 1,
      resolved: false,
      ...options
    };

    this.logs.set(log.id, log);
    this.notifyListeners(log);
    
    // تحليل الأنماط
    this.analyzePattern(log);
    
    // إرسال للخدمات الخارجية إذا لزم الأمر
    this.sendToExternalServices(log);
  }

  logWarning(message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'warning',
      message,
      source: this.getCallSource(),
      errorType: 'warning',
      tags: ['warning'],
      context: this.getCurrentContext(),
      metadata
    });
  }

  logInfo(message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'info',
      message,
      source: this.getCallSource(),
      errorType: 'info',
      tags: ['info'],
      context: this.getCurrentContext(),
      metadata
    });
  }

  logDebug(message: string, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      this.logError({
        level: 'debug',
        message,
        source: this.getCallSource(),
        errorType: 'debug',
        tags: ['debug'],
        context: this.getCurrentContext(),
        metadata
      });
    }
  }

  private generateErrorKey(message: string, file?: string): string {
    return `${message}-${file || 'unknown'}`;
  }

  private analyzePattern(log: ErrorLog) {
    const pattern = this.extractPattern(log);
    const existingPattern = this.patterns.get(pattern) || {
      pattern,
      count: 0,
      lastOccurred: 0,
      category: this.categorizeError(log),
      severity: this.calculateSeverity(log),
      suggestions: this.generateSuggestions(log)
    };

    existingPattern.count++;
    existingPattern.lastOccurred = log.timestamp;
    
    this.patterns.set(pattern, existingPattern);
  }

  private extractPattern(log: ErrorLog): string {
    // استخراج نمط من رسالة الخطأ
    let pattern = log.message;
    
    // إزالة الأرقام والقيم المتغيرة
    pattern = pattern.replace(/\d+/g, '[NUMBER]');
    pattern = pattern.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]');
    pattern = pattern.replace(/'[^']*'/g, '[STRING]');
    pattern = pattern.replace(/"[^"]*"/g, '[STRING]');
    
    return `${log.errorType}-${pattern}`;
  }

  private categorizeError(log: ErrorLog): string {
    if (log.tags?.includes('network')) return 'network';
    if (log.tags?.includes('database')) return 'database';
    if (log.tags?.includes('auth')) return 'authentication';
    if (log.tags?.includes('ui')) return 'interface';
    if (log.tags?.includes('performance')) return 'performance';
    if (log.message.toLowerCase().includes('fetch')) return 'network';
    if (log.message.toLowerCase().includes('permission')) return 'authorization';
    if (log.message.toLowerCase().includes('timeout')) return 'performance';
    return 'general';
  }

  private calculateSeverity(log: ErrorLog): 'low' | 'medium' | 'high' | 'critical' {
    if (log.level === 'error') {
      if (log.tags?.includes('unhandled') || log.tags?.includes('critical')) {
        return 'critical';
      }
      if (log.tags?.includes('auth') || log.tags?.includes('security')) {
        return 'high';
      }
      return 'medium';
    }
    
    if (log.level === 'warning') return 'medium';
    return 'low';
  }

  private generateSuggestions(log: ErrorLog): string[] {
    const suggestions: string[] = [];
    const message = log.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('تحقق من الاتصال بالإنترنت');
      suggestions.push('تأكد من صحة URL الطلب');
      suggestions.push('تحقق من إعدادات CORS');
    }
    
    if (message.includes('permission') || message.includes('forbidden')) {
      suggestions.push('تحقق من صلاحيات المستخدم');
      suggestions.push('تأكد من تسجيل الدخول بشكل صحيح');
    }
    
    if (message.includes('timeout')) {
      suggestions.push('زيادة مهلة الطلب');
      suggestions.push('تحسين أداء الخادم');
    }
    
    if (message.includes('memory')) {
      suggestions.push('تحسين استخدام الذاكرة');
      suggestions.push('إضافة garbage collection');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('تحقق من السجلات للحصول على مزيد من التفاصيل');
    }
    
    return suggestions;
  }

  private sendToExternalServices(log: ErrorLog) {
    // يمكن إرسال للخدمات مثل Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production' && log.level === 'error') {
      // مثال: Sentry.captureException(log);
    }
  }

  private notifyListeners(log: ErrorLog) {
    this.listeners.forEach(listener => listener(log));
  }

  // إدارة الأخطاء
  resolveError(logId: string, resolvedBy?: string) {
    const log = this.logs.get(logId);
    if (log) {
      log.resolved = true;
      log.resolvedAt = Date.now();
      log.resolvedBy = resolvedBy;
      this.logs.set(logId, log);
      this.notifyListeners(log);
    }
  }

  // واجهة عامة
  addListener(listener: (log: ErrorLog) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (log: ErrorLog) => void) {
    this.listeners.delete(listener);
  }

  getLogs(filter?: {
    level?: ErrorLog['level'];
    resolved?: boolean;
    since?: number;
    limit?: number;
  }): ErrorLog[] {
    let logs = Array.from(this.logs.values());
    
    if (filter) {
      if (filter.level) {
        logs = logs.filter(log => log.level === filter.level);
      }
      
      if (filter.resolved !== undefined) {
        logs = logs.filter(log => log.resolved === filter.resolved);
      }
      
      if (filter.since) {
        logs = logs.filter(log => log.timestamp >= filter.since);
      }
      
      if (filter.limit) {
        logs = logs.slice(0, filter.limit);
      }
    }
    
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  getPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count);
  }

  getErrorStats() {
    const logs = this.getLogs();
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recent = logs.filter(log => log.timestamp > last24Hours);
    
    return {
      total: logs.length,
      recent: recent.length,
      byLevel: {
        error: logs.filter(log => log.level === 'error').length,
        warning: logs.filter(log => log.level === 'warning').length,
        info: logs.filter(log => log.level === 'info').length,
        debug: logs.filter(log => log.level === 'debug').length
      },
      resolved: logs.filter(log => log.resolved).length,
      unresolved: logs.filter(log => !log.resolved).length,
      patterns: this.patterns.size,
      criticalErrors: logs.filter(log => 
        log.level === 'error' && 
        (log.tags?.includes('critical') || log.tags?.includes('unhandled'))
      ).length
    };
  }

  getMostFrequentErrors(limit: number = 10): ErrorLog[] {
    const errorGroups = new Map<string, ErrorLog[]>();
    
    this.getLogs().forEach(log => {
      const key = this.generateErrorKey(log.message, log.source.file);
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(log);
    });
    
    return Array.from(errorGroups.entries())
      .map(([_, logs]) => logs[0]) // أخذ أول لوج من كل مجموعة
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);
  }

  clear() {
    this.logs.clear();
    this.patterns.clear();
    this.errorCounts.clear();
  }

  // تصدير البيانات
  export() {
    return {
      sessionId: this.sessionId,
      logs: Array.from(this.logs.values()),
      patterns: Array.from(this.patterns.values()),
      stats: this.getErrorStats(),
      timestamp: Date.now()
    };
  }
}

// إنشاء مثيل واحد
export const errorLogger = new ErrorLogger();

// React Hook لتسجيل أخطاء المكونات
export function useErrorLogging() {
  const logError = (error: Error, errorInfo?: any) => {
    errorLogger.logError({
      level: 'error',
      message: error.message,
      source: {
        stackTrace: error.stack,
        component: errorInfo?.componentStack
      },
      errorType: 'react-error',
      tags: ['react', 'component'],
      context: errorLogger['getCurrentContext'](),
      metadata: {
        errorInfo,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    });
  };

  const logWarning = (message: string, metadata?: any) => {
    errorLogger.logWarning(message, metadata);
  };

  const logInfo = (message: string, metadata?: any) => {
    errorLogger.logInfo(message, metadata);
  };

  return { logError, logWarning, logInfo };
}

// React Error Boundary
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    errorLogger.logError({
      level: 'error',
      message: error.message,
      source: {
        stackTrace: error.stack,
        component: errorInfo.componentStack
      },
      errorType: 'react-boundary',
      tags: ['react', 'boundary', 'critical'],
      context: errorLogger['getCurrentContext'](),
      metadata: {
        errorInfo,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-red-600">
            نعتذر، حدث خطأ أثناء عرض هذا المكون. تم تسجيل الخطأ وسيتم إصلاحه قريباً.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// تصدير النوع React للاستخدام في Error Boundary
import React from 'react';