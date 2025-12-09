import React from 'react';
import { usePendingOperations } from '@/hooks/usePendingOperations';

/**
 * 🎯 مكون React لعرض مؤشر العمليات المعلقة
 * يمكن استخدامه في الـ Navbar أو أي مكان آخر
 */
export const PendingOperationsIndicator: React.FC<{
  className?: string;
  showDetails?: boolean;
}> = ({ className = '', showDetails = false }) => {
  const { stats, status, hasPending, refresh } = usePendingOperations();

  if (!hasPending) return null;

  const statusColors = {
    normal: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  const statusIcons = {
    normal: '📡',
    warning: '⚠️',
    critical: '🚨'
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm cursor-pointer ${statusColors[status]} ${className}`}
      onClick={() => refresh()}
      title="انقر للتحديث"
    >
      <span>{statusIcons[status]}</span>
      <span>{stats.total}</span>
      {showDetails && (
        <span className="text-xs opacity-80">
          ({stats.pending} معلق، {stats.failed} فاشل)
        </span>
      )}
    </div>
  );
};

export default PendingOperationsIndicator;
