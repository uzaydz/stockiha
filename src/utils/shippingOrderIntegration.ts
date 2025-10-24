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
    console.log('Creating shipping order record:', {
      organizationId,
      providerId,
      orderId,
      trackingNumber: data.trackingNumber,
      externalId: data.externalId
    });
    
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
      console.error('Failed to create shipping order record:', error);
      throw error;
    }
    
    console.log('Successfully created shipping order record:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error in createShippingOrderRecord:', error);
    throw error;
  }
}

/**
 * Get Yalidine stop desks (centers) for a specific wilaya/commune
 */
export async function getYalidineStopDesks(
  organizationId: string,
  wilayaId?: string | number,
  communeId?: string | number
): Promise<{ centers: any[]; isFromWilaya: boolean }> {
  try {
    console.log('Fetching stop desks for:', { organizationId, wilayaId, communeId });
    
    const shippingService = await getOrganizationShippingService(
      organizationId,
      ShippingProvider.YALIDINE
    );

    if (!shippingService) {
      throw new Error('خدمة ياليدين غير مفعلة');
    }

    const yalidineService = shippingService as any;
    if (!yalidineService.apiClient) {
      throw new Error('خدمة ياليدين غير متوفرة');
    }

    let centers = [];
    let isFromWilaya = false;

    // محاولة 1: جلب المكاتب من البلدية المحددة
    if (communeId) {
      const communeUrl = `/centers?commune_id=${communeId}`;
      console.log('Trying to fetch centers by commune_id:', communeId);
      
      try {
        const communeResponse = await yalidineService.apiClient.get(communeUrl);
        
        if (communeResponse.data && communeResponse.data.data) {
          centers = communeResponse.data.data;
        } else if (Array.isArray(communeResponse.data)) {
          centers = communeResponse.data;
        }
        
        console.log(`Found ${centers.length} centers in commune ${communeId}`);
      } catch (error) {
        console.warn('Failed to fetch centers by commune, will try by wilaya');
      }
    }

    // محاولة 2: إذا لم نجد مكاتب في البلدية، نجلب من الولاية
    if (centers.length === 0 && wilayaId) {
      const wilayaUrl = `/centers?wilaya_id=${wilayaId}`;
      console.log('No centers in commune, fetching by wilaya_id:', wilayaId);
      
      const wilayaResponse = await yalidineService.apiClient.get(wilayaUrl);
      
      if (wilayaResponse.data && wilayaResponse.data.data) {
        centers = wilayaResponse.data.data;
      } else if (Array.isArray(wilayaResponse.data)) {
        centers = wilayaResponse.data;
      }
      
      isFromWilaya = true;
      console.log(`Found ${centers.length} centers in wilaya ${wilayaId} (from other communes)`);
    }

    return { centers, isFromWilaya };
  } catch (error) {
    console.error('Error fetching Yalidine stop desks:', error);
    throw new Error('فشل في جلب قائمة المكاتب من ياليدين');
  }
}

/**
 * Create a shipping order with Yalidine
 */
export async function createYalidineShippingOrder(
  organizationId: string, 
  order: Order,
  isStopDesk: boolean = false,  // نوع التوصيل
  stopdeskId: number | null = null  // معرف المكتب (مطلوب عندما isStopDesk = true)
): Promise<ShippingOrderResult> {
  try {
    console.log('Creating Yalidine shipping order:', { 
      orderId: order.id, 
      isStopDesk,
      stopdeskId,
      deliveryTypeCode: isStopDesk ? 2 : 1
    });
    
    // التحقق من أن stopdesk_id موجود عندما يكون is_stopdesk = true
    if (isStopDesk && !stopdeskId) {
      return {
        success: false,
        message: 'عند اختيار التوصيل للمكتب، يجب تحديد معرف المكتب (stopdesk_id). يرجى التحقق من البيانات.'
      };
    }
    
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
    const params: any = {
      order_id: order.id, // معرف الطلب المطلوب من API ياليدين
      Tracking: trackingNumber,
      TypeLivraison: isStopDesk ? 2 : 1, // 1 = Home delivery, 2 = Stop desk
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
      is_stopdesk: isStopDesk ? 1 : 0, // 0 = توصيل للبيت، 1 = مكتب
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
    
    // إضافة stopdesk_id إذا كان التوصيل للمكتب
    if (isStopDesk && stopdeskId) {
      params.stopdesk_id = stopdeskId;
      console.log('Adding stopdesk_id to params:', stopdeskId);
    }
    
    // Call the API to create the shipping order
    const result = await shippingService.createShippingOrder(params);
    
    console.log('Yalidine API Response:', result);
    
    // معالجة الاستجابة من ياليدين - يمكن أن تأتي بأشكال مختلفة:
    // 1. { "order_id": { success: true, tracking: "...", ... } }
    // 2. { "order_id": { tracking: "...", ... } } (حتى لو success: false)
    // 3. { tracking: "...", ... }
    // 4. { data: { tracking: "..." } }
    // 5. [{ tracking: "..." }]
    
    let trackingId = null;
    let responseData = null;
    let isSuccess = false;
    let errorMessage = null;
    
    // الحالة 1: الاستجابة كائن بمفتاح order_id
    if (result && typeof result === 'object') {
      const orderKeys = Object.keys(result);
      
      // تحقق إذا كان المفتاح الأول هو order_id
      if (orderKeys.length > 0) {
        const firstKey = orderKeys[0];
        const orderData = result[firstKey];
        
        console.log('Order data from first key:', orderData);
        
        // إذا كان الكائن يحتوي على tracking (بغض النظر عن success)
        if (orderData && typeof orderData === 'object') {
          // التحقق من وجود tracking
          if (orderData.tracking) {
            trackingId = orderData.tracking;
            responseData = orderData;
            // success = true أو tracking موجود = نجاح
            isSuccess = orderData.success === true || !!orderData.tracking;
            errorMessage = orderData.message || null;
            console.log('Found tracking in order data:', trackingId);
          }
          // إذا كان success: false وبدون tracking، نحفظ رسالة الخطأ
          else if (orderData.success === false) {
            errorMessage = orderData.message || 'فشل في إنشاء الطلب';
            console.error('Yalidine API returned success: false -', errorMessage);
          }
        }
        // إذا كان الكائن الرئيسي يحتوي مباشرة على tracking
        else if (result.tracking) {
          trackingId = result.tracking;
          responseData = result;
          isSuccess = true;
        }
        // الحالة 2: التحقق من result.data
        else if (result.data && result.data.tracking) {
          trackingId = result.data.tracking;
          responseData = result.data;
          isSuccess = true;
        }
        // الحالة 3: التحقق إذا كانت مصفوفة
        else if (Array.isArray(result) && result[0] && result[0].tracking) {
          trackingId = result[0].tracking;
          responseData = result[0];
          isSuccess = true;
        }
      }
    }
    
    if (isSuccess && trackingId) {
      console.log('Successfully extracted tracking ID:', trackingId);
      
      // Create the shipping order record in our database
      await createShippingOrderRecord(
        organizationId,
        providerData.id,
        order.id,
        {
          trackingNumber: trackingId,
          externalId: responseData?.import_id?.toString() || responseData?.id || '',
          recipientName: order.customer_name,
          recipientPhone: order.customer_phone,
          address: order.shipping_address,
          region: order.shipping_wilaya,
          city: order.shipping_commune,
          amount: order.total_amount,
          deliveryType: isStopDesk ? 2 : 1,  // 1 = Home delivery, 2 = Stop desk
          packageType: 0,   // Regular shipping
          isConfirmed: true,
          notes: order.notes || '',
          productsDescription: productsDescription,
          labelUrl: responseData?.label || responseData?.labels || ''
        }
      );
      
      console.log('Successfully created shipping order record');
      
      // تحديث الطلب في جدول online_orders برقم التتبع
      const { error: updateError } = await supabase
        .from('online_orders')
        .update({
          yalidine_tracking_id: trackingId,
          shipping_provider: 'yalidine',
          shipping_method: 'yalidine',
          status: 'shipped'
        })
        .eq('id', order.id)
        .eq('organization_id', organizationId);
      
      if (updateError) {
        console.error('Failed to update order with tracking ID:', updateError);
        // لا نفشل العملية كاملة لأن السجل تم إنشاؤه في shipping_orders
      }
      
      return {
        success: true,
        message: 'تم إنشاء طلب الشحن بنجاح',
        trackingNumber: trackingId,
        externalId: responseData?.import_id?.toString() || responseData?.id || '',
        labelUrl: responseData?.label || responseData?.labels || ''
      };
    }
    
    console.error('Failed to extract tracking ID from Yalidine response:', result);
    
    // إذا كان هناك رسالة خطأ من API، نعرضها
    if (errorMessage) {
      return {
        success: false,
        message: `فشل في إنشاء طلب الشحن: ${errorMessage}`
      };
    }
    
    return {
      success: false,
      message: 'فشل في الحصول على رقم التتبع من ياليدين. يرجى التحقق من البيانات المدخلة (الاسم، الهاتف، العنوان، الولاية، البلدية).'
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
  orderId: string,
  preferredProviderCode?: string  // إضافة معامل جديد لاختيار الشركة
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
    
    const customerName = formData.fullName || formData.customerName || formData.name || '';
    const customerPhone = formData.phone || formData.customerPhone || formData.telephone || '';
    const shippingWilaya = formData.province || formData.wilaya || formData.wilayaId || '';
    const shippingCommune = formData.municipality || formData.commune || formData.communeId || '';
    
    // استخراج نوع التوصيل من form_data
    // deliveryType يمكن أن يكون: 'home', 'office', 'stop_desk', أو القيم الرقمية 1, 2
    const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
    const isStopDesk = deliveryType === 'office' || 
                       deliveryType === 'stop_desk' || 
                       deliveryType === 'stopdesk' || 
                       deliveryType === 2 ||
                       deliveryType === '2';
    
    // استخراج معرف المكتب (Stop Desk ID) - مطلوب عندما يكون is_stopdesk = true
    const stopdeskId = formData.stopdeskId || 
                       formData.stopdesk_id || 
                       formData.stopDeskId ||
                       formData.centerId ||
                       formData.center_id ||
                       null;
    
    console.log('Delivery type extracted:', { deliveryType, isStopDesk, stopdeskId });
    
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
    
    // Get all enabled shipping providers for the organization
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
    
    // Determine which provider to use
    let providerCode: string | undefined;
    
    if (preferredProviderCode) {
      // إذا تم تمرير رمز شركة معينة، نتحقق من أنها مفعلة
      const preferredProvider = enabledProviders.find(
        p => p.shipping_providers?.code === preferredProviderCode
      );
      
      if (preferredProvider) {
        providerCode = preferredProviderCode;
      } else {
        return {
          success: false,
          message: `شركة التوصيل ${preferredProviderCode} غير مفعلة أو غير موجودة`
        };
      }
    } else {
      // استخدام الشركة الافتراضية (prioritize auto_shipping if available)
      const autoShippingProvider = enabledProviders.find(p => p.auto_shipping);
      const defaultProvider = autoShippingProvider || enabledProviders[0];
      providerCode = defaultProvider.shipping_providers?.code;
    }

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
      return createYalidineShippingOrder(organizationId, orderForShipping, isStopDesk, stopdeskId);
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
