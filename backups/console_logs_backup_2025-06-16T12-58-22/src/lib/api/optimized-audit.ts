/**
 * نظام التدقيق المحسن - واجهة برمجة التطبيقات
 * يدعم النظام الجديد الذي يحفظ الفروقات فقط
 */

import { supabase } from '../supabase';
import React from 'react';

// ================= أنواع البيانات =================

export interface FieldChange {
  old: any;
  new: any;
}

export interface AuditLogOptimized {
  id: string;
  user_id: string;
  organization_id: string | null;
  setting_type: 'user' | 'organization' | 'store';
  setting_key: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string | null;
  changed_fields: string[] | null;
  field_changes: Record<string, FieldChange> | null;
  is_major_change: boolean;
  summary: string | null;
  created_at: string;
}

export interface AuditLogReadable extends AuditLogOptimized {
  user_name: string | null;
  user_email: string | null;
  organization_name: string | null;
}

export interface AuditLogFilters {
  organization_id?: string;
  setting_type?: 'user' | 'organization' | 'store';
  action_type?: 'INSERT' | 'UPDATE' | 'DELETE';
  major_changes_only?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

// ================= وظائف محسنة للتدقيق =================

/**
 * جلب سجلات التدقيق المحسنة مع فلترة ذكية
 */
export const getOptimizedAuditLogs = async (
  filters: AuditLogFilters = {}
): Promise<AuditLogReadable[]> => {
  try {
    let query = supabase
      .from('audit_log_readable')
      .select('*');

    // تطبيق الفلاتر
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }

    if (filters.setting_type) {
      query = query.eq('setting_type', filters.setting_type);
    }

    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type);
    }

    if (filters.major_changes_only) {
      query = query.eq('is_major_change', true);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50);

    const { data, error } = await query;

    if (error) {
      console.error('خطأ في جلب سجلات التدقيق:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('خطأ في getOptimizedAuditLogs:', error);
    return [];
  }
};

/**
 * تسجيل تغيير مهم يدوياً (للعمليات الخاصة)
 */
export const logMajorChange = async (
  organizationId: string,
  settingType: 'user' | 'organization' | 'store',
  settingKey: string,
  summary: string,
  fieldChanges?: Record<string, FieldChange>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('settings_audit_log_optimized')
      .insert({
        organization_id: organizationId,
        setting_type: settingType,
        setting_key: settingKey,
        action_type: 'UPDATE',
        table_name: `${settingType}_settings`,
        field_changes: fieldChanges || null,
        changed_fields: fieldChanges ? Object.keys(fieldChanges) : null,
        is_major_change: true,
        summary: summary,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('خطأ في تسجيل التغيير المهم:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('خطأ في logMajorChange:', error);
    return false;
  }
};

/**
 * إحصائيات التدقيق المحسنة
 */
export const getAuditStatistics = async (
  organizationId: string,
  days: number = 30
): Promise<{
  total_changes: number;
  major_changes: number;
  changes_by_type: Record<string, number>;
  recent_activity: AuditLogReadable[];
  space_saved: number; // تقدير المساحة المحفوظة
}> => {
  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data: stats } = await supabase
      .from('settings_audit_log_optimized')
      .select(`
        setting_type,
        is_major_change,
        created_at
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', dateFrom.toISOString());

    if (!stats) {
      return {
        total_changes: 0,
        major_changes: 0,
        changes_by_type: {},
        recent_activity: [],
        space_saved: 0
      };
    }

    // حساب الإحصائيات
    const total_changes = stats.length;
    const major_changes = stats.filter(s => s.is_major_change).length;
    
    const changes_by_type = stats.reduce((acc, stat) => {
      acc[stat.setting_type] = (acc[stat.setting_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // جلب النشاط الأخير
    const recent_activity = await getOptimizedAuditLogs({
      organization_id: organizationId,
      limit: 10
    });

    // تقدير المساحة المحفوظة (مقارنة بالنظام القديم)
    const space_saved = total_changes * 800; // تقدير: 800KB محفوظة لكل عملية

    return {
      total_changes,
      major_changes,
      changes_by_type,
      recent_activity,
      space_saved
    };
  } catch (error) {
    console.error('خطأ في getAuditStatistics:', error);
    return {
      total_changes: 0,
      major_changes: 0,
      changes_by_type: {},
      recent_activity: [],
      space_saved: 0
    };
  }
};

/**
 * تنظيف سجلات التدقيق القديمة (للمديرين)
 */
export const cleanupOldAuditLogs = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('cleanup_old_audit_logs');

    if (error) {
      console.error('خطأ في تنظيف سجلات التدقيق:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('خطأ في cleanupOldAuditLogs:', error);
    return false;
  }
};

/**
 * تصدير سجلات التدقيق
 */
export const exportAuditLogs = async (
  filters: AuditLogFilters = {}
): Promise<Blob | null> => {
  try {
    const logs = await getOptimizedAuditLogs({
      ...filters,
      limit: 10000 // حد أعلى للتصدير
    });

    const csvContent = [
      // رؤوس الأعمدة
      'التاريخ,المستخدم,المؤسسة,نوع الإعداد,مفتاح الإعداد,نوع العملية,الملخص,تغيير مهم',
      // البيانات
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString('ar'),
        log.user_name || 'غير محدد',
        log.organization_name || 'غير محدد',
        log.setting_type,
        log.setting_key,
        log.action_type,
        log.summary || 'غير محدد',
        log.is_major_change ? 'نعم' : 'لا'
      ].join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  } catch (error) {
    console.error('خطأ في تصدير سجلات التدقيق:', error);
    return null;
  }
};

// ================= هوكات React للتدقيق =================

/**
 * Hook لجلب سجلات التدقيق مع إعادة التحميل التلقائي
 */
export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  const [logs, setLogs] = React.useState<AuditLogReadable[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getOptimizedAuditLogs(filters);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  };
};

/**
 * Hook لإحصائيات التدقيق
 */
export const useAuditStatistics = (organizationId: string, days = 30) => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!organizationId) return;

    getAuditStatistics(organizationId, days)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [organizationId, days]);

  return { stats, loading };
}; 