/**
 * 🔍 Conflict Detector - كشف التضاربات بين النسخ المحلية والسيرفر
 *
 * المهام:
 * - مقارنة timestamps
 * - كشف الحقول المختلفة
 * - حساب شدة التضارب
 * - تحديد إذا كان التضارب حرج أم لا
 */

import type {
  BaseEntity,
  ConflictDetectionResult,
  DetectionConfig,
  EntityType
} from './conflictTypes';
import { CRITICAL_FIELDS, IGNORED_FIELDS } from './conflictTypes';

/**
 * كلاس كشف التضاربات
 */
export class ConflictDetector {
  /**
   * فحص وجود تضارب بين النسخة المحلية والسيرفر
   */
  detect<T extends BaseEntity>(
    local: T,
    server: T | null,
    entityType: EntityType,
    config: DetectionConfig = {}
  ): ConflictDetectionResult {
    // إذا لم يكن هناك سيرفر version، لا يوجد تضارب
    if (!server) {
      return {
        hasConflict: false,
        fields: [],
        severity: 0,
        localTimestamp: this.getTimestamp(local),
        serverTimestamp: '',
        timeDifference: 0
      };
    }

    // استخراج timestamps
    const localTs = this.parseTimestamp(this.getTimestamp(local));
    const serverTs = this.parseTimestamp(this.getTimestamp(server));
    const timeDiff = Math.abs(localTs - serverTs);

    // التحقق من threshold
    const threshold = config.timestampThreshold ?? 5000; // 5 ثوان افتراضي

    // إذا كان الفرق أقل من threshold، لا تضارب
    if (timeDiff < threshold) {
      return {
        hasConflict: false,
        fields: [],
        severity: 0,
        localTimestamp: this.getTimestamp(local),
        serverTimestamp: this.getTimestamp(server),
        timeDifference: timeDiff
      };
    }

    // مقارنة الحقول
    const conflictFields = this.compareFields(
      local,
      server,
      config.ignoreFields || IGNORED_FIELDS,
      config.ignoreNullUndefined ?? true
    );

    // إذا لم تكن هناك حقول مختلفة، لا تضارب
    if (conflictFields.length === 0) {
      return {
        hasConflict: false,
        fields: [],
        severity: 0,
        localTimestamp: this.getTimestamp(local),
        serverTimestamp: this.getTimestamp(server),
        timeDifference: timeDiff
      };
    }

    // حساب شدة التضارب
    const severity = this.calculateSeverity(
      conflictFields,
      config.criticalFields || CRITICAL_FIELDS[entityType] || [],
      timeDiff
    );

    return {
      hasConflict: true,
      fields: conflictFields,
      severity,
      localTimestamp: this.getTimestamp(local),
      serverTimestamp: this.getTimestamp(server),
      timeDifference: timeDiff
    };
  }

  /**
   * فحص الحقول الحرجة فقط
   */
  checkCriticalFields<T extends BaseEntity>(
    local: T,
    server: T,
    criticalFields: string[]
  ): boolean {
    for (const field of criticalFields) {
      const localValue = (local as any)[field];
      const serverValue = (server as any)[field];

      if (!this.areValuesEqual(localValue, serverValue, true)) {
        return true; // يوجد تضارب في حقل حرج
      }
    }

    return false; // لا يوجد تضارب في الحقول الحرجة
  }

  /**
   * حساب شدة التضارب (0-100)
   */
  calculateSeverity(
    conflictFields: string[],
    criticalFields: string[],
    timeDifference: number
  ): number {
    let severity = 0;

    // 1. عدد الحقول المختلفة (0-30 نقطة)
    const fieldsScore = Math.min(conflictFields.length * 5, 30);
    severity += fieldsScore;

    // 2. الحقول الحرجة (0-40 نقطة)
    const criticalCount = conflictFields.filter(f =>
      criticalFields.includes(f)
    ).length;
    const criticalScore = Math.min(criticalCount * 20, 40);
    severity += criticalScore;

    // 3. فرق الوقت (0-30 نقطة)
    // كلما كان الفرق أكبر، كانت الشدة أعلى
    const hoursDiff = timeDifference / (1000 * 60 * 60);
    let timeScore = 0;
    if (hoursDiff < 1) {
      timeScore = 10;
    } else if (hoursDiff < 24) {
      timeScore = 20;
    } else {
      timeScore = 30;
    }
    severity += timeScore;

    return Math.min(Math.round(severity), 100);
  }

  /**
   * مقارنة الحقول بين كيانين
   */
  private compareFields<T>(
    local: T,
    server: T,
    ignoreFields: string[],
    ignoreNullUndefined: boolean
  ): string[] {
    const conflictFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(local as any),
      ...Object.keys(server as any)
    ]);

    for (const key of allKeys) {
      // تجاهل الحقول المحددة
      if (ignoreFields.includes(key)) {
        continue;
      }

      const localValue = (local as any)[key];
      const serverValue = (server as any)[key];

      if (!this.areValuesEqual(localValue, serverValue, ignoreNullUndefined)) {
        conflictFields.push(key);
      }
    }

    return conflictFields;
  }

  /**
   * مقارنة قيمتين
   */
  private areValuesEqual(
    localValue: any,
    serverValue: any,
    ignoreNullUndefined: boolean
  ): boolean {
    // إذا كانت القيم متطابقة تماماً
    if (localValue === serverValue) {
      return true;
    }

    // تجاهل null vs undefined إذا كان مطلوب
    if (ignoreNullUndefined) {
      if ((localValue == null && serverValue == null)) {
        return true;
      }
    }

    // مقارنة الأرقام (مع tolerance صغير للـ floating point)
    if (typeof localValue === 'number' && typeof serverValue === 'number') {
      return Math.abs(localValue - serverValue) < 0.0001;
    }

    // مقارنة التواريخ
    if (this.isDateString(localValue) && this.isDateString(serverValue)) {
      const localDate = new Date(localValue).getTime();
      const serverDate = new Date(serverValue).getTime();
      return Math.abs(localDate - serverDate) < 1000; // tolerance 1 second
    }

    // مقارنة objects (deep comparison)
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      if (localValue === null || serverValue === null) {
        return localValue === serverValue;
      }
      return JSON.stringify(localValue) === JSON.stringify(serverValue);
    }

    // مقارنة arrays
    if (Array.isArray(localValue) && Array.isArray(serverValue)) {
      if (localValue.length !== serverValue.length) {
        return false;
      }
      return JSON.stringify(localValue) === JSON.stringify(serverValue);
    }

    return false;
  }

  /**
   * استخراج timestamp من كيان
   */
  private getTimestamp(entity: BaseEntity): string {
    // أولوية لـ localUpdatedAt ثم updated_at
    return (
      (entity as any).localUpdatedAt ||
      entity.updated_at ||
      entity.created_at ||
      new Date().toISOString()
    );
  }

  /**
   * تحويل timestamp إلى number
   */
  private parseTimestamp(timestamp: string | Date | number): number {
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  /**
   * فحص إذا كان string تاريخ
   */
  private isDateString(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    // ISO 8601 format
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    return isoDateRegex.test(value);
  }

  /**
   * عرض معلومات التضارب (للـ debugging)
   */
  describeConflict(
    result: ConflictDetectionResult,
    local: any,
    server: any
  ): string {
    if (!result.hasConflict) {
      return 'No conflict detected';
    }

    const lines = [
      `Conflict detected (severity: ${result.severity}/100)`,
      `Time difference: ${Math.round(result.timeDifference / 1000)}s`,
      `Conflicting fields (${result.fields.length}):`
    ];

    for (const field of result.fields) {
      const localVal = local[field];
      const serverVal = server[field];
      lines.push(
        `  - ${field}: local="${JSON.stringify(localVal)}" vs server="${JSON.stringify(serverVal)}"`
      );
    }

    return lines.join('\n');
  }
}

// تصدير singleton
export const conflictDetector = new ConflictDetector();
