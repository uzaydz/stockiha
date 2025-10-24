import type { LocalProduct } from '@/database/localDb';

export type ConflictDecision = 'local' | 'remote' | 'merge';

export interface ConflictContext {
  localUpdatedAt?: string | Date | number | null;
  remoteUpdatedAt?: string | Date | number | null;
}

function toDate(v?: string | Date | number | null): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function resolveProductConflict(
  local: LocalProduct,
  remote: any,
  ctx: ConflictContext
): ConflictDecision {
  const localTs = toDate(local.localUpdatedAt || local.updated_at);
  const remoteTs = toDate(remote?.updated_at);

  // إذا كانت بيانات الخادم أحدث بوضوح، ندمج (نحافظ على المخزون المحلي)
  if (remoteTs > localTs) return 'merge';
  // إذا كانت البيانات المحلية أحدث، نستخدم المحلي
  if (localTs > remoteTs) return 'local';
  // تعادل: ندمج للمحافظة على أفضل ما في الطرفين
  return 'merge';
}

export function buildMergedProduct(local: LocalProduct, remote: any): any {
  // نحافظ على المخزون المحلي ونستورد بقية الحقول من الخادم لتقليل التباين
  const stock = local.stock_quantity ?? 0;
  return {
    ...remote,
    stock_quantity: stock
  };
}
