# دليل نظام الأمان والخصوصية
# Security and Privacy System Guide

## نظرة عامة
تم إنشاء نظام شامل للأمان والخصوصية يتضمن إدارة إعدادات الأمان، الخصوصية، الجلسات، وتسجيل الأنشطة الأمنية.

## الجداول المنشأة

### 1. جدول إعدادات الأمان (`user_security_settings`)
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users.id)
- two_factor_method: TEXT ('totp', 'sms', 'email')
- max_active_sessions: INTEGER (افتراضي: 5)
- session_timeout_minutes: INTEGER (افتراضي: 480)
- require_reauth_for_sensitive: BOOLEAN (افتراضي: true)
- password_expiry_days: INTEGER (افتراضي: 90)
- require_strong_password: BOOLEAN (افتراضي: true)
- prevent_password_reuse: INTEGER (افتراضي: 5)
- login_notification_enabled: BOOLEAN (افتراضي: true)
- suspicious_activity_alerts: BOOLEAN (افتراضي: true)
- device_tracking_enabled: BOOLEAN (افتراضي: true)
- created_at, updated_at: TIMESTAMPTZ
```

### 2. جدول إعدادات الخصوصية (`privacy_settings`)
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users.id)
- profile_visibility: TEXT ('public', 'private', 'organization')
- show_email: BOOLEAN (افتراضي: false)
- show_phone: BOOLEAN (افتراضي: false)
- show_last_activity: BOOLEAN (افتراضي: true)
- allow_search_by_email: BOOLEAN (افتراضي: false)
- allow_search_by_phone: BOOLEAN (افتراضي: false)
- data_processing_consent: BOOLEAN (افتراضي: true)
- marketing_emails_consent: BOOLEAN (افتراضي: false)
- analytics_consent: BOOLEAN (افتراضي: true)
- third_party_sharing_consent: BOOLEAN (افتراضي: false)
- data_retention_period: INTEGER (افتراضي: 365 يوم)
- auto_delete_inactive_data: BOOLEAN (افتراضي: false)
- created_at, updated_at: TIMESTAMPTZ
```

### 3. جدول الجلسات (`user_sessions`)
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users.id)
- session_token: TEXT
- ip_address: INET
- user_agent: TEXT
- device_info: JSONB
- is_active: BOOLEAN (افتراضي: true)
- created_at: TIMESTAMPTZ
- last_activity_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
```

### 4. جدول سجلات الأمان (`security_logs`)
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users.id)
- activity_type: TEXT
- description: TEXT
- status: TEXT ('success', 'failure', 'warning')
- risk_level: TEXT ('low', 'medium', 'high', 'critical')
- ip_address: INET
- user_agent: TEXT
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

### 5. جدول الأجهزة الموثوقة (`trusted_devices`)
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users.id)
- device_fingerprint: TEXT
- device_name: TEXT
- device_type: TEXT
- is_trusted: BOOLEAN (افتراضي: false)
- last_used_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

## الدوال المتاحة

### 1. دوال إعدادات الأمان

#### `get_user_security_settings(user_id UUID)`
جلب إعدادات الأمان للمستخدم
```sql
SELECT * FROM get_user_security_settings('user-uuid-here');
```

#### `update_user_security_settings(user_id UUID, settings JSONB)`
تحديث إعدادات الأمان
```sql
SELECT update_user_security_settings(
    'user-uuid-here',
    '{"two_factor_enabled": true, "max_active_sessions": 3}'::jsonb
);
```

### 2. دوال إعدادات الخصوصية

#### `get_user_privacy_settings(user_id UUID)`
جلب إعدادات الخصوصية للمستخدم
```sql
SELECT * FROM get_user_privacy_settings('user-uuid-here');
```

#### `update_user_privacy_settings(user_id UUID, settings JSONB)`
تحديث إعدادات الخصوصية
```sql
SELECT update_user_privacy_settings(
    'user-uuid-here',
    '{"profile_visibility": "private", "show_email": false}'::jsonb
);
```

### 3. دوال إدارة الجلسات

#### `create_user_session(user_id, session_token, ip_address, user_agent, device_info)`
إنشاء جلسة جديدة
```sql
SELECT create_user_session(
    'user-uuid-here',
    'session-token',
    '192.168.1.1'::inet,
    'Mozilla/5.0...',
    '{"browser": "Chrome", "os": "Windows"}'::jsonb
);
```

#### `end_user_session(session_id UUID, user_id UUID)`
إنهاء جلسة محددة
```sql
SELECT end_user_session('session-uuid-here', 'user-uuid-here');
```

#### `get_user_active_sessions(user_id UUID)`
جلب الجلسات النشطة للمستخدم
```sql
SELECT * FROM get_user_active_sessions('user-uuid-here');
```

### 4. دوال تسجيل الأنشطة

#### `log_security_activity(user_id, activity_type, description, status, risk_level, ip_address, user_agent, metadata)`
تسجيل نشاط أمني
```sql
SELECT log_security_activity(
    'user-uuid-here',
    'login_attempt',
    'محاولة تسجيل دخول ناجحة',
    'success',
    'low',
    '192.168.1.1'::inet,
    'Mozilla/5.0...',
    '{"location": "الجزائر"}'::jsonb
);
```

## سياسات الأمان (RLS)

### سياسات user_security_settings
- المستخدمون يمكنهم عرض وتعديل إعداداتهم فقط
- المديرون يمكنهم عرض إعدادات مؤسستهم

### سياسات privacy_settings
- المستخدمون يمكنهم عرض وتعديل إعداداتهم فقط
- المديرون يمكنهم عرض إعدادات مؤسستهم

### سياسات user_sessions
- المستخدمون يمكنهم عرض وإدارة جلساتهم فقط
- المديرون يمكنهم عرض جلسات مؤسستهم

### سياسات security_logs
- المستخدمون يمكنهم عرض سجلاتهم فقط
- المديرون يمكنهم عرض سجلات مؤسستهم

## الميزات المتقدمة

### 1. إدارة الجلسات التلقائية
- حد أقصى للجلسات النشطة (قابل للتخصيص)
- إنهاء الجلسات القديمة تلقائياً
- تتبع نشاط الجلسات

### 2. تسجيل الأنشطة الأمنية
- تسجيل جميع الأنشطة المهمة
- تصنيف مستوى المخاطر
- تخزين معلومات إضافية (IP, User Agent, إلخ)

### 3. إعدادات الخصوصية المتقدمة
- التحكم في رؤية الملف الشخصي
- إدارة موافقات البيانات
- إعدادات الاحتفاظ بالبيانات

### 4. إعدادات الأمان المتقدمة
- المصادقة الثنائية
- إعدادات كلمة المرور
- تنبيهات الأمان

## استخدام النظام في التطبيق

### 1. في ملف API (`src/lib/api/security.ts`)
```typescript
import { supabase } from '@/lib/supabase';

export async function getUserSecuritySettings(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_security_settings', { p_user_id: userId });
  
  if (error) throw error;
  return data[0];
}

export async function updateUserSecuritySettings(userId: string, settings: any) {
  const { data, error } = await supabase
    .rpc('update_user_security_settings', {
      p_user_id: userId,
      p_settings: settings
    });
  
  if (error) throw error;
  return data;
}
```

### 2. في مكون React (`src/components/settings/SecurityPrivacySettings.tsx`)
```typescript
import { useState, useEffect } from 'react';
import { getUserSecuritySettings, updateUserSecuritySettings } from '@/lib/api/security';

export function SecurityPrivacySettings() {
  const [securitySettings, setSecuritySettings] = useState(null);
  
  useEffect(() => {
    loadSecuritySettings();
  }, []);
  
  const loadSecuritySettings = async () => {
    try {
      const settings = await getUserSecuritySettings(user.id);
      setSecuritySettings(settings);
    } catch (error) {
      console.error('خطأ في جلب إعدادات الأمان:', error);
    }
  };
  
  // باقي المكون...
}
```

## الصيانة والمراقبة

### 1. تنظيف البيانات القديمة
```sql
-- حذف الجلسات المنتهية الصلاحية (أكثر من 30 يوم)
DELETE FROM user_sessions 
WHERE is_active = false 
AND ended_at < NOW() - INTERVAL '30 days';

-- حذف سجلات الأمان القديمة (أكثر من 1 سنة)
DELETE FROM security_logs 
WHERE created_at < NOW() - INTERVAL '1 year'
AND risk_level = 'low';
```

### 2. مراقبة الأنشطة المشبوهة
```sql
-- البحث عن محاولات تسجيل دخول فاشلة متكررة
SELECT 
    user_id,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt
FROM security_logs 
WHERE activity_type = 'login_attempt' 
AND status = 'failure'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### 3. إحصائيات الاستخدام
```sql
-- إحصائيات الجلسات النشطة
SELECT 
    COUNT(*) as active_sessions,
    COUNT(DISTINCT user_id) as active_users
FROM user_sessions 
WHERE is_active = true;

-- إحصائيات الأنشطة الأمنية
SELECT 
    activity_type,
    status,
    COUNT(*) as count
FROM security_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY activity_type, status
ORDER BY count DESC;
```

## الأمان والحماية

### 1. تشفير البيانات الحساسة
- كلمات المرور مشفرة في `auth.users`
- رموز الجلسات محمية
- البيانات الشخصية محمية بـ RLS

### 2. التحقق من الصلاحيات
- جميع الدوال تستخدم `SECURITY DEFINER`
- سياسات RLS مطبقة على جميع الجداول
- التحقق من هوية المستخدم في كل عملية

### 3. مراقبة الأنشطة
- تسجيل جميع العمليات المهمة
- تتبع عناوين IP والمتصفحات
- تنبيهات للأنشطة المشبوهة

## الدعم والصيانة

### المشاكل الشائعة وحلولها

#### 1. مشكلة: المستخدم لا يستطيع الوصول لإعداداته
**الحل:**
```sql
-- التأكد من وجود إعدادات افتراضية
INSERT INTO user_security_settings (user_id) 
VALUES ('user-uuid-here')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO privacy_settings (user_id) 
VALUES ('user-uuid-here')
ON CONFLICT (user_id) DO NOTHING;
```

#### 2. مشكلة: الجلسات لا تنتهي تلقائياً
**الحل:**
```sql
-- إنهاء الجلسات المنتهية الصلاحية
UPDATE user_sessions 
SET is_active = false, ended_at = NOW()
WHERE is_active = true 
AND last_activity_at < NOW() - INTERVAL '8 hours';
```

#### 3. مشكلة: سجلات الأمان تتراكم
**الحل:**
```sql
-- إنشاء مهمة تنظيف دورية
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_logs 
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND risk_level IN ('low', 'medium');
END;
$$ LANGUAGE plpgsql;
```

## التطوير المستقبلي

### الميزات المخططة
1. **المصادقة الثنائية المتقدمة**
   - دعم تطبيقات المصادقة (Google Authenticator)
   - رسائل SMS للتحقق
   - رموز النسخ الاحتياطي

2. **تحليلات الأمان المتقدمة**
   - لوحة تحكم للمديرين
   - تقارير الأمان الدورية
   - تنبيهات في الوقت الفعلي

3. **إدارة الأجهزة المتقدمة**
   - تسجيل الأجهزة الموثوقة
   - إدارة الأجهزة المتصلة
   - تنبيهات الأجهزة الجديدة

4. **امتثال GDPR**
   - أدوات تصدير البيانات
   - حذف البيانات بناءً على الطلب
   - تتبع موافقات البيانات

---

**ملاحظة:** هذا النظام قابل للتوسع ويمكن تخصيصه حسب احتياجات المؤسسة. لأي استفسارات أو مشاكل، يرجى مراجعة هذا الدليل أو الاتصال بفريق التطوير. 