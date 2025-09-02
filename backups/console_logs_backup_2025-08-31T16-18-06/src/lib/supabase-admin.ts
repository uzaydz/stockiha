// This file intentionally left to throw on client usage of admin to prevent leaking service role.
export const getSupabaseAdmin = () => {
  throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
};

export const supabaseAdmin = new Proxy({} as any, {
  get() {
    throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
  }
});

export const cleanupAdminClient = () => {};
export const executeAdminOperation = async () => {
  throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
};
export const executeAdminRPC = async () => {
  throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
};
export const executeAdminQuery = async () => {
  throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
};
export const createAdminRequest = async () => {
  throw new Error('supabase-admin is server-only. Use /api endpoints instead.');
};
export const getTables = async () => { return []; };
export const executeRawQuery = async () => { return []; };
export const getTableIndexes = async () => { return []; };
export const getTableColumns = async () => { return []; };
