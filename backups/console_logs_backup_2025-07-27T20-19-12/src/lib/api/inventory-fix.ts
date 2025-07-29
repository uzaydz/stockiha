import { supabase } from '@/lib/supabase';

export interface StockCalculationCheck {
  product_name: string;
  current_stock: number;
  calculated_stock: number;
  colors_count: number;
  sizes_count: number;
  needs_fix: boolean;
}

/**
 * فحص حساب المخزون في منتج واحد
 */
export const checkProductStockCalculation = async (productId: string): Promise<StockCalculationCheck[]> => {
  try {
    const { data, error } = await supabase.rpc('check_product_stock_calculation', {
      p_product_id: productId
    });

    if (error) {
      throw new Error(`فشل فحص حساب المخزون: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('خطأ في فحص حساب المخزون:', error);
    throw new Error(error.message || 'فشل فحص حساب المخزون');
  }
};

/**
 * إصلاح حساب المخزون في منتج واحد
 */
export const fixProductStockCalculation = async (productId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('fix_product_stock_calculation', {
      p_product_id: productId
    });

    if (error) {
      throw new Error(`فشل إصلاح حساب المخزون: ${error.message}`);
    }

    return data || false;
  } catch (error: any) {
    console.error('خطأ في إصلاح حساب المخزون:', error);
    throw new Error(error.message || 'فشل إصلاح حساب المخزون');
  }
};

/**
 * إصلاح حساب المخزون في جميع المنتجات
 */
export const fixAllProductsStockCalculation = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('fix_all_products_stock_calculation');

    if (error) {
      throw new Error(`فشل إصلاح حساب المخزون: ${error.message}`);
    }

    return data || 0;
  } catch (error: any) {
    console.error('خطأ في إصلاح حساب المخزون:', error);
    throw new Error(error.message || 'فشل إصلاح حساب المخزون');
  }
}; 