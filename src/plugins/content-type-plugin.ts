import type { Plugin, ViteDevServer } from 'vite';
import type { Connect } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import { setContentHeaders } from './headers-helpers';

// Custom plugin to ensure correct content types - Enhanced to fix CSS MIME issues
export function contentTypePlugin(): Plugin {
  return {
    name: 'content-type-plugin',
    enforce: 'pre', // ✅ تطبيق مبكر لضمان الأولوية
    configureServer(server: ViteDevServer) {
      // ✅ إضافة middleware مع أولوية عالية - يعمل على جميع الطلبات
      server.middlewares.use('/', (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url || '';
        
        // ✅ إصلاح مشكلة CSS MIME - فحص شامل ومحسن للملفات المبنية
        if (url.includes('.css') || url.match(/\/assets\/css\/.*\.css/) || url.match(/main-.*\.css/)) {
          // إزالة جميع headers المحتملة
          res.removeHeader('Content-Type');
          res.removeHeader('content-type');
          res.removeHeader('Content-type');
          
          // تعيين MIME type صحيح مع أولوية قصوى
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          
        }
        
        // Set proper content type for HTML files
        else if (url === '/' || url.endsWith('.html')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'text/html; charset=utf-8');
        }
        
        // ✅ إصلاح مشكلة JavaScript MIME
        else if (url.endsWith('.js') || url.includes('.js?')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'application/javascript; charset=utf-8');
        }
        
        // 🎨 إعدادات خاصة لملفات الخطوط
        else if (url.endsWith('.woff2')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'font/woff2', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        else if (url.endsWith('.woff')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'font/woff', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        
        // إضافة ترويسات للملفات JSON
        else if (url.endsWith('.json')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'application/json; charset=utf-8');
        }
        
        // إضافة ترويسات للملفات SVG
        else if (url.endsWith('.svg')) {
          res.removeHeader('Content-Type');
          setContentHeaders(res, 'image/svg+xml; charset=utf-8');
        }
        
        // ✅ إضافة معالجة لملفات الصور
        else if (url.match(/\.(png|jpg|jpeg|webp|avif)$/)) {
          const ext = url.split('.').pop();
          const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'avif': 'image/avif'
          };
          if (ext && mimeTypes[ext as keyof typeof mimeTypes]) {
            res.removeHeader('Content-Type');
            setContentHeaders(res, mimeTypes[ext as keyof typeof mimeTypes], 'public, max-age=31536000');
          }
        }
        
        next();
      });
    }
  };
}
