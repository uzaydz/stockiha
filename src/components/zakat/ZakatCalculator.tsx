import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface ZakatCalculation {
  calculation_date: string;
  total_capital_value: number;
  total_zakat_amount: number;
  zakat_percentage: number;
  inventory_value: number;
  cash_value: number;
  receivables_value: number;
  profits_value: number;
  inventory_zakat: number;
  cash_zakat: number;
  receivables_zakat: number;
  profits_zakat: number;
  nisab_threshold: number;
  current_gold_price: number;
  is_above_nisab: boolean;
  detailed_breakdown: any;
  zakat_suggestions: any;
  total_products_count: number;
  total_orders_count: number;
}

const ZakatCalculator: React.FC = () => {
  const { session } = useAuth();
  const [calculation, setCalculation] = useState<ZakatCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [customGoldPrice, setCustomGoldPrice] = useState<string>('');
  const [calculationDate, setCalculationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateZakat = async () => {
    if (!session?.user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (isCalculating) {
      return; // منع التكرار
    }

    setLoading(true);
    setIsCalculating(true);
    try {
      // الحصول على معرف المنظمة
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData?.organization_id) {
        toast.error('لا يمكن العثور على معرف المنظمة');
        return;
      }

      const { data, error } = await (supabase as any).rpc('calculate_zakat', {
        p_organization_id: userData.organization_id,
        p_calculation_date: calculationDate,
        p_include_detailed_breakdown: true,
        p_include_zakat_suggestions: true,
        p_custom_gold_price: customGoldPrice ? parseFloat(customGoldPrice) : null
      });

      if (error) {
        console.error('خطأ في حساب الزكاة:', error);
        toast.error('حدث خطأ في حساب الزكاة: ' + error.message);
      } else if (data && Array.isArray(data) && data.length > 0) {
        setCalculation((data as any[])[0] as ZakatCalculation);
        toast.success('تم حساب الزكاة بنجاح');
      } else {
        toast.error('لم يتم العثور على بيانات للحساب');
      }
    } catch (error) {
      console.error('خطأ:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      // إضافة تأخير لتجنب التكرار السريع
      const timeoutId = setTimeout(() => {
        calculateZakat();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [session?.user?.id]);

  const handleExportReport = () => {
    if (!calculation) return;

    const reportData = {
      تاريخ_الحساب: calculation.calculation_date,
      إجمالي_رأس_المال: formatCurrency(calculation.total_capital_value),
      إجمالي_الزكاة: formatCurrency(calculation.total_zakat_amount),
      النسبة_المئوية: `${calculation.zakat_percentage}%`,
      قيمة_المخزون: formatCurrency(calculation.inventory_value),
      قيمة_النقود: formatCurrency(calculation.cash_value),
      قيمة_المستحقات: formatCurrency(calculation.receivables_value),
      قيمة_الأرباح: formatCurrency(calculation.profits_value),
      النصاب: formatCurrency(calculation.nisab_threshold),
      فوق_النصاب: calculation.is_above_nisab ? 'نعم' : 'لا'
    };

    const blob = new Blob([
      Object.entries(reportData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    ], { type: 'text/plain;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الزكاة_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير التقرير بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* رأس مبسط */}
      <div className="py-2 text-center">
        <h2 className="text-xl md:text-2xl font-semibold">حاسبة الزكاة</h2>
        <p className="text-sm text-muted-foreground">حساب دقيق وفق ضوابط واضحة</p>
      </div>

      {/* أدوات التحكم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            أدوات الحساب
          </CardTitle>
          <CardDescription>
            قم بتخصيص إعدادات حساب الزكاة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calculation-date">تاريخ الحساب</Label>
              <Input
                id="calculation-date"
                type="date"
                value={calculationDate}
                onChange={(e) => setCalculationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gold-price">سعر جرام الذهب (اختياري)</Label>
              <Input
                id="gold-price"
                type="number"
                placeholder="2800"
                value={customGoldPrice}
                onChange={(e) => setCustomGoldPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={calculateZakat}
              disabled={loading || isCalculating}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              احسب الزكاة
            </Button>
            {calculation && (
              <Button
                variant="outline"
                onClick={handleExportReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير التقرير
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {calculation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* حالة النصاب */}
            <Alert className={calculation.is_above_nisab ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              <CheckCircle className={`h-4 w-4 ${calculation.is_above_nisab ? "text-green-600" : "text-yellow-600"}`} />
              <AlertTitle className={calculation.is_above_nisab ? "text-green-800" : "text-yellow-800"}>
                {calculation.is_above_nisab ? "✅ فوق النصاب" : "⚠️ تحت النصاب"}
              </AlertTitle>
              <AlertDescription className={calculation.is_above_nisab ? "text-green-700" : "text-yellow-700"}>
                {calculation.is_above_nisab
                  ? "رأس المال فوق النصاب، يجب إخراج الزكاة"
                  : `رأس المال تحت النصاب. النصاب الحالي: ${formatCurrency(calculation.nisab_threshold)}`
                }
              </AlertDescription>
            </Alert>

            {/* الإحصائيات الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    رأس المال الإجمالي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(calculation.total_capital_value)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    الزكاة المستحقة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculation.total_zakat_amount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    النسبة المئوية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {calculation.zakat_percentage}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-600" />
                    المنتجات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {calculation.total_products_count}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* تفاصيل رأس المال */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  تفاصيل رأس المال
                </CardTitle>
                <CardDescription>
                  عرض مفصل لجميع مصادر رأس المال المحسوبة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">قيمة المخزون</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(calculation.inventory_value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">قيمة النقود</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(calculation.cash_value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium">قيمة المستحقات</span>
                      <span className="font-bold text-purple-600">
                        {formatCurrency(calculation.receivables_value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium">قيمة الأرباح</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(calculation.profits_value)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">زكاة المخزون</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(calculation.inventory_zakat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">زكاة النقود</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(calculation.cash_zakat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium">زكاة المستحقات</span>
                      <span className="font-bold text-purple-600">
                        {formatCurrency(calculation.receivables_zakat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium">زكاة الأرباح</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(calculation.profits_zakat)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                  <span className="text-lg font-semibold">إجمالي الزكاة المستحقة</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(calculation.total_zakat_amount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* معلومات النصاب */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  معلومات النصاب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(calculation.nisab_threshold)}
                    </div>
                    <div className="text-sm text-muted-foreground">النصاب الحالي</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(calculation.current_gold_price)}
                    </div>
                    <div className="text-sm text-muted-foreground">سعر جرام الذهب</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {calculation.is_above_nisab ? 'فوق النصاب' : 'تحت النصاب'}
                    </div>
                    <div className="text-sm text-muted-foreground">الحالة</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* اقتراحات الزكاة */}
            {calculation.zakat_suggestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    اقتراحات للزكاة
                  </CardTitle>
                  <CardDescription>
                    نصائح وإرشادات لتوزيع ودفع الزكاة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {calculation.zakat_suggestions.distribution_suggestions && (
                    <div>
                      <h4 className="font-semibold mb-2">مقترحات التوزيع:</h4>
                      <div className="space-y-2">
                        {calculation.zakat_suggestions.distribution_suggestions.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-green-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.category}</span>
                              <Badge variant="secondary">{item.percentage}%</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calculation.zakat_suggestions.payment_tips && (
                    <div>
                      <h4 className="font-semibold mb-2">نصائح للدفع:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {calculation.zakat_suggestions.payment_tips.map((tip: string, index: number) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {calculation.zakat_suggestions.optimization_tips && (
                    <div>
                      <h4 className="font-semibold mb-2">نصائح للتحسين:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {calculation.zakat_suggestions.optimization_tips.map((tip: string, index: number) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZakatCalculator;
