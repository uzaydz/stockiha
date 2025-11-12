import { supabase } from '@/lib/supabase';
import { getOrderById, getOrderItems } from './orders';
// removed unused imports
import { inventoryDB } from '@/database/localDb';

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
    // Offline fallback from SQLite
    try {
      const c: any = await inventoryDB.customers.get(customerId);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        address: null
      } as CustomerWithAddress;
    } catch {
      return null;
    }
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
    
    // Update invoice items with invoice ID and insert them (DB column names)
    const insertItems = invoiceItems.map(item => ({
      id: item.id,
      invoice_id: invoice.id,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      product_id: item.productId || null,
      service_id: item.serviceId || null,
      type: item.type
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(insertItems as any);
      
    if (itemsError) {
      throw itemsError;
    }

    // Mirror to SQLite
    try {
      await inventoryDB.invoices.put({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id || null,
        total_amount: Number(invoice.total_amount) || 0,
        paid_amount: 0,
        status: invoice.status as Invoice['status'],
        organization_id: invoice.organization_id,
        synced: true,
        localCreatedAt: invoice.created_at,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      } as any);
      for (const it of insertItems) {
        await inventoryDB.invoiceItems.put({
          id: it.id,
          invoice_id: invoice.id,
          product_id: it.product_id || null,
          product_name: it.name,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          subtotal: Number(it.total_price) || 0,
          created_at: new Date().toISOString()
        } as any);
      }
    } catch {}
    
    // Return complete invoice with items
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      totalAmount: Number(invoice.total_amount) || 0,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      status: (invoice.status as Invoice['status']),
      items: invoiceItems.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0
      })),
      organizationId: invoice.organization_id,
      sourceType: (invoice.source_type as Invoice['sourceType']),
      sourceId: invoice.source_id,
      paymentMethod: invoice.payment_method,
      paymentStatus: invoice.payment_status,
      notes: invoice.notes,
      customFields: invoice.custom_fields as any,
      taxAmount: Number(invoice.tax_amount) || 0,
      discountAmount: Number(invoice.discount_amount) || 0,
      subtotalAmount: Number(invoice.subtotal_amount) || 0,
      shippingAmount: Number(invoice.shipping_amount) || 0,
      customerInfo: invoice.customer_info as any,
      organizationInfo: invoice.organization_info as any,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
  } catch (error) {
    // Offline create: persist invoice and items in SQLite and queue for sync
    try {
      const order = await getOrderById(orderId) as any;
      const items = await getOrderItems(orderId) as any[];
      if (!order) return null;
      const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const now = new Date().toISOString();
      const invoice_number = `INV-OFF-${now.slice(0,7).replace('-', '')}-${id.slice(-4)}`;
      const status: Invoice['status'] = (order?.payment_status === 'paid' ? 'paid' : 'pending');
      await inventoryDB.invoices.put({
        id,
        invoice_number,
        customer_id: order?.customer_id || null,
        total_amount: Number(order?.total) || 0,
        paid_amount: 0,
        status,
        organization_id: order?.organization_id,
        synced: false,
        syncStatus: 'pending',
        localCreatedAt: now,
        created_at: now,
        updated_at: now,
        pendingOperation: 'create'
      } as any);
      for (const it of (items || [])) {
        const itemId = it.id || `${id}:${Math.random().toString(16).slice(2)}`;
        await inventoryDB.invoiceItems.put({
          id: itemId,
          invoice_id: id,
          product_id: it.product_id || null,
          product_name: it.product_name || it.name || 'Item',
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          subtotal: Number(it.total_price) || 0,
          created_at: now
        } as any);
      }
      await inventoryDB.syncQueue.put({
        id: id + ':invoice:create',
        objectType: 'invoice',
        objectId: id,
        operation: 'create',
        data: { orderId },
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
      return {
        id,
        invoiceNumber: invoice_number,
        customerName: null,
        totalAmount: Number(order?.total) || 0,
        invoiceDate: now,
        dueDate: null,
        status,
        items: (items || []).map((it: any) => ({
          id: it.id || `${id}:${Math.random().toString(16).slice(2)}`,
          invoiceId: id,
          name: it.product_name || it.name || 'Item',
          description: null,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unit_price) || 0,
          totalPrice: Number(it.total_price) || 0,
          productId: it.product_id || null,
          type: 'product' as InvoiceItem['type']
        })),
        organizationId: order?.organization_id,
        sourceType: 'pos',
        sourceId: orderId,
        paymentMethod: order?.payment_method || 'cash',
        paymentStatus: order?.payment_status || 'pending',
        notes: order?.notes || null,
        customFields: null,
        taxAmount: Number(order?.tax) || 0,
        discountAmount: Number(order?.discount) || 0,
        subtotalAmount: Number(order?.subtotal) || 0,
        shippingAmount: Number(order?.shipping_cost) || 0,
        customerInfo: { id: order?.customer_id || null, name: null, email: null, phone: null, address: null },
        organizationInfo: { name: '', logo: null, address: null, phone: null, email: null, website: null, taxNumber: null, registrationNumber: null, additionalInfo: null },
        createdAt: now,
        updatedAt: now
      } as Invoice;
    } catch {
      return null;
    }
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
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // For each invoice, get its items
    const invoicesWithItems = await Promise.all((data || []).map(async (invoice) => {
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
        type: item.type as InvoiceItem['type']
      }));

      // Mirror to SQLite
      try {
        await inventoryDB.invoices.put({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id || null,
          total_amount: Number(invoice.total_amount) || 0,
          paid_amount: 0,
          status: invoice.status,
          organization_id: invoice.organization_id,
          synced: true,
          localCreatedAt: invoice.created_at,
          created_at: invoice.created_at,
          updated_at: invoice.updated_at
        } as any);
        for (const it of processedItems) {
          await inventoryDB.invoiceItems.put({
            id: it.id,
            invoice_id: invoice.id,
            product_id: it.productId || null,
            product_name: it.name,
            quantity: Number(it.quantity) || 0,
            unit_price: Number(it.unitPrice) || 0,
            subtotal: Number(it.totalPrice) || 0,
            created_at: invoice.created_at
          } as any);
        }
      } catch {}

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.customer_name,
        totalAmount: Number(invoice.total_amount) || 0,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        status: invoice.status as Invoice['status'],
        items: processedItems,
        organizationId: invoice.organization_id,
        sourceType: (invoice.source_type as Invoice['sourceType']),
        sourceId: invoice.source_id,
        paymentMethod: invoice.payment_method,
        paymentStatus: invoice.payment_status,
        notes: invoice.notes,
        customFields: invoice.custom_fields as any,
        taxAmount: Number(invoice.tax_amount) || 0,
        discountAmount: Number(invoice.discount_amount) || 0,
        subtotalAmount: Number(invoice.subtotal_amount) || 0,
        shippingAmount: Number(invoice.shipping_amount) || 0,
        customerInfo: invoice.customer_info as any,
        organizationInfo: invoice.organization_info as any,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      };
    }));

    return invoicesWithItems;
  } catch (err) {
    // Offline: Read from SQLite
    try {
      const rows = await inventoryDB.invoices.where({ organization_id: organizationId }).toArray();
      const result: Invoice[] = [];
      for (const inv of (rows || [])) {
        const items = await inventoryDB.invoiceItems.where({ invoice_id: inv.id }).toArray();
        result.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customerName: null,
          totalAmount: Number(inv.total_amount) || 0,
          invoiceDate: inv.created_at,
          dueDate: null,
          status: (inv.status as Invoice['status']),
          items: (items || []).map((it: any) => ({
            id: it.id,
            invoiceId: it.invoice_id,
            name: it.product_name || 'Item',
            description: null,
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.subtotal) || 0,
            productId: it.product_id || null,
            type: 'product' as InvoiceItem['type']
          })),
          organizationId: inv.organization_id,
          sourceType: 'pos' as Invoice['sourceType'],
          sourceId: inv.id,
          paymentMethod: 'cash',
          paymentStatus: inv.status === 'paid' ? 'paid' : 'pending',
          notes: null,
          customFields: null,
          taxAmount: 0,
          discountAmount: 0,
          subtotalAmount: Number(inv.total_amount) || 0,
          shippingAmount: 0,
          customerInfo: { id: inv.customer_id || null, name: null, email: null, phone: null, address: null },
          organizationInfo: { name: '', logo: null, address: null, phone: null, email: null, website: null, taxNumber: null, registrationNumber: null, additionalInfo: null },
          createdAt: inv.created_at,
          updatedAt: inv.updated_at
        });
      }
      return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch {
      return [];
    }
  }
};

// Get invoice by ID
export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    if (error) throw error;
    if (!invoice) return null;
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

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
      type: item.type as InvoiceItem['type']
    }));

    // Mirror to SQLite
    try {
      await inventoryDB.invoices.put({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id || null,
        total_amount: Number(invoice.total_amount) || 0,
        paid_amount: 0,
        status: invoice.status,
        organization_id: invoice.organization_id,
        synced: true,
        localCreatedAt: invoice.created_at,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      } as any);
      for (const it of processedItems) {
        await inventoryDB.invoiceItems.put({
          id: it.id,
          invoice_id: invoice.id,
          product_id: it.productId || null,
          product_name: it.name,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unitPrice) || 0,
          subtotal: Number(it.totalPrice) || 0,
          created_at: invoice.created_at
        } as any);
      }
    } catch {}

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      totalAmount: Number(invoice.total_amount) || 0,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      status: invoice.status as Invoice['status'],
      items: processedItems,
      organizationId: invoice.organization_id,
      sourceType: (invoice.source_type as Invoice['sourceType']),
      sourceId: invoice.source_id,
      paymentMethod: invoice.payment_method,
      paymentStatus: invoice.payment_status,
      notes: invoice.notes,
      customFields: invoice.custom_fields as any,
      taxAmount: Number(invoice.tax_amount) || 0,
      discountAmount: Number(invoice.discount_amount) || 0,
      subtotalAmount: Number(invoice.subtotal_amount) || 0,
      shippingAmount: Number(invoice.shipping_amount) || 0,
      customerInfo: invoice.customer_info as any,
      organizationInfo: invoice.organization_info as any,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
  } catch (err) {
    // Offline from SQLite
    try {
      const inv: any = await inventoryDB.invoices.get(invoiceId);
      if (!inv) return null;
      const items = await inventoryDB.invoiceItems.where({ invoice_id: invoiceId }).toArray();
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerName: null,
        totalAmount: Number(inv.total_amount) || 0,
        invoiceDate: inv.created_at,
        dueDate: null,
        status: (inv.status as Invoice['status']),
        items: (items || []).map((it: any) => ({
          id: it.id,
          invoiceId: it.invoice_id,
          name: it.product_name || 'Item',
          description: null,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unit_price) || 0,
          totalPrice: Number(it.subtotal) || 0,
          productId: it.product_id || null,
          type: 'product' as InvoiceItem['type']
        })),
        organizationId: inv.organization_id,
        sourceType: 'pos' as Invoice['sourceType'],
        sourceId: inv.id,
        paymentMethod: 'cash',
        paymentStatus: inv.status === 'paid' ? 'paid' : 'pending',
        notes: null,
        customFields: null,
        taxAmount: 0,
        discountAmount: 0,
        subtotalAmount: Number(inv.total_amount) || 0,
        shippingAmount: 0,
        customerInfo: { id: inv.customer_id || null, name: null, email: null, phone: null, address: null },
        organizationInfo: { name: '', logo: null, address: null, phone: null, email: null, website: null, taxNumber: null, registrationNumber: null, additionalInfo: null },
        createdAt: inv.created_at,
        updatedAt: inv.updated_at
      };
    } catch {
      return null;
    }
  }
};

// Update invoice
export const updateInvoice = async (invoiceId: string, data: Partial<Invoice>): Promise<Invoice | null> => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;
    // Mirror
    try {
      await inventoryDB.invoices.update(invoiceId, { updated_at: invoice.updated_at, status: (invoice as any).status } as any);
    } catch {}
    return getInvoiceById(invoiceId);
  } catch (err: any) {
    const now = new Date().toISOString();
    try {
      await inventoryDB.invoices.update(invoiceId, { ...data, updated_at: now } as any);
      await inventoryDB.syncQueue.put({
        id: invoiceId + ':invoice:update:' + now,
        objectType: 'invoice',
        objectId: invoiceId,
        operation: 'update',
        data: data as any,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
      return await getInvoiceById(invoiceId);
    } catch {
      return null;
    }
  }
};

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);
    if (itemsError) throw itemsError;
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);
    if (error) throw error;
    try {
      // cleanup local mirror
      const items = await inventoryDB.invoiceItems.where({ invoice_id: invoiceId }).toArray();
      for (const it of (items || [])) {
        await inventoryDB.invoiceItems.delete(it.id);
      }
      await inventoryDB.invoices.delete(invoiceId);
    } catch {}
  } catch (err) {
    // Offline queue delete
    const now = new Date().toISOString();
    try {
      await inventoryDB.invoices.update(invoiceId, { pendingOperation: 'delete', updated_at: now } as any);
      await inventoryDB.syncQueue.put({
        id: invoiceId + ':invoice:delete',
        objectType: 'invoice',
        objectId: invoiceId,
        operation: 'delete',
        data: {},
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        priority: 2
      } as any);
    } catch {}
  }
};
