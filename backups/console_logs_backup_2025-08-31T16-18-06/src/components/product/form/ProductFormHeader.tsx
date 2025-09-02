import React from 'react';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface ProductFormHeaderProps {
  isEditMode?: boolean;
  productName?: string;
  progress?: number;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  errorCount?: number;
  autoSaveDrafts?: boolean;
  isSavingDraft?: boolean;
  // معاملات جديدة للنص الديناميكي
  formTitle?: string;
  formDescription?: string;
  // معاملات للتنقل
  backUrl?: string;
  showBackButton?: boolean;
  showProgress?: boolean;
}

const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
  isEditMode = false,
  productName,
  progress = 0,
  isSubmitting = false,
  isDirty = false,
  isValid = true,
  errorCount = 0,
  autoSaveDrafts = false,
  isSavingDraft = false,
  formTitle,
  formDescription,
  backUrl = '/dashboard/products',
  showBackButton = true,
  showProgress = true,
}) => {
  const navigate = useNavigate();

  // تحديد النص بناءً على المعاملات الممررة
  const title = formTitle || (isEditMode 
    ? `تعديل: ${productName || 'منتج'}` 
    : 'إضافة منتج جديد'
  );
  
  const description = formDescription || (isEditMode 
    ? 'قم بتعديل تفاصيل المنتج' 
    : 'أضف منتج جديد إلى متجرك'
  );

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(backUrl)}
                disabled={isSubmitting}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Auto-save indicator */}
            {autoSaveDrafts && !isEditMode && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="hidden sm:inline">جاري الحفظ...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="hidden sm:inline">غير محفوظ</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="hidden sm:inline">محفوظ</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {showProgress && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {progress}% مكتمل
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFormHeader;
