// نظام إدارة console.log محسن للإنتاج
interface LogConfig {
  level: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'all';
  maxLogs: number;
  enableInProduction: boolean;
  persistLogs: boolean;
  groupSimilar: boolean;
  rateLimiting: boolean;
  maxLogsPerSecond: number;
}

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  args: any[];
  source?: string;
  count: number;
}

class ConsoleManager {
  private static instance: ConsoleManager;
  private config: LogConfig;
  private logs: LogEntry[] = [];
  private logCounts: Map<string, number> = new Map();
  private rateLimitMap: Map<string, { count: number; lastReset: number }> = new Map();
  private originalConsole: any = {};
  private isEnabled: boolean = true;

  private constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      maxLogs: 1000,
      enableInProduction: false,
      persistLogs: true,
      groupSimilar: true,
      rateLimiting: true,
      maxLogsPerSecond: 10
    };

    this.init();
  }

  static getInstance(): ConsoleManager {
    if (!this.instance) {
      this.instance = new ConsoleManager();
    }
    return this.instance;
  }

  private init() {
    // حفظ console الأصلي
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    // تطبيق الإعدادات
    this.applySettings();
    
    // تنظيف دوري للـ logs
    setInterval(() => this.cleanup(), 60000); // كل دقيقة
  }

  private applySettings() {
    const shouldEnable = this.config.enableInProduction || process.env.NODE_ENV !== 'production';
    
    if (!shouldEnable || !this.isEnabled) {
      // تعطيل console في الإنتاج
      this.disableConsole();
    } else {
      // تفعيل console محسن
      this.enableOptimizedConsole();
    }
  }

  private disableConsole() {
    console.log = () => {};
    console.warn = () => {};
    console.error = this.originalConsole.error; // الاحتفاظ بـ errors
    console.info = () => {};
    console.debug = () => {};
  }

  private enableOptimizedConsole() {
    console.log = this.createOptimizedLogger('log');
    console.warn = this.createOptimizedLogger('warn');
    console.error = this.createOptimizedLogger('error');
    console.info = this.createOptimizedLogger('info');
    console.debug = this.createOptimizedLogger('debug');
  }

  private createOptimizedLogger(level: string) {
    const originalMethod = this.originalConsole[level];
    
    return (...args: any[]) => {
      // فحص المستوى
      if (!this.shouldLog(level)) {
        return;
      }

      const message = this.argsToString(args);
      const source = this.getCallSource();

      // rate limiting
      if (this.config.rateLimiting && !this.checkRateLimit(message)) {
        return;
      }

      // تجميع الرسائل المتشابهة
      if (this.config.groupSimilar) {
        const existing = this.findSimilarLog(message);
        if (existing) {
          existing.count++;
          // تحديث console مع العدد
          originalMethod(`[${existing.count}x] ${message}`, ...args);
          return;
        }
      }

      // إضافة للسجل
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level,
        message,
        args,
        source,
        count: 1
      };

      this.addLog(logEntry);
      
      // طباعة في console
      originalMethod(message, ...args);
    };
  }

  private shouldLog(level: string): boolean {
    const levels = ['none', 'error', 'warn', 'info', 'debug', 'all'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    
    if (this.config.level === 'all') return true;
    if (this.config.level === 'none') return false;
    
    return logLevelIndex <= currentLevelIndex;
  }

  private checkRateLimit(message: string): boolean {
    const now = Date.now();
    const key = message.substring(0, 50); // استخدام أول 50 حرف كمفتاح
    
    const current = this.rateLimitMap.get(key) || { count: 0, lastReset: now };
    
    // إعادة تعيين العداد كل ثانية
    if (now - current.lastReset > 1000) {
      current.count = 0;
      current.lastReset = now;
    }
    
    current.count++;
    this.rateLimitMap.set(key, current);
    
    if (current.count > this.config.maxLogsPerSecond) {
      // طباعة تحذير مرة واحدة
      if (current.count === this.config.maxLogsPerSecond + 1) {
        this.originalConsole.warn(`⚠️ Rate limit exceeded for: ${key}...`);
      }
      return false;
    }
    
    return true;
  }

  private findSimilarLog(message: string): LogEntry | null {
    // البحث عن log مشابه في آخر 10 logs
    const recent = this.logs.slice(-10);
    return recent.find(log => 
      log.message === message && 
      Date.now() - log.timestamp < 5000 // خلال آخر 5 ثوان
    ) || null;
  }

  private addLog(logEntry: LogEntry) {
    this.logs.push(logEntry);
    
    // تحديد أقصى عدد logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // حفظ في localStorage إذا مطلوب
    if (this.config.persistLogs && typeof localStorage !== 'undefined') {
      try {
        const key = 'console_logs';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(logEntry);
        
        // الاحتفاظ بآخر 100 log فقط في localStorage
        const toSave = existing.slice(-100);
        localStorage.setItem(key, JSON.stringify(toSave));
      } catch (error) {
        // تجاهل أخطاء localStorage
      }
    }
  }

  private argsToString(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');
  }

  private getCallSource(): string {
    try {
      const stack = new Error().stack;
      const lines = stack?.split('\n') || [];
      
      for (let i = 3; i < lines.length; i++) { // تخطي أول 3 أسطر
        const line = lines[i];
        if (line.includes('.tsx') || line.includes('.ts')) {
          const match = line.match(/([^\/\\]+\.(tsx?)):(\d+)/);
          if (match) {
            return `${match[1]}:${match[3]}`;
          }
        }
      }
    } catch (error) {
      // تجاهل الأخطاء
    }
    return 'unknown';
  }

  private cleanup() {
    // تنظيف rate limit map
    const now = Date.now();
    for (const [key, data] of this.rateLimitMap) {
      if (now - data.lastReset > 60000) { // إزالة البيانات الأقدم من دقيقة
        this.rateLimitMap.delete(key);
      }
    }

    // تنظيف logs القديمة
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 ساعة
    this.logs = this.logs.filter(log => log.timestamp > cutoff);

  }

  // واجهة عامة
  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.applySettings();
  }

  enable() {
    this.isEnabled = true;
    this.applySettings();
  }

  disable() {
    this.isEnabled = false;
    this.disableConsole();
  }

  restoreOriginal() {
    Object.assign(console, this.originalConsole);
  }

  getLogs(level?: string, limit?: number): LogEntry[] {
    let filtered = level ? this.logs.filter(log => log.level === level) : this.logs;
    return limit ? filtered.slice(-limit) : filtered;
  }

  clearLogs() {
    this.logs = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('console_logs');
    }
  }

  getStats() {
    const now = Date.now();
    const lastHour = this.logs.filter(log => now - log.timestamp < 60 * 60 * 1000);
    
    const byLevel = lastHour.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: this.logs.length,
      logsLastHour: lastHour.length,
      byLevel,
      rateLimitEntries: this.rateLimitMap.size,
      config: this.config,
      isEnabled: this.isEnabled
    };
  }

  // دوال للتطوير
  enableDevelopmentMode() {
    this.updateConfig({
      level: 'all',
      enableInProduction: true,
      rateLimiting: false,
      groupSimilar: false
    });
  }

  enableProductionMode() {
    this.updateConfig({
      level: 'error',
      enableInProduction: false,
      rateLimiting: true,
      groupSimilar: true,
      maxLogsPerSecond: 5
    });
  }
}

// إنشاء instance واحد
const consoleManager = ConsoleManager.getInstance();

// دوال global للتحكم
if (typeof window !== 'undefined') {
  (window as any).consoleManager = {
    enable: () => consoleManager.enable(),
    disable: () => consoleManager.disable(),
    restore: () => consoleManager.restoreOriginal(),
    stats: () => consoleManager.getStats(),
    logs: (level?: string, limit?: number) => consoleManager.getLogs(level, limit),
    clear: () => consoleManager.clearLogs(),
    dev: () => consoleManager.enableDevelopmentMode(),
    prod: () => consoleManager.enableProductionMode(),
    config: (config: Partial<LogConfig>) => consoleManager.updateConfig(config)
  };

  // اختصارات للـ console
  (window as any).enableConsole = () => consoleManager.enable();
  (window as any).disableConsole = () => consoleManager.disable();
  (window as any).consoleStats = () => {
    const stats = consoleManager.getStats();
    return stats;
  };
}

import React, { useState, useEffect } from 'react';

// hook للاستخدام في React
export function useConsoleManager() {
  const [stats, setStats] = useState(consoleManager.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(consoleManager.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    enable: () => consoleManager.enable(),
    disable: () => consoleManager.disable(),
    updateConfig: (config: Partial<LogConfig>) => consoleManager.updateConfig(config),
    getLogs: (level?: string, limit?: number) => consoleManager.getLogs(level, limit),
    clearLogs: () => consoleManager.clearLogs()
  };
}

export { consoleManager, type LogConfig, type LogEntry };
export default consoleManager;
