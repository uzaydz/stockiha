/**
 * مكون قسم الزكاة - تصميم إسلامي حديث
 * Modern Islamic Finance Design
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Coins,
  Building2,
  Wallet,
  Package,
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  Info,
  Link,
  Scale,
  Calculator,
  ArrowRight
} from 'lucide-react';
import type { ZakatData, ZakatAssets, ZakatLiabilities } from '../types';
import { formatCurrency } from '../utils';
import { ZAKAT_CONSTANTS } from '../constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ZakatSectionProps {
  zakat: ZakatData | null;
  isLoading?: boolean;
}

// Visual Helpers
const ZakatIcon: React.FC<{ icon: React.ElementType; color?: string; bg?: string }> = ({ icon: Icon, color = "text-emerald-600", bg = "bg-emerald-50 dark:bg-emerald-900/20" }) => (
  <div className={cn("p-2.5 rounded-xl", bg)}>
    <Icon className={cn("h-5 w-5", color)} />
  </div>
);

// مكون الأصول
const ZakatAssetsCard: React.FC<{
  assets: ZakatAssets | null;
  isLoading?: boolean;
}> = ({ assets, isLoading }) => {
  if (isLoading) return <div className="h-96 rounded-3xl bg-zinc-100 animate-pulse" />;

  const assetItems = [
    { label: 'النقدية في الصندوق', value: assets?.cashInHand, icon: Wallet },
    { label: 'الرصيد البنكي', value: assets?.bankBalance, icon: Building2 },
    { label: 'قيمة المخزون (سعر التكلفة)', value: assets?.inventoryValue, icon: Package },
    { label: 'مخزون الاشتراكات', value: assets?.subscriptionStock, icon: CreditCard },
    { label: 'الذمم المدينة (ديون عملاء)', value: assets?.receivables, icon: Users },
    { label: 'أصول أخرى', value: assets?.otherAssets, icon: Coins },
  ];

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <ZakatIcon icon={Coins} />
          الأصول الزكوية
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-1 mt-2">
          {assetItems.map((item, index) => (
            item.value ? (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-full text-zinc-400 group-hover/item:text-emerald-600 transition-colors">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
                  {formatCurrency(item.value || 0)}
                </span>
              </motion.div>
            ) : null
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <span className="text-sm text-zinc-500">الإجمالي</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(assets?.totalAssets || 0)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون الخصوم
const ZakatLiabilitiesCard: React.FC<{
  liabilities: ZakatLiabilities | null;
  isLoading?: boolean;
}> = ({ liabilities, isLoading }) => {
  if (isLoading) return <div className="h-96 rounded-3xl bg-zinc-100 animate-pulse" />;

  const liabilityItems = [
    { label: 'ديون الموردين', value: liabilities?.supplierDebts },
    { label: 'مصاريف معلقة', value: liabilities?.pendingExpenses },
    { label: 'التزامات أخرى', value: liabilities?.otherLiabilities },
  ];

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <ZakatIcon icon={Scale} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-900/20" />
          الخصوم والالتزامات
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-1 mt-2">
          {liabilityItems.map((item, index) => (
            item.value ? (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 pl-8">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  - {formatCurrency(item.value || 0)}
                </span>
              </motion.div>
            ) : null
          ))}
          {/* If no liabilities */}
          {!liabilityItems.some(i => i.value && i.value > 0) && (
            <div className="py-8 text-center text-zinc-400 text-sm italic">لا توجد خصوم مسجلة</div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <span className="text-sm text-zinc-500">الإجمالي</span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(liabilities?.totalLiabilities || 0)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون حساب الزكاة النهائي
const ZakatCalculationCard: React.FC<{
  zakat: ZakatData | null;
  isLoading?: boolean;
}> = ({ zakat, isLoading }) => {
  if (isLoading) return <div className="h-64 rounded-3xl bg-zinc-100 animate-pulse" />;

  const isNisabReached = zakat?.isNisabReached || false;
  const nisabPercentage = zakat?.zakatableBase && zakat.nisab ? Math.min(100, (zakat.zakatableBase / zakat.nisab) * 100) : 0;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-zinc-900 to-zinc-950 text-white relative overflow-hidden">
      {/* Golden Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <CardContent className="p-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 items-center">

          {/* Left: Visualization (The Scale) */}
          <div className="flex-1 w-full space-y-8">
            <div>
              <h3 className="text-zinc-400 text-sm font-medium mb-1">الوعاء الزكوي (الصافي)</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tighter text-white">{formatCurrency(zakat?.zakatableBase || 0)}</span>
                {isNisabReached ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">بلغ النصاب</Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0">لم يبلغ النصاب</Badge>
                )}
              </div>
            </div>

            {/* Nisab Meter */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>0</span>
                <span>حد النصاب: {formatCurrency(zakat?.nisab || 0)}</span>
              </div>
              <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nisabPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn("absolute top-0 left-0 h-full rounded-full", isNisabReached ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-amber-600 to-amber-400")}
                />
                {/* Marker for Nisab */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-20 layout-left" style={{ left: `${Math.min(100, (zakat?.nisab! / (zakat?.zakatableBase! || 1)) * 100)}%` }} />
              </div>
              <p className="text-xs text-zinc-500">
                تم حساب النصاب بناءً على {ZAKAT_CONSTANTS.nisabGoldGrams} جرام ذهب بسعر {zakat?.goldPricePerGram} للجرام.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-32 bg-zinc-800" />

          {/* Right: The Bill */}
          <div className="w-full lg:w-auto min-w-[300px] bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">الزكاة المستحقة</p>
                  <p className="text-xs text-zinc-500">للعام الهجري الحالي</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">نسبة الزكاة</span>
                <span className="text-white font-mono">{zakat?.zakatRate}% (ربع العشر)</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-end">
                <span className="text-amber-400 font-bold text-lg">المبلغ الواجب إخراجه</span>
              </div>
              <p className="text-4xl font-bold text-white tracking-tighter">
                {isNisabReached ? formatCurrency(zakat?.zakatAmount || 0) : formatCurrency(0)}
              </p>
            </div>

            <Button className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-black font-bold h-12">
              تصدير شهادة الزكاة
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};


// المكون الرئيسي
const ZakatSection: React.FC<ZakatSectionProps> = ({ zakat, isLoading }) => {
  return (
    <div className="space-y-8">
      {/* الصف الأول: الأصول والخصوم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ZakatAssetsCard assets={zakat?.assets || null} isLoading={isLoading} />
        <ZakatLiabilitiesCard liabilities={zakat?.liabilities || null} isLoading={isLoading} />
      </div>

      {/* الصف الثاني: حاسبة النصاب */}
      <ZakatCalculationCard zakat={zakat} isLoading={isLoading} />

      {/* Disclaimer */}
      <div className="flex gap-3 items-start p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
        <Info className="h-5 w-5 shrink-0" />
        <p>
          هذا الحساب تقديري للمساعدة في معرفة الزكاة المستحقة. يُنصح بمراجعة عالم شرعي متخصص للتأكد من صحة الحساب ومراعاة الظروف الخاصة بنشاطك التجاري.
        </p>
      </div>
    </div>
  );
};

export { ZakatSection };
