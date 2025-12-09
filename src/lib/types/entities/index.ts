/**
 * ⚡ Entity Types Index
 * تصدير جميع أنواع الكيانات من مكان واحد
 *
 * الكيانات المدعومة:
 * - Products (المنتجات)
 * - Orders (الطلبات)
 * - Customers (العملاء)
 * - Suppliers (الموردين)
 * - Employees/Users (الموظفين)
 * - Work Sessions (جلسات العمل)
 * - Repairs (التصليحات)
 * - Invoices (الفواتير)
 * - Returns (المرتجعات)
 * - Expenses (المصروفات)
 * - Losses (الخسائر)
 * - Supplier Purchases (مشتريات الموردين)
 */

// ============================================
// 📦 Product Types - أنواع المنتجات
// ============================================
export type {
    Product,
    LocalProduct,
    ProductColor,
    ProductSize,
    ProductImage,
    ProductWholesaleTier,
    ProductCategory,
    ProductSubcategory,
} from './product';

// ============================================
// 🛒 Order Types - أنواع الطلبات
// ============================================
export type {
    Order,
    LocalOrder,
    OrderItem,
    LocalOrderItem,
    OrderWithItems,
    LocalOrderWithItems,
    CreateOrderInput,
    CreateOrderItemInput,
} from './order';

// ============================================
// 👤 Customer Types - أنواع العملاء
// ============================================
export type {
    Customer,
    LocalCustomer,
    CustomerAddress,
    CustomerWithStats,
    CreateCustomerInput,
} from './customer';

// ============================================
// 🏭 Supplier Types - أنواع الموردين (الأساسي)
// ============================================
export type {
    Supplier,
    LocalSupplier,
    SupplierContact,
    CreateSupplierInput,
} from './supplier';

// ============================================
// 👥 Employee/User Types - أنواع الموظفين
// ============================================
export type {
    User,
    LocalUser,
    UserRole,
    UserStatus,
    Gender,
    EmployeeSalary,
    LocalEmployeeSalary,
    SalaryType,
    SalaryStatus,
    EmployeeActivity,
    EmployeeStats,
    UserWithStats,
    CreateUserInput,
    UpdateUserInput,
    CreateSalaryInput,
} from './employee';

// ============================================
// ⏱️ Work Session Types - أنواع جلسات العمل
// ============================================
export type {
    StaffWorkSession,
    LocalStaffWorkSession,
    WorkSessionStatus,
    WorkSessionSummary,
    DailySessionsReport,
    StartSessionInput,
    EndSessionInput,
    UpdateSessionStatsInput,
} from './work-session';

// ============================================
// 🔧 Repair Types - أنواع التصليحات
// ============================================
export type {
    RepairOrder,
    LocalRepairOrder,
    RepairStatus,
    RepairStatusEn,
    RepairStatusHistory,
    LocalRepairStatusHistory,
    RepairLocation,
    RepairStats,
    RepairOrderWithHistory,
    CreateRepairOrderInput,
    UpdateRepairOrderInput,
    UpdateRepairStatusInput,
} from './repair';

// ============================================
// 🧾 Invoice Types - أنواع الفواتير
// ============================================
export type {
    Invoice,
    LocalInvoice,
    InvoiceStatus,
    InvoiceSourceType,
    InvoiceItem,
    LocalInvoiceItem,
    InvoiceItemType,
    DiscountType,
    InvoiceWithItems,
    InvoiceSummary,
    CreateInvoiceInput,
    CreateInvoiceItemInput,
    UpdateInvoiceInput,
} from './invoice';

// ============================================
// 🔄 Return Types - أنواع المرتجعات
// ============================================
export type {
    Return,
    LocalReturn,
    ReturnStatus,
    ReturnType,
    ReturnReason,
    ReturnItem,
    LocalReturnItem,
    ReturnCondition,
    RefundMethod,
    ReturnWithItems,
    ReturnSummary,
    CreateReturnInput,
    CreateReturnItemInput,
    ApproveReturnInput,
    RejectReturnInput,
    ProcessReturnInput,
} from './return';

// ============================================
// 💸 Expense Types - أنواع المصروفات
// ============================================
export type {
    Expense,
    LocalExpense,
    ExpenseStatus,
    ExpenseSource,
    ExpenseCategory,
    LocalExpenseCategory,
    ExpenseSummary,
    MonthlyExpenseReport,
    ExpenseWithCategory,
    CreateExpenseInput,
    UpdateExpenseInput,
    CreateExpenseCategoryInput,
    ExpenseFilterInput,
} from './expense';

// ============================================
// 📉 Loss Types - أنواع الخسائر
// ============================================
export type {
    Loss,
    LocalLoss,
    LossStatus,
    LossType,
    LossCategory,
    LossItem,
    LocalLossItem,
    LossCondition,
    LossEvidence,
    LossWithItems,
    LossSummary,
    CreateLossInput,
    CreateLossItemInput,
    ApproveLossInput,
    AdjustLossInventoryInput,
} from './loss';

// ============================================
// 🛒 Supplier Purchase Types - مشتريات الموردين
// ============================================
export type {
    SupplierPurchase,
    LocalSupplierPurchase,
    PurchaseStatus,
    PurchasePaymentStatus,
    PaymentTerms,
    SupplierPurchaseItem,
    LocalSupplierPurchaseItem,
    VariantType,
    SupplierPayment,
    LocalSupplierPayment,
    SupplierDebt,
    DebtSummary,
    SupplierPurchaseWithItems,
    PurchaseSummary,
    CreateSupplierPurchaseInput,
    CreatePurchaseItemInput,
    CreateSupplierPaymentInput,
    UpdatePurchaseStatusInput,
    ReceivePurchaseInput,
} from './supplier-purchase';
