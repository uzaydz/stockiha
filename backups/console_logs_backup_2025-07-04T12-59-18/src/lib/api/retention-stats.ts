import { supabase } from '@/lib/supabase-client';

// أنواع البيانات
export interface RetentionStatsData {
  total_records: number;
  records_last_30_days: number;
  records_last_60_days: number;
  records_last_90_days: number;
  records_older_than_year: number;
  critical_records: number;
  important_records: number;
  operation_breakdown: Record<string, number>;
  records_eligible_for_deletion: {
    normal_180_days: number;
    important_365_days: number;
    critical_1095_days: number;
  };
  disk_usage_estimate: {
    total_size_mb: number;
    archive_potential_mb: number;
  };
  retention_policies: any[];
  last_updated: string;
  organization_id: string;
}

// دالة جلب الإحصائيات
export async function fetchRetentionStats(organizationId: string): Promise<RetentionStatsData> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    // جلب جميع سجلات المخزون للمؤسسة
    const { data: inventoryLogs, error: logsError } = await supabase
      .from('inventory_log')
      .select('id, created_at, type, quantity, notes')
      .eq('organization_id', organizationId);

    if (logsError) {
      console.error('Error fetching inventory logs:', logsError);
      throw new Error(`Failed to fetch inventory logs: ${logsError.message}`);
    }

    if (!inventoryLogs || inventoryLogs.length === 0) {
      // إرجاع بيانات فارغة إذا لم توجد سجلات
      return {
        total_records: 0,
        records_last_30_days: 0,
        records_last_60_days: 0,
        records_last_90_days: 0,
        records_older_than_year: 0,
        critical_records: 0,
        important_records: 0,
        operation_breakdown: {},
        records_eligible_for_deletion: {
          normal_180_days: 0,
          important_365_days: 0,
          critical_1095_days: 0,
        },
        disk_usage_estimate: {
          total_size_mb: 0,
          archive_potential_mb: 0,
        },
        retention_policies: [],
        last_updated: new Date().toISOString(),
        organization_id: organizationId
      };
    }

    // حساب التواريخ المرجعية
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneHundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const tenNinetyFiveDaysAgo = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000);

    // تصنيف السجلات والحسابات
    let criticalRecords = 0;
    let importantRecords = 0;
    let normalEligibleForDeletion = 0;
    let importantEligibleForDeletion = 0;
    let criticalEligibleForDeletion = 0;

    const operationBreakdown: Record<string, number> = {};

    const stats = {
      total_records: inventoryLogs.length,
      records_last_30_days: 0,
      records_last_60_days: 0,
      records_last_90_days: 0,
      records_older_than_year: 0,
    };

    // معالجة كل سجل
    inventoryLogs.forEach(record => {
      const recordDate = new Date(record.created_at);
      const quantity = Math.abs(record.quantity || 0);

      // حساب التوزيع الزمني
      if (recordDate >= thirtyDaysAgo) stats.records_last_30_days++;
      if (recordDate >= sixtyDaysAgo) stats.records_last_60_days++;
      if (recordDate >= ninetyDaysAgo) stats.records_last_90_days++;
      if (recordDate < oneYearAgo) stats.records_older_than_year++;

      // تصنيف أهمية السجل بناءً على النوع والكمية
      const criticalTypes = ['purchase', 'return', 'theft', 'loss', 'damage', 'manual_adjustment'];
      const importantTypes = ['sale', 'pos_sale', 'adjustment', 'transfer'];

      let isCritical = criticalTypes.includes(record.type) || quantity >= 100;

      let isImportant = !isCritical && (
        importantTypes.includes(record.type) ||
        (quantity >= 25 && quantity < 100)
      );

      if (isCritical) {
        criticalRecords++;
        // السجلات الحرجة: 1095 يوم
        if (recordDate < tenNinetyFiveDaysAgo) {
          criticalEligibleForDeletion++;
        }
      } else if (isImportant) {
        importantRecords++;
        // السجلات المهمة: 365 يوم
        if (recordDate < threeSixtyFiveDaysAgo) {
          importantEligibleForDeletion++;
        }
      } else {
        // السجلات العادية: 180 يوم
        if (recordDate < oneHundredEightyDaysAgo) {
          normalEligibleForDeletion++;
        }
      }

      // إحصائيات العمليات
      operationBreakdown[record.type] = (operationBreakdown[record.type] || 0) + 1;
    });

    // التحقق من سياسات الاحتفاظ المخصصة
    const { data: retentionPolicies, error: policiesError } = await supabase
      .from('inventory_retention_policies_v2')
      .select('*')
      .eq('organization_id', organizationId);

    if (policiesError) {
      console.warn('Warning fetching retention policies:', policiesError);
    }

    // إنشاء النتيجة النهائية
    const result: RetentionStatsData = {
      ...stats,
      critical_records: criticalRecords,
      important_records: importantRecords,
      operation_breakdown: operationBreakdown,
      records_eligible_for_deletion: {
        normal_180_days: normalEligibleForDeletion,
        important_365_days: importantEligibleForDeletion,
        critical_1095_days: criticalEligibleForDeletion,
      },
      disk_usage_estimate: {
        total_size_mb: Math.round(inventoryLogs.length * 0.5), // تقدير تقريبي
        archive_potential_mb: Math.round((normalEligibleForDeletion + importantEligibleForDeletion + criticalEligibleForDeletion) * 0.5)
      },
      retention_policies: retentionPolicies || [],
      last_updated: now.toISOString(),
      organization_id: organizationId
    };

    return result;

  } catch (error) {
    console.error('Error in fetchRetentionStats:', error);
    throw new Error(`Failed to fetch retention statistics: ${error.message}`);
  }
}

// دالة معاينة التنظيف
export async function previewCleanup(organizationId: string) {
  try {
    const stats = await fetchRetentionStats(organizationId);
    
    return {
      success: true,
      preview: {
        total_records_to_delete: 
          stats.records_eligible_for_deletion.normal_180_days +
          stats.records_eligible_for_deletion.important_365_days +
          stats.records_eligible_for_deletion.critical_1095_days,
        breakdown: stats.records_eligible_for_deletion,
        estimated_space_saved: stats.disk_usage_estimate.archive_potential_mb
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// دالة تصدير البيانات
export async function exportInventoryLogs(
  organizationId: string, 
  type: 'all' | 'eligible' = 'all'
): Promise<any[]> {
  
  const { data: inventoryLogs, error } = await supabase
    .from('inventory_log')
    .select(`
      id,
      created_at,
      type,
      quantity,
      previous_stock,
      new_stock,
      notes,
      product_id,
      created_by,
      reference_id,
      reference_type
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to export logs: ${error.message}`);
  }

  if (type === 'eligible') {
    // فلترة السجلات المعرضة للحذف فقط
    const now = new Date();
    const oneHundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const tenNinetyFiveDaysAgo = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000);

    return inventoryLogs.filter(record => {
      const recordDate = new Date(record.created_at);
      const quantity = Math.abs(record.quantity || 0);

      const criticalTypes = ['purchase', 'return', 'theft', 'loss', 'damage', 'manual_adjustment'];
      const importantTypes = ['sale', 'pos_sale', 'adjustment', 'transfer'];

      let isCritical = criticalTypes.includes(record.type) || quantity >= 100;

      let isImportant = !isCritical && (
        importantTypes.includes(record.type) ||
        (quantity >= 25 && quantity < 100)
      );

      if (isCritical) {
        return recordDate < tenNinetyFiveDaysAgo;
      } else if (isImportant) {
        return recordDate < threeSixtyFiveDaysAgo;
      } else {
        return recordDate < oneHundredEightyDaysAgo;
      }
    });
  }

  return inventoryLogs;
} 