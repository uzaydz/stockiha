import { Order } from '@/components/orders/table/OrderTableTypes';

// Order status utilities
export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

// Shipping provider utilities
export const SHIPPING_PROVIDERS = {
  YALIDINE: 'yalidine',
  ZREXPRESS: 'zrexpress',
  MAYSTRO: 'maystro',
  ECOTRACK: 'ecotrack',
  ANDERSON_DELIVERY: 'anderson_delivery',
  AREEX: 'areex',
  BA_CONSULT: 'ba_consult',
  CONEXLOG: 'conexlog',
  COYOTE_EXPRESS: 'coyote_express',
  DHD: 'dhd',
  DISTAZERO: 'distazero',
  E48HR_LIVRAISON: 'e48hr_livraison',
  FRETDIRECT: 'fretdirect',
  GOLIVRI: 'golivri',
  MONO_HUB: 'mono_hub',
  MSM_GO: 'msm_go',
  IMIR_EXPRESS: 'imir_express',
  PACKERS: 'packers',
  PREST: 'prest',
  RB_LIVRAISON: 'rb_livraison',
  REX_LIVRAISON: 'rex_livraison',
  ROCKET_DELIVERY: 'rocket_delivery',
  SALVA_DELIVERY: 'salva_delivery',
  SPEED_DELIVERY: 'speed_delivery',
  TSL_EXPRESS: 'tsl_express',
  WORLDEXPRESS: 'worldexpress',
} as const;

export const SHIPPING_PROVIDER_NAMES: Record<string, string> = {
  yalidine: 'ياليدين',
  zrexpress: 'زر إكسبرس',
  maystro: 'مايسترو ديليفري',
  ecotrack: 'إيكوتراك',
  anderson_delivery: 'أندرسون ديليفري',
  areex: 'أريكس',
  ba_consult: 'بي إي كونسلت',
  conexlog: 'كونكسلوغ',
  coyote_express: 'كويوت إكسبرس',
  dhd: 'دي إتش دي',
  distazero: 'ديستازيرو',
  e48hr_livraison: '48 ساعة',
  fretdirect: 'فريت دايركت',
  golivri: 'غو ليفري',
  mono_hub: 'مونو هاب',
  msm_go: 'إم إس إم غو',
  imir_express: 'إمير إكسبرس',
  packers: 'باكرز',
  prest: 'بريست',
  rb_livraison: 'آر بي ليفريزون',
  rex_livraison: 'ريكس ليفريزون',
  rocket_delivery: 'روكيت ديليفري',
  salva_delivery: 'سالفا ديليفري',
  speed_delivery: 'سبيد ديليفري',
  tsl_express: 'تي إس إل إكسبرس',
  worldexpress: 'ورلد إكسبرس',
};

// Get the appropriate tracking field for a provider
export const getTrackingField = (providerCode: string): string => {
  switch (providerCode) {
    case SHIPPING_PROVIDERS.YALIDINE:
      return 'yalidine_tracking_id';
    case SHIPPING_PROVIDERS.ZREXPRESS:
      return 'zrexpress_tracking_id';
    case SHIPPING_PROVIDERS.MAYSTRO:
      return 'maystro_tracking_id';
    default:
      return 'ecotrack_tracking_id';
  }
};

// Format currency
export const formatCurrency = (amount: number, currency = 'DZD'): string => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  }
  
  return new Intl.DateTimeFormat('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

// Calculate order items count
export const getOrderItemsCount = (order: Order): number => {
  if (!order.order_items || !Array.isArray(order.order_items)) return 0;
  return order.order_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

// Parse form data from string format
const parseFormDataString = (formDataString: string) => {
  const data: any = {};
  
  // Handle format like: "| العنوان: value | الاسم: value | الهاتف: value"
  const parts = formDataString.split('|').map(part => part.trim()).filter(Boolean);
  
  for (const part of parts) {
    if (part.includes(':')) {
      const [key, ...valueParts] = part.split(':');
      const value = valueParts.join(':').trim();
      
      const cleanKey = key.trim();
      if (cleanKey === 'الاسم' || cleanKey === 'الإسم') {
        data.name = value;
      } else if (cleanKey === 'الهاتف') {
        data.phone = value;
      } else if (cleanKey === 'العنوان') {
        data.address = value;
      } else if (cleanKey === 'المدينة') {
        data.city = value;
      } else if (cleanKey === 'الولاية') {
        data.state = value;
      }
    }
  }
  
  return data;
};

// Get order customer name
export const getOrderCustomerName = (order: Order): string => {
  // First check customer object
  if (order.customer?.name) return order.customer.name;
  
  // Then check form_data
  if (order.form_data) {
    if (typeof order.form_data === 'object' && order.form_data.name) {
      return order.form_data.name;
    }
    if (typeof order.form_data === 'string') {
      try {
        // Try JSON parsing first
        const parsed = JSON.parse(order.form_data);
        if (parsed.name) return parsed.name;
      } catch (e) {
        // Try string parsing for pipe-separated format
        const parsed = parseFormDataString(order.form_data);
        if (parsed.name) return parsed.name;
      }
    }
  }
  
  // Check notes field as fallback
  if (order.notes && typeof order.notes === 'string') {
    const parsed = parseFormDataString(order.notes);
    if (parsed.name) return parsed.name;
  }
  
  // Then check shipping address
  if (order.shipping_address?.name) return order.shipping_address.name;
  
  // Generate from order number if available
  if (order.customer_order_number) {
    return `عميل #${order.customer_order_number}`;
  }
  
  return 'عميل غير معرف';
};

// Get order customer contact
export const getOrderCustomerContact = (order: Order): string => {
  // First check customer object
  if (order.customer?.phone) return order.customer.phone;
  
  // Then check form_data
  if (order.form_data) {
    if (typeof order.form_data === 'object' && order.form_data.phone) {
      return order.form_data.phone;
    }
    if (typeof order.form_data === 'string') {
      try {
        // Try JSON parsing first
        const parsed = JSON.parse(order.form_data);
        if (parsed.phone) return parsed.phone;
      } catch (e) {
        // Try string parsing for pipe-separated format
        const parsed = parseFormDataString(order.form_data);
        if (parsed.phone) return parsed.phone;
      }
    }
  }
  
  // Check notes field as fallback
  if (order.notes && typeof order.notes === 'string') {
    const parsed = parseFormDataString(order.notes);
    if (parsed.phone) return parsed.phone;
  }
  
  // Then check shipping address
  if (order.shipping_address?.phone) return order.shipping_address.phone;
  
  return 'لا توجد بيانات اتصال';
};

// Get order address
export const getOrderAddress = (order: Order): string => {
  // First check shipping_address
  const address = order.shipping_address;
  if (address) {
    const parts = [
      address.street_address,
      address.municipality,
      address.state,
    ].filter(Boolean);
    
    if (parts.length > 0) return parts.join(', ');
  }
  
  // Then check form_data for address info
  if (order.form_data) {
    if (typeof order.form_data === 'object' && order.form_data) {
      const addressParts = [
        order.form_data.address || order.form_data.street_address,
        order.form_data.municipality || order.form_data.city,
        order.form_data.state || order.form_data.province,
      ].filter(Boolean);
      
      if (addressParts.length > 0) return addressParts.join(', ');
    }
    if (typeof order.form_data === 'string') {
      try {
        // Try JSON parsing first
        const formData = JSON.parse(order.form_data);
        const addressParts = [
          formData.address || formData.street_address,
          formData.municipality || formData.city,
          formData.state || formData.province,
        ].filter(Boolean);
        
        if (addressParts.length > 0) return addressParts.join(', ');
      } catch (e) {
        // Try string parsing for pipe-separated format
        const parsed = parseFormDataString(order.form_data);
        if (parsed.address) return parsed.address;
      }
    }
  }
  
  // Check notes field as fallback
  if (order.notes && typeof order.notes === 'string') {
    const parsed = parseFormDataString(order.notes);
    if (parsed.address) return parsed.address;
  }
  
  return 'لا يوجد عنوان';
};

// Check if order can be edited
export const canEditOrder = (order: Order): boolean => {
  return order.status === ORDER_STATUSES.PENDING || order.status === ORDER_STATUSES.PROCESSING;
};

// Check if order can be cancelled
export const canCancelOrder = (order: Order): boolean => {
  return order.status !== ORDER_STATUSES.DELIVERED && order.status !== ORDER_STATUSES.CANCELLED;
};

// Check if order can be shipped
export const canShipOrder = (order: Order): boolean => {
  return order.status === ORDER_STATUSES.PENDING || order.status === ORDER_STATUSES.PROCESSING;
};

// Get order badge variant
export const getOrderBadgeVariant = (status: OrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case ORDER_STATUSES.DELIVERED:
      return 'default';
    case ORDER_STATUSES.CANCELLED:
      return 'destructive';
    case ORDER_STATUSES.SHIPPED:
    case ORDER_STATUSES.PROCESSING:
      return 'secondary';
    default:
      return 'outline';
  }
};

// Calculate order totals
export const calculateOrderTotals = (orders: Order[]) => {
  return orders.reduce((acc, order) => {
    acc.total += order.total || 0;
    acc.subtotal += order.subtotal || 0;
    acc.tax += order.tax || 0;
    acc.shipping += order.shipping_cost || 0;
    acc.discount += order.discount || 0;
    return acc;
  }, {
    total: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
  });
};

// Group orders by status
export const groupOrdersByStatus = (orders: Order[]): Record<OrderStatus, Order[]> => {
  const grouped = {
    [ORDER_STATUSES.PENDING]: [],
    [ORDER_STATUSES.PROCESSING]: [],
    [ORDER_STATUSES.SHIPPED]: [],
    [ORDER_STATUSES.DELIVERED]: [],
    [ORDER_STATUSES.CANCELLED]: [],
  } as Record<OrderStatus, Order[]>;

  orders.forEach(order => {
    if (order.status && grouped[order.status as OrderStatus]) {
      grouped[order.status as OrderStatus].push(order);
    }
  });

  return grouped;
};

// Export order data to CSV
export const exportOrdersToCSV = (orders: Order[]): string => {
  const headers = [
    'رقم الطلب',
    'العميل',
    'الهاتف',
    'المبلغ الإجمالي',
    'الحالة',
    'التاريخ',
    'العنوان',
  ];

  const rows = orders.map(order => [
    order.customer_order_number || order.id,
    getOrderCustomerName(order),
    getOrderCustomerContact(order),
    formatCurrency(order.total || 0),
    ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status,
    formatDate(order.created_at),
    getOrderAddress(order),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

// Download CSV file
export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
