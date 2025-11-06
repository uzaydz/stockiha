# مرجع سريع: نظام تسجيل الدخول الأوفلاين

## 🎯 الإجابات المختصرة على الأسئلة الستة

### 1️⃣ كيف يعمل تسجيل دخول المؤسسة (Tenant) أوفلاين؟

```
Email + Password → Supabase (Online) أو localStorage (Offline)
    ↓
حفظ: offline auth snapshot + secure session + metadata
    ↓
الجلسة الأوفلاين: valid إذا لم تنتهِ صلاحيتها (expires_at)
```

**الملفات الرئيسية**:
- `src/context/auth/services/authService.ts` - تسجيل الدخول
- `src/context/auth/utils/authStorage.ts` - حفظ الجلسة

---

### 2️⃣ كيف يعمل تسجيل دخول الموظفين (Staff) أوفلاين؟

```
PIN 6 أرقام → Database Check (Online) أو IndexedDB (Offline)
    ↓
Hash Verification: SHA-256(salt:PIN) == stored_hash
    ↓
حفظ: staff_session في localStorage
    ↓
الموظف يعمل بـ Offline Permissions
```

**الملفات الرئيسية**:
- `src/pages/StaffLogin.tsx` - واجهة الإدخال
- `src/lib/offline/staffCredentials.ts` - التحقق والحفظ
- `src/database/localDb.ts` - قاعدة البيانات المحلية

---

### 3️⃣ هل هناك نظام PIN للموظفين؟

✅ **نعم** - 6 أرقام بدون كلمة سر:
```
Specs:
├─ Length: 6 digits
├─ Input: Numeric only
├─ Storage: IndexedDB (staffPins table)
├─ Format: SHA-256(salt:pin)
├─ Salt: Random 16 bytes (Base64)
└─ Verification: Hash comparison

Creation: staffService.createStaffWithAuth()
Update: UpdateOfflinePinDialog.tsx
Verify: verifyStaffPinOffline() أو staffService.verifyPin()
```

---

### 4️⃣ أين يتم تخزين بيانات المصادقة محلياً؟

```
Browser:
├─ localStorage:
│  ├─ bazaar_offline_auth_snapshot_v1 (User data)
│  ├─ staff_session (Staff info)
│  ├─ admin_mode (Boolean)
│  └─ secure_offline_session_meta_v1 (Token meta)
│
├─ sessionStorage:
│  ├─ auth_session_cache
│  ├─ auth_last_redirect
│  └─ auth_login_redirect_count
│
└─ IndexedDB (Dexie):
   └─ staffPins table (PIN hashes)

Electron:
└─ electron-store (encrypted files)
   ├─ config (settings)
   ├─ session (temp data)
   └─ cache (non-sensitive)
```

---

### 5️⃣ هل البيانات مشفرة؟

```
Encryption Status:

User Session:
├─ localStorage: ❌ Plain JSON
├─ AES-GCM: ✅ Encrypted
└─ Fallback: ⚠️ Base64

PIN Hash:
├─ Storage: ✅ SHA-256 + Salt
├─ Salt: ✅ Random 16 bytes
└─ Comparison: ✅ Time-safe

Electron Store:
├─ main store: ✅ AES encrypted
├─ session store: ✅ AES encrypted
├─ cache store: ❌ Plaintext
└─ Key: ⚠️ Static (TODO: make dynamic)

IndexedDB:
├─ PIN hashes: ✅ SHA-256
├─ Permissions: ❌ Plain JSON
└─ Metadata: ❌ Plain text
```

---

### 6️⃣ كيف يتم التحقق من الهوية بدون إنترنت؟

#### للمؤسسة (Tenant):
```
Offline Check:
1. Load offline auth snapshot from localStorage
2. Verify:
   ├─ User ID exists?
   ├─ Session not expired? (check expires_at)
   └─ Organization ID matches?
3. Grant access if all valid
4. Use local permissions

Fallback on Reconnect:
└─ Re-authenticate with server to refresh session
```

#### للموظفين (Staff):
```
Offline Verification:
1. Get all staff PINs for organization from IndexedDB
2. For each staff:
   ├─ Get stored: pin_hash, salt
   ├─ Calculate: SHA-256(salt + input_PIN)
   └─ Compare: calculated == stored
3. If match found:
   ├─ Load staff data and permissions
   ├─ Create local session
   └─ Allow offline work
4. If no match:
   └─ Deny access

Fallback on Reconnect:
├─ Verify against server
├─ Sync any PIN updates
└─ Update permissions
```

---

## 🔐 ملخص الأمان

### ✅ ما هو آمن:

```
✅ Password hashing via Supabase (Bcrypt)
✅ HTTPS transmission
✅ PIN hashing via SHA-256 + salt
✅ Salt randomization (16 bytes)
✅ AES-GCM session encryption (optional)
✅ Token expiration validation
✅ Electron store encryption
```

### ⚠️ ما هو محفوف بالمخاطر:

```
⚠️ localStorage is plain text (XSS vulnerability)
⚠️ No rate limiting on PIN attempts
⚠️ No account lockout mechanism
⚠️ Static encryption key in Electron
⚠️ Permissions editable locally
⚠️ No PIN revocation system
```

### ❌ ما هو غير موجود:

```
❌ Brute force protection
❌ Account lockout
❌ Revocation mechanism
❌ Audit logging for offline actions
❌ End-to-end encryption
❌ Zero-knowledge proof
```

---

## 📂 هيكل الملفات الكامل

```
src/
├── lib/offline/
│   └── staffCredentials.ts ⭐ PIN hashing & verification
├── pages/
│   └── StaffLogin.tsx ⭐ UI for staff login
├── services/
│   └── staffService.ts ⭐ Staff API calls
├── database/
│   └── localDb.ts ⭐ IndexedDB setup (Dexie)
├── context/
│   ├── auth/
│   │   ├── services/
│   │   │   ├── authService.ts ⭐ User auth
│   │   │   └── sessionManager.ts
│   │   ├── utils/
│   │   │   ├── authStorage.ts ⭐ localStorage management
│   │   │   └── secureSessionStorage.ts ⭐ Session encryption
│   │   └── types/
│   │       └── auth.ts (Type definitions)
│   └── StaffSessionContext.tsx ⭐ Staff session state
├── components/auth/
│   ├── StaffLoginRedirect.tsx ⭐ Route guard for staff
│   └── ... (other auth components)
└── components/staff/
    └── UpdateOfflinePinDialog.tsx ⭐ Update PIN UI

electron/
├── main.cjs
├── preload.cjs
└── secureStorage.cjs ⭐ Electron encrypted storage

database/
└── ... (Supabase migrations & functions)
```

---

## 🚀 كيفية الاستخدام

### تسجيل دخول المؤسسة:
```typescript
// Online:
await authService.signIn(email, password);

// Offline:
const snapshot = loadOfflineAuthSnapshot();
if (snapshot && isSessionValid(snapshot)) {
  setAuthState(snapshot.user);
}
```

### تسجيل دخول الموظف:
```typescript
// Online:
const result = await staffService.verifyPin(pin);

// Offline:
const result = await verifyStaffPinOffline({
  organizationId: org.id,
  pin: pinCode
});

if (result.success) {
  setStaffSession(result.staff);
}
```

### تحديث PIN:
```typescript
// Save during online login:
await saveStaffPinOffline({
  staffId: staff.id,
  organizationId: org.id,
  staffName: staff.name,
  pin: pinCode,
  permissions: staff.permissions
});

// Update later:
await updateStaffPinOffline({
  staffId: staff.id,
  organizationId: org.id,
  newPin: newPinCode
});
```

---

## 📊 مقارنة سريعة

| Feature | User Auth | Staff PIN |
|---------|-----------|-----------|
| **Input** | Email + Password | 6 digits |
| **Online Verification** | Supabase RPC | staffService RPC |
| **Offline Verification** | localStorage snapshot | IndexedDB + hash |
| **Encryption** | AES-GCM (optional) | SHA-256 + salt |
| **Storage** | localStorage + IDB | localStorage + IDB |
| **Rate Limiting** | ❌ No | ❌ No |
| **Account Lockout** | ❌ No | ❌ No |
| **Revocation** | ❌ No | ❌ No |
| **Permissions** | From server | From server/local |
| **Session Duration** | Token expiry | Until logout |

---

## 🔗 ملفات الوثائق الإضافية

- **OFFLINE_LOGIN_SYSTEM_REPORT.md** - تقرير شامل (6 آلاف كلمة)
- **OFFLINE_LOGIN_SECURITY_ANALYSIS.md** - تحليل الأمان والتوصيات
- **QUICK_REFERENCE.md** - هذا الملف

---

## 💡 نصائح الاستخدام

### للتطوير:
```bash
# Test offline login
localStorage.setItem('bazaar_offline_auth_snapshot_v1', JSON.stringify({
  user: {...},
  sessionMeta: {...},
  organizationId: 'test-org'
}));

# Test staff PIN
// Use UpdateOfflinePinDialog to create test PINs
```

### للاختبار:
```typescript
// Test brute force (current vulnerability!)
for (let i = 0; i < 1000000; i++) {
  const pin = String(i).padStart(6, '0');
  const result = await verifyStaffPinOffline({
    organizationId: 'test-org',
    pin
  });
  if (result.success) {
    console.log('PIN found:', pin);
    break;
  }
}

// Test revocation (not implemented yet)
// Test offline sync (partial)
// Test token expiry (implemented)
```

---

## ⚡ الخطوات التالية المقترحة

### أمان (Priority 1):
1. [ ] Add rate limiting & account lockout
2. [ ] Migrate to sessionStorage + IndexedDB encryption
3. [ ] Fix static Electron encryption key

### الميزات (Priority 2):
1. [ ] Implement PIN revocation system
2. [ ] Add audit logging for offline actions
3. [ ] Implement offline permission sync

### الأداء (Priority 3):
1. [ ] Optimize IndexedDB queries
2. [ ] Add service worker encryption layer
3. [ ] Implement data compression for offline storage

