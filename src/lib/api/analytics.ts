import { supabase } from '@/lib/supabase';

/**
 * واجهة بيانات ملخص المبيعات
 */
export interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  averageOrderValue: number;
  salesGrowth: number;
  profitMargin: number;
  pendingRevenue: number; // المبلغ المتبقي كدين (الدفعات الجزئية)
  partialPaymentCount: number; // عدد الطلبات ذات الدفع الجزئي
  salesByChannel: {
    pos: number;
    online: number;
  };
}

/**
 * واجهة بيانات المبيعات الشهرية
 */
export interface MonthlySales {
  salesByMonth: Record<string, number>;
}

/**
 * واجهة بيانات أعلى المنتجات مبيعًا
 */
export interface TopProducts {
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    profit: number;
    quantity: number;
  }>;
}

/**
 * واجهة بيانات أعلى الفئات مبيعًا
 */
export interface TopCategories {
  topCategories: Array<{
    id: string;
    name: string;
    sales: number;
    profit: number;
  }>;
}

/**
 * واجهة بيانات المصروفات
 */
export interface ExpensesData {
  total: number;
  categories: Record<string, number>;
}

/**
 * واجهة بيانات حالة المخزون
 */
export interface InventoryData {
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  totalItems: number;
}

/**
 * واجهة بيانات التحليلات الكاملة
 */
export interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  averageOrderValue: number;
  salesGrowth: number;
  profitMargin: number;
  pendingRevenue: number; // المبلغ المتبقي كدين (الدفعات الجزئية)
  partialPaymentCount: number; // عدد الطلبات ذات الدفع الجزئي
  salesByChannel: {
    pos: number;
    online: number;
  };
  salesByMonth: Record<string, number>;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    profit: number;
    quantity: number;
  }>;
  topCategories: Array<{
    id: string;
    name: string;
    sales: number;
    profit: number;
  }>;
  expenses: {
    total: number;
    categories: Record<string, number>;
  };
  inventory: {
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    totalItems: number;
  };
}

// نوع الفترة الزمنية
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * الحصول على ملخص المبيعات
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 */
export const getSalesSummary = async (
  organizationId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date
): Promise<SalesSummary> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // حساب نطاقات التاريخ
    const { dateRange, prevDateRange } = getDateRanges(period, startDate, endDate);

    // استعلام لإجمالي المبيعات والطلبات
    const { data: currentPeriodData, error: currentError } = await supabase.rpc(
      'get_sales_summary',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString()
      }
    );

    if (currentError) {
      throw currentError;
    }

    // معالجة البيانات كمصفوفة والوصول إلى العنصر الأول
    const currentSummary = Array.isArray(currentPeriodData) && currentPeriodData.length > 0 
      ? currentPeriodData[0] 
      : { 
          total_orders: 0, 
          completed_orders: 0, 
          total_revenue: 0, 
          actual_revenue: 0, 
          pending_revenue: 0, 
          discount_total: 0, 
          partial_payment_count: 0 
        };

    // استعلام للفترة السابقة (لحساب النمو)
    const { data: prevPeriodData, error: prevError } = await supabase.rpc(
      'get_sales_summary',
      {
        p_organization_id: organizationId,
        p_start_date: prevDateRange.start.toISOString(),
        p_end_date: prevDateRange.end.toISOString()
      }
    );

    if (prevError) {
      throw prevError;
    }

    // معالجة بيانات الفترة السابقة كمصفوفة
    const prevSummary = Array.isArray(prevPeriodData) && prevPeriodData.length > 0 
      ? prevPeriodData[0] 
      : { 
          total_orders: 0, 
          completed_orders: 0, 
          total_revenue: 0, 
          actual_revenue: 0, 
          pending_revenue: 0 
        };

    // حساب نمو المبيعات ونسبة الربح
    // ملاحظة: نستخدم actual_revenue + pending_revenue بدلاً من total_revenue لأن total_revenue قد تتضمن المبالغ التي تم اعتبارها كخصومات
    const currentSales = (currentSummary.actual_revenue || 0) + (currentSummary.pending_revenue || 0);
    const prevSales = (prevSummary.actual_revenue || 0) + (prevSummary.pending_revenue || 0);
    const salesGrowth = prevSales === 0 ? 100 : ((currentSales - prevSales) / prevSales) * 100;
    
    // تحديث حساب الربح ليعكس فقط الإيرادات الفعلية المستلمة
    // نحسب 35% من الإيرادات الفعلية كنسبة تقريبية للربح
    const totalProfit = currentSummary.actual_revenue ? 
      currentSummary.actual_revenue * 0.35 : 
      0;
    
    const profitMargin = currentSummary.actual_revenue === 0 ? 0 : (totalProfit / currentSummary.actual_revenue) * 100;

    // استعلام إضافي للحصول على عدد الطلبات ومتوسط قيمة الطلب
    const { data: ordersData, error: ordersError } = await supabase.rpc(
      'get_orders_stats',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString()
      }
    );

    if (ordersError) {
      throw ordersError;
    }

    // معالجة بيانات الطلبات كمصفوفة
    const ordersStats = Array.isArray(ordersData) && ordersData.length > 0 
      ? ordersData[0] 
      : { total_orders: 0, avg_order_value: 0 };

    // استعلام للحصول على مبيعات نقاط البيع مقابل المبيعات الإلكترونية
    const { data: channelData, error: channelError } = await supabase.rpc(
      'get_sales_by_channel',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString()
      }
    );

    if (channelError) {
      throw channelError;
    }

    // معالجة بيانات القنوات كمصفوفة
    const channelStats = Array.isArray(channelData) && channelData.length > 0 
      ? channelData[0] 
      : { pos_sales: 0, online_sales: 0 };

    // إعداد البيانات النهائية
    const result: SalesSummary = {
      totalSales: currentSales,
      totalOrders: currentSummary.total_orders || 0,
      totalProfit: totalProfit,
      averageOrderValue: ordersStats.avg_order_value || 0,
      salesGrowth: salesGrowth,
      profitMargin: profitMargin,
      pendingRevenue: currentSummary.pending_revenue || 0,
      partialPaymentCount: currentSummary.partial_payment_count || 0,
      salesByChannel: {
        pos: channelStats.pos_sales || 0,
        online: channelStats.online_sales || 0
      }
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على المبيعات الشهرية
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 */
export const getMonthlySales = async (
  organizationId: string,
  period: AnalyticsPeriod = 'year',
  startDate?: Date,
  endDate?: Date
): Promise<MonthlySales> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // تحديد نطاق التاريخ
    const { dateRange } = getDateRanges(period, startDate, endDate);

    // استعلام للمبيعات الشهرية
    const { data, error } = await supabase.rpc(
      'get_sales_by_period',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString(),
        p_interval: period === 'day' ? 'day' : period === 'week' ? 'week' : 'month',
        p_admin_id: userId
      }
    );

    if (error) {
      throw error;
    }

    // تحويل البيانات إلى القالب المطلوب
    const salesByMonth: Record<string, number> = {};

    // أسماء الأشهر بالعربية
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // التأكد من أن البيانات مصفوفة
    const salesData = Array.isArray(data) ? data : [];
    
    // تنسيق البيانات
    salesData.forEach((item: any) => {
      if (period === 'day') {
        const date = new Date(item.period);
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
        salesByMonth[formattedDate] = item.total_sales;
      } else if (period === 'week') {
        salesByMonth[`الأسبوع ${item.period}`] = item.total_sales;
      } else {
        // للشهور
        const monthIndex = new Date(item.period).getMonth();
        salesByMonth[monthNames[monthIndex]] = item.total_sales;
      }
    });

    return { salesByMonth };
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على أعلى المنتجات مبيعًا
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 * @param limit عدد المنتجات (اختياري، الافتراضي 5)
 */
export const getTopProducts = async (
  organizationId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date,
  limit: number = 5
): Promise<TopProducts> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // تحديد نطاق التاريخ
    const { dateRange } = getDateRanges(period, startDate, endDate);

    // استعلام لأعلى المنتجات مبيعًا
    const { data, error } = await supabase.rpc(
      'get_top_products',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString(),
        p_limit: limit,
        p_admin_id: userId
      }
    );

    if (error) {
      throw error;
    }

    // التأكد من أن البيانات مصفوفة
    const productsData = Array.isArray(data) ? data : [];
    
    // تحويل البيانات إلى القالب المطلوب
    const topProducts = productsData.map((item: any) => ({
      id: item.product_id,
      name: item.product_name,
      sales: item.total_sales,
      profit: item.total_profit,
      quantity: item.total_quantity
    }));

    return { topProducts };
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على أعلى الفئات مبيعًا
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 * @param limit عدد الفئات (اختياري، الافتراضي 5)
 */
export const getTopCategories = async (
  organizationId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date,
  limit: number = 5
): Promise<TopCategories> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // تحديد نطاق التاريخ
    const { dateRange } = getDateRanges(period, startDate, endDate);

    // استعلام لأعلى الفئات مبيعًا
    const { data, error } = await supabase.rpc(
      'get_top_categories',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString(),
        p_limit: limit,
        p_admin_id: userId
      }
    );

    if (error) {
      throw error;
    }

    // التأكد من أن البيانات مصفوفة
    const categoriesData = Array.isArray(data) ? data : [];
    
    // تحويل البيانات إلى القالب المطلوب
    const topCategories = categoriesData.map((item: any) => ({
      id: item.category_id,
      name: item.category_name,
      sales: item.total_sales,
      profit: item.total_profit
    }));

    return { topCategories };
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على بيانات المصروفات
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 */
export const getExpenses = async (
  organizationId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date
): Promise<ExpensesData> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // تحديد نطاق التاريخ
    const { dateRange } = getDateRanges(period, startDate, endDate);

    // استعلام لإجمالي المصروفات
    const { data: totalData, error: totalError } = await supabase.rpc(
      'get_total_expenses',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString(),
        p_admin_id: userId
      }
    );

    if (totalError) {
      throw totalError;
    }

    // التأكد من أن بيانات إجمالي المصروفات مصفوفة
    const totalExpenses = Array.isArray(totalData) && totalData.length > 0 
      ? totalData[0] 
      : { total_amount: 0 };

    // استعلام للمصروفات حسب الفئة
    const { data: categoryData, error: categoryError } = await supabase.rpc(
      'get_expenses_by_category',
      {
        p_organization_id: organizationId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString(),
        p_admin_id: userId
      }
    );

    if (categoryError) {
      throw categoryError;
    }

    // التأكد من أن بيانات المصروفات حسب الفئة مصفوفة
    const expensesCategories = Array.isArray(categoryData) ? categoryData : [];

    // تحويل البيانات إلى القالب المطلوب
    const categories: Record<string, number> = {};
    expensesCategories.forEach((item: any) => {
      categories[item.category] = item.total_amount;
    });

    const result = {
      total: totalExpenses.total_amount || 0,
      categories
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على حالة المخزون
 * @param organizationId معرف المؤسسة
 */
export const getInventoryStatus = async (
  organizationId: string
): Promise<InventoryData> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي إذا كان المستخدم غير مسجل دخوله

    // استعلام لحالة المخزون
    const { data, error } = await supabase.rpc(
      'get_inventory_status',
      {
        p_organization_id: organizationId,
        p_admin_id: userId
      }
    );

    if (error) {
      throw error;
    }

    // معالجة البيانات كمصفوفة والوصول إلى العنصر الأول
    const inventoryStatus = Array.isArray(data) && data.length > 0 
      ? data[0] 
      : { 
          total_value: 0, 
          low_stock_count: 0, 
          out_of_stock_count: 0, 
          total_products: 0 
        };

    // إعداد البيانات النهائية
    const result = {
      totalValue: inventoryStatus.total_value || 0,
      lowStock: inventoryStatus.low_stock_count || 0,
      outOfStock: inventoryStatus.out_of_stock_count || 0,
      totalItems: inventoryStatus.total_products || 0
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على جميع بيانات التحليلات دفعة واحدة
 * @param organizationId معرف المؤسسة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية (اختياري)
 * @param endDate تاريخ النهاية (اختياري)
 */
export const getAllAnalytics = async (
  organizationId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsData> => {
  try {

    // استدعاء جميع وظائف التحليلات
    const [salesSummary, monthlySales, topProducts, topCategories, expenses, inventory] = await Promise.all([
      getSalesSummary(organizationId, period, startDate, endDate),
      getMonthlySales(organizationId, period, startDate, endDate),
      getTopProducts(organizationId, period, startDate, endDate),
      getTopCategories(organizationId, period, startDate, endDate),
      getExpenses(organizationId, period, startDate, endDate),
      getInventoryStatus(organizationId)
    ]);
    
    // تجميع جميع البيانات في كائن واحد
    const analyticsData: AnalyticsData = {
      totalSales: salesSummary.totalSales,
      totalOrders: salesSummary.totalOrders,
      totalProfit: salesSummary.totalProfit,
      averageOrderValue: salesSummary.averageOrderValue,
      salesGrowth: salesSummary.salesGrowth,
      profitMargin: salesSummary.profitMargin,
      pendingRevenue: salesSummary.pendingRevenue,
      partialPaymentCount: salesSummary.partialPaymentCount,
      salesByChannel: salesSummary.salesByChannel,
      salesByMonth: monthlySales.salesByMonth,
      topProducts: topProducts.topProducts,
      topCategories: topCategories.topCategories,
      expenses: expenses,
      inventory: inventory
    };

    return analyticsData;
  } catch (error) {
    throw error;
  }
};

/**
 * وظيفة مساعدة لحساب نطاقات التاريخ بناءً على الفترة
 * @param period الفترة الزمنية
 * @param startDate تاريخ البداية المخصص (اختياري)
 * @param endDate تاريخ النهاية المخصص (اختياري)
 */
function getDateRanges(
  period: AnalyticsPeriod,
  startDate?: Date,
  endDate?: Date
): { 
  dateRange: { start: Date; end: Date }, 
  prevDateRange: { start: Date; end: Date } 
} {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  // إذا تم تحديد تاريخ مخصص
  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    // حساب الفترة الزمنية بناءً على النوع المحدد
    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1; // جعل بداية الأسبوع الإثنين
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diff), 23, 59, 59);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        // الشهر الحالي كافتراضي
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
  }

  // حساب الفترة السابقة (لمقارنة النمو)
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration);
  const prevEnd = new Date(start.getTime() - 1);

  return {
    dateRange: { start, end },
    prevDateRange: { start: prevStart, end: prevEnd }
  };
}
