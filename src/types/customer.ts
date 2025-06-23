export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  orders_count: number;
  total_spent: number;
  last_order_date?: string;
}

export interface CustomerFilter {
  query?: string;
  sortBy?: 'name' | 'created_at' | 'orders_count' | 'total_spent';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStats {
  total: number;
  newLast30Days: number;
  activeLast30Days: number;
}
