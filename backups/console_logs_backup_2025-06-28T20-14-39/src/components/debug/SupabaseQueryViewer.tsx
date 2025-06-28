import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, X, Download } from "lucide-react";

// تعريف كائن لعرض معلومات الجدول
export interface TableInfo {
  name: string; // اسم الجدول
  operation: string; // نوع العملية (select, insert, update, delete)
  filters?: Record<string, any>; // محددات البحث
  joins?: string[]; // الجداول المرتبطة
  relationshipType?: 'one-to-one' | 'one-to-many' | 'many-to-many'; // نوع العلاقة
  affectedRows?: number; // عدد الصفوف المتأثرة
}

// نوع لتمثيل مجموعة استعلامات متشابهة
export interface SimilarQueriesGroup {
  // معرف المجموعة
  id: string;
  // نمط الاستعلام المشترك
  pattern: string;
  // قائمة بمعرفات الاستعلامات المتشابهة
  queryIds: string[];
  // إجمالي عدد الاستعلامات المتشابهة
  count: number;
  // المكونات التي تستخدم هذا النمط
  components: string[];
  // متوسط زمن الاستجابة
  avgDuration: number;
  // نوع الاستعلام
  queryType: string;
  // الجدول الرئيسي
  tableName?: string;
  // تعقيد الاستعلام
  complexity: 'simple' | 'medium' | 'complex';
  // مؤشر إمكانية التخزين المؤقت (من 1-10)
  cacheability: number;
  // سبب إمكانية التخزين المؤقت
  cacheReason: string;
  // الوقت المقترح للتخزين المؤقت (بالثواني)
  suggestedTTL?: number;
}

// معلومات الأداء المتعلقة بالاستعلامات
export interface QueryPerformanceInfo {
  // عدد الاستعلامات الكلي
  totalQueries: number;
  // عدد الاستعلامات البطيئة (>500ms)
  slowQueries: number;
  // إجمالي وقت الاستعلامات
  totalQueryTime: number;
  // متوسط وقت الاستعلام
  avgQueryTime: number;
  // قائمة بالمجموعات المتشابهة
  similarGroups: SimilarQueriesGroup[];
  // عدد الاستعلامات التي يمكن تخزينها مؤقتًا
  cacheableCandidates: number;
  // الوقت المقدر الذي يمكن توفيره بالتخزين المؤقت
  potentialTimeSaved: number;
  // توصيات لتحسين الأداء
  recommendations: Array<{
    type: 'cache' | 'index' | 'optimize' | 'refactor';
    description: string;
    impact: 'high' | 'medium' | 'low';
    relatedQueries: string[];
  }>;
}

// نوع لتمثيل استعلام Supabase
export type SupabaseQuery = {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  table?: string;
  columns?: string[];
  filters?: Record<string, any>;
  body?: any;
  response?: any;
  duration: number;
  error?: any;
  // معلومات إضافية
  componentName?: string; // اسم المكون المسؤول عن الاستعلام
  stackTrace?: string; // مسار التنفيذ
  queryType?: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'function' | 'unknown'; // نوع الاستعلام
  fileLocation?: string; // موقع الملف
  lineNumber?: number; // رقم السطر
  // معلومات قاعدة البيانات
  tables?: TableInfo[]; // معلومات الجداول المشاركة
  queryComplexity?: 'simple' | 'medium' | 'complex'; // تعقيد الاستعلام
  cacheHit?: boolean; // هل تم العثور على النتيجة في ذاكرة التخزين المؤقت
  // معلومات التخزين المؤقت
  similarQueryGroupId?: string; // معرف مجموعة الاستعلامات المتشابهة
  isCacheable?: boolean; // هل يمكن تخزين هذا الاستعلام مؤقتًا
  cacheabilityScore?: number; // درجة إمكانية التخزين المؤقت
  suggestedTTL?: number; // الوقت المقترح للتخزين المؤقت (بالثواني)
  cacheRecommendation?: string; // توصيات حول التخزين المؤقت
  // معلومات الأداء
  isSlowQuery?: boolean; // هل هذا استعلام بطيء
  performanceImpact?: 'high' | 'medium' | 'low'; // تأثير الأداء
  optimizationSuggestion?: string; // اقتراحات لتحسين الأداء
};

// متغيرات عالمية لتخزين الاستعلامات
let queryStore: SupabaseQuery[] = [];
let queryListeners: Function[] = [];

// مخزن مجموعات الاستعلامات المتشابهة
let similarQueriesGroups: SimilarQueriesGroup[] = [];

// معلومات الأداء
let performanceInfo: QueryPerformanceInfo = {
  totalQueries: 0,
  slowQueries: 0,
  totalQueryTime: 0,
  avgQueryTime: 0,
  similarGroups: [],
  cacheableCandidates: 0,
  potentialTimeSaved: 0,
  recommendations: []
};

// مستمع للإبلاغ عن التغييرات في الاستعلامات
const addQueryListener = (listener: Function) => {
  queryListeners.push(listener);
  return () => removeQueryListener(listener);
};

const removeQueryListener = (listener: Function) => {
  queryListeners = queryListeners.filter(l => l !== listener);
};

// تنبيه المستمعين عند إضافة استعلام جديد
const notifyListeners = () => {
  queryListeners.forEach(listener => listener(queryStore));
};

// تحديد ما إذا كانت استعلامات متشابهة بناءً على النمط
const areSimilarQueries = (query1: SupabaseQuery, query2: SupabaseQuery): boolean => {
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
const createQueryPattern = (query: SupabaseQuery): string => {
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
const calculateCacheabilityScore = (query: SupabaseQuery): number => {
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
const suggestCacheTTL = (query: SupabaseQuery): number => {
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
const getCacheRecommendation = (query: SupabaseQuery, similarCount: number): string => {
  if (query.cacheabilityScore && query.cacheabilityScore >= 7) {
    return `يوصى بشدة بتخزين هذا الاستعلام مؤقتًا. تم العثور على ${similarCount} استعلامات مماثلة، مما يوفر ${Math.round(query.duration * similarCount / 1000)} ثانية من وقت الاستجابة.`;
  } else if (query.cacheabilityScore && query.cacheabilityScore >= 4) {
    return `يمكن تخزين هذا الاستعلام مؤقتًا. تم تشغيله ${similarCount} مرة مع معلمات مماثلة.`;
  } else {
    return `هذا الاستعلام ليس مرشحًا جيدًا للتخزين المؤقت بسبب طبيعته أو معدل تغيير البيانات.`;
  }
};

// وظيفة مساعدة لاستخراج اسم المكون وموقع الملف من مسار التنفيذ
const extractComponentInfo = () => {
  try {
    // إنشاء مسار التنفيذ الكامل
    const error = new Error();
    const stack = error.stack || '';
    
    // تحليل مسار التنفيذ لاستخراج معلومات مفيدة
    const stackLines = stack.split('\n').slice(3); // تجاهل السطور التي تخص هذه الدالة
    
    // بحث عن أول مكون React في مسار التنفيذ
    let componentName = 'Unknown';
    let fileLocation = '';
    let lineNumber = 0;
    
    // محاولة العثور على مكون React في مسار التنفيذ
    // معظم المكونات تظهر باسم يبدأ بحرف كبير
    for (const line of stackLines) {
      // البحث عن أنماط معينة تشير إلى مكونات React
      const componentMatch = line.match(/at ([A-Z][a-zA-Z0-9]+|use[A-Z][a-zA-Z0-9]+)/); 
      if (componentMatch && componentMatch[1]) {
        componentName = componentMatch[1];
        
        // استخراج موقع الملف ورقم السطر
        const locationMatch = line.match(/\(([^:]+):(\d+):(\d+)\)/); 
        if (locationMatch) {
          fileLocation = locationMatch[1];
          // استخراج اسم الملف فقط بدون المسار الكامل
          fileLocation = fileLocation.split('/').pop() || fileLocation;
          lineNumber = parseInt(locationMatch[2], 10);
        }
        break;
      } 
      
      // إذا لم نجد مكونًا، فلنبحث عن أي مسار ملف لتوفير بعض المعلومات المفيدة
      const pathMatch = line.match(/\(([^:]+):(\d+):(\d+)\)/); 
      if (pathMatch && !fileLocation) {
        const fullPath = pathMatch[1];
        if (fullPath.includes('/src/')) {
          fileLocation = fullPath.split('/').pop() || fullPath;
          lineNumber = parseInt(pathMatch[2], 10);
          // إذا لم نجد اسم مكون، نستخدم اسم الملف كبديل
          if (componentName === 'Unknown' && fileLocation) {
            const fileNameWithoutExt = fileLocation.replace(/\.[^/.]+$/, "");
            if (fileNameWithoutExt.match(/^[A-Z]/)) {
              componentName = fileNameWithoutExt;
            }
          }
        }
      }
    }
    
    return {
      componentName,
      fileLocation,
      lineNumber,
      stackTrace: stackLines.slice(0, 5).join('\n') // نقتصر على أول 5 أسطر فقط لتجنب السجل الطويل جدًا
    };
  } catch (err) {
    // في حالة الخطأ، لا نريد أن يؤثر هذا على الوظائف الأساسية
    return {
      componentName: 'Unknown',
      fileLocation: '',
      lineNumber: 0,
      stackTrace: ''
    };
  }
};

// وظيفة لتحديد نوع الاستعلام بناءً على طريقة الاستدعاء والعنوان
const determineQueryType = (method: string, url: string, table?: string): SupabaseQuery['queryType'] => {
  if (table?.startsWith('rpc:')) return 'rpc';
  if (table?.startsWith('function:')) return 'function';
  
  if (method === 'GET') return 'select';
  if (method === 'POST') return 'insert';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';
  
  return 'unknown';
};

// وظيفة لتحليل الاستعلام واستخراج معلومات الجداول
const extractTablesInfo = (query: Omit<SupabaseQuery, 'id' | 'timestamp'>): TableInfo[] => {
  const tables: TableInfo[] = [];
  const queryType = query.queryType || determineQueryType(query.method, query.url, query.table);
  
  // إذا كان لدينا جدول محدد
  if (query.table && !query.table.startsWith('rpc:') && !query.table.startsWith('function:')) {
    const mainTable: TableInfo = {
      name: query.table,
      operation: queryType as string
    };
    
    // إضافة معلومات المرشحات إن وجدت
    if (query.filters) {
      mainTable.filters = query.filters;
    }
    
    // تحديد عدد الصفوف المتأثرة من الاستجابة
    if (query.response) {
      if (Array.isArray(query.response)) {
        mainTable.affectedRows = query.response.length;
      } else if (query.response.data && Array.isArray(query.response.data)) {
        mainTable.affectedRows = query.response.data.length;
      } else if (query.response.count !== undefined) {
        mainTable.affectedRows = query.response.count;
      }
    }
    
    tables.push(mainTable);
    
    // تحليل URL لاستخراج معلومات join (الطريقة المبسطة)
    const url = query.url.toLowerCase();
    if (url.includes('join') || (query.body && JSON.stringify(query.body).includes('join'))) {
      // إذا كان لدينا علاقة join، نحاول استخراج الجداول المرتبطة
      mainTable.joins = [];
      
      // البحث عن الجداول المذكورة في العمود
      const selectStatement = (query.columns || []).join(' ');
      // البحث عن أنماط مثل table_name.column_name
      const tablePattern = /([a-zA-Z0-9_]+)\./g;
      let match;
      
      while ((match = tablePattern.exec(selectStatement)) !== null) {
        const tableName = match[1];
        if (tableName !== query.table && !mainTable.joins?.includes(tableName)) {
          mainTable.joins.push(tableName);
        }
      }
    }
  }
  
  // إن لم نتمكن من تحديد الجدول من المعلومات السابقة، فلنحاول استخراجه من URL
  if (tables.length === 0 && query.url) {
    // استخراج اسم الجدول من URL مثل /rest/v1/table_name
    const urlParts = query.url.split('/');
    const restIndex = urlParts.findIndex(part => part === 'rest');
    
    if (restIndex >= 0 && restIndex + 2 < urlParts.length) {
      const tableName = urlParts[restIndex + 2];
      if (tableName && tableName !== 'rpc') {
        tables.push({
          name: tableName,
          operation: queryType as string
        });
      }
    }
  }
  
  return tables;
};

// وظيفة لتحديد تعقيد الاستعلام
const determineQueryComplexity = (query: Omit<SupabaseQuery, 'id' | 'timestamp'>): SupabaseQuery['queryComplexity'] => {
  // استعلام معقد إذا كان يحتوي على join أو تجميع أو ترتيب معقد
  const bodyStr = JSON.stringify(query.body || {}).toLowerCase();
  const url = query.url.toLowerCase();
  const columnsStr = (query.columns || []).join(' ').toLowerCase();
  
  if (
    url.includes('join') || 
    bodyStr.includes('join') || 
    url.includes('group') || 
    bodyStr.includes('group by') ||
    url.includes('order') && url.includes('nulls') ||
    (query.tables && query.tables.some(t => t.joins && t.joins.length > 1)) ||
    columnsStr.includes('count(') ||
    columnsStr.includes('sum(') ||
    columnsStr.includes('avg(')
  ) {
    return 'complex';
  }
  
  // استعلام متوسط إذا كان يحتوي على مرشحات متعددة
  if (
    (query.filters && Object.keys(query.filters).length > 1) ||
    url.includes('in.') ||
    url.includes('or') ||
    bodyStr.includes('in.') ||
    bodyStr.includes('or') ||
    (query.tables && query.tables.some(t => t.joins && t.joins.length === 1))
  ) {
    return 'medium';
  }
  
  // استعلام بسيط
  return 'simple';
};

// تسجيل استعلام جديد مع معلومات عن المكون المستدعي والجداول
export const recordSupabaseQuery = (query: Omit<SupabaseQuery, 'id' | 'timestamp'>, manualComponentName?: string) => {
  // استخراج معلومات المكون من مسار التنفيذ
  const componentInfo = extractComponentInfo();
  
  // تحديد نوع الاستعلام
  const queryType = determineQueryType(query.method, query.url, query.table);
  
  // استخراج معلومات الجداول
  const tables = extractTablesInfo({
    ...query,
    queryType
  });
  
  // تحديد تعقيد الاستعلام
  const queryComplexity = determineQueryComplexity({
    ...query,
    queryType,
    tables
  });
  
  // محاولة تحديد اسم المكون من URL الاستعلام إذا لم يتم تحديده
  let derivedComponentName = componentInfo.componentName;
  
  if (manualComponentName) {
    // إذا تم توفير اسم مكون يدويًا
    derivedComponentName = manualComponentName;
  } else if (derivedComponentName === 'Unknown' || derivedComponentName === 'Proxy') {
    // محاولة استنتاج المكون من URL
    const url = query.url.toLowerCase();
    
    // المسارات المعروفة
    if (url.includes('/orders')) {
      derivedComponentName = 'Orders';
    } else if (url.includes('/products')) {
      derivedComponentName = 'Products';
    } else if (url.includes('/customers')) {
      derivedComponentName = 'Customers';
    } else if (url.includes('/dashboard')) {
      derivedComponentName = 'Dashboard';
    } else if (url.includes('/settings')) {
      derivedComponentName = 'Settings';
    } else if (url.includes('/store')) {
      derivedComponentName = 'StoreFront';
    }
    
    // إذا كان لدينا جدول معروف، يمكننا استخدامه لتخمين المكون
    if (derivedComponentName === 'Unknown' || derivedComponentName === 'Proxy') {
      if (tables.length > 0) {
        const tableName = tables[0].name;
        // تحويل اسم الجدول إلى صيغة Pascal Case
        derivedComponentName = tableName.split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
      }
    }
  }
  
  const newQuery: SupabaseQuery = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date(),
    ...query,
    // إضافة معلومات المكون
    componentName: derivedComponentName,
    fileLocation: componentInfo.fileLocation,
    lineNumber: componentInfo.lineNumber,
    stackTrace: componentInfo.stackTrace,
    queryType,
    // إضافة معلومات الجداول والتعقيد
    tables,
    queryComplexity
  };
  
  queryStore.push(newQuery);
  
  // تحليل الاستعلامات المتشابهة كل 5 استعلامات أو عندما يكون عدد الاستعلامات مضاعف 5
  if (queryStore.length % 5 === 0) {
    // تحليل الاستعلامات المتشابهة وتحديث توصيات التخزين المؤقت
    analyzeSimilarQueries();
  }
  
  notifyListeners();
  return newQuery.id;
};

// تحديث استعلام موجود (لإضافة الاستجابة)
export const updateSupabaseQuery = (id: string, updates: Partial<SupabaseQuery>) => {
  const index = queryStore.findIndex(q => q.id === id);
  if (index !== -1) {
    queryStore[index] = { ...queryStore[index], ...updates };
    notifyListeners();
  }
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

// تحليل الاستعلامات المتشابهة وتحديث المجموعات
const analyzeSimilarQueries = () => {
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
const updatePerformanceInfo = () => {
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
      type: 'cache',
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
      type: 'optimize',
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

// تصدير الاستعلامات كملف JSON
const exportQueries = () => {
  const dataStr = JSON.stringify(queryStore, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportName = `supabase-queries-${new Date().toISOString().slice(0, 19)}.json`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportName);
  linkElement.click();
};

// مكون عرض القيمة كـ JSON
const JsonView = ({ data }: { data: any }) => {
  if (!data) return null;
  
  return (
    <pre className="text-xs overflow-x-auto p-2 bg-muted rounded-md">
      {typeof data === 'object' 
        ? JSON.stringify(data, null, 2) 
        : String(data)
      }
    </pre>
  );
};

// مكون لعرض معلومات الجدول
const TableInfoViewer = ({ tables }: { tables: TableInfo[] }) => {
  if (!tables || tables.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium mb-1">الجداول المستخدمة:</div>
      <div className="space-y-2">
        {tables.map((table, index) => (
          <div key={index} className="bg-muted/50 p-2 rounded-md border border-muted">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary/20 text-primary">
                {table.name}
              </Badge>
              <Badge variant="outline">
                {table.operation}
              </Badge>
              {table.affectedRows !== undefined && (
                <span className="text-xs">
                  <span className="text-muted-foreground">عدد الصفوف: </span>
                  <span className="font-medium">{table.affectedRows}</span>
                </span>
              )}
            </div>
            
            {table.joins && table.joins.length > 0 && (
              <div className="mb-1">
                <span className="text-xs text-muted-foreground mr-1">الجداول المرتبطة:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {table.joins.map((join, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-secondary/20">
                      {join}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {table.filters && Object.keys(table.filters).length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">المرشحات:</span>
                <JsonView data={table.filters} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// مكون لعرض إحصائيات الاستعلامات
const QueryStats = ({ queries }: { queries: SupabaseQuery[] }) => {
  // حساب متوسط وقت الاستجابة
  const avgResponseTime = queries.length > 0 
    ? Math.round(queries.reduce((sum, q) => sum + q.duration, 0) / queries.length) 
    : 0;

  // عدد الاستعلامات حسب النوع
  const queryTypeCount = queries.reduce((acc, query) => {
    const type = query.queryType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // عدد الاستعلامات حسب المكون
  const queryByComponent = queries.reduce((acc, query) => {
    const component = query.componentName || 'Unknown';
    acc[component] = (acc[component] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">إحصائيات الاستعلامات</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>إجمالي الاستعلامات:</span>
              <span className="font-medium">{queries.length}</span>
            </div>
            <div className="flex justify-between">
              <span>متوسط وقت الاستجابة:</span>
              <span className="font-medium">{avgResponseTime} ms</span>
            </div>
            <div className="flex justify-between">
              <span>أسرع استعلام:</span>
              <span className="font-medium">
                {queries.length > 0 ? Math.min(...queries.map(q => q.duration)) : 0} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>أبطأ استعلام:</span>
              <span className="font-medium">
                {queries.length > 0 ? Math.max(...queries.map(q => q.duration)) : 0} ms
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">حسب نوع الاستعلام</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="text-xs space-y-1">
            {Object.entries(queryTypeCount).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span>{type}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">حسب المكون</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4 max-h-[120px] overflow-y-auto">
          <div className="text-xs space-y-1">
            {Object.entries(queryByComponent)
              .sort((a, b) => b[1] - a[1])
              .map(([component, count]) => (
                <div key={component} className="flex justify-between">
                  <span className="truncate max-w-[150px]">{component}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// تحديد لون العلامة بناءً على نوع الاستعلام
const getQueryTypeColor = (type?: string) => {
  switch (type) {
    case 'select': return 'bg-blue-500';
    case 'insert': return 'bg-green-500';
    case 'update': return 'bg-amber-500';
    case 'delete': return 'bg-red-500';
    case 'rpc': return 'bg-purple-500';
    case 'function': return 'bg-teal-500';
    default: return 'bg-gray-500';
  }
};

// المكون الرئيسي لعرض الاستعلامات
const SupabaseQueryViewer = () => {
  const [queries, setQueries] = useState<SupabaseQuery[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showStats, setShowStats] = useState(true);
  const [filterText, setFilterText] = useState('');
  
  // الاشتراك في تحديثات الاستعلامات
  useEffect(() => {
    const updateQueries = (newQueries: SupabaseQuery[]) => {
      setQueries([...newQueries]);
    };
    
    addQueryListener(updateQueries);
    return () => removeQueryListener(updateQueries);
  }, []);
  
  // توسيع/تقليص استعلام
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // تحديد لون العلامة بناءً على نوع الطريقة
  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'bg-blue-500';
      case 'post': return 'bg-green-500';
      case 'put': return 'bg-amber-500';
      case 'delete': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // تصفية الاستعلامات بناءً على النص
  const filteredQueries = queries.filter(query => {
    if (!filterText) return true;
    const searchText = filterText.toLowerCase();
    
    return (
      (query.table && query.table.toLowerCase().includes(searchText)) ||
      (query.url && query.url.toLowerCase().includes(searchText)) ||
      (query.method && query.method.toLowerCase().includes(searchText)) ||
      (query.componentName && query.componentName.toLowerCase().includes(searchText)) ||
      (query.fileLocation && query.fileLocation.toLowerCase().includes(searchText))
    );
  });
  
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-bold">مراقب استعلامات Supabase</CardTitle>
          <Badge className="ml-2">{queries.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStats(!showStats)}
            title={showStats ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
          >
            {showStats ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportQueries}
            title="تصدير الاستعلامات"
          >
            <Download className="h-4 w-4 ml-1" />
            تصدير
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearSupabaseQueries}
            title="مسح الاستعلامات"
          >
            <X className="h-4 w-4 ml-1" />
            مسح
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* عرض الإحصائيات */}
        {showStats && queries.length > 0 && <QueryStats queries={queries} />}

        {/* مربع البحث */}
        {queries.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="بحث في الاستعلامات..."
              className="w-full p-2 border rounded-md text-sm"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        )}

        {queries.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            لم يتم تسجيل أي استعلامات حتى الآن.
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            لا توجد نتائج تطابق معايير البحث.
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredQueries.map((query) => (
                <Collapsible 
                  key={query.id} 
                  open={expanded[query.id]} 
                  onOpenChange={() => toggleExpand(query.id)}
                  className="border rounded-md p-2"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getMethodColor(query.method)}>
                          {query.method}
                        </Badge>
                        <Badge variant="outline" className={getQueryTypeColor(query.queryType)}>
                          {query.queryType || 'unknown'}
                        </Badge>
                        <span className="font-medium truncate max-w-[150px]">
                          {query.table || query.url.split('/').pop() || 'استعلام'}
                        </span>
                        {query.error && (
                          <Badge variant="destructive">خطأ</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {query.componentName && (
                          <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {query.componentName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {query.duration}ms
                        </span>
                        <Code2 className="h-4 w-4" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-2">
                      {/* معلومات المكون */}
                      {(query.componentName || query.fileLocation) && (
                        <div className="bg-muted p-2 rounded-md">
                          <div className="text-sm font-medium mb-1">معلومات المكون:</div>
                          <div className="text-xs space-y-1">
                            {query.componentName && (
                              <div>
                                <span className="font-medium">المكون: </span>
                                <span>{query.componentName}</span>
                              </div>
                            )}
                            {query.fileLocation && (
                              <div>
                                <span className="font-medium">الملف: </span>
                                <span>{query.fileLocation}</span>
                                {query.lineNumber > 0 && ` (السطر: ${query.lineNumber})`}
                              </div>
                            )}
                            {query.queryComplexity && (
                              <div>
                                <span className="font-medium">تعقيد الاستعلام: </span>
                                <Badge 
                                  variant="outline"
                                  className={`
                                    ${query.queryComplexity === 'simple' ? 'bg-green-100 text-green-700' : ''}
                                    ${query.queryComplexity === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                                    ${query.queryComplexity === 'complex' ? 'bg-red-100 text-red-700' : ''}
                                  `}
                                >
                                  {query.queryComplexity === 'simple' ? 'بسيط' : ''}
                                  {query.queryComplexity === 'medium' ? 'متوسط' : ''}
                                  {query.queryComplexity === 'complex' ? 'معقد' : ''}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* مسار التنفيذ */}
                      {query.stackTrace && (
                        <div>
                          <div className="text-sm font-medium mb-1">مسار التنفيذ:</div>
                          <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap">
                            {query.stackTrace}
                          </pre>
                        </div>
                      )}

                      {/* عرض معلومات الجداول */}
                      {query.tables && query.tables.length > 0 && (
                        <TableInfoViewer tables={query.tables} />
                      )}

                      <div>
                        <div className="text-sm font-medium mb-1">عنوان URL:</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {query.url}
                        </div>
                      </div>
                      
                      {query.columns && query.columns.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">الأعمدة:</div>
                          <div className="flex flex-wrap gap-1">
                            {query.columns.map((col, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {col}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {query.filters && Object.keys(query.filters).length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">المرشحات:</div>
                          <JsonView data={query.filters} />
                        </div>
                      )}
                      
                      {query.body && (
                        <div>
                          <div className="text-sm font-medium mb-1">محتوى الطلب:</div>
                          <JsonView data={query.body} />
                        </div>
                      )}
                      
                      {query.response && (
                        <div>
                          <div className="text-sm font-medium mb-1">الاستجابة:</div>
                          <JsonView data={query.response} />
                        </div>
                      )}
                      
                      {query.error && (
                        <div>
                          <div className="text-sm font-medium mb-1 text-destructive">الخطأ:</div>
                          <JsonView data={query.error} />
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground text-left mt-2">
                        {new Date(query.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseQueryViewer;
