/**
 * خدمة تشفير بيانات الاشتراك
 *
 * تستخدم Web Crypto API للتشفير الآمن
 * مع HMAC للتوقيع الرقمي ومنع التلاعب
 */

// مفتاح التشفير - يتم توليده من معرف المؤسسة والجهاز
const ENCRYPTION_PREFIX = 'BZR_SUB_V2_';
const SIGNATURE_PREFIX = 'SIG_';

// واجهة البيانات المشفرة
interface EncryptedData {
  iv: string;           // Initialization Vector
  data: string;         // البيانات المشفرة
  signature: string;    // التوقيع الرقمي
  timestamp: number;    // وقت التشفير
  version: string;      // إصدار التشفير
}

// واجهة نتيجة التحقق
interface VerificationResult {
  valid: boolean;
  data: any | null;
  error?: string;
  tamperDetected?: boolean;
}

class SubscriptionCryptoService {
  private static instance: SubscriptionCryptoService;
  private readonly VERSION = '2.0';
  private keyCache: Map<string, CryptoKey> = new Map();
  private signingKeyCache: Map<string, CryptoKey> = new Map();

  static getInstance(): SubscriptionCryptoService {
    if (!SubscriptionCryptoService.instance) {
      SubscriptionCryptoService.instance = new SubscriptionCryptoService();
    }
    return SubscriptionCryptoService.instance;
  }

  /**
   * توليد مفتاح تشفير فريد لكل مؤسسة
   */
  private async deriveKey(organizationId: string, usage: 'encrypt' | 'sign'): Promise<CryptoKey> {
    const cacheKey = `${organizationId}_${usage}`;

    if (usage === 'encrypt' && this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }
    if (usage === 'sign' && this.signingKeyCache.has(cacheKey)) {
      return this.signingKeyCache.get(cacheKey)!;
    }

    // إنشاء بذرة فريدة من معرف المؤسسة
    const encoder = new TextEncoder();
    const seed = encoder.encode(`${ENCRYPTION_PREFIX}${organizationId}_${this.getDeviceFingerprint()}`);

    // استخدام PBKDF2 لاشتقاق مفتاح قوي
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      seed,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = encoder.encode(`${organizationId}_salt_${usage}`);

    if (usage === 'encrypt') {
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this.keyCache.set(cacheKey, key);
      return key;
    } else {
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign', 'verify']
      );
      this.signingKeyCache.set(cacheKey, key);
      return key;
    }
  }

  /**
   * الحصول على بصمة الجهاز (للمساعدة في إنشاء مفتاح فريد)
   */
  private getDeviceFingerprint(): string {
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0
      ];
      return components.join('|');
    } catch {
      return 'default_fingerprint';
    }
  }

  /**
   * تشفير البيانات
   */
  async encrypt(organizationId: string, data: any): Promise<string | null> {
    try {
      const encryptionKey = await this.deriveKey(organizationId, 'encrypt');
      const signingKey = await this.deriveKey(organizationId, 'sign');

      // تحويل البيانات إلى نص
      const jsonData = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonData);

      // إنشاء IV عشوائي
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // تشفير البيانات
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        dataBuffer
      );

      // إنشاء التوقيع الرقمي
      const timestamp = Date.now();
      const signatureData = encoder.encode(`${this.arrayBufferToBase64(encryptedBuffer)}:${timestamp}`);
      const signature = await crypto.subtle.sign(
        'HMAC',
        signingKey,
        signatureData
      );

      // تجميع البيانات المشفرة
      const encryptedData: EncryptedData = {
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(encryptedBuffer),
        signature: this.arrayBufferToBase64(signature),
        timestamp: timestamp,
        version: this.VERSION
      };

      return ENCRYPTION_PREFIX + btoa(JSON.stringify(encryptedData));
    } catch (error) {
      console.error('[SubscriptionCrypto] Encryption failed:', error);
      return null;
    }
  }

  /**
   * فك تشفير البيانات والتحقق من صحتها
   */
  async decrypt(organizationId: string, encryptedString: string): Promise<VerificationResult> {
    try {
      // التحقق من البادئة
      if (!encryptedString.startsWith(ENCRYPTION_PREFIX)) {
        return { valid: false, data: null, error: 'Invalid format', tamperDetected: true };
      }

      // استخراج البيانات
      const base64Data = encryptedString.slice(ENCRYPTION_PREFIX.length);
      const encryptedData: EncryptedData = JSON.parse(atob(base64Data));

      // التحقق من الإصدار
      if (encryptedData.version !== this.VERSION) {
        return { valid: false, data: null, error: 'Version mismatch', tamperDetected: false };
      }

      // التحقق من عمر البيانات (7 أيام كحد أقصى)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - encryptedData.timestamp > maxAge) {
        return { valid: false, data: null, error: 'Data expired', tamperDetected: false };
      }

      const encryptionKey = await this.deriveKey(organizationId, 'encrypt');
      const signingKey = await this.deriveKey(organizationId, 'sign');

      // التحقق من التوقيع أولاً
      const encoder = new TextEncoder();
      const signatureData = encoder.encode(`${encryptedData.data}:${encryptedData.timestamp}`);
      const expectedSignature = this.base64ToArrayBuffer(encryptedData.signature);

      const isSignatureValid = await crypto.subtle.verify(
        'HMAC',
        signingKey,
        expectedSignature,
        signatureData
      );

      if (!isSignatureValid) {
        console.warn('[SubscriptionCrypto] Signature verification failed - tampering detected!');
        return { valid: false, data: null, error: 'Invalid signature', tamperDetected: true };
      }

      // فك التشفير
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.data);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        encryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const jsonData = decoder.decode(decryptedBuffer);
      const data = JSON.parse(jsonData);

      return { valid: true, data: data, tamperDetected: false };
    } catch (error) {
      console.error('[SubscriptionCrypto] Decryption failed:', error);
      return { valid: false, data: null, error: 'Decryption failed', tamperDetected: true };
    }
  }

  /**
   * التحقق السريع من صحة البيانات المشفرة (بدون فك التشفير)
   */
  async verifyIntegrity(organizationId: string, encryptedString: string): Promise<boolean> {
    try {
      if (!encryptedString.startsWith(ENCRYPTION_PREFIX)) {
        return false;
      }

      const base64Data = encryptedString.slice(ENCRYPTION_PREFIX.length);
      const encryptedData: EncryptedData = JSON.parse(atob(base64Data));

      // التحقق من الإصدار والعمر
      if (encryptedData.version !== this.VERSION) return false;

      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - encryptedData.timestamp > maxAge) return false;

      // التحقق من التوقيع
      const signingKey = await this.deriveKey(organizationId, 'sign');
      const encoder = new TextEncoder();
      const signatureData = encoder.encode(`${encryptedData.data}:${encryptedData.timestamp}`);
      const expectedSignature = this.base64ToArrayBuffer(encryptedData.signature);

      return await crypto.subtle.verify(
        'HMAC',
        signingKey,
        expectedSignature,
        signatureData
      );
    } catch {
      return false;
    }
  }

  /**
   * مسح الكاش
   */
  clearKeyCache(): void {
    this.keyCache.clear();
    this.signingKeyCache.clear();
  }

  // ====== Helper Methods ======

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// تصدير المثيل الوحيد
export const subscriptionCrypto = SubscriptionCryptoService.getInstance();

// ====== Helper Functions للاستخدام المباشر ======

/**
 * تشفير بيانات الاشتراك
 */
export async function encryptSubscriptionData(organizationId: string, data: any): Promise<string | null> {
  return subscriptionCrypto.encrypt(organizationId, data);
}

/**
 * فك تشفير بيانات الاشتراك
 */
export async function decryptSubscriptionData(organizationId: string, encryptedData: string): Promise<VerificationResult> {
  return subscriptionCrypto.decrypt(organizationId, encryptedData);
}

/**
 * التحقق من سلامة البيانات
 */
export async function verifySubscriptionIntegrity(organizationId: string, encryptedData: string): Promise<boolean> {
  return subscriptionCrypto.verifyIntegrity(organizationId, encryptedData);
}
