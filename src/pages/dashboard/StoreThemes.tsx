import React, { useMemo, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { THEME_CONFIG } from '@/config/theme-config';
import { Store, Sparkles } from 'lucide-react';
import { setSelectedStoreTheme, getSelectedStoreTheme } from '@/lib/api/organizationTemplates';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// تعريف القوالب المتاحة مبدئياً
const STORE_TEMPLATES = [
  {
    id: 'default-store-v1',
    name: 'التصميم الأساسي V1',
    description: 'تصميم افتراضي يعتمد على مكونات StorePage الحالية.',
    preview: '/images/store-themes/default-v1.png',
    isAvailable: true
  },
  {
    id: 'modern-grid-v2',
    name: 'الشبكة العصرية V2',
    description: 'تخطيط شبكي عصري مع بطاقات منتجات بارزة.',
    preview: '/images/store-themes/modern-grid-v2.png',
    isAvailable: true
  },
  {
    id: 'hero-showcase-v3',
    name: 'عرض البطل V3',
    description: 'قسم بطل كبير مع عرض عروض ومجموعات مختارة.',
    preview: '/images/store-themes/hero-showcase-v3.png',
    isAvailable: false
  },
];

const LOCAL_KEY = 'bazaar_selected_store_template';

interface StoreThemesPageProps extends POSSharedLayoutControls {}

const StoreThemesPage: React.FC<StoreThemesPageProps> = ({ useStandaloneLayout = true } = {}) => {
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(`${LOCAL_KEY}_${organizationId ?? 'global'}`);
      if (saved) {
        setSelectedId(saved);
        return;
      }
      if (organizationId) {
        const selected = await getSelectedStoreTheme(organizationId);
        if (selected?.id) {
          setSelectedId(selected.id);
          localStorage.setItem(`${LOCAL_KEY}_${organizationId}`, selected.id);
          return;
        }
      }
      // افتراضي لجميع المؤسسات: القالب الأول
      setSelectedId('default-store-v1');
      if (organizationId) {
        localStorage.setItem(`${LOCAL_KEY}_${organizationId}`, 'default-store-v1');
      }
    };
    init();
  }, [organizationId]);

  const handleSelect = async (id: string, name: string) => {
    setSelectedId(id);
    if (organizationId) {
      localStorage.setItem(`${LOCAL_KEY}_${organizationId}`, id);
      const ok = await setSelectedStoreTheme(organizationId, id, name);
      if (ok) toast.success('تم حفظ القالب كمختار للمؤسسة.');
      else toast.error('تعذر حفظ القالب للمؤسسة.');
    } else {
      localStorage.setItem(`${LOCAL_KEY}_global`, id);
      toast.success('تم اختيار القالب للمتجر.');
    }
  };

  const isSelected = (id: string) => selectedId === id;

  const content = (
    <div className="p-4 sm:p-6 container max-w-7xl">
      <div className="mb-6 flex items-center gap-2">
        <Store className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">قوالب واجهة المتجر</h1>
      </div>

      <p className="text-muted-foreground mb-6">
        اختر القالب المناسب لواجهة متجرك. حالياً يتوفر القالب الأساسي المبني على التصميم الحالي، وسنضيف المزيد قريباً.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {STORE_TEMPLATES.map((tpl) => {
          const unavailable = !tpl.isAvailable;
          return (
            <Card key={tpl.id} className={(isSelected(tpl.id) ? 'ring-2 ring-primary ' : '') + (unavailable ? 'opacity-70' : '')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {tpl.name}
                      {isSelected(tpl.id) && <Badge variant="default">القالب الحالي</Badge>}
                      {!tpl.isAvailable && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="w-3 h-3" /> قريباً
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{tpl.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full rounded-md bg-muted overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-background to-secondary/10 grid place-items-center text-muted-foreground">
                    {tpl.preview ? (
                      <span className="text-sm">معاينة {tpl.name}</span>
                    ) : (
                      <span className="text-sm">لا توجد معاينة</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    disabled={unavailable}
                    variant={isSelected(tpl.id) ? 'secondary' : 'default'}
                    onClick={() => handleSelect(tpl.id, tpl.name)}
                  >
                    {unavailable ? 'غير متاح' : isSelected(tpl.id) ? 'محدد' : 'اختيار القالب'}
                  </Button>
                  <Button variant="outline" asChild disabled={unavailable}>
                    <a href="/" target="_blank" rel="noopener noreferrer">معاينة</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default StoreThemesPage;


