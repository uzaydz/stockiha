import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// إعداد Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return new Response(
        JSON.stringify({ 
          error: 'معرف المنتج مطلوب',
          message: 'productId query parameter is required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔍 جلب إعدادات التحويل للمنتج:', productId);

    // إنشاء Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // استخدام الدالة المحسنة مع التخزين المؤقت
    const { data, error } = await supabase
      .rpc('get_conversion_settings_cached', { 
        p_product_id: productId 
      });

    if (error) {
      console.error('❌ خطأ في جلب إعدادات التحويل:', error);
      return new Response(
        JSON.stringify({
          error: 'فشل في جلب الإعدادات',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ تم جلب إعدادات التحويل:', data);

    // إعداد response مع cache headers
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // 5 دقائق
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    };

    return new Response(
      JSON.stringify({ 
        settings: data || {},
        cached_at: new Date().toISOString(),
        success: true
      }),
      { 
        status: 200, 
        headers: responseHeaders
      }
    );

  } catch (error) {
    console.error('❌ خطأ في Edge Function:', error);
    return new Response(
      JSON.stringify({
        error: 'خطأ داخلي في الخادم',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 