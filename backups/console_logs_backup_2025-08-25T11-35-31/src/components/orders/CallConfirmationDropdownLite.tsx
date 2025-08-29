import React, { memo, useCallback, useMemo } from 'react';
import type { CallConfirmationStatus } from '@/components/orders/table/OrderTableTypes';
import './CallConfirmationDropdownLite.css';

type Props = {
  orderId: string;
  currentStatusId: number | null;
  statuses: CallConfirmationStatus[];
  onUpdateStatus: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  userId?: string;
};

const CallConfirmationDropdownLite: React.FC<Props> = ({
  orderId,
  currentStatusId,
  statuses,
  onUpdateStatus,
  disabled,
  className,
  userId,
}) => {
  // تحديد الحالة الحالية مع حفظ المرجع لمنع إعادة الحساب غير الضرورية
  const current = useMemo(() => {
    return statuses.find(s => s.id === currentStatusId) || null;
  }, [statuses, currentStatusId]);

  // جدولة التحديث في الإطار التالي لتفادي العمل داخل pointerdown/النقر
  const handleSelect = useCallback((statusId: number) => {
    requestAnimationFrame(() => {
      onUpdateStatus(orderId, statusId, undefined, userId);
    });
  }, [orderId, onUpdateStatus, userId]);

  // نمط الزر ثابت المرجع لتقليل حسابات الأنماط وإعادة التدفق
  const buttonStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!current) return undefined;
    return {
      backgroundColor: `${current.color}20`,
      borderColor: current.color,
      color: current.color,
      willChange: 'transform',
    } as React.CSSProperties;
  }, [current]);

  return (
    <div className={`call-confirmation-dropdown relative inline-block ${className || ''}`}>
      <select
        value={currentStatusId || ''}
        onChange={(e) => handleSelect(Number(e.target.value))}
        disabled={disabled || statuses.length === 0}
        className="h-8 px-3 py-1 pr-8 text-xs font-medium border rounded-md bg-transparent cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu"
        style={{
          ...buttonStyle,
          contain: 'paint',
          willChange: 'auto',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '12px'
        }}
      >
        {statuses.length === 0 ? (
          <option value="" disabled>لا توجد حالات متاحة</option>
        ) : (
          statuses.map((status) => (
            <option
              key={status.id}
              value={status.id}
              style={{
                color: status.color,
                backgroundColor: `${status.color}10`
              }}
            >
              {status.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default memo(CallConfirmationDropdownLite);
