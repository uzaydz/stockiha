import { SupabaseQuery, SimilarQueriesGroup, QueryPerformanceInfo } from './types';
import { queryStore, similarQueriesGroups, performanceInfo } from './queryAnalytics';

/**
 * نوع يحدد البيانات التي سيتم تصديرها
 */
export interface ExportOptions {
  // ما إذا كان سيتم تصدير الاستعلامات الأصلية
  includeRawQueries?: boolean;
  // ما إذا كان سيتم تصدير البيانات المفصلة للاستعلامات
  includeQueryDetails?: boolean;
  // ما إذا كان سيتم تصدير الاستجابات (يمكن أن تكون كبيرة)
  includeResponses?: boolean;
  // ما إذا كان سيتم تصدير مسارات التنفيذ (يمكن أن تكون كبيرة)
  includeStackTraces?: boolean;
  // ما إذا كان سيتم تصدير المجموعات المتشابهة
  includeSimilarGroups?: boolean;
  // ما إذا كان سيتم تصدير إحصائيات الأداء
  includePerformanceInfo?: boolean;
  // حد أقصى لعدد الاستعلامات للتصدير
  queryLimit?: number;
  // تصدير الاستعلامات بناءً على النوع فقط
  filterByQueryType?: string[];
  // تصدير الاستعلامات بناءً على المكون فقط
  filterByComponent?: string[];
  // تصدير الاستعلامات بناءً على الجدول فقط
  filterByTable?: string[];
  // ما إذا كان سيتم تصدير الاستعلامات البطيئة فقط (أكثر من 500 مللي ثانية)
  onlySlowQueries?: boolean;
  // ما إذا كان سيتم تصدير الاستعلامات القابلة للتخزين المؤقت فقط
  onlyCacheableCandidates?: boolean;
}

/**
 * الخيارات الافتراضية للتصدير - استخدام خيارات معقولة للحد من حجم الملف
 */
const defaultExportOptions: ExportOptions = {
  includeRawQueries: true,
  includeQueryDetails: true,
  includeResponses: false,
  includeStackTraces: false,
  includeSimilarGroups: true,
  includePerformanceInfo: true,
  queryLimit: 100,
  onlySlowQueries: false,
  onlyCacheableCandidates: false
};

/**
 * وظيفة لتصدير بيانات الاستعلامات بتنسيق مختصر ومفيد
 * @param options خيارات التصدير
 * @returns بيانات التصدير
 */
export function prepareExportData(options: ExportOptions = {}): any {
  // دمج الخيارات المقدمة مع الخيارات الافتراضية
  const exportOptions = { ...defaultExportOptions, ...options };
  
  // كائن البيانات المصدرة
  const exportData: any = {
    exportDate: new Date().toISOString(),
    exportOptions: exportOptions,
    summary: {
      totalQueries: queryStore.length,
      slowQueries: queryStore.filter(q => q.duration > 500).length,
      averageQueryTime: queryStore.length > 0 ? 
        queryStore.reduce((sum, q) => sum + q.duration, 0) / queryStore.length :
        0
    }
  };
  
  // تصدير الاستعلامات الأصلية إذا كان مطلوباً
  if (exportOptions.includeRawQueries) {
    // تطبيق المرشحات على الاستعلامات
    let filteredQueries = [...queryStore];
    
    // تطبيق مرشح النوع
    if (exportOptions.filterByQueryType && exportOptions.filterByQueryType.length > 0) {
      filteredQueries = filteredQueries.filter(q => 
        exportOptions.filterByQueryType?.includes(q.queryType || 'unknown')
      );
    }
    
    // تطبيق مرشح المكون
    if (exportOptions.filterByComponent && exportOptions.filterByComponent.length > 0) {
      filteredQueries = filteredQueries.filter(q => 
        exportOptions.filterByComponent?.includes(q.componentName || 'unknown')
      );
    }
    
    // تطبيق مرشح الجدول
    if (exportOptions.filterByTable && exportOptions.filterByTable.length > 0) {
      filteredQueries = filteredQueries.filter(q => 
        exportOptions.filterByTable?.includes(q.table || '')
      );
    }
    
    // تطبيق مرشح الاستعلامات البطيئة
    if (exportOptions.onlySlowQueries) {
      filteredQueries = filteredQueries.filter(q => q.duration > 500);
    }
    
    // تطبيق مرشح القابلية للتخزين المؤقت
    if (exportOptions.onlyCacheableCandidates) {
      filteredQueries = filteredQueries.filter(q => q.isCacheable);
    }
    
    // تطبيق الحد الأقصى
    if (exportOptions.queryLimit && exportOptions.queryLimit > 0) {
      filteredQueries = filteredQueries.slice(0, exportOptions.queryLimit);
    }
    
    // تحويل الاستعلامات إلى شكل مبسط إذا لزم الأمر
    exportData.queries = filteredQueries.map(query => {
      if (!exportOptions.includeQueryDetails) {
        // نسخة مبسطة من الاستعلام
        return {
          id: query.id,
          method: query.method,
          url: query.url,
          table: query.table,
          duration: query.duration,
          queryType: query.queryType,
          timestamp: query.timestamp
        };
      }
      
      // نسخة كاملة مع تجاهل الحقول الكبيرة إذا لزم الأمر
      const cleanedQuery = { ...query };
      
      if (!exportOptions.includeResponses) {
        delete cleanedQuery.response;
      }
      
      if (!exportOptions.includeStackTraces) {
        delete cleanedQuery.stackTrace;
      }
      
      return cleanedQuery;
    });
  }
  
  // تصدير مجموعات الاستعلامات المتشابهة
  if (exportOptions.includeSimilarGroups) {
    exportData.similarGroups = similarQueriesGroups;
  }
  
  // تصدير معلومات الأداء
  if (exportOptions.includePerformanceInfo) {
    exportData.performanceInfo = performanceInfo;
  }
  
  return exportData;
}

/**
 * تصدير البيانات إلى ملف JSON
 * @param options خيارات التصدير
 */
export function exportQueriesData(options: ExportOptions = {}): void {
  const exportData = prepareExportData(options);
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  // اسم الملف يعكس نوع التصدير
  let exportName = 'supabase-queries';
  
  if (options.onlySlowQueries) {
    exportName += '-slow';
  }
  
  if (options.onlyCacheableCandidates) {
    exportName += '-cacheable';
  }
  
  if (options.filterByQueryType) {
    exportName += `-${options.filterByQueryType.join('-')}`;
  }
  
  const exportFileDefaultName = `${exportName}-${new Date().toISOString()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

/**
 * تحليل شامل يقوم بإجراء جميع الاستدعاءات مرة واحدة
 * ويعيد نتائج كاملة عن حالة الاستعلامات في التطبيق
 */
export function performComprehensiveAnalysis() {
  // ملخص سريع حول الاستعلامات
  const queryCount = queryStore.length;
  const slowQueryCount = queryStore.filter(q => q.duration > 500).length;
  const averageQueryTime = queryStore.length > 0 ? 
    queryStore.reduce((sum, q) => sum + q.duration, 0) / queryStore.length : 0;
  
  // حساب استخدام الجداول
  const tableUsage: Record<string, { count: number, totalDuration: number, avgDuration: number }> = {};
  queryStore.forEach(query => {
    if (query.table) {
      if (!tableUsage[query.table]) {
        tableUsage[query.table] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      tableUsage[query.table].count++;
      tableUsage[query.table].totalDuration += query.duration;
    }
  });
  
  // حساب متوسط وقت الاستعلام لكل جدول
  Object.keys(tableUsage).forEach(table => {
    tableUsage[table].avgDuration = tableUsage[table].totalDuration / tableUsage[table].count;
  });
  
  // الجداول الأكثر استخداماً
  const mostUsedTables = Object.entries(tableUsage)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([table, stats]) => ({
      table,
      count: stats.count,
      averageDuration: stats.avgDuration
    }));
  
  // الجداول الأبطأ
  const slowestTables = Object.entries(tableUsage)
    .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
    .slice(0, 5)
    .map(([table, stats]) => ({
      table,
      count: stats.count,
      averageDuration: stats.avgDuration
    }));
  
  // حساب استخدام المكونات
  const componentUsage: Record<string, number> = {};
  queryStore.forEach(query => {
    if (query.componentName) {
      componentUsage[query.componentName] = (componentUsage[query.componentName] || 0) + 1;
    }
  });
  
  // المكونات الأكثر استخداماً للاستعلامات
  const mostActiveComponents = Object.entries(componentUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([component, count]) => ({
      component,
      count
    }));
  
  // استخراج أبطأ الاستعلامات
  const slowestQueries = [...queryStore]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(query => ({
      id: query.id,
      method: query.method,
      url: query.url,
      table: query.table,
      duration: query.duration,
      queryType: query.queryType,
      componentName: query.componentName
    }));
  
  // استخراج الاستعلامات الأكثر تكراراً (بناءً على similarQueriesGroups)
  const mostRepeatedQueries = [...similarQueriesGroups]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // اقتراحات التحسين
  const optimizationSuggestions = [];
  
  // اقتراح: تجميع الاستعلامات المتكررة
  if (mostRepeatedQueries.length > 0 && mostRepeatedQueries[0].count > 5) {
    optimizationSuggestions.push({
      type: 'batch_queries',
      description: `يمكن تحسين أداء التطبيق بتجميع ${mostRepeatedQueries[0].count} استعلامات من نوع ${mostRepeatedQueries[0].queryType} على جدول ${mostRepeatedQueries[0].tableName || 'غير معروف'}.`,
      impact: 'high'
    });
  }
  
  // اقتراح: إضافة التخزين المؤقت للاستعلامات المتكررة
  const cacheableCandidates = similarQueriesGroups.filter(g => g.cacheability >= 7).length;
  if (cacheableCandidates > 0) {
    optimizationSuggestions.push({
      type: 'add_caching',
      description: `يمكن تحسين الأداء بإضافة التخزين المؤقت لـ ${cacheableCandidates} من أنماط الاستعلامات التي تتكرر بشكل كبير.`,
      impact: 'high'
    });
  }
  
  // اقتراح: تحسين الاستعلامات البطيئة
  if (slowQueryCount > 3) {
    optimizationSuggestions.push({
      type: 'optimize_slow_queries',
      description: `تم العثور على ${slowQueryCount} استعلامات بطيئة تستغرق أكثر من 500 مللي ثانية. يمكن تحسين هذه الاستعلامات لتسريع الأداء العام.`,
      impact: 'medium'
    });
  }
  
  // تجميع نتائج التحليل
  return {
    summary: {
      timestamp: new Date().toISOString(),
      totalQueries: queryCount,
      slowQueries: slowQueryCount,
      averageQueryTime,
      cacheableCandidates,
      similarQueryGroups: similarQueriesGroups.length
    },
    tableUsage: {
      mostUsed: mostUsedTables,
      slowest: slowestTables
    },
    componentUsage: {
      mostActive: mostActiveComponents
    },
    performance: {
      slowestQueries,
      mostRepeatedQueries
    },
    optimizationSuggestions
  };
}

/**
 * تصدير نتائج التحليل الشامل إلى ملف JSON
 */
export function exportComprehensiveAnalysis(): void {
  const analysisResults = performComprehensiveAnalysis();
  const dataStr = JSON.stringify(analysisResults, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `supabase-analysis-${new Date().toISOString()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
