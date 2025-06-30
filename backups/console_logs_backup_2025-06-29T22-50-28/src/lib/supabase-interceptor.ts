import { SupabaseClient } from '@supabase/supabase-js';
import { recordSupabaseQuery, updateSupabaseQuery } from '@/components/debug/queryRecorder';

// تخزين الطرق الأصلية للكائن الحالي
const originalMethods: Record<string, Function> = {};

/**
 * اعتراض طلبات الاستعلام من Supabase
 * @param client عميل Supabase
 */
export const interceptSupabaseQueries = (client: SupabaseClient) => {
  // لا نريد تطبيق الاعتراض مرتين
  if (originalMethods['from']) {
    return client;
  }

  // حفظ طرق السوبابيس الأصلية
  originalMethods['from'] = client.from;
  originalMethods['rpc'] = client.rpc;
  originalMethods['functions'] = client.functions.invoke;

  // اعتراض طريقة from
  client.from = function (table: string) {
    const originalResult = originalMethods['from'].call(this, table);
    const originalSelect = originalResult.select;
    const originalInsert = originalResult.insert;
    const originalUpdate = originalResult.update;
    const originalDelete = originalResult.delete;
    
    // اعتراض select
    originalResult.select = function (...args: any[]) {
      const selectResult = originalSelect.apply(this, args);
      const originalThen = selectResult.then;
      
      // تسجيل المعلومات الأولية حول الاستعلام
      const queryId = recordSupabaseQuery({
        method: 'GET',
        url: `/rest/v1/${table}`,
        table,
        columns: typeof args[0] === 'string' ? args[0].split(',').map(s => s.trim()) : undefined,
        duration: 0
      });
      
      const startTime = performance.now();
      
      // اعتراض عملية then لتسجيل الاستجابة
      selectResult.then = function (onFulfilled: any, onRejected: any) {
        return originalThen.call(this, 
          (response: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              response,
              duration: Math.round(duration)
            });
            return onFulfilled?.(response);
          },
          (error: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              error,
              duration: Math.round(duration)
            });
            return onRejected?.(error);
          }
        );
      };
      
      return selectResult;
    };
    
    // اعتراض insert
    originalResult.insert = function (values: any, options?: any) {
      const insertResult = originalInsert.apply(this, [values, options]);
      const originalThen = insertResult.then;
      
      const queryId = recordSupabaseQuery({
        method: 'POST',
        url: `/rest/v1/${table}`,
        table,
        body: values,
        duration: 0
      });
      
      const startTime = performance.now();
      
      insertResult.then = function (onFulfilled: any, onRejected: any) {
        return originalThen.call(this, 
          (response: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              response,
              duration: Math.round(duration)
            });
            return onFulfilled?.(response);
          },
          (error: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              error,
              duration: Math.round(duration)
            });
            return onRejected?.(error);
          }
        );
      };
      
      return insertResult;
    };
    
    // اعتراض update
    originalResult.update = function (values: any, options?: any) {
      const updateResult = originalUpdate.apply(this, [values, options]);
      const originalThen = updateResult.then;
      
      const queryId = recordSupabaseQuery({
        method: 'PUT',
        url: `/rest/v1/${table}`,
        table,
        body: values,
        duration: 0
      });
      
      const startTime = performance.now();
      
      updateResult.then = function (onFulfilled: any, onRejected: any) {
        return originalThen.call(this, 
          (response: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              response,
              duration: Math.round(duration)
            });
            return onFulfilled?.(response);
          },
          (error: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              error,
              duration: Math.round(duration)
            });
            return onRejected?.(error);
          }
        );
      };
      
      return updateResult;
    };
    
    // اعتراض delete
    originalResult.delete = function (options?: any) {
      const deleteResult = originalDelete.apply(this, [options]);
      const originalThen = deleteResult.then;
      
      const queryId = recordSupabaseQuery({
        method: 'DELETE',
        url: `/rest/v1/${table}`,
        table,
        duration: 0
      });
      
      const startTime = performance.now();
      
      deleteResult.then = function (onFulfilled: any, onRejected: any) {
        return originalThen.call(this, 
          (response: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              response,
              duration: Math.round(duration)
            });
            return onFulfilled?.(response);
          },
          (error: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              error,
              duration: Math.round(duration)
            });
            return onRejected?.(error);
          }
        );
      };
      
      return deleteResult;
    };
    
    // اعتراض الطرق الأخرى مثل eq, neq, gt, lt, إلخ
    const filterMethods = [
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is',
      'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt',
      'rangeLte', 'rangeAdjacent', 'overlaps', 'not', 'or', 'filter'
    ];
    
    filterMethods.forEach(method => {
      const originalMethod = originalResult[method];
      if (typeof originalMethod === 'function') {
        originalResult[method] = function (...args: any[]) {
          const queryResult = originalMethod.apply(this, args);
          // هنا يمكننا تتبع المرشحات المستخدمة، لكن لن نضيف ذلك الآن للبساطة
          return queryResult;
        };
      }
    });
    
    return originalResult;
  };
  
  // اعتراض طريقة rpc لإجراءات قاعدة البيانات
  client.rpc = function (fnName: string, params?: any) {
    const rpcResult = originalMethods['rpc'].call(this, fnName, params);
    const originalThen = rpcResult.then;
    
    const queryId = recordSupabaseQuery({
      method: 'POST',
      url: `/rest/v1/rpc/${fnName}`,
      table: `rpc:${fnName}`,
      body: params,
      duration: 0
    });
    
    const startTime = performance.now();
    
    rpcResult.then = function (onFulfilled: any, onRejected: any) {
      return originalThen.call(this, 
        (response: any) => {
          const duration = performance.now() - startTime;
          updateSupabaseQuery(queryId, {
            response,
            duration: Math.round(duration)
          });
          return onFulfilled?.(response);
        },
        (error: any) => {
          const duration = performance.now() - startTime;
          updateSupabaseQuery(queryId, {
            error,
            duration: Math.round(duration)
          });
          return onRejected?.(error);
        }
      );
    };
    
    return rpcResult;
  };
  
  // اعتراض طريقة functions.invoke
  if (client.functions) {
    const originalInvoke = client.functions.invoke;
    client.functions.invoke = function (fnName: string, options?: any) {
      const result = originalInvoke.call(this, fnName, options);
      const originalThen = result.then;
      
      const queryId = recordSupabaseQuery({
        method: 'POST',
        url: `/functions/v1/${fnName}`,
        table: `function:${fnName}`,
        body: options?.body,
        duration: 0
      });
      
      const startTime = performance.now();
      
      result.then = function (onFulfilled: any, onRejected: any) {
        return originalThen.call(this, 
          (response: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              response,
              duration: Math.round(duration)
            });
            return onFulfilled?.(response);
          },
          (error: any) => {
            const duration = performance.now() - startTime;
            updateSupabaseQuery(queryId, {
              error,
              duration: Math.round(duration)
            });
            return onRejected?.(error);
          }
        );
      };
      
      return result;
    };
  }
  
  return client;
};
