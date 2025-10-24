import React, { memo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Save, ArrowLeft, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProductFormMobileActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  isDirty: boolean;
  disabled: boolean;
  permissionWarning?: string;
  onSubmit: () => void;
  onCancel: () => void;
  onPublishNow?: () => void;
  onSaveDraft?: () => void;
  onSchedule?: () => void;
}

const ProductFormMobileActions: React.FC<ProductFormMobileActionsProps> = memo(({
  isSubmitting,
  isEditMode,
  isDirty,
  disabled,
  permissionWarning,
  onSubmit,
  onCancel,
  onPublishNow,
  onSaveDraft,
  onSchedule,
}) => {
  // حالة لتتبع ما إذا كانت القائمة مفتوحة
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // إخفاء الأزرار عندما يكون هناك Dialog مفتوح
  const [isAnyDialogOpen, setIsAnyDialogOpen] = useState(false);
  // إزاحة أسفل إضافية إذا كان هناك شريط تنقل سفلي مثبت
  const [bottomBarOffset, setBottomBarOffset] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ open: boolean }>;
      setIsAnyDialogOpen(!!custom.detail?.open);
    };
    window.addEventListener('app:dialog-open', handler as EventListener);
    return () => window.removeEventListener('app:dialog-open', handler as EventListener);
  }, []);

  // رصد شريط تنقل سفلي محتمل واحتساب ارتفاعه لرفع الأزرار فوقه
  useEffect(() => {
    const selectors = [
      '[data-bottom-nav]',
      '.mobile-bottom-nav',
      'nav[aria-label="bottom"]',
      'nav[role="tablist"][data-orientation="horizontal"]'
    ];
    let observedEl: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const computeOffset = () => {
      const el = selectors
        .map(sel => document.querySelector(sel) as HTMLElement | null)
        .find(Boolean) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        // اعتبر العنصر مثبتاً أسفل الشاشة فقط إذا كان قريباً من الحافة السفلية
        const isBottomFixed = Math.abs((window.innerHeight - rect.bottom)) < 8 || getComputedStyle(el).position === 'fixed';
        setBottomBarOffset(isBottomFixed ? Math.ceil(rect.height) : 0);
        observedEl = el;
      } else {
        setBottomBarOffset(0);
      }
    };

    computeOffset();

    const onResize = () => computeOffset();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    if (observedEl && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => computeOffset());
      resizeObserver.observe(observedEl);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (resizeObserver && observedEl) {
        resizeObserver.unobserve(observedEl);
      }
    };
  }, []);

  // معالجات محسنة للأحداث
  const handlePublishNow = useCallback(() => {
    setIsDropdownOpen(false);
    onPublishNow?.();
  }, [onPublishNow]);

  const handleSaveDraft = useCallback(() => {
    setIsDropdownOpen(false);
    onSaveDraft?.();
  }, [onSaveDraft]);

  const handleSchedule = useCallback(() => {
    setIsDropdownOpen(false);
    onSchedule?.();
  }, [onSchedule]);
  // Check if we're in browser environment
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  if (isAnyDialogOpen) return null;

  return createPortal(
    <div className="lg:hidden fixed left-1/2 transform -translate-x-1/2 z-[9999]"
         style={{ 
           position: 'fixed',
           bottom: `calc(${24 + bottomBarOffset}px + env(safe-area-inset-bottom))`,
           left: '50%',
           transform: 'translateX(-50%)',
           zIndex: 9999
         }}>
      <div className="flex items-center gap-4">
        {/* Cancel Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-12 w-12 rounded-full shadow-xl bg-background/95 backdrop-blur-sm border-2 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* Main Action Button with Dropdown */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          
          <DropdownMenu 
            open={isDropdownOpen} 
            onOpenChange={setIsDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={disabled || isSubmitting}
                className={cn(
                  "relative h-16 px-6 rounded-full shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105 active:scale-95 font-semibold text-base",
                  "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80",
                  "border-2 border-primary-foreground/20 flex items-center gap-2",
                  permissionWarning && "from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span className="text-sm">
                      {isEditMode ? 'حفظ' : 'إنشاء'}
                    </span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              align="center"
              side="top"
              sideOffset={12}
              avoidCollisions
              collisionPadding={16}
              className="w-48 mb-2"
            >
              <DropdownMenuItem 
                onClick={handlePublishNow} 
                disabled={disabled || isSubmitting}
                className="text-center justify-center py-3 text-base font-medium"
              >
                🚀 نشر الآن
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSaveDraft} 
                disabled={disabled || isSubmitting}
                className="text-center justify-center py-3 text-base font-medium"
              >
                📝 حفظ كمسودة
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSchedule} 
                disabled={disabled || isSubmitting}
                className="text-center justify-center py-3 text-base font-medium"
              >
                ⏰ جدولة النشر
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Progress indicator for mobile */}
          {isDirty && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

ProductFormMobileActions.displayName = 'ProductFormMobileActions';

export default ProductFormMobileActions;
