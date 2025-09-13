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
    
    // تعطيل CSP Error Handler في وضع التطوير لتجنب الضوضاء
    if (import.meta.env.DEV) {
      
      return;
    }
    
    try {
      // إضافة مستمع لأخطاء CSP
      document.addEventListener('securitypolicyviolation', this.handleCSPViolation.bind(this));
      
      // إضافة مستمع للأخطاء العامة
      window.addEventListener('error', this.handleGeneralError.bind(this));
      
      // إضافة مستمع للـ console errors
      this.interceptConsoleErrors();
      
      this.isInitialized = true;
      
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

    // تجاهل انتهاكات vendor scripts المعروفة (طبيعية ومتوقعة)
    if (violation.sourceFile.includes('vendor-') || 
        violation.blockedURI.includes('vendor-') ||
        violation.sourceFile.includes('assets/') && violation.sourceFile.includes('-')) {
      
      // لا تسجل هذه الانتهاكات - هي طبيعية من vendor chunks
      return;
    }

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
        
      }
      
      // استدعاء الدالة الأصلية
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      // فحص التحذيرات المتعلقة بـ CSP
      const message = args.join(' ').toLowerCase();
      if (message.includes('content security policy') || message.includes('csp')) {
        // تجاهل تحذيرات vendor scripts المعروفة
        const messageStr = args.join(' ');
        if (messageStr.includes('vendor-supabase') || 
            messageStr.includes('vendor-query') || 
            messageStr.includes('vendor-react') ||
            messageStr.includes('vendor-ui')) {
          // هذه تحذيرات طبيعية من vendor scripts - لا تظهرها
          return;
        }
        
        
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
    // تجاهل انتهاكات eval من مكتبات Forms الضرورية
    if (violation.blockedURI === 'eval') {
      const isFormsRelated = violation.sourceFile && (
        violation.sourceFile.includes('vendor-forms') ||
        violation.sourceFile.includes('react-hook-form') ||
        violation.sourceFile.includes('zod')
      );
      
      if (isFormsRelated) {
        console.warn('⚠️ CSP: eval usage detected in forms library - this is expected behavior');
        return; // لا تحاول إصلاح انتهاكات eval من مكتبات Forms
      }
    }

    // معالجة خاصة لـ Facebook Pixel
    if (violation.blockedURI.includes('connect.facebook.net') || violation.blockedURI.includes('fbevents.js')) {
      console.warn('⚠️ CSP: Facebook Pixel blocked - this may be due to CSP policy. Check script-src-elem directive.');
      
      // إرسال event مخصص للتطبيق ليتعامل مع الحالة
      window.dispatchEvent(new CustomEvent('bazaar:facebook-pixel-blocked', {
        detail: { violation, fallbackSuggested: true }
      }));
      return;
    }

    // إزالة السكريبتات المحظورة (غير المرتبطة بـ Forms)
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && script.src.includes(violation.blockedURI) && !script.src.includes('vendor-forms')) {
        
        script.remove();
      }
    });

    // إزالة السكريبتات inline المحظورة (غير المرتبطة بـ Forms)
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach(script => {
      if (script.textContent && script.textContent.includes('eval(') && !script.textContent.includes('react-hook-form')) {
        
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
        
        style.remove();
      }
    });

    // إزالة الأنماط inline المحظورة
    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(style => {
      if (style.textContent && style.textContent.includes('@import')) {
        
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
