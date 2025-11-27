import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';

export type LocalSubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  trial_end_date?: string | null;
  grace_end_date?: string | null;
  currency?: string | null;
  amount?: number | null;
  is_auto_renew?: number | boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
  source?: string | null;
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
    console.log('[SecureClock] IPC get-secure-now result', res);

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
  if (!isSQLiteAvailable()) return;
  try {
    await sqliteDB.initialize(orgId);
  } catch { }
}

export async function getLocalSubscription(orgId: string): Promise<LocalSubscriptionRow | null> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI?.db) return null;
    await ensureOrgDB(orgId);
    const res = await window.electronAPI.db.queryOne(
      'SELECT * FROM organization_subscriptions WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 1',
      [orgId]
    );
    return res?.success ? (res.data || null) : null;
  } catch {
    return null;
  }
}

export function isExpired(row: LocalSubscriptionRow, secureNowMs: number): {
  expired: boolean;
  effectiveEndMs: number | null;
  daysLeft: number;
  reason: 'trial' | 'grace' | 'end' | 'unknown';
} {
  // Pick the active window in order: trial -> paid end (with optional grace) -> else unknown
  const trialMs = toMs(row.trial_end_date);
  const graceMs = toMs(row.grace_end_date);
  const endMs = toMs(row.end_date);

  let effective: number | null = null;
  let reason: 'trial' | 'grace' | 'end' | 'unknown' = 'unknown';

  if (trialMs) {
    effective = trialMs;
    reason = 'trial';
  } else if (endMs) {
    // if grace exists, it extends
    effective = graceMs && graceMs > endMs ? graceMs : endMs;
    reason = graceMs && graceMs > endMs ? 'grace' : 'end';
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
  return {
    success: true,
    status: expired ? 'expired' : (row.trial_end_date ? 'trial' : 'active'),
    subscription_type: row.plan_id ? 'paid' : (row.trial_end_date ? 'trial' : 'none'),
    subscription_id: row.id,
    plan_name: row.plan_id || 'غير محدد',
    plan_code: row.plan_id || 'unknown',
    start_date: row.start_date || null,
    end_date: endIso,
    days_left: daysLeft,
    message: expired ? `الاشتراك منتهي (${reason})` : 'الاشتراك صالح'
  };
}

export async function saveLocalSubscription(orgId: string, subscriptionData: any): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI?.db) return;
    await ensureOrgDB(orgId);

    // Prepare the record for SQLite
    const record: LocalSubscriptionRow = {
      id: subscriptionData.subscription_id || `sub_${orgId}_${Date.now()}`,
      organization_id: orgId,
      plan_id: subscriptionData.plan_code || subscriptionData.plan_name,
      status: subscriptionData.status,
      start_date: subscriptionData.start_date,
      end_date: subscriptionData.end_date,
      trial_end_date: subscriptionData.subscription_type === 'trial' ? subscriptionData.end_date : null,
      grace_end_date: null, // You might want to calculate this if available
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      source: 'sync'
    };

    // Use the adapter via window.electronAPI.db directly or via dbAdapter if available
    // Since we are in licenseService, we use direct DB call similar to getLocalSubscription

    // First, check if a record exists to update it or insert new
    const existing = await getLocalSubscription(orgId);

    if (existing) {
      await window.electronAPI.db.execute(
        `UPDATE organization_subscriptions SET 
          plan_id = ?, status = ?, start_date = ?, end_date = ?, 
          trial_end_date = ?, updated_at = ?, source = ?
         WHERE organization_id = ?`,
        [
          record.plan_id, record.status, record.start_date, record.end_date,
          record.trial_end_date, record.updated_at, record.source,
          orgId
        ]
      );
    } else {
      await window.electronAPI.db.execute(
        `INSERT INTO organization_subscriptions (
          id, organization_id, plan_id, status, start_date, end_date, 
          trial_end_date, updated_at, created_at, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id, record.organization_id, record.plan_id, record.status,
          record.start_date, record.end_date, record.trial_end_date,
          record.updated_at, record.created_at, record.source
        ]
      );
    }

    console.log('[LicenseService] Saved local subscription for offline use:', record);
  } catch (error) {
    console.error('[LicenseService] Failed to save local subscription:', error);
  }
}
