import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { getCart, updateQuantity, removeItem, getSubtotal } from '@/lib/cart/cartStorage';
import StoreNavbar from '@/components/navbar/StoreNavbar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState(() => getCart());
  const subtotal = useMemo(() => getSubtotal(), [items]);

  useEffect(() => {
    const handler = () => setItems(getCart());
    window.addEventListener('cart:updated', handler as EventListener);
    return () => window.removeEventListener('cart:updated', handler as EventListener);
  }, []);

  const change = (productId: string, q: number, colorId?: string | null, sizeId?: string | null) => {
    updateQuantity(productId, q, { colorId, sizeId });
    setItems(getCart());
  };

  const remove = (productId: string, colorId?: string | null, sizeId?: string | null) => {
    removeItem(productId, { colorId, sizeId });
    setItems(getCart());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <StoreNavbar />
      <div className="pt-[var(--navbar-height,64px)]" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">{t('cart.shoppingCart')}</h1>
          {items.length > 0 && (
            <Button onClick={() => navigate('/cart/checkout')} className="gap-2">
              {t('cart.continueShopping')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/70 p-8 text-center">
            <p className="text-muted-foreground">{t('cart.emptyCart')}</p>
            <Button asChild className="mt-4">
              <Link to="/products">{t('cart.browseProducts')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className={cn('rounded-xl border border-border/40 bg-background/70 p-4 flex gap-3 items-center')}
                     style={{ contentVisibility: 'auto' as any }}>
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.variant?.colorName ? <span>{t('cart.color')}: {it.variant.colorName}</span> : null}
                      {it.variant?.sizeName ? <span className="ml-2">{t('cart.size')}: {it.variant.sizeName}</span> : null}
                    </div>
                    <div className="text-sm text-foreground/80 mt-1">{Number(it.variant?.selectedPrice ?? it.unitPrice)} دج</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => change(it.productId, Math.max(1, it.quantity - 1), it.variant?.colorId, it.variant?.sizeId)} aria-label={t('cart.decreaseQuantity')}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-8 text-center text-sm" aria-label={`${t('cart.quantity')}: ${it.quantity}`}>{it.quantity}</div>
                    <Button variant="outline" size="icon" onClick={() => change(it.productId, it.quantity + 1, it.variant?.colorId, it.variant?.sizeId)} aria-label={t('cart.increaseQuantity')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(it.productId, it.variant?.colorId, it.variant?.sizeId)} aria-label={t('cart.removeItem')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('cart.subtotal')}</span>
                  <span className="font-medium">{subtotal} دج</span>
                </div>
                <Button className="w-full mt-4" onClick={() => navigate('/cart/checkout')}>{t('cart.continueToCheckout')}</Button>
                <Button asChild variant="ghost" className="w-full mt-2">
                  <Link to="/products">{t('cart.continueShoppingFooter')}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

