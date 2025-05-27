# نظام الأمان والخصوصية متعدد النطاقات
## Multi-Domain Security & Privacy System

### 🌟 نظرة عامة

تم تطوير نظام أمان وخصوصية شامل يدعم النطاقات المتعددة والنطاقات الفرعية مع تكامل Google OAuth ومصادقة ثنائية متقدمة.

### 🏗️ الهيكل العام

#### النطاقات المدعومة:
- **stockiha.com** (النطاق الرئيسي)
- **ktobi.online**
- **bazaar.com**
- **bazaar.dev**

#### النطاقات الفرعية:
- كل عميل يحصل على نطاق فرعي مخصص
- مثال: `client1.stockiha.com`, `company2.ktobi.online`

### 🔧 المكونات الرئيسية

#### 1. إعدادات قاعدة البيانات
```sql
-- الجداول الرئيسية
- user_security_settings      # إعدادات الأمان
- privacy_settings            # إعدادات الخصوصية  
- user_sessions              # الجلسات النشطة
- security_logs              # سجل الأنشطة الأمنية
- trusted_devices            # الأجهزة الموثوقة
- verification_codes         # رموز التحقق
- supported_domains          # النطاقات المدعومة
- client_subdomains          # النطاقات الفرعية للعملاء
```

#### 2. مكونات React
```typescript
- SecurityPrivacySettings.tsx  # المكون الرئيسي
- PasswordSettings.tsx         # إعدادات كلمة المرور
- ProfileSettings.tsx          # إعدادات الملف الشخصي
- NotificationsSettings.tsx    # إعدادات الإشعارات
```

#### 3. APIs والخدمات
```typescript
- src/lib/api/security.ts      # APIs الأمان والخصوصية
- src/lib/api/profile.ts       # APIs الملف الشخصي
- src/hooks/useProfile.ts      # Hook مخصص للملف الشخصي
```

### 🔐 ميزات الأمان

#### المصادقة الثنائية (2FA)
- **البريد الإلكتروني**: رموز تحقق عبر الإيميل
- **الرسائل النصية**: رموز SMS
- **تطبيق المصادقة**: TOTP (Google Authenticator, Authy)
- **رموز النسخ الاحتياطي**: للطوارئ

#### Google OAuth Integration
- ربط/إلغاء ربط حساب Google
- تسجيل دخول سريع
- دعم النطاقات المتعددة
- إعادة توجيه آمنة

#### إدارة الجلسات
- عرض الجلسات النشطة
- إنهاء جلسات محددة
- إنهاء جميع الجلسات الأخرى
- تتبع معلومات الجهاز والموقع

#### الأجهزة الموثوقة
- تسجيل الأجهزة الموثوقة
- مستويات الثقة (0-100%)
- إزالة الأجهزة
- تتبع الاستخدام

### 🛡️ ميزات الخصوصية

#### إعدادات الرؤية
- **عام**: مرئي للجميع
- **المؤسسة**: مرئي لأعضاء المؤسسة فقط
- **خاص**: مرئي للمستخدم فقط

#### التحكم في البيانات
- إظهار/إخفاء البريد الإلكتروني
- إظهار/إخفاء رقم الهاتف
- إظهار/إخفاء آخر نشاط
- إظهار/إخفاء الحالة الحالية

#### إعدادات جمع البيانات
- السماح بجمع البيانات
- السماح بالتحليلات
- رسائل التسويق
- تحديثات المنتج

### 📊 سجل الأنشطة الأمنية

#### أنواع الأنشطة المسجلة:
- تسجيل الدخول/الخروج
- تغيير كلمة المرور
- تحديث الإعدادات
- ربط/إلغاء ربط الحسابات
- إنهاء الجلسات
- إضافة/إزالة الأجهزة الموثوقة

#### مستويات المخاطر:
- **منخفض**: أنشطة عادية
- **متوسط**: تغييرات مهمة
- **عالي**: أنشطة حساسة
- **حرج**: تهديدات أمنية

### 🔧 إعداد النظام

#### 1. إعداد قاعدة البيانات
```bash
# تطبيق migrations
supabase db push

# أو تشغيل الملفات يدوياً
psql -f supabase/migrations/create_security_privacy_tables.sql
```

#### 2. إعداد Google OAuth
```bash
# إضافة متغيرات البيئة
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

#### 3. إعداد النطاقات
```bash
# تحديث ملف config.toml
# إضافة النطاقات الجديدة في additional_redirect_urls
```

### 🚀 الاستخدام

#### في مكون React:
```tsx
import { SecurityPrivacySettings } from '@/components/settings/SecurityPrivacySettings';

function SettingsPage() {
  return (
    <div>
      <SecurityPrivacySettings />
    </div>
  );
}
```

#### استخدام APIs:
```typescript
import { 
  getSecuritySettings,
  updateSecuritySettings,
  linkGoogleAccount 
} from '@/lib/api/security';

// جلب إعدادات الأمان
const settings = await getSecuritySettings();

// تحديث إعدادات
await updateSecuritySettings({
  two_factor_enabled: true,
  login_notification_enabled: true
});

// ربط حساب Google
await linkGoogleAccount();
```

### 🔍 مراقبة النظام

#### دوال قاعدة البيانات للمراقبة:
```sql
-- تنظيف الجلسات المنتهية
SELECT cleanup_expired_sessions();

-- تنظيف رموز التحقق
SELECT cleanup_expired_verification_codes();

-- التحقق من قوة كلمة المرور
SELECT check_password_strength('MyPassword123!');

-- التحقق من صحة النطاق الفرعي
SELECT validate_subdomain('client1', 'stockiha.com');
```

#### إحصائيات الأمان:
```sql
-- عدد المحاولات الفاشلة
SELECT COUNT(*) FROM security_logs 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours';

-- الأنشطة عالية المخاطر
SELECT * FROM security_logs 
WHERE risk_level IN ('high', 'critical')
ORDER BY created_at DESC;
```

### 🛠️ الصيانة والتحديث

#### مهام دورية:
```sql
-- تشغيل يومي: تنظيف البيانات المنتهية الصلاحية
SELECT cleanup_expired_sessions();
SELECT cleanup_expired_verification_codes();

-- تشغيل أسبوعي: تحليل الأنشطة الأمنية
SELECT activity_type, COUNT(*) as count
FROM security_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY activity_type;
```

#### إضافة نطاق جديد:
```sql
-- إضافة نطاق مدعوم جديد
INSERT INTO supported_domains (domain, is_active) 
VALUES ('newdomain.com', true);

-- إضافة نطاق فرعي للعميل
INSERT INTO client_subdomains (subdomain, domain_id, organization_id)
VALUES ('client1', (SELECT id FROM supported_domains WHERE domain = 'newdomain.com'), 'org-uuid');
```

### 🔒 أفضل الممارسات الأمنية

#### للمطورين:
1. **استخدم HTTPS دائماً** في الإنتاج
2. **فعّل RLS** على جميع الجداول الحساسة
3. **سجّل جميع الأنشطة الأمنية** باستخدام `logSecurityActivity()`
4. **تحقق من صحة المدخلات** قبل المعالجة
5. **استخدم tokens آمنة** للجلسات

#### للمديرين:
1. **راقب سجل الأنشطة** بانتظام
2. **فعّل التنبيهات** للأنشطة المشبوهة
3. **حدّث كلمات المرور** دورياً
4. **راجع الأجهزة الموثوقة** شهرياً
5. **نظّف البيانات المنتهية الصلاحية** أسبوعياً

### 📈 المقاييس والتحليلات

#### مؤشرات الأداء الرئيسية:
- معدل نجاح تسجيل الدخول
- عدد الجلسات النشطة
- معدل استخدام 2FA
- عدد الأنشطة المشبوهة
- معدل ربط حسابات Google

#### تقارير دورية:
- تقرير أسبوعي للأنشطة الأمنية
- تقرير شهري لاستخدام النظام
- تقرير ربع سنوي للمخاطر الأمنية

### 🆘 استكشاف الأخطاء

#### مشاكل شائعة:

**1. خطأ redirect_uri_mismatch**
```bash
# الحل: تأكد من إضافة جميع URIs في Google Console
https://stockiha.com/auth/callback
https://client1.stockiha.com/auth/callback
```

**2. خطأ RLS Policy**
```sql
-- الحل: تحقق من سياسات الأمان
SELECT * FROM pg_policies WHERE tablename = 'user_security_settings';
```

**3. خطأ في تسجيل الأنشطة**
```sql
-- الحل: تحقق من دالة log_security_activity
SELECT log_security_activity(
  'user-uuid',
  'test_activity',
  'اختبار تسجيل النشاط'
);
```

### 📞 الدعم والمساعدة

للحصول على المساعدة:
1. راجع هذا الدليل أولاً
2. تحقق من سجل الأخطاء في قاعدة البيانات
3. راجع إعدادات Google OAuth
4. تأكد من صحة متغيرات البيئة

### 🔄 التحديثات المستقبلية

#### الميزات المخططة:
- [ ] مصادقة بالبصمة الحيوية
- [ ] تشفير end-to-end للرسائل
- [ ] نظام إدارة المخاطر المتقدم
- [ ] تكامل مع خدمات أمنية خارجية
- [ ] لوحة تحكم أمنية للمديرين

---

**تم إنشاء هذا النظام بواسطة فريق التطوير في stockiha.com**
**آخر تحديث: ديسمبر 2024** 