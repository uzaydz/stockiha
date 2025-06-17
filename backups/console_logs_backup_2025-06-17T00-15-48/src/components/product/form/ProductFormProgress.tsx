import React, { memo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Package,
  Image,
  Palette,
  Settings,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FormStep = 'basic' | 'images' | 'variants' | 'advanced' | 'review';

interface FormProgress {
  completed: FormStep[];
  current: FormStep;
  isValid: boolean;
  completionPercentage: number;
}

interface ValidationSummary {
  totalFields: number;
  validFields: number;
  errorFields: string[];
  warningFields: string[];
}

interface ProductFormProgressProps {
  formProgress: FormProgress;
  validationSummary: ValidationSummary;
  currentStep: FormStep;
  onStepChange: (step: FormStep) => void;
  isEditMode: boolean;
  isSavingDraft: boolean;
  isDirty: boolean;
}

const stepConfig = {
  basic: {
    label: 'معلومات أساسية',
    icon: Package,
    description: 'الاسم، الوصف، والسعر'
  },
  images: {
    label: 'الصور',
    icon: Image,
    description: 'الصورة الرئيسية والإضافية'
  },
  variants: {
    label: 'المتغيرات',
    icon: Palette,
    description: 'الألوان والأحجام'
  },
  advanced: {
    label: 'إعدادات متقدمة',
    icon: Settings,
    description: 'شحن، تصنيفات، SEO'
  },
  review: {
    label: 'مراجعة نهائية',
    icon: Eye,
    description: 'التحقق من البيانات'
  }
};

const ProductFormProgress = memo<ProductFormProgressProps>(({ 
  formProgress, 
  validationSummary, 
  currentStep, 
  onStepChange, 
  isEditMode,
  isSavingDraft,
  isDirty
}) => {
  const steps: FormStep[] = ['basic', 'images', 'variants', 'advanced', 'review'];
  
  const getStepStatus = (step: FormStep) => {
    if (formProgress.completed.includes(step)) {
      return 'completed';
    }
    if (step === currentStep) {
      return 'current';
    }
    return 'pending';
  };

  const getStepIcon = (step: FormStep, status: string) => {
    const IconComponent = stepConfig[step].icon;
    
    if (status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (status === 'current') {
      return <IconComponent className="h-5 w-5 text-primary" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getValidationColor = () => {
    if (validationSummary.errorFields.length > 0) {
      return 'text-destructive';
    }
    if (validationSummary.warningFields.length > 0) {
      return 'text-amber-600';
    }
    return 'text-green-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          تقدم النموذج
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">التقدم الإجمالي</span>
            <span className={cn("font-medium", getValidationColor())}>
              {formProgress.completionPercentage}%
            </span>
          </div>
          <Progress 
            value={formProgress.completionPercentage} 
            className="h-2"
          />
        </div>

        <Separator />

        {/* Steps */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">الخطوات</h4>
          <div className="space-y-1">
            {steps.map((step, index) => {
              const status = getStepStatus(step);
              const config = stepConfig[step];
              const isClickable = status === 'completed' || status === 'current';
              
              return (
                <Tooltip key={step}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => isClickable && onStepChange(step)}
                      disabled={!isClickable}
                      className={cn(
                        "w-full justify-start h-auto p-2 space-y-1",
                        status === 'current' && "bg-primary/10 border border-primary/20",
                        status === 'completed' && "bg-green-50 border border-green-200",
                        isClickable && "hover:bg-muted/80"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {getStepIcon(step, status)}
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-medium",
                              status === 'current' && "text-primary",
                              status === 'completed' && "text-green-700",
                              status === 'pending' && "text-muted-foreground"
                            )}>
                              {config.label}
                            </span>
                            {status === 'completed' && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                مكتمل
                              </Badge>
                            )}
                            {status === 'current' && (
                              <Badge variant="default" className="text-xs">
                                جاري
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                        {isClickable && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {status === 'completed' && 'مكتمل - انقر للمراجعة'}
                      {status === 'current' && 'الخطوة الحالية'}
                      {status === 'pending' && 'يتطلب إكمال الخطوات السابقة'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Validation Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">حالة التحقق</h4>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">صحيح:</span>
              <span className="font-medium text-green-600">
                {validationSummary.validFields}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">أخطاء:</span>
              <span className="font-medium text-destructive">
                {validationSummary.errorFields.length}
              </span>
            </div>
          </div>

          {validationSummary.warningFields.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">تحذيرات:</span>
              <span className="font-medium text-amber-600">
                {validationSummary.warningFields.length}
              </span>
            </div>
          )}

          {/* Field completion progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الحقول المكتملة</span>
              <span className="font-medium">
                {validationSummary.validFields}/{validationSummary.totalFields}
              </span>
            </div>
            <Progress 
              value={(validationSummary.validFields / validationSummary.totalFields) * 100} 
              className="h-1"
            />
          </div>
        </div>

        {/* Auto-save status */}
        {!isEditMode && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">حالة الحفظ</h4>
              <div className="flex items-center gap-2 text-sm">
                {isSavingDraft ? (
                  <>
                    <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-amber-600 font-medium">جاري الحفظ...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-amber-600">غير محفوظ</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">محفوظ</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Success state */}
        {formProgress.isValid && validationSummary.errorFields.length === 0 && (
          <>
            <Separator />
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  النموذج جاهز للإرسال
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                جميع المعلومات المطلوبة مكتملة وصحيحة
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

ProductFormProgress.displayName = 'ProductFormProgress';

export default ProductFormProgress;
