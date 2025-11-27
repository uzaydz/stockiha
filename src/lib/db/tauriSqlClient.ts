import type { QueryResult } from '@tauri-apps/plugin-sql';

let db: any = null;
let currentOrgId: string | null = null;

/**
 * تحويل camelCase إلى snake_case
 * مثال: objectType → object_type, createdAt → created_at
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * تحويل كائن من camelCase keys إلى snake_case keys
 */
function convertKeysToSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = value;
  }
  return converted;
}

function isTauri(): boolean {
  // إشارة build-time من Vite/Tauri
  try {
    // @ts-ignore
    if ((import.meta as any).env?.TAURI) return true;
  } catch {
    // تجاهل أي خطأ في البيئات التي لا تدعم import.meta
  }

  if (typeof window === 'undefined') return false;
  const w: any = window as any;

  // إشارات runtime من Tauri
  if (typeof w.__TAURI_IPC__ === 'function') return true;
  if (!!w.__TAURI__) return true;
  if (typeof w.isTauri === 'boolean' && w.isTauri) return true;

  return false;
}

async function ensureDb(organizationId: string) {
  if (db && currentOrgId === organizationId) {
    return db;
  }

  const mod = await import('@tauri-apps/plugin-sql');
  const Database: any = (mod as any).default ?? (mod as any).Database ?? mod;

  const dbPath = `sqlite:stockiha_${organizationId}.db`;
  db = await Database.load(dbPath);
  currentOrgId = organizationId;

  // مبدئياً لا ننشئ كل الجداول هنا، سيتم توسيع ذلك لاحقاً لنقل كامل schema
  return db;
}

export async function tauriInitDatabase(organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureDb(organizationId);
    return { success: true };
  } catch (error: any) {
    console.error('[TauriSQLite] Failed to initialize DB:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function tauriQuery(organizationId: string, sql: string, params: any[] = []): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const dbInstance = await ensureDb(organizationId);
    const rows = await dbInstance.select(sql, params);
    return { success: true, data: rows as any[] };
  } catch (error: any) {
    console.error('[TauriSQLite] Query error:', { sql, params, error });
    return { success: false, data: [], error: error?.message || String(error) };
  }
}

export async function tauriQueryOne(organizationId: string, sql: string, params: any[] = []): Promise<{ success: boolean; data: any | null; error?: string }> {
  const res = await tauriQuery(organizationId, sql, params);
  if (!res.success) return { success: false, data: null, error: res.error };
  return { success: true, data: res.data[0] ?? null };
}

export async function tauriExecute(organizationId: string, sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number; lastInsertRowid?: number; error?: string }> {
  try {
    const dbInstance = await ensureDb(organizationId);
    const result: QueryResult = await dbInstance.execute(sql, params);
    return {
      success: true,
      changes: (result as any).rowsAffected,
      lastInsertRowid: (result as any).lastInsertId
    };
  } catch (error: any) {
    console.error('[TauriSQLite] Execute error:', { sql, params, error });
    return { success: false, error: error?.message || String(error) };
  }
}

export async function tauriUpsert(organizationId: string, table: string, data: any): Promise<{ success: boolean; changes?: number; error?: string }> {
  try {
    const dbInstance = await ensureDb(organizationId);

    // تحويل الـ keys من camelCase إلى snake_case
    const snakeCaseData = convertKeysToSnakeCase(data);
    const keys = Object.keys(snakeCaseData || {});
    if (!keys.length) return { success: true, changes: 0 };

    const columns = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => {
      const val = snakeCaseData[k];
      // تحويل Boolean إلى INTEGER (0 أو 1) لـ SQLite
      if (typeof val === 'boolean') {
        return val ? 1 : 0;
      }
      // تحويل الكائنات إلى JSON string
      if (val !== null && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });

    const updateAssignments = keys
      .filter(k => k !== 'id')
      .map(k => `"${k}" = excluded."${k}"`)
      .join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})` +
      (updateAssignments ? ` ON CONFLICT(id) DO UPDATE SET ${updateAssignments}` : '');

    const result: QueryResult = await dbInstance.execute(sql, values);
    return { success: true, changes: (result as any).rowsAffected };
  } catch (error: any) {
    console.error('[TauriSQLite] Upsert error:', { table, data, error: error?.message || String(error) });
    return { success: false, error: error?.message || String(error) };
  }
}

export async function tauriDelete(organizationId: string, table: string, id: string): Promise<{ success: boolean; changes?: number; error?: string }> {
  return tauriExecute(organizationId, `DELETE FROM ${table} WHERE id = ?`, [id]);
}
