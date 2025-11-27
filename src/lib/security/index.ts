/**
 * Security Module - نظام الأمان للاشتراكات
 *
 * يوفر:
 * - تشفير البيانات المحلية
 * - سجلات التدقيق
 * - التحقق من التلاعب
 * - Rate Limiting
 */

// تصدير خدمة التشفير
export {
  subscriptionCrypto,
  encryptSubscriptionData,
  decryptSubscriptionData,
  verifySubscriptionIntegrity
} from './subscriptionCrypto';

// تصدير خدمة التدقيق
export {
  subscriptionAudit,
  type AuditEventType,
  type AuditLogEntry,
  type AuditStats
} from './subscriptionAudit';

// تصدير Rate Limiter
export {
  rateLimiter,
  withRateLimit
} from './rateLimiter';
