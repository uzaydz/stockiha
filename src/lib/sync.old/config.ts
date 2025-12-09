/**
 * ⚡ Unified Sync Configuration
 * إعدادات المزامنة الموحدة - 100% متوافقة مع Supabase
 *
 * ✅ القواعد الأساسية:
 * 1. جميع الأسماء snake_case - لا camelCase
 * 2. أسماء الجداول متطابقة 100% مع Supabase
 * 3. لا TABLE_MAP - الأسماء موحدة
 * 4. لا COLUMN_MAP - الأسماء موحدة
 * 5. الأعمدة المحلية تبدأ بـ _ (underscore)
 *
 * @version 2.0.0 - Unified Schema
 */

// ============================================================
// ⚡ جداول المزامنة - بالترتيب الصحيح للتبعيات
// ============================================================

/**
 * ⚡ الجداول المستقلة (يمكن مزامنتها بالتوازي)
 * هذه الجداول لا تعتمد على جداول أخرى
 */
export const INDEPENDENT_TABLES = [
    'products',
    'product_categories',
    'product_subcategories',
    'customers',
    'suppliers',
    'expense_categories',
    'pos_settings',
    'organization_settings',
] as const;

/**
 * ⚡ الجداول المعتمدة (يجب مزامنتها بالتسلسل بعد المستقلة)
 * هذه الجداول تعتمد على جداول أخرى
 */
export const DEPENDENT_TABLES = [
    // منتجات (تعتمد على products)
    'product_colors',
    'product_sizes',
    'product_images',
    'product_advanced_settings',
    'product_marketing_settings',
    'product_wholesale_tiers',

    // طلبيات (تعتمد على customers, products)
    'orders',           // ✅ اسم Supabase الموحد
    'order_items',      // ✅ اسم Supabase الموحد

    // فواتير
    'invoices',
    'invoice_items',

    // مرتجعات
    'returns',          // ✅ اسم Supabase الموحد (كان product_returns)
    'return_items',

    // خسائر
    'losses',           // ✅ اسم Supabase الموحد (كان loss_declarations)
    'loss_items',

    // مصروفات
    'expenses',
    'recurring_expenses',

    // موردين
    'supplier_contacts',
    'supplier_purchases',
    'supplier_purchase_items',
    'supplier_payments',

    // جلسات العمل
    'staff_work_sessions', // ✅ اسم Supabase الموحد (كان work_sessions)

    // إصلاحات
    'repair_orders',
] as const;

/**
 * ⚡ جميع الجداول المتزامنة
 */
export const SYNCED_TABLES = [
    ...INDEPENDENT_TABLES,
    ...DEPENDENT_TABLES,
] as const;

/**
 * ⚡ الجداول المحلية فقط (لا تُزامن مع السيرفر)
 */
export const LOCAL_ONLY_TABLES = [
    'sync_outbox',           // صندوق الصادر
    'sync_state',            // حالة المزامنة
    'sync_queue',            // قائمة انتظار قديمة
    'cached_images',         // صور مُخزّنة
    'cached_notifications',  // إشعارات مُخزّنة
    'app_license_state',     // حالة الترخيص
    'staff_pins',            // أرقام PIN للموظفين
    'user_credentials',      // بيانات الاعتماد
    'customer_debts',        // محسوبة من الطلبات
    'customer_debt_payments', // متابعة محلية
    'printer_settings',      // إعدادات الطابعة
    'device_settings',       // إعدادات الجهاز
    'repair_images',         // يتم رفعها للتخزين منفصلاً
] as const;

// ============================================================
// ⚡ إعدادات الجداول
// ============================================================

/**
 * ⚡ جداول لا تحتوي على organization_id
 * هذه جداول فرعية تنتمي لجداول أخرى
 */
export const NO_ORG_ID_TABLES = [
    'product_colors',
    'product_sizes',
    'product_images',
    'product_advanced_settings',
    'product_marketing_settings',
    'product_wholesale_tiers',
    'invoice_items',
    'return_items',
    'loss_items',
    'supplier_purchase_items',
    'supplier_contacts',
    // لا تحتوي على organization_id في Supabase - تعتمد على expense.organization_id
    'recurring_expenses',
] as const;

/**
 * ⚡ جداول تستخدم created_at بدلاً من updated_at للمزامنة
 * عادةً الجداول التي لا تُحدّث بعد الإنشاء
 */
export const TIMESTAMP_OVERRIDES: Record<string, string> = {
    'order_items': 'created_at',
    'invoice_items': 'created_at',
    'return_items': 'created_at',
    'loss_items': 'created_at',
    'supplier_purchase_items': 'created_at',
    'product_colors': 'created_at',
    'product_sizes': 'created_at',
    'product_images': 'created_at',
};

/**
 * ⚡ جداول تستخدم مفتاح رئيسي مختلف عن id
 */
export const PRIMARY_KEY_OVERRIDES: Record<string, string> = {
    'product_advanced_settings': 'product_id',
    'sync_state': 'table_name',
};

// ============================================================
// ⚡ إعدادات الأداء والتوقيت
// ============================================================

/**
 * ⚡ إعدادات حجم الدُفعات
 * 
 * ⚠️ CRITICAL FIX: إضافة INTERVAL_MS و IDLE_INTERVAL_MS و DEFAULT_SIZE
 * كانت هذه القيم مفقودة مما أدى إلى undefined → setTimeout(0ms) → حلقة جنونية!
 */
export const BATCH_CONFIG = {
    /** حجم الدُفعة للإرسال */
    PUSH_BATCH_SIZE: 50,
    /** حجم الدُفعة للسحب */
    PULL_BATCH_SIZE: 1000,
    /** حجم الدُفعة للإدراج المحلي */
    LOCAL_INSERT_BATCH_SIZE: 100,
    /** حجم الدُفعة الافتراضي (مستخدم في PushEngine) */
    DEFAULT_SIZE: 50,
    
    // ⚡ CRITICAL: فترات التأخير - كانت مفقودة وتسببت في "هجوم DDoS ذاتي"!
    /** الفترة بين دُفعات الإرسال عند وجود عمليات معلقة (ميلي ثانية) */
    INTERVAL_MS: 3000,      // 3 ثواني
    /** الفترة بين دُفعات الإرسال عند الخمول (ميلي ثانية) */
    IDLE_INTERVAL_MS: 30000, // 30 ثانية
};

/**
 * ⚡ إعدادات التوقيت
 */
export const SYNC_TIMING = {
    /** الفترة بين دُفعات الإرسال (ميلي ثانية) */
    BATCH_INTERVAL_MS: 3000,
    /** الفترة في حالة الخمول (ميلي ثانية) */
    IDLE_INTERVAL_MS: 30000,
    /** الفترة عند النشاط (ميلي ثانية) */
    ACTIVE_INTERVAL_MS: 5000,
    /** مهلة العملية الواحدة (ميلي ثانية) */
    OPERATION_TIMEOUT_MS: 30000,

    // ⚡ إعدادات الجدولة الذكية (مطلوبة لـ SyncManager)
    /** فترة المزامنة عند النشاط (ميلي ثانية) */
    ACTIVE_INTERVAL: 2 * 60 * 1000,    // 2 دقيقة
    /** فترة المزامنة عند الخمول (ميلي ثانية) */
    IDLE_INTERVAL: 5 * 60 * 1000,      // 5 دقائق
    /** فترة المزامنة عند عدم النشاط (ميلي ثانية) */
    INACTIVE_INTERVAL: 15 * 60 * 1000, // 15 دقيقة
    /** عتبة الخمول (ميلي ثانية) */
    IDLE_THRESHOLD: 60 * 1000,         // دقيقة
    /** عتبة عدم النشاط (ميلي ثانية) */
    INACTIVE_THRESHOLD: 5 * 60 * 1000, // 5 دقائق
};

/**
 * ⚡ إعدادات إعادة المحاولة
 */
export const RETRY_CONFIG = {
    /** أقصى عدد محاولات */
    MAX_ATTEMPTS: 5,
    /** التأخير الأساسي (ميلي ثانية) */
    BASE_DELAY_MS: 1000,
    /** أقصى تأخير (ميلي ثانية) */
    MAX_DELAY_MS: 30000,
    /** عامل التأخير الأسي */
    EXPONENTIAL_FACTOR: 2,
};

/**
 * ⚡ إعدادات Circuit Breaker
 */
export const CIRCUIT_BREAKER = {
    /** عتبة الفشل لفتح الدائرة */
    FAILURE_THRESHOLD: 5,
    /** مدة الانتظار قبل نصف الفتح (ميلي ثانية) */
    RESET_TIMEOUT_MS: 60000,
    /** عدد النجاحات المطلوبة لإغلاق الدائرة */
    SUCCESS_THRESHOLD: 2,
};

// ============================================================
// ⚡ حالات وعمليات المزامنة
// ============================================================

/**
 * ⚡ حالات عناصر الـ Outbox
 */
export const OUTBOX_STATUS = {
    PENDING: 'pending',
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed',
    FK_WAITING: 'fk_waiting', // انتظار الجدول الأب
} as const;

/**
 * ⚡ أنواع العمليات
 */
export const SYNC_OPERATIONS = {
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    DELTA: 'DELTA',
} as const;

/**
 * ⚡ Type definitions for OutboxStatus and SyncOperation
 */
export type OutboxStatus = typeof OUTBOX_STATUS[keyof typeof OUTBOX_STATUS];
export type SyncOperation = typeof SYNC_OPERATIONS[keyof typeof SYNC_OPERATIONS];

// ============================================================
// ⚡ CRITICAL FIX: نظام Hooks/Middleware لتعميم المحرك
// ============================================================

/**
 * ⚡ Table Hook - معالجة مخصصة للجداول قبل الإرسال
 * يسمح بإخراج منطق الأعمال الخاص من داخل المحرك
 */
export interface TableHook {
    /**
     * التحقق من payload وإصلاحه قبل الإرسال
     * @returns true إذا كان payload صالح/قابل للإصلاح، false إذا كان يجب تخطيه
     */
    validateAndFix?: (tableName: string, payload: Record<string, any>) => boolean | { valid: boolean; fixedPayload?: Record<string, any> };
    
    /**
     * معالجة مخصصة قبل الإرسال
     */
    beforeSend?: (tableName: string, payload: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>;
    
    /**
     * معالجة مخصصة بعد النجاح
     */
    afterSuccess?: (tableName: string, recordId: string, payload: Record<string, any>) => void | Promise<void>;
    
    /**
     * معالجة مخصصة بعد الفشل
     */
    afterFailure?: (tableName: string, recordId: string, error: any, payload: Record<string, any>) => void | Promise<void>;
}

/**
 * ⚡ Table Hooks Registry - تسجيل Hooks مخصصة للجداول
 */
const tableHooks = new Map<string, TableHook>();

/**
 * ⚡ تسجيل Hook لجدول معين
 */
export function registerTableHook(tableName: string, hook: TableHook): void {
    tableHooks.set(tableName, hook);
    console.log(`[SyncConfig] ✅ Registered hook for table: ${tableName}`);
}

/**
 * ⚡ الحصول على Hook لجدول معين
 */
export function getTableHook(tableName: string): TableHook | undefined {
    return tableHooks.get(tableName);
}

/**
 * ⚡ تهيئة Hooks الافتراضية للجداول الشائعة
 */
export function initializeDefaultHooks(): void {
    // ⚡ Phase 4: Hook لجدول orders - تحسين تغطية الحقول الحقيقية مع defaults صحيحة
    registerTableHook('orders', {
        validateAndFix: (tableName: string, payload: Record<string, any>) => {
            // ⚡ Phase 4: إصلاح أسماء الحقول المالية (amount_paid vs paid_amount)
            // Supabase يستخدم amount_paid، لكن الكود المحلي قد يستخدم paid_amount
            if (payload.paid_amount !== undefined && payload.amount_paid === undefined) {
                payload.amount_paid = payload.paid_amount;
                delete payload.paid_amount;
            }
            
            // ⚡ Phase 4: إصلاح أسماء الحقول الأخرى
            // total_amount → total
            if (payload.total_amount !== undefined && payload.total === undefined) {
                payload.total = payload.total_amount;
            }
            // tax_amount → tax
            if (payload.tax_amount !== undefined && payload.tax === undefined) {
                payload.tax = payload.tax_amount;
            }
            // discount_amount → discount
            if (payload.discount_amount !== undefined && payload.discount === undefined) {
                payload.discount = payload.discount_amount;
            }
            // shipping_amount → shipping_cost
            if (payload.shipping_amount !== undefined && payload.shipping_cost === undefined) {
                payload.shipping_cost = payload.shipping_amount;
            }
            // staff_id → employee_id
            if (payload.staff_id !== undefined && payload.employee_id === undefined) {
                payload.employee_id = payload.staff_id;
            }
            
            // ⚡ Phase 4: ضمان defaults صحيحة لجميع الحقول المالية المطلوبة
            // subtotal: يجب أن يكون موجوداً دائماً (يُحسب من items إذا لم يُحدد)
            if (payload.subtotal === undefined || payload.subtotal === null) {
                payload.subtotal = payload.total || 0;
            }
            // discount: افتراضي 0
            if (payload.discount === undefined || payload.discount === null) {
                payload.discount = 0;
            }
            // tax: افتراضي 0
            if (payload.tax === undefined || payload.tax === null) {
                payload.tax = 0;
            }
            // total: حساب تلقائي إذا لم يُحدد (subtotal - discount + tax)
            if (payload.total === undefined || payload.total === null) {
                const subtotal = Number(payload.subtotal || 0);
                const discount = Number(payload.discount || 0);
                const tax = Number(payload.tax || 0);
                payload.total = Math.max(0, subtotal - discount + tax);
            }
            // amount_paid: افتراضي total إذا لم يُحدد
            if (payload.amount_paid === undefined || payload.amount_paid === null) {
                payload.amount_paid = payload.total || 0;
            }
            // remaining_amount: حساب تلقائي إذا لم يُحدد
            if (payload.remaining_amount === undefined || payload.remaining_amount === null) {
                const total = Number(payload.total || 0);
                const paid = Number(payload.amount_paid || 0);
                payload.remaining_amount = Math.max(0, total - paid);
            }
            // payment_method: افتراضي 'cash'
            if (!payload.payment_method || payload.payment_method === '') {
                payload.payment_method = 'cash';
            }
            // payment_status: افتراضي 'paid' إذا كان remaining_amount = 0، وإلا 'partial'
            if (!payload.payment_status || payload.payment_status === '') {
                const remaining = Number(payload.remaining_amount || 0);
                payload.payment_status = remaining === 0 ? 'paid' : 'partial';
            }
            // status: افتراضي 'completed'
            if (!payload.status || payload.status === '') {
                payload.status = 'completed';
            }
            // is_online: افتراضي false
            if (payload.is_online === undefined || payload.is_online === null) {
                payload.is_online = false;
            }
            
            // ⚡ Phase 4: إزالة الحقول المحلية التي لا توجد في Supabase
            // هذه الحقول تمت فلترتها بالفعل في filterLocalColumns، لكن نتحقق مرة أخرى
            const localFields = ['synced', 'sync_status', 'pending_operation', 'local_updated_at', 
                                 'local_created_at', 'server_created_at', 'error', 'last_sync_attempt',
                                 'order_number', 'local_order_number', 'customer_name', 'customer_phone',
                                 'customer_email', 'customer_address', 'wilaya', 'commune', 
                                 'tracking_number', 'shipping_company', 'staff_id', 'work_session_id',
                                 'remote_order_id', 'remote_customer_order_number', 'receipt_printed',
                                 'source', 'channel', 'message', 'payload', 'pending_updates',
                                 'extra_fields', 'created_at_ts', 'local_order_number_str'];
            
            for (const field of localFields) {
                if (field in payload) {
                    delete payload[field];
                }
            }
            
            return true; // Valid
        }
    });

    // ⚡ CRITICAL FIX: Hook لجدول staff_work_sessions - إصلاح مشكلة staff_id المفقود
    registerTableHook('staff_work_sessions', {
        validateAndFix: (tableName: string, payload: Record<string, any>) => {
            const recordId = payload.id || 'unknown';
            const recordIdShort = typeof recordId === 'string' && recordId.length > 8 ? recordId.slice(0, 8) : String(recordId);
            
            // ⚡ CRITICAL: التحقق من وجود staff_id (مطلوب في Supabase)
            // قد تكون البيانات المحلية تحتوي على employee_id بدلاً من staff_id
            if (!payload.staff_id || payload.staff_id === '' || payload.staff_id === null) {
                // محاولة استخدام employee_id إذا كان موجوداً
                if (payload.employee_id && payload.employee_id !== '' && payload.employee_id !== null) {
                    console.log(`[TableHook] 🔧 Converting employee_id to staff_id for session ${recordIdShort}`);
                    payload.staff_id = payload.employee_id;
                    delete payload.employee_id;
                } else {
                    // إذا لم يكن هناك staff_id أو employee_id، لا يمكن إصلاحه - تخطي العملية
                    // ⚡ ملاحظة: البيانات يجب أن تُصلح في DeltaWriteService قبل إضافتها إلى Outbox
                    console.error(`[TableHook] ❌ Skipping staff_work_session ${recordIdShort} - missing staff_id`);
                    console.error(`[TableHook] ❌ Payload keys:`, Object.keys(payload));
                    return false; // Skip permanently
                }
            }
            
            // ⚡ إزالة employee_id إذا كان موجوداً (Supabase يستخدم staff_id فقط)
            if (payload.employee_id !== undefined) {
                delete payload.employee_id;
            }
            
            // ⚡ إزالة employee_name إذا كان موجوداً (Supabase يستخدم staff_name فقط)
            if (payload.employee_name !== undefined && !payload.staff_name) {
                payload.staff_name = payload.employee_name;
                delete payload.employee_name;
            }
            
            // ⚡ ضمان وجود staff_name (مطلوب في Supabase)
            if (!payload.staff_name || payload.staff_name === '' || payload.staff_name === null) {
                payload.staff_name = 'موظف غير معروف'; // قيمة افتراضية
            }
            
            // ⚡ إزالة الحقول المحلية التي لا توجد في Supabase
            const localFields = ['synced', 'sync_status', 'pending_operation', 'local_updated_at',
                                 'local_created_at', 'server_created_at', 'error', 'last_sync_attempt',
                                 'employee_id', 'employee_name', 'extra_fields'];
            
            for (const field of localFields) {
                if (field in payload) {
                    delete payload[field];
                }
            }
            
            return true; // Valid
        }
    });

    // ⚡ Phase 4: Hook لجدول order_items - تحسين تغطية الحقول الحقيقية مع defaults صحيحة
    registerTableHook('order_items', {
        validateAndFix: (tableName: string, payload: Record<string, any>) => {
            // ⚡ Phase 4: الحقول المطلوبة - لا يمكن إصلاحها إذا كانت مفقودة
            if (!payload.order_id) {
                console.warn(`[TableHook] ⚠️ Skipping order_item ${payload.id} - no order_id (orphan)`);
                return false; // Skip
            }
            if (!payload.product_id) {
                console.warn(`[TableHook] ⚠️ Skipping order_item ${payload.id} - no product_id`);
                return false; // Skip
            }
            
            // ⚡ Phase 4: ضمان وجود الحقول المطلوبة مع defaults صحيحة
            // quantity: يجب أن يكون موجوداً دائماً (افتراضي 1)
            if (payload.quantity === undefined || payload.quantity === null || payload.quantity === 0) {
                payload.quantity = 1;
            }
            // unit_price: يجب أن يكون موجوداً دائماً (افتراضي 0)
            if (payload.unit_price === undefined || payload.unit_price === null) {
                payload.unit_price = 0;
            }
            // total_price: حساب تلقائي إذا لم يُحدد (quantity × unit_price)
            if (payload.total_price === undefined || payload.total_price === null) {
                const quantity = Number(payload.quantity || 1);
                const unitPrice = Number(payload.unit_price || 0);
                payload.total_price = quantity * unitPrice;
            }
            
            // ⚡ Phase 4: إصلاح أسماء الحقول (subtotal → total_price)
            // Supabase يستخدم total_price، لكن الكود المحلي قد يستخدم subtotal
            if (payload.subtotal !== undefined && payload.total_price === undefined) {
                payload.total_price = payload.subtotal;
            }
            
            // ⚡ Phase 4: إصلاح الحقول الأخرى المفقودة
            if (!payload.name || payload.name === '') {
                payload.name = payload.product_name || 'منتج';
            }
            if (!payload.slug || payload.slug === '') {
                payload.slug = `item-${payload.id || Date.now()}`;
            }
            
            // ⚡ Phase 4: ضمان أن product_name موجود (يُستخدم في Supabase)
            if (!payload.product_name || payload.product_name === '') {
                payload.product_name = payload.name || 'منتج';
            }
            
            // ⚡ Phase 4: إزالة الحقول المحلية التي لا توجد في Supabase
            const localFields = ['synced', 'sync_status', 'pending_operation', 'local_updated_at',
                                 'subtotal', 'discount']; // subtotal و discount محلية فقط
            
            for (const field of localFields) {
                if (field in payload) {
                    delete payload[field];
                }
            }
            
            return true; // Valid
        }
    });

    console.log('[SyncConfig] ✅ Default hooks initialized');
}

// ⚡ تهيئة Hooks الافتراضية عند تحميل الوحدة
if (typeof window !== 'undefined') {
    initializeDefaultHooks();
}

// ============================================================
// ⚡ دوال مساعدة
// ============================================================

/**
 * ⚡ أعمدة محلية إضافية (لا تبدأ بـ _ لكنها محلية فقط)
 * هذه الأعمدة موجودة في SQLite المحلي لكن ليست في Supabase
 *
 * 📋 أعمدة Supabase orders (32 عمود):
 * id, customer_id, subtotal, tax, discount, total, status, payment_method,
 * payment_status, shipping_address_id, shipping_method, shipping_cost, notes,
 * is_online, employee_id, created_at, updated_at, organization_id, slug,
 * customer_order_number, amount_paid, remaining_amount, consider_remaining_as_partial,
 * metadata, pos_order_type, completed_at, customer_notes, admin_notes,
 * call_confirmation_status_id, global_order_number, created_by_staff_id, created_by_staff_name
 */
const EXTRA_LOCAL_COLUMNS = [
    // ============================================================
    // 🔄 أعمدة المزامنة المحلية (بدون underscore prefix)
    // ============================================================
    'synced',               // عمود المزامنة القديم (بدون _)
    'sync_status',          // حالة المزامنة القديمة
    'pending_operation',    // العملية المعلقة القديمة
    'local_updated_at',     // تاريخ التحديث المحلي
    'local_created_at',     // تاريخ الإنشاء المحلي
    'server_created_at',    // تاريخ الإنشاء على السيرفر (محلي للتتبع)
    'last_sync_attempt',    // آخر محاولة مزامنة
    'error',                // رسالة الخطأ المحلية
    'created_at_ts',        // timestamp محلي للطلبات

    // camelCase versions للمزامنة
    'syncStatus',
    'pendingOperation',
    'localUpdatedAt',
    'localCreatedAt',
    'serverCreatedAt',
    'lastSyncAttempt',

    // ============================================================
    // 🔍 أعمدة البحث المحلي (للفهرسة السريعة)
    // ============================================================
    'name_lower',
    'sku_lower',
    'barcode_lower',
    'phone_digits',
    'email_lower',
    'customer_name_lower',
    'device_type_lower',
    'customerNameLower',

    // ============================================================
    // 📋 أعمدة orders المحلية (غير موجودة في Supabase)
    // ============================================================

    // 🆔 أرقام محلية
    'order_number',         // رقم الطلب المحلي (Supabase يستخدم customer_order_number أو global_order_number)
    'local_order_number',   // رقم الطلب المحلي
    'local_order_number_str', // رقم الطلب المحلي (نصي)
    'orderNumber',
    'localOrderNumber',
    'localOrderNumberStr',
    'remote_order_id',      // ID الطلب على السيرفر (للتتبع المحلي)
    'remote_customer_order_number', // رقم طلب العميل من السيرفر
    'remoteOrderId',
    'remoteCustomerOrderNumber',

    // 💰 أعمدة مالية بديلة (Supabase يستخدم أسماء مختلفة)
    'total_amount',         // ❌ Supabase يستخدم 'total'
    'paid_amount',          // ❌ Supabase يستخدم 'amount_paid' (NOT 'paid_amount')
    'tax_amount',           // ❌ Supabase يستخدم 'tax'
    'discount_amount',      // ❌ Supabase يستخدم 'discount'
    'shipping_amount',      // ❌ Supabase يستخدم 'shipping_cost'
    'totalAmount',
    'paidAmount',
    'taxAmount',
    'discountAmount',
    'shippingAmount',
    'amountPaid',           // camelCase version (Supabase uses amount_paid)
    'remainingAmount',

    // 👤 بيانات العميل المحلية (Supabase يستخدم customer_id فقط)
    'customer_name',
    'customer_address',
    'customer_phone',
    'customer_email',
    'customer_nif',         // للفواتير فقط
    'customer_rc',          // للفواتير فقط
    'customerName',
    'customerAddress',
    'customerPhone',
    'customerEmail',
    'customerNif',
    'customerRc',

    // 📍 العنوان المحلي (Supabase يستخدم shipping_address_id)
    'wilaya',               // ولاية - محلي فقط
    'commune',              // بلدية - محلي فقط
    'province',             // محافظة - محلي فقط
    'municipality',         // بلدية - في addresses table فقط

    // 👨‍💼 بيانات الموظف المحلية
    // ⚡ CRITICAL FIX: إزالة 'staff_id' من هنا - إنه عمود صالح في Supabase staff_work_sessions!
    // 'staff_id' فقط محلي في جدول orders (Supabase يستخدم employee_id أو created_by_staff_id)
    // لكن في staff_work_sessions، staff_id هو العمود الرسمي
    'staffId',
    'work_session_id',      // جلسة العمل - محلي فقط
    'workSessionId',

    // 📦 الشحن المحلي
    'tracking_number',      // رقم التتبع - محلي فقط
    'shipping_company',     // شركة الشحن - محلي فقط
    'trackingNumber',
    'shippingCompany',

    // 📝 بيانات إضافية محلية
    'extra_fields',         // حقول إضافية محلية
    'message',              // رسالة محلية
    'payload',              // بيانات إضافية
    'pending_updates',      // تحديثات معلقة
    'source',               // مصدر الطلب - محلي فقط
    'channel',              // قناة الطلب - محلي فقط
    'receipt_printed',      // هل تم طباعة الإيصال
    'pendingUpdates',
    'receiptPrinted',

    // camelCase للتوافق مع البيانات القادمة
    'customerId',
    'paymentMethod',
    'paymentStatus',
    'shippingAddressId',
    'shippingMethod',
    'shippingCost',
    'employeeId',
    'organizationId',
    'customerOrderNumber',
    'considerRemainingAsPartial',
    'posOrderType',
    'completedAt',
    'customerNotes',
    'adminNotes',
    'callConfirmationStatusId',
    'globalOrderNumber',
    'createdByStaffId',
    'createdByStaffName',
    'isOnline',
    'createdAt',
    'updatedAt',

    // ============================================================
    // 📦 أعمدة order_items المحلية (غير موجودة في Supabase)
    // ============================================================
    'subtotal',             // ❌ Supabase يستخدم total_price
    'discount',             // ❌ في order_items المحلي فقط

    // ============================================================
    // 🔗 العلاقات المحلية (Objects/Arrays)
    // ============================================================
    'items',                // عناصر الطلب (array)
    'order_items',          // عناصر الطلب (array)
    'customer',             // كائن العميل
    'product',              // كائن المنتج
    'staff',                // كائن الموظف
    'local_id',             // معرف محلي
];

/**
 * ⚡ تحويل أسماء الأعمدة من المحلي لـ Supabase
 * يُستخدم عند إرسال البيانات
 *
 * ⚡ CRITICAL FIX: تحويل staff_id فقط لجدول orders، وليس staff_work_sessions
 */
export const COLUMN_MAPPINGS: Record<string, string> = {
    // 💰 المالية - أسماء مختلفة تماماً
    'total_amount': 'total',
    'paid_amount': 'amount_paid',
    'tax_amount': 'tax',
    'discount_amount': 'discount',
    'shipping_amount': 'shipping_cost',
    // 👨‍💼 الموظف - فقط لجدول orders (انظر TABLE_SPECIFIC_COLUMN_MAPPINGS)
    // 'staff_id': 'employee_id', // تم نقله إلى TABLE_SPECIFIC_COLUMN_MAPPINGS
};

/**
 * ⚡ تحويلات خاصة بالجداول
 * هذه التحويلات تطبق فقط على جداول محددة
 */
export const TABLE_SPECIFIC_COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
    'orders': {
        'staff_id': 'employee_id',  // في orders، staff_id يصبح employee_id أو created_by_staff_id
    },
    // staff_work_sessions تستخدم staff_id مباشرة - لا تحويل مطلوب
};

/**
 * ⚡ تحويل camelCase لـ snake_case
 */
function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * ⚡ أعمدة Supabase orders الصالحة (32 عمود)
 * أي عمود غير موجود هنا سيتم إزالته
 */
const VALID_SUPABASE_ORDER_COLUMNS = new Set([
    'id', 'customer_id', 'subtotal', 'tax', 'discount', 'total', 'status',
    'payment_method', 'payment_status', 'shipping_address_id', 'shipping_method',
    'shipping_cost', 'notes', 'is_online', 'employee_id', 'created_at', 'updated_at',
    'organization_id', 'slug', 'customer_order_number', 'amount_paid',
    'remaining_amount', 'consider_remaining_as_partial', 'metadata',
    'pos_order_type', 'completed_at', 'customer_notes', 'admin_notes',
    'call_confirmation_status_id', 'global_order_number', 'created_by_staff_id',
    'created_by_staff_name'
]);

/**
 * ⚡ أعمدة Supabase order_items الصالحة (34 عمود)
 */
const VALID_SUPABASE_ORDER_ITEMS_COLUMNS = new Set([
    'id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price',
    'total_price', 'is_digital', 'organization_id', 'slug', 'name', 'is_wholesale',
    'original_price', 'created_at', 'variant_info', 'color_id', 'size_id',
    'color_name', 'size_name', 'variant_display_name', 'sale_type',
    'selling_unit_type', 'weight_sold', 'weight_unit', 'price_per_weight_unit',
    'meters_sold', 'price_per_meter', 'boxes_sold', 'units_per_box', 'box_price',
    'batch_id', 'batch_number', 'expiry_date', 'serial_numbers'
]);

/**
 * ⚡ فلترة الأعمدة المحلية
 * يُستخدم قبل إرسال البيانات لـ Supabase
 *
 * يقوم بـ:
 * 1. إزالة الأعمدة التي تبدأ بـ _ (underscore)
 * 2. إزالة الأعمدة المحلية الإضافية (EXTRA_LOCAL_COLUMNS)
 * 3. تحويل أسماء الأعمدة المختلفة (COLUMN_MAPPINGS)
 *
 * @param tableName - اسم الجدول للتحقق من الأعمدة الصالحة (اختياري)
 */
export function filterLocalColumns<T extends Record<string, any>>(
    data: T,
    tableName?: string
): Partial<T> {
    const filtered: Record<string, any> = {};

    // ⚡ DEBUG للجلسات فقط
    if (tableName === 'staff_work_sessions') {
        console.log(`[filterLocalColumns] 🔍 DEBUG: Input data for staff_work_sessions:`, {
            keys: Object.keys(data),
            staff_id: data.staff_id,
            staff_name: data.staff_name
        });
    }

    for (const [key, value] of Object.entries(data)) {
        // تجاهل الأعمدة التي تبدأ بـ _
        if (key.startsWith('_')) {
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 Skipping ${key}: starts with _`);
            }
            continue;
        }

        // تجاهل الأعمدة المحلية الإضافية
        if (EXTRA_LOCAL_COLUMNS.includes(key)) {
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 Skipping ${key}: in EXTRA_LOCAL_COLUMNS`);
            }
            continue;
        }

        // تجاهل القيم undefined و null
        if (value === undefined || value === null) {
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 Skipping ${key}: value is ${value}`);
            }
            continue;
        }

        // تجاهل الكائنات والمصفوفات (العلاقات)
        if (typeof value === 'object' && !Array.isArray(value)) continue;
        if (Array.isArray(value)) continue;

        // تحويل اسم العمود إذا لزم الأمر
        let finalKey = key;

        // 1. تحويل الأسماء الخاصة بالجدول أولاً (أعلى أولوية)
        if (tableName && TABLE_SPECIFIC_COLUMN_MAPPINGS[tableName]?.[key]) {
            finalKey = TABLE_SPECIFIC_COLUMN_MAPPINGS[tableName][key];
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 Table-specific mapping: ${key} → ${finalKey}`);
            }
        }
        // 2. تحويل الأسماء المختلفة العامة
        else if (COLUMN_MAPPINGS[key]) {
            finalKey = COLUMN_MAPPINGS[key];
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 Global mapping: ${key} → ${finalKey}`);
            }
        }
        // 3. تحويل camelCase لـ snake_case
        else if (/[A-Z]/.test(key)) {
            finalKey = camelToSnake(key);
            if (tableName === 'staff_work_sessions') {
                console.log(`[filterLocalColumns] 🔍 camelCase → snake_case: ${key} → ${finalKey}`);
            }
        }

        // 3. التحقق من صلاحية العمود للجدول المحدد
        if (tableName === 'orders' && !VALID_SUPABASE_ORDER_COLUMNS.has(finalKey)) {
            continue; // تجاهل الأعمدة غير الموجودة في Supabase
        }
        if (tableName === 'order_items' && !VALID_SUPABASE_ORDER_ITEMS_COLUMNS.has(finalKey)) {
            continue;
        }

        filtered[finalKey] = value;
    }

    // ⚡ DEBUG للجلسات فقط - عرض النتيجة النهائية
    if (tableName === 'staff_work_sessions') {
        console.log(`[filterLocalColumns] ✅ Final filtered data for staff_work_sessions:`, {
            keys: Object.keys(filtered),
            staff_id: filtered.staff_id,
            staff_name: filtered.staff_name
        });
    }

    return filtered as Partial<T>;
}

/**
 * ⚡ إضافة أعمدة المزامنة المحلية للسجل الجديد
 */
export function addLocalSyncColumns<T extends Record<string, any>>(
    data: T,
    operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'
): T & { _synced: 0; _sync_status: string; _pending_operation: string; _local_updated_at: string } {
    return {
        ...data,
        _synced: 0,
        _sync_status: 'pending',
        _pending_operation: operation,
        _local_updated_at: new Date().toISOString(),
    };
}

/**
 * ⚡ الحصول على اسم الجدول الموحد
 * لم يعد هناك حاجة للتحويل - الأسماء موحدة
 *
 * @deprecated استخدم اسم الجدول مباشرة
 */
export function getUnifiedTableName(tableName: string): string {
    // للتوافق مع الكود القديم - تحويل الأسماء القديمة
    const legacyMap: Record<string, string> = {
        'pos_orders': 'orders',
        'pos_order_items': 'order_items',
        'product_returns': 'returns',
        'loss_declarations': 'losses',
        'work_sessions': 'staff_work_sessions',
    };
    return legacyMap[tableName] || tableName;
}

/**
 * ⚡ الحصول على اسم الجدول القديم (للترحيل)
 */
export function getLegacyTableName(unifiedName: string): string {
    const reverseMap: Record<string, string> = {
        'orders': 'pos_orders',
        'order_items': 'pos_order_items',
        'returns': 'product_returns',
        'losses': 'loss_declarations',
        'staff_work_sessions': 'work_sessions',
    };
    return reverseMap[unifiedName] || unifiedName;
}

/**
 * ⚡ هل الجدول يحتاج organization_id؟
 */
export function tableNeedsOrgId(tableName: string): boolean {
    return !NO_ORG_ID_TABLES.includes(tableName as any);
}

/**
 * ⚡ الحصول على حقل التاريخ للمزامنة
 */
export function getSyncTimestampField(tableName: string): string {
    return TIMESTAMP_OVERRIDES[tableName] || 'updated_at';
}

/**
 * ⚡ الحصول على المفتاح الرئيسي للجدول
 */
export function getPrimaryKeyColumn(tableName: string): string {
    return PRIMARY_KEY_OVERRIDES[tableName] || 'id';
}

/**
 * ⚡ هل الجدول محلي فقط؟
 */
export function isLocalOnlyTable(tableName: string): boolean {
    return LOCAL_ONLY_TABLES.includes(tableName as any);
}

/**
 * ⚡ هل الجدول مستقل؟
 */
export function isIndependentTable(tableName: string): boolean {
    return INDEPENDENT_TABLES.includes(tableName as any);
}

/**
 * ⚡ هل الجدول معتمد على آخر؟
 */
export function isDependentTable(tableName: string): boolean {
    return DEPENDENT_TABLES.includes(tableName as any);
}

// ============================================================
// ⚡ تصدير SYNC_CONFIG للتوافق مع الكود القديم
// ============================================================

/**
 * @deprecated استخدم الثوابت المنفصلة (SYNCED_TABLES, BATCH_CONFIG, etc.)
 */
export const SYNC_CONFIG = {
    SYNCED_TABLES,
    LOCAL_ONLY_TABLES,
    NO_ORG_ID_TABLES,
    TIMESTAMP_OVERRIDES,
    PRIMARY_KEY_OVERRIDES,
    BATCH_SIZE: BATCH_CONFIG.PUSH_BATCH_SIZE,
    BATCH_INTERVAL_MS: SYNC_TIMING.BATCH_INTERVAL_MS,
    IDLE_INTERVAL_MS: SYNC_TIMING.IDLE_INTERVAL_MS,
    MAX_RETRY_ATTEMPTS: RETRY_CONFIG.MAX_ATTEMPTS,
    RETRY_DELAY_BASE_MS: RETRY_CONFIG.BASE_DELAY_MS,

    // ⚠️ تم إزالة TABLE_MAP و COLUMN_MAP
    // الأسماء الآن موحدة 100% مع Supabase

    // للتوافق فقط - ستتم إزالتها لاحقاً
    /** @deprecated لم يعد مطلوباً - الأسماء موحدة */
    TABLE_MAP: {} as Record<string, string>,
    /** @deprecated لم يعد مطلوباً - الأسماء موحدة */
    COLUMN_MAP: {} as Record<string, Record<string, string>>,
    /** @deprecated استخدم filterLocalColumns بدلاً */
    LOCAL_ONLY_COLUMNS: {} as Record<string, string[]>,
    /** @deprecated لم يعد مطلوباً */
    GLOBAL_EXCLUDED_COLUMNS: [] as string[],
};

// ============================================================
// ⚡ دوال قديمة للتوافق (ستتم إزالتها)
// ============================================================

/**
 * @deprecated لم يعد مطلوباً - الأسماء موحدة
 */
export function getServerTableName(localTableName: string): string {
    return getUnifiedTableName(localTableName);
}

/**
 * @deprecated لم يعد مطلوباً - الأسماء موحدة
 */
export function getServerColumnName(_tableName: string, localColumnName: string): string {
    // لم يعد هناك تحويل - الأسماء موحدة
    return localColumnName;
}

/**
 * ⚡ v44: الحصول على اسم الجدول المحلي للكتابة
 *
 * ✅ الجداول الآن موحدة 100% مع Supabase:
 * - orders (كان pos_orders)
 * - order_items (كان pos_order_items)
 *
 * لم يعد هناك Views - الجداول الحقيقية بنفس الاسم
 */
export function getLocalTableName(serverTableName: string): string {
    // ⚡ v44: لم يعد هناك تحويل - الأسماء موحدة
    return serverTableName;
}

/**
 * @deprecated لم يعد مطلوباً - الأسماء موحدة
 */
export function getLocalColumnName(_tableName: string, serverColumnName: string): string {
    return serverColumnName;
}
