# دليل ربط النظام مع Google Authenticator

## نظرة عامة

هذا الدليل يوضح كيفية ربط نظام المصادقة الثنائية في Bazaar Console مع تطبيق Google Authenticator أو أي تطبيق TOTP آخر.

## متطلبات النظام

### 1. تطبيقات المصادقة المدعومة:
- **Google Authenticator** (iOS/Android) - الأكثر شيوعاً
- **Microsoft Authenticator** (iOS/Android) - يدعم النسخ الاحتياطي
- **Authy** (iOS/Android/Desktop) - يدعم المزامنة عبر الأجهزة
- **1Password** - مدير كلمات مرور مع دعم TOTP
- **Bitwarden** - مدير كلمات مرور مع دعم TOTP

### 2. معايير TOTP المستخدمة:
- **الخوارزمية**: SHA1
- **عدد الأرقام**: 6
- **الفترة الزمنية**: 30 ثانية
- **التشفير**: Base32

## خطوات الإعداد

### الخطوة 1: تحميل تطبيق المصادقة

#### لـ Google Authenticator:
- **iOS**: [App Store](https://apps.apple.com/app/google-authenticator/id388497605)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)

### الخطوة 2: إعداد المصادقة الثنائية في Bazaar Console

1. **انتقل إلى الإعدادات**:
   ```
   الإعدادات → الأمان والخصوصية → تبويب "الأمان"
   ```

2. **ابدأ إعداد المصادقة الثنائية**:
   - اضغط على "إعداد المصادقة الثنائية"
   - سيتم توليد QR Code ومفتاح سري

### الخطوة 3: ربط التطبيق

#### الطريقة الأولى: مسح QR Code (الأسهل)

1. **افتح Google Authenticator**
2. **اضغط على "+"** أو "إضافة حساب"
3. **اختر "مسح رمز QR"**
4. **امسح الرمز** المعروض في Bazaar Console
5. **تأكد من ظهور الحساب** باسم "Bazaar Console"

#### الطريقة الثانية: الإدخال اليدوي

1. **افتح Google Authenticator**
2. **اضغط على "+"** أو "إضافة حساب"
3. **اختر "إدخال مفتاح الإعداد"**
4. **أدخل المعلومات**:
   - **اسم الحساب**: بريدك الإلكتروني
   - **المفتاح**: المفتاح السري المعروض
   - **نوع المفتاح**: Time-based

### الخطوة 4: التحقق والتفعيل

1. **انتظر ظهور رمز** في Google Authenticator (6 أرقام)
2. **أدخل الرمز** في حقل "رمز التحقق" في Bazaar Console
3. **اضغط "تفعيل المصادقة الثنائية"**
4. **احفظ backup codes** المعروضة في مكان آمن

## مثال عملي للإعداد

### معلومات الحساب النموذجية:
```
اسم الحساب: user@example.com
المُصدر: Bazaar Console
المفتاح السري: JBSWY3DPEHPK3PXP
نوع الرمز: Time-based (TOTP)
الخوارزمية: SHA1
الأرقام: 6
الفترة: 30 ثانية
```

### QR Code URL النموذجي:
```
otpauth://totp/Bazaar%20Console:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Bazaar%20Console&algorithm=SHA1&digits=6&period=30
```

## استخدام المصادقة الثنائية

### عند تسجيل الدخول:
1. **أدخل بريدك وكلمة المرور** كالمعتاد
2. **افتح Google Authenticator**
3. **ابحث عن "Bazaar Console"**
4. **أدخل الرمز المعروض** (6 أرقام)
5. **اضغط تسجيل الدخول**

### في حالة الطوارئ:
- **استخدم backup code** إذا فقدت الهاتف
- **كل backup code يُستخدم مرة واحدة فقط**
- **أعد توليد backup codes** بعد استخدام معظمها

## استكشاف الأخطاء

### المشكلة: "رمز التحقق غير صحيح"

#### الأسباب المحتملة:
1. **وقت الجهاز غير متزامن**
2. **الرمز منتهي الصلاحية** (يتغير كل 30 ثانية)
3. **خطأ في الإدخال**
4. **إعدادات خاطئة في التطبيق**

#### الحلول:
```bash
# تحقق من وقت الجهاز
1. تأكد من أن وقت الهاتف صحيح
2. فعّل "التزامن التلقائي للوقت"
3. انتظر رمز جديد (30 ثانية)
4. تأكد من إعدادات TOTP الصحيحة
```

### المشكلة: لا يظهر QR Code

#### الحلول:
1. **استخدم الإدخال اليدوي**
2. **تحقق من إعدادات المتصفح**
3. **جرب متصفح آخر**
4. **تأكد من الاتصال بالإنترنت**

### المشكلة: فقدان الهاتف

#### الحلول:
1. **استخدم backup code للدخول**
2. **أعد إعداد المصادقة الثنائية**
3. **أعد توليد backup codes جديدة**
4. **احفظ الرموز في مكان آمن**

## الأمان وأفضل الممارسات

### حماية backup codes:
- **احفظها في مدير كلمات مرور**
- **اطبعها واحفظها في خزنة**
- **لا تشاركها مع أحد**
- **أعد توليدها دورياً**

### حماية الهاتف:
- **فعّل قفل الشاشة**
- **استخدم بصمة أو رمز PIN**
- **فعّل النسخ الاحتياطي للتطبيق**
- **احتفظ بنسخة احتياطية من المفاتيح**

### نصائح إضافية:
- **استخدم أكثر من جهاز** (هاتف + جهاز لوحي)
- **فعّل المصادقة الثنائية** على جميع الحسابات المهمة
- **راجع الأنشطة الأمنية** دورياً
- **حدّث التطبيقات** باستمرار

## التكامل التقني

### للمطورين: تنفيذ TOTP

#### مكتبات JavaScript الموصى بها:
```javascript
// استخدام مكتبة otplib
import { authenticator } from 'otplib';

// توليد secret
const secret = authenticator.generateSecret();

// توليد QR Code URL
const otpauth = authenticator.keyuri(
  'user@example.com',
  'Bazaar Console', 
  secret
);

// التحقق من الرمز
const isValid = authenticator.verify({
  token: userCode,
  secret: secret
});
```

#### مكتبات Python:
```python
import pyotp
import qrcode

# توليد secret
secret = pyotp.random_base32()

# إنشاء TOTP
totp = pyotp.TOTP(secret)

# توليد QR Code
qr_url = totp.provisioning_uri(
    name='user@example.com',
    issuer_name='Bazaar Console'
)

# التحقق من الرمز
is_valid = totp.verify(user_code)
```

### قاعدة البيانات:

#### جدول user_security_settings:
```sql
CREATE TABLE user_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_method TEXT DEFAULT 'totp',
    totp_secret TEXT, -- Base32 encoded
    backup_codes TEXT[], -- Array of backup codes
    backup_codes_used TEXT[] DEFAULT '{}',
    backup_codes_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## مراقبة ومتابعة

### إحصائيات الاستخدام:
```sql
-- معدل تبني المصادقة الثنائية
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as enabled_users,
    ROUND(
        COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as adoption_rate
FROM user_security_settings;

-- الأنشطة الأمنية
SELECT 
    activity_type,
    COUNT(*) as count,
    status
FROM security_logs 
WHERE activity_type LIKE '%2fa%'
GROUP BY activity_type, status
ORDER BY count DESC;
```

### تنبيهات الأمان:
- **محاولات تحقق فاشلة متكررة**
- **استخدام backup codes**
- **تسجيل دخول من أجهزة جديدة**
- **تغييرات في إعدادات المصادقة**

## الخلاصة

ربط نظام المصادقة الثنائية مع Google Authenticator يوفر:

✅ **أمان عالي** - حماية إضافية للحساب  
✅ **سهولة الاستخدام** - واجهة بسيطة ومألوفة  
✅ **موثوقية** - يعمل بدون اتصال إنترنت  
✅ **توافق واسع** - يدعم معايير TOTP القياسية  
✅ **نسخ احتياطية** - backup codes للطوارئ  

النظام جاهز للاستخدام ويوفر تجربة مستخدم ممتازة مع أعلى مستويات الأمان! 🔐 