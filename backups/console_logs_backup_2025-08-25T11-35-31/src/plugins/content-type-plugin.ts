import type { Plugin, ViteDevServer } from 'vite';
import type { Connect } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import { setContentHeaders } from './headers-helpers';

// Custom plugin to ensure correct content types
export function contentTypePlugin(): Plugin {
  return {
    name: 'content-type-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        // Set proper content type for HTML files
        if (req.url === '/' || req.url?.endsWith('.html')) {
          setContentHeaders(res, 'text/html; charset=utf-8');
        }
        
        // 🎨 إعدادات خاصة لملفات الخطوط
        if (req.url?.endsWith('.woff2')) {
          setContentHeaders(res, 'font/woff2', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        if (req.url?.endsWith('.woff')) {
          setContentHeaders(res, 'font/woff', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        if (req.url?.endsWith('.css')) {
          setContentHeaders(res, 'text/css; charset=utf-8', 'public, max-age=3600');
        }
        
        // إضافة ترويسات للملفات JavaScript
        if (req.url?.endsWith('.js')) {
          setContentHeaders(res, 'application/javascript; charset=utf-8');
        }
        
        // إضافة ترويسات للملفات JSON
        if (req.url?.endsWith('.json')) {
          setContentHeaders(res, 'application/json; charset=utf-8');
        }
        
        // إضافة ترويسات للملفات SVG
        if (req.url?.endsWith('.svg')) {
          setContentHeaders(res, 'image/svg+xml; charset=utf-8');
        }
        
        next();
      });
    }
  };
}
