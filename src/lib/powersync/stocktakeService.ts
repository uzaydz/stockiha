import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { searchProductByBarcode } from '@/lib/api/barcode-search';
import { v5 as uuidv5 } from 'uuid';
import { supabase } from '@/lib/supabase';

const STOCKTAKE_ITEM_NAMESPACE = '2f8d2b8e-7a45-4e8d-8f8e-9c7b1a6e13b1';
const STOCKTAKE_RECON_NAMESPACE = 'b3a4bb9a-b0b8-4d2f-8e3a-8bf507d1d9c2';

export type LocalStocktakeSession = {
  id: string;
  organization_id: string;
  scope: any;
  mode: 'cycle' | 'full' | 'blind';
  status: 'draft' | 'in_progress' | 'review' | 'approved' | 'rejected';
  require_approval: boolean;
  started_at: string;
  created_at?: string;
  updated_at?: string;
};

export type LocalStocktakeItem = {
  id: string;
  session_id: string;
  product_id: string;
  variant_id: string | null;
  expected_qty: number;
  counted_qty: number;
  delta: number;
  scan_count: number;
  proposed_reason: string | null;
  reconcile_action?: 'adjust_only' | 'loss' | 'unrecorded_sale';
  reconcile_notes?: string | null;
  source: string;
  updated_at: string;
  products?: {
    name: string;
    sku: string | null;
    barcode: string | null;
    thumbnail_image: string | null;
    stock_quantity: number | null;
  } | null;
};

function parseJsonMaybe(value: any): any {
  if (value == null) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function computeDelta(counted: any, expected: any): number {
  const c = Number(counted ?? 0) || 0;
  const e = Number(expected ?? 0) || 0;
  return c - e;
}

async function getLocalUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const authUserId = data.session?.user?.id;
    if (!authUserId) return null;

    const u = await powerSyncService.queryOne<{ id: string }>({
      sql: `SELECT id FROM users WHERE auth_user_id = ? LIMIT 1`,
      params: [authUserId],
      throwOnError: false,
    });
    return u?.id ?? null;
  } catch {
    return null;
  }
}

export async function getStocktakeSessionsLocal(organizationId: string, limit: number = 20): Promise<LocalStocktakeSession[]> {
  const rows = await powerSyncService.query<any>({
    sql: `SELECT * FROM local_stocktake_sessions
          WHERE organization_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
    params: [organizationId, limit],
    throwOnError: false,
  });

  return (rows || []).map((r: any) => ({
    ...r,
    require_approval: !!r.require_approval,
    scope: parseJsonMaybe(r.scope) ?? {},
  }));
}

export async function getStocktakeDashboardLocal(organizationId: string): Promise<{ items_count: number; total_deviation: number }> {
  const res = await powerSyncService.queryOne<{ items_count: number; total_deviation: number }>({
    sql: `SELECT
            COUNT(*) as items_count,
            COALESCE(SUM(ABS(COALESCE((counted_qty - expected_qty), 0))), 0) as total_deviation
          FROM local_stocktake_items
          WHERE organization_id = ?`,
    params: [organizationId],
    throwOnError: false,
    defaultValue: { items_count: 0, total_deviation: 0 } as any,
  });

  return {
    items_count: Number(res?.items_count ?? 0) || 0,
    total_deviation: Number(res?.total_deviation ?? 0) || 0,
  };
}

export async function startStocktakeSessionLocal(params: {
  organizationId: string;
  scope: any;
  mode: 'cycle' | 'full' | 'blind';
  requireApproval: boolean;
}): Promise<LocalStocktakeSession> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const startedBy = await getLocalUserId();

  await powerSyncService.mutate({
    table: 'local_stocktake_sessions',
    operation: 'INSERT',
    data: {
      id,
      organization_id: params.organizationId,
      scope: JSON.stringify(params.scope ?? {}),
      mode: params.mode,
      status: 'in_progress',
      require_approval: params.requireApproval ? 1 : 0,
      started_by: startedBy,
      started_at: now,
      created_at: now,
      updated_at: now,
    } as any,
  });

  await powerSyncService.mutate({
    table: 'local_stocktake_events',
    operation: 'INSERT',
    data: {
      id: crypto.randomUUID(),
      session_id: id,
      organization_id: params.organizationId,
      event_type: 'start',
      payload: JSON.stringify({ mode: params.mode, scope: params.scope ?? {} }),
      created_by: startedBy,
      created_at: now,
    } as any,
  });

  return {
    id,
    organization_id: params.organizationId,
    scope: params.scope ?? {},
    mode: params.mode,
    status: 'in_progress',
    require_approval: params.requireApproval,
    started_at: now,
    created_at: now,
    updated_at: now,
  };
}

export async function recordStocktakeScanLocal(params: {
  organizationId: string;
  sessionId: string;
  barcodeOrSku: string;
  source?: 'barcode' | 'camera' | 'manual';
  delta?: number;
}): Promise<LocalStocktakeItem | null> {
  const term = (params.barcodeOrSku || '').replace(/[\r\n\t]/g, '').trim();
  if (!term) return null;

  const adv = await searchProductByBarcode(params.organizationId, term);
  if (!adv) return null;

  // Determine variant_id based on the scanned barcode (size > color > product)
  let variantId: string | null = null;
  const colorWithSize = adv.colors?.find(c => c.sizes?.find(s => s.barcode === term));
  if (colorWithSize) {
    variantId = colorWithSize.sizes!.find(s => s.barcode === term)!.id;
  } else if (adv.colors?.find(c => c.barcode === term)) {
    variantId = adv.colors.find(c => c.barcode === term)!.id;
  }

  // Expected qty based on matched variant or best available
  let expectedQty = 0;
  if (variantId) {
    const size = adv.colors?.flatMap(c => c.sizes || []).find(s => s.id === variantId);
    if (size) expectedQty = Number(size.quantity ?? 0) || 0;
    const color = adv.colors?.find(c => c.id === variantId);
    if (color) expectedQty = Number(color.quantity ?? 0) || 0;
  }
  if (!expectedQty) {
    const allSizes = adv.colors?.flatMap(c => c.sizes || []) || [];
    const totalSizes = allSizes.reduce((sum, s) => sum + (Number(s.quantity ?? 0) || 0), 0);
    if (totalSizes) expectedQty = totalSizes;
  }
  if (!expectedQty) {
    const totalColors = (adv.colors || []).reduce((sum, c) => sum + (Number(c.quantity ?? 0) || 0), 0);
    if (totalColors) expectedQty = totalColors;
  }
  if (!expectedQty) expectedQty = Number(adv.stock_quantity ?? 0) || 0;

  // If this session already has an item for (product, variant), reuse its id to avoid server unique index conflicts.
  const existingByKey = await powerSyncService.queryOne<{ id: string; counted_qty: any; scan_count: any; proposed_reason: any }>({
    sql: `SELECT id, counted_qty, scan_count, proposed_reason
          FROM local_stocktake_items
          WHERE session_id = ?
            AND product_id = ?
            AND ((variant_id IS NULL AND ? IS NULL) OR variant_id = ?)
          LIMIT 1`,
    params: [params.sessionId, adv.id, variantId, variantId],
    throwOnError: false,
  });

  const itemId = existingByKey?.id
    ?? uuidv5(
      `${params.sessionId}:${adv.id}:${variantId ?? '00000000-0000-0000-0000-000000000000'}`,
      STOCKTAKE_ITEM_NAMESPACE
    );
  const now = new Date().toISOString();
  const deltaToApply = Number(params.delta ?? 1) || 1;

  if (!existingByKey) {
    await powerSyncService.mutate({
      table: 'local_stocktake_items',
      operation: 'INSERT',
      data: {
        id: itemId,
        session_id: params.sessionId,
        product_id: adv.id,
        variant_id: variantId,
        expected_qty: expectedQty,
        counted_qty: deltaToApply,
        scan_count: 1,
        last_scanned_at: now,
        source: params.source ?? 'barcode',
        proposed_reason: null,
        reconcile_action: 'adjust_only',
        reconcile_notes: null,
        created_at: now,
        updated_at: now,
        organization_id: params.organizationId,
      } as any,
    });
  } else {
    const nextCounted = (Number(existingByKey.counted_qty ?? 0) || 0) + deltaToApply;
    const nextScanCount = (Number(existingByKey.scan_count ?? 0) || 0) + 1;
    await powerSyncService.mutate({
      table: 'local_stocktake_items',
      operation: 'UPDATE',
      data: {
        counted_qty: nextCounted,
        scan_count: nextScanCount,
        last_scanned_at: now,
        source: params.source ?? 'barcode',
        updated_at: now,
      } as any,
      where: [{ column: 'id', value: itemId }],
    });
  }

  const createdBy = await getLocalUserId();
  await powerSyncService.mutate({
    table: 'local_stocktake_events',
    operation: 'INSERT',
    data: {
      id: crypto.randomUUID(),
      session_id: params.sessionId,
      organization_id: params.organizationId,
      event_type: 'scan',
      payload: JSON.stringify({ product_id: adv.id, variant_id: variantId, delta: deltaToApply }),
      created_by: createdBy,
      created_at: now,
    } as any,
  });

  const row = await powerSyncService.queryOne<any>({
    sql: `SELECT si.*,
                 p.name as product_name,
                 p.sku as product_sku,
                 p.barcode as product_barcode,
                 p.thumbnail_image as product_thumbnail_image,
                 p.stock_quantity as product_stock_quantity
          FROM local_stocktake_items si
          LEFT JOIN products p ON p.id = si.product_id
          WHERE si.id = ?
          LIMIT 1`,
    params: [itemId],
    throwOnError: false,
  });

  if (!row) return null;

  return {
    id: row.id,
    session_id: row.session_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    expected_qty: Number(row.expected_qty ?? 0) || 0,
    counted_qty: Number(row.counted_qty ?? 0) || 0,
    delta: computeDelta(row.counted_qty, row.expected_qty),
    scan_count: Number(row.scan_count ?? 0) || 0,
    proposed_reason: row.proposed_reason ?? null,
    reconcile_action: (row.reconcile_action as any) ?? 'adjust_only',
    reconcile_notes: row.reconcile_notes ?? null,
    source: row.source ?? 'barcode',
    updated_at: row.updated_at ?? now,
    products: row.product_name ? {
      name: row.product_name,
      sku: row.product_sku ?? null,
      barcode: row.product_barcode ?? null,
      thumbnail_image: row.product_thumbnail_image ?? null,
      stock_quantity: row.product_stock_quantity ?? null,
    } : null,
  };
}

export async function deleteStocktakeSessionLocal(organizationId: string, sessionId: string): Promise<boolean> {
  const sess = await powerSyncService.queryOne<{ id: string }>({
    sql: `SELECT id FROM local_stocktake_sessions WHERE id = ? AND organization_id = ? LIMIT 1`,
    params: [sessionId, organizationId],
    throwOnError: false,
  });
  if (!sess) return false;

  await powerSyncService.execute(`DELETE FROM local_stocktake_items WHERE session_id = ?`, [sessionId]);
  await powerSyncService.execute(`DELETE FROM local_stocktake_events WHERE session_id = ?`, [sessionId]);
  await powerSyncService.mutate({
    table: 'local_stocktake_sessions',
    operation: 'DELETE',
    where: [{ column: 'id', value: sessionId }],
  });

  return true;
}

export async function closeStocktakeSessionLocal(organizationId: string, sessionId: string): Promise<boolean> {
  const sess = await powerSyncService.queryOne<{ id: string }>({
    sql: `SELECT id FROM local_stocktake_sessions WHERE id = ? AND organization_id = ? LIMIT 1`,
    params: [sessionId, organizationId],
    throwOnError: false,
  });
  if (!sess) return false;

  const now = new Date().toISOString();
  const reviewerId = await getLocalUserId();

  await powerSyncService.mutate({
    table: 'local_stocktake_sessions',
    operation: 'UPDATE',
    data: {
      status: 'review',
      closed_at: now,
      reviewer_id: reviewerId,
      updated_at: now,
    } as any,
    where: [{ column: 'id', value: sessionId }],
  });

  await powerSyncService.mutate({
    table: 'local_stocktake_events',
    operation: 'INSERT',
    data: {
      id: crypto.randomUUID(),
      session_id: sessionId,
      organization_id: organizationId,
      event_type: 'close',
      payload: JSON.stringify({ closed_at: now }),
      created_by: reviewerId,
      created_at: now,
    } as any,
  });

  return true;
}

export async function setStocktakeItemCountLocal(params: {
  organizationId: string;
  itemId: string;
  countedQty: number;
  proposedReason: string | null;
}): Promise<LocalStocktakeItem | null> {
  const now = new Date().toISOString();

  await powerSyncService.mutate({
    table: 'local_stocktake_items',
    operation: 'UPDATE',
    data: {
      counted_qty: Number(params.countedQty ?? 0) || 0,
      proposed_reason: params.proposedReason,
      source: 'manual',
      updated_at: now,
    } as any,
    where: [{ column: 'id', value: params.itemId }],
  });

  const row = await powerSyncService.queryOne<any>({
    sql: `SELECT si.*,
                 p.name as product_name,
                 p.sku as product_sku,
                 p.barcode as product_barcode,
                 p.thumbnail_image as product_thumbnail_image,
                 p.stock_quantity as product_stock_quantity
          FROM local_stocktake_items si
          LEFT JOIN products p ON p.id = si.product_id
          WHERE si.id = ?
          LIMIT 1`,
    params: [params.itemId],
    throwOnError: false,
  });

  if (!row) return null;

  return {
    id: row.id,
    session_id: row.session_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    expected_qty: Number(row.expected_qty ?? 0) || 0,
    counted_qty: Number(row.counted_qty ?? 0) || 0,
    delta: computeDelta(row.counted_qty, row.expected_qty),
    scan_count: Number(row.scan_count ?? 0) || 0,
    proposed_reason: row.proposed_reason ?? null,
    reconcile_action: (row.reconcile_action as any) ?? 'adjust_only',
    reconcile_notes: row.reconcile_notes ?? null,
    source: row.source ?? 'manual',
    updated_at: row.updated_at ?? now,
    products: row.product_name ? {
      name: row.product_name,
      sku: row.product_sku ?? null,
      barcode: row.product_barcode ?? null,
      thumbnail_image: row.product_thumbnail_image ?? null,
      stock_quantity: row.product_stock_quantity ?? null,
    } : null,
  };
}

export async function loadStocktakeItemsLocal(sessionId: string, limit: number = 100): Promise<LocalStocktakeItem[]> {
  const rows = await powerSyncService.query<any>({
    sql: `SELECT si.*,
                 p.name as product_name,
                 p.sku as product_sku,
                 p.barcode as product_barcode,
                 p.thumbnail_image as product_thumbnail_image,
                 p.stock_quantity as product_stock_quantity
          FROM local_stocktake_items si
          LEFT JOIN products p ON p.id = si.product_id
          WHERE si.session_id = ?
          ORDER BY si.updated_at DESC
          LIMIT ?`,
    params: [sessionId, limit],
    throwOnError: false,
  });

  return (rows || []).map((row: any) => ({
    id: row.id,
    session_id: row.session_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    expected_qty: Number(row.expected_qty ?? 0) || 0,
    counted_qty: Number(row.counted_qty ?? 0) || 0,
    delta: computeDelta(row.counted_qty, row.expected_qty),
    scan_count: Number(row.scan_count ?? 0) || 0,
    proposed_reason: row.proposed_reason ?? null,
    reconcile_action: (row.reconcile_action as any) ?? 'adjust_only',
    reconcile_notes: row.reconcile_notes ?? null,
    source: row.source ?? 'barcode',
    updated_at: row.updated_at ?? '',
    products: row.product_name ? {
      name: row.product_name,
      sku: row.product_sku ?? null,
      barcode: row.product_barcode ?? null,
      thumbnail_image: row.product_thumbnail_image ?? null,
      stock_quantity: row.product_stock_quantity ?? null,
    } : null,
  }));
}

export async function setStocktakeItemReconcileLocal(params: {
  organizationId: string;
  itemId: string;
  action: 'adjust_only' | 'loss' | 'unrecorded_sale';
  notes?: string | null;
}): Promise<LocalStocktakeItem | null> {
  const now = new Date().toISOString();

  await powerSyncService.mutate({
    table: 'local_stocktake_items',
    operation: 'UPDATE',
    data: {
      reconcile_action: params.action,
      reconcile_notes: params.notes ?? null,
      updated_at: now,
    } as any,
    where: [{ column: 'id', value: params.itemId }],
  });

  const row = await powerSyncService.queryOne<any>({
    sql: `SELECT si.*,
                 p.name as product_name,
                 p.sku as product_sku,
                 p.barcode as product_barcode,
                 p.thumbnail_image as product_thumbnail_image,
                 p.stock_quantity as product_stock_quantity
          FROM local_stocktake_items si
          LEFT JOIN products p ON p.id = si.product_id
          WHERE si.id = ?
          LIMIT 1`,
    params: [params.itemId],
    throwOnError: false,
  });

  if (!row) return null;

  return {
    id: row.id,
    session_id: row.session_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    expected_qty: Number(row.expected_qty ?? 0) || 0,
    counted_qty: Number(row.counted_qty ?? 0) || 0,
    delta: computeDelta(row.counted_qty, row.expected_qty),
    scan_count: Number(row.scan_count ?? 0) || 0,
    proposed_reason: row.proposed_reason ?? null,
    reconcile_action: (row.reconcile_action as any) ?? 'adjust_only',
    reconcile_notes: row.reconcile_notes ?? null,
    source: row.source ?? 'manual',
    updated_at: row.updated_at ?? now,
    products: row.product_name ? {
      name: row.product_name,
      sku: row.product_sku ?? null,
      barcode: row.product_barcode ?? null,
      thumbnail_image: row.product_thumbnail_image ?? null,
      stock_quantity: row.product_stock_quantity ?? null,
    } : null,
  };
}

export async function setStocktakeSessionReconcileForShortagesLocal(params: {
  organizationId: string;
  sessionId: string;
  action: 'adjust_only' | 'loss' | 'unrecorded_sale';
}): Promise<void> {
  const now = new Date().toISOString();
  await powerSyncService.execute(
    `UPDATE local_stocktake_items
     SET reconcile_action = ?, updated_at = ?
     WHERE session_id = ?
       AND organization_id = ?
       AND COALESCE(counted_qty, 0) < COALESCE(expected_qty, 0)`,
    [params.action, now, params.sessionId, params.organizationId]
  );
}

export async function submitLocalStocktakeToServer(params: {
  organizationId: string;
  sessionId: string;
}): Promise<{ ok: boolean; itemsCount: number; error?: string }> {
  const now = new Date().toISOString();

  try {
    const localSession = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM local_stocktake_sessions WHERE id = ? AND organization_id = ? LIMIT 1`,
      params: [params.sessionId, params.organizationId],
      throwOnError: false,
    });
    if (!localSession) return { ok: false, itemsCount: 0, error: 'Local session not found' };

    const localItems = await powerSyncService.query<any>({
      sql: `SELECT * FROM local_stocktake_items WHERE session_id = ? ORDER BY updated_at DESC`,
      params: [params.sessionId],
      throwOnError: false,
    });

    const scope = parseJsonMaybe(localSession.scope) ?? {};

    // 1) Upsert session (server-side)
    const sessPayload: any = {
      id: localSession.id,
      organization_id: params.organizationId,
      scope,
      mode: localSession.mode ?? 'cycle',
      status: localSession.status === 'approved' ? 'approved' : 'review',
      require_approval: !!localSession.require_approval,
      started_by: localSession.started_by ?? null,
      reviewer_id: localSession.reviewer_id ?? null,
      started_at: localSession.started_at ?? now,
      closed_at: localSession.closed_at ?? null,
      notes: localSession.notes ?? null,
      updated_at: now,
    };

    const sessRes = await supabase.from('stocktake_sessions').upsert(sessPayload, { onConflict: 'id' });
    if (sessRes.error) throw sessRes.error;

    // 2) Upsert items (server-side) in chunks
    const itemsPayload: any[] = (localItems || []).map((i: any) => ({
      id: i.id,
      session_id: i.session_id,
      product_id: i.product_id,
      variant_id: i.variant_id ?? null,
      expected_qty: Number(i.expected_qty ?? 0) || 0,
      counted_qty: Number(i.counted_qty ?? 0) || 0,
      scan_count: Number(i.scan_count ?? 0) || 0,
      last_scanned_at: i.last_scanned_at ?? null,
      source: i.source ?? 'barcode',
      proposed_reason: i.proposed_reason ?? null,
      organization_id: params.organizationId,
      updated_at: now,
    }));

    const chunkSize = 500;
    for (let idx = 0; idx < itemsPayload.length; idx += chunkSize) {
      const chunk = itemsPayload.slice(idx, idx + chunkSize);
      const r = await supabase.from('stocktake_items').upsert(chunk, { onConflict: 'id' });
      if (r.error) throw r.error;
    }

    await powerSyncService.mutate({
      table: 'local_stocktake_sessions',
      operation: 'UPDATE',
      data: { synced_to_server_at: now, updated_at: now } as any,
      where: [{ column: 'id', value: params.sessionId }],
    });

    return { ok: true, itemsCount: itemsPayload.length };
  } catch (e: any) {
    return { ok: false, itemsCount: 0, error: e?.message || 'submit failed' };
  }
}

type ReconcileAction = 'adjust_only' | 'loss' | 'unrecorded_sale';

function isStocktakeDebugEnabled(): boolean {
  try {
    return (globalThis as any)?.localStorage?.getItem?.('debug_stocktake') === '1';
  } catch {
    return false;
  }
}

type ProductCostSnapshot = {
  id: string;
  name?: any;
  sku?: any;
  barcode?: any;
  purchase_price: any;
  unit_purchase_price: any;
  purchase_price_per_weight_unit: any;
  box_purchase_price: any;
  purchase_price_per_meter: any;
  sell_by_weight: any;
  sell_by_box: any;
  sell_by_meter: any;
  units_per_box: any;
  price: any;
  unit_sale_price: any;
  price_per_weight_unit: any;
  box_price: any;
  price_per_meter: any;
};

async function getProductCostSnapshotLocal(productId: string): Promise<ProductCostSnapshot | null> {
  return await powerSyncService.queryOne<ProductCostSnapshot>({
    sql: `SELECT
            id,
            name, sku, barcode,
            purchase_price, unit_purchase_price,
            purchase_price_per_weight_unit, box_purchase_price, purchase_price_per_meter,
            sell_by_weight, sell_by_box, sell_by_meter, units_per_box,
            price, unit_sale_price,
            price_per_weight_unit, box_price, price_per_meter
          FROM products
          WHERE id = ? LIMIT 1`,
    params: [productId],
    throwOnError: false,
  });
}

function getLocalStaffSessionInfo(): { staff_id?: string; staff_name?: string } | null {
  try {
    const raw = (globalThis as any)?.localStorage?.getItem?.('staff_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      staff_id: parsed?.id ?? undefined,
      staff_name: parsed?.staff_name ?? parsed?.name ?? undefined,
    };
  } catch {
    return null;
  }
}

async function getVariantDetailsViaService(variantId: string | null): Promise<{
  color_id?: string | null;
  size_id?: string | null;
  color_name?: string | null;
  size_name?: string | null;
  unit_price?: number | null;
  unit_cost?: number | null;
} | null> {
  if (!variantId) return null;

  const size = await powerSyncService.queryOne<any>({
    sql: `SELECT id, color_id, size_name, price, purchase_price FROM product_sizes WHERE id = ? LIMIT 1`,
    params: [variantId],
    throwOnError: false,
  });
  if (size?.id) {
    const color = size.color_id
      ? await powerSyncService.queryOne<any>({
          sql: `SELECT id, name, price, purchase_price FROM product_colors WHERE id = ? LIMIT 1`,
          params: [size.color_id],
          throwOnError: false,
        })
      : null;

    return {
      color_id: size.color_id ?? null,
      size_id: size.id,
      color_name: color?.name ?? null,
      size_name: size.size_name ?? null,
      unit_price: Number(size.price ?? color?.price ?? null),
      unit_cost: Number(size.purchase_price ?? color?.purchase_price ?? null),
    };
  }

  const color = await powerSyncService.queryOne<any>({
    sql: `SELECT id, name, price, purchase_price FROM product_colors WHERE id = ? LIMIT 1`,
    params: [variantId],
    throwOnError: false,
  });
  if (color?.id) {
    return {
      color_id: color.id,
      color_name: color.name ?? null,
      unit_price: Number(color.price ?? null),
      unit_cost: Number(color.purchase_price ?? null),
    };
  }

  return null;
}

async function txQueryOne<T extends Record<string, any>>(tx: any, sql: string, params: any[] = []): Promise<T | null> {
  const res = await tx.execute(sql, params);
  // PowerSync adapters may return either:
  // - { rows: [...] }
  // - plain array [...]
  // - { data: [...] }
  const rows =
    (Array.isArray(res) ? res : null) ??
    ((res as any)?.rows ? (res as any).rows : null) ??
    ((res as any)?.data ? (res as any).data : null) ??
    [];

  const row = (rows as any[])?.[0] ?? null;
  return (row as T) ?? null;
}

async function applyStocktakeInventoryAbsoluteLocal(params: {
  organizationId: string;
  items: Array<{ product_id: string; variant_id: string | null; counted_qty: number }>;
}): Promise<void> {
  const now = new Date().toISOString();

  await powerSyncService.transaction(async (tx) => {
    const touchedProducts = new Set<string>();

    for (const item of params.items) {
      touchedProducts.add(item.product_id);

      const counted = Math.max(0, Number(item.counted_qty ?? 0) || 0);
      const variantId = item.variant_id;

      if (variantId) {
        // size?
        const size = await txQueryOne<{ id: string; color_id: string | null; product_id: string | null }>(
          tx,
          `SELECT id, color_id, product_id FROM product_sizes WHERE id = ? LIMIT 1`,
          [variantId]
        );
        if (size?.id) {
          await tx.execute(`UPDATE product_sizes SET quantity = ? , updated_at = ? WHERE id = ?`, [counted, now, variantId]);

          if (size.color_id) {
            await tx.execute(
              `UPDATE product_colors
               SET quantity = COALESCE((SELECT SUM(quantity) FROM product_sizes WHERE color_id = ?), 0),
                   updated_at = ?
               WHERE id = ?`,
              [size.color_id, now, size.color_id]
            );
          }
        } else {
          // color?
          const color = await txQueryOne<{ id: string; product_id: string | null }>(
            tx,
            `SELECT id, product_id FROM product_colors WHERE id = ? LIMIT 1`,
            [variantId]
          );
          if (color?.id) {
            await tx.execute(`UPDATE product_colors SET quantity = ?, updated_at = ? WHERE id = ?`, [counted, now, variantId]);
          }
        }
      } else {
        // no variant: only apply to product if it has no variants
        const hasSizes = await txQueryOne<{ c: number }>(
          tx,
          `SELECT COUNT(*) as c FROM product_sizes WHERE product_id = ?`,
          [item.product_id]
        );
        const hasColors = await txQueryOne<{ c: number }>(
          tx,
          `SELECT COUNT(*) as c FROM product_colors WHERE product_id = ?`,
          [item.product_id]
        );
        if ((Number(hasSizes?.c ?? 0) || 0) === 0 && (Number(hasColors?.c ?? 0) || 0) === 0) {
          await tx.execute(
            `UPDATE products SET stock_quantity = ?, last_inventory_update = ?, updated_at = ? WHERE id = ?`,
            [counted, now, now, item.product_id]
          );
        }
      }
    }

    // Recalculate per-product stock from variants
    for (const productId of touchedProducts) {
      const sizesSum = await txQueryOne<{ s: number }>(
        tx,
        `SELECT COALESCE(SUM(quantity), 0) as s FROM product_sizes WHERE product_id = ?`,
        [productId]
      );
      const sizesCount = await txQueryOne<{ c: number }>(
        tx,
        `SELECT COUNT(*) as c FROM product_sizes WHERE product_id = ?`,
        [productId]
      );
      const hasSizes = (Number(sizesCount?.c ?? 0) || 0) > 0 || (Number(sizesSum?.s ?? 0) || 0) > 0;

      if (hasSizes) {
        await tx.execute(
          `UPDATE products SET stock_quantity = COALESCE((SELECT SUM(quantity) FROM product_sizes WHERE product_id = ?), 0), last_inventory_update = ?, updated_at = ? WHERE id = ?`,
          [productId, now, now, productId]
        );
        continue;
      }

      const colorsSum = await txQueryOne<{ s: number }>(
        tx,
        `SELECT COALESCE(SUM(quantity), 0) as s FROM product_colors WHERE product_id = ?`,
        [productId]
      );
      const colorsCount = await txQueryOne<{ c: number }>(
        tx,
        `SELECT COUNT(*) as c FROM product_colors WHERE product_id = ?`,
        [productId]
      );
      const hasColors = (Number(colorsCount?.c ?? 0) || 0) > 0 || (Number(colorsSum?.s ?? 0) || 0) > 0;

      if (hasColors) {
        await tx.execute(
          `UPDATE products SET stock_quantity = COALESCE((SELECT SUM(quantity) FROM product_colors WHERE product_id = ?), 0), last_inventory_update = ?, updated_at = ? WHERE id = ?`,
          [productId, now, now, productId]
        );
      }
    }
  });
}

async function getVariantDetailsLocal(tx: any, variantId: string | null): Promise<{
  color_id?: string;
  size_id?: string;
  color_name?: string | null;
  size_name?: string | null;
  unit_price?: number | null;
  unit_cost?: number | null;
} | null> {
  if (!variantId) return null;

  const size = await txQueryOne<any>(tx, `SELECT id, color_id, size_name, price, purchase_price FROM product_sizes WHERE id = ? LIMIT 1`, [variantId]);
  if (size?.id) {
    const color = size.color_id
      ? await txQueryOne<any>(tx, `SELECT id, name, price, purchase_price FROM product_colors WHERE id = ? LIMIT 1`, [size.color_id])
      : null;
    return {
      color_id: size.color_id ?? undefined,
      size_id: size.id,
      color_name: color?.name ?? null,
      size_name: size.size_name ?? null,
      unit_price: Number(size.price ?? color?.price ?? null),
      unit_cost: Number(size.purchase_price ?? color?.purchase_price ?? null),
    };
  }

  const color = await txQueryOne<any>(tx, `SELECT id, name, price, purchase_price FROM product_colors WHERE id = ? LIMIT 1`, [variantId]);
  if (color?.id) {
    return {
      color_id: color.id,
      color_name: color.name ?? null,
      unit_price: Number(color.price ?? null),
      unit_cost: Number(color.purchase_price ?? null),
    };
  }

  return null;
}

export async function approveStocktakeOfflineFirst(params: {
  organizationId: string;
  sessionId: string;
}): Promise<{ ok: boolean; orderId?: string; lossId?: string; error?: string }> {
  const now = new Date().toISOString();

  try {
    const userId = await getLocalUserId();
    const debug = isStocktakeDebugEnabled();

    const localSession = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM local_stocktake_sessions WHERE id = ? AND organization_id = ? LIMIT 1`,
      params: [params.sessionId, params.organizationId],
      throwOnError: false,
    });
    if (!localSession) return { ok: false, error: 'Local session not found' };

    const localItems = await powerSyncService.query<any>({
      sql: `SELECT * FROM local_stocktake_items WHERE session_id = ? ORDER BY updated_at DESC`,
      params: [params.sessionId],
      throwOnError: false,
    });

    // 1) Apply inventory locally (offline-first UX)
    await applyStocktakeInventoryAbsoluteLocal({
      organizationId: params.organizationId,
      items: (localItems || []).map((i: any) => ({
        product_id: i.product_id,
        variant_id: i.variant_id ?? null,
        counted_qty: Number(i.counted_qty ?? 0) || 0,
      })),
    });

    // 2) Prepare reconciliation groups (shortages only)
    const shortages = (localItems || []).filter((i: any) => (Number(i.counted_qty ?? 0) || 0) < (Number(i.expected_qty ?? 0) || 0));

    const saleItems = shortages.filter((i: any) => (i.reconcile_action ?? 'adjust_only') === 'unrecorded_sale');
    const lossItems = shortages.filter((i: any) => (i.reconcile_action ?? 'adjust_only') === 'loss');

    let orderId: string | undefined;
    let lossId: string | undefined;

    // Prefetch local cost snapshots outside the write transaction.
    const productCostById = new Map<string, ProductCostSnapshot | null>();
    const variantById = new Map<string, any | null>();

    const lossProductIds = Array.from(new Set(lossItems.map((i: any) => i.product_id).filter(Boolean)));
    const lossVariantIds = Array.from(new Set(lossItems.map((i: any) => i.variant_id).filter(Boolean)));
    const saleProductIds = Array.from(new Set(saleItems.map((i: any) => i.product_id).filter(Boolean)));
    const saleVariantIds = Array.from(new Set(saleItems.map((i: any) => i.variant_id).filter(Boolean)));

    const allProductIds = Array.from(new Set([...lossProductIds, ...saleProductIds]));
    const allVariantIds = Array.from(new Set([...lossVariantIds, ...saleVariantIds]));

    for (const pid of allProductIds) {
      const snap = await getProductCostSnapshotLocal(pid);
      productCostById.set(pid, snap ?? null);
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[StocktakeDebug][ProductSnapshot]', { sessionId: params.sessionId, product_id: pid, found: !!snap, snap });
      }
    }
    for (const vid of allVariantIds) {
      const v = await getVariantDetailsViaService(vid);
      variantById.set(vid, v ?? null);
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[StocktakeDebug][VariantSnapshot]', { sessionId: params.sessionId, variant_id: vid, found: !!v, v });
      }
    }

    await powerSyncService.transaction(async (tx: any) => {
      // 3) Create order (one per session) for unrecorded sales
      if (saleItems.length > 0) {
        orderId = uuidv5(`stocktake-order:${params.sessionId}`, STOCKTAKE_RECON_NAMESPACE);

        const staffInfo = getLocalStaffSessionInfo();

        const computeUnitSellingFromProduct = (p: ProductCostSnapshot | null): number => {
          const isWeight = !!p?.sell_by_weight;
          const isBox = !!p?.sell_by_box;
          const isMeter = !!p?.sell_by_meter;

          if (isWeight && p?.price_per_weight_unit != null) return Number(p.price_per_weight_unit) || 0;
          if (isMeter && p?.price_per_meter != null) return Number(p.price_per_meter) || 0;
          if (isBox && p?.box_price != null) {
            const unitsPerBox = Number(p?.units_per_box ?? 0) || 0;
            const boxPrice = Number(p.box_price) || 0;
            return unitsPerBox > 0 ? boxPrice / unitsPerBox : boxPrice;
          }

          return Number(p?.unit_sale_price ?? p?.price ?? 0) || 0;
        };

        // Aggregate shortages by (product, variant) to avoid duplicate order_items
        const aggregated = new Map<string, { product_id: string; variant_id: string | null; qty: number }>();
        for (const it of saleItems) {
          const qty = Math.abs(Number(it.expected_qty ?? 0) - Number(it.counted_qty ?? 0)) || 0;
          if (!qty) continue;
          const key = `${it.product_id}:${it.variant_id ?? 'null'}`;
          const prev = aggregated.get(key);
          if (!prev) aggregated.set(key, { product_id: it.product_id, variant_id: it.variant_id ?? null, qty });
          else prev.qty += qty;
        }

        let subtotal = 0;
        const orderItemsRows: any[] = [];
        let idx = 0;

        for (const it of aggregated.values()) {
          const p = productCostById.get(it.product_id) ?? null;
          const v = it.variant_id ? (variantById.get(it.variant_id) ?? null) : null;
          const unitPrice = Number(v?.unit_price ?? computeUnitSellingFromProduct(p) ?? 0) || 0;

          const lineTotal = unitPrice * it.qty;
          subtotal += lineTotal;

          if (debug) {
            // eslint-disable-next-line no-console
            console.log('[StocktakeDebug][SaleLine]', {
              sessionId: params.sessionId,
              product_id: it.product_id,
              variant_id: it.variant_id,
              qty: it.qty,
              unitPrice,
              lineTotal,
              product: p ?? null,
              variant: v ?? null,
            });
          }

          orderItemsRows.push({
            id: uuidv5(`stocktake-order-item:${orderId}:${it.product_id}:${it.variant_id ?? 'null'}`, STOCKTAKE_RECON_NAMESPACE),
            order_id: orderId,
            product_id: it.product_id,
            product_name: p?.name ?? '',
            name: p?.name ?? '',
            quantity: Math.round(it.qty),
            unit_price: unitPrice,
            total_price: lineTotal,
            original_price: unitPrice,
            organization_id: params.organizationId,
            slug: `${orderId}-${idx + 1}`,
            color_id: v?.color_id ?? null,
            size_id: v?.size_id ?? null,
            color_name: v?.color_name ?? null,
            size_name: v?.size_name ?? null,
            sale_type: 'retail',
            selling_unit_type: 'piece',
            created_at: now,
          });
          idx++;
        }

        const meta = JSON.stringify({ stocktake_session_id: params.sessionId, source: 'stocktake_unrecorded_sale' });
        const notes = `بيع غير مسجّل (جرد) - جلسة ${params.sessionId}`;

        if (debug) {
          // eslint-disable-next-line no-console
          console.log('[StocktakeDebug][SaleTotals]', { sessionId: params.sessionId, subtotal, lines: orderItemsRows.length });
        }

        await tx.execute(
          `INSERT OR REPLACE INTO orders (
             id, organization_id, customer_id,
             subtotal, tax, discount, total, amount_paid, remaining_amount,
             status, payment_method, payment_status,
             employee_id, is_online, notes, metadata,
             pos_order_type, completed_at,
             created_by_staff_id, created_by_staff_name,
             created_at, updated_at
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            orderId,
            params.organizationId,
            null,
            subtotal,
            0,
            0,
            subtotal,
            subtotal,
            0,
            'completed',
            'cash',
            'paid',
            null,
            0,
            notes,
            meta,
            'retail',
            now,
            staffInfo?.staff_id ?? null,
            staffInfo?.staff_name ?? null,
            now,
            now,
          ]
        );

        for (const row of orderItemsRows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(',');
          const vals = cols.map((c) => row[c]);
          await tx.execute(`INSERT OR REPLACE INTO order_items (${cols.join(',')}) VALUES (${placeholders})`, vals);
        }
      }

      // 4) Create loss (one per session) for losses
      if (lossItems.length > 0) {
        lossId = uuidv5(`stocktake-loss:${params.sessionId}`, STOCKTAKE_RECON_NAMESPACE);

        const lossNumber = `LOSS-${Date.now()}`;
        const externalReference = `stocktake:${params.sessionId}`;

        // We'll compute totals locally to satisfy NOT NULL fields
        let totalCost = 0;
        let totalSelling = 0;
        let totalItems = 0;
        let zeroCostLines = 0;
        let lines = 0;

        const lossItemsRows: any[] = [];

        for (const it of lossItems) {
          const qty = Math.abs(Number(it.expected_qty ?? 0) - Number(it.counted_qty ?? 0)) || 0;
          if (!qty) continue;
          lines++;

          const p = productCostById.get(it.product_id) ?? null;
          const v = it.variant_id ? (variantById.get(it.variant_id) ?? null) : null;

          const unitCostFromProduct = (() => {
            const isWeight = !!p?.sell_by_weight;
            const isBox = !!p?.sell_by_box;
            const isMeter = !!p?.sell_by_meter;

            if (isWeight && p?.purchase_price_per_weight_unit != null) return Number(p.purchase_price_per_weight_unit) || 0;
            if (isMeter && p?.purchase_price_per_meter != null) return Number(p.purchase_price_per_meter) || 0;
            if (isBox && p?.box_purchase_price != null) {
              const unitsPerBox = Number(p?.units_per_box ?? 0) || 0;
              const boxPurchase = Number(p.box_purchase_price) || 0;
              return unitsPerBox > 0 ? boxPurchase / unitsPerBox : boxPurchase;
            }

            return Number(p?.unit_purchase_price ?? p?.purchase_price ?? 0) || 0;
          })();

          const unitSellingFromProduct = (() => {
            const isWeight = !!p?.sell_by_weight;
            const isBox = !!p?.sell_by_box;
            const isMeter = !!p?.sell_by_meter;

            if (isWeight && p?.price_per_weight_unit != null) return Number(p.price_per_weight_unit) || 0;
            if (isMeter && p?.price_per_meter != null) return Number(p.price_per_meter) || 0;
            if (isBox && p?.box_price != null) {
              const unitsPerBox = Number(p?.units_per_box ?? 0) || 0;
              const boxPrice = Number(p.box_price) || 0;
              return unitsPerBox > 0 ? boxPrice / unitsPerBox : boxPrice;
            }

            return Number(p?.unit_sale_price ?? p?.price ?? 0) || 0;
          })();

          const unitCost = Number(v?.unit_cost ?? unitCostFromProduct ?? 0) || 0;
          const unitSelling = Number(v?.unit_price ?? unitSellingFromProduct ?? 0) || 0;
          if (!unitCost) zeroCostLines++;

          if (debug) {
            // eslint-disable-next-line no-console
            console.log('[StocktakeDebug][LossCost]', {
              sessionId: params.sessionId,
              product_id: it.product_id,
              variant_id: it.variant_id ?? null,
              qty,
              product: p ?? null,
              variant: v ?? null,
              computed: {
                unitCostFromProduct,
                unitSellingFromProduct,
                unitCostFinal: unitCost,
                unitSellingFinal: unitSelling,
              },
            });
          }

          const costTotal = unitCost * qty;
          const sellingTotal = unitSelling * qty;

          totalCost += costTotal;
          totalSelling += sellingTotal;
          totalItems += qty;

          lossItemsRows.push({
            id: uuidv5(`stocktake-loss-item:${lossId}:${it.product_id}:${it.variant_id ?? 'null'}`, STOCKTAKE_RECON_NAMESPACE),
            loss_id: lossId,
            product_id: it.product_id,
            product_name: '',
            product_sku: null,
            product_barcode: null,
            lost_quantity: qty,
            unit_cost_price: unitCost,
            unit_selling_price: unitSelling,
            total_cost_value: costTotal,
            total_selling_value: sellingTotal,
            variant_info: null,
            loss_condition: 'missing',
            loss_percentage: 100,
            stock_before_loss: null,
            stock_after_loss: null,
            inventory_adjusted: 1,
            inventory_adjusted_at: now,
            inventory_adjusted_by: userId,
            item_notes: it.reconcile_notes ?? null,
            color_id: v?.color_id ?? null,
            color_name: v?.color_name ?? null,
            size_id: v?.size_id ?? null,
            size_name: v?.size_name ?? null,
            variant_stock_before: null,
            variant_stock_after: null,
            organization_id: params.organizationId,
            created_at: now,
            updated_at: now,
          });
        }

        if (debug) {
          // eslint-disable-next-line no-console
          console.log('[StocktakeDebug][LossTotals]', {
            sessionId: params.sessionId,
            lines,
            zeroCostLines,
            totalCost,
            totalSelling,
            totalItems,
          });
        }

        await tx.execute(
          `INSERT OR REPLACE INTO losses (
             id, organization_id, loss_number, loss_type, loss_category,
             loss_description, incident_date, reported_by, status,
             approved_by, approved_at,
             total_cost_value, total_selling_value, total_items_count,
             external_reference, notes, created_at, updated_at
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
	          [
	            lossId,
	            params.organizationId,
	            lossNumber,
	            'loss',
	            'operational',
	            `خسائر ناتجة عن جرد - جلسة ${params.sessionId}`,
	            now,
	            userId,
	            'approved',
            userId,
            now,
            totalCost,
            totalSelling,
            totalItems,
            externalReference,
            `تم إنشاؤها تلقائياً من جلسة جرد`,
            now,
            now,
          ]
        );

        for (const row of lossItemsRows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(',');
          const vals = cols.map((c) => row[c]);
          await tx.execute(`INSERT OR REPLACE INTO loss_items (${cols.join(',')}) VALUES (${placeholders})`, vals);
        }
      }

      // 5) Copy local session/items into synced stocktake tables (PowerSync outbox)
      const scope = parseJsonMaybe(localSession.scope) ?? {};
      await tx.execute(
        `INSERT OR REPLACE INTO stocktake_sessions (
           id, organization_id, scope, mode, status, require_approval,
           started_by, reviewer_id, started_at, closed_at, notes,
           created_at, updated_at,
           reconciliation_order_id, reconciliation_loss_id
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          localSession.id,
          params.organizationId,
          JSON.stringify(scope),
          localSession.mode ?? 'cycle',
          'review',
          localSession.require_approval ? 1 : 0,
          localSession.started_by ?? null,
          localSession.reviewer_id ?? userId ?? null,
          localSession.started_at ?? now,
          localSession.closed_at ?? now,
          localSession.notes ?? null,
          localSession.created_at ?? now,
          now,
          orderId ?? null,
          lossId ?? null,
        ]
      );

      for (const it of (localItems || [])) {
        const action: ReconcileAction = (it.reconcile_action as any) ?? 'adjust_only';
        await tx.execute(
          `INSERT OR REPLACE INTO stocktake_items (
             id, session_id, product_id, variant_id,
             expected_qty, counted_qty, scan_count, last_scanned_at,
             source, proposed_reason, reconcile_action, reconcile_notes,
             synced, organization_id, created_at, updated_at
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            it.id,
            params.sessionId,
            it.product_id,
            it.variant_id ?? null,
            Number(it.expected_qty ?? 0) || 0,
            Number(it.counted_qty ?? 0) || 0,
            Number(it.scan_count ?? 0) || 0,
            it.last_scanned_at ?? null,
            it.source ?? 'barcode',
            it.proposed_reason ?? null,
            action,
            it.reconcile_notes ?? null,
            0,
            params.organizationId,
            it.created_at ?? now,
            now,
          ]
        );
      }

      const approvePayload = JSON.stringify({
        approved_at: now,
        order_id: orderId ?? null,
        loss_id: lossId ?? null,
      });
      await tx.execute(
        `INSERT INTO stocktake_events (id, session_id, organization_id, event_type, payload, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), params.sessionId, params.organizationId, 'approve', approvePayload, userId, now, now]
      );

      // 6) Enqueue reconciliation row (server trigger will apply stock + set status)
	      await tx.execute(
	        `INSERT OR REPLACE INTO stocktake_reconciliations (id, session_id, organization_id, created_by, order_id, loss_id, status, created_at, updated_at)
	         VALUES (?,?,?,?,?,?,?,?,?)`,
	        [params.sessionId, params.sessionId, params.organizationId, userId, orderId ?? null, lossId ?? null, 'pending', now, now]
	      );

      // 7) Mark local session approved (local)
      await tx.execute(
        `UPDATE local_stocktake_sessions SET status = 'approved', updated_at = ? WHERE id = ?`,
        [now, params.sessionId]
      );

      await tx.execute(
        `INSERT INTO local_stocktake_events (id, session_id, organization_id, event_type, payload, created_by, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          params.sessionId,
          params.organizationId,
          'approve',
          approvePayload,
          userId,
          now,
        ]
      );
    });

    return { ok: true, orderId, lossId };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'approve failed' };
  }
}

export async function markLocalStocktakeApproved(params: {
  organizationId: string;
  sessionId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const reviewerId = await getLocalUserId();

  await powerSyncService.mutate({
    table: 'local_stocktake_sessions',
    operation: 'UPDATE',
    data: {
      status: 'approved',
      updated_at: now,
    } as any,
    where: [{ column: 'id', value: params.sessionId }],
  });

  await powerSyncService.mutate({
    table: 'local_stocktake_events',
    operation: 'INSERT',
    data: {
      id: crypto.randomUUID(),
      session_id: params.sessionId,
      organization_id: params.organizationId,
      event_type: 'approve',
      payload: JSON.stringify({ approved_at: now }),
      created_by: reviewerId,
      created_at: now,
    } as any,
  });
}

export async function resetLocalStocktakeItem(params: {
  organizationId: string;
  itemId: string;
}): Promise<LocalStocktakeItem | null> {
  const now = new Date().toISOString();
  const userId = await getLocalUserId();

  const itemRow = await powerSyncService.queryOne<{ session_id: string | null }>({
    sql: `SELECT session_id FROM local_stocktake_items WHERE id = ? LIMIT 1`,
    params: [params.itemId],
    throwOnError: false,
  });

  await powerSyncService.mutate({
    table: 'local_stocktake_items',
    operation: 'UPDATE',
    data: {
      counted_qty: 0,
      scan_count: 0,
      last_scanned_at: null,
      proposed_reason: null,
      source: 'manual',
      updated_at: now,
    } as any,
    where: [{ column: 'id', value: params.itemId }],
  });

  await powerSyncService.mutate({
    table: 'local_stocktake_events',
    operation: 'INSERT',
    data: {
      id: crypto.randomUUID(),
      session_id: itemRow?.session_id ?? null,
      organization_id: params.organizationId,
      event_type: 'reset',
      payload: JSON.stringify({ item_id: params.itemId }),
      created_by: userId,
      created_at: now,
    } as any,
  });

  const row = await powerSyncService.queryOne<any>({
    sql: `SELECT si.*,
                 p.name as product_name,
                 p.sku as product_sku,
                 p.barcode as product_barcode,
                 p.thumbnail_image as product_thumbnail_image,
                 p.stock_quantity as product_stock_quantity
          FROM local_stocktake_items si
          LEFT JOIN products p ON p.id = si.product_id
          WHERE si.id = ?
          LIMIT 1`,
    params: [params.itemId],
    throwOnError: false,
  });

  if (!row) return null;

  return {
    id: row.id,
    session_id: row.session_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    expected_qty: Number(row.expected_qty ?? 0) || 0,
    counted_qty: Number(row.counted_qty ?? 0) || 0,
    delta: computeDelta(row.counted_qty, row.expected_qty),
    scan_count: Number(row.scan_count ?? 0) || 0,
    proposed_reason: row.proposed_reason ?? null,
    source: row.source ?? 'manual',
    updated_at: row.updated_at ?? now,
    products: row.product_name ? {
      name: row.product_name,
      sku: row.product_sku ?? null,
      barcode: row.product_barcode ?? null,
      thumbnail_image: row.product_thumbnail_image ?? null,
      stock_quantity: row.product_stock_quantity ?? null,
    } : null,
  };
}
