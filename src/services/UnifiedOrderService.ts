/**
 * ⚡ UnifiedOrderService - v3.0 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * نظام Offline-First كامل للطلبات:
 * - إنشاء طلبات POS محلياً فوراً
 * - تحديث حالات الطلب
 * - إحصائيات محلية فورية
 * - مزامنة تلقائية عند الاتصال
 *
 * ✅ يستخدم powerSyncService.query() بدل db.getAll()
 * ✅ يستخدم powerSyncService.queryOne() بدل db.get()
 * ✅ يستخدم powerSyncService.mutate() للكتابة
 * ✅ يستخدم powerSyncService.transaction() للعمليات المتعددة
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync';
import { unifiedProductService } from './UnifiedProductService';

// ========================================
// 📦 Types
// ========================================

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed' | 'credit';
export type POSOrderType = 'retail' | 'wholesale' | 'partial_wholesale';

export interface Order {
  id: string;
  organization_id: string;
  customer_id?: string;

  // Amounts
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  remaining_amount: number;
  shipping_cost: number;

  // Status
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;

  // POS specific
  is_online: boolean;
  pos_order_type?: POSOrderType;

  // Staff
  employee_id?: string;
  created_by_staff_id?: string;
  created_by_staff_name?: string;

  // References
  customer_order_number?: string;
  global_order_number?: string;
  slug?: string;

  // Notes
  notes?: string;
  customer_notes?: string;
  admin_notes?: string;

  // Shipping
  shipping_address_id?: string;
  shipping_method?: string;

  // Timestamps
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  organization_id: string;
  order_id: string;
  product_id: string;

  // Product info
  product_name: string;
  name?: string;
  slug?: string;

  // Quantity & Price
  quantity: number;
  unit_price: number;
  total_price: number;
  original_price?: number;

  // Sale type
  sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
  selling_unit_type?: string;
  is_wholesale?: boolean;

  // Variants
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  variant_display_name?: string;
  variant_info?: string;

  // Weight/Meter/Box
  weight_sold?: number;
  weight_unit?: string;
  price_per_weight_unit?: number;
  meters_sold?: number;
  price_per_meter?: number;
  boxes_sold?: number;
  units_per_box?: number;
  box_price?: number;

  created_at?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer?: { id: string; name: string; phone?: string };
}

export interface CreateOrderInput {
  customer_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    product_name: string;
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
    sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
    // ⚡ حقول البيع المتقدم
    selling_unit?: 'piece' | 'weight' | 'box' | 'meter';
    weight?: number;           // الوزن (للبيع بالوزن)
    weight_unit?: string;      // وحدة الوزن
    box_count?: number;        // عدد الصناديق
    units_per_box?: number;    // عدد القطع في الصندوق
    length?: number;           // الطول (للبيع بالمتر)
  }>;
  payment_method: PaymentMethod;
  amount_paid: number;
  discount?: number;
  tax?: number;
  shipping_cost?: number;
  notes?: string;
  staff_id?: string;
  staff_name?: string;
  pos_order_type?: POSOrderType;
}

export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  customer_id?: string;
  is_online?: boolean;
  from_date?: string;
  to_date?: string;
  search?: string;
  customerOrderNumber?: number;
  organizationId?: string;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  total_paid: number;
  total_pending: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_payment_method: Record<PaymentMethod, number>;
}

export interface PaginatedOrders {
  data: OrderWithItems[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ========================================
// 🔧 UnifiedOrderService Class
// ========================================

class UnifiedOrderServiceClass {
  private organizationId: string | null = null;
  private orderCounter: number = 0;

  /**
   * تعيين معرف المؤسسة
   * 🔧 FIX: Only accept valid (non-empty) organization IDs
   */
  setOrganizationId(orgId: string | null): void {
    // Only set if it's a valid, non-empty string
    if (orgId && orgId.trim().length > 10) {
      this.organizationId = orgId.trim();
      console.log('[UnifiedOrderService] ✅ Organization ID set:', orgId.slice(0, 8) + '...');
    }
  }

  /**
   * الحصول على معرف المؤسسة
   * 🔧 FIX: Better validation and fallback logic
   */
  private getOrgId(): string {
    // Check if we have a valid organizationId stored
    if (this.organizationId && this.organizationId.trim().length > 10) {
      return this.organizationId;
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('bazaar_organization_id') ||
                   localStorage.getItem('currentOrganizationId');
    if (stored && stored.trim().length > 10) {
      this.organizationId = stored;
      return stored;
    }

    throw new Error('Organization ID not set - queries cannot proceed');
  }

  /**
   * توليد رقم طلب محلي
   */
  private generateOrderNumber(): string {
    this.orderCounter++;
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-4);
    return `POS-${dateStr}-${timeStr}-${this.orderCounter}`;
  }

  // ========================================
  // 📖 READ Operations
  // ========================================

  /**
   * ⚡ جلب الطلبات مع Pagination
   */
  async getOrders(
    filters: OrderFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedOrders> {
    const tStart = performance.now();
    console.log('[UnifiedOrderService] 📄 getOrders start', {
      page,
      limit,
      filters
    });
    const orgId = this.getOrgId();
    const offset = (page - 1) * limit;

    // بناء شروط البحث
    let whereClause = 'organization_id = ?';
    const params: any[] = [orgId];

    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.payment_status) {
      whereClause += ' AND payment_status = ?';
      params.push(filters.payment_status);
    }

    if (filters.customer_id) {
      whereClause += ' AND customer_id = ?';
      params.push(filters.customer_id);
    }

    if (filters.is_online !== undefined) {
      whereClause += ' AND is_online = ?';
      params.push(filters.is_online ? 1 : 0);
    }

    if (filters.from_date) {
      whereClause += ' AND created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      whereClause += ' AND created_at <= ?';
      params.push(filters.to_date);
    }

    if (filters.search) {
      whereClause += ' AND (customer_order_number LIKE ? OR slug LIKE ? OR notes LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // ✅ v3.0: استخدام count() الجديد
    const total = await powerSyncService.count('orders', whereClause, params);

    // ✅ v3.0: استخدام query() الجديد
    const orders = await powerSyncService.query<Order>({
      sql: `SELECT * FROM orders WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params: [...params, limit, offset]
    });

    if (orders.length === 0) {
      return { data: [], total, page, limit, hasMore: false };
    }

    // ⚡ إصلاح N+1: جلب جميع العناصر في استعلام واحد
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    const allItems = await powerSyncService.query<OrderItem>({
      sql: `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY created_at ASC`,
      params: orderIds
    });

    // تجميع العناصر حسب order_id
    const itemsByOrderId = new Map<string, OrderItem[]>();
    for (const item of allItems) {
      const items = itemsByOrderId.get(item.order_id) || [];
      items.push(item);
      itemsByOrderId.set(item.order_id, items);
    }

    // ⚡ إصلاح N+1: جلب جميع العملاء في استعلام واحد
    const customerIds = [...new Set(orders.filter(o => o.customer_id).map(o => o.customer_id!))];
    const customerMap = new Map<string, { id: string; name: string; phone?: string }>();

    if (customerIds.length > 0) {
      const customerPlaceholders = customerIds.map(() => '?').join(',');
      const customers = await powerSyncService.query<{ id: string; name: string; phone?: string }>({
        sql: `SELECT id, name, phone FROM customers WHERE id IN (${customerPlaceholders})`,
        params: customerIds
      });
      for (const customer of customers) {
        customerMap.set(customer.id, customer);
      }
    }

    // تجميع النتائج مع إعادة حساب الإجمالي الصحيح لأنواع البيع المتقدمة
    const ordersWithItems: OrderWithItems[] = orders.map(order => {
      const items = itemsByOrderId.get(order.id) || [];

      // ⚡ إعادة حساب الإجمالي من العناصر لضمان الدقة
      const recalculatedSubtotal = items.reduce((sum, item) => {
        const sellingUnit = item.selling_unit_type || 'piece';
        let itemTotal = (item.unit_price || 0) * (item.quantity || 1);

        // حساب السعر حسب نوع البيع
        if (sellingUnit === 'weight' && item.weight_sold) {
          itemTotal = (item.unit_price || 0) * item.weight_sold;
        } else if (sellingUnit === 'meter' && item.meters_sold) {
          itemTotal = (item.unit_price || 0) * item.meters_sold;
        } else if (sellingUnit === 'box' && item.boxes_sold) {
          itemTotal = (item.unit_price || 0) * item.boxes_sold;
        } else if (item.total_price && item.total_price > 0) {
          // استخدام total_price المحفوظ إذا كان موجوداً
          itemTotal = item.total_price;
        }

        return sum + itemTotal;
      }, 0);

      // استخدام الإجمالي المُعاد حسابه إذا كان مختلفاً عن المحفوظ
      const orderTotal = order.total || 0;
      const shouldUseRecalculated = recalculatedSubtotal > 0 && Math.abs(recalculatedSubtotal - orderTotal) > 1;

      // حساب الإجمالي الصحيح
      const correctedSubtotal = shouldUseRecalculated ? recalculatedSubtotal : (order.subtotal || orderTotal);
      const correctedTotal = shouldUseRecalculated ? (recalculatedSubtotal - (order.discount || 0) + (order.tax || 0)) : orderTotal;

      // تصحيح المبلغ المدفوع إذا كان أكبر من الإجمالي الصحيح (حالة شائعة للبيانات القديمة)
      const originalAmountPaid = order.amount_paid || 0;
      const correctedAmountPaid = Math.min(originalAmountPaid, correctedTotal);

      // 🔍 DEBUG: تسجيل التصحيحات
      if (shouldUseRecalculated) {
        console.log('[UnifiedOrderService] 🔧 تصحيح طلب:', {
          orderId: order.id?.slice(0, 8),
          originalTotal: orderTotal,
          correctedTotal,
          originalAmountPaid,
          correctedAmountPaid,
          itemsCount: items.length
        });
      }

      return {
        ...order,
        // تصحيح الإجمالي إذا كان خاطئاً
        subtotal: correctedSubtotal,
        total: correctedTotal,
        amount_paid: correctedAmountPaid,
        items,
        customer: order.customer_id ? customerMap.get(order.customer_id) : undefined
      };
    });

    const elapsed = Math.round(performance.now() - tStart);
    console.log('[UnifiedOrderService] 📄 getOrders done', {
      total,
      ordersCount: ordersWithItems.length,
      itemsCount: allItems.length,
      customersCount: customerMap.size,
      elapsedMs: elapsed
    });

    return {
      data: ordersWithItems,
      total,
      page,
      limit,
      hasMore: offset + orders.length < total
    };
  }

  /**
   * ⚡ جلب طلب واحد مع التفاصيل
   */
  async getOrder(orderId: string): Promise<OrderWithItems | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const order = await powerSyncService.queryOne<Order>({
      sql: 'SELECT * FROM orders WHERE id = ?',
      params: [orderId]
    });

    if (!order) return null;

    const items = await this.getOrderItems(orderId);

    let customer;
    if (order.customer_id) {
      customer = await powerSyncService.queryOne<{ id: string; name: string; phone?: string }>({
        sql: 'SELECT id, name, phone FROM customers WHERE id = ?',
        params: [order.customer_id]
      });
    }

    return {
      ...order,
      items,
      customer: customer || undefined
    };
  }

  /**
   * ⚡ جلب عناصر طلب
   */
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<OrderItem>({
      sql: 'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
      params: [orderId]
    });
  }

  /**
   * ⚡ بحث سريع في الطلبات
   */
  async searchOrders(query: string, limit: number = 20): Promise<Order[]> {
    if (!query || query.trim().length < 2) return [];

    const orgId = this.getOrgId();
    const searchPattern = `%${query.trim()}%`;

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<Order>({
      sql: `SELECT * FROM orders
       WHERE organization_id = ?
       AND (customer_order_number LIKE ? OR slug LIKE ? OR global_order_number LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      params: [orgId, searchPattern, searchPattern, searchPattern, limit]
    });
  }

  /**
   * ⚡ بحث متقدم في الطلبات مع Filters
   */
  async searchOrdersWithFilters(filters: OrderFilters, limit: number = 20): Promise<Order[]> {
    const orgId = filters.organizationId || this.getOrgId();
    let whereClause = 'organization_id = ?';
    const params: any[] = [orgId];

    if (filters.customerOrderNumber !== undefined) {
      whereClause += ' AND customer_order_number = ?';
      params.push(filters.customerOrderNumber);
    }

    if (filters.is_online !== undefined) {
      whereClause += ' AND is_online = ?';
      params.push(filters.is_online ? 1 : 0);
    }

    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      whereClause += ' AND (customer_order_number LIKE ? OR slug LIKE ? OR global_order_number LIKE ?)';
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<Order>({
      sql: `SELECT * FROM orders
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      params: [...params, limit]
    });
  }

  /**
   * ⚡ طلبات اليوم
   */
  async getTodayOrders(): Promise<OrderWithItems[]> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.getOrders({ from_date: today + 'T00:00:00', to_date: today + 'T23:59:59' }, 1, 1000);
    return result.data;
  }

  // ========================================
  // ✏️ CREATE Operations
  // ========================================

  /**
   * ⚡ إنشاء طلب POS محلي
   */
  async createPOSOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const orderId = uuidv4();
    const orderNumber = this.generateOrderNumber();

    // 🔍 DEBUG: تسجيل البيانات الواردة
    console.log('[UnifiedOrderService] 🔍 createPOSOrder input items:', input.items.map(item => ({
      product_id: item.product_id,
      selling_unit: item.selling_unit,
      weight: item.weight,
      length: item.length,
      box_count: item.box_count,
      quantity: item.quantity
    })));

    // حساب المجموع - مع دعم أنواع البيع المتقدمة (متر، وزن، علبة)
    const subtotal = input.items.reduce((sum, item) => {
      const sellingUnit = item.selling_unit || 'piece';
      let itemTotal = item.unit_price * item.quantity;

      // حساب السعر حسب نوع البيع
      if (sellingUnit === 'weight' && item.weight) {
        itemTotal = item.unit_price * item.weight;
      } else if (sellingUnit === 'meter' && item.length) {
        itemTotal = item.unit_price * item.length;
      } else if (sellingUnit === 'box' && item.box_count) {
        itemTotal = item.unit_price * item.box_count;
      }

      return sum + itemTotal;
    }, 0);
    const tax = input.tax || 0;
    const discount = input.discount || 0;
    const shipping = input.shipping_cost || 0;
    const total = subtotal + tax - discount + shipping;
    const remaining = total - input.amount_paid;

    // تحديد حالة الدفع
    let paymentStatus: PaymentStatus = 'pending';
    if (input.amount_paid >= total) {
      paymentStatus = 'paid';
    } else if (input.amount_paid > 0) {
      paymentStatus = 'partial';
    }

    const order: Order = {
      id: orderId,
      organization_id: orgId,
      customer_id: input.customer_id,
      subtotal,
      tax,
      discount,
      total,
      amount_paid: input.amount_paid,
      remaining_amount: remaining,
      shipping_cost: shipping,
      status: 'completed',
      payment_status: paymentStatus,
      payment_method: input.payment_method,
      is_online: false,
      pos_order_type: input.pos_order_type || 'retail',
      created_by_staff_id: input.staff_id,
      created_by_staff_name: input.staff_name,
      customer_order_number: orderNumber,
      notes: input.notes,
      completed_at: now,
      created_at: now,
      updated_at: now
    };

    const orderItems: OrderItem[] = input.items.map((item) => {
      // ⚡ حساب السعر الإجمالي حسب نوع البيع
      const sellingUnit = item.selling_unit || 'piece';
      let totalPrice = item.unit_price * item.quantity;

      if (sellingUnit === 'weight' && item.weight) {
        totalPrice = item.unit_price * item.weight;
      } else if (sellingUnit === 'meter' && item.length) {
        totalPrice = item.unit_price * item.length;
      } else if (sellingUnit === 'box' && item.box_count) {
        totalPrice = item.unit_price * item.box_count;
      }

      return {
        id: uuidv4(),
        organization_id: orgId,
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: totalPrice,
        original_price: item.unit_price,
        sale_type: item.sale_type || 'retail',
        color_id: item.color_id,
        size_id: item.size_id,
        color_name: item.color_name,
        size_name: item.size_name,
        // ⚡ حقول البيع المتقدم
        selling_unit_type: sellingUnit,
        weight_sold: sellingUnit === 'weight' ? item.weight : null,
        weight_unit: item.weight_unit || null,
        meters_sold: sellingUnit === 'meter' ? item.length : null,
        boxes_sold: sellingUnit === 'box' ? item.box_count : null,
        units_per_box: item.units_per_box || null,
        created_at: now
      };
    });

    // ✅ v3.0: استخدام transaction() الجديد
    await powerSyncService.transaction(async (tx) => {
      // إنشاء الطلب
      const orderData: Record<string, any> = {};
      for (const [key, value] of Object.entries(order)) {
        if (value !== undefined) {
          orderData[key] = value;
        }
      }

      const orderColumns = Object.keys(orderData);
      const orderPlaceholders = orderColumns.map(() => '?').join(', ');
      const orderValues = orderColumns.map(col => orderData[col]);

      await tx.execute(
        `INSERT INTO orders (${orderColumns.join(', ')}) VALUES (${orderPlaceholders})`,
        orderValues
      );

      // إنشاء عناصر الطلب
      for (const item of orderItems) {
        const itemData: Record<string, any> = {};
        for (const [key, value] of Object.entries(item)) {
          if (value !== undefined) {
            itemData[key] = value;
          }
        }

        const itemColumns = Object.keys(itemData);
        const itemPlaceholders = itemColumns.map(() => '?').join(', ');
        const itemValues = itemColumns.map(col => itemData[col]);

        await tx.execute(
          `INSERT INTO order_items (${itemColumns.join(', ')}) VALUES (${itemPlaceholders})`,
          itemValues
        );
      }
    });

    // ⚡ تحديث المخزون محلياً (مع دعم البيع المتقدم)
    for (const item of input.items) {
      const sellingUnit = item.selling_unit || 'piece';

      switch (sellingUnit) {
        case 'weight':
          // البيع بالوزن: خصم من available_weight
          await unifiedProductService.updateAdvancedStock(item.product_id, {
            type: 'weight',
            weightDelta: -(item.weight || 0)
          });
          console.log(`[UnifiedOrder] ⚖️ خصم ${item.weight} كغ من المنتج ${item.product_name}`);
          break;

        case 'meter':
          // البيع بالمتر: خصم من available_length
          await unifiedProductService.updateAdvancedStock(item.product_id, {
            type: 'meter',
            lengthDelta: -(item.length || 0)
          });
          console.log(`[UnifiedOrder] 📏 خصم ${item.length} م من المنتج ${item.product_name}`);
          break;

        case 'box':
          // البيع بالصندوق: خصم من available_boxes + stock_quantity
          const unitsPerBox = item.units_per_box || 1;
          const totalUnits = (item.box_count || 0) * unitsPerBox;
          await unifiedProductService.updateAdvancedStock(item.product_id, {
            type: 'box',
            boxDelta: -(item.box_count || 0),
            delta: -totalUnits
          });
          console.log(`[UnifiedOrder] 📦 خصم ${item.box_count} صندوق (${totalUnits} قطعة) من المنتج ${item.product_name}`);
          break;

        case 'piece':
        default:
          // البيع بالقطعة: خصم من stock_quantity
          await unifiedProductService.updateAdvancedStock(item.product_id, {
            type: 'piece',
            delta: -item.quantity,
            colorId: item.color_id,
            sizeId: item.size_id
          });
          break;
      }
    }

    console.log(`[UnifiedOrder] ✅ Created POS order: ${orderId} (${orderNumber})`);

    return {
      ...order,
      items: orderItems
    };
  }

  // ========================================
  // 📝 UPDATE Operations
  // ========================================

  /**
   * ⚡ تحديث حالة الطلب
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<Order>({
      sql: 'SELECT * FROM orders WHERE id = ?',
      params: [orderId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: Partial<Order> = { status, updated_at: now };

    if (status === 'completed') {
      updates.completed_at = now;
    }

    // ✅ v3.0: استخدام execute() الجديد
    await powerSyncService.execute(
      `UPDATE orders SET status = ?, updated_at = ?${status === 'completed' ? ', completed_at = ?' : ''} WHERE id = ?`,
      status === 'completed' ? [status, now, now, orderId] : [status, now, orderId]
    );

    console.log(`[UnifiedOrder] ✅ Updated order status: ${orderId} -> ${status}`);

    return { ...existing, ...updates };
  }

  /**
   * ⚡ تحديث الدفع
   */
  async updatePayment(
    orderId: string,
    amountPaid: number,
    paymentMethod?: PaymentMethod
  ): Promise<Order | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<Order>({
      sql: 'SELECT * FROM orders WHERE id = ?',
      params: [orderId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const totalPaid = existing.amount_paid + amountPaid;
    const remaining = existing.total - totalPaid;

    let paymentStatus: PaymentStatus = 'pending';
    if (totalPaid >= existing.total) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    // ✅ v3.0: استخدام execute() الجديد
    await powerSyncService.execute(
      `UPDATE orders SET
        amount_paid = ?,
        remaining_amount = ?,
        payment_status = ?,
        payment_method = COALESCE(?, payment_method),
        updated_at = ?
      WHERE id = ?`,
      [totalPaid, remaining, paymentStatus, paymentMethod, now, orderId]
    );

    console.log(`[UnifiedOrder] ✅ Updated payment: ${orderId} - paid ${amountPaid}`);

    return {
      ...existing,
      amount_paid: totalPaid,
      remaining_amount: remaining,
      payment_status: paymentStatus,
      payment_method: paymentMethod || existing.payment_method,
      updated_at: now
    };
  }

  /**
   * ⚡ إلغاء طلب (مع دعم استعادة المخزون المتقدم)
   */
  async cancelOrder(orderId: string, restoreStock: boolean = true): Promise<Order | null> {
    const order = await this.getOrder(orderId);
    if (!order) return null;

    // ⚡ إعادة المخزون إذا طُلب (مع دعم البيع المتقدم)
    if (restoreStock) {
      for (const item of order.items) {
        const sellingUnit = (item as any).selling_unit_type || 'piece';

        switch (sellingUnit) {
          case 'weight':
            // استعادة الوزن
            await unifiedProductService.updateAdvancedStock(item.product_id, {
              type: 'weight',
              weightDelta: (item as any).weight_sold || 0
            });
            console.log(`[UnifiedOrder] ⚖️ استعادة ${(item as any).weight_sold} كغ للمنتج ${item.product_name}`);
            break;

          case 'meter':
            // استعادة الطول
            await unifiedProductService.updateAdvancedStock(item.product_id, {
              type: 'meter',
              lengthDelta: (item as any).meters_sold || 0
            });
            console.log(`[UnifiedOrder] 📏 استعادة ${(item as any).meters_sold} م للمنتج ${item.product_name}`);
            break;

          case 'box':
            // استعادة الصناديق والقطع
            const unitsPerBox = (item as any).units_per_box || 1;
            const totalUnits = ((item as any).boxes_sold || 0) * unitsPerBox;
            await unifiedProductService.updateAdvancedStock(item.product_id, {
              type: 'box',
              boxDelta: (item as any).boxes_sold || 0,
              delta: totalUnits
            });
            console.log(`[UnifiedOrder] 📦 استعادة ${(item as any).boxes_sold} صندوق للمنتج ${item.product_name}`);
            break;

          case 'piece':
          default:
            // استعادة القطع
            await unifiedProductService.updateAdvancedStock(item.product_id, {
              type: 'piece',
              delta: item.quantity,
              colorId: item.color_id,
              sizeId: item.size_id
            });
            break;
        }
      }
    }

    return this.updateOrderStatus(orderId, 'cancelled');
  }

  // ========================================
  // 🗑️ DELETE Operations
  // ========================================

  /**
   * ⚡ حذف طلب (مع دعم استعادة المخزون المتقدم)
   */
  async deleteOrder(orderId: string, restoreStock: boolean = true): Promise<boolean> {
    try {
      const order = await this.getOrder(orderId);

      // ⚡ استعادة المخزون مع دعم البيع المتقدم
      if (order && restoreStock) {
        for (const item of order.items) {
          const sellingUnit = (item as any).selling_unit_type || 'piece';

          switch (sellingUnit) {
            case 'weight':
              await unifiedProductService.updateAdvancedStock(item.product_id, {
                type: 'weight',
                weightDelta: (item as any).weight_sold || 0
              });
              break;

            case 'meter':
              await unifiedProductService.updateAdvancedStock(item.product_id, {
                type: 'meter',
                lengthDelta: (item as any).meters_sold || 0
              });
              break;

            case 'box':
              const unitsPerBox = (item as any).units_per_box || 1;
              const totalUnits = ((item as any).boxes_sold || 0) * unitsPerBox;
              await unifiedProductService.updateAdvancedStock(item.product_id, {
                type: 'box',
                boxDelta: (item as any).boxes_sold || 0,
                delta: totalUnits
              });
              break;

            case 'piece':
            default:
              await unifiedProductService.updateAdvancedStock(item.product_id, {
                type: 'piece',
                delta: item.quantity,
                colorId: item.color_id,
                sizeId: item.size_id
              });
              break;
          }
        }
      }

      // ✅ v3.0: استخدام transaction() الجديد
      await powerSyncService.transaction(async (tx) => {
        await tx.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        await tx.execute('DELETE FROM orders WHERE id = ?', [orderId]);
      });

      console.log(`[UnifiedOrder] ✅ Deleted order: ${orderId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedOrder] ❌ Failed to delete order:`, error);
      return false;
    }
  }

  // ========================================
  // 📊 Statistics
  // ========================================

  /**
   * ⚡ إحصائيات الطلبات
   */
  async getOrderStats(filters?: { from_date?: string; to_date?: string }): Promise<OrderStats> {
    const orgId = this.getOrgId();

    let whereClause = 'organization_id = ?';
    const params: any[] = [orgId];

    if (filters?.from_date) {
      whereClause += ' AND created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      whereClause += ' AND created_at <= ?';
      params.push(filters.to_date);
    }

    // ✅ v3.0: استخدام queryOne() الجديد
    const general = await powerSyncService.queryOne<{
      total_orders: number;
      total_revenue: number;
      total_paid: number;
      total_pending: number;
    }>({
      sql: `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_pending
      FROM orders
      WHERE ${whereClause}`,
      params
    });

    // ✅ v3.0: استخدام query() الجديد
    const statusStats = await powerSyncService.query<{ status: OrderStatus; count: number }>({
      sql: `SELECT status, COUNT(*) as count FROM orders WHERE ${whereClause} GROUP BY status`,
      params
    });

    const ordersByStatus: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0
    };

    for (const stat of statusStats) {
      ordersByStatus[stat.status] = stat.count;
    }

    const paymentStats = await powerSyncService.query<{ payment_method: PaymentMethod; count: number }>({
      sql: `SELECT payment_method, COUNT(*) as count FROM orders WHERE ${whereClause} AND payment_method IS NOT NULL GROUP BY payment_method`,
      params
    });

    const ordersByPaymentMethod: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      mixed: 0,
      credit: 0
    };

    for (const stat of paymentStats) {
      if (stat.payment_method) {
        ordersByPaymentMethod[stat.payment_method] = stat.count;
      }
    }

    return {
      total_orders: general?.total_orders || 0,
      total_revenue: general?.total_revenue || 0,
      total_paid: general?.total_paid || 0,
      total_pending: general?.total_pending || 0,
      orders_by_status: ordersByStatus,
      orders_by_payment_method: ordersByPaymentMethod
    };
  }

  /**
   * ⚡ إحصائيات اليوم
   */
  async getTodayStats(): Promise<OrderStats> {
    const today = new Date().toISOString().slice(0, 10);
    return this.getOrderStats({
      from_date: today + 'T00:00:00',
      to_date: today + 'T23:59:59'
    });
  }

  /**
   * ⚡ إحصائيات الشهر الحالي
   */
  async getCurrentMonthStats(): Promise<OrderStats> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    return this.getOrderStats({
      from_date: firstDay + 'T00:00:00',
      to_date: lastDay + 'T23:59:59'
    });
  }

  /**
   * ⚡ المبيعات اليومية للأسبوع الماضي
   */
  async getWeeklySales(): Promise<Array<{ date: string; total: number; count: number }>> {
    const orgId = this.getOrgId();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<{ date: string; total: number; count: number }>({
      sql: `SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as count
      FROM orders
      WHERE organization_id = ?
      AND created_at >= ?
      AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      params: [orgId, sevenDaysAgo + 'T00:00:00']
    });
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const unifiedOrderService = new UnifiedOrderServiceClass();
export default unifiedOrderService;
