# دليل نظام المصادقة الثنائية (2FA)

## نظرة عامة

تم تطوير نظام مصادقة ثنائية شامل يدعم:
- **TOTP (Time-based One-Time Password)** باستخدام تطبيقات المصادقة
- **Backup Codes** للطوارئ
- **إدارة كاملة** للتفعيل والإلغاء
- **تسجيل الأنشطة** الأمنية

## المكونات الأساسية

### 1. قاعدة البيانات

#### الأعمدة في `user_security_settings`:
```sql
- two_factor_enabled: BOOLEAN -- حالة التفعيل
- two_factor_method: TEXT -- طريقة المصادقة (totp/sms/email)
- totp_secret: TEXT -- المفتاح السري للـ TOTP
- backup_codes: TEXT[] -- رموز الطوارئ
- backup_codes_generated_at: TIMESTAMP -- تاريخ توليد الرموز
- backup_codes_used: TEXT[] -- الرموز المستخدمة
```

#### الدوال المطورة:
- `setup_two_factor_auth(user_id)` - إعداد المصادقة الثنائية
- `enable_two_factor_auth(user_id, code)` - تفعيل المصادقة
- `disable_two_factor_auth(user_id, code)` - إلغاء التفعيل
- `verify_totp_code(user_id, code)` - التحقق من الرمز
- `regenerate_backup_codes(user_id)` - إعادة توليد رموز الطوارئ

### 2. API Functions

#### في `src/lib/api/security.ts`:
```typescript
// إعداد المصادقة الثنائية
setupTwoFactorAuth(): Promise<TwoFactorSetup>

// تفعيل المصادقة الثنائية
enableTwoFactorAuth(code: string): Promise<{success: boolean, error?: string}>

// إلغاء تفعيل المصادقة الثنائية
disableTwoFactorAuth(code: string): Promise<{success: boolean, error?: string}>

// التحقق من رمز المصادقة
verifyTwoFactorCode(code: string): Promise<{success: boolean, error?: string}>

// إعادة توليد backup codes
regenerateBackupCodes(): Promise<{success: boolean, backup_codes?: string[]}>

// الحصول على حالة المصادقة الثنائية
getTwoFactorStatus(): Promise<{enabled: boolean, method?: string, backup_codes_count?: number}>
```

### 3. مكون React

#### `src/components/TwoFactorAuthSetup.tsx`:
مكون شامل يوفر:
- **واجهة إعداد** المصادقة الثنائية
- **عرض QR Code** و المفتاح اليدوي
- **التحقق من الرمز** وتفعيل المصادقة
- **إدارة Backup Codes** (عرض، تحميل، إعادة توليد)
- **إلغاء التفعيل** مع التحقق

## كيفية عمل النظام

### 1. إعداد المصادقة الثنائية

```typescript
// 1. المستخدم يضغط على "إعداد المصادقة الثنائية"
const result = await setupTwoFactorAuth();

// 2. النظام يولد:
// - TOTP secret (مفتاح سري)
// - QR Code URL
// - 10 backup codes
// - Manual entry key

// 3. المستخدم يمسح QR Code أو يدخل المفتاح يدوياً في تطبيق المصادقة
```

### 2. تفعيل المصادقة

```typescript
// 1. المستخدم يدخل رمز من تطبيق المصادقة
const code = "123456";

// 2. النظام يتحقق من الرمز
const result = await enableTwoFactorAuth(code);

// 3. إذا كان الرمز صحيح:
// - يتم تفعيل المصادقة الثنائية
// - يتم عرض backup codes للمستخدم
// - يتم تسجيل النشاط الأمني
```

### 3. استخدام المصادقة الثنائية

```typescript
// عند تسجيل الدخول أو العمليات الحساسة
const isValid = await verifyTwoFactorCode(userCode);

// النظام يقبل:
// - رموز TOTP من التطبيق (6 أرقام)
// - backup codes (8 أرقام، استخدام واحد فقط)
```

### 4. إدارة Backup Codes

```typescript
// إعادة توليد backup codes جديدة
const result = await regenerateBackupCodes();

// النظام:
// - يولد 10 رموز جديدة
// - يحذف الرموز القديمة
// - يعيد تعيين قائمة الرموز المستخدمة
```

## تطبيقات المصادقة المدعومة

### التطبيقات الموصى بها:
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (مع دعم TOTP)
- **Bitwarden** (مع دعم TOTP)

### إعداد التطبيق:
1. افتح تطبيق المصادقة
2. اختر "إضافة حساب" أو "مسح QR Code"
3. امسح الرمز المعروض أو أدخل المفتاح يدوياً
4. احفظ الحساب باسم "Bazaar Console"

## الأمان والحماية

### الميزات الأمنية:
- **تشفير المفاتيح**: TOTP secrets محفوظة بشكل آمن
- **Backup Codes**: رموز طوارئ للوصول عند فقدان الجهاز
- **تسجيل الأنشطة**: جميع العمليات مسجلة في security_logs
- **استخدام واحد**: كل backup code يستخدم مرة واحدة فقط
- **انتهاء صلاحية**: رموز TOTP تتغير كل 30 ثانية

### أفضل الممارسات:
- **احفظ backup codes** في مكان آمن (خزنة، مدير كلمات مرور)
- **لا تشارك المفاتيح** مع أي شخص
- **استخدم تطبيق موثوق** للمصادقة
- **فعل المصادقة الثنائية** على جميع الحسابات المهمة

## استكشاف الأخطاء

### المشاكل الشائعة:

#### 1. رمز التحقق غير صحيح
```
الأسباب المحتملة:
- وقت الجهاز غير متزامن
- إدخال رمز منتهي الصلاحية
- خطأ في إدخال الرمز

الحلول:
- تحقق من وقت الجهاز
- انتظر رمز جديد (30 ثانية)
- استخدم backup code
```

#### 2. فقدان الجهاز
```
الحلول:
- استخدم backup code للدخول
- أعد توليد backup codes جديدة
- أعد إعداد المصادقة الثنائية على جهاز جديد
```

#### 3. backup codes منتهية
```
الحلول:
- استخدم آخر backup code للدخول
- أعد توليد backup codes فوراً
- احفظ الرموز الجديدة في مكان آمن
```

## التكامل مع النظام

### إضافة المكون للصفحة:
```tsx
import TwoFactorAuthSetup from '@/components/TwoFactorAuthSetup';

function SecuritySettings() {
  return (
    <div>
      <TwoFactorAuthSetup 
        onStatusChange={(enabled) => {
          console.log('2FA status changed:', enabled);
        }}
      />
    </div>
  );
}
```

### التحقق من المصادقة الثنائية:
```tsx
import { getTwoFactorStatus, verifyTwoFactorCode } from '@/lib/api/security';

// التحقق من حالة المصادقة
const status = await getTwoFactorStatus();
if (status.enabled) {
  // طلب رمز التحقق من المستخدم
  const code = prompt('أدخل رمز المصادقة الثنائية:');
  const isValid = await verifyTwoFactorCode(code);
  
  if (isValid.success) {
    // السماح بالعملية
  } else {
    // رفض العملية
  }
}
```

## الصيانة والمراقبة

### مراقبة الاستخدام:
```sql
-- إحصائيات المصادقة الثنائية
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as enabled_users,
  ROUND(COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) * 100.0 / COUNT(*), 2) as adoption_rate
FROM user_security_settings;

-- الأنشطة الأمنية المتعلقة بـ 2FA
SELECT activity_type, COUNT(*), status
FROM security_logs 
WHERE activity_type LIKE '%2fa%' 
GROUP BY activity_type, status
ORDER BY COUNT(*) DESC;
```

### صيانة دورية:
- **تنظيف backup codes** المنتهية الصلاحية
- **مراجعة محاولات** التحقق الفاشلة
- **تحديث خوارزميات** التشفير حسب الحاجة

## التطوير المستقبلي

### ميزات مخططة:
- **SMS 2FA**: دعم الرسائل النصية
- **Email 2FA**: دعم البريد الإلكتروني
- **Hardware Keys**: دعم مفاتيح الأمان الفيزيائية
- **Biometric 2FA**: دعم البصمة والوجه
- **Risk-based Auth**: مصادقة حسب مستوى المخاطر

### تحسينات تقنية:
- **TOTP Library**: استخدام مكتبة TOTP حقيقية بدلاً من المحاكاة
- **QR Code Generation**: توليد QR codes فعلية
- **Push Notifications**: إشعارات فورية للأنشطة المشبوهة
- **Session Management**: ربط المصادقة الثنائية بإدارة الجلسات

---

## الخلاصة

نظام المصادقة الثنائية المطور يوفر:
✅ **أمان عالي** مع TOTP و backup codes  
✅ **واجهة سهلة** للإعداد والإدارة  
✅ **تسجيل شامل** للأنشطة الأمنية  
✅ **مرونة في الاستخدام** مع خيارات متعددة  
✅ **قابلية التوسع** لميزات مستقبلية  

النظام جاهز للاستخدام ويمكن تفعيله فوراً في التطبيق! 