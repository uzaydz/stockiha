import React from 'react';
import { SyncStatusType } from './YalidineTypes';

interface SyncStatusItemProps {
  label: string;
  status: SyncStatusType;
  count: number;
  total: number;
}

/**
 * مكون لعرض حالة مزامنة عنصر واحد (الولايات، البلديات، المراكز، الأسعار)
 */
export const SyncStatusItem: React.FC<SyncStatusItemProps> = ({ 
  label, 
  status, 
  count, 
  total 
}) => {
  // تحديد نص الحالة واللون
  let statusText = "في الانتظار";
  let statusClass = "";
  
  if (status === "syncing") {
    statusText = "جاري...";
    statusClass = "text-primary";
  } else if (status === "success") {
    statusText = "تم";
    statusClass = "text-green-600";
  } else if (status === "failed") {
    statusText = "فشل";
    statusClass = "text-destructive";
  } else if (status === "canceled") {
    statusText = "ملغى";
    statusClass = "text-amber-500";
  }
  
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center">
        <span>{label}:</span>
        <span className={statusClass}>{statusText}</span>
      </div>
      {total > 0 && (
        <div className="text-xs text-muted-foreground text-left">
          {count} / {total}
        </div>
      )}
    </div>
  );
};
