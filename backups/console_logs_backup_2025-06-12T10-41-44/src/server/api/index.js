import express from 'express';
import cors from 'cors';
import domainVerificationApi from './domain-verification-api.js';
import domainRoutes from '../routes/domain-routes.js';
import conversionTrackingRoutes from './conversion-tracking.js';

// إنشاء تطبيق Express
const app = express();

// تكوين CORS
app.use(cors());

// استخدام middleware لتحليل JSON
app.use(express.json());

// استخدام موجهات API
app.use('/api', domainVerificationApi);
app.use('/api', domainRoutes);
app.use('/api', conversionTrackingRoutes);

// واجهة برمجية افتراضية للتحقق من حالة الخادم
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// تصدير التطبيق
export default app;
