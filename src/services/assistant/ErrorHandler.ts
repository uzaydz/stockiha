/**
 * نظام معالجة الأخطاء الذكي لـ SIRA
 * يوفر تصنيف وترجمة ومعالجة متقدمة للأخطاء
 *
 * @version 1.0.0
 */

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SYNC_FAILED = 'sync_failed',
  PERMISSION_DENIED = 'permission_denied',
  TIMEOUT = 'timeout',
  CONFLICT = 'conflict',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ClassifiedError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError: any;
  timestamp: Date;
  retryable: boolean;
  suggestedAction?: string;
}

/**
 * تصنيف الخطأ وتحديد نوعه
 */
function classifyError(error: any): ErrorType {
  const errorString = String(error?.message || error || '').toLowerCase();
  const errorName = error?.name?.toLowerCase() || '';

  // Network errors
  if (
    errorName === 'networkerror' ||
    errorString.includes('network') ||
    errorString.includes('fetch failed') ||
    errorString.includes('internet') ||
    errorString.includes('connection')
  ) {
    return ErrorType.NETWORK;
  }

  // Timeout errors
  if (
    errorName === 'timeouterror' ||
    errorString.includes('timeout') ||
    errorString.includes('timed out')
  ) {
    return ErrorType.TIMEOUT;
  }

  // Permission errors
  if (
    errorName === 'notallowederror' ||
    errorName === 'permissiondeniederror' ||
    errorString.includes('permission') ||
    errorString.includes('unauthorized') ||
    errorString.includes('403')
  ) {
    return ErrorType.PERMISSION_DENIED;
  }

  // Quota errors
  if (
    errorName === 'quotaexceedederror' ||
    errorString.includes('quota') ||
    errorString.includes('storage full') ||
    errorString.includes('disk space')
  ) {
    return ErrorType.QUOTA_EXCEEDED;
  }

  // Not found errors
  if (
    errorString.includes('not found') ||
    errorString.includes('لم يتم العثور') ||
    errorString.includes('does not exist') ||
    errorString.includes('404')
  ) {
    return ErrorType.NOT_FOUND;
  }

  // Validation errors
  if (
    errorName === 'validationerror' ||
    errorString.includes('invalid') ||
    errorString.includes('validation') ||
    errorString.includes('غير صحيح') ||
    errorString.includes('400')
  ) {
    return ErrorType.VALIDATION;
  }

  // Sync errors
  if (
    errorString.includes('sync') ||
    errorString.includes('مزامنة') ||
    errorString.includes('conflict') ||
    errorString.includes('409')
  ) {
    return ErrorType.SYNC_FAILED;
  }

  // Conflict errors
  if (
    errorString.includes('conflict') ||
    errorString.includes('already exists') ||
    errorString.includes('duplicate')
  ) {
    return ErrorType.CONFLICT;
  }

  return ErrorType.UNKNOWN;
}

/**
 * تحديد مستوى خطورة الخطأ
 */
function determineSeverity(type: ErrorType): ErrorSeverity {
  switch (type) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return ErrorSeverity.MEDIUM;

    case ErrorType.NOT_FOUND:
    case ErrorType.VALIDATION:
      return ErrorSeverity.LOW;

    case ErrorType.QUOTA_EXCEEDED:
    case ErrorType.PERMISSION_DENIED:
      return ErrorSeverity.HIGH;

    case ErrorType.SYNC_FAILED:
    case ErrorType.CONFLICT:
      return ErrorSeverity.MEDIUM;

    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * توليد رسالة خطأ واضحة للمستخدم
 */
function getUserMessage(type: ErrorType, originalMessage?: string): string {
  switch (type) {
    case ErrorType.NETWORK:
      return '⚠️ فشل الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';

    case ErrorType.TIMEOUT:
      return '⏱️ انتهت مهلة العملية. يرجى المحاولة مرة أخرى.';

    case ErrorType.PERMISSION_DENIED:
      return '🔒 لا توجد لديك صلاحية لتنفيذ هذه العملية.';

    case ErrorType.QUOTA_EXCEEDED:
      return '💾 مساحة التخزين ممتلئة. يرجى حذف بعض البيانات القديمة.';

    case ErrorType.NOT_FOUND:
      return '🔍 لم يتم العثور على البيانات المطلوبة. تحقق من معلومات البحث.';

    case ErrorType.VALIDATION:
      const details = originalMessage ? `: ${originalMessage}` : '';
      return `❌ البيانات المدخلة غير صحيحة${details}`;

    case ErrorType.SYNC_FAILED:
      return '🔄 فشلت المزامنة مع الخادم. ستتم المحاولة لاحقاً.';

    case ErrorType.CONFLICT:
      return '⚠️ تعارض في البيانات. تم التعديل من جهاز آخر.';

    default:
      return '⚠️ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }
}

/**
 * تحديد إمكانية إعادة المحاولة
 */
function isRetryable(type: ErrorType): boolean {
  switch (type) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.SYNC_FAILED:
      return true;

    case ErrorType.VALIDATION:
    case ErrorType.NOT_FOUND:
    case ErrorType.PERMISSION_DENIED:
    case ErrorType.QUOTA_EXCEEDED:
    case ErrorType.CONFLICT:
      return false;

    default:
      return true; // نحاول في الحالات المجهولة
  }
}

/**
 * اقتراح إجراء للمستخدم
 */
function getSuggestedAction(type: ErrorType): string | undefined {
  switch (type) {
    case ErrorType.NETWORK:
      return 'تحقق من اتصالك بالإنترنت وأعد المحاولة';

    case ErrorType.QUOTA_EXCEEDED:
      return 'احذف بعض البيانات القديمة أو قم بتصدير البيانات لتحرير مساحة';

    case ErrorType.PERMISSION_DENIED:
      return 'اتصل بمدير النظام للحصول على الصلاحيات المناسبة';

    case ErrorType.NOT_FOUND:
      return 'تحقق من معلومات البحث أو حاول استخدام كلمات مختلفة';

    case ErrorType.VALIDATION:
      return 'تحقق من البيانات المدخلة وتأكد من صحتها';

    case ErrorType.SYNC_FAILED:
      return 'لا تقلق، سيتم حفظ البيانات محلياً وستتم المزامنة لاحقاً';

    default:
      return undefined;
  }
}

/**
 * معالج الأخطاء الرئيسي
 */
export class ErrorHandler {
  private static errorLog: ClassifiedError[] = [];
  private static readonly MAX_LOG_SIZE = 100;

  /**
   * معالجة الخطأ وتصنيفه
   */
  static handle(error: any): ClassifiedError {
    const type = classifyError(error);
    const severity = determineSeverity(type);
    const userMessage = getUserMessage(type, error?.message);
    const retryable = isRetryable(type);
    const suggestedAction = getSuggestedAction(type);

    const classified: ClassifiedError = {
      type,
      severity,
      message: String(error?.message || error || 'Unknown error'),
      userMessage,
      originalError: error,
      timestamp: new Date(),
      retryable,
      suggestedAction
    };

    // حفظ في السجل
    this.logError(classified);

    // طباعة في Console للتطوير
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', {
        type,
        severity,
        message: classified.message,
        userMessage,
        timestamp: classified.timestamp.toISOString()
      });
    }

    return classified;
  }

  /**
   * حفظ الخطأ في السجل
   */
  private static logError(error: ClassifiedError): void {
    this.errorLog.unshift(error);

    // الحفاظ على حجم السجل
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }

    // حفظ في localStorage للتحليل اللاحق
    try {
      const recentErrors = this.errorLog.slice(0, 20).map(e => ({
        type: e.type,
        severity: e.severity,
        message: e.message,
        timestamp: e.timestamp.toISOString()
      }));
      localStorage.setItem('sira_error_log', JSON.stringify(recentErrors));
    } catch {
      // تجاهل أخطاء التخزين
    }
  }

  /**
   * الحصول على سجل الأخطاء
   */
  static getErrorLog(): ClassifiedError[] {
    return [...this.errorLog];
  }

  /**
   * مسح سجل الأخطاء
   */
  static clearLog(): void {
    this.errorLog = [];
    try {
      localStorage.removeItem('sira_error_log');
    } catch {
      // تجاهل
    }
  }

  /**
   * إعادة محاولة العملية مع backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const classified = this.handle(error);

        // لا نعيد المحاولة إذا كان الخطأ غير قابل للإعادة
        if (!classified.retryable) {
          throw error;
        }

        // آخر محاولة
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.log(`[ErrorHandler] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      }
    }

    throw lastError;
  }

  /**
   * معالجة أخطاء متعددة
   */
  static handleMultiple(errors: any[]): ClassifiedError[] {
    return errors.map(error => this.handle(error));
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  static getStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: ClassifiedError[];
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const error of this.errorLog) {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    }

    return {
      total: this.errorLog.length,
      byType: byType as Record<ErrorType, number>,
      bySeverity: bySeverity as Record<ErrorSeverity, number>,
      recentErrors: this.errorLog.slice(0, 10)
    };
  }
}

/**
 * Helper function لمعالجة سريعة
 */
export function handleError(error: any): string {
  const classified = ErrorHandler.handle(error);
  return classified.userMessage;
}

/**
 * Helper function للحصول على رسالة مفصلة
 */
export function getDetailedErrorMessage(error: any): {
  message: string;
  action?: string;
} {
  const classified = ErrorHandler.handle(error);
  return {
    message: classified.userMessage,
    action: classified.suggestedAction
  };
}
