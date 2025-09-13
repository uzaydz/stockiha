import React, { useState, useRef, useCallback } from 'react';
import { Store, ShoppingBag, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MerchantType } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { OrganizationSettingsUpdate } from '@/types/organization-settings';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getBoundingClientRectOptimized } from '@/utils/domOptimizer';

interface MerchantTypeToggleProps {
  currentType: MerchantType;
  onTypeChange: (type: MerchantType) => void;
  className?: string;
}

const merchantTypes = [
  {
    type: 'traditional' as MerchantType,
    label: 'تقليدي',
    icon: Store
  },
  {
    type: 'ecommerce' as MerchantType,
    label: 'إلكتروني',
    icon: ShoppingBag
  },
  {
    type: 'both' as MerchantType,
    label: 'كلاهما',
    icon: Layers
  }
];

const MerchantTypeToggle: React.FC<MerchantTypeToggleProps> = ({
  currentType,
  onTypeChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonRect, setButtonRect] = useState<{ width: number; height: number; top: number; left: number; bottom: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  const { currentOrganization } = useTenant();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const currentTypeData = merchantTypes.find(t => t.type === currentType) || merchantTypes[2];
  const CurrentIcon = currentTypeData.icon;

  const handleTypeChange = async (newType: MerchantType) => {
    if (newType === currentType || isLoading || !currentOrganization) return;

    setIsLoading(true);
    try {
      const updateData = {
        organization_id: currentOrganization.id,
        merchant_type: newType
      };

      const { error } = await supabase
        .from('organization_settings')
        .upsert(updateData, { onConflict: 'organization_id' });

      if (error) throw error;

      onTypeChange(newType);
      setIsOpen(false);

      // تحديث الكاش في localStorage لضمان الاستمرارية
      const cacheKey = `merchant_type_${currentOrganization.id}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        merchantType: newType,
        timestamp: Date.now()
      }));

      toast({
        title: 'تم التحديث',
        description: `تم تغيير النوع إلى: ${merchantTypes.find(t => t.type === newType)?.label}`,
      });

      // إزالة إعادة تحميل الصفحة - سيتم التحديث تلقائياً
      // setTimeout(() => {
      //   window.location.reload();
      // }, 1000);

    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'لم يتم حفظ التغييرات',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    try {
      const rect = await getBoundingClientRectOptimized(buttonRef.current);
      setButtonRect(rect);
      setIsOpen(!isOpen);
    } catch (error) {
      console.warn('خطأ في الحصول على موضع الزر:', error);
      // استخدام قيم افتراضية في حالة الخطأ
      setButtonRect({
        width: 200,
        height: 40,
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY + 40,
        right: e.clientX + 200
      });
      setIsOpen(!isOpen);
    }
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} style={{ position: 'relative' }}>
      {/* الزر الرئيسي - متناسق مع تصميم القائمة الجانبية */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn(
          "w-full flex items-center justify-between rounded-md",
          // تحسين الحجم للهاتف المحمول
          isMobile 
            ? "px-2 py-2 text-xs" 
            : "px-3 py-2.5 text-sm",
          "font-medium transition-colors duration-200",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          "border border-border/50",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <CurrentIcon className={cn(
            "text-current",
            isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
          )} />
          <span className={cn(
            // تحسين حجم الخط للهاتف المحمول
            isMobile && "text-xs"
          )}>
            نوع التاجر: {currentTypeData.label}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            "transition-transform duration-200", 
            isMobile ? "w-3.5 h-3.5" : "w-4 h-4",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* القائمة المنسدلة باستخدام Portal */}
      {isOpen && buttonRect && typeof window !== 'undefined' && createPortal(
        <>
          {/* طبقة التعتيم */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* القائمة المنسدلة */}
          <div 
            className={cn(
              "fixed bg-card border border-border rounded-lg shadow-2xl z-[99999] overflow-hidden backdrop-blur-sm",
              // تحسين الحجم للهاتف المحمول
              isMobile && "min-w-[180px]"
            )}
            style={{
              top: buttonRect.bottom + 8,
              left: buttonRect.left,
              width: buttonRect.width,
              minWidth: isMobile ? '180px' : '200px'
            }}
          >
            {merchantTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = type.type === currentType;

              return (
                <button
                  key={type.type}
                  onClick={() => handleTypeChange(type.type)}
                  disabled={isLoading || isSelected}
                  className={cn(
                    "w-full flex items-center gap-2 text-sm",
                    // تحسين الحجم للهاتف المحمول
                    isMobile ? "px-2.5 py-2" : "px-3 py-2.5",
                    "transition-all duration-200",
                    "hover:bg-muted/80 focus:outline-none focus:bg-muted/60",
                    "border-b border-border/30 last:border-b-0",
                    isSelected && "bg-primary/10 text-primary cursor-default",
                    !isSelected && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "transition-colors duration-200",
                    isMobile ? "w-3.5 h-3.5" : "w-4 h-4",
                    isSelected && "text-primary"
                  )} />
                  <span className={cn(
                    "flex-1 text-right",
                    // تحسين حجم الخط للهاتف المحمول
                    isMobile && "text-xs"
                  )}>
                    {type.label}
                  </span>
                  {isSelected && (
                    <div className={cn(
                      "bg-primary rounded-full",
                      // تحسين الحجم للهاتف المحمول
                      isMobile ? "w-1.5 h-1.5" : "w-2 h-2"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default MerchantTypeToggle;
