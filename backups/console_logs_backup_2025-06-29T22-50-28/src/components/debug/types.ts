// تعريف كائن لعرض معلومات الجدول
export interface TableInfo {
  name: string; // اسم الجدول
  operation: string; // نوع العملية (select, insert, update, etc.)
  filters?: Record<string, any>; // المرشحات المستخدمة
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
