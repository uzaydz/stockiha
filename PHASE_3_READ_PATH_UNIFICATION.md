# المرحلة 3: توحيد مسار القراءة في الـ UI – القراءة دائمًا من SQLite

## ✅ ما تم إنجازه

### 1. تحديث `useUnifiedPOSData` ✅
- **قبل**: كان يستدعي `supabase.rpc('get_complete_pos_data_optimized')` مباشرة
- **بعد**: يقرأ فقط من SQLite عبر `loadInitialDataFromLocalDB`
- **النتيجة**: Offline-First حقيقي - نفس السلوك Online/Offline

### 2. إنشاء `posDataSyncService` ✅
- خدمة منفصلة لمزامنة بيانات POS من السيرفر إلى SQLite
- يجب استدعاؤها من:
  - `onLogin` - عند تسجيل الدخول
  - زر "تحديث البيانات" في POS
  - SyncManager عند الاتصال بالإنترنت

---

## 📋 كيفية الاستخدام

### في `onLogin` أو عند تسجيل الدخول:

```typescript
import { syncAllPOSDataFromServer } from '@/services/posDataSyncService';

// عند تسجيل الدخول
const handleLogin = async () => {
  // ... تسجيل الدخول
  
  // مزامنة بيانات POS
  if (organizationId) {
    await syncAllPOSDataFromServer(organizationId);
  }
};
```

### في زر "تحديث البيانات" في POS:

```typescript
import { syncPOSDataFromServer } from '@/services/posDataSyncService';
import { useUnifiedPOSData } from '@/hooks/useUnifiedPOSData';
import { useQueryClient } from '@tanstack/react-query';

const POSPage = () => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const { refetch } = useUnifiedPOSData();

  const handleRefresh = async () => {
    if (!currentOrganization?.id) return;
    
    // مزامنة من السيرفر
    const result = await syncPOSDataFromServer({
      organizationId: currentOrganization.id,
      page: 1,
      limit: 100
    });
    
    if (result.success) {
      // إعادة تحميل البيانات من SQLite
      await refetch();
      toast.success('تم تحديث البيانات بنجاح');
    } else {
      toast.error(result.error || 'فشل تحديث البيانات');
    }
  };

  return (
    <button onClick={handleRefresh}>
      تحديث البيانات
    </button>
  );
};
```

### في SyncManager (عند الاتصال بالإنترنت):

```typescript
import { syncAllPOSDataFromServer } from '@/services/posDataSyncService';

// في SyncManager عند اكتشاف الاتصال بالإنترنت
const handleNetworkOnline = async (organizationId: string) => {
  // مزامنة بيانات POS
  await syncAllPOSDataFromServer(organizationId);
  
  // ثم مزامنة البيانات الأخرى...
};
```

---

## 🎯 الخطوات التالية

### 1. تحديث `onLogin` ✅
- إضافة استدعاء `syncAllPOSDataFromServer` عند تسجيل الدخول

### 2. تحديث زر "تحديث البيانات" في POS ✅
- استخدام `syncPOSDataFromServer` ثم `refetch`

### 3. تحديث SyncManager ✅
- إضافة مزامنة POS عند الاتصال بالإنترنت

### 4. إنشاء Hooks مشابهة للشاشات الأخرى (قيد التنفيذ)
- `useUnifiedCustomerDebts` - ديون العملاء
- `useUnifiedLosses` - الخسائر
- `useUnifiedWorkSessions` - جلسات العمل

---

## 📝 ملاحظات مهمة

1. **القراءة دائمًا من SQLite**: جميع Hooks تقرأ فقط من SQLite
2. **المزامنة في الخلفية**: تحدث عبر Services منفصلة
3. **Offline-First حقيقي**: نفس السلوك Online/Offline
4. **لا استدعاءات مباشرة لـ Supabase**: من الـ UI

---

## 🔄 التدفق الجديد

```
[User Action] → [Hook] → [SQLite] → [Display]
                    ↓
              [No Data?] → [Empty State]
                    ↓
              [Background Sync] → [posDataSyncService] → [Supabase RPC] → [SQLite]
```

---

## ✅ الفوائد

1. **أداء أفضل**: القراءة من SQLite أسرع من RPC
2. **تجربة مستخدم أفضل**: لا انتظار للشبكة
3. **Offline-First حقيقي**: يعمل بدون إنترنت
4. **كود أنظف**: فصل الاهتمامات (قراءة/كتابة)

























