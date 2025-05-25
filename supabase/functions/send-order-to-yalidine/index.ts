import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Moved corsHeaders directly here
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, restrict this to your specific domain(s)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        console.error('Yalidine API request failed:', response.status, responseData);
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
      console.error('Error creating parcel in YalidineApiClient:', error);
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
    console.error(`Error fetching Yalidine credentials for org ${organizationId}:`, error);
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
      console.error(`Order not found or error fetching order ${orderId}:`, orderError);
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
            console.error("Error fetching guest customer:", guestError);
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
                 console.error("Error fetching registered customer:", regError);
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
             console.error("Error fetching address details:", addrError);
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
                        console.error(`Error fetching wilaya name for wilaya_id ${wilayaId} from yalidine_provinces_global:`, wError);
                    } else if (wilayaInfo && wilayaInfo.name) {
                        toWilayaName = wilayaInfo.name;
                    } else {
                        console.warn(`Wilaya name not found in yalidine_provinces_global for wilaya_id: ${wilayaId}. Original value from addresses: ${addressDetails.state}`);
                    }
                } else {
                     console.warn(`Invalid wilaya_id format in addresses table: ${addressDetails.state}. Expected a numeric string.`);
                }
            } else if (addressDetails.state) { 
                toWilayaName = addressDetails.state;
            }

            const communeIdString = addressDetails.city || addressDetails.municipality;
            if (communeIdString && typeof communeIdString === 'string') {
                const communeId = parseInt(communeIdString, 10);
                if (!isNaN(communeId)) {
                    const {data: communeInfo, error: cError} = await supabase
                        .from("yalidine_municipalities")
                        .select("name")
                        .eq("id", communeId)
                        .limit(1)
                        .single();
                    if (cError && cError.code !== 'PGRST116') {
                        console.error(`Error fetching commune name for commune_id ${communeId} from yalidine_municipalities:`, cError);
                    } else if (communeInfo && communeInfo.name) {
                        toCommuneName = communeInfo.name;
                    } else {
                        console.warn(`Commune name not found in yalidine_municipalities for commune_id: ${communeId}. Original value from addresses: ${communeIdString}`);
                    }
                } else {
                    console.warn(`Invalid commune_id format in addresses table: ${communeIdString}. Expected a numeric string.`);
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
            console.error("Error fetching stop desk info:", centerError);
        }
        if (centerInfo) {
            toWilayaName = centerInfo.wilaya_name;
            toCommuneName = centerInfo.commune_name;
            // في حالة مكتب الاستلام، العنوان يكون هو اسم المكتب
            streetAddressLine1 = centerInfo.name; 
        }
    }

    if (!toWilayaName || !toCommuneName) {
         console.warn(`Wilaya or Commune name missing for order ${orderId}. Wilaya: '${toWilayaName}', Commune: '${toCommuneName}'`);
         return new Response(JSON.stringify({ error: `Destination Wilaya or Commune is missing for order ${orderId}. Please ensure address or stop desk is correctly set.` }), {
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
        console.error("Error fetching order items:", itemsError);
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
        console.warn("Error fetching organization yalidine settings", orgSettingsError)
    }
    if (orgYalidineSettings && orgYalidineSettings.origin_wilaya_name) {
      fromWilayaName = orgYalidineSettings.origin_wilaya_name;
    } else {
      console.warn(`Origin wilaya name not found for organization ${organizationId}, using default: ${fromWilayaName}`);
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
        console.warn(`Invalid phone number format for order ${orderId}: ${parcelData.contact_phone}. Proceeding, but Yalidine might reject.`);
    }

    const yalidineResult = await yalidineApiClient.createParcel(parcelData);

    if (yalidineResult.success && yalidineResult.data) {
      const trackingKey = parcelData.order_id.toString(); 
      const apiResponseData = yalidineResult.data; 
      
      const parcelSpecificResult = apiResponseData[trackingKey];

      if (parcelSpecificResult && parcelSpecificResult.success) {
        const yalidineTrackingId = parcelSpecificResult.tracking;
        const labelUrl = parcelSpecificResult.label; 

        await supabase
          .from("online_orders")
          .update({ 
            yalidine_tracking_id: yalidineTrackingId, 
            yalidine_label_url: labelUrl,
            status: "processing" 
          })
          .eq("id", orderId);
          
        console.log(`Order ${orderId} successfully sent to Yalidine. Tracking: ${yalidineTrackingId}`);
        return new Response(JSON.stringify({ success: true, tracking_id: yalidineTrackingId, label_url: labelUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errorMessage = parcelSpecificResult?.message || 
                             apiResponseData?.message || 
                             "Yalidine API reported a failure for this order. Check Yalidine dashboard for details.";
        console.error(`Yalidine API error for order ${orderId} (parcel specific):`, errorMessage, "Full response:", apiResponseData);
        return new Response(JSON.stringify({ success: false, message: errorMessage, yalidine_response: apiResponseData }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.error(`Failed to send order ${orderId} to Yalidine via API client:`, yalidineResult.error);
      return new Response(JSON.stringify({ success: false, message: "Failed to communicate with Yalidine API.", error_details: yalidineResult.error?.message || yalidineResult.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (e) {
    console.error("Unhandled error in send-order-to-yalidine function:", e);
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