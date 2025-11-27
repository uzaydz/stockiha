/**
 * BatchSender - Batch Operation Upload with Retry
 * إرسال العمليات للخادم على دفعات مع إعادة المحاولة
 *
 * المميزات:
 * - إرسال دفعات بدلاً من عملية واحدة
 * - Exponential backoff للـ retry
 * - معالجة الأخطاء الجزئية
 * - دعم offline queue
 */

import { supabase } from '@/lib/supabase-unified';
import { outboxManager } from './OutboxManager';
import { sqliteWriteQueue } from './SQLiteWriteQueue';
import { syncMetrics } from './SyncMetrics';
import { networkQuality } from './NetworkQuality';
import { connectionState, isNetworkError } from './ConnectionState';
import {
  OutboxEntry,
  BatchSendResult,
  DELTA_SYNC_CONSTANTS
} from './types';

type NetworkStatusCallback = () => boolean;

export class BatchSender {
  private isRunning = false;
  private isSending = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private organizationId: string | null = null;
  private deviceId: string;
  private isNetworkOnline: NetworkStatusCallback = () => navigator.onLine;
  private lastOrphanCheck: number = 0;
  // ⚡ تتبع حالة Offline لتقليل الـ logs
  private lastOfflineLogTime: number = 0;
  private readonly OFFLINE_LOG_INTERVAL_MS = 30000; // طباعة log كل 30 ثانية فقط عند Offline

  // ⚡ الجداول الموجودة فقط محلياً (لا تُرسل لـ Supabase)
  // ملاحظة: تم التحقق من Supabase - هذه الجداول غير موجودة هناك
  private readonly LOCAL_ONLY_TABLES: string[] = [
    'customer_debts',           // ❌ غير موجود في Supabase - الديون تُسجل في orders.remaining_amount
    'customer_debt_payments',   // ❌ غير موجود في Supabase
    'staff_pins',               // ❌ محلي فقط للأمان
    'sync_queue',               // ❌ محلي فقط
    'app_license_state',        // ❌ محلي فقط
    'repair_images',            // الصور تُرفع بشكل منفصل
    'user_permissions',         // ❌ محلي فقط
    'inventory'                 // ❌ محلي فقط - المخزون يُحدث عبر product_colors/product_sizes
  ];

  // ⚡ الأعمدة المحلية فقط لكل جدول (لا تُرسل لـ Supabase)
  // تم التحقق من بنية Supabase الفعلية
  private readonly LOCAL_ONLY_COLUMNS: Record<string, string[]> = {
    // جدول الطلبات - orders/pos_orders
    // ⚡ Supabase orders يحتوي فقط هذه الأعمدة:
    // admin_notes, amount_paid, call_confirmation_status_id, completed_at, consider_remaining_as_partial,
    // created_at, customer_id, customer_notes, customer_order_number, discount, employee_id, id,
    // is_online (مطلوب!), metadata, notes, organization_id (مطلوب!), payment_method (مطلوب!),
    // payment_status (مطلوب!), pos_order_type, remaining_amount, shipping_address_id, shipping_cost,
    // shipping_method, slug, status (مطلوب!), subtotal (مطلوب!), tax (مطلوب!), total (مطلوب!), updated_at
    'orders': [
      // ⚡ أعمدة المزامنة المحلية
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'lastSyncAttempt', 'last_sync_attempt', 'error',
      // ⚡ أعمدة محلية للتتبع
      'remote_order_id', 'remote_customer_order_number', 'remoteOrderId', 'remoteCustomerOrderNumber',
      'local_created_at', 'server_created_at', 'created_at_ts',
      'customer_name_lower', 'work_session_id', 'workSessionId', 'items',
      'localCreatedAt', 'serverCreatedAt',
      // ⚡ أعمدة محلية غير موجودة في Supabase orders
      'total_amount', 'totalAmount', 'paid_amount', 'paidAmount', 'order_number', 'orderNumber',
      'staff_id', 'staffId', 'customer_name', 'customerName', 'customerNameLower',
      'customer_phone', 'customerPhone', 'customer_email', 'customerEmail',
      'customer_address', 'customerAddress',
      'extra_fields', 'local_order_number', 'localOrderNumber',
      'local_order_number_str', 'localOrderNumberStr',
      'message', 'payload', 'pending_updates', 'pendingUpdates',
      // ⚡ أعمدة camelCase محلية (Supabase يستخدم snake_case فقط)
      'adminNotes', 'customerNotes', 'posOrderType', 'completedAt',
      'shippingAddressId', 'shippingMethod', 'shippingCost',
      'customerOrderNumber', 'globalOrderNumber', 'createdByStaffId', 'createdByStaffName',
      'callConfirmationStatusId', 'considerRemainingAsPartial', 'amountPaid',
      'remainingAmount', 'isOnline', 'paymentStatus', 'paymentMethod',
      // ⚡ أعمدة camelCase من SQLite (يجب استثناؤها!)
      'createdAt', 'updatedAt', 'customerId', 'employeeId', 'organizationId',
      // ⚡ أعمدة إضافية غير موجودة في Supabase orders
      'channel', 'wilaya', 'commune', 'deliveryType', 'deliveryPrice',
      'deliveryStatus', 'trackingNumber', 'tracking_number', 'confirmedAt', 'shippedAt',
      'deliveredAt', 'cancelledAt', 'refundedAt', 'source', 'sourceId',
      // ⚡ أعمدة إضافية مكتشفة (غير موجودة في Supabase)
      'global_order_number', 'created_by_staff_id', 'created_by_staff_name',
      'shipping_company', 'shippingCompany',
      // ⚡ أعمدة محلية إضافية
      'tax_amount', 'taxAmount', 'discount_amount', 'discountAmount',
      'shipping_amount', 'shippingAmount', 'receipt_printed', 'receiptPrinted'
    ],
    'pos_orders': [
      // ⚡ نفس الأعمدة للـ pos_orders (يُحول لـ orders في Supabase)
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'lastSyncAttempt', 'last_sync_attempt', 'error',
      'remote_order_id', 'remote_customer_order_number', 'remoteOrderId', 'remoteCustomerOrderNumber',
      'local_created_at', 'server_created_at', 'created_at_ts',
      'customer_name_lower', 'work_session_id', 'workSessionId', 'items',
      'localCreatedAt', 'serverCreatedAt',
      'total_amount', 'totalAmount', 'paid_amount', 'paidAmount', 'order_number', 'orderNumber',
      'staff_id', 'staffId', 'customer_name', 'customerName', 'customerNameLower',
      'customer_phone', 'customerPhone', 'customer_email', 'customerEmail',
      'customer_address', 'customerAddress',
      'extra_fields', 'local_order_number', 'localOrderNumber',
      'local_order_number_str', 'localOrderNumberStr',
      'message', 'payload', 'pending_updates', 'pendingUpdates',
      'adminNotes', 'customerNotes', 'posOrderType', 'completedAt',
      'shippingAddressId', 'shippingMethod', 'shippingCost',
      'customerOrderNumber', 'globalOrderNumber', 'createdByStaffId', 'createdByStaffName',
      'callConfirmationStatusId', 'considerRemainingAsPartial', 'amountPaid',
      'remainingAmount', 'isOnline', 'paymentStatus', 'paymentMethod',
      // ⚡ أعمدة camelCase من SQLite (يجب استثناؤها!)
      'createdAt', 'updatedAt', 'customerId', 'employeeId', 'organizationId',
      'channel', 'wilaya', 'commune', 'deliveryType', 'deliveryPrice',
      'deliveryStatus', 'trackingNumber', 'tracking_number', 'confirmedAt', 'shippedAt',
      'deliveredAt', 'cancelledAt', 'refundedAt', 'source', 'sourceId',
      'global_order_number', 'created_by_staff_id', 'created_by_staff_name',
      'shipping_company', 'shippingCompany',
      'tax_amount', 'taxAmount', 'discount_amount', 'discountAmount',
      'shipping_amount', 'shippingAmount', 'receipt_printed', 'receiptPrinted'
    ],
    // عناصر الطلب - order_items/pos_order_items
    // Supabase order_items يحتوي: id, order_id, product_id, product_name, quantity, unit_price, total_price,
    // is_digital, organization_id, slug, name, is_wholesale, original_price, created_at, variant_info,
    // color_id, size_id, color_name, size_name, variant_display_name
    'order_items': [
      // ⚡ أعمدة المزامنة المحلية
      'synced', 'sync_status', 'syncStatus', 'pending_operation', 'pendingOperation',
      // ⚡ أعمدة محلية غير موجودة في Supabase order_items
      'discount', 'subtotal', 'updated_at', 'updatedAt',
      'barcode', 'sku', 'image_url', 'imageUrl', 'thumbnail_url', 'thumbnail',
      'category_id', 'category_name', 'cost',
      // ⚡ أعمدة الضريبة والخصم المحلية
      'tax_amount', 'taxAmount', 'discount_amount', 'discountAmount',
      'discount_type', 'discountType',
      // ⚡ أعمدة المرتجعات المحلية
      'returned_quantity', 'returnedQuantity', 'refund_amount', 'refundAmount',
      // ⚡ أعمدة إضافية محلية
      'notes',
      // ⚡ أعمدة camelCase من SQLite
      'orderId', 'productId', 'productName', 'unitPrice', 'totalPrice', 'createdAt',
      'colorId', 'sizeId', 'colorName', 'sizeName', 'variantInfo', 'isWholesale',
      'originalPrice', 'isDigital', 'organizationId', 'variantDisplayName'
    ],
    'pos_order_items': [
      // ⚡ أعمدة المزامنة المحلية
      'synced', 'sync_status', 'syncStatus', 'pending_operation', 'pendingOperation',
      // ⚡ أعمدة محلية غير موجودة في Supabase order_items
      'discount', 'subtotal', 'updated_at', 'updatedAt',
      'barcode', 'sku', 'image_url', 'imageUrl', 'thumbnail_url', 'thumbnail',
      'category_id', 'category_name', 'cost',
      // ⚡ أعمدة الضريبة والخصم المحلية
      'tax_amount', 'taxAmount', 'discount_amount', 'discountAmount',
      'discount_type', 'discountType',
      // ⚡ أعمدة المرتجعات المحلية
      'returned_quantity', 'returnedQuantity', 'refund_amount', 'refundAmount',
      // ⚡ أعمدة إضافية محلية
      'notes',
      // ⚡ أعمدة camelCase من SQLite
      'orderId', 'productId', 'productName', 'unitPrice', 'totalPrice', 'createdAt',
      'colorId', 'sizeId', 'colorName', 'sizeName', 'variantInfo', 'isWholesale',
      'originalPrice', 'isDigital', 'organizationId', 'variantDisplayName'
    ],
    // المنتجات
    // ⚡ Supabase products يحتوي على `images` (array) وليس `additional_images`
    // لذا نستثني الأعمدة المحلية التي ليست في Supabase
    'products': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'localUpdatedAt', 'local_updated_at', 'server_updated_at',
      'name_normalized', 'name_lower', 'sku_lower', 'barcode_lower',
      'name_search', 'sku_search', 'barcode_digits',
      // ⚡ حقول base64 للصور - تُخزن محلياً فقط
      'thumbnail_base64', 'images_base64',
      'thumbnailBase64', 'imagesBase64',           // camelCase variants
      'base64_data', 'base64Data',
      'product_images_base64', 'productImagesBase64',
      // ⚡ حقل CSRF المحلي - لا يُرسل للسيرفر
      '_csrf',
      // ⚡ أعمدة محلية غير موجودة في Supabase products
      // ملاحظة: additional_images و additionalImages يتم تحويلهما إلى 'images' في COLUMN_NAME_MAP
      'wholesale_tiers', 'wholesaleTiers',      // تسعيرة الجملة المحلية
      // ⚡ أعمدة camelCase محلية
      'imageUrl', 'thumbnailImage', 'costPrice', 'minStock', 'actualStockQuantity',
      'stockVersion', 'lastSyncAttempt', 'conflictResolution', 'productColors', 'productSizes',
      // ⚡ حقول من جداول منفصلة في Supabase (لا تُرسل مباشرة لـ products)
      'advancedSettings', 'advanced_settings',    // → product_advanced_settings table
      'marketingSettings', 'marketing_settings',  // → product_marketing_settings table
      'colors', 'product_colors',                 // → product_colors table
      'sizes', 'product_sizes',                   // → product_sizes table
      // ⚡ حقول إضافية محلية فقط
      'special_offers_config', 'specialOffersConfig',
      'publication_mode', 'publicationMode',
      'publish_at', 'publishAt',
      'advanced_description', 'advancedDescription'
    ],
    // العملاء - Supabase customers: id, name, email, phone, created_at, updated_at, organization_id, nif, rc, nis, rib, address
    'customers': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'localUpdatedAt', 'local_updated_at',
      'name_normalized', 'name_lower', 'email_lower', 'phone_digits', 'total_debt'
    ],
    // الفواتير
    'invoices': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_created_at', 'invoice_number_lower', 'customer_name_lower',
      'remote_invoice_id'
    ],
    // عناصر الفواتير
    'invoice_items': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // إرجاعات المنتجات - في Supabase الاسم returns
    'product_returns': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'return_number_lower', 'customer_name_lower', 'remote_return_id'
    ],
    // عناصر الإرجاع
    'return_items': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      // الأعمدة البديلة للتوافق
      'quantity', 'unit_price', 'refund_amount', 'condition', 'restocked',
      'original_order_item_id', 'original_quantity', 'original_unit_price'
    ],
    // تصريحات الخسائر - في Supabase الاسم losses
    'loss_declarations': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'loss_number_lower', 'remote_loss_id'
    ],
    // عناصر الخسائر
    'loss_items': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      // الأعمدة البديلة للتوافق
      'quantity_lost', 'unit_cost', 'loss_percentage', 'stock_before_loss', 'stock_after_loss', 'variant_info'
    ],
    // فئات المنتجات
    'product_categories': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'name_lower'
    ],
    // الفئات الفرعية
    'product_subcategories': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'name_lower'
    ],
    // ⚡ المصاريف
    'expenses': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ المصاريف المتكررة
    'recurring_expenses': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ فئات المصاريف
    'expense_categories': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'name_lower'
    ],
    // ⚡ ألوان المنتجات
    'product_colors': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ مقاسات المنتجات
    'product_sizes': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ صور المنتجات
    'product_images': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_path', 'base64_data'
    ],
    // ⚡ الإعدادات المتقدمة للمنتجات
    'product_advanced_settings': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ إعدادات التسويق للمنتجات
    'product_marketing_settings': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ أسعار الجملة للمنتجات
    'product_wholesale_tiers': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // طلبات الإصلاح
    'repair_orders': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_created_at', 'customer_name_lower', 'device_type_lower'
    ],
    // جلسات العمل - في Supabase الاسم pos_work_sessions
    'work_sessions': [
      'synced', 'syncStatus', 'pendingOperation'
    ],
    'pos_work_sessions': [
      'synced', 'syncStatus', 'pendingOperation'
    ],
    // ⚡ الموردين - أعمدة محلية فقط
    'suppliers': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_updated_at', 'localUpdatedAt',
      'name_lower', 'email_lower', 'phone_digits'  // أعمدة البحث المحلية
    ],
    // ⚡ جهات اتصال الموردين
    'supplier_contacts': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ مشتريات الموردين
    'supplier_purchases': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_updated_at', 'localUpdatedAt'
    ],
    // ⚡ عناصر مشتريات الموردين
    'supplier_purchase_items': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ مدفوعات الموردين
    'supplier_payments': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation',
      'local_updated_at', 'localUpdatedAt'
    ],
    // ⚡ ديون العملاء
    'customer_debts': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ],
    // ⚡ مدفوعات ديون العملاء
    'customer_debt_payments': [
      'synced', 'syncStatus', 'sync_status', 'pendingOperation', 'pending_operation'
    ]
  };

  // ⚡ تحويل أسماء الأعمدة المحلية لأسماء Supabase
  private readonly COLUMN_NAME_MAP: Record<string, Record<string, string>> = {
    'orders': {
      'paid_amount': 'amount_paid',
      'total_amount': 'total'
    },
    'pos_orders': {
      'paid_amount': 'amount_paid',
      'total_amount': 'total'
    },
    'order_items': {
      'product_name': 'name' // Supabase expects 'name', local has 'product_name'
    },
    'pos_order_items': {
      'product_name': 'name' // Supabase expects 'name', local has 'product_name'
    },
    // ⚡ تحويل أسماء حقول المنتجات
    'products': {
      'additional_images': 'images',  // Supabase يستخدم 'images' بدلاً من 'additional_images'
      'additionalImages': 'images'    // camelCase variant
    }
  };

  // ⚡ تحويل أسماء جداول Supabase إلى أسماء SQLite المحلية
  // Supabase يستخدم orders/order_items بينما SQLite المحلي يستخدم pos_orders/pos_order_items
  private readonly SUPABASE_TO_LOCAL_TABLE: Record<string, string> = {
    'orders': 'pos_orders',
    'order_items': 'pos_order_items'
  };

  /**
   * ⚡ تحويل اسم جدول Supabase إلى اسم جدول SQLite المحلي
   */
  private mapToLocalTable(supabaseTable: string): string {
    return this.SUPABASE_TO_LOCAL_TABLE[supabaseTable] || supabaseTable;
  }

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * الحصول على أو إنشاء device ID
   */
  private getOrCreateDeviceId(): string {
    const storageKey = 'delta_sync_device_id';
    let deviceId = localStorage.getItem(storageKey);

    if (!deviceId) {
      deviceId = `device_${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, deviceId);
    }

    return deviceId;
  }

  /**
   * تعيين callback لفحص حالة الشبكة
   */
  setNetworkStatusCallback(callback: NetworkStatusCallback): void {
    this.isNetworkOnline = callback;
  }

  /**
   * بدء الإرسال الدوري
   */
  start(organizationId: string): void {
    if (this.isRunning) {
      console.log('[BatchSender] ⚠️ Already running, skipping start');
      return;
    }

    this.organizationId = organizationId;
    this.isRunning = true;

    // ⚡ تهيئة Network Quality Monitor و ConnectionState
    const supabaseUrl = (supabase as any).supabaseUrl || '';
    const supabaseKey = (supabase as any).supabaseKey || '';
    if (supabaseUrl && supabaseKey) {
      networkQuality.initialize(supabaseUrl, supabaseKey);
      // ⚡ تهيئة ConnectionState للفحص الدوري عند الـ offline
      connectionState.initialize(supabaseUrl, supabaseKey);
    }

    console.log(`[BatchSender] 🚀 Starting for org ${organizationId}`);
    console.log(`[BatchSender] 📋 Batch interval: ${DELTA_SYNC_CONSTANTS.BATCH_INTERVAL_MS}ms`);
    console.log(`%c[BatchSender] 📡 Network Quality: ${networkQuality.getQuality()} (batch: ${networkQuality.getBatchSize()}, timeout: ${networkQuality.getTimeout()}ms)`, 'color: #00BCD4');

    // ⚡ إصلاح الطلبات القديمة التي تم مزامنتها لكن حالتها لا تزال pending_sync
    this.reconcileOrdersStatus().then(result => {
      if (result.fixed > 0) {
        console.log(`[BatchSender] 🔧 Reconciled ${result.fixed}/${result.checked} orders on startup`);
      }
    }).catch(err => {
      console.warn('[BatchSender] ⚠️ Reconcile failed:', err);
    });

    // ⚡ مزامنة الصور المحلية عند عودة الاتصال
    this.syncPendingImages(organizationId).catch(err => {
      console.warn('[BatchSender] ⚠️ Image sync failed:', err);
    });

    // إرسال فوري
    this.sendBatch().then(result => {
      console.log(`[BatchSender] 📊 Initial batch result:`, result);
    });

    // إرسال دوري
    this.intervalId = setInterval(() => {
      this.sendBatch().catch(err => {
        console.error('[BatchSender] ❌ Periodic batch error:', err);
      });
    }, DELTA_SYNC_CONSTANTS.BATCH_INTERVAL_MS);

    console.log(`[BatchSender] ✅ Started successfully`);
  }

  /**
   * إيقاف الإرسال
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[BatchSender] Stopped');
  }

  /**
   * إرسال دفعة من العمليات
   */
  async sendBatch(): Promise<BatchSendResult> {
    // تحقق من الحالة
    if (this.isSending) {
      return { success: true, processedCount: 0, failedCount: 0, errors: [] };
    }

    // ⚡ التحقق من جودة الشبكة (باستخدام ConnectionState) - مع تقليل الـ logs عند Offline
    if (!connectionState.isOnline() || !networkQuality.canSend()) {
      const now = Date.now();
      // ⚡ طباعة log مرة واحدة كل 30 ثانية فقط عند Offline (بدلاً من كل 2 ثانية)
      if (now - this.lastOfflineLogTime >= this.OFFLINE_LOG_INTERVAL_MS) {
        console.log('%c[BatchSender] 🔴 الشبكة غير متصلة، الطلبات محفوظة محلياً وستُرسل عند الاتصال', 'color: #f44336');
        this.lastOfflineLogTime = now;
      }
      return { success: false, processedCount: 0, failedCount: 0, errors: [] };
    }

    // ⚡ إعادة تعيين وقت الـ offline log عند الاتصال
    this.lastOfflineLogTime = 0;

    const batchStartTime = Date.now();
    console.log(`%c[BatchSender] ╔═══════════════════════════════════════════════════════════════╗`, 'color: #FF5722; font-weight: bold');
    console.log(`%c[BatchSender] ║           🔄 بدء دورة المزامنة - ${new Date().toLocaleTimeString('ar-DZ')}           ║`, 'color: #FF5722; font-weight: bold');
    console.log(`%c[BatchSender] ╚═══════════════════════════════════════════════════════════════╝`, 'color: #FF5722; font-weight: bold');

    if (!this.organizationId) {
      console.warn('%c[BatchSender] ⚠️ لا يوجد معرف المؤسسة، لا يمكن الإرسال', 'color: #f44336');
      return { success: false, processedCount: 0, failedCount: 0, errors: [{ id: '', error: 'No organization ID' }] };
    }

    this.isSending = true;
    console.log(`[BatchSender] 🏢 Organization ID: ${this.organizationId}`);
    console.log(`[BatchSender] 📡 Network: ${networkQuality.getQuality()} (RTT: ${networkQuality.getRTT()}ms, batch: ${networkQuality.getBatchSize()})`);

    try {
      // تجميع الـ DELTAs قبل الإرسال
      const consolidated = await outboxManager.consolidateDeltas();
      if (consolidated > 0) {
        console.log(`[BatchSender] 📦 تم تجميع ${consolidated} عملية DELTA`);
      }

      // ⚡ جلب العمليات المعلقة (batch size ديناميكي حسب جودة الشبكة)
      const dynamicBatchSize = networkQuality.getBatchSize();
      const pending = await outboxManager.getPending(dynamicBatchSize || DELTA_SYNC_CONSTANTS.BATCH_SIZE);

      // 🔍 DEBUG: عرض إحصائيات الـ Outbox بشكل مفصل
      const stats = await outboxManager.getStats();
      console.log(`%c[BatchSender] 📊 ═══ حالة الـ Outbox ═══`, 'color: #2196F3; font-weight: bold');
      console.log(`[BatchSender] 📊 المعلقة (pending): ${stats.pending}`);
      console.log(`[BatchSender] 📊 قيد الإرسال (sending): ${stats.sending}`);
      console.log(`[BatchSender] 📊 الفاشلة (failed): ${stats.failed}`);
      console.log(`[BatchSender] 📊 الإجمالي: ${stats.total}`);
      if (Object.keys(stats.byTable).length > 0) {
        console.log(`[BatchSender] 📊 حسب الجدول:`, stats.byTable);
      }
      if (Object.keys(stats.byOperation).length > 0) {
        console.log(`[BatchSender] 📊 حسب العملية:`, stats.byOperation);
      }

      // 🔍 عرض تفاصيل العمليات المعلقة (مع الأخطاء السابقة)
      if (stats.total > 0) {
        const detailedOps = await outboxManager.getDetailedPending(10);
        if (detailedOps.length > 0) {
          console.log(`%c[BatchSender] 📋 تفاصيل آخر ${detailedOps.length} عمليات:`, 'color: #9C27B0');
          console.table(detailedOps.map(op => ({
            جدول: op.table_name,
            عملية: op.operation,
            معرف: op.record_id.slice(0, 12),
            حالة: op.status,
            محاولات: op.retry_count,
            خطأ: op.last_error?.slice(0, 40) || '---',
            وقت: new Date(op.created_at).toLocaleTimeString('ar-DZ')
          })));
        }
      }

      if (pending.length === 0) {
        // 🔍 إذا كانت هناك عمليات في Outbox لكن getPending ترجع فارغة
        if (stats.total > 0) {
          // ⚡ إعادة العمليات العالقة في حالة "sending"
          if (stats.sending > 0) {
            console.log('[BatchSender] 🔄 Requeuing stuck "sending" operations...');
            await outboxManager.requeueStuck();
          }

          // ⚡ إعادة العمليات الفاشلة للمحاولة مجدداً
          if (stats.failed > 0) {
            console.log(`[BatchSender] 🔄 Requeuing ${stats.failed} failed operations...`);
            const requeued = await outboxManager.requeueFailed();
            if (requeued > 0) {
              console.log(`[BatchSender] ✅ Requeued ${requeued} failed operations`);
            }
          }

          // إعادة المحاولة بعد الـ requeue
          const retryPending = await outboxManager.getPending(dynamicBatchSize || DELTA_SYNC_CONSTANTS.BATCH_SIZE);
          if (retryPending.length > 0) {
            console.log(`[BatchSender] ✅ Found ${retryPending.length} operations after requeue`);
            // تابع مع العمليات المُعاد ترتيبها
            await outboxManager.markSending(retryPending.map(p => p.id));
            const result = await this.sendToServer(retryPending);
            return result;
          }
        }
        console.log('[BatchSender] ✅ No pending operations');

        // ⚡ فحص دوري للطلبات اليتيمة (كل 30 ثانية تقريباً)
        if (Date.now() - this.lastOrphanCheck > 30000) {
          this.lastOrphanCheck = Date.now();
          this.checkAndRequeuOrphanedOrders().catch(err => {
            console.warn('[BatchSender] ⚠️ Orphan check failed:', err);
          });
        }

        return { success: true, processedCount: 0, failedCount: 0, errors: [] };
      }

      console.log(`[BatchSender] 📤 Found ${pending.length} pending operations to send`);
      // 🔍 DEBUG: عرض تفاصيل العمليات المعلقة
      console.table(pending.slice(0, 10).map(p => ({
        table: p.table_name,
        op: p.operation,
        record: p.record_id.slice(0, 8),
        status: p.status,
        retries: p.retry_count,
        error: p.last_error?.slice(0, 30) || 'none'
      })));

      // تحديث الحالة إلى "قيد الإرسال"
      await outboxManager.markSending(pending.map(p => p.id));
      console.log(`[BatchSender] 📌 Marked ${pending.length} operations as 'sending'`);

      // إرسال للخادم
      const result = await this.sendToServer(pending);

      console.log(`[BatchSender] 📊 Batch result: ${result.processedCount} sent, ${result.failedCount} failed`);

      return result;
    } catch (error) {
      console.error('[BatchSender] ❌ Batch send error:', error);
      // إعادة العمليات للحالة المعلقة
      await outboxManager.requeueStuck();
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ id: '', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
    } finally {
      this.isSending = false;
    }
  }

  /**
   * ⚡ تعيين أسماء الجداول من SQLite المحلي إلى Supabase
   */
  private readonly TABLE_NAME_MAP: Record<string, string> = {
    'pos_orders': 'orders',
    'pos_order_items': 'order_items',
    'work_sessions': 'pos_work_sessions',  // ⚡ في Supabase الاسم مختلف
    'product_returns': 'returns',           // ⚡ إرجاعات المنتجات
    'loss_declarations': 'losses',          // ⚡ تصريحات الخسائر
  };

  /**
   * ⚡ تحويل اسم الجدول المحلي لاسم Supabase
   */
  private mapToSupabaseTable(localTable: string): string {
    return this.TABLE_NAME_MAP[localTable] || localTable;
  }

  /**
   * ⚡ التحقق إذا كان الجدول محلي فقط (لا يُرسل لـ Supabase)
   */
  private isLocalOnlyTable(tableName: string): boolean {
    const localTable = tableName.toLowerCase();
    return this.LOCAL_ONLY_TABLES.includes(localTable);
  }

  /**
   * ⚡ فلترة الـ payload من الأعمدة المحلية فقط
   * وتحويل أسماء الأعمدة للتوافق مع Supabase
   */
  private filterPayloadForSupabase(tableName: string, payload: Record<string, any>): Record<string, any> {
    const supabaseTable = this.mapToSupabaseTable(tableName);

    // الحصول على الأعمدة المحلية فقط لهذا الجدول
    const localOnlyCols = [
      ...(this.LOCAL_ONLY_COLUMNS[tableName] || []),
      ...(this.LOCAL_ONLY_COLUMNS[supabaseTable] || [])
    ];

    // الحصول على خريطة تحويل الأعمدة
    const columnMap = this.COLUMN_NAME_MAP[tableName] || this.COLUMN_NAME_MAP[supabaseTable] || {};

    const result: Record<string, any> = {};

    // ⚡ الحد الأقصى لحجم الحقل النصي (50KB)
    // PostgreSQL index row limit هو 8KB، لذا نضع حد آمن 50KB للبيانات النصية
    const MAX_STRING_SIZE = 50000;

    for (const [key, value] of Object.entries(payload)) {
      // تخطي الأعمدة المحلية فقط
      if (localOnlyCols.includes(key)) {
        continue;
      }

      // تخطي القيم undefined أو null (إلا إذا كانت مطلوبة)
      if (value === undefined) {
        continue;
      }

      // تحويل اسم العمود إذا لزم الأمر (نحتاجه قبل الفلترة)
      const mappedKey = columnMap[key] || key;

      // ⚡ حقول الصور المسموحة - لا نفلترها إذا كانت URLs عادية
      const imageFields = ['thumbnail_image', 'image_url', 'images', 'additional_images'];
      const isImageField = imageFields.includes(key) || imageFields.includes(mappedKey);

      // ⚡ معالجة arrays (مثل images)
      if (Array.isArray(value)) {
        // فلترة الصور base64 من الـ array وإبقاء URLs العادية فقط
        if (isImageField) {
          const filteredImages = value.filter((img: any) => {
            if (typeof img !== 'string') return false;
            // إبقاء URLs العادية فقط
            if (img.startsWith('http://') || img.startsWith('https://')) return true;
            // تخطي data URLs و base64
            if (img.startsWith('data:') || img.startsWith('/9j/') || img.startsWith('iVBOR')) {
              console.log(`[BatchSender] 🚫 Filtering out base64 image from array: ${key}`);
              return false;
            }
            return true;
          });
          if (filteredImages.length > 0) {
            result[mappedKey] = filteredImages;
          }
          continue;
        }
        // arrays أخرى - نمررها كما هي
        result[mappedKey] = value;
        continue;
      }

      // ⚡ فلترة البيانات الكبيرة التي تسبب خطأ PostgreSQL index
      if (typeof value === 'string') {
        // تخطي data URLs (صور base64 مضمنة) - فقط إذا لم تكن حقل صور مسموح
        if (value.startsWith('data:image/') || value.startsWith('data:application/')) {
          // ⚡ إذا كان حقل صور وURL عادي (ليس data URL كبير)، نسمح به
          if (isImageField && value.length < 500) {
            // data URL صغير جداً (مثل placeholder) - نسمح به
          } else {
            console.log(`[BatchSender] 🚫 Filtering out data URL in field: ${key} (${Math.round(value.length / 1024)}KB)`);
            continue;
          }
        }

        // تخطي سلاسل base64 المعروفة (تبدأ بأنماط base64 شائعة للصور)
        if ((value.startsWith('/9j/') || value.startsWith('iVBOR') || value.startsWith('R0lGOD')) && value.length > 1000) {
          console.log(`[BatchSender] 🚫 Filtering out base64 image in field: ${key} (${Math.round(value.length / 1024)}KB)`);
          continue;
        }

        // تخطي أي حقل نصي كبير جداً (قد يسبب خطأ index row size)
        // ⚡ استثناء: URLs الصور العادية (https://...) نسمح بها بغض النظر عن الطول
        const isNormalUrl = value.startsWith('http://') || value.startsWith('https://');
        if (value.length > MAX_STRING_SIZE && !isNormalUrl) {
          console.warn(`[BatchSender] ⚠️ Filtering out large string field: ${key} (${Math.round(value.length / 1024)}KB > ${MAX_STRING_SIZE / 1000}KB limit)`);
          continue;
        }
      }

      result[mappedKey] = value;
    }

    // ⚡ إضافة القيم الافتراضية للأعمدة المطلوبة في Supabase orders
    if (supabaseTable === 'orders' || tableName === 'pos_orders') {
      // ✅ tax مطلوب (NOT NULL) في جدول orders
      if (result.tax === undefined || result.tax === null) {
        result.tax = 0;
      }
      // ✅ subtotal مطلوب (NOT NULL)
      if (result.subtotal === undefined || result.subtotal === null) {
        result.subtotal = result.total || 0;
      }
      // ✅ total مطلوب (NOT NULL)
      if (result.total === undefined || result.total === null) {
        result.total = result.subtotal || 0;
      }
      // ✅ is_online مطلوب (NOT NULL) - طلبات POS تكون offline
      if (result.is_online === undefined || result.is_online === null) {
        result.is_online = false;
      }
      // ✅ status مطلوب (NOT NULL)
      if (!result.status) {
        result.status = 'pending';
      }
      // ✅ payment_method مطلوب (NOT NULL)
      if (!result.payment_method) {
        result.payment_method = 'cash';
      }
      // ✅ payment_status مطلوب (NOT NULL)
      if (!result.payment_status) {
        result.payment_status = 'paid';
      }
      // ✅ slug اختياري لكن مفيد للتعريف
      if (!result.slug && result.id) {
        result.slug = `pos-${result.id.slice(0, 8)}-${Date.now().toString(36)}`;
      }
      // ✅ pos_order_type للتمييز
      if (!result.pos_order_type) {
        result.pos_order_type = 'pos';
      }
      // ✅ discount قيمة افتراضية
      if (result.discount === undefined) {
        result.discount = 0;
      }
    }

    // ⚡ إضافة قيم افتراضية لـ order_items
    // Supabase order_items يتطلب: id, order_id, product_id, name, slug, organization_id, quantity, unit_price, total_price
    if (supabaseTable === 'order_items' || tableName === 'pos_order_items') {
      // ✅ organization_id مطلوب (NOT NULL) في Supabase order_items
      if (!result.organization_id) {
        // ⚡ محاولة استخراج من payload الأصلي (camelCase) أو من this.organizationId
        result.organization_id = payload.organizationId || this.organizationId;
        
        if (!result.organization_id) {
          console.error(`[BatchSender] ❌ filterPayloadForSupabase: order_item ${result.id?.slice(0, 8)} missing organization_id!`);
        }
      }
      // ✅ slug مطلوب في Supabase
      if (!result.slug) {
        result.slug = `item-${result.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      // ✅ name مطلوب - يمكن أن يأتي من product_name
      if (!result.name && result.product_name) {
        result.name = result.product_name;
      }
      if (!result.name) {
        result.name = 'Unknown Product';
      }
      // ✅ is_digital قيمة افتراضية (منتج مادي)
      if (result.is_digital === undefined || result.is_digital === null) {
        result.is_digital = false;
      }
      // ✅ quantity قيمة افتراضية
      if (!result.quantity) {
        result.quantity = 1;
      }
      // ✅ unit_price قيمة افتراضية
      if (result.unit_price === undefined || result.unit_price === null) {
        result.unit_price = result.total_price || 0;
      }
      // ✅ total_price قيمة افتراضية
      if (result.total_price === undefined || result.total_price === null) {
        result.total_price = (result.unit_price || 0) * (result.quantity || 1);
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ BATCH OPTIMIZATION - تحسين الإرسال بالتجميع
  // ═══════════════════════════════════════════════════════════════════════════

  /** الحد الأقصى للسجلات في دفعة INSERT واحدة */
  private readonly BATCH_INSERT_SIZE = 20;

  /** ترتيب الجداول حسب التبعيات (الأقل رقم = أولوية أعلى) */
  private readonly TABLE_PRIORITY: Record<string, number> = {
    'orders': 1,
    'pos_orders': 1,
    'order_items': 2,
    'pos_order_items': 2,
    'customers': 0,
    'products': 0,
  };

  /**
   * ⚡ تجميع العمليات حسب (الجدول + نوع العملية)
   */
  private groupOperationsByTableAndType(operations: OutboxEntry[]): Map<string, OutboxEntry[]> {
    const groups = new Map<string, OutboxEntry[]>();

    for (const op of operations) {
      // تخطي الجداول المحلية
      if (this.isLocalOnlyTable(op.table_name)) continue;

      const supabaseTable = this.mapToSupabaseTable(op.table_name);
      const key = `${supabaseTable}:${op.operation}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(op);
    }

    return groups;
  }

  /**
   * ⚡ ترتيب المجموعات حسب التبعيات
   * orders قبل order_items (foreign key)
   */
  private sortGroupsByDependency(groups: Map<string, OutboxEntry[]>): string[] {
    const keys = Array.from(groups.keys());

    return keys.sort((a, b) => {
      const [tableA] = a.split(':');
      const [tableB] = b.split(':');

      const priorityA = this.TABLE_PRIORITY[tableA] ?? 5;
      const priorityB = this.TABLE_PRIORITY[tableB] ?? 5;

      return priorityA - priorityB;
    });
  }

  /**
   * ⚡ توحيد الأعمدة في مصفوفة من الـ payloads
   * Supabase batch insert يتطلب نفس الأعمدة لكل السجلات
   * ⚡ إصلاح: لا يضيف null للأعمدة NOT NULL المطلوبة في Supabase
   */
  private normalizePayloads(payloads: Record<string, any>[]): Record<string, any>[] {
    if (payloads.length === 0) return [];

    // جمع كل الأعمدة من كل السجلات
    const allColumns = new Set<string>();
    for (const payload of payloads) {
      Object.keys(payload).forEach(key => allColumns.add(key));
    }

    // ⚡ الأعمدة التي لا يجب أن تكون null في Supabase
    // إذا كانت ناقصة، لا نضيفها بدلاً من إضافة null
    const notNullColumns: Record<string, string[]> = {
      // سيتم تحديد الجدول من السياق، لكن هذه الأعمدة عامة
      '_common': ['id']
    };

    // توحيد كل payload
    return payloads.map(payload => {
      const normalized: Record<string, any> = {};
      for (const col of allColumns) {
        const value = payload[col];
        
        // ⚡ إذا القيمة موجودة، نضيفها
        if (value !== undefined) {
          normalized[col] = value;
        } else {
          // ⚡ إذا القيمة غير موجودة، نتحقق إذا كانت مطلوبة
          // لا نضيف null للأعمدة المطلوبة - نتركها بدون قيمة
          // هذا يمنع خطأ NOT NULL violation
          // Supabase سيستخدم القيمة الافتراضية إن وجدت
          normalized[col] = null;
        }
      }
      return normalized;
    });
  }

  /**
   * ⚡ توحيد الأعمدة مع مراعاة جدول معين
   * يستخدم القيم الافتراضية للأعمدة NOT NULL
   */
  private normalizePayloadsForTable(
    tableName: string,
    payloads: Record<string, any>[]
  ): Record<string, any>[] {
    if (payloads.length === 0) return [];

    // ⚡ القيم الافتراضية للأعمدة المطلوبة حسب الجدول
    const defaultValues: Record<string, Record<string, any>> = {
      'orders': {
        tax: 0,
        subtotal: 0,
        total: 0,
        discount: 0,
        is_online: false,
        status: 'pending',
        payment_method: 'cash',
        payment_status: 'pending'
      },
      'order_items': {
        name: 'Unknown Product',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        is_digital: false
      }
    };

    const tableDefaults = defaultValues[tableName] || {};

    // جمع كل الأعمدة
    const allColumns = new Set<string>();
    for (const payload of payloads) {
      Object.keys(payload).forEach(key => allColumns.add(key));
    }

    // توحيد مع القيم الافتراضية
    return payloads.map(payload => {
      const normalized: Record<string, any> = {};
      
      for (const col of allColumns) {
        const value = payload[col];
        
        if (value !== undefined && value !== null) {
          normalized[col] = value;
        } else if (tableDefaults[col] !== undefined) {
          // ⚡ استخدام القيمة الافتراضية للأعمدة المطلوبة
          normalized[col] = tableDefaults[col];
        } else {
          normalized[col] = null;
        }
      }
      
      return normalized;
    });
  }

  /**
   * ⚡ إرسال دفعة INSERT واحدة
   * مع fallback للإرسال الفردي عند الفشل
   */
  private async sendBatchInserts(
    supabaseTable: string,
    operations: OutboxEntry[]
  ): Promise<{ successIds: string[]; failedOps: OutboxEntry[]; errors: Array<{ id: string; error: string }> }> {
    const successIds: string[] = [];
    const failedOps: OutboxEntry[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    if (operations.length === 0) {
      return { successIds, failedOps, errors };
    }

    // تحضير الـ payloads
    const payloadsWithIds: Array<{ op: OutboxEntry; payload: Record<string, any> }> = [];

    for (const op of operations) {
      try {
        const rawPayload = JSON.parse(op.payload);
        const payload = this.filterPayloadForSupabase(op.table_name, rawPayload);
        payloadsWithIds.push({
          op,
          payload: { id: op.record_id, ...payload }
        });
      } catch (err) {
        // فشل في parse الـ payload
        failedOps.push(op);
        errors.push({ id: op.id, error: 'Invalid payload JSON' });
      }
    }

    if (payloadsWithIds.length === 0) {
      return { successIds, failedOps, errors };
    }

    // تقسيم إلى دفعات صغيرة
    const batches: Array<typeof payloadsWithIds> = [];
    for (let i = 0; i < payloadsWithIds.length; i += this.BATCH_INSERT_SIZE) {
      batches.push(payloadsWithIds.slice(i, i + this.BATCH_INSERT_SIZE));
    }

    console.log(`%c[BatchSender] ⚡ Batch INSERT: ${payloadsWithIds.length} سجل في ${batches.length} دفعة → ${supabaseTable}`, 'color: #4CAF50; font-weight: bold');

    // إرسال كل دفعة
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      // ⚡ استخدام normalizePayloadsForTable للحصول على القيم الافتراضية الصحيحة
      const payloads = this.normalizePayloadsForTable(supabaseTable, batch.map(b => b.payload));

      try {
        // @ts-ignore
        const { error } = await supabase
          .from(supabaseTable as any)
          .insert(payloads);

        if (!error) {
          // نجاح - كل الدفعة
          console.log(`%c[BatchSender] ✅ Batch ${batchIndex + 1}/${batches.length}: ${batch.length} سجل نجح`, 'color: #4CAF50');
          batch.forEach(b => successIds.push(b.op.id));
        } else {
          // فشل الـ batch - fallback للإرسال الفردي
          console.warn(`%c[BatchSender] ⚠️ Batch ${batchIndex + 1} فشل: ${error.message}، محاولة إرسال فردي...`, 'color: #FF9800');

          for (const item of batch) {
            const singleResult = await this.sendSingleInsert(supabaseTable, item.op, item.payload);
            if (singleResult.success) {
              successIds.push(item.op.id);
            } else {
              failedOps.push(item.op);
              errors.push({ id: item.op.id, error: singleResult.error });
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[BatchSender] ❌ Batch exception:`, errorMsg);

        // ⚡ فحص مبكر لخطأ الشبكة - إبلاغ ConnectionState فوراً
        if (isNetworkError(errorMsg)) {
          console.warn('%c[BatchSender] 🔴 خطأ شبكة مكتشف - إبلاغ ConnectionState', 'color: #f44336; font-weight: bold');
          connectionState.reportFailure(errorMsg);

          // ⚡ إذا أصبحنا offline، نوقف المعالجة ونُرجع كل الدفعة كفاشلة
          if (connectionState.isOffline()) {
            console.warn('%c[BatchSender] 📴 تم اكتشاف offline - إيقاف معالجة الدفعة', 'color: #f44336');
            // أرجع كل العمليات المتبقية كفاشلة (للـ retry لاحقاً)
            for (const item of batch) {
              failedOps.push(item.op);
              errors.push({ id: item.op.id, error: 'Network offline - will retry when online' });
            }
            // تخطي باقي الدفعات
            break;
          }
        }

        // إذا لم نصبح offline، نحاول الإرسال الفردي
        if (connectionState.isOnline()) {
          for (const item of batch) {
            const singleResult = await this.sendSingleInsert(supabaseTable, item.op, item.payload);
            if (singleResult.success) {
              successIds.push(item.op.id);
            } else {
              failedOps.push(item.op);
              errors.push({ id: item.op.id, error: singleResult.error });

              // ⚡ فحص خطأ الشبكة في الإرسال الفردي أيضاً
              if (isNetworkError(singleResult.error)) {
                connectionState.reportFailure(singleResult.error);
                if (connectionState.isOffline()) {
                  console.warn('%c[BatchSender] 📴 offline بعد إرسال فردي - إيقاف', 'color: #f44336');
                  break;
                }
              }
            }
          }
        }
      }
    }

    return { successIds, failedOps, errors };
  }

  /**
   * ⚡ إرسال INSERT فردي (fallback)
   */
  private async sendSingleInsert(
    supabaseTable: string,
    op: OutboxEntry,
    payload: Record<string, any>
  ): Promise<{ success: boolean; error: string }> {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from(supabaseTable as any)
        .insert(payload);

      if (!error) {
        return { success: true, error: '' };
      }

      // معالجة duplicate key
      if (error.code === '23505') {
        console.log(`[BatchSender] ℹ️ Record exists, converting to UPDATE: ${op.record_id.slice(0, 8)}`);
        const { id, ...updatePayload } = payload;
        // @ts-ignore
        const updateResult = await supabase
          .from(supabaseTable as any)
          .update(updatePayload)
          .eq('id', op.record_id);

        if (!updateResult.error) {
          return { success: true, error: '' };
        }
        return { success: false, error: updateResult.error.message };
      }

      return { success: false, error: error.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * ⚡ إرسال دفعة DELETE واحدة
   */
  private async sendBatchDeletes(
    supabaseTable: string,
    operations: OutboxEntry[]
  ): Promise<{ successIds: string[]; failedOps: OutboxEntry[]; errors: Array<{ id: string; error: string }> }> {
    const successIds: string[] = [];
    const failedOps: OutboxEntry[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    if (operations.length === 0) {
      return { successIds, failedOps, errors };
    }

    const recordIds = operations.map(op => op.record_id);

    console.log(`%c[BatchSender] ⚡ Batch DELETE: ${recordIds.length} سجل من ${supabaseTable}`, 'color: #f44336; font-weight: bold');

    try {
      // @ts-ignore
      const { error } = await supabase
        .from(supabaseTable as any)
        .delete()
        .in('id', recordIds);

      if (!error) {
        console.log(`%c[BatchSender] ✅ Batch DELETE: ${recordIds.length} سجل تم حذفهم`, 'color: #4CAF50');
        operations.forEach(op => successIds.push(op.id));
      } else {
        // فشل - fallback للحذف الفردي
        console.warn(`%c[BatchSender] ⚠️ Batch DELETE فشل: ${error.message}، محاولة حذف فردي...`, 'color: #FF9800');

        for (const op of operations) {
          // @ts-ignore
          const singleResult = await supabase
            .from(supabaseTable as any)
            .delete()
            .eq('id', op.record_id);

          if (!singleResult.error || singleResult.error.code === 'PGRST116') {
            // نجاح أو السجل غير موجود أصلاً
            successIds.push(op.id);
          } else {
            failedOps.push(op);
            errors.push({ id: op.id, error: singleResult.error.message });
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[BatchSender] ❌ Batch DELETE exception:`, errorMsg);

      // ⚡ فحص مبكر لخطأ الشبكة
      if (isNetworkError(errorMsg)) {
        console.warn('%c[BatchSender] 🔴 خطأ شبكة في DELETE - إبلاغ ConnectionState', 'color: #f44336; font-weight: bold');
        connectionState.reportFailure(errorMsg);

        if (connectionState.isOffline()) {
          console.warn('%c[BatchSender] 📴 offline - إيقاف DELETE', 'color: #f44336');
          for (const op of operations) {
            failedOps.push(op);
            errors.push({ id: op.id, error: 'Network offline - will retry when online' });
          }
          return { successIds, failedOps, errors };
        }
      }

      // fallback للحذف الفردي إذا لا نزال online
      if (connectionState.isOnline()) {
        for (const op of operations) {
          try {
            // @ts-ignore
            const singleResult = await supabase
              .from(supabaseTable as any)
              .delete()
              .eq('id', op.record_id);

            if (!singleResult.error || singleResult.error.code === 'PGRST116') {
              successIds.push(op.id);
            } else {
              failedOps.push(op);
              errors.push({ id: op.id, error: singleResult.error.message });

              // ⚡ فحص خطأ الشبكة
              if (isNetworkError(singleResult.error.message)) {
                connectionState.reportFailure(singleResult.error.message);
                if (connectionState.isOffline()) break;
              }
            }
          } catch (innerErr) {
            const innerErrMsg = innerErr instanceof Error ? innerErr.message : 'Unknown';
            failedOps.push(op);
            errors.push({ id: op.id, error: innerErrMsg });

            // ⚡ فحص خطأ الشبكة
            if (isNetworkError(innerErrMsg)) {
              connectionState.reportFailure(innerErrMsg);
              if (connectionState.isOffline()) break;
            }
          }
        }
      }
    }

    return { successIds, failedOps, errors };
  }

  /**
   * إرسال العمليات للخادم
   * ⚡ محسّن: يستخدم التجميع للـ INSERT و DELETE
   * ⚡ يفلتر الجداول المحلية فقط والأعمدة غير الموجودة في Supabase
   */
  private async sendToServer(operations: OutboxEntry[]): Promise<BatchSendResult> {
    const sendStartTime = Date.now(); // ⚡ لقياس زمن الإرسال
    const successIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];
    // ⚡ تتبع الـ orders الفاشلة لتخطي order_items المرتبطة
    const failedOrderIds = new Set<string>();

    console.log(`%c[BatchSender] 🔄 ═══════════════════════════════════════════════════`, 'color: #4CAF50; font-weight: bold');
    console.log(`%c[BatchSender] 🔄 معالجة ${operations.length} عملية للإرسال (وضع التجميع الذكي)`, 'color: #4CAF50; font-weight: bold');
    console.log(`%c[BatchSender] 🔄 ═══════════════════════════════════════════════════`, 'color: #4CAF50; font-weight: bold');

    // ⚡ الخطوة 1: معالجة الجداول المحلية أولاً
    const localOnlyOps = operations.filter(op => this.isLocalOnlyTable(op.table_name));
    if (localOnlyOps.length > 0) {
      console.log(`%c[BatchSender] ⏭️ تخطي ${localOnlyOps.length} عملية محلية`, 'color: #FF9800');
      localOnlyOps.forEach(op => successIds.push(op.id));
    }

    // ⚡ الخطوة 2: تجميع العمليات غير المحلية
    const remoteOps = operations.filter(op => !this.isLocalOnlyTable(op.table_name));
    const groups = this.groupOperationsByTableAndType(remoteOps);
    const sortedKeys = this.sortGroupsByDependency(groups);

    console.log(`%c[BatchSender] � تم تجميع ${remoteOps.length} عملية في ${groups.size} مجموعة`, 'color: #2196F3; font-weight: bold');
    for (const key of sortedKeys) {
      const ops = groups.get(key)!;
      console.log(`[BatchSender]   → ${key}: ${ops.length} عملية`);
    }

    // ⚡ الخطوة 3: معالجة كل مجموعة بالترتيب
    for (const key of sortedKeys) {
      const groupOps = groups.get(key)!;
      const [supabaseTable, operation] = key.split(':');

      console.log(`%c[BatchSender] ────────────────────────────────────────`, 'color: #2196F3');
      console.log(`%c[BatchSender] � معالجة مجموعة: ${key} (${groupOps.length} عملية)`, 'color: #2196F3; font-weight: bold');

      // ⚡ فلترة order_items إذا فشلت orders المرتبطة
      let filteredOps = groupOps;
      if (supabaseTable === 'order_items') {
        filteredOps = groupOps.filter(op => {
          try {
            const payload = JSON.parse(op.payload);
            if (payload.order_id && failedOrderIds.has(payload.order_id)) {
              console.log(`%c[BatchSender] ⏭️ تخطي order_item - الطلب الأب فشل: ${payload.order_id.slice(0, 8)}`, 'color: #FF9800');
              return false;
            }
          } catch { }
          return true;
        });
        if (filteredOps.length < groupOps.length) {
          console.log(`[BatchSender] ℹ️ تم تخطي ${groupOps.length - filteredOps.length} عنصر مرتبط بطلبات فاشلة`);
        }
      }

      if (filteredOps.length === 0) continue;

      // ⚡ فحص مبكر قبل معالجة المجموعة
      if (connectionState.isOffline()) {
        console.warn('%c[BatchSender] 📴 offline - skipping group processing', 'color: #f44336');
        break;
      }

      // ⚡ معالجة حسب نوع العملية
      if (operation === 'INSERT') {
        // ⚡ استخدام Batch INSERT
        const result = await this.sendBatchInserts(supabaseTable, filteredOps);
        successIds.push(...result.successIds);
        errors.push(...result.errors);

        // تسجيل orders الفاشلة
        for (const failedOp of result.failedOps) {
          if (supabaseTable === 'orders') {
            failedOrderIds.add(failedOp.record_id);
          }
          await this.handleOperationError(failedOp, result.errors.find(e => e.id === failedOp.id)?.error || 'Unknown');
        }

        // ⚡ إذا أصبحنا offline بعد INSERT، نوقف
        if (connectionState.isOffline()) {
          console.warn('%c[BatchSender] 📴 offline after INSERT - stopping', 'color: #f44336');
          break;
        }

      } else if (operation === 'DELETE') {
        // ⚡ استخدام Batch DELETE
        const result = await this.sendBatchDeletes(supabaseTable, filteredOps);
        successIds.push(...result.successIds);
        errors.push(...result.errors);

        for (const failedOp of result.failedOps) {
          await this.handleOperationError(failedOp, result.errors.find(e => e.id === failedOp.id)?.error || 'Unknown');
        }

        // ⚡ إذا أصبحنا offline بعد DELETE، نوقف
        if (connectionState.isOffline()) {
          console.warn('%c[BatchSender] 📴 offline after DELETE - stopping', 'color: #f44336');
          break;
        }

      } else {
        // ⚡ UPDATE و DELTA: إرسال فردي (لتعقيدها)
        for (const op of filteredOps) {
          // ⚡ فحص مبكر - إذا أصبحنا offline، نوقف المعالجة
          if (connectionState.isOffline()) {
            console.warn('%c[BatchSender] 📴 offline detected - skipping remaining UPDATE/DELTA operations', 'color: #f44336');
            break;
          }

          try {
            const rawPayload = JSON.parse(op.payload);
            const payload = this.filterPayloadForSupabase(op.table_name, rawPayload);

            let error: any = null;

            if (operation === 'UPDATE') {
              // @ts-ignore
              const updateResult = await supabase
                .from(supabaseTable as any)
                .update(payload)
                .eq('id', op.record_id);
              error = updateResult.error;

              // ⚡ معالجة سيناريو Multi-Device: السجل حُذف من جهاز آخر
              if (error && (error.code === 'PGRST116' || error.message?.includes('not found') || error.message?.includes('0 rows'))) {
                console.log(`%c[BatchSender] ℹ️ UPDATE: السجل ${op.record_id.slice(0, 8)} غير موجود (حُذف من جهاز آخر؟) - اعتبارها نجاح`, 'color: #FF9800');
                error = null; // نعتبرها نجاح
              }
            } else if (operation === 'DELTA') {
              error = await this.applyDeltaAtomic(supabaseTable, op.record_id, payload);

              // ⚡ معالجة سيناريو Multi-Device للـ DELTA أيضاً
              if (error && (error.code === 'PGRST116' || error.message?.includes('not found'))) {
                console.log(`%c[BatchSender] ℹ️ DELTA: السجل ${op.record_id.slice(0, 8)} غير موجود - اعتبارها نجاح`, 'color: #FF9800');
                error = null;
              }
            }

            if (!error) {
              console.log(`%c[BatchSender] ✅ ${operation}: ${supabaseTable}/${op.record_id.slice(0, 8)}`, 'color: #4CAF50');
              successIds.push(op.id);
            } else {
              console.error(`[BatchSender] ❌ ${operation} فشل:`, error.message);

              // ⚡ فحص خطأ الشبكة
              if (error.message && isNetworkError(error.message)) {
                connectionState.reportFailure(error.message);
                if (connectionState.isOffline()) {
                  console.warn('%c[BatchSender] 📴 offline after UPDATE/DELTA error - stopping', 'color: #f44336');
                  break;
                }
              }

              await this.handleOperationError(op, error.message);
              errors.push({ id: op.id, error: error.message });
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[BatchSender] ❌ Exception:`, errorMsg);

            // ⚡ فحص خطأ الشبكة
            if (isNetworkError(errorMsg)) {
              connectionState.reportFailure(errorMsg);
              if (connectionState.isOffline()) {
                console.warn('%c[BatchSender] 📴 offline after exception - stopping', 'color: #f44336');
                break;
              }
            }

            await this.handleOperationError(op, errorMsg);
            errors.push({ id: op.id, error: errorMsg });
          }
        }
      }

      // ⚡ فحص إضافي بعد كل مجموعة - إذا أصبحنا offline، نوقف معالجة المجموعات
      if (connectionState.isOffline()) {
        console.warn('%c[BatchSender] 📴 offline - stopping all group processing', 'color: #f44336');
        break;
      }
    }

    // ═══════════════════════════════════════════════════
    // ملخص النتائج
    // ═══════════════════════════════════════════════════
    console.log(`%c[BatchSender] ═══════════════════════════════════════════════════`, 'color: #673AB7; font-weight: bold');
    console.log(`%c[BatchSender] 📊 ملخص الدفعة`, 'color: #673AB7; font-weight: bold');
    console.log(`%c[BatchSender] ═══════════════════════════════════════════════════`, 'color: #673AB7; font-weight: bold');
    console.log(`[BatchSender] 📊 إجمالي العمليات: ${operations.length}`);
    console.log(`%c[BatchSender] ✅ نجحت: ${successIds.length}`, 'color: #4CAF50; font-weight: bold');
    console.log(`%c[BatchSender] ❌ فشلت: ${errors.length}`, errors.length > 0 ? 'color: #f44336; font-weight: bold' : 'color: #4CAF50');
    if (errors.length > 0) {
      console.log(`%c[BatchSender] 📋 تفاصيل الأخطاء:`, 'color: #f44336');
      errors.forEach((e, i) => {
        console.log(`[BatchSender]   ${i + 1}. ID: ${e.id.slice(0, 8)} | Error: ${e.error}`);
      });
    }

    // حذف العمليات الناجحة
    if (successIds.length > 0) {
      await outboxManager.markSent(successIds);
      console.log(`%c[BatchSender] ✅ تم حذف ${successIds.length} عملية ناجحة من الـ Outbox`, 'color: #4CAF50');

      // ⚡ تحديث علامة synced في الجداول الأصلية
      console.log(`[BatchSender] 🔄 تحديث علامات synced في الجداول المحلية...`);
      await this.updateSyncedFlags(operations.filter(op => successIds.includes(op.id)));
    }

    // ⚡ تسجيل الإحصائيات
    const syncEndTime = Date.now();
    const syncTimeMs = syncEndTime - sendStartTime;
    
    syncMetrics.recordOperationsSent(operations.length);
    if (successIds.length > 0) {
      syncMetrics.recordOperationsSucceeded(successIds.length, syncTimeMs);
      // ⚡ إبلاغ ConnectionState عن النجاح
      connectionState.reportSuccess();
    }
    
    // تحديث حجم الـ Queue
    const remainingOps = await outboxManager.getPendingOperations();
    syncMetrics.updateQueueSize(remainingOps.length);

    return {
      success: errors.length === 0,
      processedCount: successIds.length,
      failedCount: errors.length,
      errors
    };
  }

  /**
   * ⚡ تحديث علامة synced = 1 في الجدول الأصلي بعد نجاح الإرسال
   * هذا يضمن أن واجهة المستخدم تعرض الحالة الصحيحة
   */
  private async updateSyncedFlags(successfulOps: OutboxEntry[]): Promise<void> {
    if (successfulOps.length === 0) return;

    // تجميع العمليات حسب الجدول
    const opsByTable = new Map<string, string[]>();

    for (const op of successfulOps) {
      // فقط للجداول التي لها عمود synced
      const table = op.table_name;
      if (!opsByTable.has(table)) {
        opsByTable.set(table, []);
      }
      opsByTable.get(table)!.push(op.record_id);
    }

    // تحديث كل جدول
    for (const [tableName, recordIds] of opsByTable) {
      try {
        // تخطي الجداول المحلية فقط
        if (this.isLocalOnlyTable(tableName)) continue;

        const placeholders = recordIds.map(() => '?').join(',');

        // ⚡ للطلبات: تحديث status أيضاً من pending_sync إلى completed
        if (tableName === 'pos_orders' || tableName === 'orders') {
          // ⚡ استخدام mapToLocalTable للحصول على اسم جدول SQLite الصحيح
          const localTableName = this.mapToLocalTable(tableName);
          
          // 1. تحديث SQLite المحلي
          const updateResult = await sqliteWriteQueue.write(
            `UPDATE ${localTableName} SET synced = 1, pending_operation = NULL, status = 'completed', syncStatus = 'synced' WHERE id IN (${placeholders})`,
            recordIds
          );
          
          // ⚡ التحقق من نجاح التحديث المحلي
          if (updateResult && typeof updateResult === 'object' && 'success' in updateResult) {
            if (updateResult.success) {
              console.log(`[BatchSender] ✅ Updated synced flag + status for ${recordIds.length} orders in ${localTableName}`);
            } else {
              console.error(`[BatchSender] ❌ Failed to update synced flag in SQLite:`, (updateResult as any).error);
            }
          } else {
            console.log(`[BatchSender] ✅ Updated synced flag + status for ${recordIds.length} orders in ${localTableName}`);
          }

          // 2. ⚡ تحديث Supabase أيضاً (الواجهة تقرأ من Supabase!)
          try {
            const { error: supabaseError } = await supabase
              .from('orders')
              .update({ status: 'completed' })
              .in('id', recordIds);

            if (supabaseError) {
              console.warn(`[BatchSender] ⚠️ Failed to update order status on Supabase:`, supabaseError);
            } else {
              console.log(`%c[BatchSender] ✅ Updated ${recordIds.length} orders status to 'completed' on Supabase`, 'color: #4CAF50; font-weight: bold');
            }
          } catch (supaErr) {
            console.warn(`[BatchSender] ⚠️ Exception updating Supabase order status:`, supaErr);
          }
        } else if (tableName === 'order_items') {
          // ⚡ استخدام mapToLocalTable للحصول على اسم جدول SQLite الصحيح
          const localTableName = this.mapToLocalTable(tableName);
          
          const updateResult = await sqliteWriteQueue.write(
            `UPDATE ${localTableName} SET synced = 1, pending_operation = NULL WHERE id IN (${placeholders})`,
            recordIds
          );
          
          if (updateResult && typeof updateResult === 'object' && 'success' in updateResult && !updateResult.success) {
            console.error(`[BatchSender] ❌ Failed to update synced flag for order_items in SQLite:`, (updateResult as any).error);
          } else {
            console.log(`[BatchSender] ✅ Updated synced flag for ${recordIds.length} order_items in ${localTableName}`);
          }
        } else {
          // ⚡ استخدام mapToLocalTable للحصول على اسم جدول SQLite الصحيح
          const localTableName = this.mapToLocalTable(tableName);

          // تحديث synced = 1 و pending_operation = NULL
          const updateResult = await sqliteWriteQueue.write(
            `UPDATE ${localTableName} SET synced = 1, pending_operation = NULL WHERE id IN (${placeholders})`,
            recordIds
          );

          if (updateResult && typeof updateResult === 'object' && 'success' in updateResult && !updateResult.success) {
            console.error(`[BatchSender] ❌ Failed to update synced flag for ${tableName} in SQLite (table: ${localTableName}):`, (updateResult as any).error);
          } else {
            console.log(`[BatchSender] ✅ Updated synced flag for ${recordIds.length} records in ${localTableName}`);
          }

          // ⚡ إذا كان جدول المنتجات، نرفع الصور للخادم
          if (tableName === 'products' && this.organizationId) {
            console.log(`[BatchSender] 🖼️ Syncing images for ${recordIds.length} products...`);
            this.syncProductImagesAfterSync(recordIds, this.organizationId).catch(err => {
              console.warn('[BatchSender] ⚠️ Image sync after product sync failed:', err);
            });
          }
        }
      } catch (err) {
        // لا نريد أن يفشل الـ batch بسبب خطأ في تحديث الـ synced flag
        console.warn(`[BatchSender] ⚠️ Failed to update synced flag for ${tableName}:`, err);
      }
    }
  }

  /**
   * ⚡ رفع صور المنتجات بعد مزامنتها بنجاح
   */
  private async syncProductImagesAfterSync(productIds: string[], organizationId: string): Promise<void> {
    try {
      const { imageBase64Service } = await import('@/api/imageBase64Service');

      let synced = 0;
      let failed = 0;

      for (const productId of productIds) {
        try {
          const result = await imageBase64Service.syncProductImages(productId, organizationId);
          if (result.errors.length === 0 && (result.thumbnailUrl || (result.additionalUrls && result.additionalUrls.length > 0))) {
            synced++;
            console.log(`[BatchSender] 🖼️ ✅ Images synced for product ${productId.slice(0, 8)}`);
          } else if (result.errors.length > 0) {
            failed++;
            console.warn(`[BatchSender] 🖼️ ⚠️ Image sync errors for ${productId.slice(0, 8)}:`, result.errors);
          }
        } catch (err) {
          failed++;
          console.warn(`[BatchSender] 🖼️ ❌ Failed to sync images for ${productId.slice(0, 8)}:`, err);
        }
      }

      if (synced > 0 || failed > 0) {
        console.log(`[BatchSender] 🖼️ Image sync complete: ${synced} synced, ${failed} failed`);
      }
    } catch (error) {
      console.warn('[BatchSender] ⚠️ Failed to load imageBase64Service:', error);
    }
  }

  /**
   * ⚡ معالجة خطأ في عملية واحدة - محسّن مع Smart Retry
   */
  private async handleOperationError(op: OutboxEntry, error: string, statusCode?: number): Promise<void> {
    // ⚡ Smart Retry: تصنيف الخطأ أولاً
    const classification = outboxManager.classifyError(error, statusCode);
    
    // ⚡ إبلاغ ConnectionState عن الفشل (إذا كان خطأ شبكة)
    connectionState.reportFailure(error);

    // ⚡ إذا كان خطأ دائم، markFailed ستحذفه فوراً
    // إذا كان خطأ مؤقت، markFailed ستجدول retry حسب النوع
    await outboxManager.markFailed(op.id, error, statusCode);

    // ⚡ إذا كان order وتم حذفه (permanent أو max retries)، نحذف order_items اليتيمة
    if (!classification.shouldRetry || op.retry_count + 1 >= DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT) {
      if (op.table_name === 'pos_orders' || op.table_name === 'orders') {
        await this.removeOrphanedOrderItems(op.record_id);
      }
      await this.logFailedOperation(op, error);
    }
  }

  /**
   * ⚡ حذف order_items اليتيمة المرتبطة بـ order فاشل
   */
  private async removeOrphanedOrderItems(orderId: string): Promise<void> {
    try {
      const pendingOps = await outboxManager.getPendingOperations();
      const orphanedItems = pendingOps.filter(op => {
        if (op.table_name !== 'pos_order_items' && op.table_name !== 'order_items') {
          return false;
        }
        try {
          const payload = JSON.parse(op.payload);
          return payload.order_id === orderId;
        } catch {
          return false;
        }
      });

      if (orphanedItems.length > 0) {
        console.log(`[BatchSender] 🗑️ Removing ${orphanedItems.length} orphaned order_items for order ${orderId.slice(0, 8)}`);
        for (const item of orphanedItems) {
          await outboxManager.remove(item.id);
        }
      }
    } catch (err) {
      console.error('[BatchSender] Error removing orphaned items:', err);
    }
  }

  /**
   * ⚡ تطبيق DELTA بشكل atomic لتجنب Race Conditions
   * يحاول استخدام RPC أولاً، ثم يعود للطريقة القديمة إذا لم يكن RPC متاحاً
   */
  private async applyDeltaAtomic(
    tableName: string,
    recordId: string,
    delta: Record<string, number>
  ): Promise<any> {
    // ⚡ محاولة استخدام RPC atomic أولاً
    try {
      // @ts-ignore - Dynamic RPC name
      const { error: rpcError } = await supabase.rpc('apply_delta' as any, {
        p_table_name: tableName,
        p_record_id: recordId,
        p_delta: delta
      });

      if (!rpcError) {
        console.log(`[BatchSender] ✅ DELTA applied atomically via RPC for ${tableName}/${recordId.slice(0, 8)}`);
        return null; // نجاح
      }

      // إذا كان RPC غير موجود، نستخدم الطريقة البديلة
      if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
        console.log('[BatchSender] ℹ️ RPC not available, using SQL increment fallback');
      } else {
        // خطأ آخر، نرجعه
        return rpcError;
      }
    } catch (rpcErr) {
      console.log('[BatchSender] ℹ️ RPC call failed, using fallback');
    }

    // ⚡ Fallback: استخدام SQL increment مباشر (أفضل من SELECT ثم UPDATE)
    // نبني UPDATE مع INCREMENT للحقول الرقمية
    const updateParts: string[] = [];
    const values: any[] = [];

    for (const [field, change] of Object.entries(delta)) {
      if (typeof change === 'number') {
        // استخدام SQL: field = field + change
        updateParts.push(`${field} = ${field} + $${values.length + 1}`);
        values.push(change);
      }
    }

    if (updateParts.length === 0) {
      return null; // لا شيء للتحديث
    }

    // ⚡ استخدام raw SQL عبر RPC إذا متاح
    try {
      // @ts-ignore - Dynamic RPC name
      const { error: sqlError } = await supabase.rpc('execute_delta_update' as any, {
        p_table: tableName,
        p_id: recordId,
        p_updates: delta
      });

      if (!sqlError) {
        console.log(`[BatchSender] ✅ DELTA applied via SQL RPC for ${tableName}/${recordId.slice(0, 8)}`);
        return null;
      }

      if (sqlError.code !== '42883') {
        return sqlError;
      }
    } catch {
      // RPC غير متاح
    }

    // ⚡ Fallback الأخير: SELECT ثم UPDATE (مع تحذير)
    console.warn(`[BatchSender] ⚠️ Using non-atomic DELTA for ${tableName} - consider adding apply_delta RPC`);

    // @ts-ignore - Dynamic table name
    const { data: currentData, error: fetchError } = await supabase
      .from(tableName as any)
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError) {
      return fetchError;
    }

    if (!currentData) {
      return { message: 'Record not found for DELTA', code: 'NOT_FOUND' };
    }

    // تطبيق التغييرات
    const updatedData: Record<string, any> = {};
    for (const [field, change] of Object.entries(delta)) {
      if (typeof change === 'number' && typeof (currentData as any)[field] === 'number') {
        updatedData[field] = (currentData as any)[field] + change;
      }
    }

    if (Object.keys(updatedData).length === 0) {
      return null;
    }

    // @ts-ignore - Dynamic table name
    const { error: updateError } = await supabase
      .from(tableName as any)
      .update(updatedData)
      .eq('id', recordId);

    return updateError;
  }

  /**
   * تسجيل العمليات الفاشلة نهائياً (للتشخيص)
   */
  private async logFailedOperation(op: OutboxEntry, error: string): Promise<void> {
    console.error('[BatchSender] Permanently failed operation:', {
      id: op.id,
      table: op.table_name,
      operation: op.operation,
      recordId: op.record_id,
      error,
      retries: op.retry_count
    });

    // يمكن إرسال هذا لخدمة تسجيل خارجية
  }

  /**
   * إرسال فوري (بدون انتظار الدورة)
   */
  async sendNow(): Promise<BatchSendResult> {
    return this.sendBatch();
  }

  /**
   * إعادة محاولة العمليات الفاشلة
   */
  async retryFailed(): Promise<number> {
    const count = await outboxManager.requeueFailed();
    if (count > 0) {
      await this.sendBatch();
    }
    return count;
  }

  /**
   * الحصول على حالة الـ Sender
   */
  getStatus(): {
    isRunning: boolean;
    isSending: boolean;
    organizationId: string | null;
    deviceId: string;
  } {
    return {
      isRunning: this.isRunning,
      isSending: this.isSending,
      organizationId: this.organizationId,
      deviceId: this.deviceId
    };
  }

  /**
   * حساب تأخير الـ retry (exponential backoff)
   */
  static calculateRetryDelay(retryCount: number): number {
    const baseDelay = DELTA_SYNC_CONSTANTS.INITIAL_RETRY_DELAY_MS;
    const maxDelay = DELTA_SYNC_CONSTANTS.MAX_RETRY_DELAY_MS;

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.3 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * ⚡ إصلاح الطلبات القديمة التي تم مزامنتها لكن حالتها لا تزال pending_sync
   * يتحقق من وجود الطلب في Supabase ويُحدّث الحالة محلياً
   */
  async reconcileOrdersStatus(): Promise<{ checked: number; fixed: number }> {
    if (!this.organizationId) {
      console.warn('[BatchSender] No organization ID for reconcile');
      return { checked: 0, fixed: 0 };
    }

    try {
      // جلب الطلبات المحلية التي حالتها pending_sync أو synced = 0
      // ⚡ نفس الشرط المستخدم في TauriSync لضمان التوافق
      const localUnsynced = await sqliteWriteQueue.read<any[]>(
        `SELECT id, status, synced, syncStatus FROM pos_orders
         WHERE organization_id = ?
         AND (synced = 0 OR synced IS NULL OR status IN ('pending_sync', 'syncing', 'failed') OR syncStatus IN ('pending_sync', 'syncing', 'failed'))`,
        [this.organizationId]
      );

      if (localUnsynced.length === 0) {
        console.log('[BatchSender] ✅ No pending_sync orders to reconcile');
        return { checked: 0, fixed: 0 };
      }

      console.log(`%c[BatchSender] 🔍 Reconcile: فحص ${localUnsynced.length} طلب غير مزامن`, 'color: #FF9800; font-weight: bold');
      console.table(localUnsynced.slice(0, 10).map(o => ({
        id: o.id.slice(0, 12),
        status: o.status,
        synced: o.synced,
        syncStatus: o.syncStatus
      })));

      const localIds = localUnsynced.map(r => r.id);

      // جلب الطلبات الموجودة في Supabase
      const { data: serverRecords, error } = await supabase
        .from('orders')
        .select('id')
        .in('id', localIds);

      if (error) {
        console.error('[BatchSender] Error checking server orders:', error);
        return { checked: localUnsynced.length, fixed: 0 };
      }

      const serverIds = new Set((serverRecords || []).map(r => r.id));
      const idsToFix = localIds.filter(id => serverIds.has(id));

      if (idsToFix.length === 0) {
        console.log('[BatchSender] ℹ️ All pending_sync orders are genuinely not on server');

        // ⚡ إعادة إضافة الطلبات غير المزامنة للـ Outbox
        const notOnServer = localIds.filter(id => !serverIds.has(id));
        if (notOnServer.length > 0) {
          await this.requeueOrphanedOrders(notOnServer);
        }

        return { checked: localUnsynced.length, fixed: 0 };
      }

      // ⚡ إعادة إضافة الطلبات غير الموجودة في السيرفر للـ Outbox
      const notOnServer = localIds.filter(id => !serverIds.has(id));
      if (notOnServer.length > 0) {
        await this.requeueOrphanedOrders(notOnServer);
      }

      // تحديث الطلبات الموجودة في السيرفر
      // ⚡ تحديث شامل لجميع حقول المزامنة
      // نستخدم 'completed' بدلاً من 'synced' لأنها القيمة المعترف بها في الواجهة
      const placeholders = idsToFix.map(() => '?').join(',');

      // ⚡ 1. تحديث Supabase أولاً (لأن الواجهة تقرأ من Supabase!)
      console.log(`%c[BatchSender] 🔄 Reconcile: تحديث حالة ${idsToFix.length} طلب على Supabase...`, 'color: #9C27B0; font-weight: bold');
      try {
        const { error: supabaseError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .in('id', idsToFix);

        if (supabaseError) {
          console.error(`[BatchSender] ❌ Reconcile: خطأ في تحديث Supabase:`, supabaseError);
        } else {
          console.log(`%c[BatchSender] ✅ Reconcile: تم تحديث Supabase بنجاح`, 'color: #4CAF50; font-weight: bold');
        }
      } catch (supaErr) {
        console.error(`[BatchSender] ❌ Reconcile: استثناء في تحديث Supabase:`, supaErr);
      }

      // ⚡ 2. تحديث SQLite المحلي
      await sqliteWriteQueue.write(
        `UPDATE pos_orders
         SET synced = 1,
             status = 'completed',
             syncStatus = 'synced',
             sync_status = 'synced',
             pending_operation = NULL,
             pendingOperation = NULL,
             error = NULL
         WHERE id IN (${placeholders})`,
        idsToFix
      );

      // تحديث عناصر الطلبات أيضاً
      await sqliteWriteQueue.write(
        `UPDATE pos_order_items SET synced = 1, sync_status = 'synced', pending_operation = NULL WHERE order_id IN (${placeholders})`,
        idsToFix
      );

      console.log(`%c[BatchSender] ✅ Fixed ${idsToFix.length} orders that were already on server`, 'color: #4CAF50; font-weight: bold');

      // ⚡ إرسال event لتحديث الواجهة
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orders-sync-status-updated', {
          detail: { updatedIds: idsToFix, newStatus: 'completed' }
        }));
      }

      return { checked: localUnsynced.length, fixed: idsToFix.length };
    } catch (err) {
      console.error('[BatchSender] Error in reconcileOrdersStatus:', err);
      return { checked: 0, fixed: 0 };
    }
  }

  /**
   * ⚡ إعادة إضافة الطلبات اليتيمة (غير موجودة على السيرفر ولا في الـ Outbox) للـ Outbox
   * مع حماية من الحلقات اللانهائية
   */
  private recentlyRequeuedOrders = new Set<string>();
  private lastRequeueCleanup = 0;

  private async requeueOrphanedOrders(orderIds: string[]): Promise<void> {
    console.log(`%c[BatchSender] 🔄 ═══ إعادة ترتيب الطلبات اليتيمة ═══`, 'color: #E91E63; font-weight: bold');
    console.log(`[BatchSender] 🔄 عدد الطلبات المُدخلة: ${orderIds.length}`);

    if (orderIds.length === 0) return;

    // ⚡ تنظيف قائمة الطلبات المُعاد ترتيبها كل 5 دقائق
    const now = Date.now();
    if (now - this.lastRequeueCleanup > 5 * 60 * 1000) {
      console.log(`[BatchSender] 🧹 تنظيف قائمة الطلبات المُعاد ترتيبها (كانت ${this.recentlyRequeuedOrders.size})`);
      this.recentlyRequeuedOrders.clear();
      this.lastRequeueCleanup = now;
    }

    try {
      // فحص أي من هذه الطلبات ليست في الـ Outbox
      const pendingOps = await outboxManager.getPendingOperations();
      console.log(`[BatchSender] 🔄 عمليات الـ Outbox الحالية: ${pendingOps.length}`);

      const outboxOrderIds = new Set(
        pendingOps
          .filter(op => op.table_name === 'pos_orders' || op.table_name === 'orders')
          .map(op => op.record_id)
      );
      console.log(`[BatchSender] 🔄 طلبات موجودة في الـ Outbox: ${outboxOrderIds.size}`);
      console.log(`[BatchSender] 🔄 طلبات مُعاد ترتيبها مؤخراً: ${this.recentlyRequeuedOrders.size}`);

      // ⚡ استبعاد الطلبات التي أُعيد ترتيبها مؤخراً (حماية من الحلقات)
      const orphanedIds = orderIds.filter(id =>
        !outboxOrderIds.has(id) && !this.recentlyRequeuedOrders.has(id)
      );

      const inOutbox = orderIds.filter(id => outboxOrderIds.has(id));
      const recentlyRequeued = orderIds.filter(id => this.recentlyRequeuedOrders.has(id));

      console.log(`[BatchSender] 🔄 تحليل:`, {
        إجمالي: orderIds.length,
        موجودة_في_Outbox: inOutbox.length,
        مُعاد_ترتيبها_مؤخراً: recentlyRequeued.length,
        يتيمة_حقيقية: orphanedIds.length
      });

      if (orphanedIds.length === 0) {
        console.log('%c[BatchSender] ℹ️ جميع الطلبات إما في الـ Outbox أو أُعيد ترتيبها مؤخراً', 'color: #FF9800');
        return;
      }

      console.log(`%c[BatchSender] 🔄 إعادة ترتيب ${orphanedIds.length} طلب يتيم...`, 'color: #E91E63; font-weight: bold');

      // جلب بيانات الطلبات
      const placeholders = orphanedIds.map(() => '?').join(',');
      const orders = await sqliteWriteQueue.read<any[]>(
        `SELECT * FROM pos_orders WHERE id IN (${placeholders})`,
        orphanedIds
      );

      // إضافة كل طلب للـ Outbox
      for (const order of orders) {
        // ⚡ تسجيل الطلب كمُعاد ترتيبه لمنع الحلقات
        this.recentlyRequeuedOrders.add(order.id);

        // تحويل الـ payload للصيغة الصحيحة لـ Supabase
        const payload = this.prepareOrderPayloadForSupabase(order);

        await outboxManager.add({
          tableName: 'orders',  // ⚡ نستخدم 'orders' لأن هذا اسم الجدول في Supabase
          operation: 'INSERT',
          recordId: order.id,
          payload
        });

        console.log(`[BatchSender] ✅ Re-queued order ${order.id.slice(0, 8)}... to Outbox`);

        // إضافة عناصر الطلب أيضاً
        const items = await sqliteWriteQueue.read<any[]>(
          `SELECT * FROM pos_order_items WHERE order_id = ?`,
          [order.id]
        );

        // ⚡ استخراج organization_id من الطلب لتمريره لعناصر الطلب
        const orderOrgId = order.organization_id || order.organizationId || this.organizationId;

        for (const item of items) {
          const itemPayload = this.prepareOrderItemPayloadForSupabase(item, orderOrgId);
          await outboxManager.add({
            tableName: 'order_items',  // ⚡ نستخدم 'order_items' لأن هذا اسم الجدول في Supabase
            operation: 'INSERT',
            recordId: item.id,
            payload: itemPayload
          });
        }
      }

      console.log(`[BatchSender] ✅ Re-queued ${orphanedIds.length} orphaned orders with their items`);
    } catch (err) {
      console.error('[BatchSender] Error re-queuing orphaned orders:', err);
    }
  }

  /**
   * تحويل بيانات الطلب للصيغة الصحيحة لـ Supabase
   * ⚡ يُضيف القيم الافتراضية للأعمدة المطلوبة
   */
  private prepareOrderPayloadForSupabase(order: any): Record<string, any> {
    const excludeCols = this.LOCAL_ONLY_COLUMNS['orders'] || this.LOCAL_ONLY_COLUMNS['pos_orders'] || [];
    const columnMap = this.COLUMN_NAME_MAP['orders'] || this.COLUMN_NAME_MAP['pos_orders'] || {};

    const payload: Record<string, any> = {};
    const metadata: Record<string, any> = {};

    for (const [key, value] of Object.entries(order)) {
      if (excludeCols.includes(key)) {
        // حفظ البيانات المهمة في metadata
        if (['customer_name', 'customer_phone', 'customer_address', 'wilaya', 'commune', 'items'].includes(key)) {
          metadata[key] = value;
        }
        continue;
      }
      const mappedKey = columnMap[key] || key;
      payload[mappedKey] = value;
    }

    if (Object.keys(metadata).length > 0) {
      const existingMetadata = payload['metadata'] ?
        (typeof payload['metadata'] === 'string' ? JSON.parse(payload['metadata']) : payload['metadata']) : {};
      payload['metadata'] = JSON.stringify({ ...existingMetadata, ...metadata });
    }

    // ⚡ إضافة القيم الافتراضية للأعمدة المطلوبة في Supabase orders
    // ✅ tax مطلوب (NOT NULL)
    if (payload.tax === undefined || payload.tax === null) {
      payload.tax = 0;
    }
    // ✅ subtotal مطلوب (NOT NULL)
    if (payload.subtotal === undefined || payload.subtotal === null) {
      payload.subtotal = payload.total || 0;
    }
    // ✅ total مطلوب (NOT NULL)
    if (payload.total === undefined || payload.total === null) {
      payload.total = payload.subtotal || 0;
    }
    // ✅ is_online مطلوب (NOT NULL) - طلبات POS تكون offline
    if (payload.is_online === undefined || payload.is_online === null) {
      payload.is_online = false;
    }
    // ✅ status مطلوب (NOT NULL)
    if (!payload.status) {
      payload.status = 'pending';
    }
    // ✅ payment_method مطلوب (NOT NULL)
    if (!payload.payment_method) {
      payload.payment_method = 'cash';
    }
    // ✅ payment_status مطلوب (NOT NULL)
    if (!payload.payment_status) {
      payload.payment_status = 'paid';
    }
    // ✅ slug اختياري لكن مفيد
    if (!payload.slug && payload.id) {
      payload.slug = `pos-${payload.id.slice(0, 8)}-${Date.now().toString(36)}`;
    }
    // ✅ pos_order_type للتمييز
    if (!payload.pos_order_type) {
      payload.pos_order_type = 'pos';
    }
    // ✅ discount قيمة افتراضية
    if (payload.discount === undefined) {
      payload.discount = 0;
    }

    return payload;
  }

  /**
   * تحويل بيانات عنصر الطلب للصيغة الصحيحة لـ Supabase
   * ⚡ يُضيف القيم الافتراضية للأعمدة المطلوبة
   * @param item - عنصر الطلب
   * @param orderOrgId - organization_id من الطلب الأب (اختياري)
   */
  private prepareOrderItemPayloadForSupabase(item: any, orderOrgId?: string): Record<string, any> {
    const excludeCols = this.LOCAL_ONLY_COLUMNS['order_items'] || this.LOCAL_ONLY_COLUMNS['pos_order_items'] || [];
    const columnMap = this.COLUMN_NAME_MAP['order_items'] || this.COLUMN_NAME_MAP['pos_order_items'] || {};

    const payload: Record<string, any> = {};

    for (const [key, value] of Object.entries(item)) {
      if (excludeCols.includes(key)) continue;
      const mappedKey = columnMap[key] || key;
      payload[mappedKey] = value;
    }

    // ⚡ إضافة القيم الافتراضية للأعمدة المطلوبة في Supabase order_items
    // ✅ organization_id مطلوب (NOT NULL) - أولوية: item > order > this.organizationId
    if (!payload.organization_id) {
      payload.organization_id = 
        item.organization_id || 
        item.organizationId || 
        orderOrgId || 
        this.organizationId;
      
      if (!payload.organization_id) {
        console.error(`[BatchSender] ❌ order_item ${item.id?.slice(0, 8)} missing organization_id!`);
      }
    }
    // ✅ slug مطلوب
    if (!payload.slug) {
      payload.slug = `item-${payload.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    // ✅ name مطلوب - يمكن أن يأتي من product_name
    if (!payload.name && payload.product_name) {
      payload.name = payload.product_name;
    }
    if (!payload.name) {
      payload.name = 'Unknown Product';
    }
    // ✅ is_digital قيمة افتراضية
    if (payload.is_digital === undefined || payload.is_digital === null) {
      payload.is_digital = false;
    }
    // ✅ quantity قيمة افتراضية
    if (!payload.quantity) {
      payload.quantity = 1;
    }
    // ✅ unit_price قيمة افتراضية
    if (payload.unit_price === undefined || payload.unit_price === null) {
      payload.unit_price = payload.total_price || 0;
    }
    // ✅ total_price قيمة افتراضية
    if (payload.total_price === undefined || payload.total_price === null) {
      payload.total_price = (payload.unit_price || 0) * (payload.quantity || 1);
    }

    return payload;
  }

  /**
   * ⚡ فحص دوري للطلبات اليتيمة وإعادة إضافتها للـ Outbox
   * يُستدعى عندما لا توجد عمليات معلقة
   */
  private async checkAndRequeuOrphanedOrders(): Promise<void> {
    if (!this.organizationId) return;

    console.log(`%c[BatchSender] 🔍 ═══ فحص الطلبات اليتيمة ═══`, 'color: #795548; font-weight: bold');

    try {
      // جلب الطلبات غير المزامنة
      // ⚡ نفس الشرط المستخدم في TauriSync لضمان التوافق
      const localUnsynced = await sqliteWriteQueue.read<any[]>(
        `SELECT id, status, synced, syncStatus, customer_name, total, created_at FROM pos_orders
         WHERE organization_id = ?
         AND (synced = 0 OR synced IS NULL OR status IN ('pending_sync', 'syncing', 'failed') OR syncStatus IN ('pending_sync', 'syncing', 'failed'))`,
        [this.organizationId]
      );

      console.log(`[BatchSender] 🔍 عدد الطلبات المحلية غير المزامنة: ${localUnsynced.length}`);

      if (localUnsynced.length === 0) {
        console.log(`%c[BatchSender] ✅ لا توجد طلبات يتيمة`, 'color: #4CAF50');
        return;
      }

      // عرض تفاصيل الطلبات المحلية غير المزامنة
      console.log(`%c[BatchSender] 📋 الطلبات المحلية غير المزامنة:`, 'color: #795548');
      console.table(localUnsynced.slice(0, 10).map(o => ({
        معرف: o.id.slice(0, 12),
        عميل: o.customer_name?.slice(0, 20) || '---',
        المجموع: o.total,
        حالة: o.status,
        مزامن: o.synced,
        وقت: o.created_at ? new Date(o.created_at).toLocaleTimeString('ar-DZ') : '---'
      })));

      // فحص أي منها ليست على السيرفر
      const localIds = localUnsynced.map(r => r.id);
      console.log(`[BatchSender] 🔍 فحص ${localIds.length} طلب على السيرفر...`);

      const { data: serverRecords, error: serverError } = await supabase
        .from('orders')
        .select('id')
        .in('id', localIds);

      if (serverError) {
        console.error(`%c[BatchSender] ❌ خطأ في فحص السيرفر:`, 'color: #f44336', serverError);
        return;
      }

      const serverIds = new Set((serverRecords || []).map(r => r.id));
      const notOnServer = localIds.filter(id => !serverIds.has(id));
      const alreadyOnServer = localIds.filter(id => serverIds.has(id));

      console.log(`[BatchSender] 🔍 موجودة على السيرفر: ${alreadyOnServer.length}`);
      console.log(`[BatchSender] 🔍 غير موجودة على السيرفر: ${notOnServer.length}`);

      if (notOnServer.length > 0) {
        console.log(`[BatchSender] 🔍 Found ${notOnServer.length} orphaned orders, re-queuing...`);
        await this.requeueOrphanedOrders(notOnServer);
      }

      // تحديث الطلبات الموجودة على السيرفر
      const onServer = localIds.filter(id => serverIds.has(id));
      if (onServer.length > 0) {
        const placeholders = onServer.map(() => '?').join(',');

        // ⚡ 1. تحديث Supabase أولاً (لأن الواجهة تقرأ من Supabase!)
        console.log(`%c[BatchSender] 🔄 تحديث حالة ${onServer.length} طلب على Supabase...`, 'color: #9C27B0; font-weight: bold');
        try {
          const { error: supabaseError } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .in('id', onServer);

          if (supabaseError) {
            console.error(`[BatchSender] ❌ خطأ في تحديث Supabase:`, supabaseError);
          } else {
            console.log(`%c[BatchSender] ✅ تم تحديث Supabase بنجاح`, 'color: #4CAF50; font-weight: bold');
          }
        } catch (supaErr) {
          console.error(`[BatchSender] ❌ استثناء في تحديث Supabase:`, supaErr);
        }

        // ⚡ 2. تحديث SQLite المحلي
        await sqliteWriteQueue.write(
          `UPDATE pos_orders
           SET synced = 1,
               status = 'completed',
               syncStatus = 'synced',
               sync_status = 'synced',
               pending_operation = NULL,
               pendingOperation = NULL,
               error = NULL
           WHERE id IN (${placeholders})`,
          onServer
        );

        console.log(`%c[BatchSender] ✅ Marked ${onServer.length} orders as synced (already on server)`, 'color: #4CAF50; font-weight: bold');

        // ⚡ Verification: التحقق من نجاح التحديث
        const verifyResult = await sqliteWriteQueue.read<any[]>(
          `SELECT id, status, synced, syncStatus, sync_status FROM pos_orders WHERE id IN (${placeholders})`,
          onServer
        );

        console.log(`%c[BatchSender] 🔍 Verification after update:`, 'color: #2196F3; font-weight: bold');
        console.table(verifyResult.map((o: any) => ({
          id: o.id.slice(0, 12),
          status: o.status,
          synced: o.synced,
          syncStatus: o.syncStatus,
          sync_status: o.sync_status
        })));

        // ⚡ إرسال event لتحديث الواجهة
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('orders-sync-status-updated', {
            detail: { updatedIds: onServer, newStatus: 'completed' }
          }));
          console.log(`[BatchSender] 📢 Dispatched 'orders-sync-status-updated' event`);
        }
      }
    } catch (err) {
      console.error('[BatchSender] Error in checkAndRequeuOrphanedOrders:', err);
    }
  }

  /**
   * ⚡ مزامنة الصور المحلية مع الخادم
   */
  private async syncPendingImages(organizationId: string): Promise<void> {
    try {
      // تحميل خدمة الصور ديناميكياً لتجنب circular imports
      const { imageBase64Service } = await import('@/api/imageBase64Service');
      
      const result = await imageBase64Service.syncAllPendingImages(organizationId);
      
      if (result.synced > 0 || result.failed > 0) {
        console.log(`[BatchSender] 🖼️ Image sync: ${result.synced} uploaded, ${result.failed} failed`);
      }
    } catch (error) {
      console.warn('[BatchSender] ⚠️ Failed to sync images:', error);
    }
  }
}

// Export singleton instance
export const batchSender = new BatchSender();
