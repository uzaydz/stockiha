/**
 * 🔢 Serial Number Service
 *
 * خدمة إدارة الأرقام التسلسلية للمنتجات
 * تتعامل مع IMEI، MAC Address، وأرقام الضمان
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// الأنواع
// =====================================================

export type SerialStatus = 'available' | 'reserved' | 'sold' | 'returned' | 'defective' | 'warranty_claimed';

export interface ProductSerialNumber {
  id: string;
  product_id: string;
  organization_id: string;
  color_id?: string;
  size_id?: string;
  batch_id?: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  status: SerialStatus;
  // الضمان
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_claimed: boolean;
  warranty_claim_date?: string;
  warranty_claim_reason?: string;
  warranty_claim_resolution?: string;
  // الشراء
  purchase_date?: string;
  purchase_price?: number;
  purchase_supplier_id?: string;
  purchase_invoice_number?: string;
  // البيع
  sold_at?: string;
  sold_in_order_id?: string;
  sold_to_customer_id?: string;
  sold_price?: number;
  sold_by_user_id?: string;
  // الإرجاع
  returned_at?: string;
  return_reason?: string;
  return_condition?: string;
  // الموقع
  location?: string;
  shelf_number?: string;
  // ملاحظات
  notes?: string;
  internal_notes?: string;
  // التتبع
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // حقول محسوبة
  warranty_days_remaining?: number;
  is_under_warranty?: boolean;
}

export interface CreateSerialInput {
  product_id: string;
  organization_id: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  color_id?: string;
  size_id?: string;
  batch_id?: string;
  purchase_price?: number;
  purchase_supplier_id?: string;
  purchase_invoice_number?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  location?: string;
  shelf_number?: string;
  notes?: string;
}

export interface UpdateSerialInput {
  status?: SerialStatus;
  location?: string;
  shelf_number?: string;
  notes?: string;
  internal_notes?: string;
  warranty_claimed?: boolean;
  warranty_claim_date?: string;
  warranty_claim_reason?: string;
  warranty_claim_resolution?: string;
}

export interface SerialFilters {
  organization_id: string;
  product_id?: string;
  status?: SerialStatus | 'all';
  batch_id?: string;
  has_warranty?: boolean;
  warranty_expiring_within_days?: number;
  search?: string;
}

export interface SerialSummary {
  total_serials: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  defective: number;
  warranty_claimed: number;
  under_warranty: number;
  warranty_expiring_soon: number;
}

export interface SellSerialInput {
  serial_id: string;
  order_id: string;
  customer_id?: string;
  sold_price: number;
  sold_by_user_id?: string;
  warranty_start_date?: string;
  warranty_months?: number;
}

// =====================================================
// دوال الجلب
// =====================================================

/**
 * جلب أرقام تسلسلية لمنتج معين
 */
export async function getProductSerials(
  productId: string,
  organizationId: string,
  status?: SerialStatus
): Promise<ProductSerialNumber[]> {
  let query = supabase
    .from('product_serial_numbers')
    .select('*')
    .eq('product_id', productId)
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching product serials:', error);
    throw new Error(`فشل جلب الأرقام التسلسلية: ${error.message}`);
  }

  return (data || []).map(enrichSerialData);
}

/**
 * جلب الأرقام التسلسلية المتاحة للبيع
 */
export async function getAvailableSerials(
  productId: string,
  organizationId: string,
  colorId?: string,
  sizeId?: string
): Promise<ProductSerialNumber[]> {
  let query = supabase
    .from('product_serial_numbers')
    .select('*')
    .eq('product_id', productId)
    .eq('organization_id', organizationId)
    .eq('status', 'available');

  if (colorId) {
    query = query.eq('color_id', colorId);
  }

  if (sizeId) {
    query = query.eq('size_id', sizeId);
  }

  query = query.order('created_at', { ascending: true }); // FIFO

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching available serials:', error);
    throw new Error(`فشل جلب الأرقام التسلسلية المتاحة: ${error.message}`);
  }

  return (data || []).map(enrichSerialData);
}

/**
 * جلب جميع الأرقام التسلسلية مع الفلترة
 */
export async function getSerials(filters: SerialFilters): Promise<ProductSerialNumber[]> {
  let query = supabase
    .from('product_serial_numbers')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image)
    `)
    .eq('organization_id', filters.organization_id);

  if (filters.product_id) {
    query = query.eq('product_id', filters.product_id);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }

  if (filters.has_warranty === true) {
    query = query.not('warranty_end_date', 'is', null);
  }

  if (filters.search) {
    query = query.or(`serial_number.ilike.%${filters.search}%,imei.ilike.%${filters.search}%,mac_address.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching serials:', error);
    throw new Error(`فشل جلب الأرقام التسلسلية: ${error.message}`);
  }

  let serials = (data || []).map(enrichSerialData);

  // فلترة الضمان
  if (filters.warranty_expiring_within_days) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + filters.warranty_expiring_within_days);

    serials = serials.filter(s => {
      if (!s.warranty_end_date) return false;
      const warrantyEnd = new Date(s.warranty_end_date);
      return warrantyEnd >= now && warrantyEnd <= futureDate;
    });
  }

  return serials;
}

/**
 * البحث برقم تسلسلي
 */
export async function findBySerialNumber(
  serialNumber: string,
  organizationId: string
): Promise<ProductSerialNumber | null> {
  const { data, error } = await supabase
    .from('product_serial_numbers')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image)
    `)
    .eq('organization_id', organizationId)
    .or(`serial_number.eq.${serialNumber},imei.eq.${serialNumber},mac_address.eq.${serialNumber}`)
    .maybeSingle();

  if (error) {
    console.error('❌ Error finding serial:', error);
    throw new Error(`فشل البحث عن الرقم التسلسلي: ${error.message}`);
  }

  return data ? enrichSerialData(data) : null;
}

/**
 * جلب رقم تسلسلي واحد
 */
export async function getSerial(serialId: string): Promise<ProductSerialNumber | null> {
  const { data, error } = await supabase
    .from('product_serial_numbers')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image),
      customers:sold_to_customer_id (full_name, phone)
    `)
    .eq('id', serialId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('❌ Error fetching serial:', error);
    throw new Error(`فشل جلب الرقم التسلسلي: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * جلب ملخص الأرقام التسلسلية
 */
export async function getSerialSummary(organizationId: string): Promise<SerialSummary> {
  const { data: serials, error } = await supabase
    .from('product_serial_numbers')
    .select('status, warranty_end_date, warranty_claimed')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('❌ Error fetching serial summary:', error);
    throw new Error(`فشل جلب ملخص الأرقام التسلسلية: ${error.message}`);
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const summary: SerialSummary = {
    total_serials: serials?.length || 0,
    available: 0,
    reserved: 0,
    sold: 0,
    returned: 0,
    defective: 0,
    warranty_claimed: 0,
    under_warranty: 0,
    warranty_expiring_soon: 0,
  };

  serials?.forEach(serial => {
    switch (serial.status) {
      case 'available': summary.available++; break;
      case 'reserved': summary.reserved++; break;
      case 'sold': summary.sold++; break;
      case 'returned': summary.returned++; break;
      case 'defective': summary.defective++; break;
      case 'warranty_claimed': summary.warranty_claimed++; break;
    }

    if (serial.warranty_end_date) {
      const warrantyEnd = new Date(serial.warranty_end_date);
      if (warrantyEnd >= now) {
        summary.under_warranty++;
        if (warrantyEnd <= thirtyDaysFromNow) {
          summary.warranty_expiring_soon++;
        }
      }
    }
  });

  return summary;
}

// =====================================================
// دوال الإنشاء والتحديث
// =====================================================

/**
 * إنشاء رقم تسلسلي جديد
 */
export async function createSerial(input: CreateSerialInput): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  // التحقق من عدم وجود الرقم مسبقاً
  const existing = await findBySerialNumber(input.serial_number, input.organization_id);
  if (existing) {
    throw new Error('الرقم التسلسلي موجود مسبقاً');
  }

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .insert({
      ...input,
      status: 'available',
      purchase_date: new Date().toISOString(),
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating serial:', error);
    throw new Error(`فشل إنشاء الرقم التسلسلي: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * إنشاء عدة أرقام تسلسلية
 */
export async function createSerials(inputs: CreateSerialInput[]): Promise<ProductSerialNumber[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const serialsToInsert = inputs.map(input => ({
    ...input,
    status: 'available' as SerialStatus,
    purchase_date: new Date().toISOString(),
    created_by: user?.id,
  }));

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .insert(serialsToInsert)
    .select();

  if (error) {
    console.error('❌ Error creating serials:', error);
    throw new Error(`فشل إنشاء الأرقام التسلسلية: ${error.message}`);
  }

  return (data || []).map(enrichSerialData);
}

/**
 * تحديث رقم تسلسلي
 */
export async function updateSerial(serialId: string, updates: UpdateSerialInput): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', serialId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating serial:', error);
    throw new Error(`فشل تحديث الرقم التسلسلي: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * بيع رقم تسلسلي
 */
export async function sellSerial(input: SellSerialInput): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  // حساب تاريخ انتهاء الضمان
  let warrantyEndDate: string | undefined;
  const warrantyStartDate = input.warranty_start_date || new Date().toISOString();

  if (input.warranty_months) {
    const endDate = new Date(warrantyStartDate);
    endDate.setMonth(endDate.getMonth() + input.warranty_months);
    warrantyEndDate = endDate.toISOString();
  }

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString(),
      sold_in_order_id: input.order_id,
      sold_to_customer_id: input.customer_id,
      sold_price: input.sold_price,
      sold_by_user_id: input.sold_by_user_id || user?.id,
      warranty_start_date: warrantyStartDate,
      warranty_end_date: warrantyEndDate,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', input.serial_id)
    .eq('status', 'available') // فقط إذا كان متاحاً
    .select()
    .single();

  if (error) {
    console.error('❌ Error selling serial:', error);
    throw new Error(`فشل بيع الرقم التسلسلي: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * إرجاع رقم تسلسلي
 */
export async function returnSerial(
  serialId: string,
  reason: string,
  condition: 'good' | 'damaged' | 'defective'
): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  const status: SerialStatus = condition === 'defective' ? 'defective' : 'returned';

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status,
      returned_at: new Date().toISOString(),
      return_reason: reason,
      return_condition: condition,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', serialId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error returning serial:', error);
    throw new Error(`فشل إرجاع الرقم التسلسلي: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * تسجيل مطالبة ضمان
 */
export async function claimWarranty(
  serialId: string,
  reason: string
): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status: 'warranty_claimed',
      warranty_claimed: true,
      warranty_claim_date: new Date().toISOString(),
      warranty_claim_reason: reason,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', serialId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error claiming warranty:', error);
    throw new Error(`فشل تسجيل مطالبة الضمان: ${error.message}`);
  }

  return enrichSerialData(data);
}

/**
 * حل مطالبة ضمان
 */
export async function resolveWarrantyClaim(
  serialId: string,
  resolution: string,
  newStatus: SerialStatus = 'available'
): Promise<ProductSerialNumber> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status: newStatus,
      warranty_claim_resolution: resolution,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', serialId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error resolving warranty claim:', error);
    throw new Error(`فشل حل مطالبة الضمان: ${error.message}`);
  }

  return enrichSerialData(data);
}

// =====================================================
// دوال تنبيهات الضمان
// =====================================================

/**
 * جلب الأرقام التسلسلية التي سينتهي ضمانها قريباً
 */
export async function getWarrantyExpiringSoon(
  organizationId: string,
  daysAhead: number = 30
): Promise<ProductSerialNumber[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image),
      customers:sold_to_customer_id (full_name, phone)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'sold')
    .gte('warranty_end_date', now.toISOString())
    .lte('warranty_end_date', futureDate.toISOString())
    .order('warranty_end_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching warranty expiring:', error);
    throw new Error(`فشل جلب الضمانات المنتهية: ${error.message}`);
  }

  return (data || []).map(enrichSerialData);
}

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * إثراء بيانات الرقم التسلسلي بالحقول المحسوبة
 */
function enrichSerialData(serial: any): ProductSerialNumber {
  const now = new Date();
  let warrantyDaysRemaining: number | undefined;
  let isUnderWarranty = false;

  if (serial.warranty_end_date) {
    const warrantyEnd = new Date(serial.warranty_end_date);
    const diffTime = warrantyEnd.getTime() - now.getTime();
    warrantyDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isUnderWarranty = warrantyDaysRemaining > 0;
  }

  return {
    ...serial,
    warranty_days_remaining: warrantyDaysRemaining,
    is_under_warranty: isUnderWarranty,
  };
}

/**
 * التحقق من صحة رقم IMEI
 */
export function validateIMEI(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;

  // Luhn algorithm
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * التحقق من صحة MAC Address
 */
export function validateMACAddress(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
}

export default {
  getProductSerials,
  getAvailableSerials,
  getSerials,
  findBySerialNumber,
  getSerial,
  getSerialSummary,
  createSerial,
  createSerials,
  updateSerial,
  sellSerial,
  returnSerial,
  claimWarranty,
  resolveWarrantyClaim,
  getWarrantyExpiringSoon,
  validateIMEI,
  validateMACAddress,
};
