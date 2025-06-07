/**
 * Ecotrack Shipping Integration Utility
 * 
 * Provides functions to send orders to Ecotrack-based shipping providers
 */

import { supabase } from '@/lib/supabase';
import { EcotrackShippingService, ShippingProvider } from '@/api/shippingService';

interface EcotrackOrderResult {
  success: boolean;
  message: string;
  trackingNumber?: string;
  externalId?: string;
  labelUrl?: string;
}

interface EcotrackOrderParams {
  tracking?: string;
  client: string;
  mobile_a: string;
  mobile_b?: string;
  adresse: string;
  wilaya_id: string;
  commune: string;
  total: number;
  note?: string;
  type_livraison: number; // 0: Home, 1: Office
  type_colis: number; // 0: Normal, 1: Exchange
  confirmee: number; // 1: Confirmed
  product_description?: string;
}

// Helper function to get provider base URL
const getProviderBaseUrl = (providerCode: string): string => {
  const providerUrls: { [key: string]: string } = {
    'ecotrack': 'https://api.ecotrack.dz',
    'anderson_delivery': 'https://anderson.ecotrack.dz',
    'areex': 'https://areex.ecotrack.dz',
    'ba_consult': 'https://bacexpress.ecotrack.dz',
    'conexlog': 'https://app.conexlog-dz.com',
    'coyote_express': 'https://coyoteexpressdz.ecotrack.dz',
    'dhd': 'https://dhd.ecotrack.dz',
    'distazero': 'https://distazero.ecotrack.dz',
    'e48hr_livraison': 'https://48hr.ecotrack.dz',
    'fretdirect': 'https://fret.ecotrack.dz',
    'golivri': 'https://golivri.ecotrack.dz',
    'mono_hub': 'https://mono.ecotrack.dz',
    'msm_go': 'https://msmgo.ecotrack.dz',
    'negmar_express': 'https://negmar.ecotrack.dz',
    'packers': 'https://packers.ecotrack.dz',
    'prest': 'https://prest.ecotrack.dz',
    'rb_livraison': 'https://rblivraison.ecotrack.dz',
    'rex_livraison': 'https://rex.ecotrack.dz',
    'rocket_delivery': 'https://rocket.ecotrack.dz',
    'salva_delivery': 'https://salvadelivery.ecotrack.dz',
    'speed_delivery': 'https://speeddelivery.ecotrack.dz',
    'tsl_express': 'https://tsl.ecotrack.dz',
    'worldexpress': 'https://worldexpress.ecotrack.dz'
  };

  return providerUrls[providerCode] || 'https://api.ecotrack.dz';
};

// Helper function to check if provider is Ecotrack-based
const isEcotrackProvider = (providerCode: string): boolean => {
  const ecotrackProviders = [
    'ecotrack',
    'anderson_delivery',
    'areex', 
    'ba_consult',
    'conexlog',
    'coyote_express',
    'dhd',
    'distazero',
    'e48hr_livraison',
    'fretdirect',
    'golivri',
    'mono_hub',
    'msm_go',
    'negmar_express',
    'packers',
    'prest',
    'rb_livraison',
    'rex_livraison',
    'rocket_delivery',
    'salva_delivery',
    'speed_delivery',
    'tsl_express',
    'worldexpress'
  ];
  
  return ecotrackProviders.includes(providerCode);
};

// Generate tracking number for Ecotrack providers
const generateEcotrackTrackingNumber = (providerCode: string): string => {
  const providerPrefixes: { [key: string]: string } = {
    'ecotrack': 'ECO',
    'anderson_delivery': 'AND',
    'areex': 'ARX',
    'ba_consult': 'BAC',
    'conexlog': 'CNX',
    'coyote_express': 'COY',
    'dhd': 'DHD',
    'distazero': 'DZR',
    'e48hr_livraison': 'E48',
    'fretdirect': 'FRT',
    'golivri': 'GLV',
    'mono_hub': 'MON',
    'msm_go': 'MSM',
    'negmar_express': 'NEG',
    'packers': 'PAK',
    'prest': 'PRS',
    'rb_livraison': 'RBL',
    'rex_livraison': 'REX',
    'rocket_delivery': 'RKT',
    'salva_delivery': 'SAL',
    'speed_delivery': 'SPD',
    'tsl_express': 'TSL',
    'worldexpress': 'WEX'
  };

  const prefix = providerPrefixes[providerCode] || 'ECO';
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}${timestamp}${random}`;
};

// Get products description from order items
const getProductsDescription = (orderItems: any[]): string => {
  if (!orderItems || orderItems.length === 0) {
    return 'منتجات متنوعة';
  }
  
  return orderItems
    .map(item => `${item.product_name} (x${item.quantity})`)
    .join(', ')
    .substring(0, 200); // Limit description length
};

/**
 * Send order to Ecotrack provider
 */
export async function sendOrderToEcotrackProvider(
  orderId: string,
  providerCode: string,
  organizationId: string
): Promise<EcotrackOrderResult> {
  try {
    console.log('🌿 [EcotrackIntegration] بدء إرسال الطلب:', {
      orderId,
      providerCode,
      organizationId
    });

    // Check if provider is Ecotrack-based
    if (!isEcotrackProvider(providerCode)) {
      return {
        success: false,
        message: `${providerCode} ليس من شركات Ecotrack`
      };
    }

    // Get order details with customer and address info
    const { data: order, error: orderError } = await supabase
      .from('online_orders')
      .select(`
        *,
        online_order_items (
          product_name,
          quantity,
          unit_price
        ),
        customers!customer_id (
          name,
          phone,
          email
        ),
        addresses!shipping_address_id (
          street_address,
          city,
          state,
          municipality
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        message: 'لم يتم العثور على الطلب'
      };
    }

    // Get provider settings
    const { data: providerData, error: providerError } = await supabase
      .from('shipping_providers')
      .select('id')
      .eq('code', providerCode)
      .single();

    if (providerError || !providerData) {
      return {
        success: false,
        message: 'لم يتم العثور على مزود الشحن'
      };
    }

    const { data: settings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', providerData.id)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      return {
        success: false,
        message: 'إعدادات مزود الشحن غير مفعلة أو غير موجودة'
      };
    }

    if (!settings.api_token) {
      return {
        success: false,
        message: 'لا يوجد API token للشركة'
      };
    }

    // Create Ecotrack shipping service
    const baseUrl = getProviderBaseUrl(providerCode);
    const shippingService = new EcotrackShippingService(
      providerCode as ShippingProvider,
      baseUrl,
      {
        token: settings.api_token,
        key: settings.api_key || ''
      }
    );

    // Generate tracking number
    const trackingNumber = generateEcotrackTrackingNumber(providerCode);

    // Get products description
    const productsDescription = getProductsDescription(order.online_order_items || []);

    // Get customer info
    const customer = (order as any).customers;
    const address = (order as any).addresses;
    
    // Extract info from notes if address is missing
    const addressFromNotes = order.notes || '';
    const addressParts = addressFromNotes.split(' | ');
    let customerName = customer?.name || 'العميل';
    let customerPhone = customer?.phone || '0500000000';
    let shippingAddress = address?.street_address || '';
    let city = address?.city || '';
    let state = address?.state || '';
    
    // Parse notes for missing data
    for (const part of addressParts) {
      if (part.includes('الاسم:')) {
        customerName = part.replace('الاسم:', '').trim() || customerName;
      }
      if (part.includes('الهاتف:')) {
        customerPhone = part.replace('الهاتف:', '').trim() || customerPhone;
      }
      if (part.includes('العنوان:')) {
        const addressText = part.replace('العنوان:', '').trim();
        if (addressText.includes(' - ')) {
          const [cityFromNotes, addressFromNotesDetail] = addressText.split(' - ');
          state = cityFromNotes || state;
          shippingAddress = addressFromNotesDetail || shippingAddress;
        } else {
          shippingAddress = addressText || shippingAddress;
        }
      }
    }

        // Prepare order data for Ecotrack API
    const orderParams = {
      Tracking: trackingNumber,
      Client: customerName,
      MobileA: customerPhone,
      MobileB: '',
      Adresse: shippingAddress || `${city || address?.municipality || 'غير محدد'}, ولاية ${state}`,
      IDWilaya: '16', // Default to Alger, should be mapped properly
      Commune: city || address?.municipality || 'غير محدد',
      Total: parseFloat(order.total?.toString() || '0').toString(),
      Note: order.notes || '',
      TypeLivraison: order.shipping_option === 'desk' ? 1 : 0, // 0: Home, 1: Office
      TypeColis: 0, // Normal package
      Confrimee: 1, // Confirmed
      TProd: productsDescription
    };

    console.log('📦 [EcotrackIntegration] بيانات الطلب:', orderParams);

    // Create shipping order
    const result = await shippingService.createShippingOrder(orderParams);

    if (result && result.success) {
      // Determine the correct tracking field based on provider
      let trackingField = 'ecotrack_tracking_id';
      if (providerCode === 'yalidine') {
        trackingField = 'yalidine_tracking_id';
      } else if (providerCode === 'zrexpress') {
        trackingField = 'zrexpress_tracking_id';
      }

      // Update order with tracking information
      const updateData = {
        [trackingField]: trackingNumber,
        shipping_provider: providerCode,
        status: 'processing',
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('online_orders')
        .update(updateData)
        .eq('id', orderId);

      console.log('✅ [EcotrackIntegration] تم إرسال الطلب بنجاح:', {
        trackingNumber,
        externalId: result.data?.id
      });

      return {
        success: true,
        message: 'تم إرسال الطلب بنجاح',
        trackingNumber: trackingNumber,
        externalId: result.data?.id || '',
        labelUrl: result.data?.label_url || ''
      };
    }

    return {
      success: false,
      message: result?.message || 'فشل في إرسال الطلب'
    };

  } catch (error) {
    console.error('❌ [EcotrackIntegration] خطأ في إرسال الطلب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Send order to Yalidine using existing Edge Function
 */
async function sendOrderToYalidine(
  orderId: string, 
  organizationId: string
): Promise<EcotrackOrderResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: 'بيانات Supabase غير مهيأة في متغيرات البيئة'
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/send-order-to-yalidine`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result?.message || result?.error?.message || "فشل إرسال الطلب إلى ياليدين";
      throw new Error(errorMessage);
    }
    
    if (!result.success) {
      throw new Error(result.message || "فشل إرسال الطلب إلى ياليدين");
    }

    return {
      success: true,
      message: 'تم إرسال الطلب إلى ياليدين بنجاح',
      trackingNumber: result.tracking_id,
      externalId: result.external_id || '',
      labelUrl: result.label_url || ''
    };

  } catch (error) {
    console.error('❌ [YalidineIntegration] خطأ في إرسال الطلب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب إلى ياليدين: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Send order to ZR Express using existing Edge Function
 */
async function sendOrderToZRExpress(
  orderId: string, 
  organizationId: string
): Promise<EcotrackOrderResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: 'بيانات Supabase غير مهيأة في متغيرات البيئة'
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/send-order-to-zrexpress`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result?.message || result?.error?.message || "فشل إرسال الطلب إلى ZR Express";
      throw new Error(errorMessage);
    }
    
    if (!result.success) {
      throw new Error(result.message || "فشل إرسال الطلب إلى ZR Express");
    }

    return {
      success: true,
      message: 'تم إرسال الطلب إلى ZR Express بنجاح',
      trackingNumber: result.tracking_id,
      externalId: result.external_id || '',
      labelUrl: result.label_url || ''
    };

  } catch (error) {
    console.error('❌ [ZRExpressIntegration] خطأ في إرسال الطلب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب إلى ZR Express: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Send order to Maystro Delivery using their API
 */
async function sendOrderToMaystroDelivery(
  orderId: string, 
  organizationId: string
): Promise<EcotrackOrderResult> {
  try {
    console.log('🚀 [MaystroDelivery] بدء إرسال الطلب:', {
      orderId,
      organizationId
    });

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('online_orders')
      .select(`
        *,
        online_order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        message: 'لم يتم العثور على الطلب'
      };
    }

    // Get Maystro Delivery provider settings
    const { data: providerData, error: providerError } = await supabase
      .from('shipping_providers')
      .select('id')
      .eq('code', 'maystro_delivery')
      .single();

    if (providerError || !providerData) {
      return {
        success: false,
        message: 'مزود Maystro Delivery غير موجود في النظام'
      };
    }

    // Get provider credentials
    const { data: settings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key, settings')
      .eq('organization_id', organizationId)
      .eq('provider_id', providerData.id)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings || !settings.api_token) {
      return {
        success: false,
        message: 'إعدادات Maystro Delivery غير مكتملة أو غير مفعلة'
      };
    }

    // Extract customer and address data from order notes
    // Parse customer data from notes
    let customerData: any = {};
    let addressData: any = {};
    
    try {
      if (order.notes) {
        const notesData = JSON.parse(order.notes);
        customerData = notesData.customer || {};
        addressData = notesData.address || {};
      }
    } catch (e) {
      // If notes parsing fails, try to extract from order fields
      customerData = {
        name: (order as any).customer_name || 'عميل غير محدد',
        phone: (order as any).customer_phone || ''
      };
      addressData = {
        state: (order as any).shipping_wilaya || '',
        municipality: (order as any).shipping_commune || '',
        street_address: (order as any).shipping_address || ''
      };
    }
    
    if (!customerData.phone) {
      return {
        success: false,
        message: 'بيانات العميل غير مكتملة (الهاتف مطلوب)'
      };
    }

    if (!addressData.state || !addressData.municipality) {
      return {
        success: false,
        message: 'عنوان الشحن غير مكتمل (الولاية والبلدية مطلوبة)'
      };
    }

    // Parse address IDs
    const wilayaId = parseInt(addressData.state);
    const communeId = parseInt(addressData.municipality);
    
    if (isNaN(wilayaId) || isNaN(communeId)) {
      return {
        success: false,
        message: 'معرفات الولاية والبلدية يجب أن تكون أرقام'
      };
    }

    // Generate tracking number
    const trackingNumber = `MAY${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Prepare order data for Maystro API
    const orderData = {
      wilaya: wilayaId,
      commune: communeId,
      destination_text: addressData.street_address || '',
      customer_phone: customerData.phone.replace(/[^0-9]/g, ''), // Clean phone number
      customer_name: customerData.name || 'عميل غير محدد',
      product_price: Math.round(order.total || 0),
      delivery_type: 0, // Home delivery
      express: false,
      note_to_driver: order.notes || '',
      products: order.online_order_items?.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        price: Math.round(item.unit_price || 0)
      })) || [],
      source: 4, // Required by Maystro API
      external_order_id: order.id
    };

    console.log('📦 [MaystroDelivery] بيانات الطلب:', orderData);

    // Send to Maystro Delivery API
    const apiUrl = 'https://backend.maystro-delivery.com/api/stores/orders/';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${settings.api_token}`
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ [MaystroDelivery] خطأ في API:', result);
      return {
        success: false,
        message: result.message || `خطأ HTTP ${response.status}: ${response.statusText}`
      };
    }

    // Create shipping order record
    const { error: shippingOrderError } = await supabase
      .from('shipping_orders')
      .insert({
        organization_id: organizationId,
        provider_id: providerData.id,
        order_id: orderId,
        tracking_number: result.tracking_number || trackingNumber,
        external_id: result.id?.toString() || '',
        recipient_name: customerData.name || 'عميل غير محدد',
        recipient_phone: customerData.phone,
        address: addressData.street_address || '',
        region: addressData.state?.toString() || '',
        city: addressData.municipality?.toString() || '',
        amount: Math.round(order.total || 0),
        status: 'created',
        notes: order.notes || '',
        products_description: order.online_order_items?.map(item => 
          `${item.product_name} (${item.quantity})`
        ).join(', ') || ''
      });

    if (shippingOrderError) {
      console.warn('⚠️ [MaystroDelivery] تحذير: فشل في إنشاء سجل الشحن:', shippingOrderError);
    }

    // Update order status
    await supabase
      .from('online_orders')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    console.log('✅ [MaystroDelivery] تم إرسال الطلب بنجاح:', {
      trackingNumber: result.tracking_number || trackingNumber,
      externalId: result.id
    });

    return {
      success: true,
      message: 'تم إرسال الطلب إلى Maystro Delivery بنجاح',
      trackingNumber: result.tracking_number || trackingNumber,
      externalId: result.id?.toString() || '',
      labelUrl: ''
    };

  } catch (error) {
    console.error('❌ [MaystroDelivery] خطأ في إرسال الطلب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب إلى Maystro Delivery: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Send order to any shipping provider (unified function)
 */
export async function sendOrderToShippingProvider(
  orderId: string,
  providerCode: string,
  organizationId: string
): Promise<EcotrackOrderResult> {
  try {
    console.log('🚀 [UnifiedShipping] بدء إرسال الطلب:', {
      orderId,
      providerCode,
      organizationId
    });

    // توجيه ذكي حسب نوع الشركة
    switch (providerCode) {
      case 'yalidine':
        return await sendOrderToYalidine(orderId, organizationId);
      
      case 'zrexpress':
        return await sendOrderToZRExpress(orderId, organizationId);
      
      case 'maystro_delivery':
        return await sendOrderToMaystroDelivery(orderId, organizationId);
      
      default:
        // التعامل مع شركات Ecotrack
        if (isEcotrackProvider(providerCode)) {
          return await sendOrderToEcotrackProvider(orderId, providerCode, organizationId);
        }
        
        return {
          success: false,
          message: `مزود الشحن ${providerCode} غير مدعوم`
        };
    }
  } catch (error) {
    console.error('❌ [UnifiedShipping] خطأ عام في إرسال الطلب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب: ' + (error instanceof Error ? error.message : String(error))
    };
  }
} 