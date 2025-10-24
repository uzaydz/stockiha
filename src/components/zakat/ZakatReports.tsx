import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  TrendingUp,
  Calendar,
  PieChart,
  BarChart3,
  Download,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface ZakatReport {
  year: number;
  total_capital: number;
  total_zakat: number;
  inventory_value: number;
  cash_value: number;
  receivables_value: number;
  profits_value: number;
  nisab_threshold: number;
  is_above_nisab: boolean;
  months: {
    month: string;
    capital: number;
    zakat: number;
    nisab_status: boolean;
  }[];
}

const ZakatReports: React.FC = () => {
  const { session } = useAuth();
  const [reports, setReports] = useState<ZakatReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'yearly' | 'monthly'>('yearly');

  const generateReports = async () => {
    if (!session?.user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData?.organization_id) {
        toast.error('لا يمكن العثور على معرف المنظمة');
        return;
      }

      // توليد تقارير السنوات السابقة
      const currentYear = parseInt(selectedYear);
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const reportsData: ZakatReport[] = [];

      for (const year of years) {
        const yearStart = new Date(year, 0, 1).toISOString();
        const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString();

        const { data: yearlyData, error: yearlyError } = await supabase.rpc('calculate_zakat', {
          p_organization_id: userData.organization_id,
          p_calculation_date: yearEnd,
          p_include_detailed_breakdown: true,
          p_include_zakat_suggestions: false,
          p_custom_gold_price: null
        });

        if (!yearlyError && yearlyData && yearlyData.length > 0) {
          const calculation = yearlyData[0];
          const months = [];

          // توليد بيانات كل شهر
          for (let month = 0; month < 12; month++) {
            const monthStart = new Date(year, month, 1).toISOString();
            const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            const { data: monthlyData, error: monthlyError } = await supabase.rpc('calculate_zakat', {
              p_organization_id: userData.organization_id,
              p_calculation_date: monthEnd,
              p_include_detailed_breakdown: false,
              p_include_zakat_suggestions: false,
              p_custom_gold_price: null
            });

            if (!monthlyError && monthlyData && monthlyData.length > 0) {
              const monthCalc = monthlyData[0];
              months.push({
                month: new Date(year, month).toLocaleDateString('ar', { month: 'long' }),
                capital: monthCalc.total_capital_value,
                zakat: monthCalc.total_zakat_amount,
                nisab_status: monthCalc.is_above_nisab
              });
            }
          }

          reportsData.push({
            year,
            total_capital: calculation.total_capital_value,
            total_zakat: calculation.total_zakat_amount,
            inventory_value: calculation.inventory_value,
            cash_value: calculation.cash_value,
            receivables_value: calculation.receivables_value,
            profits_value: calculation.profits_value,
            nisab_threshold: calculation.nisab_threshold,
            is_above_nisab: calculation.is_above_nisab,
            months
          });
        }
      }

      setReports(reportsData);
      toast.success('تم توليد التقارير بنجاح');
    } catch (error) {
      console.error('خطأ في توليد التقارير:', error);
      toast.error('حدث خطأ في توليد التقارير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReports();
  }, [session, selectedYear]);

  const exportDetailedReport = () => {
    if (reports.length === 0) return;

    let reportContent = 'تقرير الزكاة التفصيلي\n';
    reportContent += '='.repeat(50) + '\n\n';

    reports.forEach(report => {
      reportContent += `السنة: ${report.year}\n`;
      reportContent += '-'.repeat(30) + '\n';
      reportContent += `إجمالي رأس المال: ${formatCurrency(report.total_capital)}\n`;
      reportContent += `إجمالي الزكاة: ${formatCurrency(report.total_zakat)}\n`;
      reportContent += `النصاب: ${formatCurrency(report.nisab_threshold)}\n`;
      reportContent += `فوق النصاب: ${report.is_above_nisab ? 'نعم' : 'لا'}\n\n`;

      reportContent += 'تفاصيل شهرية:\n';
      report.months.forEach(month => {
        reportContent += `${month.month}: رأس المال ${formatCurrency(month.capital)}, زكاة ${formatCurrency(month.zakat)}, فوق النصاب ${month.nisab_status ? 'نعم' : 'لا'}\n`;
      });
      reportContent += '\n';
    });

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الزكاة_التفصيلي_${selectedYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير التقرير التفصيلي بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* رأس القسم */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
          📊 تقارير الزكاة التفصيلية
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          عرض تقارير شاملة ومفصلة لحسابات الزكاة على مدار السنوات والأشهر
        </p>
      </motion.div>

      {/* أدوات التحكم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            خيارات التقرير
          </CardTitle>
          <CardDescription>
            قم بتخصيص نوع وسنة التقرير المطلوب
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع التقرير</label>
              <Select value={reportType} onValueChange={(value: 'yearly' | 'monthly') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">تقرير سنوي</SelectItem>
                  <SelectItem value="monthly">تقرير شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">السنة</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(new Date().getFullYear()).toString()}>{new Date().getFullYear()}</SelectItem>
                  <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                  <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateReports}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              توليد التقارير
            </Button>
            {reports.length > 0 && (
              <Button
                variant="outline"
                onClick={exportDetailedReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير مفصل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* التقارير */}
      {reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Tabs defaultValue="yearly" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="yearly" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                التقرير السنوي
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                التقرير الشهري
              </TabsTrigger>
            </TabsList>

            <TabsContent value="yearly" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report, index) => (
                  <motion.div
                    key={report.year}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            السنة {report.year}
                          </CardTitle>
                          <Badge variant={report.is_above_nisab ? "default" : "secondary"}>
                            {report.is_above_nisab ? "فوق النصاب" : "تحت النصاب"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(report.total_capital)}
                            </div>
                            <div className="text-xs text-muted-foreground">رأس المال</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(report.total_zakat)}
                            </div>
                            <div className="text-xs text-muted-foreground">الزكاة</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>المخزون:</span>
                            <span className="font-medium">{formatCurrency(report.inventory_value)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>النقود:</span>
                            <span className="font-medium">{formatCurrency(report.cash_value)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>المستحقات:</span>
                            <span className="font-medium">{formatCurrency(report.receivables_value)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>الأرباح:</span>
                            <span className="font-medium">{formatCurrency(report.profits_value)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">النصاب:</span>
                            <span className="text-sm font-medium">{formatCurrency(report.nisab_threshold)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              {reports.map((report) => (
                <Card key={report.year}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      السنة {report.year} - التفاصيل الشهرية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {report.months.map((month, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{month.month}</h5>
                            {month.nisab_status ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>رأس المال:</span>
                              <span className="font-medium">{formatCurrency(month.capital)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>الزكاة:</span>
                              <span className="font-medium">{formatCurrency(month.zakat)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {/* ملخص عام */}
          <Card className="bg-gradient-to-r from-primary/5 via-blue-50/50 to-green-50/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                الملخص العام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatCurrency(reports.reduce((sum, r) => sum + r.total_capital, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي رأس المال (3 سنوات)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatCurrency(reports.reduce((sum, r) => sum + r.total_zakat, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي الزكاة (3 سنوات)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {((reports.reduce((sum, r) => sum + r.total_zakat, 0) / Math.max(reports.reduce((sum, r) => sum + r.total_capital, 0), 1)) * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">متوسط نسبة الزكاة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ZakatReports;
