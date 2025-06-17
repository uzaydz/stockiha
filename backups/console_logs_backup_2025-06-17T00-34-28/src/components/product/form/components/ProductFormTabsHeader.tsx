import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target } from 'lucide-react';

interface ValidationSummary {
  totalRequired: number;
  completed: number;
  errors: number;
  warnings: number;
  errorTabs: string[];
  warningTabs: string[];
}

interface ProductFormTabsHeaderProps {
  progress: number;
  validationSummary: ValidationSummary;
  isTransitioning: boolean;
  onGoToFirstIncomplete?: () => void;
}

const ProductFormTabsHeader = memo<ProductFormTabsHeaderProps>(({
  progress,
  validationSummary,
  isTransitioning,
  onGoToFirstIncomplete
}) => {
  const getProgressStatus = () => {
    if (progress === 100) return 'complete';
    if (progress >= 70) return 'good';
    if (progress >= 30) return 'partial';
    return 'low';
  };

  const progressStatus = getProgressStatus();

  const getProgressColor = () => {
    switch (progressStatus) {
      case 'complete': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'partial': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-red-600 dark:text-red-400';
    }
  };

  const getProgressMessage = () => {
    switch (progressStatus) {
      case 'complete': return 'جميع المعلومات المطلوبة مكتملة';
      case 'good': return 'معظم المعلومات مكتملة';
      case 'partial': return 'بعض المعلومات مفقودة';
      default: return 'يجب إكمال المعلومات الأساسية';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-background/95 via-background to-background/95 dark:from-background/90 dark:via-background dark:to-background/90 shadow-lg dark:shadow-2xl dark:shadow-black/20 backdrop-blur-sm border-border/50 transition-all duration-300">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 flex items-center justify-center shadow-md ring-2 ring-primary/10 dark:ring-primary/20">
              <Package className="w-6 h-6 text-primary dark:text-primary-foreground" />
            </div>
            {isTransitioning && (
              <div className="absolute inset-0 rounded-xl bg-primary/20 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-xl text-foreground">تفاصيل المنتج</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {getProgressMessage()}
            </p>
          </div>
        </div>
        
        {/* Progress Section */}
        <div className="flex items-center gap-6">
          {/* Progress Circle */}
          <div className="text-center">
            <div className={`text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent transition-all duration-300 ${getProgressColor()}`}>
              {progress}%
            </div>
            <Badge 
              variant={progress === 100 ? "default" : progress >= 70 ? "secondary" : "outline"} 
              className="text-xs shadow-sm transition-all duration-300"
            >
              {progress === 100 ? "مكتمل" : progress >= 70 ? "متقدم" : "في التقدم"}
            </Badge>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50/80 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/30 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-300">{validationSummary.completed}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>الأقسام المكتملة</p>
              </TooltipContent>
            </Tooltip>
            
            {validationSummary.warnings > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 transition-colors">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">{validationSummary.warnings}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أقسام تحتاج إكمال: {validationSummary.warningTabs.join(', ')}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {validationSummary.errors > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 transition-colors">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-700 dark:text-red-300">{validationSummary.errors}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أقسام مطلوبة فارغة: {validationSummary.errorTabs.join(', ')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            التقدم الإجمالي
          </span>
          <span className="font-medium">{validationSummary.completed}/{validationSummary.totalRequired} مطلوب</span>
        </div>
        
        <div className="relative">
          <Progress 
            value={progress} 
            className="h-3 bg-muted/50 dark:bg-muted/30 overflow-hidden rounded-full transition-all duration-300" 
          />
          {/* Progress segments visualization */}
          <div className="absolute inset-0 flex rounded-full overflow-hidden">
            {Array.from({ length: validationSummary.totalRequired }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-full transition-all duration-300 ${
                  i < validationSummary.completed
                    ? 'bg-primary'
                    : i < validationSummary.completed + validationSummary.warnings
                    ? 'bg-amber-400'
                    : 'bg-transparent'
                }`}
                style={{
                  marginRight: i < validationSummary.totalRequired - 1 ? '1px' : '0'
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Quick Action */}
        {validationSummary.errors > 0 && onGoToFirstIncomplete && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToFirstIncomplete}
              className="flex items-center gap-2 text-xs bg-background/80 hover:bg-primary/5 border-primary/30 text-primary hover:text-primary transition-all duration-300"
            >
              <Target className="w-3 h-3" />
              الذهاب للقسم الأول المطلوب
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
});

ProductFormTabsHeader.displayName = 'ProductFormTabsHeader';

export default ProductFormTabsHeader;
