import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

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

export async function getSecureNow(organizationId?: string): Promise<{ secureNowMs: number; tamperDetected: boolean; tamperCount: number }> {
  try {
    const api: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (!api?.license) {
      return { secureNowMs: Date.now(), tamperDetected: false, tamperCount: 0 };
    }
    const res = await api.license.getSecureNow(organizationId || null);
    try { console.log('[SecureClock] IPC get-secure-now result', res); } catch {}
    if (res?.success) {
      let ms = Number(res.secureNowMs || 0);
      const minMs = 946684800000; // 2000-01-01
      if (!Number.isFinite(ms) || ms < minMs) {
        const fallback = Date.now();
        try { console.warn('[SecureClock] secureNowMs implausible, clamping to deviceNow', { ms, fallback }); } catch {}
        ms = fallback;
      }
      return { secureNowMs: ms, tamperDetected: !!res.tamperDetected, tamperCount: Number(res.tamperCount || 0) };
    }
  } catch {}
  return { secureNowMs: Date.now(), tamperDetected: false, tamperCount: 0 };
}

export async function setAnchorFromServer(organizationId: string | null | undefined, serverNowMs: number): Promise<void> {
  try {
    const api: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (!api?.license) return;
    await api.license.setAnchor(organizationId || null, Number(serverNowMs));
  } catch {}
}

async function ensureOrgDB(orgId: string): Promise<void> {
  if (!isSQLiteAvailable()) return;
  try {
    await sqliteDB.initialize(orgId);
  } catch {}
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
    features: [],
    limits: { max_pos: null, max_users: null, max_products: null },
    message: expired ? `الاشتراك منتهي (${reason})` : 'الاشتراك صالح'
  };
}
