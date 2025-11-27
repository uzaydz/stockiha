/**
 * خدمة سجلات التدقيق للاشتراكات
 *
 * تتبع جميع العمليات المتعلقة بالاشتراكات
 * - محاولات التفعيل
 * - التحقق من الصلاحية
 * - محاولات التلاعب
 * - الأخطاء والاستثناءات
 */

import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

// أنواع أحداث التدقيق
export type AuditEventType =
  | 'ACTIVATION_ATTEMPT'       // محاولة تفعيل
  | 'ACTIVATION_SUCCESS'       // تفعيل ناجح
  | 'ACTIVATION_FAILED'        // فشل التفعيل
  | 'VALIDATION_SUCCESS'       // التحقق ناجح
  | 'VALIDATION_FAILED'        // فشل التحقق
  | 'SUBSCRIPTION_EXPIRED'     // انتهاء الاشتراك
  | 'TAMPER_DETECTED'          // اكتشاف تلاعب
  | 'CLOCK_TAMPER'             // تلاعب بالساعة
  | 'CACHE_CLEARED'            // مسح الكاش
  | 'SYNC_SUCCESS'             // مزامنة ناجحة
  | 'SYNC_FAILED'              // فشل المزامنة
  | 'OFFLINE_ACCESS'           // وصول أوفلاين
  | 'ERROR';                   // خطأ عام

// واجهة سجل التدقيق
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type: AuditEventType;
  organization_id: string;
  user_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  synced: boolean;
}

// واجهة إحصائيات التدقيق
export interface AuditStats {
  totalEvents: number;
  tamperAttempts: number;
  activationAttempts: number;
  activationSuccesses: number;
  validationFailures: number;
  lastTamperAttempt?: string;
  lastActivation?: string;
}

class SubscriptionAuditService {
  private static instance: SubscriptionAuditService;
  private readonly TABLE_NAME = 'subscription_audit_logs';
  private readonly MAX_LOCAL_LOGS = 1000;
  private pendingLogs: AuditLogEntry[] = [];
  private isInitialized = false;

  static getInstance(): SubscriptionAuditService {
    if (!SubscriptionAuditService.instance) {
      SubscriptionAuditService.instance = new SubscriptionAuditService();
    }
    return SubscriptionAuditService.instance;
  }

  /**
   * تهيئة جدول التدقيق في SQLite
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!isSQLiteAvailable()) {
        console.log('[AuditService] SQLite not available, using memory only');
        this.isInitialized = true;
        return;
      }

      await sqliteDB.initialize(organizationId);

      // إنشاء جدول التدقيق إذا لم يكن موجوداً
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL,
          organization_id TEXT NOT NULL,
          user_id TEXT,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          device_info TEXT,
          severity TEXT NOT NULL DEFAULT 'info',
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await window.electronAPI?.db?.execute(createTableQuery, []);

      // إنشاء فهرس للبحث السريع
      await window.electronAPI?.db?.execute(
        `CREATE INDEX IF NOT EXISTS idx_audit_org_type ON ${this.TABLE_NAME} (organization_id, event_type)`,
        []
      );

      await window.electronAPI?.db?.execute(
        `CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON ${this.TABLE_NAME} (timestamp DESC)`,
        []
      );

      this.isInitialized = true;
      console.log('[AuditService] Initialized successfully');
    } catch (error) {
      console.error('[AuditService] Initialization failed:', error);
      this.isInitialized = true; // نستمر حتى لو فشل
    }
  }

  /**
   * تسجيل حدث تدقيق
   */
  async log(
    eventType: AuditEventType,
    organizationId: string,
    details: Record<string, any> = {},
    options: {
      userId?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      event_type: eventType,
      organization_id: organizationId,
      user_id: options.userId,
      details: this.sanitizeDetails(details),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      device_info: this.getDeviceInfo(),
      severity: options.severity || this.getSeverityForEvent(eventType),
      synced: false
    };

    // طباعة في الكونسول للتتبع
    this.logToConsole(entry);

    // حفظ في SQLite
    await this.saveToDatabase(entry);

    // إضافة للسجلات المعلقة للمزامنة
    this.pendingLogs.push(entry);

    // تنظيف السجلات القديمة
    await this.cleanupOldLogs(organizationId);
  }

  /**
   * تسجيل محاولة تفعيل
   */
  async logActivationAttempt(
    organizationId: string,
    activationCode: string,
    userId?: string
  ): Promise<void> {
    await this.log('ACTIVATION_ATTEMPT', organizationId, {
      code_prefix: activationCode.slice(0, 4) + '****',
      code_length: activationCode.length
    }, { userId });
  }

  /**
   * تسجيل تفعيل ناجح
   */
  async logActivationSuccess(
    organizationId: string,
    planName: string,
    daysGranted: number,
    userId?: string
  ): Promise<void> {
    await this.log('ACTIVATION_SUCCESS', organizationId, {
      plan_name: planName,
      days_granted: daysGranted
    }, { userId, severity: 'info' });
  }

  /**
   * تسجيل فشل التفعيل
   */
  async logActivationFailed(
    organizationId: string,
    reason: string,
    activationCode?: string,
    userId?: string
  ): Promise<void> {
    await this.log('ACTIVATION_FAILED', organizationId, {
      reason,
      code_prefix: activationCode ? activationCode.slice(0, 4) + '****' : undefined
    }, { userId, severity: 'warning' });
  }

  /**
   * تسجيل اكتشاف تلاعب
   */
  async logTamperDetected(
    organizationId: string,
    tamperType: 'data' | 'clock' | 'signature',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log(
      tamperType === 'clock' ? 'CLOCK_TAMPER' : 'TAMPER_DETECTED',
      organizationId,
      { tamper_type: tamperType, ...details },
      { severity: 'critical' }
    );
  }

  /**
   * تسجيل انتهاء الاشتراك
   */
  async logSubscriptionExpired(
    organizationId: string,
    expiryDate: string,
    planName?: string
  ): Promise<void> {
    await this.log('SUBSCRIPTION_EXPIRED', organizationId, {
      expiry_date: expiryDate,
      plan_name: planName
    }, { severity: 'warning' });
  }

  /**
   * الحصول على سجلات مؤسسة معينة
   */
  async getLogs(
    organizationId: string,
    options: {
      eventType?: AuditEventType;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditLogEntry[]> {
    try {
      if (!isSQLiteAvailable()) {
        return this.pendingLogs.filter(
          log => log.organization_id === organizationId
        );
      }

      let query = `SELECT * FROM ${this.TABLE_NAME} WHERE organization_id = ?`;
      const params: any[] = [organizationId];

      if (options.eventType) {
        query += ' AND event_type = ?';
        params.push(options.eventType);
      }

      if (options.fromDate) {
        query += ' AND timestamp >= ?';
        params.push(options.fromDate);
      }

      if (options.toDate) {
        query += ' AND timestamp <= ?';
        params.push(options.toDate);
      }

      query += ' ORDER BY timestamp DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }

      const result = await window.electronAPI?.db?.queryMany(query, params);

      if (result?.success && result.data) {
        return result.data.map((row: any) => ({
          ...row,
          details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
          synced: !!row.synced
        }));
      }

      return [];
    } catch (error) {
      console.error('[AuditService] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * الحصول على إحصائيات التدقيق
   */
  async getStats(organizationId: string): Promise<AuditStats> {
    try {
      const logs = await this.getLogs(organizationId, { limit: 1000 });

      const stats: AuditStats = {
        totalEvents: logs.length,
        tamperAttempts: logs.filter(l =>
          l.event_type === 'TAMPER_DETECTED' || l.event_type === 'CLOCK_TAMPER'
        ).length,
        activationAttempts: logs.filter(l => l.event_type === 'ACTIVATION_ATTEMPT').length,
        activationSuccesses: logs.filter(l => l.event_type === 'ACTIVATION_SUCCESS').length,
        validationFailures: logs.filter(l => l.event_type === 'VALIDATION_FAILED').length
      };

      const lastTamper = logs.find(l =>
        l.event_type === 'TAMPER_DETECTED' || l.event_type === 'CLOCK_TAMPER'
      );
      if (lastTamper) {
        stats.lastTamperAttempt = lastTamper.timestamp;
      }

      const lastActivation = logs.find(l => l.event_type === 'ACTIVATION_SUCCESS');
      if (lastActivation) {
        stats.lastActivation = lastActivation.timestamp;
      }

      return stats;
    } catch (error) {
      console.error('[AuditService] Failed to get stats:', error);
      return {
        totalEvents: 0,
        tamperAttempts: 0,
        activationAttempts: 0,
        activationSuccesses: 0,
        validationFailures: 0
      };
    }
  }

  /**
   * مزامنة السجلات مع السيرفر
   */
  async syncToServer(organizationId: string): Promise<boolean> {
    try {
      const unsynced = await this.getLogs(organizationId, { limit: 100 });
      const toSync = unsynced.filter(log => !log.synced);

      if (toSync.length === 0) return true;

      // TODO: إرسال السجلات إلى السيرفر عبر Supabase
      // const { error } = await supabase.from('subscription_audit_logs').insert(toSync);

      // تحديث حالة المزامنة
      for (const log of toSync) {
        await this.markAsSynced(log.id);
      }

      console.log(`[AuditService] Synced ${toSync.length} logs`);
      return true;
    } catch (error) {
      console.error('[AuditService] Sync failed:', error);
      return false;
    }
  }

  // ====== Private Methods ======

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(details)) {
      // إخفاء البيانات الحساسة
      if (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token')) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.slice(0, 200) + '...';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getSeverityForEvent(eventType: AuditEventType): 'info' | 'warning' | 'error' | 'critical' {
    switch (eventType) {
      case 'TAMPER_DETECTED':
      case 'CLOCK_TAMPER':
        return 'critical';
      case 'ACTIVATION_FAILED':
      case 'VALIDATION_FAILED':
      case 'SYNC_FAILED':
      case 'ERROR':
        return 'error';
      case 'SUBSCRIPTION_EXPIRED':
        return 'warning';
      default:
        return 'info';
    }
  }

  private getDeviceInfo(): string {
    try {
      return JSON.stringify({
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: screen.width,
        screenHeight: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } catch {
      return '{}';
    }
  }

  private logToConsole(entry: AuditLogEntry): void {
    const prefix = `[Audit:${entry.event_type}]`;
    const message = `${prefix} org=${entry.organization_id}`;

    switch (entry.severity) {
      case 'critical':
        console.error(`🚨 ${message}`, entry.details);
        break;
      case 'error':
        console.error(`❌ ${message}`, entry.details);
        break;
      case 'warning':
        console.warn(`⚠️ ${message}`, entry.details);
        break;
      default:
        console.log(`ℹ️ ${message}`, entry.details);
    }
  }

  private async saveToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      if (!isSQLiteAvailable()) return;

      await window.electronAPI?.db?.execute(
        `INSERT INTO ${this.TABLE_NAME}
         (id, timestamp, event_type, organization_id, user_id, details, ip_address, user_agent, device_info, severity, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.timestamp,
          entry.event_type,
          entry.organization_id,
          entry.user_id || null,
          JSON.stringify(entry.details),
          entry.ip_address || null,
          entry.user_agent || null,
          entry.device_info || null,
          entry.severity,
          0
        ]
      );
    } catch (error) {
      console.error('[AuditService] Failed to save to database:', error);
    }
  }

  private async markAsSynced(id: string): Promise<void> {
    try {
      if (!isSQLiteAvailable()) return;

      await window.electronAPI?.db?.execute(
        `UPDATE ${this.TABLE_NAME} SET synced = 1 WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error('[AuditService] Failed to mark as synced:', error);
    }
  }

  private async cleanupOldLogs(organizationId: string): Promise<void> {
    try {
      if (!isSQLiteAvailable()) {
        // تنظيف الذاكرة
        while (this.pendingLogs.length > this.MAX_LOCAL_LOGS) {
          this.pendingLogs.shift();
        }
        return;
      }

      // حذف السجلات الأقدم من 30 يوم
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await window.electronAPI?.db?.execute(
        `DELETE FROM ${this.TABLE_NAME} WHERE organization_id = ? AND timestamp < ? AND synced = 1`,
        [organizationId, thirtyDaysAgo.toISOString()]
      );

      // الاحتفاظ بآخر 1000 سجل فقط
      await window.electronAPI?.db?.execute(
        `DELETE FROM ${this.TABLE_NAME}
         WHERE organization_id = ? AND id NOT IN (
           SELECT id FROM ${this.TABLE_NAME}
           WHERE organization_id = ?
           ORDER BY timestamp DESC
           LIMIT ?
         )`,
        [organizationId, organizationId, this.MAX_LOCAL_LOGS]
      );
    } catch (error) {
      console.error('[AuditService] Cleanup failed:', error);
    }
  }
}

// تصدير المثيل الوحيد
export const subscriptionAudit = SubscriptionAuditService.getInstance();
