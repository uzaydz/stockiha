import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ZR Express API Client
class ZRExpressApiClient {
  private supabaseForLogging: SupabaseClient; 
  private apiToken: string;
  private apiKey: string;
  private baseUrl: string = 'https://procolis.com/api_v1';

  constructor(supabaseInstanceForLogging: SupabaseClient, zrApiToken: string, zrApiKey: string) {
    this.supabaseForLogging = supabaseInstanceForLogging;
    this.apiToken = zrApiToken;
    this.apiKey = zrApiKey;
  }

  async createParcel(parcelData: any): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      
      const response = await fetch(`${this.baseUrl}/add_colis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiToken,
          'key': this.apiKey
        },
        body: JSON.stringify({ Colis: [parcelData] })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: { 
            status: response.status, 
            message: "ZR Express API request failed", 
            details: responseData 
          }
        };
      }
      
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tarification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiToken,
          'key': this.apiKey
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        return { success: true, message: "اتصال ناجح بـ ZR Express" };
      } else {
        return { success: false, message: `فشل الاتصال: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `خطأ في الاتصال: ${error.message}` };
    }
  }
}

interface OrderPayload {
  orderId: string;
}

interface ZRExpressCredentials {
  apiToken: string;
  apiKey: string;
}

async function getOrgZRExpressCredentials(supabase: SupabaseClient, organizationId: string): Promise<ZRExpressCredentials | null> {
  const ZREXPRESS_PROVIDER_ID_IN_DB = 2; // تأكد من أن هذا المعرف صحيح

  const { data, error } = await supabase
    .from("shipping_provider_settings")
    .select("api_token, api_key")
    .eq("organization_id", organizationId)
    .eq("provider_id", ZREXPRESS_PROVIDER_ID_IN_DB)
    .eq("is_enabled", true)
    .single();

  if (error || !data) {
    return null;
  }
  return { apiToken: data.api_token, apiKey: data.api_key };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as OrderPayload;
    const { orderId } = payload;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // جلب بيانات الطلب
    const { data: orderData, error: orderError } = await supabase
      .from("online_orders") 
      .select("*, organization_id") 
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      return new Response(JSON.stringify({ error: `Order not found: ${orderId}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const organizationId = orderData.organization_id;
    if (!organizationId) {
        return new Response(JSON.stringify({ error: "Organization ID not found for the order." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // جلب بيانات اعتماد ZR Express
    const credentials = await getOrgZRExpressCredentials(supabase, organizationId);
    if (!credentials) {
      return new Response(JSON.stringify({ error: "ZR Express credentials not configured or found for this organization." }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zrApiClient = new ZRExpressApiClient(
      supabase, 
      credentials.apiToken,
      credentials.apiKey
    );
    
    // معالجة بيانات العميل
    let customerName = orderData.customer_name || "";
    let customerPhone = orderData.shipping_phone || ""; 

    if (orderData.customer_id && (!customerName || !customerPhone)) { 
        const {data: guestCustomer, error: guestError} = await supabase
            .from("guest_customers")
            .select("name, phone")
            .eq("id", orderData.customer_id)
            .single();
        if (guestError && guestError.code !== 'PGRST116') {
        }
        if (guestCustomer) {
            customerName = guestCustomer.name || customerName;
            customerPhone = guestCustomer.phone || customerPhone;
        } else {
            const {data: registeredCustomer, error: regError} = await supabase
                .from("customers")
                .select("name, phone") 
                .eq("id", orderData.customer_id)
                .single();
            if (regError && regError.code !== 'PGRST116') {
            }
            if(registeredCustomer){
                customerName = registeredCustomer.name || customerName;
                customerPhone = registeredCustomer.phone || customerPhone;
            }
        }
    }

    // معالجة بيانات العنوان
    let wilayaId = "";
    let communeName = "";
    let addressLine = "";

    if (orderData.shipping_address_id) {
        const {data: addressDetails, error: addrError} = await supabase
            .from("addresses")
            .select("state, city, street_address, municipality") 
            .eq("id", orderData.shipping_address_id)
            .single();
            
        if (addrError && addrError.code !== 'PGRST116') {
        }

        if (addressDetails) {
            wilayaId = addressDetails.state || "";
            communeName = addressDetails.city || addressDetails.municipality || "";
            addressLine = addressDetails.street_address || "";
        }
    }

    // التأكد من وجود البيانات المطلوبة
    if (!wilayaId || !communeName) {
        return new Response(JSON.stringify({ 
            error: `Destination Wilaya or Commune is missing for order ${orderId}. Please ensure address is correctly set.` 
        }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // جلب منتجات الطلب
    const {data: orderItems, error: itemsError} = await supabase
        .from("online_order_items")
        .select("product_name, quantity")
        .eq("order_id", orderId);
    
    if (itemsError) {
        return new Response(JSON.stringify({ error: "Failed to fetch order items." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
    
    const productList = orderItems?.map(item => `${item.product_name || 'N/A'} (x${item.quantity || 1})`).join(", ") || "منتجات متنوعة";

    // إنشاء tracking number فريد
    const trackingNumber = `ZR${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // إعداد بيانات الشحنة لـ ZR Express
    const parcelData = {
      Tracking: trackingNumber,
      TypeLivraison: orderData.shipping_option === 'desk' || orderData.stop_desk_id ? "1" : "0", // 0: منزل, 1: مكتب
      TypeColis: "0", // 0: عادي, 1: استبدال
      Confrimee: "1", // مؤكد للشحن
      Client: customerName || "العميل",
      MobileA: customerPhone || "0500000000",
      MobileB: "", // رقم ثانوي (اختياري)
      Adresse: addressLine || `${communeName}, الولاية ${wilayaId}`,
      IDWilaya: wilayaId,
      Commune: communeName,
      Total: (orderData.total || 0).toString(),
      Note: orderData.notes || "",
      TProduit: productList,
      id_Externe: orderData.customer_order_number || orderId,
      Source: "Bazaar Console"
    };

    // التحقق من صحة رقم الهاتف
    if (!parcelData.MobileA || !/^0[0-9]{8,9}$/.test(parcelData.MobileA)) {
        parcelData.MobileA = "0500000000";
    }

    // إرسال الطلب إلى ZR Express
    const zrResult = await zrApiClient.createParcel(parcelData);

    if (zrResult.success && zrResult.data) {
      
      // معالجة استجابة ZR Express
      const responseData = zrResult.data;
      let finalTrackingId = trackingNumber;
      let isSuccess = false;

      // البحث عن الاستجابة في مصفوفة Colis
      if (responseData.Colis && Array.isArray(responseData.Colis) && responseData.Colis.length > 0) {
        const parcelResponse = responseData.Colis[0];
        if (parcelResponse.MessageRetour === "Good" || parcelResponse.MessageRetour === "OK") {
          finalTrackingId = parcelResponse.Tracking || trackingNumber;
          isSuccess = true;
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `ZR Express API error: ${parcelResponse.MessageRetour}`,
            details: responseData 
          }), {
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (responseData.MessageRetour === "Good" || responseData.MessageRetour === "OK") {
        // في حالة الاستجابة المباشرة
        finalTrackingId = responseData.Tracking || trackingNumber;
        isSuccess = true;
      }

      if (isSuccess) {
        // تحديث الطلب في قاعدة البيانات
        await supabase
          .from("online_orders")
          .update({ 
            zrexpress_tracking_id: finalTrackingId,
            status: "processing" 
          })
          .eq("id", orderId);
          
        return new Response(JSON.stringify({ 
          success: true, 
          tracking_id: finalTrackingId,
          provider: "ZR Express"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errorMessage = responseData?.MessageRetour || "Unknown error from ZR Express";
        return new Response(JSON.stringify({ 
          success: false, 
          message: errorMessage, 
          details: responseData 
        }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Failed to communicate with ZR Express API.", 
        error_details: zrResult.error?.message || zrResult.error 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (e) {
    let errorMessage = "Internal Server Error";
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return new Response(JSON.stringify({ 
      error: "Internal Server Error: " + errorMessage, 
      details: e instanceof Error ? e.stack : undefined 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
