/**
 * Health check endpoint for conversion events API
 * GET /api/conversion-events/health
 */
export default function handler(req, res) {
  // تمكين CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // إرجاع حالة صحية للـ API
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apis: {
      facebook: 'available',
      tiktok: 'available',
      google: 'available'
    }
  });
}
