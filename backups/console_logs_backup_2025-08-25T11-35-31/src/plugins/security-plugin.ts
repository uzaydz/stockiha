import type { Plugin } from 'vite';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

// إنشاء nonce عشوائي آمن
function generateNonce(): string {
  return createHash('sha256').update(Math.random().toString()).digest('base64').slice(0, 16);
}

// حساب SRI hash للملف
function calculateSRI(filePath: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
  try {
    const content = fs.readFileSync(filePath);
    const hash = createHash(algorithm).update(content).digest('base64');
    return `${algorithm}-${hash}`;
  } catch (error) {
    console.warn(`⚠️ [Security Plugin] فشل في حساب SRI لـ ${filePath}:`, error);
    return '';
  }
}

// إنشاء CSP مع nonce ديناميكي
function generateCSP(nonce: string, isDev: boolean = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-inline'" : ""}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${isDev ? "" : `'nonce-${nonce}'`}`,
    "img-src 'self' data: https: blob: https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://api.yalidine.app https://connect.ktobi.online wss://connect.ktobi.online https://*.supabase.co wss://*.supabase.co ws://localhost:* wss://localhost:* ws://0.0.0.0:* wss://0.0.0.0:*",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests", "require-trusted-types-for 'script'", "trusted-types default"])
  ].join('; ');
}

// Plugin متقدم للأمان
export function securityPlugin(): Plugin {
  let nonce: string;
  let isDev: boolean;
  
  return {
    name: 'security-plugin',
    enforce: 'post',
    
    configResolved(config) {
      isDev = config.command === 'serve';
    },
    
    configureServer(server) {
      // إنشاء nonce جديد لكل جلسة
      nonce = generateNonce();
      console.log('🔐 [Security Plugin] تم إنشاء CSP nonce:', nonce);
      
      // إضافة middleware للأمان
      server.middlewares.use((req, res, next) => {
        // إضافة CSP header مع nonce ديناميكي
        res.setHeader('Content-Security-Policy', generateCSP(nonce, isDev));
        
        // إضافة headers أمان إضافية (أخف في بيئة التطوير)
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // headers إضافية فقط في الإنتاج
        if (!isDev) {
          res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
          res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
          res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
          // تعطيل COEP مؤقتاً لحل مشكلة تحميل الصور من Supabase
          // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          // تعطيل جميع Cross-Origin headers لحل مشكلة الصور
          // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          // res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        }
        
        // تأكد من عدم إرسال COEP في التطوير أيضاً
        // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // معطل نهائياً
        
        next();
      });
    },
    
    transformIndexHtml(html) {
      // إضافة nonce للـ scripts فقط (styles تعمل بـ unsafe-inline في التطوير)
      return html.replace(/<script/g, `<script nonce="${nonce}"`);
    },
    
    transform(code, id) {
      // إضافة nonce للـ inline scripts
      if (id.endsWith('.tsx') || id.endsWith('.ts')) {
        return code.replace(
          /<script>/g,
          `<script nonce="${nonce}">`
        );
      }
      return code;
    },
    
    generateBundle(options, bundle) {
      // إضافة SRI hashes للملفات الخارجية
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        if (file.type === 'asset' && typeof file.source === 'string') {
          // حساب SRI hash
          const sriHash = calculateSRI(path.resolve(process.cwd(), 'dist', fileName));
          if (sriHash) {
            console.log(`🔒 [Security Plugin] SRI hash لـ ${fileName}: ${sriHash}`);
          }
        }
      });
    }
  };
}

// Plugin لإنشاء SRI hashes
export function sriPlugin(): Plugin {
  return {
    name: 'sri-plugin',
    enforce: 'post',
    
    generateBundle(options, bundle) {
      const sriData: Record<string, string> = {};
      
      // حساب SRI hashes لجميع الملفات
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        if (file.type === 'asset' && typeof file.source === 'string') {
          const content = Buffer.from(file.source);
          const hash = createHash('sha384').update(content).digest('base64');
          sriData[fileName] = `sha384-${hash}`;
        }
      });
      
      // حفظ SRI hashes في ملف
      this.emitFile({
        type: 'asset',
        fileName: 'sri-hashes.json',
        source: JSON.stringify(sriData, null, 2)
      });
      
      console.log('🔒 [SRI Plugin] تم إنشاء SRI hashes لجميع الملفات');
    }
  };
}
