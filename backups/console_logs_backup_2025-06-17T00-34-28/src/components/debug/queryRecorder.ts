import { SupabaseQuery } from './types';
import { 
  queryStore, 
  notifyListeners, 
  extractComponentInfo, 
  determineQueryType, 
  extractTablesInfo,
  determineQueryComplexity,
  analyzeSimilarQueries
} from './queryAnalytics';

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
  const queryIndex = queryStore.findIndex(q => q.id === id);
  if (queryIndex >= 0) {
    queryStore[queryIndex] = {
      ...queryStore[queryIndex],
      ...updates
    };
    notifyListeners();
  }
};
