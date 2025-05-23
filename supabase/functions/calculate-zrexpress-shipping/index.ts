import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// تعريف رؤوس CORS مباشرة بدلاً من استيرادها
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
};

interface RequestBody {
  organizationId: string;
  wilayaId: string;
  isHomeDelivery: boolean;
}

interface ShippingCalculationResult {
  success: boolean;
  price: number;
  error: string | null;
}

serve(async (req) => {
  // التعامل مع طلبات OPTIONS للـ CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // التحقق من طريقة الطلب
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // تحليل البيانات المستلمة
    const { organizationId, wilayaId, isHomeDelivery = true } = await req.json() as RequestBody

    // التحقق من المعلومات المطلوبة
    if (!organizationId || !wilayaId) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'معلومات غير كاملة: يجب توفير معرف المنظمة والولاية'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // تسجيل المعلومات للتتبع
    console.log('Calculating ZR Express shipping price:', {
      organizationId,
      wilayaId,
      isHomeDelivery
    })

    // إنشاء اتصال Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        },
        auth: { persistSession: false }
      }
    )

    // الحصول على إعدادات ZR Express
    const settings = await getZRExpressSettings(supabaseClient, organizationId)
    if (!settings) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'لم يتم العثور على إعدادات ZR Express'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // إنشاء طلب التسعير
    const pricingData = {
      IDWilaya: wilayaId,
      TypeLivraison: isHomeDelivery ? '0' : '1' // 0 للتوصيل المنزلي، 1 للاستلام من المكتب
    }

    // إرسال طلب للحصول على سعر الشحن
    const response = await fetch(`${settings.base_url}/tarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': settings.api_token,
        'key': settings.api_key
      },
      body: JSON.stringify(pricingData)
    })

    // معالجة الرد
    if (!response.ok) {
      console.error('ZR Express API error:', response.status, await response.text())
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: `خطأ في الاتصال بـ ZR Express: ${response.status}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    console.log('ZR Express API response:', data)

    // التحقق من تنسيق الرد
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'استجابة غير متوقعة من ZR Express (يجب أن تكون مصفوفة)'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // البحث عن السعر المناسب للولاية المحددة
    const wilayaData = data.find(item => item.IDWilaya.toString() === wilayaId)

    if (!wilayaData) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: `لم يتم العثور على سعر للولاية ${wilayaId}`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // تحديد السعر حسب نوع التوصيل
    const price = isHomeDelivery
      ? parseFloat(wilayaData.Domicile)
      : parseFloat(wilayaData.Stopdesk)

    // التحقق من السعر
    if (isNaN(price) || price <= 0) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'سعر الشحن غير صالح أو غير متوفر'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // إرجاع النتيجة
    const result: ShippingCalculationResult = {
      success: true,
      price,
      error: null
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in calculate-zrexpress-shipping function:', error)
    return new Response(JSON.stringify({
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// دالة للحصول على إعدادات ZR Express
async function getZRExpressSettings(supabaseClient: any, organizationId: string) {
  try {
    // الحصول على معلومات مزود الشحن
    const { data: provider, error: providerError } = await supabaseClient
      .from('shipping_providers')
      .select('id, base_url')
      .eq('code', 'zrexpress')
      .single()

    if (providerError || !provider) {
      console.error('Error fetching ZR Express provider:', providerError)
      return null
    }

    // الحصول على إعدادات المزود للمنظمة
    const { data: settings, error: settingsError } = await supabaseClient
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', provider.id)
      .single()

    if (settingsError || !settings) {
      console.error('Error fetching ZR Express settings:', settingsError)
      return null
    }

    return {
      api_token: settings.api_token || '',
      api_key: settings.api_key || '',
      base_url: provider.base_url
    }
  } catch (error) {
    console.error('Error in getZRExpressSettings:', error)
    return null
  }
} 