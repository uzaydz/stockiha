import { SupabaseQuery, TableInfo, SimilarQueriesGroup, QueryPerformanceInfo } from './types';

// مخزن الاستعلامات الحالي
export let queryStore: SupabaseQuery[] = [];

// مخزن مجموعات الاستعلامات المتشابهة
export let similarQueriesGroups: SimilarQueriesGroup[] = [];

// معلومات الأداء
export let performanceInfo: QueryPerformanceInfo = {
  totalQueries: 0,
  slowQueries: 0,
  totalQueryTime: 0,
  avgQueryTime: 0,
  similarGroups: [],
  cacheableCandidates: 0,
  potentialTimeSaved: 0,
  recommendations: []
};

// قائمة المستمعين
const queryListeners: Function[] = [];

// مستمع للإبلاغ عن التغييرات في الاستعلامات
export const addQueryListener = (listener: Function) => {
  queryListeners.push(listener);
  return () => removeQueryListener(listener);
};

export const removeQueryListener = (listener: Function) => {
  const index = queryListeners.indexOf(listener);
  if (index !== -1) {
    queryListeners.splice(index, 1);
  }
};

// تنبيه المستمعين عند إضافة استعلام جديد
export const notifyListeners = () => {
  queryListeners.forEach(listener => listener(queryStore));
};

// تحديد ما إذا كانت استعلامات متشابهة بناءً على النمط
export const areSimilarQueries = (query1: SupabaseQuery, query2: SupabaseQuery): boolean => {
  // يجب أن يكون النوع متماثلاً
  if (query1.queryType !== query2.queryType) return false;
  
  // يجب أن يكون الجدول متماثلاً
  if (query1.table !== query2.table) return false;
  
  // تحقق من تماثل الصفوف المحددة
  if (query1.columns && query2.columns) {
    const cols1 = [...query1.columns].sort().join(',');
    const cols2 = [...query2.columns].sort().join(',');
    if (cols1 !== cols2) return false;
  }
  
  // تحقق من هيكل URL متشابه
  const url1Parts = query1.url.split('?')[0];
  const url2Parts = query2.url.split('?')[0];
  if (url1Parts !== url2Parts) return false;
  
  // تحقق من تشابه بنية المرشحات
  // هنا نتحقق فقط من شكل المرشحات، وليس القيم الفعلية
  if (query1.filters && query2.filters) {
    const keys1 = Object.keys(query1.filters).sort().join(',');
    const keys2 = Object.keys(query2.filters).sort().join(',');
    if (keys1 !== keys2) return false;
  }
  
  return true;
};

// إنشاء نمط مشترك للاستعلامات المتشابهة
export const createQueryPattern = (query: SupabaseQuery): string => {
  let pattern = `${query.method} ${query.url.split('?')[0]}`;
  
  if (query.table) {
    pattern += ` TABLE:${query.table}`;
  }
  
  if (query.queryType) {
    pattern += ` TYPE:${query.queryType}`;
  }
  
  if (query.columns && query.columns.length > 0) {
    pattern += ` COLUMNS:[${[...query.columns].sort().join(',')}]`;
  }
  
  if (query.filters) {
    pattern += ` FILTERS:[${Object.keys(query.filters).sort().join(',')}]`;
  }
  
  return pattern;
};

// تحديد مؤشر قابلية التخزين المؤقت (1-10)
export const calculateCacheabilityScore = (query: SupabaseQuery): number => {
  // البداية بدرجة متوسطة
  let score = 5;
  
  // إذا كان الاستعلام من نوع select، فإنه أكثر قابلية للتخزين المؤقت
  if (query.queryType === 'select') {
    score += 2;
  }
  
  // إذا كان الاستعلام من نوع إدخال أو تحديث أو حذف، فهو أقل قابلية للتخزين المؤقت
  if (['insert', 'update', 'delete'].includes(query.queryType || '')) {
    score -= 4;
  }
  
  // الاستعلامات البطيئة تستفيد أكثر من التخزين المؤقت
  if (query.duration > 300) {
    score += 1;
  }
  if (query.duration > 800) {
    score += 1;
  }
  
  // الاستعلامات المعقدة تستفيد أكثر من التخزين المؤقت
  if (query.queryComplexity === 'complex') {
    score += 2;
  } else if (query.queryComplexity === 'medium') {
    score += 1;
  }
  
  // ضمان أن الدرجة ضمن النطاق المطلوب
  return Math.max(1, Math.min(10, score));
};

// تحديد الوقت المناسب للتخزين المؤقت بالثواني
export const suggestCacheTTL = (query: SupabaseQuery): number => {
  // إذا كان الاستعلام من نوع select
  if (query.queryType === 'select') {
    // البيانات الثابتة نسبيًا يمكن تخزينها لفترة أطول
    const url = query.url.toLowerCase();
    
    // تخزين بيانات المنتجات لمدة أطول
    if (url.includes('/products') || url.includes('/categories')) {
      return 3600; // ساعة واحدة
    } 
    
    // تخزين البيانات التي تتغير بشكل متكرر لمدة قصيرة
    if (url.includes('/orders') || url.includes('/users') || url.includes('/transactions')) {
      return 60; // دقيقة واحدة
    }
    
    // للاستعلامات المعقدة، استخدم وقتًا متوسطًا
    if (query.queryComplexity === 'complex') {
      return 300; // 5 دقائق
    }
    
    // الاستعلامات البسيطة يمكن تخزينها لفترة أقصر
    return 120; // دقيقتان افتراضيًا
  }
  
  // لا ينبغي تخزين عمليات الكتابة
  return 0;
};

// تقديم توصية حول التخزين المؤقت
export const getCacheRecommendation = (query: SupabaseQuery, similarCount: number): string => {
  if (query.cacheabilityScore && query.cacheabilityScore >= 7) {
    return `يوصى بشدة بتخزين هذا الاستعلام مؤقتًا. تم العثور على ${similarCount} استعلامات مماثلة، مما يوفر ${Math.round(query.duration * similarCount / 1000)} ثانية من وقت الاستجابة.`;
  } else if (query.cacheabilityScore && query.cacheabilityScore >= 4) {
    return `يمكن تخزين هذا الاستعلام مؤقتًا. تم تشغيله ${similarCount} مرة مع معلمات مماثلة.`;
  } else {
    return `هذا الاستعلام ليس مرشحًا جيدًا للتخزين المؤقت بسبب طبيعته أو معدل تغيير البيانات.`;
  }
};

// وظيفة مساعدة لاستخراج اسم المكون وموقع الملف من مسار التنفيذ
export const extractComponentInfo = () => {
  try {
    // إنشاء كائن خطأ للحصول على مسار التنفيذ
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];
    
    // حاول العثور على سطر يحتوي على اسم المكون
    let componentName = 'Unknown';
    let fileLocation = 'Unknown';
    let lineNumber = 0;
    
    // تخطي أول سطرين (هذه الوظيفة ووظيفة الاستدعاء)
    for (let i = 2; i < stackLines.length; i++) {
      const line = stackLines[i];
      
      // تجاهل الخطوط التي تأتي من المكتبات أو ملفات النظام
      if (line.includes('node_modules') || line.includes('webpack-internal')) {
        continue;
      }
      
      // البحث عن أسماء المكونات التي تتبع نمط React
      const componentMatch = line.match(/at ([A-Z][a-zA-Z0-9_$]+)(?: |\.)/);
      if (componentMatch && componentMatch[1] !== 'Object' && componentMatch[1] !== 'Function') {
        componentName = componentMatch[1];
      }
      
      // استخراج موقع الملف ورقم السطر
      const locationMatch = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
      if (locationMatch) {
        const fullPath = locationMatch[1];
        const pathParts = fullPath.split('/');
        
        // استخراج اسم الملف والمجلد الأخير
        if (pathParts.length >= 2) {
          const fileName = pathParts.pop() || '';
          const folderName = pathParts.pop() || '';
          fileLocation = `${folderName}/${fileName}`;
        } else {
          fileLocation = fullPath;
        }
        
        lineNumber = parseInt(locationMatch[2], 10);
        
        // إذا وجدنا موقعًا واسم مكون، نتوقف
        if (componentName !== 'Unknown') {
          break;
        }
      }
    }
    
    return {
      componentName,
      fileLocation,
      lineNumber,
      stackTrace: err.stack || ''
    };
  } catch (e) {
    return {
      componentName: 'Unknown',
      fileLocation: 'Unknown',
      lineNumber: 0,
      stackTrace: ''
    };
  }
};

// تحليل الاستعلامات المتشابهة وتحديث المجموعات
export const analyzeSimilarQueries = () => {
  // إعادة تعيين مجموعات الاستعلامات
  similarQueriesGroups = [];
  
  // قاموس لتخزين الاستعلامات المعالجة
  const patternMap: Record<string, {
    queries: SupabaseQuery[],
    pattern: string,
    components: Set<string>
  }> = {};
  
  // تجميع الاستعلامات بناءً على النمط
  queryStore.forEach(query => {
    // إنشاء نمط للاستعلام
    const pattern = createQueryPattern(query);
    
    // إذا لم يكن النمط موجودًا بعد، قم بإنشائه
    if (!patternMap[pattern]) {
      patternMap[pattern] = {
        queries: [],
        pattern,
        components: new Set<string>()
      };
    }
    
    // إضافة الاستعلام إلى المجموعة
    patternMap[pattern].queries.push(query);
    
    // إضافة المكون إلى قائمة المكونات إذا كان معروفًا
    if (query.componentName) {
      patternMap[pattern].components.add(query.componentName);
    }
  });
  
  // تحويل المجموعات إلى التنسيق المطلوب
  Object.values(patternMap).forEach(group => {
    // لا تهتم بالمجموعات التي تحوي استعلامًا واحدًا فقط
    if (group.queries.length <= 1) return;
    
    // احسب متوسط وقت الاستجابة
    const totalDuration = group.queries.reduce((total, q) => total + q.duration, 0);
    const avgDuration = totalDuration / group.queries.length;
    
    // استخرج اسم الجدول ونوع الاستعلام
    const tableName = group.queries[0].table;
    const queryType = group.queries[0].queryType || 'unknown';
    
    // استخرج تعقيد الاستعلام
    const complexity = group.queries[0].queryComplexity || 'simple';
    
    // احسب درجة قابلية التخزين المؤقت
    const cacheabilityScore = calculateCacheabilityScore(group.queries[0]);
    
    // تحديد ما إذا كان هذا مرشحًا جيدًا للتخزين المؤقت
    const isCacheable = queryType === 'select' && cacheabilityScore > 3;
    
    // اقترح وقت التخزين المؤقت بناءً على نوع الاستعلام
    const suggestedTTL = isCacheable ? suggestCacheTTL(group.queries[0]) : 0;
    
    // إنشاء مجموعة للاستعلامات المتشابهة
    const similarGroup: SimilarQueriesGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      pattern: group.pattern,
      queryIds: group.queries.map(q => q.id),
      count: group.queries.length,
      components: Array.from(group.components),
      avgDuration,
      queryType,
      tableName,
      complexity: complexity as 'simple' | 'medium' | 'complex',
      cacheability: cacheabilityScore,
      cacheReason: getCacheRecommendation(group.queries[0], group.queries.length),
      suggestedTTL: isCacheable ? suggestedTTL : undefined
    };
    
    // إضافة المجموعة إلى القائمة
    similarQueriesGroups.push(similarGroup);
    
    // تحديث مراجع المجموعة في كل استعلام
    group.queries.forEach(query => {
      // تحديث الاستعلام بمعلومات التخزين المؤقت
      Object.assign(query, {
        similarQueryGroupId: similarGroup.id,
        isCacheable,
        cacheabilityScore,
        suggestedTTL: isCacheable ? suggestedTTL : undefined,
        cacheRecommendation: getCacheRecommendation(query, group.queries.length),
        // تحديد ما إذا كان استعلامًا بطيئًا (أكثر من 500 مللي ثانية)
        isSlowQuery: query.duration > 500,
        // تأثير الأداء بناءً على الوقت وتكرار الاستعلام
        performanceImpact: query.duration > 800 || (query.duration > 300 && group.queries.length > 5) ? 'high' :
                           query.duration > 200 || (query.duration > 100 && group.queries.length > 10) ? 'medium' :
                           'low'
      });
    });
  });
  
  // ترتيب المجموعات حسب عدد الاستعلامات
  similarQueriesGroups.sort((a, b) => b.count - a.count);
  
  // تحديث معلومات الأداء
  updatePerformanceInfo();
  
  return similarQueriesGroups;
};

// تحديث معلومات الأداء
export const updatePerformanceInfo = () => {
  // إجمالي عدد الاستعلامات
  const totalQueries = queryStore.length;
  
  // عدد الاستعلامات البطيئة (>500ms)
  const slowQueries = queryStore.filter(q => q.duration > 500).length;
  
  // إجمالي وقت الاستعلامات
  const totalQueryTime = queryStore.reduce((sum, q) => sum + q.duration, 0);
  
  // متوسط وقت الاستعلام
  const avgQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0;
  
  // عدد الاستعلامات التي يمكن تخزينها مؤقتًا
  const cacheableCandidates = queryStore.filter(q => q.isCacheable).length;
  
  // الوقت المقدر الذي يمكن توفيره بالتخزين المؤقت
  const potentialTimeSaved = similarQueriesGroups.reduce((sum, group) => {
    if (group.cacheability >= 5) {
      // افترض أن المجموعة تحتوي على عدد كبير من الاستعلامات
      // ولكن يمكن توفير وقت الاستعلام لذلك استخدم عدد-1 للحساب
      return sum + (group.avgDuration * (group.count - 1));
    }
    return sum;
  }, 0);
  
  // إنشاء توصيات التحسين
  const recommendations = [];
  
  // توصيات التخزين المؤقت
  const cacheCandidates = similarQueriesGroups
    .filter(g => g.cacheability >= 7)
    .sort((a, b) => (b.count * b.avgDuration) - (a.count * a.avgDuration))
    .slice(0, 3);
  
  if (cacheCandidates.length > 0) {
    recommendations.push({
      type: 'cache' as const,
      description: `يمكن تحسين الأداء بشكل كبير من خلال تخزين النتائج مؤقتًا لـ ${cacheCandidates.length} من أنماط الاستعلامات المتكررة، مما يوفر حوالي ${Math.round(potentialTimeSaved / 1000)} ثانية.`,
      impact: potentialTimeSaved > 10000 ? 'high' : potentialTimeSaved > 3000 ? 'medium' : 'low',
      relatedQueries: cacheCandidates.flatMap(g => g.queryIds)
    });
  }
  
  // توصيات للاستعلامات البطيئة
  const slowQueryIds = queryStore
    .filter(q => q.duration > 800)
    .map(q => q.id);
  
  if (slowQueryIds.length > 0) {
    recommendations.push({
      type: 'optimize' as const,
      description: `تم العثور على ${slowQueryIds.length} استعلامات بطيئة (أكثر من 800 مللي ثانية) قد تستفيد من التحسين.`,
      impact: slowQueryIds.length > 5 ? 'high' : 'medium',
      relatedQueries: slowQueryIds
    });
  }
  
  // تحديث معلومات الأداء
  performanceInfo = {
    totalQueries,
    slowQueries,
    totalQueryTime,
    avgQueryTime,
    similarGroups: similarQueriesGroups,
    cacheableCandidates,
    potentialTimeSaved,
    recommendations
  };
  
  return performanceInfo;
};

// وظيفة لتحديد نوع الاستعلام بناءً على طريقة الاستدعاء والعنوان
export const determineQueryType = (method: string, url: string, table?: string): SupabaseQuery['queryType'] => {
  // التعامل مع الطلبات الخاصة
  if (url.includes('/rpc/')) return 'rpc';
  if (url.includes('/functions/')) return 'function';
  
  // التعامل مع عمليات CRUD
  if (method === 'GET') return 'select';
  if (method === 'POST') return 'insert';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';
  
  return 'unknown';
};

// مسح كل الاستعلامات
export const clearSupabaseQueries = () => {
  queryStore = [];
  similarQueriesGroups = [];
  performanceInfo = {
    totalQueries: 0,
    slowQueries: 0,
    totalQueryTime: 0,
    avgQueryTime: 0,
    similarGroups: [],
    cacheableCandidates: 0,
    potentialTimeSaved: 0,
    recommendations: []
  };
  notifyListeners();
};

// تصدير الاستعلامات كملف JSON
export const exportQueries = () => {
  const dataStr = JSON.stringify(queryStore, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `supabase-queries-${new Date().toISOString()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// وظيفة لتحليل الاستعلام واستخراج معلومات الجداول
export const extractTablesInfo = (query: Omit<SupabaseQuery, 'id' | 'timestamp'>): TableInfo[] => {
  const tables: TableInfo[] = [];
  
  // استخراج اسم الجدول من URL
  let tableName = query.table;
  if (!tableName) {
    const urlParts = query.url.split('/');
    // البحث عن اسم الجدول في URL
    for (let i = 0; i < urlParts.length; i++) {
      if (['items', 'rest', 'v1'].includes(urlParts[i]) && i + 1 < urlParts.length) {
        const potentialTable = urlParts[i + 1].split('?')[0];
        if (potentialTable && !['rpc', 'auth', 'functions'].includes(potentialTable)) {
          tableName = potentialTable;
          break;
        }
      }
    }
  }
  
  // إذا لم نجد اسم الجدول، لا يمكن استخراج المعلومات
  if (!tableName) return tables;
  
  // تحديد نوع العملية
  const operation = query.queryType || determineQueryType(query.method, query.url, tableName);
  
  // تحضير كائن معلومات الجدول
  const tableInfo: TableInfo = {
    name: tableName,
    operation: operation,
    filters: query.filters,
    joins: [], // سيتم ملؤها بناءً على تحليل الاستعلام
    relationshipType: undefined, // سيتم تحديدها إذا تم العثور على علاقات
  };
  
  // تحليل كائن المرشحات لتحديد العلاقات
  if (query.filters) {
    const filterKeys = Object.keys(query.filters);
    
    // البحث عن العلاقات المحتملة (عادةً ما تحتوي على فاصلة سفلية)
    const foreignKeyColumns = filterKeys.filter(key => key.includes('_id') || key.includes('fk_'));
    
    // إذا وجدنا مفاتيح أجنبية محتملة، حاول تحديد الجداول المرتبطة
    if (foreignKeyColumns.length > 0) {
      foreignKeyColumns.forEach(fkColumn => {
        // استخراج اسم الجدول المرتبط من المفتاح الأجنبي
        // مثال: user_id -> users
        let relatedTable = fkColumn.replace('_id', '');
        if (relatedTable.includes('fk_')) {
          relatedTable = relatedTable.replace('fk_', '');
        }
        
        // جمع اسم الجدول (قد نحتاج إلى إضافة 's' للجمع)
        relatedTable = relatedTable.endsWith('s') ? relatedTable : `${relatedTable}s`;
        
        // إضافة العلاقة إلى القائمة
        if (!tableInfo.joins?.includes(relatedTable)) {
          tableInfo.joins?.push(relatedTable);
        }
      });
    }
  }
  
  // تحليل الاستجابة لتحديد عدد الصفوف المتأثرة
  if (query.response) {
    if (Array.isArray(query.response)) {
      tableInfo.affectedRows = query.response.length;
    } else if (typeof query.response === 'object' && query.response !== null) {
      if ('count' in query.response) {
        tableInfo.affectedRows = (query.response as any).count;
      } else if ('rowCount' in query.response) {
        tableInfo.affectedRows = (query.response as any).rowCount;
      }
    }
  }
  
  // إضافة الجدول الرئيسي إلى القائمة
  tables.push(tableInfo);
  
  return tables;
};

// وظيفة لتحديد تعقيد الاستعلام
export const determineQueryComplexity = (query: Omit<SupabaseQuery, 'id' | 'timestamp'>): SupabaseQuery['queryComplexity'] => {
  // الاستعلامات البسيطة
  if (query.queryType === 'insert' || query.queryType === 'delete') {
    // عمليات الإدراج والحذف عادةً ما تكون بسيطة، إلا إذا كانت تتضمن عمليات متعددة
    if (query.body && Array.isArray(query.body) && query.body.length > 10) {
      return 'medium';
    }
    return 'simple';
  }
  
  // الاستعلامات المعقدة
  if (query.tables && query.tables.length > 1) {
    // إذا كان الاستعلام يشمل أكثر من جدول، فهو على الأقل متوسط التعقيد
    return 'complex';
  }
  
  // تحليل التعقيد بناءً على عدد المرشحات
  if (query.filters) {
    const filterCount = Object.keys(query.filters).length;
    
    if (filterCount > 5) {
      return 'complex';
    } else if (filterCount > 2) {
      return 'medium';
    }
  }
  
  // تحليل التعقيد بناءً على إذا كان الاستعلام يتضمن علاقات
  if (query.tables && query.tables[0] && query.tables[0].joins && query.tables[0].joins.length > 0) {
    if (query.tables[0].joins.length > 2) {
      return 'complex';
    } else {
      return 'medium';
    }
  }
  
  // افتراضيًا، الاستعلام بسيط
  return 'simple';
};
