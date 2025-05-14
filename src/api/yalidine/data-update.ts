/**
 * وظائف للتحقق من تحديثات البيانات
 */

import { supabase } from '@/lib/supabase-client';

/**
 * وظيفة فحص آخر تحديث للبيانات
 * @param organizationId معرف المنظمة
 * @param dataType نوع البيانات (provinces, municipalities, centers, fees)
 * @returns تاريخ آخر تحديث أو null إذا لم يتم التحديث من قبل
 */
export async function getLastUpdate(organizationId: string, dataType: string): Promise<Date | null> {
  try {
    let tableName = '';
    
    switch (dataType) {
      case 'provinces':
        tableName = 'yalidine_provinces';
        break;
      case 'municipalities':
        tableName = 'yalidine_municipalities';
        break;
      case 'centers':
        tableName = 'yalidine_centers';
        break;
      case 'fees':
        tableName = 'yalidine_fees';
        break;
      default:
        return null;
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .select('last_updated_at')
      .eq('organization_id', organizationId)
      .order('last_updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error(`خطأ أثناء فحص آخر تحديث لـ ${dataType}:`, error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return new Date(data[0].last_updated_at);
  } catch (error) {
    console.error(`خطأ أثناء فحص آخر تحديث لـ ${dataType}:`, error);
    return null;
  }
}

/**
 * وظيفة للتحقق من تحديث البيانات وتحديثها إذا كانت قديمة
 * تستخدم مع الوظيفة الرئيسية لمزامنة البيانات
 * 
 * @param organizationId معرف المنظمة
 * @param dataType نوع البيانات (provinces, municipalities, centers, fees)
 * @param forceUpdate إجبار التحديث بغض النظر عن تاريخ آخر تحديث
 * @param syncFunction وظيفة المزامنة الرئيسية التي سيتم استدعاؤها
 * @returns true إذا كانت البيانات محدثة، false إذا فشل التحديث
 */
export async function checkAndUpdateData(
  organizationId: string,
  dataType: string,
  forceUpdate: boolean = false,
  syncFunction: (organizationId: string, forceUpdate: boolean) => Promise<boolean>
): Promise<boolean> {
  try {
    // في حالة طلب التحديث الإجباري
    if (forceUpdate) {
      console.log(`بدء التحديث الإجباري لبيانات ${dataType} للمنظمة ${organizationId}`);
      return await syncFunction(organizationId, true);
    }
    
    // فحص آخر تحديث
    const lastUpdate = await getLastUpdate(organizationId, dataType);
    const now = new Date();
    
    // تحديث البيانات إذا:
    // 1. لم يتم التحديث من قبل (lastUpdate = null)
    // 2. مر أكثر من أسبوع على آخر تحديث
    const needsUpdate = 
      !lastUpdate || 
      (now.getTime() - lastUpdate.getTime() > 7 * 24 * 60 * 60 * 1000);
    
    if (needsUpdate) {
      console.log(`بيانات ${dataType} بحاجة إلى تحديث للمنظمة ${organizationId}`);
      return await syncFunction(organizationId, true);
    } else {
      console.log(`بيانات ${dataType} محدثة بالفعل للمنظمة ${organizationId}. آخر تحديث: ${lastUpdate.toISOString()}`);
      return true;
    }
  } catch (error) {
    console.error(`خطأ أثناء فحص وتحديث بيانات ${dataType}:`, error);
    return false;
  }
} 