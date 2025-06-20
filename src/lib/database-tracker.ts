// Database Tracker - تتبع شامل لجميع عمليات قاعدة البيانات
import { supabase } from './supabase-unified';
import { queryRecorder } from './query-recorder';

export interface DatabaseQuery {
  id: string;
  timestamp: number;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'RPC';
  query: string;
  filters?: any;
  orderBy?: any;
  limit?: number;
  offset?: number;
  columns?: string[];
  values?: any;
  duration?: number;
  rowCount?: number;
  error?: any;
  status: 'pending' | 'success' | 'error';
  executionPlan?: string;
  affectedRows?: number;
  returnedData?: any;
  cacheHit?: boolean;
  querySize?: number;
  responseSize?: number;
  // معلومات المصدر
  source: {
    component?: string;
    file?: string;
    line?: number;
    stackTrace?: string;
  };
  // تحليل الاستعلام
  analysis?: {
    complexity: 'simple' | 'moderate' | 'complex';
    hasJoins: boolean;
    hasSubqueries: boolean;
    hasAggregations: boolean;
    indexesUsed: string[];
    potentialIssues: string[];
  };
}

export interface TableStats {
  tableName: string;
  totalQueries: number;
  selectCount: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: number;
  estimatedRowCount?: number;
  indexCount?: number;
  dataSize?: number;
}

class DatabaseTracker {
  private queries: Map<string, DatabaseQuery> = new Map();
  private tableStats: Map<string, TableStats> = new Map();
  private listeners: Set<(query: DatabaseQuery) => void> = new Set();
  private duplicateQueries: Map<string, DatabaseQuery[]> = new Map();
  private slowQueries: DatabaseQuery[] = [];
  private isTracking: boolean = false;
  private originalSupabaseClient: any;

  constructor() {
    this.setupInterceptors();
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    console.log('Database tracking started');
  }

  stopTracking() {
    this.isTracking = false;
    console.log('Database tracking stopped');
  }

  private setupInterceptors() {
    // حفظ النسخة الأصلية من العميل
    this.originalSupabaseClient = { ...supabase };
    
    // اعتراض جميع عمليات Supabase
    this.interceptTableOperations();
    this.interceptRpcOperations();
    this.interceptAuthOperations();
  }

  private interceptTableOperations() {
    const self = this;
    
    // اعتراض from() method
    const originalFrom = supabase.from.bind(supabase);
    
    (supabase as any).from = function(table: string) {
      const query = originalFrom(table);
      const queryId = self.generateQueryId();
      const startTime = performance.now();
      const source = self.getCallSource();
      
      // تسجيل بداية الاستعلام
      const dbQuery: DatabaseQuery = {
        id: queryId,
        timestamp: Date.now(),
        table,
        operation: 'SELECT', // افتراضي، سيتم تحديثه
        query: '',
        status: 'pending',
        source
      };
      
      // اعتراض العمليات المختلفة
      const interceptMethod = (method: string, operation: DatabaseQuery['operation']) => {
        const original = query[method].bind(query);
        query[method] = function(...args: any[]) {
          dbQuery.operation = operation;
          dbQuery.values = args[0];
          
          if (method === 'select') {
            dbQuery.columns = args[0] ? args[0].split(',').map((c: string) => c.trim()) : ['*'];
          }
          
          return original(...args);
        };
      };
      
      interceptMethod('select', 'SELECT');
      interceptMethod('insert', 'INSERT');
      interceptMethod('update', 'UPDATE');
      interceptMethod('delete', 'DELETE');
      interceptMethod('upsert', 'UPSERT');
      
      // اعتراض الفلاتر
      const interceptFilter = (method: string) => {
        const original = query[method].bind(query);
        query[method] = function(...args: any[]) {
          if (!dbQuery.filters) dbQuery.filters = [];
          dbQuery.filters.push({ method, args });
          return original(...args);
        };
      };
      
      ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'contains', 'containedBy', 'is', 'filter'].forEach(interceptFilter);
      
      // اعتراض الترتيب والحد
      const originalOrder = query.order.bind(query);
      query.order = function(...args: any[]) {
        dbQuery.orderBy = args;
        return originalOrder(...args);
      };
      
      const originalLimit = query.limit.bind(query);
      query.limit = function(limit: number) {
        dbQuery.limit = limit;
        return originalLimit(limit);
      };
      
      const originalOffset = query.offset?.bind(query);
      if (originalOffset) {
        query.offset = function(offset: number) {
          dbQuery.offset = offset;
          return originalOffset(offset);
        };
      }
      
      // اعتراض التنفيذ النهائي
      const interceptExecution = () => {
        const methods = ['then', 'single', 'maybeSingle'];
        
        methods.forEach(method => {
          if (query[method]) {
            const original = query[method].bind(query);
            query[method] = async function(...args: any[]) {
              // بناء الاستعلام الكامل
              dbQuery.query = self.buildQueryString(dbQuery);
              
              // تحليل تعقيد الاستعلام
              dbQuery.analysis = self.analyzeQuery(dbQuery);
              
              // حساب حجم الاستعلام
              dbQuery.querySize = new Blob([dbQuery.query]).size;
              
              // إضافة إلى القائمة
              self.addQuery(dbQuery);
              
              try {
                const result = await original(...args);
                const endTime = performance.now();
                
                // تحديث معلومات الاستعلام
                dbQuery.duration = endTime - startTime;
                dbQuery.status = 'success';
                
                if (result) {
                  if (result.data) {
                    dbQuery.rowCount = Array.isArray(result.data) ? result.data.length : 1;
                    dbQuery.returnedData = result.data;
                    dbQuery.responseSize = new Blob([JSON.stringify(result.data)]).size;
                  }
                  
                  if (result.error) {
                    dbQuery.status = 'error';
                    dbQuery.error = result.error;
                  }
                }
                
                // تحديث الاستعلام
                self.updateQuery(dbQuery);
                
                // تحليل الاستعلامات البطيئة
                if (dbQuery.duration > 1000) {
                  self.slowQueries.push(dbQuery);
                }
                
                // تحديث إحصائيات الجدول
                self.updateTableStats(dbQuery);
                
                return result;
              } catch (error) {
                const endTime = performance.now();
                
                dbQuery.duration = endTime - startTime;
                dbQuery.status = 'error';
                dbQuery.error = error;
                
                self.updateQuery(dbQuery);
                self.updateTableStats(dbQuery);
                
                throw error;
              }
            };
          }
        });
      };
      
      // تأجيل اعتراض التنفيذ للسماح بإضافة المزيد من العمليات
      setTimeout(interceptExecution, 0);
      
      return query;
    };
  }

  private interceptRpcOperations() {
    const self = this;
    
    if (supabase.rpc) {
      const originalRpc = supabase.rpc.bind(supabase);
      
      (supabase as any).rpc = async function(fn: string, params?: any) {
        const queryId = self.generateQueryId();
        const startTime = performance.now();
        const source = self.getCallSource();
        
        const dbQuery: DatabaseQuery = {
          id: queryId,
          timestamp: Date.now(),
          table: `function:${fn}`,
          operation: 'RPC',
          query: `CALL ${fn}(${JSON.stringify(params)})`,
          values: params,
          status: 'pending',
          source,
          querySize: new Blob([JSON.stringify(params || {})]).size
        };
        
        self.addQuery(dbQuery);
        
        try {
          const result = await originalRpc(fn, params);
          const endTime = performance.now();
          
          dbQuery.duration = endTime - startTime;
          dbQuery.status = 'success';
          
          if (result.data) {
            dbQuery.returnedData = result.data;
            dbQuery.rowCount = Array.isArray(result.data) ? result.data.length : 1;
            dbQuery.responseSize = new Blob([JSON.stringify(result.data)]).size;
          }
          
          if (result.error) {
            dbQuery.status = 'error';
            dbQuery.error = result.error;
          }
          
          self.updateQuery(dbQuery);
          
          return result;
        } catch (error) {
          const endTime = performance.now();
          
          dbQuery.duration = endTime - startTime;
          dbQuery.status = 'error';
          dbQuery.error = error;
          
          self.updateQuery(dbQuery);
          
          throw error;
        }
      };
    }
  }

  private interceptAuthOperations() {
    const self = this;
    
    if (supabase.auth) {
      // اعتراض عمليات المصادقة الأساسية
      const authMethods = ['signIn', 'signUp', 'signOut', 'resetPasswordForEmail', 'updateUser'];
      
      authMethods.forEach(method => {
        if ((supabase.auth as any)[method]) {
          const original = (supabase.auth as any)[method].bind(supabase.auth);
          
          (supabase.auth as any)[method] = async function(...args: any[]) {
            const queryId = self.generateQueryId();
            const startTime = performance.now();
            const source = self.getCallSource();
            
            const dbQuery: DatabaseQuery = {
              id: queryId,
              timestamp: Date.now(),
              table: 'auth',
              operation: 'RPC',
              query: `auth.${method}()`,
              status: 'pending',
              source
            };
            
            self.addQuery(dbQuery);
            
            try {
              const result = await original(...args);
              const endTime = performance.now();
              
              dbQuery.duration = endTime - startTime;
              dbQuery.status = 'success';
              
              self.updateQuery(dbQuery);
              
              return result;
            } catch (error) {
              const endTime = performance.now();
              
              dbQuery.duration = endTime - startTime;
              dbQuery.status = 'error';
              dbQuery.error = error;
              
              self.updateQuery(dbQuery);
              
              throw error;
            }
          };
        }
      });
    }
  }

  private buildQueryString(query: DatabaseQuery): string {
    let sql = `${query.operation} `;
    
    if (query.operation === 'SELECT') {
      sql += query.columns?.join(', ') || '*';
      sql += ` FROM ${query.table}`;
      
      if (query.filters && query.filters.length > 0) {
        sql += ' WHERE ';
        sql += query.filters.map((f: any) => `${f.method}(${f.args.join(', ')})`).join(' AND ');
      }
      
      if (query.orderBy) {
        sql += ` ORDER BY ${query.orderBy.join(', ')}`;
      }
      
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }
      
      if (query.offset) {
        sql += ` OFFSET ${query.offset}`;
      }
    } else if (query.operation === 'INSERT') {
      sql += `INTO ${query.table} VALUES ${JSON.stringify(query.values)}`;
    } else if (query.operation === 'UPDATE') {
      sql += `${query.table} SET ${JSON.stringify(query.values)}`;
      if (query.filters) {
        sql += ' WHERE ' + query.filters.map((f: any) => `${f.method}(${f.args.join(', ')})`).join(' AND ');
      }
    } else if (query.operation === 'DELETE') {
      sql += `FROM ${query.table}`;
      if (query.filters) {
        sql += ' WHERE ' + query.filters.map((f: any) => `${f.method}(${f.args.join(', ')})`).join(' AND ');
      }
    }
    
    return sql;
  }

  private analyzeQuery(query: DatabaseQuery) {
    const analysis: DatabaseQuery['analysis'] = {
      complexity: 'simple',
      hasJoins: false,
      hasSubqueries: false,
      hasAggregations: false,
      indexesUsed: [],
      potentialIssues: []
    };
    
    // تحليل التعقيد
    if (query.filters && query.filters.length > 3) {
      analysis.complexity = 'moderate';
    }
    
    if (query.filters && query.filters.length > 5) {
      analysis.complexity = 'complex';
    }
    
    // التحقق من المشاكل المحتملة
    if (!query.limit && query.operation === 'SELECT') {
      analysis.potentialIssues.push('لا يوجد حد للنتائج - قد يؤدي إلى استرجاع بيانات كثيرة');
    }
    
    if (query.operation === 'DELETE' && (!query.filters || query.filters.length === 0)) {
      analysis.potentialIssues.push('حذف بدون شروط - سيحذف جميع السجلات!');
    }
    
    if (query.operation === 'UPDATE' && (!query.filters || query.filters.length === 0)) {
      analysis.potentialIssues.push('تحديث بدون شروط - سيحدث جميع السجلات!');
    }
    
    // التحقق من استخدام LIKE
    if (query.filters) {
      const hasLike = query.filters.some((f: any) => f.method === 'like' || f.method === 'ilike');
      if (hasLike) {
        analysis.potentialIssues.push('استخدام LIKE قد يكون بطيئاً على البيانات الكبيرة');
      }
    }
    
    return analysis;
  }

  private getCallSource() {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('database-tracker') && 
          !line.includes('node_modules') &&
          !line.includes('supabase')) {
        
        const match = line.match(/at\s+(?:(.+?)\s+)?\((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            component: match[1] || 'anonymous',
            file: match[2],
            line: parseInt(match[3]),
            stackTrace: stack
          };
        }
      }
    }
    
    return { stackTrace: stack };
  }

  private generateQueryId(): string {
    return `db-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private addQuery(query: DatabaseQuery) {
    if (!this.isTracking) return;
    
    this.queries.set(query.id, query);
    this.notifyListeners(query);
    
    // تسجيل في queryRecorder
    queryRecorder.recordQuery({
      id: query.id,
      method: query.operation,
      table: query.table,
      query: query.query,
      timestamp: query.timestamp,
      component: query.source.component || 'unknown',
      filePath: query.source.file,
      duration: 0,
      status: 'pending'
    });
    
    // البحث عن الاستعلامات المكررة
    this.checkForDuplicates(query);
  }

  private updateQuery(query: DatabaseQuery) {
    if (!this.isTracking) return;
    
    this.queries.set(query.id, query);
    this.notifyListeners(query);
    
    // تحديث في queryRecorder
    queryRecorder.updateQuery(query.id, {
      duration: query.duration || 0,
      status: query.status,
      response: query.returnedData,
      error: query.error
    });
  }

  private checkForDuplicates(query: DatabaseQuery) {
    const key = `${query.operation}-${query.table}-${JSON.stringify(query.filters)}-${JSON.stringify(query.orderBy)}`;
    
    if (!this.duplicateQueries.has(key)) {
      this.duplicateQueries.set(key, []);
    }
    
    const duplicates = this.duplicateQueries.get(key)!;
    
    // التحقق من الاستعلامات في آخر 5 ثواني
    const recentDuplicates = duplicates.filter(q => 
      query.timestamp - q.timestamp < 5000
    );
    
    if (recentDuplicates.length > 0) {
      query.analysis = query.analysis || {
        complexity: 'simple',
        hasJoins: false,
        hasSubqueries: false,
        hasAggregations: false,
        indexesUsed: [],
        potentialIssues: []
      };
      
      query.analysis.potentialIssues.push(
        `استعلام مكرر - تم تنفيذه ${recentDuplicates.length} مرة في آخر 5 ثواني`
      );
    }
    
    duplicates.push(query);
  }

  private updateTableStats(query: DatabaseQuery) {
    const stats = this.tableStats.get(query.table) || {
      tableName: query.table,
      totalQueries: 0,
      selectCount: 0,
      insertCount: 0,
      updateCount: 0,
      deleteCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastAccessed: Date.now()
    };
    
    stats.totalQueries++;
    stats.lastAccessed = Date.now();
    
    // تحديث عدد العمليات
    switch (query.operation) {
      case 'SELECT':
        stats.selectCount++;
        break;
      case 'INSERT':
        stats.insertCount++;
        break;
      case 'UPDATE':
        stats.updateCount++;
        break;
      case 'DELETE':
        stats.deleteCount++;
        break;
    }
    
    // تحديث متوسط وقت الاستجابة
    if (query.duration) {
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.totalQueries - 1) + query.duration) / 
        stats.totalQueries;
    }
    
    // تحديث معدل الأخطاء
    const errorCount = Array.from(this.queries.values())
      .filter(q => q.table === query.table && q.status === 'error').length;
    stats.errorRate = (errorCount / stats.totalQueries) * 100;
    
    this.tableStats.set(query.table, stats);
  }

  private notifyListeners(query: DatabaseQuery) {
    this.listeners.forEach(listener => listener(query));
  }

  // واجهة عامة
  addListener(listener: (query: DatabaseQuery) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (query: DatabaseQuery) => void) {
    this.listeners.delete(listener);
  }

  getQueries(): DatabaseQuery[] {
    return Array.from(this.queries.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getTableStats(): TableStats[] {
    return Array.from(this.tableStats.values())
      .sort((a, b) => b.totalQueries - a.totalQueries);
  }

  getSlowQueries(threshold: number = 1000): DatabaseQuery[] {
    return Array.from(this.queries.values())
      .filter(q => q.duration && q.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  getDuplicateQueries(): Map<string, DatabaseQuery[]> {
    const result = new Map<string, DatabaseQuery[]>();
    
    this.duplicateQueries.forEach((queries, key) => {
      if (queries.length > 1) {
        result.set(key, queries);
      }
    });
    
    return result;
  }

  getQueryById(id: string): DatabaseQuery | undefined {
    return this.queries.get(id);
  }

  clearQueries() {
    this.queries.clear();
    this.duplicateQueries.clear();
    this.slowQueries = [];
  }

  // تحليل الأداء
  analyzePerformance() {
    const queries = this.getQueries();
    const tableStats = this.getTableStats();
    const slowQueries = this.getSlowQueries();
    const duplicates = this.getDuplicateQueries();
    
    const totalQueries = queries.length;
    const errorQueries = queries.filter(q => q.status === 'error').length;
    const averageResponseTime = queries
      .filter(q => q.duration)
      .reduce((sum, q) => sum + (q.duration || 0), 0) / totalQueries || 0;
    
    const issues = [];
    const recommendations = [];
    
    // تحليل المشاكل
    if (errorQueries > totalQueries * 0.1) {
      issues.push({
        type: 'error',
        message: `معدل أخطاء مرتفع: ${((errorQueries / totalQueries) * 100).toFixed(2)}%`
      });
      recommendations.push('تحقق من اتصال قاعدة البيانات وصحة الاستعلامات');
    }
    
    if (slowQueries.length > 0) {
      issues.push({
        type: 'warning',
        message: `${slowQueries.length} استعلام بطيء (> 1 ثانية)`
      });
      recommendations.push('قم بتحسين الاستعلامات البطيئة وأضف فهارس إذا لزم الأمر');
    }
    
    if (duplicates.size > 0) {
      issues.push({
        type: 'warning',
        message: `${duplicates.size} مجموعة من الاستعلامات المكررة`
      });
      recommendations.push('استخدم التخزين المؤقت لتجنب الاستعلامات المكررة');
    }
    
    // التحقق من الجداول الأكثر استخداماً
    const hottestTable = tableStats[0];
    if (hottestTable && hottestTable.totalQueries > totalQueries * 0.5) {
      issues.push({
        type: 'info',
        message: `الجدول "${hottestTable.tableName}" يستقبل ${hottestTable.totalQueries} استعلام (${((hottestTable.totalQueries / totalQueries) * 100).toFixed(2)}% من المجموع)`
      });
      recommendations.push(`فكر في تحسين أداء الجدول "${hottestTable.tableName}" أو توزيع الحمل`);
    }
    
    return {
      summary: {
        totalQueries,
        errorQueries,
        errorRate: (errorQueries / totalQueries) * 100,
        averageResponseTime,
        slowQueries: slowQueries.length,
        duplicateGroups: duplicates.size,
        tablesAccessed: tableStats.length
      },
      tableStats,
      slowQueries: slowQueries.slice(0, 10),
      duplicates: Array.from(duplicates.entries()).slice(0, 10),
      issues,
      recommendations
    };
  }
}

// إنشاء مثيل واحد
export const databaseTracker = new DatabaseTracker();

// بدء التتبع تلقائياً في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  databaseTracker.startTracking();
}