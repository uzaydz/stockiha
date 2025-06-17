import { SupabaseProduct, SupabaseService, SupabaseOrder, SupabaseUser } from './types';
import { Product, Service, User, Order, ServiceStatus } from '../../types';
import { supabase } from '@/lib/supabase';

// دالة للتحقق من صحة معرف UUID
export const isValidUUID = (uuid: string) => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// دالة مساعدة لجلب ألوان المنتج
const fetchProductColors = async (productId: string) => {
  try {
    const { data: colorsData, error: colorsError } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', productId)
      .order('is_default', { ascending: false });
    
    if (colorsError) {
      console.error('خطأ في جلب ألوان المنتج:', colorsError);
      return [];
    }
    
    // جلب المقاسات لكل لون إذا كان يحتوي على مقاسات
    const colorsWithSizes = await Promise.all(
      (colorsData || []).map(async (color) => {
        if (color.has_sizes) {
          const { data: sizesData, error: sizesError } = await supabase
            .from('product_sizes')
            .select('*')
            .eq('color_id', color.id)
            .order('is_default', { ascending: false });
          
          if (!sizesError && sizesData) {
            return {
              ...color,
              sizes: sizesData.map(size => ({
                id: size.id,
                size_name: size.size_name,
                quantity: size.quantity,
                price: size.price,
                barcode: size.barcode,
                is_default: size.is_default
              }))
            };
          }
        }
        
        return {
          ...color,
          sizes: []
        };
      })
    );
    
    return colorsWithSizes.map(color => ({
      id: color.id,
      name: color.name,
      color_code: color.color_code,
      image_url: color.image_url,
      quantity: color.quantity,
      price: color.price,
      barcode: color.barcode,
      is_default: color.is_default,
      has_sizes: color.has_sizes,
      sizes: color.sizes || []
    }));
  } catch (error) {
    console.error('خطأ في جلب ألوان المنتج:', error);
    return [];
  }
};

// دوال تحويل البيانات من Supabase إلى التطبيق
export const mapSupabaseProductToProduct = async (product: SupabaseProduct): Promise<Product> => {
  // جلب الألوان والمقاسات إذا كان المنتج يحتوي على متغيرات
  let colors: any[] = [];
  if (product.has_variants) {
    colors = await fetchProductColors(product.id);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    compareAtPrice: product.compare_at_price || undefined,
    sku: product.sku,
    barcode: product.barcode || undefined,
    category: (product.category as unknown as { name: string })?.name as any || 'accessories',
    category_id: (product as any).category_id || undefined,
    subcategory: (product.subcategory as unknown as { name: string })?.name || undefined,
    brand: product.brand || undefined,
    images: product.images || [],
    thumbnailImage: product.thumbnail_image || '',
    stockQuantity: product.stock_quantity,
    stock_quantity: product.stock_quantity,
    features: product.features || undefined,
    specifications: product.specifications as Record<string, string> || {},
    isDigital: product.is_digital,
    isNew: product.is_new || undefined,
    isFeatured: product.is_featured || undefined,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at),
    // إضافة خصائص المتغيرات للمنتج
    has_variants: product.has_variants || false,
    use_sizes: product.use_sizes || false,
    colors: colors // الألوان مع المقاسات
  };
};

export const mapSupabaseServiceToService = (service: SupabaseService): Service => {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    estimatedTime: service.estimated_time,
    category: service.category as any,
    image: service.image || undefined,
    isAvailable: service.is_available,
    isPriceDynamic: service.is_price_dynamic,
    createdAt: new Date(service.created_at),
    updatedAt: new Date(service.updated_at)
  };
};

export const mapSupabaseUserToUser = (user: SupabaseUser): User => {
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    phone: user.phone || undefined,
    role: user.role as any || 'customer',
    permissions: user.permissions as any || undefined,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    organization_id: (user as any).organization_id
  };
};

export const mapSupabaseOrderToOrder = async (
  order: SupabaseOrder & { order_items?: any[] },
  includeServices: boolean = false
): Promise<Order> => {
  let serviceBookingsData: any[] | undefined = undefined;
  if (includeServices) {
    const { data: serviceBookings, error: servicesError } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('order_id', order.id);
      
    if (servicesError) {
    }
    serviceBookingsData = serviceBookings;
  }
  
  return {
    id: order.id,
    customerId: order.customer_id,
    items: (order.order_items || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      isDigital: item.is_digital,
      slug: item.slug || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: item.name || item.product_name
    })),
    services: (serviceBookingsData || []).map(booking => ({
      id: booking.id,
      serviceId: booking.service_id,
      serviceName: booking.service_name,
      price: booking.price,
      scheduledDate: booking.scheduled_date ? new Date(booking.scheduled_date) : undefined,
      notes: booking.notes || undefined,
      customerId: booking.customer_id,
      customer_name: booking.customer_name || undefined,
      status: booking.status as ServiceStatus,
      assignedTo: booking.assigned_to,
      public_tracking_code: booking.public_tracking_code
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discount || 0,
    total: order.total,
    status: order.status as any,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status as 'paid' | 'pending' | 'failed',
    shippingAddress: undefined,
    shippingMethod: order.shipping_method,
    shippingCost: order.shipping_cost,
    notes: order.notes,
    isOnline: order.is_online,
    employeeId: order.employee_id,
    partialPayment: (order.payment_status === 'pending' && order.amount_paid && order.remaining_amount) ? {
      amountPaid: order.amount_paid,
      remainingAmount: order.remaining_amount
    } : undefined,
    considerRemainingAsPartial: order.consider_remaining_as_partial === false ? false : true,
    createdAt: new Date(order.created_at),
    updatedAt: new Date(order.updated_at),
    organization_id: order.organization_id,
    slug: order.slug
  };
};
