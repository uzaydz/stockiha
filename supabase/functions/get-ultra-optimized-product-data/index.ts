import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Cache configuration
const CACHE_TTL = {
  PRODUCT_DATA: 5 * 60 * 1000, // 5 minutes for product data
  STATIC_DATA: 30 * 60 * 1000, // 30 minutes for provinces/providers
  STORE_SETTINGS: 10 * 60 * 1000, // 10 minutes for store settings
};

// In-memory cache for static data (shared across requests)
const staticCache = new Map<string, { data: any; expires: number }>();

interface OptimizedProductPageData {
  product: any;
  colors: any[];
  sizes: any[];
  additional_images: any[];
  form_settings: any;
  marketing_settings: any;
  reviews: any[];
  shipping_data: {
    provinces: any[];
    provider_clones: any[];
    provider_settings: any[];
    default_provider: any;
  };
  organization_data: any;
  store_settings: any[];
  conversion_settings: any;
  cache_info: {
    timestamp: string;
    ttl: number;
    source: 'database' | 'cache';
    performance_data?: any;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { slug, organization_id } = await req.json();

    if (!slug || !organization_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: slug and organization_id' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate cache key
    const cacheKey = `product_page_${organization_id}_${slug}`;
    const now = Date.now();

    // Check cache first
    const cached = staticCache.get(cacheKey);
    if (cached && cached.expires > now) {
      return new Response(
        JSON.stringify({
          ...cached.data,
          cache_info: {
            timestamp: new Date().toISOString(),
            ttl: Math.floor((cached.expires - now) / 1000),
            source: 'cache'
          }
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${Math.floor((cached.expires - now) / 1000)}`,
            'X-Cache': 'HIT'
          },
          status: 200,
        }
      );
    }

    // Call the optimized SQL function
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'get_ultra_optimized_product_page_data',
      {
        p_slug: slug,
        p_org_id: organization_id,
      }
    );

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      
      let statusCode = 500;
      let errorMessage = 'Failed to retrieve product data';

      if (rpcError.message.includes('not found') || !rpcData) {
        statusCode = 404;
        errorMessage = 'Product not found or not available';
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage, 
          details: rpcError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode,
        }
      );
    }

    if (!rpcData || rpcData.product === null) {
      const errorMessage = rpcData?.error || 'Product not found or not available';
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          timestamp: rpcData?.timestamp || Date.now()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Structure the optimized response
    const optimizedResponse: OptimizedProductPageData = {
      product: rpcData.product || {},
      colors: rpcData.colors || [],
      sizes: rpcData.sizes || [],
      additional_images: rpcData.additional_images || [],
      form_settings: rpcData.form_settings,
      marketing_settings: rpcData.marketing_settings,
      reviews: rpcData.reviews || [],
      shipping_data: {
        provinces: rpcData.shipping_data?.provinces || [],
        provider_clones: rpcData.shipping_data?.provider_clones || [],
        provider_settings: rpcData.shipping_data?.provider_settings || [],
        default_provider: rpcData.shipping_data?.default_provider || null,
      },
      organization_data: rpcData.organization_data || {},
      store_settings: rpcData.store_settings || [],
      conversion_settings: rpcData.conversion_settings || {},
      cache_info: {
        timestamp: new Date().toISOString(),
        ttl: CACHE_TTL.PRODUCT_DATA / 1000,
        source: 'database',
        performance_data: rpcData.performance_info || {}
      }
    };

    // Cache the response
    staticCache.set(cacheKey, {
      data: optimizedResponse,
      expires: now + CACHE_TTL.PRODUCT_DATA
    });

    // Clean up expired cache entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, value] of staticCache.entries()) {
        if (value.expires <= now) {
          staticCache.delete(key);
        }
      }
    }

    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL.PRODUCT_DATA / 1000}`,
      'X-Cache': 'MISS',
      'X-Response-Time': `${Date.now() - now}ms`
    };

    return new Response(
      JSON.stringify(optimizedResponse),
      {
        headers: responseHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 