import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
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
            addressLine = addressDetails.street_address || "";
            
            // تحويل رقم البلدية إلى اسمها من قاعدة البيانات
            const municipalityId = addressDetails.city || addressDetails.municipality || "";
            
            if (municipalityId) {
                const { data: municipalityData, error: munError } = await supabase
                    .from('yalidine_municipalities_global')
                    .select('name, name_ar, wilaya_name, wilaya_name_ar')
                    .eq('id', parseInt(municipalityId))
                    .single();

                if (municipalityData) {
                    communeName = municipalityData.name || municipalityData.name_ar || municipalityId;
                    
                    // جلب اسم الولاية أيضاً
                    const wilayaName = municipalityData.wilaya_name_ar || municipalityData.wilaya_name;
                    if (wilayaName) {
                        addressLine = addressLine || `${communeName}, ${wilayaName}`;
                    }
                    
                } else {
                    
                    // محاولة الحصول على عاصمة الولاية كـ fallback
                    const { data: wilayaCapital } = await supabase
                        .from('yalidine_municipalities_global')
                        .select('name, name_ar, wilaya_name, wilaya_name_ar')
                        .eq('wilaya_id', parseInt(wilayaId))
                        .like('name', `%${wilayaId === '9' ? 'Blida' : 'Capital'}%`)
                        .limit(1)
                        .single();
                    
                    if (wilayaCapital) {
                        communeName = wilayaCapital.name || wilayaCapital.name_ar || `المدينة الرئيسية`;
                        const wilayaName = wilayaCapital.wilaya_name_ar || wilayaCapital.wilaya_name;
                        if (wilayaName) {
                            addressLine = addressLine || `${communeName}, ${wilayaName}`;
                        }
                    } else {
                        // استخدام اسم الولاية مباشرة
                        const { data: wilayaInfo } = await supabase
                            .from('yalidine_provinces_global')
                            .select('name, name_ar')
                            .eq('id', parseInt(wilayaId))
                            .single();
                        
                        if (wilayaInfo) {
                            communeName = wilayaInfo.name_ar || wilayaInfo.name || `ولاية ${wilayaId}`;
                            addressLine = addressLine || communeName;
                        } else {
                            communeName = `ولاية ${wilayaId}`;
                        }
                    }
                }
            }
        }
    }

    // إذا لم نجد البيانات من العنوان المحفوظ، نتحقق من form_data
    if (!wilayaId || !communeName) {
        if (orderData.form_data) {
            let formData = orderData.form_data;
            if (typeof formData === 'string') {
                try {
                    formData = JSON.parse(formData);
                } catch (e) {
                    formData = null;
                }
            }

            if (formData && formData.province && formData.municipality) {
                // تحويل أرقام الولايات والبلديات إلى أسماء
                const provinceId = formData.province.toString();
                const municipalityId = formData.municipality.toString();

                // جلب اسم الولاية والبلدية معاً
                const { data: municipalityData } = await supabase
                    .from('yalidine_municipalities_global')
                    .select('name, name_ar, wilaya_name, wilaya_name_ar, wilaya_id')
                    .eq('id', municipalityId)
                    .single();

                if (municipalityData) {
                    // تعيين معرف الولاية واسم البلدية
                    wilayaId = municipalityData.wilaya_id?.toString() || provinceId;
                    communeName = municipalityData.name || municipalityData.name_ar || municipalityId;
                    
                    // إنشاء العنوان الكامل مع اسم الولاية
                    const wilayaName = municipalityData.wilaya_name_ar || municipalityData.wilaya_name;
                    if (formData.address && wilayaName) {
                        addressLine = `${formData.address}, ${wilayaName}`;
                    } else if (wilayaName) {
                        addressLine = `${communeName}, ${wilayaName}`;
                    }
                }

                // استخراج العنوان إذا كان متوفراً
                if (formData.address) {
                    addressLine = formData.address;
                }
            }
        }
    }

    // التأكد من وجود البيانات المطلوبة
    if (!wilayaId || !communeName) {
        
        return new Response(JSON.stringify({ 
            success: false,
            message: `بيانات العنوان ناقصة للطلب ${orderId}. الولاية: ${wilayaId || 'مفقودة'}, البلدية: ${communeName || 'مفقودة'}. يرجى التحقق من صحة بيانات العنوان.`,
            error_details: {
                missing_wilaya: !wilayaId,
                missing_commune: !communeName,
                order_form_data: orderData.form_data
            }
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

    // تنظيف وتحضير النصوص العربية لـ ZR Express
    const cleanArabicText = (text: string): string => {
      if (!text) return "";
      // إزالة الرموز الخاصة والحفاظ على النص العربي والإنجليزي والأرقام فقط
      return text.replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\w\s\d-.,()]/g, '').trim();
    };

    // التحقق من صحة معرف الولاية (يجب أن يكون بين 1 و 58)
    const wilayaIdNum = parseInt(wilayaId);
    if (isNaN(wilayaIdNum) || wilayaIdNum < 1 || wilayaIdNum > 58) {
        return new Response(JSON.stringify({ 
            success: false,
            message: `معرف الولاية غير صحيح: ${wilayaId}. يجب أن يكون رقماً بين 1 و 58.`,
            error_details: {
                invalid_wilaya_id: wilayaId,
                order_id: orderId,
                form_data: orderData.form_data
            }
        }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // إعداد بيانات الشحنة لـ ZR Express
    const parcelData = {
      Tracking: trackingNumber,
      TypeLivraison: orderData.shipping_option === 'desk' || orderData.stop_desk_id ? "1" : "0", // 0: منزل, 1: مكتب
      TypeColis: "0", // 0: عادي, 1: استبدال
      Confrimee: "1", // مؤكد للشحن
      Client: cleanArabicText(customerName) || "العميل",
      MobileA: customerPhone || "0500000000",
      MobileB: "", // رقم ثانوي (اختياري)
      Adresse: cleanArabicText(addressLine) || `${cleanArabicText(communeName)}, الولاية ${wilayaId}`,
      IDWilaya: wilayaIdNum, // تحويل إلى رقم بدلاً من نص
      Commune: cleanArabicText(communeName),
      Total: (orderData.total || 0).toString(),
      Note: cleanArabicText(orderData.notes || ""),
      TProduit: cleanArabicText(productList),
      id_Externe: orderData.customer_order_number || orderId,
      Source: "Bazaar Console"
    };

    // التحقق من صحة رقم الهاتف
    if (!parcelData.MobileA || !/^0[0-9]{8,9}$/.test(parcelData.MobileA)) {
        parcelData.MobileA = "0500000000";
    }
    
    // تحويل Total إلى رقم (ZR Express قد يتوقع رقماً)
    parcelData.Total = parseInt(parcelData.Total) || 0;

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
          
          // إضافة رسائل خطأ مفهومة للعربية
          let arabicErrorMessage = `خطأ من ZR Express: ${parcelResponse.MessageRetour}`;
          if (parcelResponse.MessageRetour === "Wilaya Erreur") {
            arabicErrorMessage = `خطأ في الولاية المحددة (${parcelResponse.IDWilaya}). الولاية غير مدعومة أو غير صحيحة في نظام ZR Express. يرجى التحقق من رقم الولاية.`;
          } else if (parcelResponse.MessageRetour === "Commune Erreur") {
            arabicErrorMessage = `خطأ في البلدية المحددة (${parcelResponse.Commune}). البلدية غير مدعومة أو غير صحيحة في نظام ZR Express.`;
          } else if (parcelResponse.MessageRetour.includes("Phone")) {
            arabicErrorMessage = "خطأ في رقم الهاتف. يرجى التحقق من صحة رقم الهاتف.";
          }
          
          return new Response(JSON.stringify({ 
            success: false, 
            message: arabicErrorMessage,
            error_code: parcelResponse.MessageRetour,
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
      } else {
      }

      if (isSuccess) {
        // تحديث الطلب في قاعدة البيانات مع التحقق من النتيجة
        const { data: updateData, error: updateError } = await supabase
          .from("online_orders")
          .update({ 
            zrexpress_tracking_id: finalTrackingId,
            shipping_provider: "zrexpress",
            status: "processing",
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId)
          .select();

        if (updateError) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "ZR Express shipment created but database update failed", 
            tracking_id: finalTrackingId,
            error_details: updateError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
