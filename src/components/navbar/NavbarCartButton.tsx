import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { getCount } from '@/lib/cart/cartStorage';

function parseEnableCart(settings: any | null): boolean {
  try {
    console.log('🔧 [parseEnableCart] بدء تحليل إعدادات السلة:', {
      hasSettings: !!settings,
      settingsKeys: settings ? Object.keys(settings) : [],
      customJs: settings?.custom_js,
      customJsType: typeof settings?.custom_js,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });

    const raw = settings?.custom_js;
    if (!raw) {
      console.log('❌ [parseEnableCart] لا يوجد custom_js في الإعدادات');
      return false;
    }

    const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const enableCart = Boolean(json?.enable_cart);

    console.log('✅ [parseEnableCart] نتيجة تحليل السلة:', {
      raw: raw,
      parsedJson: json,
      enableCart: enableCart,
      enableCartValue: json?.enable_cart,
      enableCartType: typeof json?.enable_cart
    });

    return enableCart;
  } catch (error) {
    console.error('❌ [parseEnableCart] خطأ في تحليل إعدادات السلة:', error);
    return false;
  }
}

export const NavbarCartButton: React.FC<{ className?: string }>= ({ className }) => {
  const { organizationSettings } = useSharedStoreDataContext();
  const enableCart = useMemo(() => parseEnableCart(organizationSettings), [organizationSettings]);
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
          organizationSettings: organizationSettings,
          customJs: organizationSettings?.custom_js,
          timestamp: new Date().toISOString(),
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          hasSettings: !!organizationSettings,
          settingsType: typeof organizationSettings,
          enableCartParsed: parseEnableCart(organizationSettings)
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
