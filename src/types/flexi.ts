export interface FlexiNetwork {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface FlexiBalance {
  id: string;
  network_id: string;
  balance: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  network?: FlexiNetwork;
}

export interface DigitalCurrency {
  id: string;
  name: string;
  code: string;
  type: 'currency' | 'platform';
  icon: string | null;
  exchange_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface CurrencyBalance {
  id: string;
  currency_id: string;
  balance: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  currency?: DigitalCurrency;
}

export interface FlexiSale {
  id: string;
  network_id: string;
  amount: number;
  phone_number: string | null;
  status: 'pending' | 'completed' | 'failed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  organization_id: string;
  network?: FlexiNetwork;
}

export interface CurrencySale {
  id: string;
  currency_id: string;
  amount: number;
  dinar_amount: number;
  customer_details: {
    phone?: string;
    wallet_id?: string;
    account_number?: string;
    name?: string;
    email?: string;
    other?: Record<string, any>;
  } | null;
  status: 'pending' | 'completed' | 'failed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  organization_id: string;
  currency?: DigitalCurrency;
}

export interface FlexiStats {
  network: string;
  total_sales: number;
  total_transactions: number;
  latest_transaction: string | null;
}

export interface CurrencyStats {
  currency: string;
  currency_code: string;
  total_sales_original: number;
  total_sales_dinar: number;
  total_transactions: number;
  latest_transaction: string | null;
} 