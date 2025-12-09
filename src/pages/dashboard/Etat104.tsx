import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Calendar,
  Building2,
  Shield,
  TrendingUp,
  Users,
  FileCheck,
  AlertCircle,
  Info,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import Etat104ImportDialog from '../../components/etat104/Etat104ImportDialog';
import Etat104ValidationTable from '../../components/etat104/Etat104ValidationTable';
import Etat104Statistics from '../../components/etat104/Etat104Statistics';
import Etat104ExportDialog from '../../components/etat104/Etat104ExportDialog';
import Etat104HistoryList from '../../components/etat104/Etat104HistoryList';
import {
  createDeclaration,
  getDeclarationByYear,
  getAllDeclarations,
  getDeclarationClients,
  importCustomersToEtat104,
  exportToExcel,
} from '@/services/etat104Service';
import type { Etat104Declaration, Etat104Client } from '@/services/etat104Service';
import { exportEtat104OfficialG3, exportEtat104ToPDF, downloadOfficialG3Template } from '@/utils/etat104ExportOfficialG3';
import { supabase } from '@/lib/supabase';

interface ClientData {
  id: string;
  name: string;
  nif: string;
  rc: string;
  articleNumber?: string;
  address: string;
  amountHT: number;
  tva: number;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
}

interface ValidationResult {
  clients: ClientData[];
  totalClients: number;
  validClients: number;
  warningClients: number;
  errorClients: number;
  totalAmountHT: number;
  totalTVA: number;
}

const Etat104 = () => {
  const { currentOrganization } = useTenant();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [currentDeclaration, setCurrentDeclaration] = useState<Etat104Declaration | null>(null);
  const [clients, setClients] = useState<Etat104Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [posSettings, setPosSettings] = useState<any>(null);

  // جلب الكشف الحالي عند تحميل الصفحة
  useEffect(() => {
    if (currentOrganization?.id) {
      loadCurrentDeclaration();
    }
  }, [currentOrganization, selectedYear]);

  const loadCurrentDeclaration = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const declaration = await getDeclarationByYear(currentOrganization.id, selectedYear);
      
      if (declaration) {
        setCurrentDeclaration(declaration);
        
        console.log('📊 [Etat104] تفاصيل الكشف:', {
          id: declaration.id,
          year: declaration.year,
          status: declaration.status,
          total_clients: declaration.total_clients,
          valid_clients: declaration.valid_clients,
          warning_clients: declaration.warning_clients,
          error_clients: declaration.error_clients,
        });
        
        // جلب العملاء
        const clientsData = await getDeclarationClients(declaration.id);
        setClients(clientsData);
        
        console.log(`👥 [Etat104] تم جلب ${clientsData.length} عميل من قاعدة البيانات`);
        
        // تحديث نتائج التحقق
        const processedClients = clientsData.map((c, index) => {
          // تحويل حالة التحقق
          let status: 'valid' | 'warning' | 'error' = 'valid';
          let warnings: string[] = [];
          let errors: string[] = [];
          
          if (c.validation_status === 'error') {
            status = 'error';
            errors.push('يوجد أخطاء في البيانات');
          } else if (c.validation_status === 'warning') {
            status = 'warning';
            warnings.push('يوجد تحذيرات على البيانات');
          } else if (c.validation_status === 'pending') {
            // العملاء في انتظار التحقق يعتبرون تحذير
            status = 'warning';
            warnings.push('⏳ في انتظار التحقق من NIF و RC');
          }
          
          // تحقق إضافي من البيانات
          if (!c.nif || c.nif.length !== 15) {
            status = 'error';
            errors.push('❌ NIF غير صحيح (يجب أن يكون 15 رقم)');
          }
          
          if (!c.rc) {
            status = 'error';
            errors.push('❌ RC مفقود');
          }
          
          if (c.amount_ht === 0 && c.tva === 0) {
            if (status === 'valid') status = 'warning';
            warnings.push('⚠️ لا توجد مبيعات مسجلة لهذا العميل');
          }
          
          console.log(`  ${index + 1}. ${c.commercial_name}:`, {
            nif: c.nif,
            rc: c.rc,
            amount_ht: c.amount_ht,
            tva: c.tva,
            validation_status: c.validation_status,
            computed_status: status,
            nif_verified: c.nif_verified,
            rc_verified: c.rc_verified,
            warnings: warnings,
            errors: errors,
          });

          return {
            id: c.id,
            name: c.commercial_name,
            nif: c.nif,
            rc: c.rc,
            articleNumber: c.article_number,
            address: c.address,
            amountHT: c.amount_ht,
            tva: c.tva,
            status: status,
            errors: errors,
            warnings: warnings,
          };
        });
        
        console.log('✅ [Etat104] معالجة العملاء اكتملت:', {
          total: processedClients.length,
          valid: processedClients.filter(c => c.status === 'valid').length,
          warning: processedClients.filter(c => c.status === 'warning').length,
          error: processedClients.filter(c => c.status === 'error').length,
        });
        
        setValidationResult({
          clients: processedClients,
          totalClients: declaration.total_clients || 0,
          validClients: declaration.valid_clients || 0,
          warningClients: declaration.warning_clients || 0,
          errorClients: declaration.error_clients || 0,
          totalAmountHT: declaration.total_amount_ht || 0,
          totalTVA: declaration.total_tva || 0,
        });
      } else {
        setCurrentDeclaration(null);
        setClients([]);
        setValidationResult(null);
      }
    } catch (error: any) {
      console.error('Error loading declaration:', error);
      toast.error('فشل تحميل الكشف: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeclaration = async () => {
    if (!currentOrganization?.id) {
      toast.error('لم يتم العثور على معرف المؤسسة');
      return;
    }

    setIsCreating(true);
    try {
      const declaration = await createDeclaration(currentOrganization.id, selectedYear);
      
      if (declaration) {
        setCurrentDeclaration(declaration);
        toast.success(`تم إنشاء كشف ${selectedYear} بنجاح`);
      }
    } catch (error: any) {
      console.error('Error creating declaration:', error);
      toast.error('فشل إنشاء الكشف: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (dateFilter) {
      case 'day':
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          toast.error('الرجاء اختيار تاريخ البداية والنهاية');
          return null;
        }
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      case 'year':
      default:
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
        break;
    }

    return { startDate, endDate };
  };

  const handleImportFromCustomers = async () => {
    if (!currentOrganization?.id || !currentDeclaration?.id) {
      toast.error('يجب إنشاء كشف أولاً');
      return;
    }

    const dateRange = getDateRange();
    if (!dateRange) return;

    console.log('📅 [Import] نطاق التاريخ المحدد:', dateRange);

    setIsValidating(true);
    try {
      const result = await importCustomersToEtat104(
        currentDeclaration.id,
        currentOrganization.id,
        selectedYear,
        dateRange.startDate,
        dateRange.endDate
      );

      if (result.imported > 0) {
        toast.success(`تم استيراد ${result.imported} عميل بنجاح! يمكنك الآن مراجعة البيانات والتحقق منها.`);
        // إعادة تحميل البيانات
        await loadCurrentDeclaration();
      } else if (result.skipped > 0) {
        toast.warning(`تم تخطي ${result.skipped} عميل. تأكد من وجود NIF و RC لجميع العملاء.`);
      } else {
        toast.info('لا يوجد عملاء بمعلومات ضريبية كاملة (NIF و RC)');
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error: any) {
      console.error('Error importing customers:', error);
      toast.error('فشل استيراد العملاء: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsValidating(true);
    try {
      // هنا سيتم معالجة الملف والتحقق من البيانات
      toast.success('تم استيراد الملف بنجاح');
      setImportDialogOpen(false);
      
      // محاكاة نتيجة التحقق
      setTimeout(() => {
        setValidationResult({
          clients: [],
          totalClients: 0,
          validClients: 0,
          warningClients: 0,
          errorClients: 0,
          totalAmountHT: 0,
          totalTVA: 0,
        });
        setIsValidating(false);
      }, 2000);
    } catch (error) {
      toast.error('فشل استيراد الملف');
      setIsValidating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      if (format === 'excel' && clients.length > 0 && currentOrganization) {
        // جلب إعدادات POS للحصول على البيانات الضريبية
        const { data: settings } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .single() as any;
        
        // استخدام التنسيق الرسمي G3-BIS
        await exportEtat104OfficialG3(
          clients,
          {
            name: settings?.store_name || currentOrganization.name || '',
            nif: settings?.nif,
            rc: settings?.rc,
            nis: settings?.nis,
            address: settings?.store_address,
          },
          selectedYear
        );
      } else if (format === 'pdf') {
        // جلب إعدادات POS للحصول على البيانات الضريبية
        const { data: settings } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .single() as any;
        
        // تصدير PDF
        await exportEtat104ToPDF(
          clients,
          {
            name: settings?.store_name || currentOrganization.name || '',
            nif: settings?.nif,
            rc: settings?.rc,
            nis: settings?.nis,
            address: settings?.store_address,
          },
          selectedYear
        );
      }
      setExportDialogOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('فشل تصدير الكشف: ' + error.message);
    }
  };

  const handleRefresh = async () => {
    await loadCurrentDeclaration();
  };

  return (
    <POSPureLayout
      onRefresh={handleRefresh}
      isRefreshing={isLoading}
      connectionStatus="connected"
    >
      <div className="space-y-6 p-6" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            كشف حساب 104 (État 104)
            {currentDeclaration && (
              <Badge variant="outline" className="text-sm">
                {selectedYear}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            الكشف التفصيلي بالعملاء - إقرار ضريبي سنوي وفقاً للمادة 183 مكرر
          </p>
        </div>
        <div className="flex gap-2">
          {!currentDeclaration ? (
            <Button
              onClick={handleCreateDeclaration}
              disabled={isCreating}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? 'جاري الإنشاء...' : `إنشاء كشف ${selectedYear}`}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleImportFromCustomers}
                disabled={isValidating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'جاري الاستيراد...' : 'استيراد من العملاء'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                استيراد Excel
              </Button>
              <Button
                onClick={() => setExportDialogOpen(true)}
                disabled={!validationResult || clients.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير الكشف
              </Button>
            </>
          )}
        </div>
      </div>

      {/* فلتر التاريخ */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">فلترة حسب الفترة الزمنية</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilter === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('day')}
              >
                اليوم
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('week')}
              >
                الأسبوع
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('month')}
              >
                الشهر
              </Button>
              <Button
                variant={dateFilter === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('year')}
              >
                السنة ({selectedYear})
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('custom')}
              >
                مخصص
              </Button>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="start-date">من تاريخ</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date">إلى تاريخ</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      loadCurrentDeclaration();
                    } else {
                      toast.error('الرجاء اختيار تاريخ البداية والنهاية');
                    }
                  }}
                >
                  تطبيق
                </Button>
              </div>
            )}

            {dateFilter !== 'custom' && dateFilter !== 'year' && (
              <div className="text-sm text-muted-foreground">
                {dateFilter === 'day' && '📅 عرض مبيعات اليوم فقط'}
                {dateFilter === 'week' && '📅 عرض مبيعات آخر 7 أيام'}
                {dateFilter === 'month' && '📅 عرض مبيعات الشهر الحالي'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* معلومات مهمة */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-900">معلومات مهمة</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• الموعد النهائي للتقديم: <strong>30 أفريل من كل عام</strong></li>
                <li>• يجب التحقق من صحة أرقام NIF و RC قبل التقديم</li>
                <li>• العقوبات تتراوح من 30,000 دج إلى 80,000 دج للتأخير</li>
                <li>• غرامة من 1,000 دج إلى 10,000 دج لكل خطأ أو إغفال</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات */}
      {validationResult && (
        <Etat104Statistics
          totalClients={validationResult.totalClients}
          validClients={validationResult.validClients}
          warningClients={validationResult.warningClients}
          errorClients={validationResult.errorClients}
          totalAmountHT={validationResult.totalAmountHT}
          totalTVA={validationResult.totalTVA}
        />
      )}

      {/* التبويبات الرئيسية */}
      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validation" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            التحقق والمصادقة
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <Info className="h-4 w-4" />
            الدليل الإرشادي
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            السجل التاريخي
          </TabsTrigger>
        </TabsList>

        {/* تبويب التحقق */}
        <TabsContent value="validation" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
                  <p className="text-muted-foreground">جاري التحميل...</p>
                </div>
              </CardContent>
            </Card>
          ) : !currentDeclaration ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ابدأ بإنشاء كشف 104</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    أنشئ كشف جديد للسنة {selectedYear} ثم قم باستيراد العملاء من النظام أو من ملف Excel
                  </p>
                  <Button onClick={handleCreateDeclaration} disabled={isCreating} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isCreating ? 'جاري الإنشاء...' : `إنشاء كشف ${selectedYear}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !validationResult || clients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا يوجد عملاء في الكشف</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    قم باستيراد العملاء من نظام العملاء الحالي أو من ملف Excel
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleImportFromCustomers} disabled={isValidating} className="gap-2">
                      <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                      {isValidating ? 'جاري الاستيراد...' : 'استيراد من العملاء'}
                    </Button>
                    <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                      <Upload className="h-4 w-4" />
                      استيراد Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Etat104ValidationTable
              clients={validationResult.clients}
              onRefresh={loadCurrentDeclaration}
            />
          )}
        </TabsContent>

        {/* تبويب الدليل الإرشادي */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ما هو كشف حساب 104؟
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                كشف تفصيلي بالعملاء (état 104)، المعروف رسمياً باسم "الكشف التفصيلي بالعملاء"، 
                هو إقرار ضريبي سنوي يحتل مكانة محورية في نظام الرقابة للإدارة الضريبية الجزائرية.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      من هم المعنيون؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• الشركات العاملة في البيع بالجملة</p>
                    <p>• المنتجون والمستوردون</p>
                    <p>• مقدمو الخدمات للشركات</p>
                    <p>• كل من يتعامل مع عملاء محترفين</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      المعلومات المطلوبة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• الاسم التجاري الكامل</p>
                    <p>• رقم التعريف الجبائي (NIF)</p>
                    <p>• رقم السجل التجاري (RC)</p>
                    <p>• العنوان الدقيق</p>
                    <p>• المبالغ (HT و TVA)</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      العقوبات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>عدم التقديم:</strong> 2% من رقم الأعمال</p>
                    <p><strong>تأخير {'<'} شهر:</strong> 30,000 دج</p>
                    <p><strong>تأخير {'>'} شهرين:</strong> 80,000 دج</p>
                    <p><strong>أخطاء:</strong> 1,000 - 10,000 دج لكل خطأ</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      الأهداف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• مقاطعة المعلومات الضريبية</p>
                    <p>• مراقبة سلسلة TVA</p>
                    <p>• مكافحة التهرب الضريبي</p>
                    <p>• ضمان المنافسة النزيهة</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    التزامات قانون المالية 2024
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-semibold">يجب على الشركات:</p>
                  <ul className="space-y-1 mr-4">
                    <li>• التحقق من صحة أرقام RC عبر موقع CNRC قبل إبرام العمليات</li>
                    <li>• التحقق من صحة أرقام NIF عبر موقع DGI</li>
                    <li>• الاحتفاظ بسجل للتحقيقات (لقطات شاشة مؤرخة)</li>
                    <li>• تقديم المستندات المحاسبية عند الطلب</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب السجل التاريخي */}
        <TabsContent value="history" className="space-y-4">
          {currentOrganization?.id ? (
            <Etat104HistoryList 
              selectedYear={selectedYear} 
              organizationId={currentOrganization.id}
              onYearSelect={(year) => setSelectedYear(year)}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">لم يتم العثور على معرف المؤسسة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* نوافذ الحوار */}
      <Etat104ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isValidating={isValidating}
      />

      <Etat104ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        validationResult={validationResult}
      />
      </div>
    </POSPureLayout>
  );
};

export default Etat104;
