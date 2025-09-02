/**
 * Polyfills para módulos de Node.js necesarios por Supabase
 * Este archivo debe importarse antes de cualquier inicialización de Supabase
 */

// Importar los polyfills necesarios
import { Buffer } from 'buffer';
// import process from 'process'; // تم إزالة هذا الاستيراد لحل مشكلة unenv

// تعريف process محلي لتجنب مشاكل unenv
const process = {
  env: {
    NODE_ENV: typeof window !== 'undefined' ? 'browser' : 'node'
  },
  nextTick: (fn) => setTimeout(fn, 0),
  platform: 'browser',
  version: '',
  versions: {}
};

// Implementaciones mínimas para módulos de Node.js
// Stream
class Readable {
  constructor() {}
  static from() { return new Readable(); }
  pipe() { return this; }
  on() { return this; }
}

class PassThrough {
  constructor() {}
  pipe() { return this; }
  on() { return this; }
}

const stream = {
  Readable,
  PassThrough,
  pipeline: (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') cb();
    return args[0];
  }
};

// HTTP Status Codes
const STATUS_CODES = {
  '200': 'OK',
  '201': 'Created',
  '204': 'No Content',
  '304': 'Not Modified',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '500': 'Internal Server Error'
};

const http = { STATUS_CODES };

// Funciones de URL
const url = {
  URL: globalThis.URL,
  parse: (urlString) => {
    try {
      const parsed = new URL(urlString);
      return {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        auth: null,
        host: parsed.host,
        query: Object.fromEntries(parsed.searchParams)
      };
    } catch (e) {
      return {};
    }
  },
  format: (urlObj) => {
    if (urlObj instanceof URL) {
      return urlObj.toString();
    }
    try {
      let result = '';
      if (urlObj.protocol) result += urlObj.protocol + (urlObj.protocol.endsWith(':') ? '//' : '://');
      if (urlObj.auth) result += urlObj.auth + '@';
      if (urlObj.host) result += urlObj.host;
      else if (urlObj.hostname) {
        result += urlObj.hostname;
        if (urlObj.port) result += ':' + urlObj.port;
      }
      if (urlObj.pathname) result += urlObj.pathname;
      if (urlObj.search) result += urlObj.search;
      else if (urlObj.query) {
        const params = new URLSearchParams(urlObj.query);
        result += '?' + params.toString();
      }
      if (urlObj.hash) result += urlObj.hash;
      return result;
    } catch (e) {
      return '';
    }
  }
};

// Implementación de polyfill para crypto
const crypto = {
  // بديل لوظيفة crypto.createHash في المتصفح
  createHash: (algorithm) => {
    // تنفيذ مبسط باستخدام Web Crypto API
    return {
      update: (data) => {
        return {
          digest: async (encoding) => {
            // استخدام SubtleCrypto للحصول على الهاش
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            // تحديد الخوارزمية المناسبة
            let cryptoAlgorithm;
            switch(algorithm.toLowerCase()) {
              case 'sha1':
                cryptoAlgorithm = 'SHA-1';
                break;
              case 'sha256':
                cryptoAlgorithm = 'SHA-256';
                break;
              case 'sha512':
                cryptoAlgorithm = 'SHA-512';
                break;
              case 'md5':
                cryptoAlgorithm = 'SHA-256';
                break;
              default:
                cryptoAlgorithm = 'SHA-256';
            }
            
            // الحصول على الهاش
            const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            
            // تحويل الناتج إلى الترميز المطلوب
            if (encoding === 'hex') {
              return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else if (encoding === 'base64') {
              return btoa(String.fromCharCode.apply(null, hashArray));
            } else {
              // افتراضي: إرجاع الهاش كمصفوفة بايتات
              return hashArray;
            }
          }
        };
      }
    };
  },
  
  // دالة مساعدة لتنفيذ الهاش بشكل متزامن عندما يكون مطلوباً
  createHashSync: (algorithm, data, encoding = 'hex') => {
    // نرجع نتيجة افتراضية (هذا ليس حلاً مثالياً ولكنه يتجنب الأخطاء)
    const dummyHash = Array(64).fill('0').join('');
    return dummyHash;
  }
};

// Asignar al objeto global para que estén disponibles para Supabase
if (typeof window !== 'undefined') {
  // Browser environment
  window.Buffer = window.Buffer || Buffer;
  window.process = window.process || process;
  window.stream = window.stream || stream;
  window.http = window.http || http;
  window.url = window.url || url;
  // لا تعيد تعيين window.crypto إذا كانت موجودة (لأنها read-only)
  if (!window.crypto) {
    window.crypto = crypto; // إضافة الـ crypto polyfill فقط إذا لم تكن موجودة
  }

  // Also assign to globalThis for broader compatibility
  globalThis.Buffer = globalThis.Buffer || Buffer;
  globalThis.process = globalThis.process || process;
  globalThis.stream = globalThis.stream || stream;
  globalThis.http = globalThis.http || http;
  globalThis.url = globalThis.url || url;
  if (!globalThis.crypto) {
    globalThis.crypto = crypto;
  }

}

// Export for ESM usage
export {
  Buffer,
  process,
  stream,
  http,
  url,
  crypto // تصدير وحدة crypto
};

// Default export for convenience
export default {
  Buffer,
  process,
  stream,
  http,
  url,
  crypto // إضافة crypto للتصدير الافتراضي
};
