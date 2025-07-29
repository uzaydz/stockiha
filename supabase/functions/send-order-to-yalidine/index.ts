import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Moved corsHeaders directly here
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, restrict this to your specific domain(s)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Add other methods if needed
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Integrated YalidineApiClient (Simplified) ---
class YalidineApiClient {
  private supabaseForLogging: SupabaseClient; 
  private apiId: string;
  private apiToken: string;
  private baseUrl: string = 'https://api.yalidine.app/v1';

  constructor(supabaseInstanceForLogging: SupabaseClient, yalidineApiId: string, yalidineApiToken: string) {
    this.supabaseForLogging = supabaseInstanceForLogging;
    this.apiId = yalidineApiId;
    this.apiToken = yalidineApiToken;
  }

  async createParcel(parcelData: any): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/parcels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        },
        body: JSON.stringify([parcelData]) 
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: { 
            status: response.status, 
            message: "Yalidine API request failed", 
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
}
// --- End of Integrated YalidineApiClient ---

interface OrderPayload {
  orderId: string;
}

interface YalidineCredentials {
  apiId: string;
  apiToken: string;
}

async function getOrgYalidineCredentials(supabase: SupabaseClient, organizationId: string): Promise<YalidineCredentials | null> {
  const YALIDINE_PROVIDER_ID_IN_DB = 1; 

  const { data, error } = await supabase
    .from("shipping_provider_settings")
    .select("api_token, api_key")
    .eq("organization_id", organizationId)
    .eq("provider_id", YALIDINE_PROVIDER_ID_IN_DB) 
    .eq("is_enabled", true)
    .single();

  if (error || !data) {
    return null;
  }
  return { apiId: data.api_token, apiToken: data.api_key };
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

    const credentials = await getOrgYalidineCredentials(supabase, organizationId);
    if (!credentials) {
      return new Response(JSON.stringify({ error: "Yalidine credentials not configured or found for this organization." }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yalidineApiClient = new YalidineApiClient(
      supabase, 
      credentials.apiId,
      credentials.apiToken
    );
    
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
    
    const nameParts = customerName?.split(" ") || [""];
    const firstName = nameParts[0] || " "; 
    const familyName = nameParts.slice(1).join(" ") || customerName || "الزبون";

    let toWilayaName = "";
    let toCommuneName = "";
    let streetAddressLine1 = ""; // سنستخدم هذا كجزء من العنوان لـ Yalidine

    if (orderData.shipping_address_id) {
        const {data: addressDetails, error: addrError} = await supabase
            .from("addresses")
            .select("state, city, street_address, municipality") 
            .eq("id", orderData.shipping_address_id)
            .single();
        if (addrError && addrError.code !== 'PGRST116') {
        }

        if (addressDetails) {
             if (addressDetails.state && typeof addressDetails.state === 'string') {
                const wilayaId = parseInt(addressDetails.state, 10);
                if (!isNaN(wilayaId)) {
                    const {data: wilayaInfo, error: wError} = await supabase
                        .from("yalidine_provinces_global")
                        .select("name")
                        .eq("id", wilayaId)
                        .limit(1)
                        .single();
                    if (wError && wError.code !== 'PGRST116') {
                    } else if (wilayaInfo && wilayaInfo.name) {
                        toWilayaName = wilayaInfo.name;
                    } else {
                    }
                } else {
                }
            } else if (addressDetails.state) { 
                toWilayaName = addressDetails.state;
            }

            const communeIdString = addressDetails.city || addressDetails.municipality;
            if (communeIdString && typeof communeIdString === 'string') {
                const communeId = parseInt(communeIdString, 10);
                if (!isNaN(communeId)) {
                    // البحث في الجدول العالمي بدلاً من الجدول المحدود
                    const {data: communeInfo, error: cError} = await supabase
                        .from("yalidine_municipalities_global")
                        .select("name")
                        .eq("id", communeId)
                        .limit(1)
                        .single();
                    if (cError && cError.code !== 'PGRST116') {
                    } else if (communeInfo && communeInfo.name) {
                        toCommuneName = communeInfo.name;
                    } else {
                        // إذا لم نجد البلدية بالرقم المحدد، نبحث عن البلدية الرئيسية للولاية
                        const wilayaId = parseInt(addressDetails.state, 10);
                        if (!isNaN(wilayaId)) {
                            const {data: mainCommune, error: mainError} = await supabase
                                .from("yalidine_municipalities_global")
                                .select("name")
                                .eq("wilaya_id", wilayaId)
                                .order("id")
                                .limit(1)
                                .single();
                            if (mainCommune && mainCommune.name) {
                                toCommuneName = mainCommune.name;
                            }
                        }
                    }
                } else {
                }
            } else if (communeIdString) { 
                 toCommuneName = communeIdString;
            }
            
             if (typeof addressDetails.street_address === 'string') streetAddressLine1 = addressDetails.street_address;
        }
    }
    
    if (orderData.stop_desk_id) {
        const {data: centerInfo, error: centerError} = await supabase
            .from("yalidine_centers_global") 
            .select("wilaya_name, commune_name, name") // name is center name
            .eq("center_id", orderData.stop_desk_id)
            .single();

        if (centerError && centerError.code !== 'PGRST116') {
        }
        if (centerInfo) {
            toWilayaName = centerInfo.wilaya_name;
            toCommuneName = centerInfo.commune_name;
            // في حالة مكتب الاستلام، العنوان يكون هو اسم المكتب
            streetAddressLine1 = centerInfo.name; 
        }
    }

    if (!toWilayaName || !toCommuneName) {
         return new Response(JSON.stringify({ 
            error: `Destination Wilaya or Commune is missing for order ${orderId}. Please ensure address or stop desk is correctly set.`,
            debug_info: {
                toWilayaName,
                toCommuneName,
                shipping_address_id: orderData.shipping_address_id,
                stop_desk_id: orderData.stop_desk_id
            }
        }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // تعديل القاعدة لتكوين العنوان:
    // القاعدة الجديدة: "street_address_line1" إذا كان موجودًا، وإلا "اسم البلدية، اسم الولاية"
    // ولحالة stop_desk، streetAddressLine1 سيكون اسم المكتب.
    const addressForYalidine = streetAddressLine1 ? streetAddressLine1 : `${toCommuneName}, ${toWilayaName}`;

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

    let fromWilayaName = "Alger"; 
     const { data: orgYalidineSettings, error: orgSettingsError } = await supabase
      .from("yalidine_settings_with_origin")
      .select("origin_wilaya_name")
      .eq("organization_id", organizationId)
      .single();
    if (orgSettingsError && orgSettingsError.code !== 'PGRST116'){
    }
    if (orgYalidineSettings && orgYalidineSettings.origin_wilaya_name) {
      fromWilayaName = orgYalidineSettings.origin_wilaya_name;
    } else {
    }

    const parcelData = {
      order_id: orderData.customer_order_number || orderData.display_id || orderId,
      from_wilaya_name: fromWilayaName,
      firstname: firstName,
      familyname: familyName,
      contact_phone: customerPhone, 
      address: addressForYalidine, // تم تعديل كيفية تكوين هذا العنوان
      to_commune_name: toCommuneName,
      to_wilaya_name: toWilayaName,
      product_list: productList,
      price: orderData.total || 0,
      do_insurance: true,
      declared_value: orderData.metadata?.declared_value || orderData.total || 0,
      freeshipping: true,
      is_stopdesk: !!orderData.stop_desk_id, 
      stopdesk_id: orderData.stop_desk_id || undefined, 
      length: parseInt(orderData.metadata?.length) || 10, 
      width: parseInt(orderData.metadata?.width) || 10,
      height: parseInt(orderData.metadata?.height) || 10,
      weight: parseFloat(orderData.metadata?.weight) || 1, 
      has_exchange: orderData.metadata?.has_exchange || false, 
      product_to_collect: orderData.metadata?.has_exchange ? (orderData.metadata?.product_to_collect || productList) : undefined,
    };
    
    if (!parcelData.contact_phone || !/^0[0-9]{8,9}$/.test(parcelData.contact_phone)) {
    }

    const yalidineResult = await yalidineApiClient.createParcel(parcelData);

    if (yalidineResult.success && yalidineResult.data) {
      const trackingKey = parcelData.order_id.toString(); 
      const apiResponseData = yalidineResult.data; 
      
      const parcelSpecificResult = apiResponseData[trackingKey];

      if (parcelSpecificResult && parcelSpecificResult.success) {
        const yalidineTrackingId = parcelSpecificResult.tracking;
        const labelUrl = parcelSpecificResult.label; 

        // تحديث قاعدة البيانات مع التحقق من النتيجة
        const { data: updateData, error: updateError } = await supabase
          .from("online_orders")
          .update({ 
            yalidine_tracking_id: yalidineTrackingId, 
            yalidine_label_url: labelUrl,
            shipping_provider: "yalidine",
            status: "processing",
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId)
          .select();

        if (updateError) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Yalidine shipment created but database update failed", 
            tracking_id: yalidineTrackingId,
            error_details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, tracking_id: yalidineTrackingId, label_url: labelUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errorMessage = parcelSpecificResult?.message || 
                             apiResponseData?.message || 
                             "Yalidine API reported a failure for this order. Check Yalidine dashboard for details.";
        return new Response(JSON.stringify({ success: false, message: errorMessage, yalidine_response: apiResponseData }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ success: false, message: "Failed to communicate with Yalidine API.", error_details: yalidineResult.error?.message || yalidineResult.error }), {
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
    return new Response(JSON.stringify({ error: "Internal Server Error: " + errorMessage, details: e instanceof Error ? e.stack : undefined }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
