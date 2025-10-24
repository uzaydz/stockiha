import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { getCount } from '@/lib/cart/cartStorage';

function parseEnableCart(settings: any | null): boolean {
  try {
    if (process.env.NODE_ENV === 'development') {
      // طباعة مختصرة مرة واحدة لكل صفحة
      (window as any).__cartDebugPrinted = (window as any).__cartDebugPrinted || false;
      if (!(window as any).__cartDebugPrinted) {
        console.log('🔧 [parseEnableCart] بدء تحليل إعدادات السلة:', {
          hasSettings: !!settings,
          settingsKeys: settings ? Object.keys(settings) : [],
          customJsType: typeof settings?.custom_js,
          customJsValue: settings?.custom_js,
          settingsId: settings?.id,
          settingsFull: settings
        });
        (window as any).__cartDebugPrinted = true;
      }
    }

    const raw = settings?.custom_js;
    if (!raw) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [parseEnableCart] لا يوجد custom_js في الإعدادات', {
          settings: settings,
          settingsKeys: settings ? Object.keys(settings) : [],
          settingsFull: settings
        });
      }
      return false;
    }

    const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const enableCart = Boolean(json?.enable_cart);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [parseEnableCart] نتيجة تحليل السلة:', {
        enableCart: enableCart,
        enableCartValue: json?.enable_cart,
        enableCartType: typeof json?.enable_cart,
        rawLength: raw.length,
        jsonKeys: Object.keys(json),
        fullJson: json,
        settingsId: settings?.id,
        settingsKeys: settings ? Object.keys(settings) : [],
        settingsFull: settings
      });
    }

    return enableCart;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [parseEnableCart] خطأ في تحليل إعدادات السلة:', error, {
        settings: settings
      });
    }
    return false;
  }
}

export const NavbarCartButton: React.FC<{ className?: string }>= ({ className }) => {
  const contextData = useSharedStoreDataContext();
  const { organizationSettings } = contextData;

  // 🔥 إصلاح: إضافة logs لتتبع البيانات المستلمة من useSharedStoreDataContext
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 [NavbarCartButton] البيانات المستلمة من useSharedStoreDataContext:', {
      hasOrganization: !!contextData.organization,
      hasOrganizationSettings: !!organizationSettings,
      hasCustomJs: !!organizationSettings?.custom_js,
      organizationSettingsId: organizationSettings?.id,
      organizationId: contextData.organization?.id,
      isLoading: contextData.isLoading,
      componentsLength: contextData.components?.length || 0,
      contextType: 'optimized',
      fullContextData: contextData,
      organizationSettingsKeys: organizationSettings ? Object.keys(organizationSettings) : [],
      organizationSettingsFull: organizationSettings,
      contextDataKeys: contextData ? Object.keys(contextData) : [],
    });
  }
  const enableCart = useMemo(() => {
    const result = parseEnableCart(organizationSettings);
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 [NavbarCartButton] نتيجة تحليل السلة:', {
        enableCart: result,
        hasSettings: !!organizationSettings,
        hasCustomJs: !!organizationSettings?.custom_js,
        customJsLength: organizationSettings?.custom_js?.length || 0,
        customJsValue: organizationSettings?.custom_js,
        organizationSettingsId: organizationSettings?.id,
        organizationSettingsKeys: organizationSettings ? Object.keys(organizationSettings) : [],
      });
    }
    return result;
  }, [organizationSettings?.custom_js]);
  const [count, setCount] = useState<number>(() => getCount());

  useEffect(() => {
    const handler = (e: any) => setCount(getCount());
    window.addEventListener('cart:updated', handler as EventListener);
    return () => window.removeEventListener('cart:updated', handler as EventListener);
  }, []);

  // Debug logging effect مع إزالة الضوضاء: لا نعيد الطباعة إلا عند تغيّر القيم فعلياً
  useEffect(() => {
    try {
      // نتتبّع آخر قيمة مطبوعة لتجنّب التكرار المستمر بسبب تغيّر مراجع الكائنات
      (window as any).__lastCartDebug__ = (window as any).__lastCartDebug__ || { enableCart: undefined, count: undefined };
      const last = (window as any).__lastCartDebug__;
      if (last.enableCart !== enableCart || last.count !== count) {

        console.log('🔍 [NavbarCartButton] حالة السلة:', {
          enableCart: enableCart,
          count: count,
          hasSettings: !!organizationSettings
        });

        last.enableCart = enableCart;
        last.count = count;
      }
    } catch {}
  }, [enableCart, count, organizationSettings]);

  if (!enableCart) return null;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn(
        // حاوية أنيقة ومتماسكة مع بقية النافبار
        'relative rounded-lg transition-all duration-200 group',
        'bg-background/70 hover:bg-background/90',
        'border border-border/40 hover:border-primary/40 shadow-sm hover:shadow-md',
        'h-9 w-9 md:h-10 md:w-10',
        className
      )}
      aria-label="العربة"
      aria-haspopup="true"
    >
      <Link to="/cart" className="flex items-center justify-center">
        <ShoppingCart className="h-5 w-5 text-foreground/80 group-hover:text-primary transition-colors duration-300" />
        {count > 0 && (
          <span
            aria-label={`عدد عناصر العربة ${count}`}
            className={cn(
              'absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-5 px-1',
              'text-[10px] font-bold flex items-center justify-center',
              'rounded-full bg-primary text-primary-foreground',
              'ring-1 ring-white/70 dark:ring-black/40 shadow-sm'
            )}
          >
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
};

export default NavbarCartButton;
