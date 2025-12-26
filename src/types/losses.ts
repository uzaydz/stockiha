export interface Loss {
  id: string;
  loss_number: string;
  loss_type: 'damage' | 'damaged' | 'expiry' | 'expired' | 'theft' | 'spoilage' | 'breakage' | 'defective' | 'other' | 'shortage' | 'water_damage' | 'fire_damage';
  loss_category?: string | null;
  loss_description: string;
  incident_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'investigating' | 'processed' | 'cancelled' | 'completed';
  total_cost_value: number;
  total_selling_value: number;
  total_items_count: number;
  items_count: number;
  reported_by: string;
  witness_employee_id?: string | null;
  witness_name?: string | null;
  requires_manager_approval?: boolean | null;
  requires_investigation?: boolean | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  investigation_notes?: string | null;
  location_description?: string | null;
  external_reference?: string | null;
  insurance_claim?: boolean | null;
  insurance_reference?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  _synced?: boolean;
  _syncStatus?: string;
  _pendingOperation?: string;
}

export interface LossItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_lost: number;
  loss_percentage?: number;
  unit_cost: number;
  unit_selling_price: number;
  total_cost_value?: number;
  total_selling_value?: number;
  loss_condition: string;
  stock_before_loss?: number;
  stock_after_loss?: number;
  inventory_adjusted?: boolean;
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  variant_display_name?: string;
  variant_stock_before?: number;
  variant_stock_after?: number;
  variant_info?: any;
  // حقول نوع البيع المتقدمة
  selling_unit_type?: 'piece' | 'meter' | 'weight' | 'box';
  meters_lost?: number;
  weight_lost?: number;
  weight_unit?: string;
  boxes_lost?: number;
  units_per_box?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  purchase_price: number;
  price: number;
  stock_quantity: number;
  has_colors?: boolean;
  has_sizes?: boolean;
}

export interface ProductVariant {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_purchase_price: number;
  product_price: number;
  has_colors: boolean;
  has_sizes: boolean;
  variant_type: 'main' | 'color_only' | 'size_only' | 'color_size';
  color_id?: string;
  color_name?: string;
  color_code?: string;
  size_id?: string;
  size_name?: string;
  size_code?: string;
  current_stock: number;
  variant_display_name: string;
}















































