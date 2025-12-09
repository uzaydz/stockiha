/**
 * 💰 LandedCostsPanel - لوحة التكاليف الإضافية
 * ============================================================
 *
 * لوحة لإدارة التكاليف الإضافية (شحن، جمارك، تأمين) وتوزيعها
 *
 * ============================================================
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Truck,
  Shield,
  FileCheck,
  Package,
  Wallet,
  Calculator,
  Check,
} from 'lucide-react';
import type {
  LandedCost,
  LandedCostType,
  CostDistributionMethod,
} from '../types/smart-purchase.types';
import {
  createLandedCost,
  formatLandedCost,
  getLandedCostIcon,
  getDistributionMethodLabel,
} from '../hooks/useLandedCostDistributor';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

interface LandedCostsPanelProps {
  /** هل اللوحة مفتوحة */
  open: boolean;
  /** إغلاق اللوحة */
  onOpenChange: (open: boolean) => void;
  /** التكاليف الحالية */
  costs: LandedCost[];
  /** عند تغيير التكاليف */
  onCostsChange: (costs: LandedCost[]) => void;
  /** إجمالي قيمة المشتريات (للمقارنة) */
  purchaseTotal: number;
  /** اللغة */
  locale?: 'ar' | 'en';
}

// أيقونات أنواع التكاليف
const costTypeIcons: Record<LandedCostType, React.ReactNode> = {
  shipping: <Truck className="h-4 w-4" />,
  customs: <FileCheck className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  handling: <Package className="h-4 w-4" />,
  other: <Wallet className="h-4 w-4" />,
};

// أسماء أنواع التكاليف
const costTypeLabels: Record<LandedCostType, { ar: string; en: string }> = {
  shipping: { ar: 'شحن ونقل', en: 'Shipping' },
  customs: { ar: 'جمارك ورسوم', en: 'Customs' },
  insurance: { ar: 'تأمين', en: 'Insurance' },
  handling: { ar: 'مناولة وتفريغ', en: 'Handling' },
  other: { ar: 'مصاريف أخرى', en: 'Other' },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function LandedCostsPanel({
  open,
  onOpenChange,
  costs,
  onCostsChange,
  purchaseTotal,
  locale = 'ar',
}: LandedCostsPanelProps) {
  // نموذج إضافة تكلفة جديدة
  const [newCost, setNewCost] = useState<{
    type: LandedCostType;
    label: string;
    amount: number;
    distributionMethod: CostDistributionMethod;
  }>({
    type: 'shipping',
    label: '',
    amount: 0,
    distributionMethod: 'by_value',
  });

  // إجمالي التكاليف
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  const costPercentage = purchaseTotal > 0 ? (totalCosts / purchaseTotal) * 100 : 0;

  // إضافة تكلفة
  const handleAddCost = () => {
    if (newCost.amount <= 0) return;

    const label = newCost.label || costTypeLabels[newCost.type][locale];
    const cost = createLandedCost(newCost.type, newCost.amount, label, newCost.distributionMethod);

    onCostsChange([...costs, cost]);

    // إعادة تعيين النموذج
    setNewCost({
      type: 'shipping',
      label: '',
      amount: 0,
      distributionMethod: 'by_value',
    });
  };

  // حذف تكلفة
  const handleRemoveCost = (costId: string) => {
    onCostsChange(costs.filter(c => c.id !== costId));
  };

  // تحديث تكلفة
  const handleUpdateCost = (costId: string, updates: Partial<LandedCost>) => {
    onCostsChange(costs.map(c => c.id === costId ? { ...c, ...updates } : c));
  };

  // إضافة سريعة من القوالب الشائعة
  const quickAddTemplates: { type: LandedCostType; label: string; percentage: number }[] = [
    { type: 'shipping', label: 'شحن داخلي', percentage: 2 },
    { type: 'shipping', label: 'شحن دولي', percentage: 5 },
    { type: 'customs', label: 'جمارك', percentage: 15 },
    { type: 'insurance', label: 'تأمين', percentage: 1 },
  ];

  const handleQuickAdd = (template: typeof quickAddTemplates[0]) => {
    const amount = purchaseTotal * (template.percentage / 100);
    const cost = createLandedCost(template.type, amount, template.label, 'by_value');
    onCostsChange([...costs, cost]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            التكاليف الإضافية (Landed Costs)
          </SheetTitle>
          <SheetDescription>
            أضف تكاليف الشحن والجمارك والتأمين لحساب التكلفة الحقيقية للمنتجات
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* ملخص */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">إجمالي التكاليف الإضافية</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatLandedCost(totalCosts)}
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {costPercentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                من قيمة المشتريات ({formatLandedCost(purchaseTotal)})
              </div>
            </CardContent>
          </Card>

          {/* قائمة التكاليف الحالية */}
          {costs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">التكاليف المضافة</h4>
              {costs.map((cost) => (
                <Card key={cost.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        cost.type === 'shipping' && "bg-blue-100 text-blue-600",
                        cost.type === 'customs' && "bg-orange-100 text-orange-600",
                        cost.type === 'insurance' && "bg-green-100 text-green-600",
                        cost.type === 'handling' && "bg-purple-100 text-purple-600",
                        cost.type === 'other' && "bg-gray-100 text-gray-600",
                      )}>
                        {costTypeIcons[cost.type]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{cost.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveCost(cost.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <Input
                            type="number"
                            value={cost.amount || ''}
                            onChange={(e) => handleUpdateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-32 h-8 text-sm"
                            min={0}
                          />

                          <Select
                            value={cost.distributionMethod}
                            onValueChange={(value: CostDistributionMethod) =>
                              handleUpdateCost(cost.id, { distributionMethod: value })
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="by_value">حسب القيمة</SelectItem>
                              <SelectItem value="by_quantity">حسب الكمية</SelectItem>
                              <SelectItem value="by_weight">حسب الوزن</SelectItem>
                              <SelectItem value="equal">بالتساوي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Separator />

          {/* إضافة سريعة */}
          <div>
            <h4 className="font-medium text-sm mb-3">إضافة سريعة</h4>
            <div className="flex flex-wrap gap-2">
              {quickAddTemplates.map((template, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(template)}
                  className="text-xs"
                >
                  {costTypeIcons[template.type]}
                  <span className="mr-1">{template.label}</span>
                  <Badge variant="secondary" className="mr-1 px-1.5 py-0">
                    {template.percentage}%
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* نموذج إضافة يدوية */}
          <div>
            <h4 className="font-medium text-sm mb-3">إضافة تكلفة جديدة</h4>
            <div className="space-y-4">
              {/* نوع التكلفة */}
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(costTypeLabels) as LandedCostType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewCost(prev => ({
                      ...prev,
                      type,
                      label: costTypeLabels[type][locale]
                    }))}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      newCost.type === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary/50"
                    )}
                  >
                    {costTypeIcons[type]}
                    <span className="text-[10px]">{costTypeLabels[type][locale]}</span>
                  </button>
                ))}
              </div>

              {/* الاسم والمبلغ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">الاسم</Label>
                  <Input
                    value={newCost.label}
                    onChange={(e) => setNewCost(prev => ({ ...prev, label: e.target.value }))}
                    placeholder={costTypeLabels[newCost.type][locale]}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">المبلغ (د.ج)</Label>
                  <Input
                    type="number"
                    value={newCost.amount || ''}
                    onChange={(e) => setNewCost(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="mt-1"
                    min={0}
                  />
                </div>
              </div>

              {/* طريقة التوزيع */}
              <div>
                <Label className="text-xs">طريقة التوزيع</Label>
                <Select
                  value={newCost.distributionMethod}
                  onValueChange={(value: CostDistributionMethod) =>
                    setNewCost(prev => ({ ...prev, distributionMethod: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_value">
                      <div className="flex flex-col">
                        <span>حسب القيمة</span>
                        <span className="text-xs text-muted-foreground">المنتج الأغلى يأخذ حصة أكبر</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="by_quantity">
                      <div className="flex flex-col">
                        <span>حسب الكمية</span>
                        <span className="text-xs text-muted-foreground">توزيع على عدد الوحدات</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="by_weight">
                      <div className="flex flex-col">
                        <span>حسب الوزن</span>
                        <span className="text-xs text-muted-foreground">للشحن البحري والجوي</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="equal">
                      <div className="flex flex-col">
                        <span>بالتساوي</span>
                        <span className="text-xs text-muted-foreground">نفس المبلغ لكل منتج</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* زر الإضافة */}
              <Button
                onClick={handleAddCost}
                disabled={newCost.amount <= 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة التكلفة
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            <Check className="h-4 w-4 ml-2" />
            تم
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Landed Costs Summary (ملخص مصغر)
// ═══════════════════════════════════════════════════════════════════════════

interface LandedCostsSummaryProps {
  costs: LandedCost[];
  total: number;
  onClick?: () => void;
}

export function LandedCostsSummary({ costs, total, onClick }: LandedCostsSummaryProps) {
  if (costs.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
        <Plus className="h-4 w-4" />
        تكاليف إضافية
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <Calculator className="h-4 w-4" />
      <span>{costs.length} تكاليف</span>
      <Badge variant="default" className="px-1.5">
        {formatLandedCost(total)}
      </Badge>
    </Button>
  );
}

export default LandedCostsPanel;
