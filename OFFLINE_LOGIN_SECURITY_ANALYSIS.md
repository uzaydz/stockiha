# تحليل أمان نظام تسجيل الدخول الأوفلاين

## 🔒 مصفوفة الأمان الحالية

### المستوى 1: تسجيل دخول المؤسسة (Tenant)

```
┌─────────────────────────────────────────────┐
│ Authentication Method: Supabase Auth         │
├─────────────────────────────────────────────┤
│ Component                    │ Status        │
├────────────────────────────────────────────┤
│ Password Transmission         │ ✅ HTTPS     │
│ Password Hashing              │ ✅ Bcrypt    │
│ Session Token Encryption      │ ⚠️  Partial  │
│ Local Storage Encryption      │ ❌ None      │
│ Offline Session Storage       │ ✅ AES-GCM   │
│ Token Expiration Validation   │ ✅ Checked   │
│ Revocation Support            │ ❌ No        │
└─────────────────────────────────────────────┘
```

### المستوى 2: تسجيل دخول الموظفين (Staff PIN)

```
┌─────────────────────────────────────────────┐
│ Authentication Method: 6-Digit PIN           │
├─────────────────────────────────────────────┤
│ Component                    │ Status        │
├────────────────────────────────────────────┤
│ PIN Hashing                   │ ✅ SHA-256   │
│ Salt Randomization            │ ✅ 16 bytes  │
│ Salt Storage                  │ ✅ Separate  │
│ Brute Force Protection        │ ❌ None      │
│ Rate Limiting                 │ ❌ None      │
│ Account Lockout               │ ❌ None      │
│ PIN Transmission              │ ✅ Direct    │
│ Offline Verification          │ ✅ IndexedDB │
│ Permission Validation         │ ⚠️  Local    │
│ Revocation Support            │ ❌ No        │
└─────────────────────────────────────────────┘
```

## 🚨 الثغرات الأمنية الحرجة

### 1. ❌ تخزين البيانات الحساسة في localStorage

**الموقع**: Multiple files
**المخاطر**:
- XSS attacks يمكن قراءة localStorage
- بيانات غير مشفرة في الذاكرة
- طلب واحد عبر DevTools وتحصل على كل شيء

**البيانات المتأثرة**:
```javascript
// localStorage keys (Plain Text ❌)
bazaar_offline_auth_snapshot_v1  // Email + User metadata
staff_session                     // Staff name + permissions
admin_mode                        // Boolean admin flag
secure_offline_session_meta_v1    // User ID + Expiration
```

**التوصية**:
```typescript
// استخدم IndexedDB مع encryption بدلاً من localStorage
// أو على الأقل استخدم sessionStorage للبيانات المؤقتة
// أو استخدم service workers مع encryption

// ✅ الحل المقترح:
1. IndexedDB + encrypted fields
2. sessionStorage فقط للجلسة الحالية
3. service worker encryption layer
```

---

### 2. ❌ عدم وجود حماية ضد Brute Force للموظفين

**الموقع**: src/pages/StaffLogin.tsx
**المشكلة**:
- PIN 6 أرقام = 1 مليون احتمالية
- بدون تأخير بين المحاولات
- يمكن الحصول على PIN في ثوان

**الهجوم المحتمل**:
```python
import time
import requests

# Offline attack (super fast)
for i in range(1000000):
    pin = str(i).zfill(6)
    verify_pin_offline(pin)  # No delay!
    
# Online attack (slower but possible)
for i in range(1000000):
    result = api.verify_pin(pin)  # ~100ms per request
    if result.success:
        print(f"PIN found: {pin}")
        break
    time.sleep(0.1)  # No server-side rate limiting!
```

**التوصية**:
```typescript
// ✅ تطبيق حماية محلية
1. تتبع محاولات فاشلة
2. تأخير تصاعدي (exponential backoff)
3. قفل مؤقت بعد N محاولات خاطئة
4. تنبيهات على محاولات تحرز الحساب

// ✅ تطبيق حماية في الخادم
1. Rate limiting per IP/organization
2. Account lockout after 5 attempts
3. Temporary ban (15 minutes)
4. Logging suspicious activities
5. Captcha after 3 failures
```

---

### 3. ⚠️ مفتاح Electron محفوظ بشكل ثابت

**الموقع**: electron/secureStorage.cjs
**المشكلة**:
```javascript
encryptionKey: 'stockiha-secure-encryption-key-2024'
```
- المفتاح ثابت في الكود!
- إذا تم الوصول للملف، يمكن فك التشفير
- لا يوجد مفتاح ديناميكي لكل جهاز

**التوصية**:
```typescript
// ✅ استخدام مفتاح ديناميكي
import { safeStorage } from 'electron';
import { randomBytes } from 'crypto';

// الخطوة 1: إنشاء مفتاح لكل تثبيت
const deviceKey = safeStorage.encryptString(
  randomBytes(32).toString('hex')
);

// الخطوة 2: تخزين المفتاح في النظام
store.set('device_encryption_key', deviceKey);

// الخطوة 3: استخدام المفتاح
const encryptionKey = safeStorage.decryptString(
  store.get('device_encryption_key')
);
```

---

### 4. ❌ عدم وجود آلية إبطال (Revocation)

**المشكلة**:
- PIN محفوظ محلياً بشكل دائم
- لا يمكن إبطال PIN فوراً
- الموظف المفصول يمكنه تسجيل الدخول أوفلاين

**السيناريو الخطير**:
```
Admin: فصل موظف من النظام
Server: PIN محدث (disabled)
Offline Device: Still has old cached PIN!
Result: Fired employee can still work offline ❌
```

**التوصية**:
```typescript
// ✅ تطبيق نظام إبطال
interface CachedPIN {
  staffId: string;
  pin_hash: string;
  salt: string;
  permissions: object;
  cached_at: timestamp;
  revoked: boolean;  // ← جديد
  revoked_at?: timestamp;  // ← جديد
}

// عند الاتصال بالإنترنت:
1. تحقق من قائمة الإبطال من الخادم
2. حدث حالة revoked محلياً
3. منع تسجيل الدخول للموظفين المبطلين
4. مسح PIN المبطلة عند الطلب
```

---

### 5. ❌ عدم وجود تحقق من صلاحيات الخادم

**المشكلة**:
```typescript
// الصلاحيات مخزنة محلياً فقط!
staff.permissions = {
  canEditProducts: true,
  canManageSettings: true,
  canViewReports: true
}

// يمكن تعديلها محلياً!
localStorage.setItem('staff_session', {
  ...staff,
  permissions: { ...allPermissionsTrue }
})
```

**التوصية**:
```typescript
// ✅ تحقق من الخادم عند كل عملية حساسة
async function canPerformAction(action: string) {
  // Try server first
  try {
    const response = await api.checkPermission(action);
    return response.allowed;
  } catch (error) {
    // Fallback to local (offline)
    return localStaff.permissions[action] ?? false;
  }
}

// للعمليات الحساسة جداً:
// ��� احتفظ بـ sensitive actions لـ online فقط
```

---

## 🛡️ التوصيات الأمنية

### الأولوية 1: حرجة (Do Immediately)

#### 1.1 تطبيق Rate Limiting للموظفين
```typescript
// src/pages/StaffLogin.tsx
const [failedAttempts, setFailedAttempts] = useState(0);
const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

const handleVerifyPin = async (pinCode: string) => {
  // Check lockout
  if (lockoutUntil && new Date() < lockoutUntil) {
    const secondsLeft = Math.ceil(
      (lockoutUntil.getTime() - Date.now()) / 1000
    );
    toast.error(`حساب مقفول. حاول بعد ${secondsLeft} ثانية`);
    return;
  }

  // Verify PIN
  const result = await verifyStaffPinOffline(pin);
  
  if (!result.success) {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    
    // Lock after 5 attempts
    if (newAttempts >= 5) {
      const lockout = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      setLockoutUntil(lockout);
      toast.error('تم قفل الحساب لمدة 15 دقيقة');
    } else {
      toast.error(`فشلت المحاولة ${newAttempts}/5`);
    }
  } else {
    setFailedAttempts(0);
    setLockoutUntil(null);
    // Success...
  }
};
```

#### 1.2 إضافة checksum للبيانات المخزنة
```typescript
// src/context/auth/utils/authStorage.ts
import { createHmac } from 'crypto';

interface OfflineAuthSnapshot {
  // ... existing fields
  checksum?: string;  // ← جديد
}

export function saveOfflineAuthSnapshot(session: Session, user: User) {
  const snapshot: OfflineAuthSnapshot = {
    user: { ... },
    sessionMeta: { ... }
  };

  // Create HMAC to detect tampering
  const hmac = createHmac('sha256', 'secret-key-change-me');
  hmac.update(JSON.stringify(snapshot));
  snapshot.checksum = hmac.digest('hex');

  localStorage.setItem(OFFLINE_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function validateOfflineAuthSnapshot(
  snapshot: OfflineAuthSnapshot
): boolean {
  const { checksum, ...data } = snapshot;
  
  const hmac = createHmac('sha256', 'secret-key-change-me');
  hmac.update(JSON.stringify(data));
  const expectedChecksum = hmac.digest('hex');
  
  return checksum === expectedChecksum;
}
```

#### 1.3 استخدام sessionStorage بدلاً من localStorage
```typescript
// Store temporary auth data in sessionStorage (cleared on browser close)
const useSecureStorage = {
  setItem: (key: string, value: any) => {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  
  getItem: (key: string) => {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  }
};
```

---

### الأولوية 2: عالية (This Week)

#### 2.1 تحديث مفتاح Electron الديناميكي
```typescript
// electron/secureStorage.cjs
const { safeStorage } = require('electron');
const crypto = require('crypto');

function getOrCreateDeviceKey(app) {
  const keyPath = path.join(app.getPath('userData'), '.device-key');
  
  try {
    // Try to load existing key
    const encryptedKey = fs.readFileSync(keyPath, 'utf-8');
    return safeStorage.decryptString(encryptedKey);
  } catch (error) {
    // Create new key
    const newKey = crypto.randomBytes(32).toString('hex');
    const encryptedKey = safeStorage.encryptString(newKey);
    fs.writeFileSync(keyPath, encryptedKey, 'utf-8');
    return newKey;
  }
}

const deviceKey = getOrCreateDeviceKey(app);
const mainStore = new Store({
  name: 'config',
  cwd: app.getPath('userData'),
  schema,
  encryptionKey: deviceKey,  // ✅ Dynamic!
  clearInvalidConfig: true,
});
```

#### 2.2 تطبيق نظام Revocation
```typescript
// src/lib/offline/staffCredentials.ts
export interface LocalStaffPIN {
  id: string;
  organization_id: string;
  staff_name: string;
  pin_hash: string;
  salt: string;
  permissions?: any;
  updated_at: string;
  revoked: boolean;  // ← جديد
  revoked_at?: string;  // ← جديد
}

export async function checkStaffRevocation(
  organizationId: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `/api/organizations/${organizationId}/revoked-staff`
    );
    const { revoked_ids } = await response.json();
    
    // Update local database
    for (const staffId of revoked_ids) {
      const record = await inventoryDB.staffPins.get(staffId);
      if (record) {
        await inventoryDB.staffPins.put({
          ...record,
          revoked: true,
          revoked_at: new Date().toISOString()
        });
      }
    }
    
    return revoked_ids;
  } catch (error) {
    console.error('Failed to check revocation:', error);
    return [];
  }
}
```

#### 2.3 تشفير IndexedDB الحساسة
```typescript
// src/database/localDb.ts
import { encrypt, decrypt } from '@/lib/crypto';

export async function saveStaffPinEncrypted(pin: LocalStaffPIN) {
  const encrypted = {
    ...pin,
    pin_hash: await encrypt(pin.pin_hash),
    salt: await encrypt(pin.salt),
    permissions: await encrypt(JSON.stringify(pin.permissions))
  };
  
  await inventoryDB.staffPins.put(encrypted);
}

export async function getStaffPinDecrypted(staffId: string) {
  const record = await inventoryDB.staffPins.get(staffId);
  if (!record) return null;
  
  return {
    ...record,
    pin_hash: await decrypt(record.pin_hash),
    salt: await decrypt(record.salt),
    permissions: JSON.parse(await decrypt(record.permissions))
  };
}
```

---

### الأولوية 3: متوسطة (This Month)

#### 3.1 إضافة Audit Logging
```typescript
// src/lib/offline/auditLog.ts
interface OfflineAuditLog {
  id: string;
  organization_id: string;
  staff_id: string;
  action: string;
  timestamp: string;
  success: boolean;
  details?: object;
}

export async function logOfflineAction(log: OfflineAuditLog) {
  await inventoryDB.auditLogs.put(log);
  
  // Try to sync when online
  if (navigator.onLine) {
    try {
      await api.syncAuditLogs(log);
    } catch (error) {
      // Keep locally until synced
    }
  }
}
```

#### 3.2 تطبيق End-to-End Encryption
```typescript
// src/lib/crypto/e2ee.ts
import { generateKeyPair, encrypt, decrypt } from './sodium';

export async function setupE2EE() {
  const keyPair = await generateKeyPair();
  
  // Send public key to server
  await api.registerPublicKey(keyPair.publicKey);
  
  // Store private key securely (Electron only)
  if (window.electronAPI) {
    await window.electronAPI.secureSession.storePrivateKey(
      keyPair.privateKey
    );
  }
}

export async function encryptSensitiveData(data: any) {
  const publicKey = await getPublicKey();
  return await encrypt(JSON.stringify(data), publicKey);
}
```

#### 3.3 تطبيق Zero-Knowledge Proof
```typescript
// src/lib/offline/zkp.ts
// Verify PIN without sending actual PIN over network
// Use zero-knowledge proof (Schnorr protocol)
```

---

## 📊 مقاييس الأمان المقترحة

```
┌─────────────────────────────────────────────────┐
│ Security Metrics Dashboard                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Failed Login Attempts:                      │
│    ├─ Today: 12/50 (24%)                       │
│    ├─ This Week: 87/500 (17%)                  │
│    └─ Alert: > 30% anomaly                     │
│                                                 │
│ 2. Lockouts Triggered:                         │
│    ├─ Today: 2                                 │
│    ├─ Reason: Excessive failed attempts        │
│    └─ Duration: 15 minutes each                │
│                                                 │
│ 3. Revoked Staff:                              │
│    ├─ Total Revoked: 5                         │
│    ├─ Cached Revocations Synced: 5             │
│    └─ Status: ✅ All up-to-date                │
│                                                 │
│ 4. Data Integrity:                             │
│    ├─ HMAC Validation Pass Rate: 100%          │
│    ├─ Tampering Detected: 0                    │
│    └─ Status: ✅ Secure                        │
│                                                 │
│ 5. Encryption Status:                          │
│    ├─ Offline Sessions Encrypted: 85%          │
│    ├─ PIN Hashes with Salt: 100%               │
│    └─ Electron Key Dynamic: ⏳ Pending          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔍 اختبار الأمان المقترحة

### Unit Tests:
```typescript
describe('Offline Authentication Security', () => {
  it('should reject tampered offline snapshot', () => {
    const snapshot = loadOfflineAuthSnapshot();
    snapshot.user.email = 'attacker@evil.com';
    
    const isValid = validateOfflineAuthSnapshot(snapshot);
    expect(isValid).toBe(false);
  });

  it('should lock after 5 failed PIN attempts', () => {
    for (let i = 0; i < 5; i++) {
      verifyStaffPinOffline('000000');
    }
    
    const isLocked = isStaffLocked();
    expect(isLocked).toBe(true);
  });

  it('should not accept revoked staff PIN', () => {
    const staff = await getStaffPinDecrypted('staff-1');
    staff.revoked = true;
    
    const result = verifyStaffPinOffline('123456');
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests:
```typescript
describe('Offline-to-Online Sync', () => {
  it('should sync revoked staff on reconnect', async () => {
    // Simulate offline environment
    // Perform actions as revoked staff
    // Go online
    // Verify revocation synced
  });

  it('should resolve conflicts between local and server', async () => {
    // Local: PIN changed to 111111
    // Server: PIN changed to 222222
    // Expected: Server wins
  });
});
```

---

## ✅ Checklist التنفيذ

### Phase 1 (Week 1-2):
- [ ] تطبيق Rate Limiting للموظفين
- [ ] إضافة checksum للبيانات المخزنة
- [ ] تبديل من localStorage إلى sessionStorage
- [ ] إضافة Unit Tests

### Phase 2 (Week 3-4):
- [ ] تحديث مفتاح Electron الديناميكي
- [ ] تطبيق نظام Revocation
- [ ] تشفير بيانات IndexedDB الحساسة
- [ ] تطبيق Audit Logging

### Phase 3 (Week 5-6):
- [ ] End-to-End Encryption
- [ ] Zero-Knowledge Proof للـ PIN
- [ ] Security Dashboard
- [ ] Penetration Testing

---

## 📚 المراجع والموارد

1. **OWASP Authentication Cheat Sheet**
   https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

2. **Web Storage Security**
   https://cheatsheetseries.owasp.org/cheatsheets/Secure_Local_Storage.html

3. **Rate Limiting Best Practices**
   https://tools.ietf.org/html/draft-polli-ratelimit-headers

4. **Zero-Knowledge Proof**
   https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/

5. **Electron Security**
   https://www.electronjs.org/docs/tutorial/security

