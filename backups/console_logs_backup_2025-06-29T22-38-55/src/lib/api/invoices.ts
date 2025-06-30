import { supabase } from '@/lib/supabase';
import { getOrderById, getOrderItems } from './orders';
import { getCustomerById } from './customers';
import type { Database } from '@/types/database.types';

// Extender tipo Customer para incluir address
interface CustomerWithAddress extends Record<string, any> {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

// Extender tipo Order para incluir organization_id
interface OrderWithOrg extends Record<string, any> {
  id: string;
  customer_id: string;
  organization_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address_id: string;
  shipping_method: string;
  shipping_cost: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Extender tipo OrderItem para incluir name
interface OrderItemWithName extends Record<string, any> {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_digital: boolean;
}

// Implementación temporal para getOnlineOrderById
export const getOnlineOrderById = async (orderId: string) => {
  const { data, error } = await supabase
    .from('online_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  return data as OrderWithOrg;
};

// Implementación temporal para getOnlineOrderItems
export const getOnlineOrderItems = async (orderId: string) => {
  const { data, error } = await supabase
    .from('online_order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    name: item.product_name || 'Producto'
  })) as OrderItemWithName[];
};

// Implementación temporal para getServiceBooking
export const getServiceBooking = async (bookingId: string) => {
  const { data, error } = await supabase
    .from('service_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error) {
    throw error;
  }

  return data as OrderWithOrg;
};

// Sobrescribir getCustomerById para incluir address
export const getCustomerByIdWithAddress = async (customerId: string): Promise<CustomerWithAddress | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) throw error;
    return data as CustomerWithAddress;
  } catch (error) {
    return null;
  }
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string | null;
  status: 'paid' | 'pending' | 'overdue' | 'canceled';
  items: InvoiceItem[];
  organizationId: string;
  sourceType: 'pos' | 'online' | 'service' | 'combined';
  sourceId: string | string[]; // ID of order, online order, service booking, or array of IDs for combined
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  customFields: Record<string, any> | null; // For storing custom fields
  taxAmount: number;
  discountAmount: number;
  subtotalAmount: number;
  shippingAmount: number | null;
  customerInfo: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  organizationInfo: {
    name: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    taxNumber: string | null;
    registrationNumber: string | null;
    additionalInfo: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId?: string | null; // Optional reference to a product
  serviceId?: string | null; // Optional reference to a service
  type: 'product' | 'service' | 'fee' | 'discount' | 'other';
}

// Generate invoice number with organization-specific prefix and sequential number
export const generateInvoiceNumber = async (organizationId: string, type: 'pos' | 'online' | 'service' | 'combined'): Promise<string> => {
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('site_name')
    .eq('organization_id', organizationId)
    .single();
    
  // Get latest invoice to determine next number
  const { data: latestInvoices } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1);
    
  let nextNumber = 1;
  
  if (latestInvoices && latestInvoices.length > 0) {
    const lastInvoiceNumber = latestInvoices[0].invoice_number;
    const numberPart = parseInt(lastInvoiceNumber.split('-').pop() || '0', 10);
    if (!isNaN(numberPart)) {
      nextNumber = numberPart + 1;
    }
  }
  
  const prefix = settings?.site_name 
    ? settings.site_name.substring(0, 3).toUpperCase() 
    : 'INV';
    
  const typeCode = type === 'pos' ? 'POS' : 
                  type === 'online' ? 'ONL' : 
                  type === 'service' ? 'SRV' : 'CMB';
                  
  const date = new Date();
  const year = date.getFullYear().toString().substring(2); // Last 2 digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  return `${prefix}-${typeCode}-${year}${month}-${nextNumber.toString().padStart(4, '0')}`;
};

// Create an invoice from a POS order
export const createInvoiceFromPosOrder = async (orderId: string): Promise<Invoice | null> => {
  try {
    const order = await getOrderById(orderId) as unknown as OrderWithOrg;
    if (!order) {
      return null;
    }
    
    // Get order items
    const orderItems = await getOrderItems(orderId) as unknown as OrderItemWithName[];
    
    // Get customer info if available
    let customerInfo = {
      id: null,
      name: 'عميل نقدي',
      email: null,
      phone: null,
      address: null
    };
    
    if (order.customer_id) {
      const customer = await getCustomerByIdWithAddress(order.customer_id);
      if (customer) {
        customerInfo = {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address || null
        };
      }
    }
    
    // Get organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('*, organization_settings(*)')
      .eq('id', order.organization_id)
      .single();
      
    const organizationInfo = {
      name: org?.name || 'المؤسسة',
      logo: org?.organization_settings?.logo_url || null,
      address: org?.address || null,
      phone: org?.phone || null,
      email: org?.email || null,
      website: org?.website || null,
      taxNumber: org?.tax_number || null,
      registrationNumber: org?.registration_number || null,
      additionalInfo: null
    };
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(order.organization_id, 'pos');
    
    // Create invoice items from order items
    const invoiceItems: InvoiceItem[] = orderItems.map(item => ({
      id: item.id,
      invoiceId: '', // Will be set after invoice creation
      name: item.product_name || item.name,
      description: null,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      productId: item.product_id,
      type: 'product'
    }));
    
    // Create invoice
    const invoiceData = {
      invoice_number: invoiceNumber,
      customer_name: customerInfo.name,
      customer_id: customerInfo.id,
      total_amount: Number(order.total),
      invoice_date: order.created_at || new Date().toISOString(),
      due_date: null, // POS orders are typically paid immediately
      status: order.payment_status === 'paid' ? 'paid' : 'pending',
      organization_id: order.organization_id,
      source_type: 'pos',
      source_id: order.id,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      notes: order.notes,
      custom_fields: null,
      tax_amount: Number(order.tax),
      discount_amount: Number(order.discount || 0),
      subtotal_amount: Number(order.subtotal),
      shipping_amount: Number(order.shipping_cost || 0),
      customer_info: customerInfo,
      organization_info: organizationInfo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert invoice into database
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    // Update invoice items with invoice ID and insert them
    const itemsWithInvoiceId = invoiceItems.map(item => ({
      ...item,
      invoice_id: invoice.id
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);
      
    if (itemsError) {
      throw itemsError;
    }
    
    // Return complete invoice with items
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      totalAmount: Number(invoice.total_amount) || 0,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      status: invoice.status,
      items: invoiceItems.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0
      })),
      organizationId: invoice.organization_id,
      sourceType: invoice.source_type,
      sourceId: invoice.source_id,
      paymentMethod: invoice.payment_method,
      paymentStatus: invoice.payment_status,
      notes: invoice.notes,
      customFields: invoice.custom_fields,
      taxAmount: Number(invoice.tax_amount) || 0,
      discountAmount: Number(invoice.discount_amount) || 0,
      subtotalAmount: Number(invoice.subtotal_amount) || 0,
      shippingAmount: Number(invoice.shipping_amount) || 0,
      customerInfo: invoice.customer_info,
      organizationInfo: invoice.organization_info,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
  } catch (error) {
    return null;
  }
};

// Create an invoice from an online order
export const createInvoiceFromOnlineOrder = async (orderId: string): Promise<Invoice | null> => {
  // Implementation similar to createInvoiceFromPosOrder but for online orders
  try {
    const order = await getOnlineOrderById(orderId);
    if (!order) {
      return null;
    }
    
    // Get order items
    const orderItems = await getOnlineOrderItems(orderId);
    
    // Rest of implementation similar to POS order...
    // This would be implemented fully in the actual code
    
    // For brevity, returning null in this example
    return null;
  } catch (error) {
    return null;
  }
};

// Create an invoice from a service booking
export const createInvoiceFromServiceBooking = async (bookingId: string): Promise<Invoice | null> => {
  // Implementation for service bookings
  try {
    const booking = await getServiceBooking(bookingId);
    if (!booking) {
      return null;
    }
    
    // Rest of implementation...
    // This would be implemented fully in the actual code
    
    // For brevity, returning null in this example
    return null;
  } catch (error) {
    return null;
  }
};

// Create a combined invoice from multiple sources
export const createCombinedInvoice = async (
  customerId: string,
  sourceIds: { orderId?: string[], onlineOrderId?: string[], serviceBookingId?: string[] },
  organizationId: string
): Promise<Invoice | null> => {
  // Implementation for combined invoices
  // This would be implemented fully in the actual code
  return null;
};

// Get all invoices for an organization
export const getInvoices = async (organizationId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // For each invoice, get its items
  const invoicesWithItems = await Promise.all(data.map(async (invoice) => {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);
      
    // Ensure all numeric fields are properly initialized
    const processedItems = (items || []).map(item => ({
      id: item.id,
      invoiceId: item.invoice_id,
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      totalPrice: Number(item.total_price) || 0,
      productId: item.product_id,
      serviceId: item.service_id,
      type: item.type
    }));
      
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      totalAmount: Number(invoice.total_amount) || 0,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      status: invoice.status,
      items: processedItems,
      organizationId: invoice.organization_id,
      sourceType: invoice.source_type,
      sourceId: invoice.source_id,
      paymentMethod: invoice.payment_method,
      paymentStatus: invoice.payment_status,
      notes: invoice.notes,
      customFields: invoice.custom_fields,
      taxAmount: Number(invoice.tax_amount) || 0,
      discountAmount: Number(invoice.discount_amount) || 0,
      subtotalAmount: Number(invoice.subtotal_amount) || 0,
      shippingAmount: Number(invoice.shipping_amount) || 0,
      customerInfo: invoice.customer_info,
      organizationInfo: invoice.organization_info,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
  }));
  
  return invoicesWithItems;
};

// Get invoice by ID
export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();
    
  if (error) {
    throw error;
  }
  
  if (!invoice) return null;
  
  // Get invoice items
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId);
    
  // Ensure all numeric fields are properly initialized
  const processedItems = (items || []).map(item => ({
    id: item.id,
    invoiceId: item.invoice_id,
    name: item.name,
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unit_price) || 0,
    totalPrice: Number(item.total_price) || 0,
    productId: item.product_id,
    serviceId: item.service_id,
    type: item.type
  }));
    
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customer_name,
    totalAmount: Number(invoice.total_amount) || 0,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    items: processedItems,
    organizationId: invoice.organization_id,
    sourceType: invoice.source_type,
    sourceId: invoice.source_id,
    paymentMethod: invoice.payment_method,
    paymentStatus: invoice.payment_status,
    notes: invoice.notes,
    customFields: invoice.custom_fields,
    taxAmount: Number(invoice.tax_amount) || 0,
    discountAmount: Number(invoice.discount_amount) || 0,
    subtotalAmount: Number(invoice.subtotal_amount) || 0,
    shippingAmount: Number(invoice.shipping_amount) || 0,
    customerInfo: invoice.customer_info,
    organizationInfo: invoice.organization_info,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  };
};

// Update invoice
export const updateInvoice = async (invoiceId: string, data: Partial<Invoice>): Promise<Invoice | null> => {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single();
    
  if (error) {
    throw error;
  }
  
  return getInvoiceById(invoiceId);
};

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  // Delete invoice items first
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);
    
  if (itemsError) {
    throw itemsError;
  }
  
  // Then delete invoice
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);
    
  if (error) {
    throw error;
  }
};
