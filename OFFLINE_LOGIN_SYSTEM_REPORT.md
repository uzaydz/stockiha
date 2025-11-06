# تقرير استكشاف نظام تسجيل الدخول الأوفلاين

## 1. كيف يعمل تسجيل دخول المؤسسة (Tenant) أوفلاين

### المسار الأساسي:
```
البريد الإلكتروني + كلمة السر (Supabase Auth)
        ↓
تحقق من الاتصال بالإنترنت
        ↓
  أونلاين: تواصل مع Supabase
  أوفلاين: استرجع من offline auth snapshot
        ↓
حفظ بيانات الجلسة المشفرة في localStorage
```

### ملفات المسؤولة:
- **src/context/auth/services/authService.ts** - خدمة المصادقة الأساسية
- **src/context/auth/utils/authStorage.ts** - إدارة التخزين المحلي
- **src/context/auth/utils/secureSessionStorage.ts** - تشفير الجلسات

### تفاصيل التنفيذ:

#### أ) تسجيل الدخول الأونلاين:
```typescript
// من authService.signIn()
async signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (data.session && data.user) {
    // حفظ الجلسة بشكل آمن
    saveAuthToStorage(data.session, data.user);
    saveOfflineAuthSnapshot(data.session, data.user);
    return { success: true };
  }
}
```

#### ب) استرجاع الجلسة الأوفلاين:
```typescript
// من authStorage.ts
loadOfflineAuthSnapshot(): OfflineAuthSnapshot | null
  ↓
  ملفات محفوظة:
  - bazaar_offline_auth_snapshot_v1 (بيانات المستخدم المشفرة)
  - secure_offline_session_v1 (الجلسة الآمنة)
  - secure_offline_session_meta_v1 (metadata الجلسة)
```

### بيانات محفوظة للأوفلاين:

```typescript
interface OfflineAuthSnapshot {
  user: {
    id: string
    email: string
    user_metadata: any
    app_metadata: any
    role: string
    aud: string
    phone?: string
    created_at: string
    updated_at: string
  }
  sessionMeta: {
    expiresAt: number | null
    storedAt: number
  }
  organizationId?: string
  lastUpdatedAt: number
}
```

---

## 2. كيف يعمل تسجيل دخول الموظفين (Staff) أوفلاين

### المسار الأساسي:
```
إدخال PIN (6 أرقام)
      ↓
فحص الاتصال بالإنترنت
      ↓
أونلاين: تحقق من السيرفر عبر staffService.verifyPin()
أوفلاين: تحقق من قاعدة البيانات المحلية (Dexie DB)
      ↓
حفظ جلسة الموظف في localStorage
```

### ملف الصفحة الرئيسية:
- **src/pages/StaffLogin.tsx** - واجهة تسجيل دخول الموظفين (223 سطر)

### تفاصيل التنفيذ:

```typescript
// من StaffLogin.tsx
const handleVerifyPin = async (pinCode: string) => {
  // التحقق من الاتصال بالإنترنت
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // أوفلاين: تحقق محلياً
    const off = await verifyStaffPinOffline({ 
      organizationId: organization.id, 
      pin: pinCode 
    });
    
    if (off.success && off.staff) {
      setStaffSession(off.staff);
      navigate('/dashboard/pos-dashboard');
    }
  } else {
    // أونلاين: تحقق من السيرفر
    const result = await staffService.verifyPin(pinCode);
    
    if (result.success && result.staff) {
      // حفظ للأوفلاين
      await saveStaffPinOffline({
        staffId: result.staff.id,
        organizationId: organization.id,
        staffName: result.staff.staff_name,
        pin: pinCode,
        permissions: result.staff.permissions,
      });
      setStaffSession(result.staff);
    }
  }
};
```

### هيكل الجلسة المحفوظة:

```typescript
// localStorage key: 'staff_session'
interface POSStaffSession {
  id: string;
  organization_id: string;
  staff_name: string;
  email?: string;
  permissions?: {
    [key: string]: boolean
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string;
}
```

---

## 3. نظام PIN للموظفين

### مواصفات PIN:
- **الطول**: 6 أرقام (يمكن 4-6 في التحديث)
- **النوع**: رقمي فقط
- **الكود**: يتم إدخاله تلقائياً عند ملء جميع الحقول
- **الواجهة**: 6 حقول إدخال منفصلة مع تنقل تلقائي

### إنشاء PIN:
```typescript
// من staffService.ts - createStaffWithAuth()
const pinCode = input.pin_code; // 6 أرقام

// عند الإنشاء الأولي، يتم حفظ PIN للأوفلاين:
await saveStaffPinOffline({
  staffId: staffData.id,
  organizationId: userData.organization_id,
  staffName: input.staff_name,
  pin: input.pin_code,
  permissions: input.permissions
});
```

### تحديث PIN:
```typescript
// من UpdateOfflinePinDialog.tsx
- التحقق من PIN القديم (تفويض المدير)
- إدخال PIN جديد وتأكيده
- إذا أونلاين: تحديث عبر staffService.updatePin()
- إذا أوفلاين: تحديث محلي via updateStaffPinOffline()
```

### التحقق من PIN:

#### أونلاين:
```typescript
// staffService.verifyPin()
rpc('verify_staff_pin', { p_pin_code: pinCode })
```

#### أوفلاين:
```typescript
// verifyStaffPinOffline()
- البحث في جدول staffPins عن جميع سجلات المؤسسة
- لكل سجل: حساب SHA-256(salt:pin) والمقارنة
- إرجاع تفاصيل الموظف إن طابق
```

---

## 4. تخزين بيانات المصادقة محلياً

### الموقع الأساسي:
```
Browser: localStorage و sessionStorage
Electron: electron-store (مشفر)
IndexedDB: قاعدة البيانات المحلية (Dexie)
```

### هيكل التخزين:

#### A) بيانات المستخدم (Organization Tenant):
```
localStorage:
├── bazaar_offline_auth_snapshot_v1 (JSON)
├── bazaar_auth_state (JSON)
├── bazaar_organization_id (string)
├── secure_offline_session_v1 (مشفر - أو Base64)
└── secure_offline_session_meta_v1 (JSON)

sessionStorage:
├── auth_session_cache (JSON)
├── auth_last_redirect (string)
└── auth_login_redirect_count (number)
```

#### B) بيانات الموظفين (Staff):
```
localStorage:
├── staff_session (JSON)
└── admin_mode (boolean)

IndexedDB (Dexie - bazaarDB_v2):
└── staffPins (جدول)
    ├── id (string) - staff_id
    ├── organization_id (string)
    ├── staff_name (string)
    ├── pin_hash (string) - SHA-256 مشفر
    ├── salt (string) - Base64 عشوائي
    ├── permissions (JSON)
    └── updated_at (ISO string)
```

#### C) إعدادات Electron:
```
electron-store (مشفر):
├── theme
├── language
├── windowBounds
├── lastSync
└── cache
```

### مخطط الترميز:

```typescript
// من staffCredentials.ts

// التشفير:
1. إنشاء salt عشوائي (16 بايت، Base64)
2. صلة: salt:pin
3. تطبيق SHA-256
4. تخزين hash + salt

// التحقق:
1. استرجاع salt المخزن
2. حساب SHA-256(salt:pin_input)
3. مقارنة مع pin_hash المخزن

const randomSalt = (len = 16): string => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return toBase64(arr);
};

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64(new Uint8Array(digest));
}
```

---

## 5. هل ال��يانات مشفرة؟

### الأونلاين (في المتصفح):
```
❌ localStorage: نص عادي (JSON)
⚠️ sessionStorage: نص عادي (معهود للجلسة الحالية فقط)
✅ secure_offline_session: AES-GCM مشفر (مع fallback Base64)
✅ PIN: SHA-256 مع salt عشوائي
```

### Electron:
```
✅ electron-store: مشفر تلقائياً بمفتاح ثابت
   encryptionKey: 'stockiha-secure-encryption-key-2024'
   
⚠️ TODO: استخدام مفتاح ديناميكي بدلاً من المفتاح الثابت
```

### IndexedDB (Dexie):
```
❌ staffPins: نص عادي في قاعدة البيانات
✅ PIN hashes: مشفرة بـ SHA-256 + salt
```

### تفاصيل التشفير:

#### أ) الجلسة الآمنة (Secure Session):
```typescript
// من secureSessionStorage.ts

// الخطوات:
1. طلب مفتاح من Electron (أو إنشاء fallback)
2. استيراد المفتاح كـ AES-GCM CryptoKey
3. تشفير الجلسة JSON بـ AES-GCM
4. تخزين مشفر + IV + tag في localStorage

// الفالباك:
إذا فشل التشفير أو عدم توفر Electron:
- تخزين Base64(JSON) بدلاً من التشفير
- لا يزال أفضل من نص عادي للقراءة السريعة
```

#### ب) Electron Secure Storage:
```typescript
// من electron/secureStorage.cjs

const mainStore = new Store({
  name: 'config',
  cwd: app.getPath('userData'),
  schema,
  encryptionKey: 'stockiha-secure-encryption-key-2024',
  clearInvalidConfig: true,
});
```

### مستويات الأمان:

```
1. PIN الموظف:
   ✅ مشفر: SHA-256(salt:pin)
   ✅ Salt عشوائي: 16 بايت (Base64)
   ✅ حماية ضد brute force: لا توجد آلية تأخير
   
2. جلسة المستخدم:
   ✅ مشفرة: AES-GCM أو Base64
   ⚠️ منتهية الصلاحية: تحقق من expires_at
   
3. بيانات الأوفلاين:
   ⚠️ localStorage: نص عادي + XSS risk
   ✅ Electron: مشفر تلقائياً
   ⚠️ IndexedDB: نص عادي + قد تكون متاحة لـ Service Workers
```

---

## 6. كيف يتم التحقق من الهوية بدون إنترنت

### المسار الأساسي للمؤسسة (Tenant):

```
بدون إنترنت
      ↓
تحميل offline auth snapshot من localStorage
      ↓
فحص token:
├── هل موجود في snapshot؟
├── هل لم ينتهِ الصلاحية؟
└── هل userId متطابق؟
      ↓
استخدام البيانات من snapshot
      ↓
عند العودة للأونلاين:
├── تحديث الجلسة من الخادم
├── المقارنة مع snapshot
└── تحديث أي تغييرات
```

### تفاصيل التنفيذ:

```typescript
// من authStorage.ts

export const loadOfflineAuthSnapshot = (): OfflineAuthSnapshot | null => {
  try {
    const raw = localStorage.getItem(OFFLINE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineAuthSnapshot;
    return parsed;
  } catch (error) {
    return null;
  }
};

// التحقق من الصلاحية:
const isSessionValid = (snapshot: OfflineAuthSnapshot): boolean => {
  if (!snapshot.sessionMeta?.expiresAt) return true; // بدون انتهاء صلاحية
  
  const now = Date.now() / 1000; // بالثواني
  return snapshot.sessionMeta.expiresAt > now;
};
```

### المسار الأساسي للموظفين (Staff):

```
بدون إنترنت + PIN
      ↓
البحث في IndexedDB (staffPins) عن المؤسسة
      ↓
لكل سجل موظف:
├── استرجاع pin_hash و salt
├── حساب SHA-256(salt:pin_input)
└── مقارنة مع pin_hash
      ↓
إذا طابق:
├── تحميل بيانات الموظف
├── إنشاء جلسة محلية
└── حفظ في localStorage (staff_session)
      ↓
عند العودة للأونلاين:
└── مزامنة جلسة الموظف مع الخادم
```

### آلية الفالباك (Fallback):

```typescript
// من StaffLogin.tsx

try {
  // محاولة 1: أونلاين أولاً
  if (navigator.onLine) {
    const result = await staffService.verifyPin(pinCode);
    if (result.success) {
      // حفظ للأوفلاين
      await saveStaffPinOffline({ ... });
      setStaffSession(result.staff);
    }
  }
} catch (error) {
  // محاولة 2: فالباك للأوفلاين إذا فشلت الشبكة
  if (error message includes network/fetch/offline) {
    const off = await verifyStaffPinOffline({ ... });
    if (off.success) {
      setStaffSession(off.staff);
    }
  }
}
```

### مراقبة اتصال الإنترنت:

```typescript
// استخدام:
navigator.onLine // true/false

// + Event listeners في AuthContext (يمكن إضافتها):
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
```

---

## 7. المخاطر الأمنية المعروفة

### 1. localStorage غير مشفر:
```
❌ XSS attacks: يمكن لأي سكريبت قراءة localStorage
❌ عدم توفر حماية ضد الوصول المحلي
```

### 2. مفتاح Electron ثابت:
```
⚠️ encryptionKey في secureStorage.cjs ثابت
❌ إذا تم الوصول للملف، يمكن فك التشفير بسهولة
```

### 3. PIN بدون حماية ضد Brute Force:
```
❌ لا توجد آلية تأخير بعد محاولات خاطئة
❌ لا توجد آلية حظر مؤقت
❌ ممكن محاولة 1 مليون PIN في أوقات قصيرة
```

### 4. معلومات الصلاحيات مخزنة محلياً:
```
❌ يمكن تعديل permissions في localStorage/IndexedDB محلياً
⚠️ يجب التحقق من الصلاحيات من الخادم عند الاتصال
```

### 5. عدم وجود آلية إبطال (Revocation):
```
❌ PIN مخزن محلياً لا يمكن إبطاله فوراً
⚠️ يجب مزامنة الإبطالات من الخادم
```

---

## 8. الملفات الرئيسية المسؤولة

| الملف | الوظيفة | الأسطر |
|------|--------|--------|
| `src/lib/offline/staffCredentials.ts` | تشفير وتخزين PIN الموظفين | 118 |
| `src/pages/StaffLogin.tsx` | واجهة تسجيل دخول الموظفين | 343 |
| `src/database/localDb.ts` | قاعدة البيانات المحلية (Dexie) | 1417 |
| `electron/secureStorage.cjs` | تخزين آمن في Electron | 376 |
| `src/context/auth/utils/authStorage.ts` | إدارة تخزين بيانات المصادقة | 522 |
| `src/context/auth/utils/secureSessionStorage.ts` | تشفير الجلسات | 150+ |
| `src/context/auth/services/authService.ts` | خدمة المصادقة الأساسية | 292 |
| `src/services/staffService.ts` | خدمات إدارة الموظفين | 396 |
| `src/context/StaffSessionContext.tsx` | Context لجلسة الموظف | 100 |
| `src/components/staff/UpdateOfflinePinDialog.tsx` | تحديث PIN للأوفلاين | 145 |

---

## 9. ملخص العمل الكامل

### تسجيل الدخول الأوفلاين (كامل):

```
┌─────────────────────────────────────────────────────────────┐
│           Offline Authentication System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ TENANT (Organization) ────────────────────────────────┐ │
│ │                                                         │ │
│ │ Input: Email + Password                               │ │
│ │    ↓                                                   │ │
│ │ Check Internet                                        │ │
│ │    ├─→ ONLINE: Auth with Supabase                    │ │
│ │    │    └─→ Save encrypted to localStorage            │ │
│ │    └─→ OFFLINE: Load from localStorage                │ │
│ │         └─→ Validate expires_at timestamp             │ │
│ │                                                         │ │
│ │ Output: User + Permissions                            │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ STAFF (Employee) ─────────────────────────────────────┐ │
│ │                                                         │ │
│ │ Input: 6-Digit PIN                                    │ │
│ │    ↓                                                   │ │
│ │ Check Internet                                        │ │
│ │    ├─→ ONLINE: Verify via staffService.verifyPin()   │ │
│ │    │    └─→ Save PIN locally via saveStaffPinOffline()│
│ │    └─→ OFFLINE: Verify in IndexedDB (staffPins table)│
│ │         └─→ Hash comparison: SHA256(salt:PIN)         │
│ │                                                         │ │
│ │ Output: Staff Session + Permissions                   │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ Storage Layers ───────────────────────────────────────┐ │
│ │                                                         │ │
│ │ localStorage:                                         │ │
│ │ ├─ bazaar_offline_auth_snapshot_v1 (plain)           │ │
│ │ ├─ staff_session (plain)                             │ │
│ │ └─ admin_mode (plain)                                │ │
│ │                                                         │ │
│ │ sessionStorage:                                       │ │
│ │ └─ auth_session_cache (plain)                        │ │
│ │                                                         │ │
│ │ IndexedDB (Dexie - bazaarDB_v2):                     │ │
│ │ └─ staffPins (encrypted hashes)                      │ │
│ │    ├─ pin_hash: SHA256(salt:PIN)                     │ │
│ │    └─ salt: random 16 bytes                          │ │
│ │                                                         │ │
│ │ Electron Store (electron-store):                     │ │
│ │ └─ encrypted with AES (static key ⚠️)               │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

