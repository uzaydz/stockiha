import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

// A Supabase-compatible async storage backed by SQLite (auth_storage)
// Ensures persistence in a dedicated 'global' DB and mirrors to current org DB.

async function ensureSQLiteReadyForAuth(): Promise<void> {
  if (!isSQLiteAvailable()) return;
  try {
    if (!sqliteDB.isReady()) {
      const orgId = (typeof localStorage !== 'undefined' && (
        localStorage.getItem('currentOrganizationId') ||
        localStorage.getItem('bazaar_organization_id')
      )) || null;
      await sqliteDB.initialize(orgId || 'global');
    }
  } catch {}
}

async function withTemporaryDB<T>(target: string, fn: () => Promise<T>): Promise<T> {
  const original = sqliteDB.getCurrentOrganizationId();
  const already = original === target;
  if (!already) {
    try { await sqliteDB.initialize(target); } catch {}
  }
  try {
    return await fn();
  } finally {
    if (!already && original) {
      try { await sqliteDB.initialize(original); } catch {}
    }
  }
}

async function readFromCurrentOrGlobal(key: string): Promise<string | null> {
  // Try current DB first
  try {
    const res = await sqliteDB.queryOne('SELECT value FROM auth_storage WHERE id = ?', [key]);
    if (res.success && res.data && typeof res.data.value === 'string') return res.data.value;
  } catch {}
  // Fallback to global DB
  try {
    const val = await withTemporaryDB('global', async () => {
      const r = await sqliteDB.queryOne('SELECT value FROM auth_storage WHERE id = ?', [key]);
      return r.success && r.data && typeof r.data.value === 'string' ? (r.data.value as string) : null;
    });
    // Mirror into current DB if we have one and value exists
    if (val != null) {
      try {
        await sqliteDB.upsert('auth_storage', { id: key, value: val, updated_at: new Date().toISOString() });
      } catch {}
    }
    return val;
  } catch {
    return null;
  }
}

async function writeToCurrentAndGlobal(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  // Write to current DB
  try { await sqliteDB.upsert('auth_storage', { id: key, value, updated_at: now }); } catch {}
  // Mirror to global DB
  try {
    await withTemporaryDB('global', async () => {
      await sqliteDB.upsert('auth_storage', { id: key, value, updated_at: now });
    });
  } catch {}
}

async function removeFromCurrentAndGlobal(key: string): Promise<void> {
  try { await sqliteDB.query('DELETE FROM auth_storage WHERE id = ?', [key]); } catch {}
  try {
    await withTemporaryDB('global', async () => {
      await sqliteDB.query('DELETE FROM auth_storage WHERE id = ?', [key]);
    });
  } catch {}
}

export const sqliteAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isSQLiteAvailable()) return null;
    await ensureSQLiteReadyForAuth();
    return await readFromCurrentOrGlobal(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!isSQLiteAvailable()) return;
    await ensureSQLiteReadyForAuth();
    await writeToCurrentAndGlobal(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (!isSQLiteAvailable()) return;
    await ensureSQLiteReadyForAuth();
    await removeFromCurrentAndGlobal(key);
  }
};
