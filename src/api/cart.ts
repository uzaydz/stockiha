import { getSupabaseClient } from '@/lib/supabase-client';
import type { CartItem } from '@/lib/cart/cartStorage';

export interface CreateCartOrderParams {
  organizationId: string;
  customer: {
    fullName: string;
    phone: string;
    province: string; // wilaya id as string
    municipality: string; // municipality id as string
    address?: string;
    city?: string;
  };
  shipping: {
    deliveryCompany?: string;
    deliveryOption: 'home' | 'desk';
    deliveryFee: number;
    stopDeskId?: string | null;
  };
  payment: {
    method: string; // e.g., 'cod'
  };
  items: CartItem[];
  formData?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export async function createCartOrder(params: CreateCartOrderParams) {
  const supabase = getSupabaseClient();

  const items = params.items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
    unit_price: Number(i.variant?.selectedPrice ?? i.unitPrice) || 0,
    color_id: i.variant?.colorId || null,
    size_id: i.variant?.sizeId || null,
    size_name: i.variant?.sizeName || null,
    selected_price: Number(i.variant?.selectedPrice ?? i.unitPrice) || 0,
  }));

  const payload: any = {
    p_full_name: params.customer.fullName,
    p_phone: params.customer.phone,
    p_province: params.customer.province,
    p_municipality: params.customer.municipality,
    p_organization_id: params.organizationId,
    p_address: params.customer.address || '',
    p_city: params.customer.city || null,
    p_delivery_company: params.shipping.deliveryCompany || 'yalidine',
    p_delivery_option: params.shipping.deliveryOption,
    p_payment_method: params.payment.method || 'cod',
    p_notes: '',
    p_delivery_fee: params.shipping.deliveryFee || 0,
    p_items: items,
    p_form_data: params.formData || null,
    p_metadata: {
      ...(params.metadata || {}),
      mode: 'cart',
      items_count: params.items.length
    },
    p_stop_desk_id: params.shipping.stopDeskId || null
  };

  const { data, error } = await supabase.rpc('process_cart_order_new', payload);
  if (error) throw error;
  return data as any;
}

