export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  instructions?: string;
  icon?: string;
  fields?: PaymentMethodField[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'textarea';
  placeholder?: string;
  required: boolean;
}

export type PaymentMethodFormData = Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>;
