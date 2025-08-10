import React, { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { CallConfirmationStatus } from '@/components/orders/table/OrderTableTypes';

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

  // عناصر القائمة مُهيأة مسبقاً لتقليل العمل عند الفتح
  const items = useMemo(() => {
    if (!Array.isArray(statuses) || statuses.length === 0) return null;
    return statuses.map((status) => (
      <DropdownMenuItem
        key={status.id}
        onClick={() => handleSelect(status.id)}
        disabled={currentStatusId === status.id}
        className="cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs font-medium transform-gpu"
        style={{ 
          color: status.color,
          contain: 'layout'
        }}
      >
        <span>{status.name}</span>
      </DropdownMenuItem>
    ));
  }, [statuses, handleSelect, currentStatusId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || statuses.length === 0}
          className={`h-8 px-2 py-0.5 border hover:opacity-90 transition-all rounded-md transform-gpu ${className || ''}`}
          style={{
            ...buttonStyle,
            contain: 'layout',
            willChange: 'auto'
          }}
        >
          <span className="text-xs font-medium">{current ? current.name : 'تأكيد الإتصال'}</span>
          <ChevronDown className="h-3.5 w-3.5 mr-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        avoidCollisions={true}
        className="min-w-[180px] p-1 rounded-lg border shadow-lg transform-gpu"
        style={{ 
          contain: 'layout paint', 
          willChange: 'transform',
          zIndex: 9999,
          transform: 'translateZ(0)' 
        }}
      >
        {items ? items : (
          <DropdownMenuItem 
            disabled 
            className="cursor-default my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs text-muted-foreground transform-gpu"
            style={{ contain: 'layout' }}
          >
            لا توجد حالات متاحة
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(CallConfirmationDropdownLite);
