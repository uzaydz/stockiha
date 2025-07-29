import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// إعلان Deno للـ TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// تعريف رؤوس CORS محسنة لدعم جميع الأصول
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer, x-forwarded-for, user-agent, x-application-name',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400', // 24 ساعة
}

interface RequestBody {
  organizationId: string
  wilayaId: string
  isHomeDelivery: boolean
}

interface ShippingCalculationResult {
  success: boolean
  price: number
  error: string | null
  debug?: any
}

serve(async (req) => {
  
  // التعامل مع طلبات OPTIONS للـ CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // التحقق من طريقة الطلب
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false,
        price: 0,
        error: 'Method not allowed - only POST is supported' 
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // قراءة البيانات المستلمة
    let requestBody: RequestBody
    try {
      const bodyText = await req.text()
      
      if (!bodyText.trim()) {
        return new Response(JSON.stringify({
          success: false,
          price: 0,
          error: 'Request body is empty'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      requestBody = JSON.parse(bodyText)
    } catch (jsonError) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'Invalid JSON in request body: ' + (jsonError as Error).message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { organizationId, wilayaId, isHomeDelivery = true } = requestBody

    // التحقق من المعلومات المطلوبة
    if (!organizationId || !wilayaId) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'معلومات غير كاملة: يجب توفير معرف المنظمة والولاية',
        debug: { organizationId: !!organizationId, wilayaId: !!wilayaId }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // إنشاء اتصال Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'Server configuration error - missing environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    })

    // الحصول على إعدادات ZR Express
    const settings = await getZRExpressSettings(supabaseClient, organizationId)
    
    if (!settings) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'لم يتم العثور على إعدادات ZR Express لهذه المؤسسة'
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
    let response: Response
    try {
      const fetchUrl = `${settings.base_url}/tarification`
      
      response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': settings.api_token,
        'key': settings.api_key
      },
      body: JSON.stringify(pricingData)
    })

    } catch (fetchError) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: `فشل في الاتصال بـ ZR Express: ${(fetchError as Error).message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // معالجة الرد
    if (!response.ok) {
      const errorText = await response.text()
      
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: `خطأ في الاتصال بـ ZR Express: ${response.status} - ${response.statusText}`,
        debug: { status: response.status, errorText }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let data: any
    try {
      const responseText = await response.text()
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'استجابة غير صالحة من ZR Express'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // التحقق من تنسيق الرد
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'استجابة غير متوقعة من ZR Express (يجب أن تكون مصفوفة)',
        debug: { dataType: typeof data, data }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // البحث عن السعر المناسب للولاية المحددة
    const wilayaData = data.find(item => item.IDWilaya.toString() === wilayaId.toString())

    if (!wilayaData) {
      
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: `لم يتم العثور على سعر للولاية ${wilayaId}`,
        debug: { availableWilayas: data.map(item => item.IDWilaya) }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // تحديد السعر حسب نوع التوصيل
    const priceField = isHomeDelivery ? 'Domicile' : 'Stopdesk'
    const price = parseFloat(wilayaData[priceField] || wilayaData.domicile || wilayaData.stopdesk || 0)

    // التحقق من السعر
    if (isNaN(price) || price <= 0) {
      return new Response(JSON.stringify({
        success: false,
        price: 0,
        error: 'سعر الشحن غير صالح أو غير متوفر',
        debug: { wilayaData, priceField, calculatedPrice: price }
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
    return new Response(JSON.stringify({
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      debug: { 
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined 
      }
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

    if (providerError) {
      return null
    }

    if (!provider) {
      return null
    }

    // الحصول على إعدادات المزود للمنظمة
    const { data: settings, error: settingsError } = await supabaseClient
      .from('shipping_provider_settings')
      .select('api_token, api_key, is_enabled')
      .eq('organization_id', organizationId)
      .eq('provider_id', provider.id)
      .single()

    if (settingsError) {
      return null
    }

    if (!settings) {
      return null
    }

    if (!settings.is_enabled) {
      return null
    }

    if (!settings.api_token || !settings.api_key) {
      return null
    }

    return {
      api_token: settings.api_token,
      api_key: settings.api_key,
      base_url: provider.base_url
    }
  } catch (error) {
    return null
  }
}
