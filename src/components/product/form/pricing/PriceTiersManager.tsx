/**
 * 💰 Price Tiers Manager
 *
 * مدير مستويات الأسعار (التجزئة، الجملة، VIP، الموزعين)
 */

import { useCallback, useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Layers,
  Plus,
  Trash2,
  DollarSign,
  Percent,
  Users,
  Crown,
  Building2,
  UserCheck,
  Briefcase,
  HelpCircle,
  Info,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface PriceTiersManagerProps {
  form: UseFormReturn<ProductFormValues>;
  basePrice?: number;
  className?: string;
}

// أنواع مستويات الأسعار
const TIER_TYPES = [
  { value: 'retail', label: 'تجزئة', icon: Users, color: 'blue' },
  { value: 'wholesale', label: 'جملة', icon: Building2, color: 'green' },
  { value: 'partial_wholesale', label: 'نصف جملة', icon: UserCheck, color: 'amber' },
  { value: 'vip', label: 'VIP', icon: Crown, color: 'purple' },
  { value: 'reseller', label: 'موزعين', icon: Briefcase, color: 'cyan' },
  { value: 'distributor', label: 'وكلاء', icon: Building2, color: 'indigo' },
  { value: 'employee', label: 'موظفين', icon: UserCheck, color: 'pink' },
  { value: 'custom', label: 'مخصص', icon: Users, color: 'slate' },
] as const;

// أنواع التسعير
const PRICE_TYPES = [
  { value: 'fixed', label: 'سعر ثابت', description: 'سعر محدد للوحدة' },
  { value: 'percentage_discount', label: 'خصم نسبة مئوية', description: 'خصم % من السعر الأساسي' },
  { value: 'fixed_discount', label: 'خصم مبلغ ثابت', description: 'خصم مبلغ محدد من السعر' },
] as const;

// =====================================================
// المكون الرئيسي
// =====================================================

// ⚡ إزالة memo لأن form.watch يحتاج re-render عند التغيير
const PriceTiersManager = ({ form, basePrice = 0, className }: PriceTiersManagerProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'price_tiers',
  });

  // إضافة مستوى جديد
  const handleAddTier = useCallback(() => {
    append({
      tier_name: 'custom',
      tier_label: '',
      min_quantity: 1,
      max_quantity: undefined,
      price_type: 'fixed',
      price: undefined,
      discount_percentage: undefined,
      discount_amount: undefined,
      is_active: true,
      sort_order: fields.length,
    });
  }, [append, fields.length]);

  // حساب السعر النهائي
  const calculateFinalPrice = useCallback((tier: any) => {
    if (!basePrice || basePrice === 0) return null;

    switch (tier.price_type) {
      case 'fixed':
        return tier.price || null;
      case 'percentage_discount':
        if (!tier.discount_percentage) return null;
        return basePrice * (1 - tier.discount_percentage / 100);
      case 'fixed_discount':
        if (!tier.discount_amount) return null;
        return Math.max(0, basePrice - tier.discount_amount);
      default:
        return null;
    }
  }, [basePrice]);

  // الحصول على معلومات النوع
  const getTierTypeInfo = useCallback((tierName: string) => {
    return TIER_TYPES.find(t => t.value === tierName) || TIER_TYPES[TIER_TYPES.length - 1];
  }, []);

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-violet-50/60 via-purple-50/40 to-transparent dark:from-violet-950/30 dark:via-purple-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/60 dark:to-purple-900/60 p-2.5 rounded-xl shadow-sm">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">مستويات الأسعار</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">متقدم</Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTier}
            className="h-8 gap-1.5 px-3 text-xs border-violet-200 hover:bg-violet-50 hover:border-violet-300 dark:border-violet-800 dark:hover:bg-violet-950/50"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة مستوى
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background">
        {fields.length === 0 ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              أضف مستويات أسعار مختلفة لفئات العملاء المختلفة (مثل: الجملة، VIP، الموزعين)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const tier = form.watch(`price_tiers.${index}`);
              const tierInfo = getTierTypeInfo(tier?.tier_name || 'custom');
              const finalPrice = calculateFinalPrice(tier);
              const TierIcon = tierInfo.icon;

              return (
                <div
                  key={field.id}
                  className="p-4 rounded-xl border border-border/60 bg-gradient-to-r from-background/80 to-background/60 dark:from-background/40 dark:to-background/30 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* رأس المستوى */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className={cn(
                        'p-2 rounded-lg',
                        `bg-${tierInfo.color}-100 dark:bg-${tierInfo.color}-900/50`
                      )}>
                        <TierIcon className={cn(
                          'w-4 h-4',
                          `text-${tierInfo.color}-600 dark:text-${tierInfo.color}-400`
                        )} />
                      </div>
                      <span className="font-medium text-sm text-foreground">
                        المستوى {index + 1}
                      </span>
                      {finalPrice && (
                        <Badge variant="secondary" className="text-xs">
                          {finalPrice.toFixed(2)} دج
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* حقول المستوى */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* نوع المستوى */}
                    <FormField
                      control={form.control}
                      name={`price_tiers.${index}.tier_name`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs text-muted-foreground">نوع المستوى</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIER_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="w-3.5 h-3.5" />
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* الحد الأدنى للكمية */}
                    <FormField
                      control={form.control}
                      name={`price_tiers.${index}.min_quantity`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs text-muted-foreground">الحد الأدنى</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              className="h-9 text-sm"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* نوع التسعير */}
                    <FormField
                      control={form.control}
                      name={`price_tiers.${index}.price_type`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs text-muted-foreground">نوع التسعير</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRICE_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* السعر أو الخصم */}
                    {tier?.price_type === 'fixed' && (
                      <FormField
                        control={form.control}
                        name={`price_tiers.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs text-muted-foreground">السعر</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  className="h-9 pr-8 text-sm"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دج</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {tier?.price_type === 'percentage_discount' && (
                      <FormField
                        control={form.control}
                        name={`price_tiers.${index}.discount_percentage`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs text-muted-foreground">نسبة الخصم</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="0"
                                  className="h-9 pr-8 text-sm"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {tier?.price_type === 'fixed_discount' && (
                      <FormField
                        control={form.control}
                        name={`price_tiers.${index}.discount_amount`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs text-muted-foreground">مبلغ الخصم</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  className="h-9 pr-8 text-sm"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دج</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* معاينة السعر النهائي */}
                  {finalPrice && basePrice > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">السعر النهائي:</span>
                      <div className="flex items-center gap-2">
                        {tier?.price_type !== 'fixed' && (
                          <span className="text-muted-foreground line-through text-xs">{basePrice} دج</span>
                        )}
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {finalPrice.toFixed(2)} دج
                        </span>
                        {tier?.price_type !== 'fixed' && basePrice > finalPrice && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            توفير {((basePrice - finalPrice) / basePrice * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ملخص المستويات */}
        {fields.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50/60 to-purple-50/40 dark:from-violet-950/30 dark:to-purple-950/20 border border-violet-200/50 dark:border-violet-800/30">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="font-medium text-sm text-foreground">ملخص مستويات الأسعار</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((field, index) => {
                const tier = form.watch(`price_tiers.${index}`);
                const tierInfo = getTierTypeInfo(tier?.tier_name || 'custom');
                const finalPrice = calculateFinalPrice(tier);

                return (
                  <Badge
                    key={field.id}
                    variant="outline"
                    className="text-xs py-1.5 px-3 bg-background/50"
                  >
                    <tierInfo.icon className="w-3 h-3 mr-1.5" />
                    {tierInfo.label}
                    {finalPrice && (
                      <span className="mr-1.5 font-medium text-green-600 dark:text-green-400">
                        {finalPrice.toFixed(0)} دج
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

PriceTiersManager.displayName = 'PriceTiersManager';

export default PriceTiersManager;
