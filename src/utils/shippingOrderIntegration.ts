/**
 * Shipping Order Integration Utility
 * 
 * Provides functions to integrate the order processing system with shipping providers
 */

import { getOrganizationShippingService, ShippingProvider } from '@/api/shippingService';
import { shippingSettingsService } from '@/api/shippingSettingsService';
import { supabase } from '@/lib/supabase';
import { generateTrackingNumber } from './trackingNumberGenerator';

interface Order {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_wilaya: string;
  shipping_commune: string;
  total_amount: number;
  paid_amount?: number;
  order_items?: any[];
  notes?: string;
}

interface ShippingOrderResult {
  success: boolean;
  message: string;
  trackingNumber?: string;
  externalId?: string;
  labelUrl?: string;
}

/**
 * Generate a tracking number with a specific provider prefix
 */
function generateProviderTrackingNumber(providerCode: string): string {
  // Generate a unique tracking number with provider prefix
  const prefix = providerCode.substring(0, 2).toUpperCase();
  return `${prefix}${generateTrackingNumber(8)}`;
}

/**
 * Get the list of products from an order
 */
function getProductsDescription(orderItems: any[]): string {
  if (!orderItems || orderItems.length === 0) {
    return 'منتجات متنوعة';
  }
  
  const productsText = orderItems
    .map(item => `${item.quantity}x ${item.product_name}`)
    .join(', ');
    
  return productsText.length > 250 
    ? productsText.substring(0, 250) + '...' 
    : productsText;
}

/**
 * Create a shipping order in the database
 */
async function createShippingOrderRecord(
  organizationId: string,
  providerId: number,
  orderId: string,
  data: any
): Promise<number> {
  try {
    const { data: result, error } = await supabase
      .from('shipping_orders')
      .insert({
        organization_id: organizationId,
        provider_id: providerId,
        order_id: orderId,
        tracking_number: data.trackingNumber,
        external_id: data.externalId,
        recipient_name: data.recipientName,
        recipient_phone: data.recipientPhone,
        recipient_phone_alt: data.recipientPhoneAlt,
        address: data.address,
        region: data.region,
        city: data.city,
        amount: data.amount,
        shipping_cost: data.shippingCost,
        delivery_type: data.deliveryType,
        package_type: data.packageType,
        is_confirmed: data.isConfirmed,
        notes: data.notes,
        label_url: data.labelUrl,
        products_description: data.productsDescription,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      throw error;
    }
    
    return result.id;
  } catch (error) {
    throw error;
  }
}

/**
 * Create a shipping order with Yalidine
 */
export async function createYalidineShippingOrder(
  organizationId: string, 
  order: Order
): Promise<ShippingOrderResult> {
  try {
    // Get the shipping service instance for the organization
    const shippingService = await getOrganizationShippingService(
      organizationId, 
      ShippingProvider.YALIDINE
    );
    
    if (!shippingService) {
      return {
        success: false,
        message: 'خدمة ياليدين غير مفعلة أو بيانات الاعتماد غير صالحة'
      };
    }
    
    // Get the provider ID
    const { data: providerData, error: providerError } = await supabase
      .from('shipping_providers')
      .select('id')
      .eq('code', ShippingProvider.YALIDINE)
      .single();
    
    if (providerError || !providerData) {
      return {
        success: false,
        message: 'خطأ في العثور على مزود الشحن ياليدين'
      };
    }
    
    // Generate a tracking number
    const trackingNumber = generateProviderTrackingNumber('yl');
    
    // Get products description
    const productsDescription = getProductsDescription(order.order_items || []);
    
    // فصل الاسم الأول والأخير
    const nameParts = order.customer_name.split(' ');
    const firstname = nameParts[0] || '';
    const familyname = nameParts.slice(1).join(' ') || firstname; // إذا لم يوجد اسم أخير، استخدم الأول

    // الحصول على أسماء الولايات والبلديات من قاعدة البيانات
    let wilayaName = order.shipping_wilaya;
    let communeName = order.shipping_commune;

    try {
      // الحصول على اسم الولاية من قاعدة البيانات
      const { data: wilayaData } = await supabase
        .from('yalidine_provinces_global')
        .select('name')
        .eq('id', parseInt(order.shipping_wilaya))
        .single();
      
      if (wilayaData?.name) {
        wilayaName = wilayaData.name;
      }

      // البحث عن اسم البلدية في قاعدة البيانات
      const { data: communeData } = await supabase
        .from('yalidine_municipalities_global')
        .select('name')
        .eq('id', parseInt(order.shipping_commune))
        .single();
        
      if (communeData?.name) {
        communeName = communeData.name;
      }

      // 
      // 
      
    } catch (error) {
      // استخدام أسماء افتراضية إذا فشل الاستعلام
      const fallbackWilayas: { [key: string]: string } = {
        '3': 'Laghouat', '5': 'Batna', '16': 'Alger', '31': 'Oran'
      };
      wilayaName = fallbackWilayas[order.shipping_wilaya] || `Wilaya_${order.shipping_wilaya}`;
    }

    // Create shipping order parameters
    const params = {
      order_id: order.id, // معرف الطلب المطلوب من API ياليدين
      Tracking: trackingNumber,
      TypeLivraison: 1, // Home delivery
      TypeColis: 0, // Regular shipping
      Confrimee: 1, // Confirmed
      
      // الحقول المطلوبة من API ياليدين
      firstname: firstname,
      familyname: familyname,
      contact_phone: order.customer_phone,
      address: order.shipping_address,
      to_commune_name: communeName,
      to_wilaya_name: wilayaName,
      product_list: productsDescription,
      price: parseFloat(order.total_amount.toString()),
      freeshipping: 0, // 0 = مدفوع، 1 = مجاني
      is_stopdesk: 0, // 0 = توصيل للبيت، 1 = مكتب
      has_exchange: 0, // 0 = بدون استبدال، 1 = مع استبدال
      
      // الحقول القديمة للتوافق العكسي
      Client: order.customer_name,
      MobileA: order.customer_phone,
      Adresse: order.shipping_address,
      IDWilaya: order.shipping_wilaya,
      Commune: order.shipping_commune,
      Total: order.total_amount.toString(),
      Note: order.notes || '',
      TProd: productsDescription
    };
    
    // Call the API to create the shipping order
    const result = await shippingService.createShippingOrder(params);
    
    // تحقق من وجود النتائج والـ tracking ID
    if (result && (result.tracking || result.data?.tracking || result[0]?.tracking)) {
      const trackingId = result.tracking || result.data?.tracking || result[0]?.tracking;
      // Create the shipping order record in our database
      await createShippingOrderRecord(
        organizationId,
        providerData.id,
        order.id,
        {
          trackingNumber: trackingId,
          externalId: result.id || '',
          recipientName: order.customer_name,
          recipientPhone: order.customer_phone,
          address: order.shipping_address,
          region: order.shipping_wilaya,
          city: order.shipping_commune,
          amount: order.total_amount,
          deliveryType: 1,  // Home delivery
          packageType: 0,   // Regular shipping
          isConfirmed: true,
          notes: order.notes || '',
          productsDescription: productsDescription
        }
      );
      
      // Try to generate a label
      let labelUrl = '';
      try {
        labelUrl = await shippingService.generateShippingLabel(trackingNumber);
      } catch (error) {
      }
      
      return {
        success: true,
        message: 'تم إنشاء طلب الشحن بنجاح',
        trackingNumber: trackingId,
        externalId: result.id || '',
        labelUrl
      };
    }
    
    return {
      success: false,
      message: 'فشل في إنشاء طلب الشحن'
    };
  } catch (error) {
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء طلب الشحن: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Create a shipping order with the default provider for an organization
 */
export async function createShippingOrderForOrder(
  organizationId: string, 
  orderId: string
): Promise<ShippingOrderResult> {
  try {
    // Get the order details
    const { data: order, error: orderError } = await supabase
      .from('online_orders')
      .select(`
        id,
        organization_id,
        total,
        notes,
        form_data,
        online_order_items (
          product_id,
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
    
    // Extract customer and shipping data from form_data
    const formData = (order.form_data as any) || {};
    // 
    // 
    
    const customerName = formData.fullName || formData.customerName || formData.name || '';
    const customerPhone = formData.phone || formData.customerPhone || formData.telephone || '';
    const shippingWilaya = formData.province || formData.wilaya || formData.wilayaId || '';
    const shippingCommune = formData.municipality || formData.commune || formData.communeId || '';
    
    // جرب جميع الأسماء المحتملة للعنوان
    let shippingAddress = formData.address || 
                         formData.shippingAddress || 
                         formData.adresse || 
                         formData.shipping_address ||
                         formData.deliveryAddress ||
                         formData.delivery_address ||
                         formData.addressLine1 ||
                         formData.street ||
                         formData.location ||
                         '';

    // إذا لم يوجد عنوان محدد، استخدم البلدية والولاية كعنوان
    if (!shippingAddress) {
      shippingAddress = `بلدية ${shippingCommune}, ولاية ${shippingWilaya}`;
    }

    // Check if all required shipping fields are available
    if (!customerName || !customerPhone || 
        !shippingAddress || !shippingWilaya || 
        !shippingCommune) {
      return {
        success: false,
        message: 'معلومات الشحن غير مكتملة في الطلب'
      };
    }
    
    // Get all enabled shipping providers for the organization (remove auto_shipping requirement)
    const { data: enabledProviders, error: providersError } = await supabase
      .from('shipping_provider_settings')
      .select(`
        provider_id,
        shipping_providers (
          id,
          code,
          name
        ),
        auto_shipping
      `)
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);

    if (providersError) {
      return {
        success: false,
        message: 'خطأ في جلب مزودي خدمة الشحن المفعلين'
      };
    }
    
    // If no providers are enabled at all
    if (!enabledProviders || enabledProviders.length === 0) {
      return {
        success: false,
        message: 'لا يوجد مزود شحن مفعل في النظام'
      };
    }
    
    // Use the first enabled provider (prioritize auto_shipping if available)
    const autoShippingProvider = enabledProviders.find(p => p.auto_shipping);
    const defaultProvider = autoShippingProvider || enabledProviders[0];

    // Get the provider code from the nested object
    const providerCode = defaultProvider.shipping_providers?.code;

    if (!providerCode) {
      return {
        success: false,
        message: 'لم يتم العثور على رمز مزود الشحن'
      };
    }
    
    // Create order object compatible with createYalidineShippingOrder
    const orderForShipping: Order = {
      id: order.id,
      organization_id: order.organization_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      shipping_wilaya: shippingWilaya,
      shipping_commune: shippingCommune,
      total_amount: order.total,
      notes: order.notes || '',
      order_items: (order.online_order_items as any) || []
    };

    // Create the shipping order based on the provider
    if (providerCode === ShippingProvider.YALIDINE) {
      return createYalidineShippingOrder(organizationId, orderForShipping);
    }
    
    // Add other providers as they are implemented
    
    return {
      success: false,
      message: `مزود الشحن ${providerCode} غير مدعوم حالياً للشحن التلقائي`
    };
  } catch (error) {
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء طلب الشحن: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
