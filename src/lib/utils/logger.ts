/**
 * نظام Logging محسّن مع دعم Production Mode
 * يُقلل من console.logs في production بشكل كبير
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enableInProduction?: boolean;
  minLevel?: LogLevel;
}

class Logger {
  private enabled: boolean;
  private minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    // في production: فقط errors ما لم يُحدد خلاف ذلك
    this.enabled = IS_DEVELOPMENT || options.enableInProduction || false;
    this.minLevel = options.minLevel || (IS_PRODUCTION ? 'error' : 'debug');
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled && level !== 'error') {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  // Helper للـ performance logging (فقط في development)
  time(label: string): void {
    if (IS_DEVELOPMENT) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (IS_DEVELOPMENT) {
      console.timeEnd(label);
    }
  }
}

// Instance رئيسية
export const logger = new Logger();

// Specialized loggers لمختلف الأقسام
export const authLog = (...args: any[]) => {
  if (IS_DEVELOPMENT) {
    logger.debug('🔐 [Auth]', ...args);
  }
};

export const dbLog = (...args: any[]) => {
  if (IS_DEVELOPMENT) {
    logger.debug('💾 [DB]', ...args);
  }
};

export const apiLog = (...args: any[]) => {
  if (IS_DEVELOPMENT) {
    logger.debug('🌐 [API]', ...args);
  }
};

export const perfLog = (...args: any[]) => {
  if (IS_DEVELOPMENT) {
    logger.debug('⚡ [Perf]', ...args);
  }
};

export const syncLog = (...args: any[]) => {
  if (IS_DEVELOPMENT) {
    logger.debug('🔄 [Sync]', ...args);
  }
};

// Helper function للـ conditional logging
export function devLog(...args: any[]): void {
  if (IS_DEVELOPMENT) {
    console.log(...args);
  }
}

// Error logging دائماً يعمل
export function errorLog(...args: any[]): void {
  logger.error(...args);
}

export default logger;
