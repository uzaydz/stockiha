import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { YalidineTableStatus } from './YalidineTypes';

interface DataFixToolsProps {
  tableStatus: YalidineTableStatus | null;
  isFixingData: boolean;
  onFixData: () => void;
  isCheckingTableStatus: boolean;
  onCheckTablesStatus: () => void;
}

/**
 * مكون لعرض وإصلاح مشاكل البيانات
 */
export const DataFixTools: React.FC<DataFixToolsProps> = ({
  tableStatus,
  isFixingData,
  onFixData,
  isCheckingTableStatus,
  onCheckTablesStatus
}) => {
  // التحقق من وجود مشاكل في البيانات
  const hasIssues = tableStatus && (
    tableStatus.yalidine_fees === 0 ||
    tableStatus.trigger_status !== 'enabled' ||
    tableStatus.fk_constraint !== 'valid'
  );

  if (!tableStatus) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
          مشاكل في البيانات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>عدد سجلات الأسعار:</span>
            <span className={tableStatus.yalidine_fees === 0 ? "text-destructive" : "text-green-600"}>
              {tableStatus.yalidine_fees}
            </span>
          </div>
          <div className="flex justify-between">
            <span>حالة المحفز (Trigger):</span>
            <span className={tableStatus.trigger_status !== 'enabled' ? "text-destructive" : "text-green-600"}>
              {tableStatus.trigger_status}
            </span>
          </div>
          <div className="flex justify-between">
            <span>قيود المفتاح الأجنبي:</span>
            <span className={tableStatus.fk_constraint !== 'valid' ? "text-destructive" : "text-green-600"}>
              {tableStatus.fk_constraint}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-4 rtl:space-x-reverse">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCheckTablesStatus}
            disabled={isCheckingTableStatus || isFixingData}
          >
            {isCheckingTableStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري الفحص...
              </>
            ) : (
              <>إعادة الفحص</>
            )}
          </Button>
          
          {hasIssues && (
            <Button 
              variant="default" 
              size="sm"
              onClick={onFixData}
              disabled={isFixingData || isCheckingTableStatus}
            >
              {isFixingData ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإصلاح...
                </>
              ) : (
                <>إصلاح تعيين الحقول وإعادة المزامنة</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
