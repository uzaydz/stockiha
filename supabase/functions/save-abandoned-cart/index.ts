// @ts-nocheck
/* إيقاف فحص TypeScript لملف Deno Edge Function لأنه يستخدم دوال متوفرة فقط في بيئة Deno وليس Node.js */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AbandonedCartData, CustomFieldData, corsHeaders, AbandonedCartItem } from '../_shared/types.ts';

// Local enum definition for robustness, matching _shared/types.ts
enum AbandonedCartStatus { 
  PENDING = 'pending',
  CONTACTED = 'contacted',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

interface FrontendFlatPayload {
  organization_id: string;
  customer_name?: string | null;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  province?: string | null;
  municipality?: string | null;
  notes?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  calculated_delivery_fee?: number | null;
  total_amount?: number | null;
  product_id?: string;
  product_variant_id?: string | null;
  product_color_id?: string | null;
  product_size_id?: string | null;
  quantity?: number;
  product_name?: string;
  product_price?: number;
  custom_fields_data?: CustomFieldData[] | null;
  delivery_option?: string;
  payment_method?: string;
  status?: string; 
  items?: AbandonedCartItem[]; // This is the array of cart items from the payload
}

function determineVariantId(
  payloadVariantId?: string | null,
  colorId?: string | null,
  sizeId?: string | null
): string | null {
  if (payloadVariantId) return payloadVariantId;
  if (colorId && sizeId) return `${colorId}_${sizeId}`;
  if (colorId) return colorId;
  if (sizeId) return sizeId;
  return null;
}

// إنشاء قائمة جاهزة للتخزين المؤقت
let cartCache: Map<string, { payload: any, timestamp: number }> = new Map();
// وقت انتهاء صلاحية التخزين المؤقت (10 دقائق بالمللي ثانية)
const CACHE_EXPIRY = 10 * 60 * 1000;
// الحد الأدنى للوقت بين طلبات نفس المستخدم (بالمللي ثانية) - زيادة من 30 ثانية إلى 60 ثانية
const MINIMUM_SAVE_INTERVAL = 60 * 1000;

// دالة لتنظيف التخزين المؤقت وإزالة العناصر منتهية الصلاحية
function cleanupCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of cartCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY) {
      cartCache.delete(key);
    }
  }
}

// تنظيف التخزين المؤقت كل 5 دقائق
setInterval(cleanupCache, 5 * 60 * 1000);

// دالة لفحص ما إذا كانت البيانات الجديدة مختلفة بشكل كبير عن البيانات المخزنة
function hasSignificantChanges(oldPayload: any, newPayload: any): boolean {
  // إذا كان هناك اختلاف في الحقول الأساسية (مثل رقم الهاتف، الاسم، العنوان)، فهذا يعتبر تغييرًا مهمًا
  const criticalFields = ['customer_phone', 'customer_name', 'customer_email', 'province', 'municipality', 'address'];
  
  for (const field of criticalFields) {
    // تجاهل التغييرات الطفيفة في الاسم (حرف بحرف)
    if (field === 'customer_name' && 
        typeof oldPayload[field] === 'string' && 
        typeof newPayload[field] === 'string') {
      
      // إذا كان الفرق في طول الاسم أقل من 3 أحرف، لا نعتبره تغييراً جوهرياً
      if (Math.abs(oldPayload[field]?.length - newPayload[field]?.length) < 3) {
        continue;
      }
    }
    
    if (oldPayload[field] !== newPayload[field]) {
      return true;
    }
  }
  
  // تحقق مما إذا كانت العناصر في السلة قد تغيرت
  const oldItems = Array.isArray(oldPayload.cart_items) ? oldPayload.cart_items : [];
  const newItems = Array.isArray(newPayload.cart_items) ? newPayload.cart_items : [];
  
  if (oldItems.length !== newItems.length) {
    return true;
  }
  
  // تحقق من الاختلافات في العناصر الموجودة
  for (let i = 0; i < oldItems.length; i++) {
    if (oldItems[i].product_id !== newItems[i].product_id || 
        oldItems[i].quantity !== newItems[i].quantity ||
        oldItems[i].product_color_id !== newItems[i].product_color_id ||
        oldItems[i].product_size_id !== newItems[i].product_size_id) {
      return true;
    }
  }
  
  return false;
}

// تحسين أداء معالجة الطلبات المتروكة باستخدام الطابور والمعالجة الدفعية
serve(async (req: Request) => {

  for (const [key, value] of req.headers.entries()) {
    
  }

  if (req.method === 'OPTIONS') {
    
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey, Authorization, x-client-info, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    let flatPayload: FrontendFlatPayload;
    let requestBodyAsText: string = ''; // Variable to store the raw text
    try {
      
      requestBodyAsText = await req.text();

      if (!requestBodyAsText || requestBodyAsText.trim() === '') {
        return new Response(JSON.stringify({
          error: 'Request body is empty.',
          details: 'The server received an empty request body.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, 
        });
      }

      flatPayload = JSON.parse(requestBodyAsText);
      
    } catch (parsingError: any) {
      return new Response(JSON.stringify({
        error: `Failed to parse JSON body. Error: ${parsingError.message}`,
        details: 'The request body could not be parsed as JSON after being read as text. It might be malformed or contain encoding issues.',
        problematic_text_snippet: requestBodyAsText.substring(0, 200) + (requestBodyAsText.length > 200 ? '...' : '') // Send a snippet to client
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, 
      });
    }

    // إنشاء مفتاح فريد للطلب المتروك
    const cacheKey = `${flatPayload.organization_id}:${flatPayload.customer_phone}:${flatPayload.product_id || 'no-product'}`;
    
    // التحقق من التخزين المؤقت لتجنب الطلبات المتكررة
    const cached = cartCache.get(cacheKey);
    const now = Date.now();
    
    // التحقق من آخر تحديث - إذا كان التحديث الأخير حديثًا جدًا (أقل من الحد الأدنى المسموح به)
    if (cached && (now - cached.timestamp < MINIMUM_SAVE_INTERVAL)) {

      // في حالة التحديث المتكرر خلال فترة قصيرة، تحقق مما إذا كانت هناك تغييرات كبيرة
      if (!hasSignificantChanges(cached.payload, flatPayload)) {
        
        return new Response(
          JSON.stringify({ 
            id: cached.payload.id || 'cached',
            message: 'لم يتم حفظ الطلب - لم يتم اكتشاف تغييرات مهمة وآخر تحديث كان حديثًا جدًا'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

    }

    // Transform flatPayload to AbandonedCartData
    const cartData: AbandonedCartData = {
      organization_id: flatPayload.organization_id,
      customer_name: flatPayload.customer_name,
      customer_phone: flatPayload.customer_phone,
      customer_email: flatPayload.customer_email,
      customer_address: flatPayload.customer_address,
      province: flatPayload.province,
      municipality: flatPayload.municipality,
      // Map root-level product details if present in payload
      product_id: flatPayload.product_id, 
      product_color_id: flatPayload.product_color_id,
      product_size_id: flatPayload.product_size_id,
      quantity: flatPayload.quantity,
      // cart_items will handle the array of items, including potentially this single product below
      notes: flatPayload.notes,
      currency: flatPayload.currency,
      subtotal: flatPayload.subtotal,
      calculated_delivery_fee: flatPayload.calculated_delivery_fee,
      total_amount: flatPayload.total_amount,
      delivery_option: flatPayload.delivery_option,
      payment_method: flatPayload.payment_method,
      cart_items: [], // Initialize and then populate based on conditions
      custom_fields_data: Array.isArray(flatPayload.custom_fields_data) ? flatPayload.custom_fields_data : [],
      status: flatPayload.status ? flatPayload.status as AbandonedCartStatus : AbandonedCartStatus.PENDING,
      // id, created_at, updated_at are not set here, handled by DB or later logic
    };

    // Populate cart_items based on the new logic
    if (flatPayload.items && Array.isArray(flatPayload.items) && flatPayload.items.length > 0) {
      cartData.cart_items = flatPayload.items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product_color_id: item.product_color_id,
        product_size_id: item.product_size_id,
        variant_id: item.variant_id,
        // أسماء العرض والأسعار والصور
        name: item.name || item.product_name,
        product_name: item.product_name || item.name,
        price: item.price === null ? undefined : item.price, // Handle null price
        image_url: item.image_url,
        // تفاصيل المتغيرات لعرض اللون/المقاس
        color: item.color,
        size: item.size,
      }));
    } else if (cartData.product_id && typeof cartData.quantity !== 'undefined') {
      cartData.cart_items = [{
        product_id: cartData.product_id,
        // قوة التحويل لضمان أن الكمية عدد
        quantity: typeof cartData.quantity === 'number' ? cartData.quantity : 1,
        product_color_id: cartData.product_color_id,
        product_size_id: cartData.product_size_id,
        // variant_id can be omitted if not applicable or derived elsewhere if needed
      }];
    } else {
      cartData.cart_items = []; // Ensure it's an empty array if no items and no root product
    }

    // VALIDATION (now on the transformed cartData)
    if (!cartData.organization_id || !cartData.customer_phone) {
      return new Response(JSON.stringify({ error: 'organization_id and customer_phone are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // قبل أي عمليات قاعدة بيانات: التحقق من وجود طلب حقيقي بنفس الهاتف مؤخراً
    try {
      const twoWeeksAgoISO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const phoneForCheck = cartData.customer_phone;
      if (phoneForCheck && cartData.organization_id) {
        const orFilter = `form_data->>phone.eq.${phoneForCheck},form_data->>customer_phone.eq.${phoneForCheck}`;
        const { data: recentOrders, error: recentErr } = await supabaseAdmin
          .from('online_orders')
          .select('id, created_at')
          .eq('organization_id', cartData.organization_id)
          .gte('created_at', twoWeeksAgoISO)
          .or(orFilter)
          .limit(1);

        if (!recentErr && recentOrders && recentOrders.length > 0) {
          // وُجد طلب فعلي حديث - وسم الطلبات المتروكة على أنها مستردة وتخطي الحفظ
          try {
            await supabaseAdmin
              .from('abandoned_carts')
              .update({
                status: AbandonedCartStatus.CONVERTED,
                recovered_at: new Date().toISOString(),
                recovered_order_id: recentOrders[0].id,
                updated_at: new Date().toISOString(),
              })
              .eq('organization_id', cartData.organization_id)
              .eq('customer_phone', phoneForCheck)
              .eq('status', AbandonedCartStatus.PENDING);
          } catch {}

          return new Response(JSON.stringify({
            message: 'Skipping abandoned save: real order already exists',
            order_id: recentOrders[0].id,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
    } catch {}

    // DATABASE OPERATIONS (using transformed cartData)
    const { data: existingCart, error: fetchError } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id, cart_items, custom_fields_data, status')
      .eq('organization_id', cartData.organization_id)
      .eq('customer_phone', cartData.customer_phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingCart && existingCart.status === AbandonedCartStatus.PENDING) {

      const existingCartItems = Array.isArray(existingCart.cart_items) ? existingCart.cart_items : [];
      const currentCartItems = Array.isArray(cartData.cart_items) ? cartData.cart_items : [];
      const mergedItems = mergeCartItems(existingCartItems, currentCartItems);

      const existingCustomFields = Array.isArray(existingCart.custom_fields_data) ? existingCart.custom_fields_data : [];
      const currentCustomFields = Array.isArray(cartData.custom_fields_data) ? cartData.custom_fields_data : [];
      const mergedCustomFields = mergeCustomFields(existingCustomFields, currentCustomFields);
      
      // قبل التحديث، تحقق مما إذا كان هناك تغييرات فعلية
      const hasItemsChanged = JSON.stringify(existingCartItems) !== JSON.stringify(mergedItems);
      const hasFieldsChanged = Object.entries(cartData).some(([key, value]) => {
        // تجاهل cart_items لأننا قمنا بالتحقق منها بالفعل
        if (key === 'cart_items') return false;
        
        // تجاهل الحقول التي لا تحتاج إلى مقارنة
        if (key === 'status' || key === 'created_at' || key === 'updated_at' || key === 'last_activity_at') return false;
        
        // مقارنة القيمة الحالية مع القيمة الموجودة
        return value !== undefined && value !== null && value !== existingCart[key];
      });
      
      if (!hasItemsChanged && !hasFieldsChanged) {

        // التحديث الوحيد هو last_activity_at للإشارة إلى أن المستخدم لا يزال نشطًا
        const { data: updatedCart, error: updateError } = await supabaseAdmin
          .from('abandoned_carts')
          .update({
            last_activity_at: new Date().toISOString()
          })
          .eq('id', existingCart.id)
          .select()
          .single();
          
        if (updateError) {
          throw updateError;
        }
        
        // تحديث التخزين المؤقت
        cartCache.set(cacheKey, {
          payload: updatedCart,
          timestamp: now
        });
        
        return new Response(JSON.stringify(updatedCart), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // تحديث السلة الموجودة بالبيانات المدمجة
      const updatePayload: Partial<AbandonedCartData> = {
        ...cartData, // Base new data on transformed cartData
        cart_items: mergedItems,
        custom_fields_data: mergedCustomFields,
        updated_at: new Date().toISOString(),
      };
      delete updatePayload.created_at; // Should not be updated
      delete updatePayload.id;         // id is used in .eq(), not in payload

      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('abandoned_carts')
        .update(updatePayload)
        .eq('id', existingCart.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // تحديث التخزين المؤقت بالبيانات الجديدة والنتيجة
      cartCache.set(cacheKey, { 
        payload: updatedData,
        timestamp: now
      });

      // إشعار بحاجة تحديث الجداول المجمعة
      try {
        // إرسال إشعار بتحديث الجداول المجمعة
        await supabaseAdmin.rpc('notify_refresh_materialized_views');
      } catch (error) {
      }

      return new Response(JSON.stringify(updatedData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      
      const insertPayload: AbandonedCartData = {
        ...cartData, // Base new data on transformed cartData
        status: AbandonedCartStatus.PENDING, // Ensure status is PENDING for new cart
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      delete insertPayload.id; // DB will generate ID

      const { data: newData, error: insertError } = await supabaseAdmin
        .from('abandoned_carts')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // تحديث التخزين المؤقت بالبيانات الجديدة والنتيجة
      cartCache.set(cacheKey, { 
        payload: newData,
        timestamp: now
      });

      // إشعار بحاجة تحديث الجداول المجمعة
      try {
        // إرسال إشعار بتحديث الجداول المجمعة
        await supabaseAdmin.rpc('notify_refresh_materialized_views');
      } catch (error) {
      }

      return new Response(JSON.stringify(newData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
    }

  } catch (error: any) {
    // Enhanced general error logging
    let errorResponseMessage = 'An unexpected error occurred';
    let stackPreview = 'No stack trace available';
    let errorDetails: string | null = null; // Initialize as string | null

    if (error instanceof Error) {
      errorResponseMessage = error.message;
      if (error.stack) {
        stackPreview = error.stack.split('\n').slice(0, 7).join(' ||| '); // First 7 lines of stack, joined
      }
    } else if (typeof error === 'object' && error !== null) {
      try {
        // Attempt to get a meaningful message from common error object structures
        const potentialMessage = (error as any).message || (error as any).error || (error as any).details;
        if (potentialMessage) errorResponseMessage = String(potentialMessage);
        
        const errorString = JSON.stringify(error);
        if (!potentialMessage) errorResponseMessage = errorString.substring(0, 200); // Fallback to snippet if no clear message
        errorDetails = errorString.substring(0, 500); // Assign string here
      } catch (stringifyError) {
        errorResponseMessage = 'Error object could not be stringified.';
        errorDetails = 'Could not stringify error object.'; // Assign string here
      }
    } else {
      const errorString = String(error);
      errorResponseMessage = errorString.substring(0,200);
      errorDetails = errorString.substring(0, 500); // Assign string here
    }

    return new Response(JSON.stringify({ 
      error: `General error processing request: ${errorResponseMessage}`,
      details: errorDetails, // Now compatible with string | null
      stack_preview: stackPreview,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }); // Standardized
  }
});

function mergeCartItems(existingItems: AbandonedCartItem[], newItems: AbandonedCartItem[]): AbandonedCartItem[] {
    const itemMap = new Map<string, AbandonedCartItem>();
    (existingItems || []).forEach(item => {
        if (item && typeof item.product_id !== 'undefined') {
            itemMap.set(String(item.product_id) + (item.variant_id || ''), item);
        }
    });
    (newItems || []).forEach(item => {
        if (item && typeof item.product_id !== 'undefined') {
            const key = String(item.product_id) + (item.variant_id || '');
            if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                const existingQuantity = typeof existing.quantity === 'number' ? existing.quantity : 0;
                const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
                itemMap.set(key, { ...existing, ...item, quantity: existingQuantity + itemQuantity });
            } else {
                itemMap.set(key, item);
            }
        }
    });
    return Array.from(itemMap.values());
}

function mergeCustomFields(existingFields: CustomFieldData[], newFields: CustomFieldData[]): CustomFieldData[] {
    const fieldMap = new Map<string, CustomFieldData>();
    (existingFields || []).forEach(field => {
        if (field && typeof field.name !== 'undefined') {
            fieldMap.set(String(field.name), field);
        }
    });
    (newFields || []).forEach(field => {
        if (field && typeof field.name !== 'undefined') {
            fieldMap.set(String(field.name), field); 
        }
    });
    return Array.from(fieldMap.values());
}
