/**
 * 🛡️ Content Security Policy Error Handler
 * معالج أخطاء سياسة أمان المحتوى
 */

interface CSPViolation {
  documentURI: string;
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
  timestamp: number;
}

class CSPErrorHandler {
  private violations: CSPViolation[] = [];
  private isInitialized = false;

  /**
   * تهيئة معالج أخطاء CSP
   */
  init() {
    if (this.isInitialized) return;
    
    try {
      // إضافة مستمع لأخطاء CSP
      document.addEventListener('securitypolicyviolation', this.handleCSPViolation.bind(this));
      
      // إضافة مستمع للأخطاء العامة
      window.addEventListener('error', this.handleGeneralError.bind(this));
      
      // إضافة مستمع للـ console errors
      this.interceptConsoleErrors();
      
      this.isInitialized = true;
      console.log('🛡️ CSP Error Handler initialized');
    } catch (error) {
      console.warn('Failed to initialize CSP Error Handler:', error);
    }
  }

  /**
   * معالجة انتهاكات CSP
   */
  private handleCSPViolation(event: SecurityPolicyViolationEvent) {
    const violation: CSPViolation = {
      documentURI: event.documentURI || window.location.href,
      violatedDirective: event.violatedDirective || 'unknown',
      blockedURI: event.blockedURI || 'unknown',
      sourceFile: event.sourceFile || 'unknown',
      lineNumber: event.lineNumber || 0,
      columnNumber: event.columnNumber || 0,
      timestamp: Date.now()
    };

    this.violations.push(violation);
    
    // تسجيل الانتهاك
    console.error('🚨 CSP Violation detected:', violation);
    
    // إرسال event مخصص للتطبيق
    window.dispatchEvent(new CustomEvent('bazaar:csp-violation', {
      detail: violation
    }));

    // محاولة إصلاح الانتهاك تلقائياً
    this.attemptAutoFix(violation);
  }

  /**
   * معالجة الأخطاء العامة
   */
  private handleGeneralError(event: ErrorEvent) {
    const message = event.message.toLowerCase();
    
    // فحص الأخطاء المتعلقة بـ CSP
    if (message.includes('content security policy') || 
        message.includes('csp') ||
        message.includes('eval') ||
        message.includes('inline')) {
      
      const violation: CSPViolation = {
        documentURI: window.location.href,
        violatedDirective: 'script-src',
        blockedURI: event.filename || 'unknown',
        sourceFile: event.filename || 'unknown',
        lineNumber: event.lineno || 0,
        columnNumber: event.colno || 0,
        timestamp: Date.now()
      };

      this.violations.push(violation);
      console.error('🚨 CSP-related error detected:', violation);
      
      // إرسال event مخصص
      window.dispatchEvent(new CustomEvent('bazaar:csp-violation', {
        detail: violation
      }));
    }
  }

  /**
   * اعتراض أخطاء console
   */
  private interceptConsoleErrors() {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      // فحص الأخطاء المتعلقة بـ CSP
      const message = args.join(' ').toLowerCase();
      if (message.includes('content security policy') || message.includes('csp')) {
        console.log('🚨 CSP error detected in console:', args);
      }
      
      // استدعاء الدالة الأصلية
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      // فحص التحذيرات المتعلقة بـ CSP
      const message = args.join(' ').toLowerCase();
      if (message.includes('content security policy') || message.includes('csp')) {
        console.log('⚠️ CSP warning detected in console:', args);
      }
      
      // استدعاء الدالة الأصلية
      originalWarn.apply(console, args);
    };
  }

  /**
   * محاولة إصلاح الانتهاك تلقائياً
   */
  private attemptAutoFix(violation: CSPViolation) {
    try {
      // إصلاح خاص لانتهاكات script-src
      if (violation.violatedDirective === 'script-src') {
        this.fixScriptCSPViolation(violation);
      }
      
      // إصلاح خاص لانتهاكات style-src
      if (violation.violatedDirective === 'style-src') {
        this.fixStyleCSPViolation(violation);
      }
      
      // إصلاح خاص لانتهاكات img-src
      if (violation.violatedDirective === 'img-src') {
        this.fixImageCSPViolation(violation);
      }
    } catch (error) {
      console.warn('Failed to auto-fix CSP violation:', error);
    }
  }

  /**
   * إصلاح انتهاكات script-src
   */
  private fixScriptCSPViolation(violation: CSPViolation) {
    // إزالة السكريبتات المحظورة
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && script.src.includes(violation.blockedURI)) {
        console.log('🔄 Removing blocked script:', script.src);
        script.remove();
      }
    });

    // إزالة السكريبتات inline المحظورة
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach(script => {
      if (script.textContent && script.textContent.includes('eval(')) {
        console.log('🔄 Removing inline script with eval');
        script.remove();
      }
    });
  }

  /**
   * إصلاح انتهاكات style-src
   */
  private fixStyleCSPViolation(violation: CSPViolation) {
    // إزالة الأنماط المحظورة
    const styles = document.querySelectorAll('link[rel="stylesheet"]');
    styles.forEach(style => {
      if (style.href && style.href.includes(violation.blockedURI)) {
        console.log('🔄 Removing blocked stylesheet:', style.href);
        style.remove();
      }
    });

    // إزالة الأنماط inline المحظورة
    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(style => {
      if (style.textContent && style.textContent.includes('@import')) {
        console.log('🔄 Removing inline style with @import');
        style.remove();
      }
    });
  }

  /**
   * إصلاح انتهاكات img-src
   */
  private fixImageCSPViolation(violation: CSPViolation) {
    // استبدال الصور المحظورة بصورة افتراضية
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.src.includes(violation.blockedURI)) {
        console.log('🔄 Replacing blocked image:', img.src);
        img.src = '/images/placeholder.png'; // صورة افتراضية
        img.alt = 'صورة غير متاحة';
      }
    });
  }

  /**
   * الحصول على جميع الانتهاكات
   */
  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  /**
   * مسح الانتهاكات
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * الحصول على إحصائيات الانتهاكات
   */
  getViolationStats() {
    const stats = {
      total: this.violations.length,
      byDirective: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      recent: this.violations.slice(-10) // آخر 10 انتهاكات
    };

    this.violations.forEach(violation => {
      // إحصائيات حسب التوجيه
      stats.byDirective[violation.violatedDirective] = 
        (stats.byDirective[violation.violatedDirective] || 0) + 1;
      
      // إحصائيات حسب المصدر
      const source = violation.sourceFile || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    });

    return stats;
  }

  /**
   * إنشاء تقرير CSP
   */
  generateReport(): string {
    const stats = this.getViolationStats();
    
    let report = '🛡️ CSP Violation Report\n';
    report += '========================\n\n';
    
    report += `Total Violations: ${stats.total}\n\n`;
    
    report += 'By Directive:\n';
    Object.entries(stats.byDirective).forEach(([directive, count]) => {
      report += `  ${directive}: ${count}\n`;
    });
    
    report += '\nBy Source:\n';
    Object.entries(stats.bySource).forEach(([source, count]) => {
      report += `  ${source}: ${count}\n`;
    });
    
    report += '\nRecent Violations:\n';
    stats.recent.forEach((violation, index) => {
      report += `  ${index + 1}. ${violation.violatedDirective} - ${violation.blockedURI}\n`;
    });
    
    return report;
  }

  /**
   * تنظيف الموارد
   */
  destroy() {
    if (!this.isInitialized) return;
    
    try {
      document.removeEventListener('securitypolicyviolation', this.handleCSPViolation.bind(this));
      window.removeEventListener('error', this.handleGeneralError.bind(this));
      
      this.isInitialized = false;
      console.log('🛡️ CSP Error Handler destroyed');
    } catch (error) {
      console.warn('Failed to destroy CSP Error Handler:', error);
    }
  }
}

// إنشاء instance واحد
export const cspErrorHandler = new CSPErrorHandler();

// تصدير الدوال المساعدة
export const initCSPErrorHandler = () => cspErrorHandler.init();
export const getCSPViolations = () => cspErrorHandler.getViolations();
export const getCSPViolationStats = () => cspErrorHandler.getViolationStats();
export const generateCSPReport = () => cspErrorHandler.generateReport();
export const destroyCSPErrorHandler = () => cspErrorHandler.destroy();

export default cspErrorHandler;
