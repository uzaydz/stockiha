import { supabase } from '@/lib/supabase';

// Interfaces that match the database schema
export interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_number?: string;
  business_type?: string;
  notes?: string;
  rating: number;
  supplier_type: 'local' | 'international';
  supplier_category: 'wholesale' | 'retail' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

export interface SupplierPurchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  purchase_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  payment_terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPurchaseItem {
  id: string;
  purchase_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  batch_id?: string;
  color_id?: string;
  size_id?: string;
  variant_type?: 'simple' | 'color_only' | 'size_only' | 'color_size';
  variant_display_name?: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  purchase_id?: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface SupplierRating {
  id: string;
  supplier_id: string;
  rating: number;
  review?: string;
  review_date: string;
  created_by?: string;
  created_at: string;
}

export interface SupplierPerformance {
  supplier_id: string;
  name: string;
  company_name?: string;
  rating: number;
  total_purchases: number;
  avg_delivery_days: number;
}

export interface SupplierPaymentSummary {
  supplier_id: string;
  name: string;
  company_name?: string;
  total_purchases: number;
  total_purchase_amount: number;
  total_paid_amount: number;
  total_outstanding: number;
}

// API Functions

// Get all suppliers
export async function getSuppliers(organizationId: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Get a single supplier by ID
export async function getSupplierById(organizationId: string, supplierId: string): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', supplierId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    return null;
  }
}

// Create a new supplier
export async function createSupplier(organizationId: string, supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier | null> {
  try {

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        ...supplier,
        organization_id: organizationId,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
    }
    return null;
  }
}

// Update an existing supplier
export async function updateSupplier(organizationId: string, supplierId: string, updates: Partial<Supplier>): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', supplierId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    return null;
  }
}

// Delete a supplier
export async function deleteSupplier(organizationId: string, supplierId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', supplierId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    return false;
  }
}

// Delete a purchase (Note: Inventory adjustment should be handled manually)
export async function deletePurchase(organizationId: string, purchaseId: string): Promise<boolean> {
  try {
    // جلب تفاصيل المشتريات للتحقق من الحالة
    const { data: purchaseData, error: fetchError } = await supabase
      .from('supplier_purchases')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', purchaseId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!purchaseData) throw new Error('المشتريات غير موجودة');
    
    // التحقق من أن المشتريات في حالة مسودة أو مؤكدة فقط
    if (!['draft', 'confirmed'].includes(purchaseData.status)) {
      throw new Error('لا يمكن حذف المشتريات المدفوعة أو المتأخرة');
    }
    
    // حذف عناصر المشتريات أولاً
    const { error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .delete()
      .eq('purchase_id', purchaseId);
    
    if (itemsError) throw itemsError;
    
    // حذف المشتريات
    const { error: purchaseError } = await supabase
      .from('supplier_purchases')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', purchaseId);
    
    if (purchaseError) throw purchaseError;
    
    return true;
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return false;
  }
}

// Get all supplier contacts for a specific supplier
export async function getSupplierContacts(supplierId: string): Promise<SupplierContact[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Create a new supplier contact
export async function createSupplierContact(contact: Omit<SupplierContact, 'id'>): Promise<SupplierContact | null> {
  try {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .insert(contact)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    return null;
  }
}

// Get all purchases for a specific supplier
export async function getSupplierPurchases(organizationId: string, supplierId?: string): Promise<SupplierPurchase[]> {
  try {
    let query = supabase
      .from('supplier_purchases')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    
    const { data, error } = await query.order('purchase_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Get purchase details including items
export async function getPurchaseById(organizationId: string, purchaseId: string): Promise<{purchase: SupplierPurchase, items: SupplierPurchaseItem[]} | null> {
  try {
    // Get purchase details
    const { data: purchase, error: purchaseError } = await supabase
      .from('supplier_purchases')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', purchaseId)
      .single();
    
    if (purchaseError) throw purchaseError;
    
    // Get purchase items
    const { data: items, error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .select('*')
      .eq('purchase_id', purchaseId);
    
    if (itemsError) throw itemsError;
    
    return {
      purchase,
      items: items || []
    };
  } catch (error) {
    return null;
  }
}

// Create a new purchase with items
export async function createPurchase(
  organizationId: string, 
  purchase: Omit<SupplierPurchase, 'id' | 'created_at' | 'updated_at' | 'balance_due' | 'payment_status'>,
  items: Omit<SupplierPurchaseItem, 'id' | 'purchase_id' | 'total_price' | 'tax_amount'>[]
): Promise<SupplierPurchase | null> {
  try {

    // تحقق من صحة البيانات
    if (!items || items.length === 0) {
      throw new Error("لا يمكن إنشاء مشتريات بدون عناصر");
    }
    
    // تحقق من بيانات العناصر لضمان وجود وصف لكل عنصر
    for (const item of items) {
      if (!item.description) {
        throw new Error("يجب إضافة وصف لكل عنصر من عناصر المشتريات");
      }
    }
    
    // Simplify input data - only include essential fields to minimize trigger complexity
    const purchaseData = {
      purchase_number: purchase.purchase_number,
      supplier_id: purchase.supplier_id,
      purchase_date: purchase.purchase_date,
      due_date: purchase.due_date,
      total_amount: purchase.total_amount || 0,
      paid_amount: purchase.paid_amount || 0,
      status: purchase.status || 'draft',
      payment_terms: purchase.payment_terms,
      notes: purchase.notes,
      organization_id: organizationId
    };
    
    // Create purchase with retries - use exponential backoff
    let maxRetries = 3;
    let attempt = 0;
    let purchaseResult = null;
    
    while (attempt < maxRetries && !purchaseResult) {
      attempt++;
      try {

        // Use a simpler query without .select() initially to reduce stack depth
        const { error } = await supabase
          .from('supplier_purchases')
          .insert(purchaseData);
        
        if (error) {
          
          // Handle stack depth error with longer exponential backoff
          if (error.code === '54001' || error.code === '428C9') {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          } else {
            throw error;
          }
        }
        
        // Once insert succeeds, fetch the record in a separate query
        const { data, error: fetchError } = await supabase
          .from('supplier_purchases')
          .select()
          .eq('purchase_number', purchaseData.purchase_number)
          .eq('supplier_id', purchaseData.supplier_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        purchaseResult = data;
        
      } catch (retryError) {
        if (attempt === maxRetries) throw retryError;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    
    if (!purchaseResult) {
      throw new Error('Failed to create purchase after multiple attempts');
    }
    
    // Handle items insertion only if purchase was created successfully
    if (items.length > 0 && purchaseResult) {

      // Process items in small batches with sufficient delays between batches
      const BATCH_SIZE = 3;
      const batches = [];
      
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }
      
      for (const [batchIndex, batch] of batches.entries()) {

        // Calculate tax_amount and total_price for each item
        const formattedItems = batch.map(item => {
          const quantity = Number(item.quantity) || 0;
          const unit_price = Number(item.unit_price) || 0;
          const tax_rate = Number(item.tax_rate) || 0;

          // Include new variant fields with default values
          return {
            purchase_id: purchaseResult.id,
            product_id: item.product_id, // يمكن أن يكون null ولكن يجب أن يكون معرفاً
            description: item.description || '',
            quantity,
            unit_price,
            tax_rate,
            // إضافة الحقول الجديدة مع قيم افتراضية
            color_id: (item as any).color_id || null,
            size_id: (item as any).size_id || null,
            variant_type: (item as any).variant_type || 'simple',
            variant_display_name: (item as any).variant_display_name || null
          };
        });
        
        // Insert items with retry logic
        let itemAttempt = 0;
        let itemsInserted = false;
        
        while (itemAttempt < maxRetries && !itemsInserted) {
          itemAttempt++;
          try {

            // Simple insert without .select() to reduce stack depth
            const { error: itemsError } = await supabase
              .from('supplier_purchase_items')
              .insert(formattedItems);
            
            if (itemsError) {
              if (itemsError.code === '54001' || itemsError.code === '428C9') {
                await new Promise(resolve => setTimeout(resolve, 2000 * itemAttempt));
                continue;
              } else {
                throw itemsError;
              }
            }
            
            itemsInserted = true;
            
          } catch (itemRetryError) {
            if (itemAttempt === maxRetries) throw itemRetryError;
            await new Promise(resolve => setTimeout(resolve, 2000 * itemAttempt));
          }
        }
        
        if (!itemsInserted) {
          // Continue with next batch instead of failing everything
          continue;
        }
        
        // Wait longer between batches to avoid stack depth issues
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

    }
    
    return purchaseResult;
  } catch (error) {
    throw error; // Rethrow the error to be handled by the caller
  }
}

// Update an existing purchase with items
export async function updatePurchase(
  organizationId: string,
  purchaseId: string,
  purchase: Partial<Omit<SupplierPurchase, 'id' | 'created_at' | 'updated_at' | 'balance_due' | 'payment_status'>>,
  items: Omit<SupplierPurchaseItem, 'id' | 'purchase_id' | 'total_price' | 'tax_amount'>[]
): Promise<SupplierPurchase | null> {
  try {
    // تحقق من صحة البيانات
    if (!items || items.length === 0) {
      throw new Error("لا يمكن تحديث المشتريات بدون عناصر");
    }
    
    // تحقق من بيانات العناصر لضمان وجود وصف لكل عنصر
    for (const item of items) {
      if (!item.description) {
        throw new Error("يجب إضافة وصف لكل عنصر من عناصر المشتريات");
      }
    }
    
    // تحديث بيانات المشتريات
    const purchaseData = {
      ...purchase,
      updated_at: new Date().toISOString()
    };
    
    // تحديث المشتريات
    const { data: updatedPurchase, error: purchaseError } = await supabase
      .from('supplier_purchases')
      .update(purchaseData)
      .eq('id', purchaseId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (purchaseError) throw purchaseError;
    
    // نحاول تحديث العناصر الموجودة بدلاً من حذفها وإعادة إنشائها
    // أولاً، احصل على العناصر الموجودة
    const { data: existingItems } = await supabase
      .from('supplier_purchase_items')
      .select('id')
      .eq('purchase_id', purchaseId);
    
    // حذف العناصر الزائدة إذا كانت موجودة
    if (existingItems && existingItems.length > items.length) {
      const itemsToDelete = existingItems.slice(items.length);
      for (const item of itemsToDelete) {
        // محاولة حذف العنصر مع تجاهل أخطاء القيود الخارجية
        try {
          await supabase
            .from('supplier_purchase_items')
            .delete()
            .eq('id', item.id);
        } catch (error) {
        }
      }
    }
    
    // حذف جميع العناصر الموجودة (مع معالجة أخطاء القيود الخارجية)
    try {
      const { error: deleteError } = await supabase
        .from('supplier_purchase_items')
        .delete()
        .eq('purchase_id', purchaseId);
      
      if (deleteError) {
        // إذا فشل الحذف بسبب القيود الخارجية، نحاول نهجاً مختلفاً
        if (deleteError.code === '23503') {
          throw new Error('لا يمكن تحديث هذه المشتريات لأنها مرتبطة بدفعات في المخزون. يرجى التواصل مع المسؤول.');
        } else {
          throw deleteError;
        }
      }
    } catch (error: any) {
      if (error.message.includes('foreign key constraint')) {
        throw new Error('لا يمكن تحديث هذه المشتريات لأنها مرتبطة بدفعات في المخزون. يرجى التواصل مع المسؤول.');
      }
      throw error;
    }
    
    // إضافة العناصر الجديدة
    const formattedItems = items.map(item => {
      const quantity = Number(item.quantity) || 0;
      const unit_price = Number(item.unit_price) || 0;
      const tax_rate = Number(item.tax_rate) || 0;

      return {
        purchase_id: purchaseId,
        product_id: item.product_id,
        description: item.description || '',
        quantity,
        unit_price,
        tax_rate,
        color_id: (item as any).color_id || null,
        size_id: (item as any).size_id || null,
        variant_type: (item as any).variant_type || 'simple',
        variant_display_name: (item as any).variant_display_name || null
      };
    });
    
    const { error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .insert(formattedItems);
    
    if (itemsError) throw itemsError;
    
    return updatedPurchase;
  } catch (error) {
    throw error;
  }
}

// Update purchase status
export async function updatePurchaseStatus(
  organizationId: string,
  purchaseId: string,
  status: SupplierPurchase['status']
): Promise<boolean> {
  try {

    // First, get the current status to check if we're changing to 'confirmed'
    const { data: currentPurchase, error: fetchError } = await supabase
      .from('supplier_purchases')
      .select('status, created_by')
      .eq('id', purchaseId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }

    // Prevent double confirmation - if already confirmed, don't confirm again
    if (status === 'confirmed' && currentPurchase.status === 'confirmed') {
      return true; // Return true as if it succeeded since it's already in the desired state
    }
    
    // Get current user for created_by field if needed
    let userId = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch (authError) {
    }
    
    // Update the purchase status
    const { error } = await supabase
      .from('supplier_purchases')
      .update({
        status,
        updated_at: new Date().toISOString(),
        // Ensure created_by is set if missing - needed for inventory trigger
        created_by: currentPurchase.created_by || userId || null
      })
      .eq('organization_id', organizationId)
      .eq('id', purchaseId);
    
    if (error) {
      throw error;
    }

    // If we changed to 'confirmed', verify inventory update happened
    if (status === 'confirmed' && currentPurchase.status !== 'confirmed') {

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for inventory log entries
      const { data: logEntries, error: logError } = await supabase
        .from('inventory_log')
        .select('*')
        .eq('reference_id', purchaseId)
        .eq('reference_type', 'supplier_purchase');
      
      if (logError) {
      } else {

        // If no log entries found, try to manually update inventory
        if (!logEntries || logEntries.length === 0) {
          
          // Get purchase items
          const { data: purchaseItems, error: itemsError } = await supabase
            .from('supplier_purchase_items')
            .select('*')
            .eq('purchase_id', purchaseId);
            
          if (itemsError) {
          } else if (purchaseItems && purchaseItems.length > 0) {

            // Process each item to update inventory
            for (const item of purchaseItems) {
              if (!item.product_id) continue;
              
              // Get current product stock
              const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();
                
              if (productError) {
                continue;
              }
              
              const currentStock = product.stock_quantity;
              const newStock = currentStock + item.quantity;
              
              // Update product stock
              const { error: updateError } = await supabase
                .from('products')
                .update({
                  stock_quantity: newStock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id);
                
              if (updateError) {
                continue;
              }
              
              // Log the inventory change
              const { error: logError } = await supabase
                .from('inventory_log')
                .insert({
                  product_id: item.product_id,
                  quantity: item.quantity,
                  previous_stock: currentStock,
                  new_stock: newStock,
                  type: 'purchase',
                  reference_id: purchaseId,
                  reference_type: 'supplier_purchase',
                  notes: 'Manual inventory update after trigger failure',
                  created_by: userId,
                  organization_id: organizationId,
                  created_at: new Date().toISOString()
                });
                
              if (logError) {
              } else {
                
              }
            }
          }
        } else {

          // Verify that product stock was actually updated
          for (const entry of logEntries) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', entry.product_id)
              .single();
              
            if (productError) {
              continue;
            }

            // If stock doesn't match the expected value, update it
            if (product.stock_quantity !== entry.new_stock) {
              
              const { error: updateError } = await supabase
                .from('products')
                .update({
                  stock_quantity: entry.new_stock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', entry.product_id);
                
              if (updateError) {
              } else {
                
              }
            }
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Record a payment for a supplier purchase
export async function recordPayment(
  organizationId: string,
  payment: Omit<SupplierPayment, 'id' | 'created_at'> & { is_full_payment?: boolean }
): Promise<SupplierPayment | null> {
  try {
    // استخراج معلمة is_full_payment (إذا كانت موجودة)
    const { is_full_payment, ...paymentData } = payment;
    
    // التأكد من وجود organization_id في البيانات
    const safePaymentData = {
      ...paymentData,
      organization_id: organizationId
    };
    
    // If it's a full payment and linked to a purchase, get the purchase details first
    if (is_full_payment && payment.purchase_id) {
      // الحصول على تفاصيل المشتريات
      const { data: purchase, error: purchaseGetError } = await supabase
        .from('supplier_purchases')
        .select('total_amount, paid_amount')
        .eq('id', payment.purchase_id)
        .single();
      
      if (purchaseGetError) throw purchaseGetError;
      
      // في حالة الدفع الكامل، نستخدم المبلغ الإجمالي بالضبط للتأكد من أن المبلغ المدفوع = المبلغ الإجمالي
      const remainingAmount = Number(purchase.total_amount) - Number(purchase.paid_amount);
      
      // إذا كان المبلغ المتبقي أقل من 0.01، فقد تم دفعه بالفعل
      if (remainingAmount < 0.01) {
        
        return null;
      }
      
      // احتفظ بالمبلغ المحدد بواسطة المستخدم للسجلات
      const specifiedAmount = Number(payment.amount);
      
      // تسجيل معلومات التصحيح

      // إنشاء سجل الدفع باستخدام المبلغ المتبقي بالضبط
      const { data: paymentData, error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          ...safePaymentData,
          amount: remainingAmount,
          notes: safePaymentData.notes ? `${safePaymentData.notes} (تسديد كامل)` : 'تسديد كامل'
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // تحديث المشتريات لتكون مدفوعة بالكامل
      const { error: purchaseUpdateError } = await supabase
        .from('supplier_purchases')
        .update({
          paid_amount: purchase.total_amount, // تعيين المبلغ المدفوع ليساوي المبلغ الإجمالي بالضبط
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.purchase_id);
      
      if (purchaseUpdateError) throw purchaseUpdateError;
      
      return paymentData;
    } else {
      // سير العملية العادي (بدون دفع كامل)
      
      // First create the payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('supplier_payments')
        .insert(safePaymentData)
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // If linked to a purchase, update the purchase's paid amount
      if (payment.purchase_id) {
        const { data: purchase, error: purchaseGetError } = await supabase
          .from('supplier_purchases')
          .select('total_amount, paid_amount')
          .eq('id', payment.purchase_id)
          .single();
        
        if (purchaseGetError) throw purchaseGetError;
        
        const newPaidAmount = Number(purchase.paid_amount) + Number(payment.amount);
        const totalAmount = Number(purchase.total_amount);
        
        // احسب المبلغ المتبقي بالضبط
        const balanceDue = Math.max(0, totalAmount - newPaidAmount);
        
        // تحديد حالة الدفع وفقًا للمبلغ المتبقي
        let paymentStatus = 'partially_paid';
        let purchaseStatus = 'partially_paid';
        
        // استخدم مقارنة بدقة عالية للأرقام العشرية
        if (Math.abs(balanceDue) < 0.01) {
          paymentStatus = 'paid';
          purchaseStatus = 'paid';
          
          // تعديل المبلغ المدفوع ليساوي المبلغ الإجمالي بالضبط لتجنب أخطاء التقريب
          const { error: fixPrecisionError } = await supabase
            .from('supplier_purchases')
            .update({
              paid_amount: purchase.total_amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.purchase_id);
            
          if (fixPrecisionError) {
          }
        } else if (newPaidAmount === 0) {
          paymentStatus = 'unpaid';
          purchaseStatus = 'draft';
        }
        
        // إنشاء كائن التحديث - نحدد فقط paid_amount وندع balance_due يتم حسابه تلقائيًا
        const updateData: any = {
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString()
        };
        
        // تعيين حالة المشتريات
        updateData.status = purchaseStatus;
        
        // تسجيل المعلومات للتصحيح

        const { error: purchaseUpdateError } = await supabase
          .from('supplier_purchases')
          .update(updateData)
          .eq('id', payment.purchase_id);
        
        if (purchaseUpdateError) throw purchaseUpdateError;
      }
      
      return paymentData;
    }
  } catch (error) {
    return null;
  }
}

// Get supplier payments
export async function getSupplierPayments(organizationId: string, supplierId: string): Promise<SupplierPayment[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Add or update a supplier rating
export async function rateSupplier(
  organizationId: string,
  rating: Omit<SupplierRating, 'id' | 'created_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplier_ratings')
      .insert({
        ...rating,
        organization_id: organizationId
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    return false;
  }
}

// Get supplier performance metrics
export async function getSupplierPerformance(organizationId: string): Promise<SupplierPerformance[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_performance')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Get supplier payment summaries
export async function getSupplierPaymentSummaries(organizationId: string): Promise<SupplierPaymentSummary[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_payment_summary')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Get overdue purchases
export async function getOverduePurchases(organizationId: string): Promise<SupplierPurchase[]> {
  try {
    const currentDate = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('supplier_purchases')
      .select('*')
      .eq('organization_id', organizationId)
      .lt('due_date', currentDate)
      .not('status', 'eq', 'paid')
      .not('status', 'eq', 'cancelled')
      .order('due_date');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}

// Get all supplier payments 
export async function getAllSupplierPayments(organizationId: string): Promise<SupplierPayment[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
}
