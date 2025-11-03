export type IntentType =
  | 'sales_today'
  | 'sales_yesterday'
  | 'sales_on_date'
  | 'weekly_sales'
  | 'monthly_sales'
  | 'top_products'
  | 'inventory_stats'
  | 'low_stock'
  | 'out_of_stock'
  | 'product_search'
  | 'update_stock'
  | 'rename_product'
  | 'customer_credit'
  | 'customer_payment'
  | 'expense_create'
  | 'expense_update'
  | 'repair_create'
  | 'repair_status'
  | 'repair_update_status'
  | 'repair_add_payment'
  | 'debts_list'
  | 'unknown';

export interface ParsedIntentExpenseCreate extends ParsedIntentBase {
  type: 'expense_create';
  fields?: {
    title?: string;
    amount?: number;
    category?: string;
    date?: string; // ISO date
    payment_method?: string;
    vendor_name?: string;
    notes?: string;
  };
}

export interface ParsedIntentExpenseUpdate extends ParsedIntentBase {
  type: 'expense_update';
  fields: {
    title: string;
    amount: number;
    timeframe?: 'today' | 'week' | 'month' | 'year' | 'range';
    start?: string;
    end?: string;
  };
}

export interface ParsedIntentRepairCreate extends ParsedIntentBase {
  type: 'repair_create';
  fields?: {
    customer_name?: string;
    customer_phone?: string;
    device_type?: string;
    issue_description?: string;
    repair_location?: string; // name or id
    total_price?: number;
    paid_amount?: number;
    payment_method?: string;
    price_to_be_determined_later?: boolean;
  };
}

export interface ParsedIntentRepairStatus extends ParsedIntentBase {
  type: 'repair_status';
  customerQuery: string; // name or phone
}

export interface ParsedIntentRepairUpdateStatus extends ParsedIntentBase {
  type: 'repair_update_status';
  fields: {
    customerQuery: string;
    status: string;
    notes?: string;
  };
}

export interface ParsedIntentRepairAddPayment extends ParsedIntentBase {
  type: 'repair_add_payment';
  fields: {
    customerQuery: string;
    amount: number;
    method?: string;
  };
}

export interface ParsedIntentBase {
  type: IntentType;
}

export interface ParsedIntentSalesOnDate extends ParsedIntentBase {
  type: 'sales_on_date';
  date: string; // ISO date (yyyy-mm-dd)
}

export interface ParsedIntentTopProducts extends ParsedIntentBase {
  type: 'top_products';
  days: number;
}

export interface ParsedIntentUpdateStock extends ParsedIntentBase {
  type: 'update_stock';
  productQuery: string;
  quantity?: number; // positive number
  mode?: 'delta' | 'set';
  colorName?: string;
  sizeName?: string;
}

export interface ParsedIntentRenameProduct extends ParsedIntentBase {
  type: 'rename_product';
  productQuery: string;
  newName: string;
}

export interface ParsedIntentCustomerCredit extends ParsedIntentBase {
  type: 'customer_credit';
  customerQuery: string;
}

export interface ParsedIntentCustomerPayment extends ParsedIntentBase {
  type: 'customer_payment';
  customerQuery: string;
  amount: number;
  method?: string;
}

export type ParsedIntent =
  | ParsedIntentSalesOnDate
  | ParsedIntentTopProducts
  | ParsedIntentUpdateStock
  | ParsedIntentRenameProduct
  | ParsedIntentCustomerCredit
  | ParsedIntentCustomerPayment
  | ParsedIntentExpenseCreate
  | ParsedIntentExpenseUpdate
  | ParsedIntentRepairCreate
  | ParsedIntentRepairStatus
  | ParsedIntentRepairUpdateStatus
  | ParsedIntentRepairAddPayment
  | { type: Exclude<IntentType, 'sales_on_date' | 'top_products' | 'update_stock' | 'rename_product' | 'customer_credit' | 'customer_payment' | 'expense_create' | 'expense_update'> };

export interface AssistantResult {
  answer: string;
  action_required?: 'select_variant' | 'none';
  ui_schema?: any;
  data?: any;
}
