/**
 * ⚡ Unified Types Index
 * تصدير جميع الأنواع من مكان واحد
 *
 * الاستخدام:
 * import { Product, Order, Customer, SaleType } from '@/lib/types';
 */

// ═══════════════════════════════════════════════════════════════
// Common Types
// ═══════════════════════════════════════════════════════════════
export type {
    AuditColumns,
    LocalSyncColumns,
    BaseEntity,
    OrganizationEntity,
    LocalEntity,
    SaleType,
    SellingUnitType,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PublicationStatus,
    WeightUnit,
    LengthUnit,
    WarrantyType,
    ExpenseType,
    RecurrenceFrequency,
    Nullable,
    WithOptional,
    WithRequired,
    CreateInput,
    UpdateInput,
    JSONValue,
    JSONObject,
    JSONArray,
} from './common';

// ═══════════════════════════════════════════════════════════════
// Entity Types
// ═══════════════════════════════════════════════════════════════
export type {
    // Products
    Product,
    LocalProduct,
    ProductColor,
    ProductSize,
    ProductImage,
    ProductWholesaleTier,
    ProductCategory,
    ProductSubcategory,

    // Orders
    Order,
    LocalOrder,
    OrderItem,
    LocalOrderItem,
    OrderWithItems,
    LocalOrderWithItems,
    CreateOrderInput,
    CreateOrderItemInput,

    // Customers
    Customer,
    LocalCustomer,
    CustomerAddress,
    CustomerWithStats,
    CreateCustomerInput,

    // Suppliers
    Supplier,
    LocalSupplier,
    SupplierContact,
    SupplierPurchase,
    SupplierPurchaseItem,
    SupplierPayment,
    CreateSupplierInput,
} from './entities';

// ═══════════════════════════════════════════════════════════════
// Sync Types
// ═══════════════════════════════════════════════════════════════

/**
 * ⚡ Outbox Entry - سجل في قائمة الانتظار
 */
export interface OutboxEntry {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'DELTA';
    payload: string;
    status: 'pending' | 'sending' | 'sent' | 'failed';
    retry_count: number;
    error_message: string | null;
    local_seq: number;
    created_at: string;
    updated_at: string;
}

/**
 * ⚡ Sync State - حالة المزامنة لجدول
 */
export interface SyncState {
    table_name: string;
    last_synced_at: string | null;
    last_sync_status: 'success' | 'error' | null;
    error_message: string | null;
}

/**
 * ⚡ Pull Result - نتيجة عملية السحب
 */
export interface PullResult {
    processed: number;
    skipped: number;
    errors: number;
}

/**
 * ⚡ Push Result - نتيجة عملية الدفع
 */
export interface PushResult {
    success: boolean;
    processedCount: number;
    failedCount: number;
    errors: Array<{ id: string; error: string }>;
}

/**
 * ⚡ Sync Stats - إحصائيات المزامنة
 */
export interface SyncStats {
    totalSyncs: number;
    lastSyncTime: string | null;
    lastSyncDuration: number;
    pendingOperations: number;
    failedOperations: number;
}

// ═══════════════════════════════════════════════════════════════
// Utility Types
// ═══════════════════════════════════════════════════════════════

/**
 * ⚡ Pagination Params
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}

/**
 * ⚡ Paginated Response
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * ⚡ Sort Params
 */
export interface SortParams {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * ⚡ Filter Params
 */
export interface FilterParams {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
    value: any;
}

/**
 * ⚡ Query Params
 */
export interface QueryParams {
    pagination?: PaginationParams;
    sort?: SortParams;
    filters?: FilterParams[];
    search?: string;
}
