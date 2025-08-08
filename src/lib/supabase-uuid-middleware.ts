import { safeUuidOrNull } from '@/utils/uuid-helpers';

/**
 * Middleware لتنظيف معاملات UUID قبل إرسالها إلى Supabase
 */
export function createSafeSupabaseQuery(supabaseClient: any) {
  // إنشاء proxy للـ client الأساسي
  return new Proxy(supabaseClient, {
    get(target, prop) {
      if (prop === 'from') {
        return function(tableName: string) {
          const table = target.from(tableName);
          
          // إنشاء proxy للـ table query
          return new Proxy(table, {
            get(tableTarget, tableProp) {
              if (tableProp === 'eq') {
                return function(column: string, value: any) {
                  // تنظيف قيم UUID
                  if (column.includes('id') || column.includes('_id')) {
                    const cleanValue = safeUuidOrNull(value);
                    if (cleanValue === null && value !== null) {
                      // إذا كانت القيمة undefined أو غير صالحة، نرجع query فارغ
                      return tableTarget.eq(column, 'never-match-this-uuid-value-12345');
                    }
                    return tableTarget.eq(column, cleanValue);
                  }
                  return tableTarget.eq(column, value);
                };
              }
              
              return tableTarget[tableProp];
            }
          });
        };
      }
      
      return target[prop];
    }
  });
}

/**
 * دالة مساعدة لتنظيف معاملات RPC
 */
export function cleanRpcParams(params: Record<string, any>): Record<string, any> {
  const cleaned = { ...params };
  
  Object.keys(cleaned).forEach(key => {
    if (key.includes('id') || key.includes('_id')) {
      cleaned[key] = safeUuidOrNull(cleaned[key]);
    }
  });
  
  return cleaned;
}
