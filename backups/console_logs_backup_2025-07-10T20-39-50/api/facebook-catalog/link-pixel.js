export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { catalogId, pixelId, accessToken } = req.body;

    if (!catalogId || !pixelId || !accessToken) {
      return res.status(400).json({ 
        error: 'Catalog ID, Pixel ID, and Access Token are required' 
      });
    }

    // ربط الكتالوج بـ Pixel باستخدام Facebook Graph API
    const linkResponse = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/product_catalogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        catalog_id: catalogId,
        access_token: accessToken
      })
    });

    const linkData = await linkResponse.json();

    if (!linkResponse.ok) {
      return res.status(400).json({ 
        error: 'Failed to link catalog to pixel',
        details: linkData.error?.message || 'Unknown error'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Catalog linked to Pixel successfully',
      catalogId: catalogId,
      pixelId: pixelId
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to link catalog to pixel',
      details: error.message 
    });
  }
}
