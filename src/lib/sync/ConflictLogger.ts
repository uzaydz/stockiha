/**
 * 📝 Conflict Logger - تسجيل التضاربات في قاعدة البيانات
 *
 * المهام:
 * - تسجيل كل تضارب يتم اكتشافه
 * - حفظ تفاصيل كاملة (local, server, resolved versions)
 * - توفير استعلامات للسجل
 * - إحصائيات التضاربات
 */

import { v4 as uuidv4 } from 'uuid';
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import type {
  ConflictLogEntry,
  EntityType,
  ResolutionStrategy,
  ConflictStatistics
} from './conflictTypes';

/**
 * كلاس تسجيل التضاربات
 */
export class ConflictLogger {
  /**
   * تسجيل تضارب
   */
  async log(params: {
    entityType: EntityType;
    entityId: string;
    localVersion: any;
    serverVersion: any;
    conflictFields: string[];
    severity: number;
    resolution: ResolutionStrategy;
    resolvedVersion: any;
    resolvedBy?: string;
    userId: string;
    organizationId: string;
    localTimestamp: string;
    serverTimestamp: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    // التحقق من توفر SQLite
    if (!isSQLiteAvailable()) {
      console.warn('[ConflictLogger] SQLite not available, cannot log conflict');
      return { success: false, error: 'SQLite not available' };
    }

    try {
      const now = new Date().toISOString();

      const entry: ConflictLogEntry = {
        id: uuidv4(),
        entityType: params.entityType,
        entityId: params.entityId,
        localVersion: params.localVersion,
        serverVersion: params.serverVersion,
        conflictFields: params.conflictFields,
        severity: params.severity,
        resolution: params.resolution,
        resolvedVersion: params.resolvedVersion,
        resolvedBy: params.resolvedBy,
        detectedAt: now,
        resolvedAt: now,
        userId: params.userId,
        organizationId: params.organizationId,
        localTimestamp: params.localTimestamp,
        serverTimestamp: params.serverTimestamp,
        notes: params.notes
      };

      const result = await sqliteDB.logConflict(entry);

      if (result.success) {
        console.log(
          `[ConflictLogger] ✅ Logged ${params.entityType}/${params.entityId} conflict ` +
          `(severity: ${params.severity}, resolution: ${params.resolution})`
        );
      } else {
        console.error('[ConflictLogger] ❌ Failed to log conflict:', result.error);
      }

      return result;
    } catch (error: any) {
      console.error('[ConflictLogger] Exception logging conflict:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * جلب سجل التضاربات لكيان معين
   */
  async getHistory(
    entityType: EntityType,
    entityId: string
  ): Promise<ConflictLogEntry[]> {
    if (!isSQLiteAvailable()) {
      return [];
    }

    try {
      const result = await sqliteDB.getConflictHistory(entityType, entityId);

      if (result.success) {
        return result.data || [];
      }

      console.error('[ConflictLogger] Failed to get history:', result.error);
      return [];
    } catch (error) {
      console.error('[ConflictLogger] Exception getting history:', error);
      return [];
    }
  }

  /**
   * جلب كل التضاربات لمنظمة
   */
  async getConflicts(
    organizationId: string,
    options?: {
      entityType?: string;
      resolution?: string;
      minSeverity?: number;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ conflicts: ConflictLogEntry[]; count: number }> {
    if (!isSQLiteAvailable()) {
      return { conflicts: [], count: 0 };
    }

    try {
      const result = await sqliteDB.getConflicts(organizationId, options);

      if (result.success) {
        return {
          conflicts: result.data || [],
          count: result.count || 0
        };
      }

      console.error('[ConflictLogger] Failed to get conflicts:', result.error);
      return { conflicts: [], count: 0 };
    } catch (error) {
      console.error('[ConflictLogger] Exception getting conflicts:', error);
      return { conflicts: [], count: 0 };
    }
  }

  /**
   * إحصائيات التضاربات
   */
  async getStatistics(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ConflictStatistics | null> {
    if (!isSQLiteAvailable()) {
      return null;
    }

    try {
      // افتراضيات للتواريخ
      const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 يوم
      const to = dateTo || new Date().toISOString();

      const result = await sqliteDB.getConflictStatistics(organizationId, from, to);

      if (result.success && result.data) {
        return result.data as ConflictStatistics;
      }

      console.error('[ConflictLogger] Failed to get statistics:', result.error);
      return null;
    } catch (error) {
      console.error('[ConflictLogger] Exception getting statistics:', error);
      return null;
    }
  }

  /**
   * حذف التضاربات القديمة
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    if (!isSQLiteAvailable()) {
      return 0;
    }

    try {
      const result = await sqliteDB.cleanupOldConflicts(daysToKeep);

      if (result.success) {
        const deleted = result.deleted || 0;
        console.log(`[ConflictLogger] 🧹 Cleaned up ${deleted} old conflicts`);
        return deleted;
      }

      console.error('[ConflictLogger] Failed to cleanup:', result.error);
      return 0;
    } catch (error) {
      console.error('[ConflictLogger] Exception during cleanup:', error);
      return 0;
    }
  }

  /**
   * جلب التضاربات التي تحتاج حل يدوي
   */
  async getPendingManualResolutions(
    organizationId: string
  ): Promise<ConflictLogEntry[]> {
    const { conflicts } = await this.getConflicts(organizationId, {
      resolution: 'manual',
      limit: 100
    });

    return conflicts;
  }

  /**
   * عرض إحصائيات سريعة
   */
  async getQuickStats(organizationId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byResolution: Record<string, number>;
    highSeverity: number;
  }> {
    const stats = await this.getStatistics(organizationId);

    if (!stats) {
      return {
        total: 0,
        byType: {},
        byResolution: {},
        highSeverity: 0
      };
    }

    const byType: Record<string, number> = {};
    const byResolution: Record<string, number> = {};
    let highSeverity = 0;

    for (const item of stats.byEntityAndResolution) {
      // By type
      byType[item.entityType] = (byType[item.entityType] || 0) + item.count;

      // By resolution
      byResolution[item.resolution] = (byResolution[item.resolution] || 0) + item.count;

      // High severity (>= 60)
      if (item.maxSeverity >= 60) {
        highSeverity += item.count;
      }
    }

    return {
      total: stats.summary.total || 0,
      byType,
      byResolution,
      highSeverity
    };
  }

  /**
   * تنسيق سجل تضارب للعرض
   */
  formatConflictLog(conflict: ConflictLogEntry): string {
    const lines = [
      `📋 Conflict Log [${conflict.id}]`,
      `Type: ${conflict.entityType} (${conflict.entityId})`,
      `Detected: ${new Date(conflict.detectedAt).toLocaleString()}`,
      `Resolution: ${conflict.resolution}`,
      `Severity: ${conflict.severity}/100`,
      `Fields: ${conflict.conflictFields.join(', ')}`,
    ];

    if (conflict.resolvedBy) {
      lines.push(`Resolved by: ${conflict.resolvedBy}`);
    }

    if (conflict.notes) {
      lines.push(`Notes: ${conflict.notes}`);
    }

    lines.push('---');
    lines.push('Local timestamp: ' + conflict.localTimestamp);
    lines.push('Server timestamp: ' + conflict.serverTimestamp);

    return lines.join('\n');
  }
}

// تصدير singleton
export const conflictLogger = new ConflictLogger();
