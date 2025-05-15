/**
 * إصلاح مزامنة رسوم ياليدين
 * 
 * هذا الملف يعالج مشاكل مزامنة بيانات أسعار التوصيل من ياليدين إلى قاعدة البيانات
 * المشكلة الرئيسية: عدم تطابق أسماء الحقول بين استجابة API والجدول في قاعدة البيانات
 */

import { supabase } from '@/lib/supabase-client';

/**
 * التحقق من وجود البيانات في قاعدة البيانات
 */
export async function checkYalidineFees(organizationId: string): Promise<{ 
  count: number, 
  hasProblem: boolean,
  fixes: string[]
}> {
  try {
    // تحقق من عدد سجلات الرسوم
    const { count, error } = await supabase
      .from('yalidine_fees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('[FEES_FIX] خطأ في التحقق من سجلات الرسوم:', error);
      return { count: 0, hasProblem: true, fixes: ['خطأ في قراءة البيانات من قاعدة البيانات'] };
    }
    
    const hasProblem = count === 0;
    const fixes: string[] = [];
    
    // التحقق من هيكل الجدول
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'yalidine_fees' });
    
    if (tableError) {
      console.error('[FEES_FIX] خطأ في التحقق من هيكل الجدول:', tableError);
      fixes.push('خطأ في التحقق من هيكل جدول البيانات');
    } else {
      // التحقق من وجود الأعمدة المطلوبة
      const requiredColumns = [
        'express_home', 'express_desk', 'economic_home', 'economic_desk',
        'home_fee', 'stop_desk_fee'
      ];
      
      // تحديد الأعمدة الموجودة
      const existingColumns = tableInfo.map((col: any) => col.column_name);
      
      // التحقق من وجود مشكلة في أسماء الأعمدة
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        fixes.push(`بعض الأعمدة المطلوبة غير موجودة: ${missingColumns.join(', ')}`);
      }
      
      // التحقق إذا كانت هناك مشكلة في تسمية الحقول في الكود
      if (existingColumns.includes('express_home') && existingColumns.includes('home_fee')) {
        fixes.push('توجد ازدواجية في أسماء حقول الرسوم (express_home و home_fee)');
      }
    }
    
    return { count: count || 0, hasProblem, fixes };
  } catch (error) {
    console.error('[FEES_FIX] خطأ في التحقق من بيانات الرسوم:', error);
    return { count: 0, hasProblem: true, fixes: ['خطأ غير متوقع أثناء التحقق من البيانات'] };
  }
}

/**
 * إصلاح جدول الرسوم لضمان وجود الأعمدة الصحيحة
 */
export async function fixYalidineFeeTable(): Promise<boolean> {
  try {
    // التحقق أولاً من وجود الجدول
    const { data: tableExists, error: tableError } = await supabase
      .rpc('table_exists', { table_name: 'yalidine_fees' });
    
    if (tableError || !tableExists) {
      console.error('[FEES_FIX] الجدول غير موجود:', tableError);
      return false;
    }
    
    // 1. إضافة الأعمدة الناقصة إذا لزم الأمر
    const columns = [
      { name: 'express_home', type: 'INTEGER' },
      { name: 'express_desk', type: 'INTEGER' },
      { name: 'economic_home', type: 'INTEGER' },
      { name: 'economic_desk', type: 'INTEGER' },
      { name: 'home_fee', type: 'INTEGER' },
      { name: 'stop_desk_fee', type: 'INTEGER' },
      { name: 'is_home_available', type: 'BOOLEAN' },
      { name: 'is_stop_desk_available', type: 'BOOLEAN' }
    ];
    
    // إضافة كل عمود إذا لم يكن موجوداً
    for (const column of columns) {
      const { error } = await supabase.rpc(
        'add_column_if_not_exists',
        { 
          p_table_name: 'yalidine_fees',
          p_column_name: column.name,
          p_column_type: column.type
        }
      );
      
      if (error) {
        console.error(`[FEES_FIX] خطأ في إضافة العمود ${column.name}:`, error);
      } else {
        
      }
    }
    
    // 2. توحيد أسماء الحقول (إنشاء trigger لنسخ البيانات بين الحقول المتشابهة)
    const { error: triggerError } = await supabase.rpc(
      'create_sync_columns_trigger',
      {
        p_table_name: 'yalidine_fees',
        p_column_mapping: JSON.stringify({
          'home_fee': 'express_home',
          'stop_desk_fee': 'express_desk'
        })
      }
    );
    
    if (triggerError) {
      console.error('[FEES_FIX] خطأ في إنشاء trigger لمزامنة الأعمدة:', triggerError);
      return false;
    }
    
    
    return true;
  } catch (error) {
    console.error('[FEES_FIX] خطأ في إصلاح جدول الرسوم:', error);
    return false;
  }
}

/**
 * إصلاح دالة حفظ الرسوم على قاعدة البيانات
 */
export async function saveFeesBatch(fees: any[], organizationId: string): Promise<{ success: boolean, message: string }> {
  if (fees.length === 0) {
    return { success: true, message: 'لا توجد بيانات للحفظ' };
  }
  
  try {
    
    
    // معالجة البيانات قبل الحفظ للتأكد من تطابق أسماء الحقول
    const formattedFees = fees.map(fee => ({
      organization_id: organizationId,
      from_wilaya_id: fee.from_wilaya_id,
      to_wilaya_id: fee.to_wilaya_id,
      from_wilaya_name: fee.from_wilaya_name,
      to_wilaya_name: fee.to_wilaya_name,
      commune_id: fee.commune_id,
      commune_name: fee.commune_name,
      // استخدام أسماء الحقول الصحيحة حسب جدول قاعدة البيانات
      express_home: fee.home_fee || fee.express_home,
      express_desk: fee.stop_desk_fee || fee.express_desk,
      economic_home: null, // غير متوفر في API ياليدين الحالي
      economic_desk: null, // غير متوفر في API ياليدين الحالي
      is_home_available: fee.is_home_available,
      is_stop_desk_available: fee.is_stop_desk_available,
      zone: null, // يتم تعيينه لاحقاً
      retour_fee: null, // يتم تعيينه لاحقاً
      cod_percentage: null, // يتم تعيينه لاحقاً
      insurance_percentage: null, // يتم تعيينه لاحقاً
      oversize_fee: null // يتم تعيينه لاحقاً
    }));
    
    // حفظ البيانات المعالجة
    const { error } = await supabase
      .from('yalidine_fees')
      .upsert(formattedFees, {
        onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('[FEES_FIX] خطأ في حفظ الرسوم:', error);
      return { success: false, message: `خطأ في حفظ البيانات: ${error.message}` };
    }
    
    return { success: true, message: `تم حفظ ${formattedFees.length} سجل بنجاح` };
  } catch (error: any) {
    console.error('[FEES_FIX] خطأ في حفظ الرسوم:', error);
    return { success: false, message: `خطأ غير متوقع: ${error.message}` };
  }
}

/**
 * إعادة محاولة حفظ بيانات المزامنة للرسوم المتعرضة لمشاكل
 */
export async function retryFailedSync(fees: any[], organizationId: string): Promise<boolean> {
  try {
    // تقسيم البيانات إلى دفعات للحفظ
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < fees.length; i += batchSize) {
      batches.push(fees.slice(i, i + batchSize));
    }
    
    
    
    let successCount = 0;
    let failCount = 0;
    
    // معالجة كل دفعة على حدة
    for (let i = 0; i < batches.length; i++) {
      const result = await saveFeesBatch(batches[i], organizationId);
      
      if (result.success) {
        successCount += batches[i].length;
      } else {
        failCount += batches[i].length;
      }
      
      
    }
    
    
    return successCount > 0;
  } catch (error) {
    console.error('[FEES_FIX] خطأ في إعادة محاولة المزامنة:', error);
    return false;
  }
}

/**
 * التحقق من إعدادات اتجاه الشحن
 */
export async function checkShippingDirection(): Promise<{
  configured: boolean;
  direction: 'store_to_province' | 'province_to_store' | 'unknown';
  message: string;
}> {
  try {
    // محاولة تحديد كيفية تكوين النظام
    const { data: fees, error } = await supabase
      .from('yalidine_fees')
      .select('from_wilaya_id, to_wilaya_id, from_wilaya_name, to_wilaya_name')
      .limit(10);
    
    if (error || !fees || fees.length === 0) {
      return {
        configured: false,
        direction: 'unknown',
        message: 'لا يمكن تحديد اتجاه الشحن: لا توجد بيانات أسعار'
      };
    }
    
    // تحليل البيانات لمعرفة كيفية تكوين النظام
    const uniqueFromIds = new Set(fees.map(fee => fee.from_wilaya_id));
    const uniqueToIds = new Set(fees.map(fee => fee.to_wilaya_id));
    
    // إذا كان هناك مصدر واحد وعدة وجهات، فهذا يشير إلى اتجاه من المتجر إلى الولايات
    if (uniqueFromIds.size === 1 && uniqueToIds.size > 1) {
      return {
        configured: true,
        direction: 'store_to_province',
        message: `النظام مكوّن بشكل صحيح: المتجر (${fees[0].from_wilaya_name}) يرسل إلى ولايات متعددة`
      };
    }
    
    // إذا كان هناك وجهة واحدة وعدة مصادر، فهذا يشير إلى اتجاه من الولايات إلى المتجر
    if (uniqueToIds.size === 1 && uniqueFromIds.size > 1) {
      return {
        configured: true,
        direction: 'province_to_store',
        message: `النظام مكوّن للاستلام: ولايات متعددة ترسل إلى المتجر (${fees[0].to_wilaya_name})`
      };
    }
    
    return {
      configured: false,
      direction: 'unknown',
      message: 'بيانات الأسعار غير متناسقة، لا يمكن تحديد الاتجاه'
    };
  } catch (error) {
    console.error('[FEES_FIX] خطأ في التحقق من اتجاه الشحن:', error);
    return {
      configured: false,
      direction: 'unknown',
      message: 'خطأ في التحقق من اتجاه الشحن'
    };
  }
}

/**
 * التحقق من حالة المحفز yalidine_fees_redirect_trigger
 * @returns معلومات حول حالة المحفز (مفعل/معطل) وإحصائيات الجداول
 */
export async function checkYalidineTriggersStatus(): Promise<{
  triggerStatus?: string;
  tableStats: {
    yalidine_fees: { count: number };
    yalidine_fees_new: { count: number };
  };
  success: boolean;
  message: string;
}> {
  try {
    
    
    // 1. التحقق من عدد السجلات في جدول yalidine_fees
    const { count: feesCount, error: feesError } = await supabase
      .from('yalidine_fees')
      .select('*', { count: 'exact', head: true });
      
    if (feesError) {
      console.error('[FEES_FIX] خطأ في التحقق من جدول yalidine_fees:', feesError);
    }
    
    // 2. التحقق من وجود جدول yalidine_fees_new وعدد سجلاته
    let newFeesCount = 0;
    try {
      const { count, error } = await supabase
        .from('yalidine_fees_new')
        .select('*', { count: 'exact', head: true });
        
      if (!error && count !== null) {
        newFeesCount = count;
      }
    } catch (e) {
      
    }
    
    // 3. محاولة التحقق من حالة المحفز (قد يتطلب صلاحيات أعلى)
    let triggerStatus = 'غير معروف (حاجة لصلاحيات أعلى)';
    
    try {
      const { data: triggerData, error: triggerError } = await supabase.rpc(
        'check_yalidine_trigger_status',
        {}
      );
      
      if (!triggerError && triggerData) {
        triggerStatus = triggerData === 'D' ? 'معطل' : 'مفعل';
      }
    } catch (e) {
      
    }
    
    return {
      triggerStatus,
      tableStats: {
        yalidine_fees: { count: feesCount || 0 },
        yalidine_fees_new: { count: newFeesCount }
      },
      success: true,
      message: 'تم التحقق من حالة محفزات ياليدين بنجاح'
    };
  } catch (error) {
    console.error('[FEES_FIX] خطأ غير متوقع أثناء التحقق من حالة المحفزات:', error);
    return {
      tableStats: {
        yalidine_fees: { count: 0 },
        yalidine_fees_new: { count: 0 }
      },
      success: false,
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * تنفيذ إصلاح محفز ياليدين
 * ملاحظة: هذه الوظيفة تتطلب صلاحيات أعلى وقد لا تعمل في بيئة الإنتاج
 */
export async function applyYalidineTriggerFix(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    
    
    const { data, error } = await supabase.rpc(
      'fix_yalidine_redirect_trigger',
      {}
    );
    
    if (error) {
      console.error('[FEES_FIX] خطأ في تنفيذ إصلاح المحفز:', error);
      return {
        success: false,
        message: `فشل الإصلاح: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: data || 'تم تعطيل المحفز بنجاح'
    };
  } catch (error) {
    console.error('[FEES_FIX] خطأ غير متوقع أثناء تنفيذ الإصلاح:', error);
    return {
      success: false,
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * وظيفة بديلة لحفظ رسوم التوصيل عند فشل RPC
 * @param fees بيانات الرسوم
 * @param organizationId معرف المنظمة
 * @returns نتيجة العملية
 */
export async function saveFeesBatch(
  fees: any[],
  organizationId: string
): Promise<{ success: boolean; message: string; count: number }> {
  if (!fees || fees.length === 0) {
    return { success: true, message: 'لا توجد بيانات للحفظ', count: 0 };
  }
  
  try {
    
    
    // 1. تعديل البيانات للتأكد من توافقها مع هيكل الجدول
    const processedFees = fees.map(fee => ({
      organization_id: organizationId,
      from_wilaya_id: Number(fee.from_wilaya_id),
      to_wilaya_id: Number(fee.to_wilaya_id),
      commune_id: Number(fee.commune_id || 0),
      from_wilaya_name: fee.from_wilaya_name,
      to_wilaya_name: fee.to_wilaya_name,
      commune_name: fee.commune_name || '',
      zone: Number(fee.zone || 0),
      retour_fee: Number(fee.retour_fee || 0),
      cod_percentage: Number(fee.cod_percentage || 0),
      insurance_percentage: Number(fee.insurance_percentage || 0),
      oversize_fee: Number(fee.oversize_fee || 0),
      express_home: Number(fee.express_home || 0),
      express_desk: Number(fee.express_desk || 0),
      economic_home: Number(fee.economic_home || 0),
      economic_desk: Number(fee.economic_desk || 0),
      is_home_available: fee.is_home_available !== false,
      is_stop_desk_available: fee.is_stop_desk_available !== false,
      home_fee: Number(fee.home_fee || fee.express_home || 0),
      stop_desk_fee: Number(fee.stop_desk_fee || fee.express_desk || 0),
      last_updated_at: new Date().toISOString()
    }));
    
    // 2. تحديث السجلات باستخدام upsert مباشر
    const { error } = await supabase
      .from('yalidine_fees')
      .upsert(processedFees, {
        onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('[FEES_FIX] خطأ في حفظ البيانات بالطريقة البديلة:', error);
      
      // محاولة الحفظ بطريقة أخرى - بدفعات أصغر
      if (fees.length > 20) {
        
        
        const batchSize = 20;
        let successCount = 0;
        
        for (let i = 0; i < processedFees.length; i += batchSize) {
          const batch = processedFees.slice(i, i + batchSize);
          
          try {
            // تجربة حفظ دفعة صغيرة
            const { error: batchError } = await supabase
              .from('yalidine_fees')
              .upsert(batch, {
                onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
                ignoreDuplicates: false
              });
            
            if (!batchError) {
              successCount += batch.length;
              
            } else {
              console.error(`[FEES_FIX] خطأ في حفظ الدفعة ${i/batchSize + 1}:`, batchError);
            }
          } catch (batchError) {
            console.error(`[FEES_FIX] خطأ غير متوقع في دفعة ${i/batchSize + 1}:`, batchError);
          }
          
          // انتظار لتخفيف الضغط على قاعدة البيانات
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return {
          success: successCount > 0,
          message: `تم حفظ ${successCount} من ${fees.length} سجل باستخدام الدفعات الصغيرة`,
          count: successCount
        };
      }
      
      return {
        success: false,
        message: `فشل الحفظ: ${error.message}`,
        count: 0
      };
    }
    
    // التحقق من نجاح عملية الحفظ
    const { count, error: countError } = await supabase
      .from('yalidine_fees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    return {
      success: true,
      message: `تم حفظ ${fees.length} سجل بنجاح (إجمالي السجلات: ${count || 'غير معروف'})`,
      count: fees.length
    };
  } catch (error) {
    console.error('[FEES_FIX] خطأ غير متوقع أثناء حفظ البيانات:', error);
    return {
      success: false,
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : String(error)}`,
      count: 0
    };
  }
}

/**
 * نقل البيانات من جدول yalidine_fees_new إلى yalidine_fees
 */
export async function migrateFeesFromNewTable(
  organizationId: string
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    
    
    // التحقق من وجود بيانات في الجدول الجديد
    const { count, error: countError } = await supabase
      .from('yalidine_fees_new')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    if (countError || !count || count === 0) {
      return {
        success: true,
        message: 'لا توجد بيانات في الجدول yalidine_fees_new للنقل',
        count: 0
      };
    }
    
    // استدعاء إجراء RPC لنقل البيانات
    const { data, error } = await supabase.rpc(
      'migrate_yalidine_fees_data',
      { p_organization_id: organizationId }
    );
    
    if (error) {
      console.error('[FEES_FIX] خطأ في نقل البيانات:', error);
      return {
        success: false,
        message: `فشل نقل البيانات: ${error.message}`,
        count: 0
      };
    }
    
    return {
      success: true,
      message: `تم نقل ${data || count} سجل من yalidine_fees_new إلى yalidine_fees`,
      count: data || count
    };
  } catch (error) {
    console.error('[FEES_FIX] خطأ غير متوقع أثناء نقل البيانات:', error);
    return {
      success: false,
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : String(error)}`,
      count: 0
    };
  }
} 