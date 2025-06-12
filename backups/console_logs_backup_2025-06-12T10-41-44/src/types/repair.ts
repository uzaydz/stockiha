export interface RepairLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface RepairImage {
  id: string;
  repair_order_id: string;
  image_url: string;
  image_type: 'before' | 'after';
  description?: string;
  created_at: string;
}

export interface RepairHistory {
  id: string;
  repair_order_id: string;
  status: string;
  notes?: string;
  created_by: string;
  created_at: string;
  users?: {
    name: string;
  };
}

export interface RepairOrder {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  repair_location_id?: string;
  custom_location?: string;
  issue_description?: string;
  status: string;
  total_price: number;
  paid_amount: number;
  received_by: string;
  received_by_name?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: string;
  repair_notes?: string;
  repair_tracking_code?: string;
  organization_id: string;
  images?: RepairImage[];
  history?: RepairHistory[];
  repair_location?: RepairLocation;
  staff?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}
