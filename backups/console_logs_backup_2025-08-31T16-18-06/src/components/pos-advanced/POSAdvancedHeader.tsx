import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw } from 'lucide-react';

interface POSAdvancedHeaderProps {
  isReturnMode: boolean;
  returnItemsCount: number;
  toggleReturnMode: () => void;
  onCalculatorOpen: () => void;
  onSettingsOpen: () => void;
  onRepairOpen: () => void;
  onQuickExpenseOpen: () => void;
  isRepairEnabled: boolean;
}

export const POSAdvancedHeader: React.FC<POSAdvancedHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  toggleReturnMode,
  onCalculatorOpen,
  onSettingsOpen,
  onRepairOpen,
  onQuickExpenseOpen,
  isRepairEnabled
}) => {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border/50 shadow-sm rounded-xl flex-shrink-0 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {isReturnMode ? `🔙 وضع الإرجاع (${returnItemsCount} عنصر)` : '🛒 نقطة البيع'}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isReturnMode ? "destructive" : "outline"}
            size="sm"
            onClick={toggleReturnMode}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {isReturnMode ? 'إنهاء وضع الإرجاع' : 'وضع الإرجاع'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onCalculatorOpen}
          >
            🧮 آلة حاسبة
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsOpen}
          >
            ⚙️ إعدادات
          </Button>
          
          {isRepairEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRepairOpen}
            >
              🔧 خدمة تصليح
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickExpenseOpen}
          >
            💰 مصروف سريع
          </Button>
        </div>
      </div>
    </div>
  );
};
