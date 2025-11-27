/**
 * أنواع البيانات الخاصة بالمشتريات
 */

// حالات المشتريات
export type PurchaseStatus = 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

// حالات الدفع
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

// طرق الدفع
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';

// نوع المتغير
export type VariantType = 'simple' | 'color_only' | 'size_only' | 'color_size';

// عنصر في قائمة المشتريات
export interface PurchaseItem {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  color_id?: string | null;
  size_id?: string | null;
  variant_type?: VariantType;
  variant_display_name?: string | null;
}

// عنصر المشتريات مع الحقول المحسوبة
export interface PurchaseItemWithTotals extends PurchaseItem {
  id: string;
  purchase_id: string;
  total_price: number;
  tax_amount: number;
  batch_id?: string;
}

// بيانات نموذج إنشاء/تعديل المشتريات
export interface PurchaseFormData {
  purchase_number: string;
  supplier_id: string;
  purchase_date: Date;
  due_date?: Date;
  payment_terms?: string;
  notes?: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  paid_amount: number;
}

// دالة حساب المجموع
export function calculatePurchaseTotal(items: PurchaseItem[]): number {
  return items.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const taxRate = Number(item.tax_rate) || 0;

    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);

    return total + subtotal + taxAmount;
  }, 0);
}

// دالة حساب الضريبة لعنصر واحد
export function calculateItemTax(item: PurchaseItem): number {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const taxRate = Number(item.tax_rate) || 0;

  return (quantity * unitPrice) * (taxRate / 100);
}

// دالة حساب المجموع الفرعي لعنصر واحد
export function calculateItemSubtotal(item: PurchaseItem): number {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;

  return quantity * unitPrice;
}

// نوع المستخدم مع organization_id
export interface UserWithOrganization {
  id: string;
  email?: string;
  organization_id?: string;
}
