/**
 * مكون عرض سجلات التدقيق المحسن
 * يدعم النظام الجديد ويوفر واجهة بصرية محسنة
 */

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  User, 
  Settings, 
  FileText, 
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import {
  useAuditLogs,
  useAuditStatistics,
  exportAuditLogs,
  cleanupOldAuditLogs,
  type AuditLogFilters
} from '../lib/api/optimized-audit';

interface AuditLogOptimizedProps {
  organizationId: string;
  showStatistics?: boolean;
  showFilters?: boolean;
  defaultFilters?: AuditLogFilters;
}

export const AuditLogOptimized: React.FC<AuditLogOptimizedProps> = ({
  organizationId,
  showStatistics = true,
  showFilters = true,
  defaultFilters = {}
}) => {
  const [filters, setFilters] = useState<AuditLogFilters>({
    organization_id: organizationId,
    ...defaultFilters
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // جلب البيانات
  const { logs, loading, error, refetch } = useAuditLogs(filters);
  const { stats, loading: statsLoading } = useAuditStatistics(organizationId);

  // معالجة التصدير
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAuditLogs(filters);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('خطأ في التصدير:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // معالجة التنظيف
  const handleCleanup = async () => {
    if (!confirm('هل أنت متأكد من حذف السجلات القديمة؟')) return;
    
    setIsCleaning(true);
    try {
      const success = await cleanupOldAuditLogs();
      if (success) {
        refetch();
        alert('تم تنظيف السجلات القديمة بنجاح');
      }
    } catch (error) {
      console.error('خطأ في التنظيف:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  // تنسيق الإحصائيات
  const formatStats = useMemo(() => {
    if (!stats) return null;

    return {
      ...stats,
      space_saved_mb: (stats.space_saved / 1024 / 1024).toFixed(2)
    };
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      {showStatistics && formatStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">إجمالي التغييرات</p>
                <p className="text-2xl font-bold text-gray-900">{formatStats.total_changes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">التغييرات المهمة</p>
                <p className="text-2xl font-bold text-gray-900">{formatStats.major_changes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">المساحة المحفوظة</p>
                <p className="text-2xl font-bold text-gray-900">{formatStats.space_saved_mb} MB</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-500" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600">كفاءة النظام</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((formatStats.total_changes - formatStats.major_changes) / formatStats.total_changes * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الفلاتر والإجراءات */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {showFilters && (
              <>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filters.setting_type || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      setting_type: e.target.value as any || undefined
                    }))}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="">جميع الأنواع</option>
                    <option value="user">إعدادات المستخدم</option>
                    <option value="organization">إعدادات المؤسسة</option>
                    <option value="store">إعدادات المتجر</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="major-only"
                    checked={filters.major_changes_only || false}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      major_changes_only: e.target.checked || undefined
                    }))}
                    className="rounded"
                  />
                  <label htmlFor="major-only" className="text-sm text-gray-700">
                    التغييرات المهمة فقط
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'جاري التصدير...' : 'تصدير'}
            </button>

            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {isCleaning ? 'جاري التنظيف...' : 'تنظيف القديم'}
            </button>
          </div>
        </div>
      </div>

      {/* قائمة السجلات */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سجل التدقيق المحسن
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              جاري التحميل...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              خطأ: {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد سجلات تدقيق
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      log.is_major_change 
                        ? 'bg-orange-500' 
                        : log.action_type === 'DELETE'
                        ? 'bg-red-500'
                        : log.action_type === 'INSERT'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.is_major_change
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.setting_type}
                        </span>
                        
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.action_type === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : log.action_type === 'INSERT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.action_type}
                        </span>

                        {log.is_major_change && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            مهم
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-900 font-medium">
                        {log.summary || `تغيير في ${log.setting_key}`}
                      </p>

                      {log.changed_fields && log.changed_fields.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          الحقول المتغيرة: {log.changed_fields.join('، ')}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_name || 'مستخدم غير محدد'}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString('ar')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {log.field_changes && Object.keys(log.field_changes).length > 0 && (
                    <div className="flex-shrink-0">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          التفاصيل
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-left" dir="ltr">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(log.field_changes, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* زر تحميل المزيد */}
        {logs.length >= (filters.limit || 50) && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={() => setFilters(prev => ({
                ...prev,
                limit: (prev.limit || 50) + 50
              }))}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 