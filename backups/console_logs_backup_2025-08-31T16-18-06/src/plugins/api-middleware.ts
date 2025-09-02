import type { Plugin, ViteDevServer } from 'vite';
import type { Connect } from 'vite';
import { ServerResponse, IncomingMessage } from 'http';
import { setCorsHeaders, setContentHeaders } from './headers-helpers';

// API Middleware لمعالجة conversion events في development
export function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        
        // تمكين CORS
        setCorsHeaders(res);
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // معالجة /api/conversion-events/health
        if (req.url === '/conversion-events/health' && req.method === 'GET') {
          res.statusCode = 200;
          setContentHeaders(res, 'application/json');
          res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            apis: {
              facebook: 'available',
              tiktok: 'available',
              google: 'available'
            }
          }));
          return;
        }

        // معالجة /api/conversion-events/tiktok
        if (req.url === '/conversion-events/tiktok' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              
              // محاكاة إرسال ناجح إلى TikTok Events API
              
              res.statusCode = 200;
              setContentHeaders(res, 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Event sent to TikTok Events API (development mode)',
                event: data,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              res.statusCode = 400;
              setContentHeaders(res, 'application/json');
              res.end(JSON.stringify({
                error: 'Invalid JSON in request body'
              }));
            }
          });
          return;
        }

        // معالجة /api/conversion-events (general)
        if (req.url === '/conversion-events' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              
              // محاكاة تسجيل ناجح في قاعدة البيانات
              
              res.statusCode = 200;
              setContentHeaders(res, 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Event logged to database (development mode)',
                event: {
                  ...data,
                  id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  timestamp: new Date().toISOString()
                }
              }));
            } catch (error) {
              res.statusCode = 400;
              setContentHeaders(res, 'application/json');
              res.end(JSON.stringify({
                error: 'Invalid JSON in request body'
              }));
            }
          });
          return;
        }

        // إذا لم تكن API request متوقعة، مرر إلى التالي
        next();
      });
    }
  };
}
