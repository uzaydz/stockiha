import React, { useState } from 'react';
import { Store, ShoppingBag, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MerchantType } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { OrganizationSettingsUpdate } from '@/types/organization-settings';
import { createPortal } from 'react-dom';

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
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const { toast } = useToast();
  const { currentOrganization } = useTenant();

  const currentTypeData = merchantTypes.find(t => t.type === currentType) || merchantTypes[2];
  const CurrentIcon = currentTypeData.icon;

  const handleTypeChange = async (newType: MerchantType) => {
    if (newType === currentType || isLoading || !currentOrganization) return;

    setIsLoading(true);
    try {
      const updateData: OrganizationSettingsUpdate = {
        merchant_type: newType
      };
      
      const { error } = await supabase
        .from('organization_settings')
        .update(updateData)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      onTypeChange(newType);
      setIsOpen(false);

      toast({
        title: 'تم التحديث',
        description: `تم تغيير النوع إلى: ${merchantTypes.find(t => t.type === newType)?.label}`,
      });

      // إزالة إعادة تحميل الصفحة - سيتم التحديث تلقائياً
      // setTimeout(() => {
      //   window.location.reload();
      // }, 1000);

    } catch (error) {
      console.error('خطأ في التحديث:', error);
      toast({
        title: 'خطأ',
        description: 'لم يتم حفظ التغييرات',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonRect(rect);
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("relative", className)} style={{ position: 'relative' }}>
      {/* الزر الرئيسي - متناسق مع تصميم القائمة الجانبية */}
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-md",
          "text-sm font-medium transition-colors duration-200",
          "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          "border border-border/50",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4" />
          <span>نوع التاجر: {currentTypeData.label}</span>
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 transition-transform duration-200", 
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
            className="fixed bg-card border border-border rounded-lg shadow-2xl z-[99999] overflow-hidden backdrop-blur-sm"
            style={{
              top: buttonRect.bottom + 8,
              left: buttonRect.left,
              width: buttonRect.width,
              minWidth: '200px'
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
                    "w-full flex items-center gap-2 px-3 py-2.5 text-sm",
                    "transition-all duration-200",
                    "hover:bg-muted/80 focus:outline-none focus:bg-muted/60",
                    "border-b border-border/30 last:border-b-0",
                    isSelected && "bg-primary/10 text-primary cursor-default",
                    !isSelected && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 transition-colors duration-200",
                    isSelected && "text-primary"
                  )} />
                  <span className="flex-1 text-right">{type.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
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
