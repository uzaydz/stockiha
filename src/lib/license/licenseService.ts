import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';

/**
 * Local Subscription Row - يتطابق مع organization_subscriptions في PowerSync
 * ✅ محدث ليتطابق مع Supabase schema
 */
export type LocalSubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_code?: string | null;
  status?: string | null;
  billing_cycle?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  trial_ends_at?: string | null;  // ✅ تم التصحيح من trial_end_date
  amount_paid?: number | null;
  currency?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  is_auto_renew?: number | boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toMs = (iso?: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

// حد أقصى لعدد محاولات التلاعب قبل الحظر
const MAX_TAMPER_ATTEMPTS = 5;
const TAMPER_LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة

// كاش لتتبع محاولات التلاعب
const tamperTracker: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();

export async function getSecureNow(organizationId?: string): Promise<{
  secureNowMs: number;
  tamperDetected: boolean;
  tamperCount: number;
  isLocked: boolean;
}> {
  const orgId = organizationId || 'default';

  try {
    // التحقق من حالة الحظر
    const tracker = tamperTracker.get(orgId);
    if (tracker?.lockedUntil && Date.now() < tracker.lockedUntil) {
      console.warn('[SecureClock] Organization is locked due to tamper attempts');
      return {
        secureNowMs: Date.now(),
        tamperDetected: true,
        tamperCount: tracker.count,
        isLocked: true
      };
    }

    const api: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (!api?.license) {
      return { secureNowMs: Date.now(), tamperDetected: false, tamperCount: 0, isLocked: false };
    }

    const res = await api.license.getSecureNow(organizationId || null);
    // ⚡ v2.0: تقليل الـ logs - فقط في حالة الخطأ أو التلاعب
    if (!res?.success || res?.tamperDetected) {
      console.log('[SecureClock] IPC get-secure-now result', res);
    }

    if (res?.success) {
      let ms = Number(res.secureNowMs || 0);
      const minMs = 946684800000; // 2000-01-01
      const maxMs = Date.now() + 365 * 24 * 60 * 60 * 1000; // سنة من الآن كحد أقصى

      // التحقق من صلاحية الوقت
      if (!Number.isFinite(ms) || ms < minMs || ms > maxMs) {
        const fallback = Date.now();
        console.warn('[SecureClock] secureNowMs implausible, clamping to deviceNow', { ms, fallback, minMs, maxMs });
        ms = fallback;
      }

      // معالجة اكتشاف التلاعب
      if (res.tamperDetected) {
        const currentTracker = tamperTracker.get(orgId) || { count: 0, lastAttempt: 0 };
        currentTracker.count = Number(res.tamperCount || currentTracker.count + 1);
        currentTracker.lastAttempt = Date.now();

        // حظر إذا تجاوز الحد
        if (currentTracker.count >= MAX_TAMPER_ATTEMPTS) {
          currentTracker.lockedUntil = Date.now() + TAMPER_LOCKOUT_DURATION;
          console.error('[SecureClock] Organization locked due to excessive tamper attempts');

          // تسجيل في سجلات التدقيق
          if (organizationId) {
            await subscriptionAudit.logTamperDetected(organizationId, 'clock', {
              tamperCount: currentTracker.count,
              lockedUntil: new Date(currentTracker.lockedUntil).toISOString()
            });
          }
        }

        tamperTracker.set(orgId, currentTracker);
      }

      return {
        secureNowMs: ms,
        tamperDetected: !!res.tamperDetected,
        tamperCount: Number(res.tamperCount || 0),
        isLocked: false
      };
    }
  } catch (error) {
    console.error('[SecureClock] Error getting secure time:', error);
  }

  return { secureNowMs: Date.now(), tamperDetected: false, tamperCount: 0, isLocked: false };
}

export async function setAnchorFromServer(organizationId: string | null | undefined, serverNowMs: number): Promise<void> {
  try {
    const api: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (!api?.license) return;
    await api.license.setAnchor(organizationId || null, Number(serverNowMs));
  } catch { }
}

async function ensureOrgDB(orgId: string): Promise<void> {
  // ⚡ PowerSync متاح دائماً ولكن يجب التأكد من جاهزيته
  try {
    if (!powerSyncService.isAvailable()) {
      await powerSyncService.initialize();
    }
  } catch (err) { 
    console.warn('[LicenseService] Failed to ensure DB ready:', err);
  }
}

export async function getLocalSubscription(orgId: string): Promise<LocalSubscriptionRow | null> {
  try {
    // ⚡ استخدام PowerSync مباشرة
    await ensureOrgDB(orgId);
    
    // ⚡ استخدام execute بدلاً من get لتجنب مشاكل النوع وتوفير استقرار أكثر
    // ✅ إصلاح: ترتيب حسب حالة الاشتراك أولاً (active > trial > غيرها) ثم end_date
    if (!powerSyncService.db) {
      console.warn('[licenseService] PowerSync DB not initialized');
      return null;
    }
    const rows = await powerSyncService.query({
      sql: `SELECT os.*, sp.name as plan_name, sp.code as plan_code
       FROM organization_subscriptions os
       LEFT JOIN subscription_plans sp ON sp.id = os.plan_id
       WHERE os.organization_id = ?
       ORDER BY
         CASE os.status
           WHEN 'active' THEN 1
           WHEN 'trial' THEN 2
           ELSE 3
         END,
         os.end_date DESC
       LIMIT 1`,
      params: [orgId]
    });
    return (rows && rows.length > 0 ? rows[0] : null) as LocalSubscriptionRow | null;
  } catch (err) {
    console.warn('[LicenseService] Failed to get local subscription:', err);
    return null;
  }
}

export function isExpired(row: LocalSubscriptionRow, secureNowMs: number): {
  expired: boolean;
  effectiveEndMs: number | null;
  daysLeft: number;
  reason: 'trial' | 'end' | 'unknown';
} {
  // ✅ استخدام trial_ends_at بدلاً من trial_end_date
  const trialMs = toMs(row.trial_ends_at);
  const endMs = toMs(row.end_date);

  let effective: number | null = null;
  let reason: 'trial' | 'end' | 'unknown' = 'unknown';

  if (trialMs && trialMs > secureNowMs) {
    effective = trialMs;
    reason = 'trial';
  } else if (endMs) {
    effective = endMs;
    reason = 'end';
  }

  if (!effective) {
    return { expired: true, effectiveEndMs: null, daysLeft: 0, reason };
  }

  const daysLeft = Math.ceil((effective - secureNowMs) / MS_PER_DAY);
  const expired = secureNowMs >= effective || daysLeft <= 0;
  return { expired, effectiveEndMs: effective, daysLeft: Math.max(0, daysLeft), reason };
}

export function toSubscriptionDataFromLocal(row: LocalSubscriptionRow, secureNowMs: number) {
  const { expired, effectiveEndMs, daysLeft, reason } = isExpired(row, secureNowMs);
  const endIso = effectiveEndMs ? new Date(effectiveEndMs).toISOString() : null;
  const planName = row.plan_name || row.plan_id || 'غير محدد';
  const planCode = row.plan_code || row.plan_id || 'unknown';
  return {
    success: true,
    status: expired ? 'expired' : (row.trial_ends_at ? 'trial' : 'active'),  // ✅ تم التصحيح
    subscription_type: row.plan_id ? 'paid' : (row.trial_ends_at ? 'trial' : 'none'),  // ✅ تم التصحيح
    subscription_id: row.id,
    plan_name: planName,
    plan_code: planCode,
    start_date: row.start_date || null,
    end_date: endIso,
    days_left: daysLeft,
    message: expired ? `الاشتراك منتهي (${reason})` : 'الاشتراك صالح'
  };
}

export async function saveLocalSubscription(orgId: string, subscriptionData: any): Promise<void> {
  // ⚡ الاشتراكات تُزامن تلقائياً من Supabase عبر PowerSync Sync Rules
  // ❌ لا نكتب محلياً عبر writeTransaction لتجنب العمليات المعلقة في Outbox
  // البيانات تأتي من السيرفر فقط (أمان الاشتراكات)
  console.log('[LicenseService] ℹ️ Subscription data managed by server, synced via PowerSync');
  console.log('[LicenseService] ℹ️ Received subscription data:', {
    status: subscriptionData.status,
    plan: subscriptionData.plan_code || subscriptionData.plan_name,
    end_date: subscriptionData.end_date
  });
}
