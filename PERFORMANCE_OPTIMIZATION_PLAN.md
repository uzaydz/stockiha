# 🚀 خطة تحسين الأداء الشاملة - محرر المتجر وإعدادات المتجر

## 🔍 تحليل المشاكل المكتشفة

### ❌ المشاكل الحرجة

#### 1. **StoreSettings.tsx**
- إعادة تحميل الصفحة بالكامل بعد كل حفظ
- تحديثات DOM يدوية متكررة
- عدم استخدام debouncing للحفظ
- تنظيف cache غير ضروري
- استعلامات متزامنة متعددة

#### 2. **ImprovedStoreEditor.tsx**
- حلقات لا نهائية في useEffect
- حفظ المكونات واحد تلو الآخر (140 استعلام منفصل!)
- مسح cache مفرط بعد كل تحديث
- عدم استخدام batch operations
- تحويلات نوع مكررة

#### 3. **useOrganizationSettings Hook**
- إدارة cache يدوية معقدة
- debouncing غير فعال (300ms)
- عدم استخدام React Query
- استعلامات متكررة للبيانات نفسها

#### 4. **useStoreComponents Hook**
- تحويل أنواع المكونات عدة مرات
- عدم استخدام optimistic updates
- جلب جميع البيانات في كل مرة
- عدم استخدام pagination

#### 5. **قاعدة البيانات**
- فهارس مكررة (5 فهارس على organization_id)
- سجل واحد بحجم 427KB في settings
- عدم تحسين الاستعلامات
- عدم استخدام materialized views

---

## 🎯 الحلول المقترحة

### المرحلة 1: تحسين قاعدة البيانات (أولوية عالية)

#### أ. تنظيف الفهارس المكررة
```sql
-- حذف الفهارس المكررة
DROP INDEX IF EXISTS idx_store_settings_org_id;
DROP INDEX IF EXISTS idx_store_settings_organization_id;

-- الاحتفاظ بالفهارس المحسنة فقط
-- idx_store_settings_org_component (مركب)
-- store_settings_org_component_unique (فريد)
-- idx_store_settings_active_ordered (مشروط)
```

#### ب. تحسين دالة get_store_settings
```sql
CREATE OR REPLACE FUNCTION get_store_settings_optimized(
  p_organization_id UUID,
  p_public_access BOOLEAN DEFAULT false,
  p_component_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  settings JSONB,
  is_active BOOLEAN,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    -- ضغط البيانات الكبيرة
    CASE 
      WHEN octet_length(ss.settings::text) > 50000 THEN
        jsonb_build_object('compressed', true, 'size', octet_length(ss.settings::text))
      ELSE ss.settings
    END as settings,
    ss.is_active,
    ss.order_index
  FROM store_settings ss
  WHERE ss.organization_id = p_organization_id
    AND (p_public_access = false OR ss.is_active = true)
    AND (p_component_types IS NULL OR ss.component_type = ANY(p_component_types))
  ORDER BY ss.order_index ASC;
END;
$$ LANGUAGE plpgsql;
```

#### ج. إنشاء materialized view للبيانات المتكررة
```sql
CREATE MATERIALIZED VIEW mv_organization_store_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  os.site_name,
  os.logo_url,
  os.theme_primary_color,
  COUNT(ss.id) as components_count,
  COUNT(CASE WHEN ss.is_active THEN 1 END) as active_components_count,
  MAX(ss.updated_at) as last_component_update
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id
LEFT JOIN store_settings ss ON o.id = ss.organization_id
GROUP BY o.id, o.name, os.site_name, os.logo_url, os.theme_primary_color;

-- فهرس للعرض المادي
CREATE UNIQUE INDEX ON mv_organization_store_summary (organization_id);

-- تحديث تلقائي
CREATE OR REPLACE FUNCTION refresh_store_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_store_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### المرحلة 2: تحسين Hooks (أولوية عالية)

#### أ. useOrganizationSettings محسن
```typescript
// استخدام React Query بدلاً من إدارة cache يدوية
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useOrganizationSettingsOptimized = (organizationId: string) => {
  const queryClient = useQueryClient();
  
  // جلب البيانات مع cache ذكي
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: () => getOrganizationSettings(organizationId),
    staleTime: 5 * 60 * 1000, // 5 دقائق
    cacheTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    enabled: !!organizationId
  });

  // تحديث محسن مع optimistic updates
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<OrganizationSettings>) => 
      updateOrganizationSettings(organizationId, updates),
    onMutate: async (updates) => {
      // إلغاء الاستعلامات الجارية
      await queryClient.cancelQueries(['organization-settings', organizationId]);
      
      // حفظ البيانات السابقة
      const previousSettings = queryClient.getQueryData(['organization-settings', organizationId]);
      
      // تحديث optimistic
      queryClient.setQueryData(['organization-settings', organizationId], (old: any) => ({
        ...old,
        ...updates
      }));
      
      return { previousSettings };
    },
    onError: (err, updates, context) => {
      // استرجاع البيانات السابقة عند الخطأ
      queryClient.setQueryData(['organization-settings', organizationId], context?.previousSettings);
    },
    onSettled: () => {
      // إعادة جلب البيانات للتأكد من التزامن
      queryClient.invalidateQueries(['organization-settings', organizationId]);
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSetting: updateMutation.mutate,
    isUpdating: updateMutation.isLoading
  };
};
```

#### ب. useStoreComponents محسن
```typescript
export const useStoreComponentsOptimized = (organizationId: string) => {
  const queryClient = useQueryClient();
  
  // جلب المكونات مع pagination
  const { data: components, isLoading } = useQuery({
    queryKey: ['store-components', organizationId],
    queryFn: () => getStoreComponentsPaginated(organizationId, { limit: 50 }),
    staleTime: 2 * 60 * 1000, // دقيقتان
    enabled: !!organizationId
  });

  // تحديث batch للمكونات
  const batchUpdateMutation = useMutation({
    mutationFn: (updates: ComponentUpdate[]) => 
      batchUpdateStoreComponents(organizationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['store-components', organizationId]);
    }
  });

  // debounced batch update
  const debouncedBatchUpdate = useMemo(
    () => debounce((updates: ComponentUpdate[]) => {
      batchUpdateMutation.mutate(updates);
    }, 1000), // ثانية واحدة
    [batchUpdateMutation]
  );

  return {
    components,
    isLoading,
    batchUpdate: debouncedBatchUpdate,
    isUpdating: batchUpdateMutation.isLoading
  };
};
```

### المرحلة 3: تحسين المكونات (أولوية متوسطة)

#### أ. StoreSettings محسن
```typescript
const StoreSettingsOptimized = () => {
  const { settings, updateSetting, isUpdating } = useOrganizationSettingsOptimized(organizationId);
  const [localChanges, setLocalChanges] = useState({});
  
  // debounced save
  const debouncedSave = useMemo(
    () => debounce((changes: any) => {
      updateSetting(changes);
      setLocalChanges({});
    }, 2000), // ثانيتان
    [updateSetting]
  );

  const handleChange = (key: string, value: any) => {
    const newChanges = { ...localChanges, [key]: value };
    setLocalChanges(newChanges);
    debouncedSave(newChanges);
  };

  // عدم إعادة تحميل الصفحة
  const handleSave = async () => {
    if (Object.keys(localChanges).length > 0) {
      await updateSetting(localChanges);
      setLocalChanges({});
      // تحديث UI فقط بدون reload
      toast({ title: "تم الحفظ بنجاح" });
    }
  };

  return (
    // UI محسن بدون DOM manipulation
  );
};
```

#### ب. ImprovedStoreEditor محسن
```typescript
const ImprovedStoreEditorOptimized = ({ organizationId }: Props) => {
  const { components, batchUpdate, isUpdating } = useStoreComponentsOptimized(organizationId);
  const [pendingChanges, setPendingChanges] = useState<ComponentUpdate[]>([]);

  // تجميع التحديثات
  const addPendingChange = useCallback((componentId: string, updates: any) => {
    setPendingChanges(prev => {
      const existing = prev.find(c => c.id === componentId);
      if (existing) {
        return prev.map(c => c.id === componentId ? { ...c, ...updates } : c);
      }
      return [...prev, { id: componentId, ...updates }];
    });
  }, []);

  // حفظ batch كل 3 ثوان
  useEffect(() => {
    if (pendingChanges.length > 0) {
      const timer = setTimeout(() => {
        batchUpdate(pendingChanges);
        setPendingChanges([]);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [pendingChanges, batchUpdate]);

  return (
    // UI محسن مع virtual scrolling للمكونات الكثيرة
  );
};
```

### المرحلة 4: تحسين API (أولوية متوسطة)

#### أ. API endpoints محسنة
```typescript
// batch operations
export const batchUpdateStoreComponents = async (
  organizationId: string, 
  updates: ComponentUpdate[]
) => {
  const { data, error } = await supabase.rpc('batch_update_store_components', {
    p_organization_id: organizationId,
    p_updates: updates
  });
  
  if (error) throw error;
  return data;
};

// pagination
export const getStoreComponentsPaginated = async (
  organizationId: string,
  options: { limit?: number; offset?: number; types?: string[] } = {}
) => {
  const { limit = 20, offset = 0, types } = options;
  
  let query = supabase
    .from('store_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .range(offset, offset + limit - 1)
    .order('order_index');
    
  if (types?.length) {
    query = query.in('component_type', types);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
```

#### ب. دوال قاعدة البيانات محسنة
```sql
-- batch update function
CREATE OR REPLACE FUNCTION batch_update_store_components(
  p_organization_id UUID,
  p_updates JSONB
)
RETURNS VOID AS $$
DECLARE
  update_item JSONB;
BEGIN
  FOR update_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE store_settings 
    SET 
      settings = COALESCE((update_item->>'settings')::JSONB, settings),
      is_active = COALESCE((update_item->>'is_active')::BOOLEAN, is_active),
      order_index = COALESCE((update_item->>'order_index')::INTEGER, order_index),
      updated_at = NOW()
    WHERE id = (update_item->>'id')::UUID 
      AND organization_id = p_organization_id;
  END LOOP;
  
  -- تحديث العرض المادي
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_store_summary;
END;
$$ LANGUAGE plpgsql;
```

### المرحلة 5: تحسين الواجهة (أولوية منخفضة)

#### أ. Virtual Scrolling للمكونات الكثيرة
```typescript
import { FixedSizeList as List } from 'react-window';

const ComponentsList = ({ components }: { components: StoreComponent[] }) => {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <ComponentItem component={components[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={components.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

#### ب. Lazy Loading للمكونات الثقيلة
```typescript
const LazyComponentPreview = React.lazy(() => import('./ComponentPreview'));

const ComponentWrapper = ({ component }: { component: StoreComponent }) => (
  <Suspense fallback={<ComponentSkeleton />}>
    <LazyComponentPreview component={component} />
  </Suspense>
);
```

---

## 📊 النتائج المتوقعة

### قبل التحسين
- **وقت التحميل**: 8-15 ثانية
- **وقت الحفظ**: 5-10 ثوان
- **استعلامات قاعدة البيانات**: 140+ لكل حفظ
- **حجم البيانات المنقولة**: 2-5 MB
- **استهلاك الذاكرة**: عالي (تسريبات)

### بعد التحسين
- **وقت التحميل**: 1-3 ثوان (80% تحسن)
- **وقت الحفظ**: 0.5-1 ثانية (90% تحسن)
- **استعلامات قاعدة البيانات**: 1-3 لكل حفظ (98% تحسن)
- **حجم البيانات المنقولة**: 200-500 KB (85% تحسن)
- **استهلاك الذاكرة**: منخفض (بدون تسريبات)

---

## 🚀 خطة التنفيذ

### الأسبوع 1: قاعدة البيانات
- [ ] تنظيف الفهارس المكررة
- [ ] إنشاء الدوال المحسنة
- [ ] إنشاء materialized views
- [ ] اختبار الأداء

### الأسبوع 2: Hooks والAPI
- [ ] تطبيق React Query
- [ ] إنشاء batch operations
- [ ] تحسين useOrganizationSettings
- [ ] تحسين useStoreComponents

### الأسبوع 3: المكونات
- [ ] تحسين StoreSettings
- [ ] تحسين ImprovedStoreEditor
- [ ] إضافة debouncing
- [ ] إزالة DOM manipulation

### الأسبوع 4: الاختبار والتحسين
- [ ] اختبار الأداء الشامل
- [ ] إضافة Virtual Scrolling
- [ ] إضافة Lazy Loading
- [ ] مراقبة الأداء

---

## 🔧 أدوات المراقبة

### مراقبة الأداء
```typescript
// Performance monitoring
const usePerformanceMonitor = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    return () => observer.disconnect();
  }, []);
};

// استخدام في المكونات
performance.mark('store-load-start');
// ... تحميل البيانات
performance.mark('store-load-end');
performance.measure('store-load-time', 'store-load-start', 'store-load-end');
```

### مراقبة قاعدة البيانات
```sql
-- إنشاء view لمراقبة الاستعلامات البطيئة
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 100 -- أكثر من 100ms
ORDER BY mean_time DESC;
```

---

**🎯 الهدف: تحسين الأداء بنسبة 80-90% وتوفير تجربة مستخدم سلسة وسريعة** 