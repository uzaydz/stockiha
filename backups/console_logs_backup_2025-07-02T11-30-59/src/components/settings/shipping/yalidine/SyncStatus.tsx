import React from 'react';
import { Progress } from "@/components/ui/progress";
import { SyncStatusItem } from './SyncStatusItem';
import { SyncStatus as SyncStatusType } from './YalidineTypes';

interface SyncStatusProps {
  syncProgress: SyncStatusType;
  isSyncing: boolean;
}

/**
 * مكون لعرض حالة المزامنة الكاملة
 */
export const SyncStatus: React.FC<SyncStatusProps> = ({ 
  syncProgress, 
  isSyncing 
}) => {
  // حساب نسبة التقدم الإجمالية
  const calculateOverallProgress = () => {
    const items = [
      syncProgress.provinces,
      syncProgress.municipalities,
      syncProgress.centers,
      syncProgress.fees
    ];
    
    const totalItems = items.reduce((sum, item) => sum + item.total, 0);
    const addedItems = items.reduce((sum, item) => sum + item.added, 0);
    
    return totalItems > 0 ? Math.round((addedItems / totalItems) * 100) : 0;
  };
  
  const overallProgress = calculateOverallProgress();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between text-sm">
          <span>التقدم الكلي:</span>
          <span>{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <SyncStatusItem 
          label="الولايات" 
          status={syncProgress.provinces.status} 
          count={syncProgress.provinces.added} 
          total={syncProgress.provinces.total} 
        />
        <SyncStatusItem 
          label="البلديات" 
          status={syncProgress.municipalities.status} 
          count={syncProgress.municipalities.added} 
          total={syncProgress.municipalities.total} 
        />
        <SyncStatusItem 
          label="المراكز" 
          status={syncProgress.centers.status} 
          count={syncProgress.centers.added} 
          total={syncProgress.centers.total} 
        />
        <SyncStatusItem 
          label="الأسعار" 
          status={syncProgress.fees.status} 
          count={syncProgress.fees.added} 
          total={syncProgress.fees.total} 
        />
      </div>
    </div>
  );
};
