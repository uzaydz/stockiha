import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Printer,
  Settings,
  Zap,
  Scissors,
  Monitor,
  TestTube,
  Volume2,
  VolumeX,
  DollarSign,
  Copy,
  Layout,
  Palette,
  FileText,
  Check,
  Info,
  AlertCircle,
  Save,
  RotateCcw,
  Laptop,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Smartphone,
  CreditCard,
  QrCode,
  MapPin,
  Clock,
  User,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
  Minimize
} from 'lucide-react';
import { POSSettings } from '@/types/posSettings';
import {
  paperWidthOptions,
  printDensityOptions,
  receiptTemplateOptions,
  printerTypeOptions,
  printCopiesOptions,
  itemDisplayOptions
} from '@/types/posSettings';
import { cn } from '@/lib/utils';
import { usePrinterSettings } from '@/hooks/usePrinterSettings';
import { usePrinter } from '@/hooks/usePrinter';
import { type LocalPrinterSettings, DEFAULT_PRINTER_SETTINGS } from '@/api/localPrinterSettingsService';
import { unifiedPrintService, ReceiptData } from '@/services/UnifiedPrintService';

interface PrintingSettingsProps {
  settings: POSSettings | null;
  updateSetting: <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => void;
}

const TEMPLATE_ICONS = {
  apple: Smartphone,
  minimal: Minimize,
  modern: Zap,
  classic: FileText,
  custom: Settings,
};

const PrintingSettings: React.FC<PrintingSettingsProps> = ({ settings: rawSettings, updateSetting }) => {
  const [activeTab, setActiveTab] = useState('printer');
  const [testPrintStatus, setTestPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const receiptPreviewRef = useRef<HTMLDivElement>(null);

  // ⚡ Hook لإعدادات الطابعة المحلية
  const {
    printerSettings,
    isLoading: printerLoading,
    isSaving,
    updatePrinterSetting,
    savePrinterSettings,
    resetPrinterSettings,
    deviceId
  } = usePrinterSettings();

  // 🖨️ Hook للطباعة الموحدة
  const {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    fetchPrinters,
    openCashDrawer,
    isElectron,
    isPrinting
  } = usePrinter();

  // 🧾 بيانات وهمية للمعاينة والاختبار
  const dummyReceiptData: ReceiptData = {
    orderId: '12345',
    items: [
      { name: 'قميص رجالي', quantity: 2, price: 1500, total: 3000 },
      { name: 'بنطلون جينز', quantity: 1, price: 2500, total: 2500 },
      { name: 'حذاء رياضي', quantity: 1, price: 4500, total: 4500 },
    ],
    subtotal: 10000,
    discount: 10,
    discountAmount: 1000,
    tax: 0,
    total: 9000,
    customerName: 'أحمد محمد',
    employeeName: 'الموظف المثالي',
    paymentMethod: 'نقدي',
    amountPaid: 10000,
    remainingAmount: 1000,
  };

  // 🔄 تحديث المعاينة عند تغيير الإعدادات
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // إعدادات POS المُزامنة
  const posSettings: POSSettings = rawSettings ? {
    ...rawSettings,
    receipt_template: rawSettings.receipt_template ?? 'apple',
    item_display_style: rawSettings.item_display_style ?? 'compact',
  } : DEFAULT_PRINTER_SETTINGS as any;

  // إعدادات الطابعة المحلية
  const localPrinter = printerSettings;

  useEffect(() => {
    const generatePreview = () => {
      // دمج الإعدادات المحلية مع إعدادات المتجر
      const currentSettings = {
        ...DEFAULT_PRINTER_SETTINGS,
        ...localPrinter,
        ...posSettings,
        // إجبار بعض الإعدادات للمعاينة
        printer_type: localPrinter.printer_type,
        receipt_template: localPrinter.receipt_template,
      };

      const html = unifiedPrintService.generateReceiptHtml(dummyReceiptData, currentSettings as any);
      setPreviewHtml(html);
    };

    generatePreview();
  }, [localPrinter, posSettings]);

  // دالة اختبار الطباعة
  const handleTestPrint = async () => {
    setTestPrintStatus('printing');
    try {
      const currentSettings = {
        ...DEFAULT_PRINTER_SETTINGS,
        ...localPrinter,
        ...posSettings,
        silent_print: true
      };

      const result = await unifiedPrintService.printReceipt(dummyReceiptData, currentSettings as any);

      if (result.success) {
        setTestPrintStatus('success');
        setTimeout(() => setTestPrintStatus('idle'), 3000);
      } else {
        setTestPrintStatus('error');
        setTimeout(() => setTestPrintStatus('idle'), 5000);
      }
    } catch {
      setTestPrintStatus('error');
      setTimeout(() => setTestPrintStatus('idle'), 5000);
    }
  };

  // دالة اختبار فتح درج النقود
  const handleTestCashDrawer = async () => {
    await openCashDrawer();
  };

  // حساب العرض بالبكسل للمعاينة - مرن أكثر
  const getPreviewWidth = () => {
    switch (localPrinter.paper_width) {
      case 48: return '180px';
      case 58: return '220px';
      case 80: return '300px';
      default: return '220px';
    }
  };

  if (!rawSettings || printerLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* رأس الصفحة مع الإجراءات الأساسية */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">إعدادات الطباعة</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                {deviceId.slice(0, 8)}...
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs text-zinc-500">
                {isElectron ? 'نسخة سطح المكتب' : 'نسخة المتصفح'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => resetPrinterSettings()}
            disabled={isSaving}
            className="flex-1 md:flex-none border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة تعيين
          </Button>
          <Button
            onClick={() => savePrinterSettings()}
            disabled={isSaving}
            className="flex-1 md:flex-none bg-zinc-900 hover:bg-black text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* العمود الأيمن: الإعدادات */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-12 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-6">
              <TabsTrigger value="printer" className="flex-1 h-full rounded-lg data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 font-medium transition-all">
                <Printer className="h-4 w-4 ml-2" />
                الطابعة
              </TabsTrigger>
              <TabsTrigger value="template" className="flex-1 h-full rounded-lg data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 font-medium transition-all">
                <Palette className="h-4 w-4 ml-2" />
                التصميم
              </TabsTrigger>
              <TabsTrigger value="paper" className="flex-1 h-full rounded-lg data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 font-medium transition-all">
                <Layout className="h-4 w-4 ml-2" />
                الورق
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1 h-full rounded-lg data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 font-medium transition-all">
                <Settings className="h-4 w-4 ml-2" />
                خيارات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="printer" className="space-y-6 mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-500" />
                    نوع واتصال الطابعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {printerTypeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updatePrinterSetting('printer_type', option.value as any)}
                        className={cn(
                          "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 text-center group",
                          localPrinter.printer_type === option.value
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                            : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        {localPrinter.printer_type === option.value && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-100 dark:fill-blue-900" />
                          </div>
                        )}
                        <Badge variant="secondary" className="mb-3 w-10 h-10 rounded-full flex items-center justify-center p-0">
                          {option.value === 'thermal' ? <Printer className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </Badge>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{option.label}</span>
                        <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                      </button>
                    ))}
                  </div>

                  {isElectron ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">الطابعة الافتراضية</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedPrinter || 'default'}
                          onValueChange={(value) => {
                            const printerValue = value === 'default' ? '' : value;
                            setSelectedPrinter(printerValue);
                            updatePrinterSetting('printer_name', printerValue);
                          }}
                        >
                          <SelectTrigger className="w-full text-right h-11">
                            <SelectValue placeholder="اختر الطابعة..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">الطابعة الافتراضية للنظام</SelectItem>
                            {printers.map((printer) => (
                              <SelectItem key={printer.name} value={printer.name}>
                                {printer.displayName}
                                {printer.isDefault && ' (افتراضية)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={fetchPrinters}
                          className="h-11 w-11 shrink-0"
                          title="تحديث القائمة"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 flex items-start gap-4">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-900 dark:text-amber-400 text-sm">اختيار الطابعة غير متاح</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                          في نسخة المتصفح، سيتم استخدام نافذة طباعة المتصفح الافتراضية. للتحكم الكامل واختيار الطابعة، يرجى استخدام تطبيق سطح المكتب.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    سلوك الطباعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">الطباعة الصامتة</Label>
                      <p className="text-xs text-zinc-500">طباعة مباشرة دون إظهار نافذة تأكيد النظام</p>
                    </div>
                    <Switch
                      checked={localPrinter.silent_print}
                      onCheckedChange={(checked) => updatePrinterSetting('silent_print', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">طباعة تلقائية</Label>
                      <p className="text-xs text-zinc-500">طباعة الوصل تلقائياً بمجرد إتمام عملية البيع</p>
                    </div>
                    <Switch
                      checked={localPrinter.print_on_order}
                      onCheckedChange={(checked) => updatePrinterSetting('print_on_order', checked)}
                    />
                  </div>

                  {localPrinter.printer_type === 'thermal' && (
                    <>
                      <div className="flex items-center justify-between py-4">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">فتح درج النقود</Label>
                          <p className="text-xs text-zinc-500">إرسال إشارة لفتح الدرج بعد الطباعة</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isElectron && (
                            <Button variant="ghost" size="sm" onClick={handleTestCashDrawer} className="h-7 text-xs px-2">
                              تجربة
                            </Button>
                          )}
                          <Switch
                            checked={localPrinter.open_cash_drawer}
                            onCheckedChange={(checked) => updatePrinterSetting('open_cash_drawer', checked)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-4">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">قص الورق تلقائياً</Label>
                          <p className="text-xs text-zinc-500">تفعيل خيار Auto-Cut في نهاية الوصل</p>
                        </div>
                        <Switch
                          checked={localPrinter.auto_cut}
                          onCheckedChange={(checked) => updatePrinterSetting('auto_cut', checked)}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="template" className="space-y-6 mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {receiptTemplateOptions.map(option => {
                  const Icon = TEMPLATE_ICONS[option.value as keyof typeof TEMPLATE_ICONS] || FileText;
                  return (
                    <button
                      key={option.value}
                      onClick={() => updatePrinterSetting('receipt_template', option.value as any)}
                      className={cn(
                        "relative flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200 text-center group bg-white dark:bg-zinc-900 hover:shadow-md",
                        localPrinter.receipt_template === option.value
                          ? "border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-full mb-3 transition-colors",
                        localPrinter.receipt_template === option.value
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{option.label}</span>
                      <span className="text-xs text-zinc-500 mt-1 max-w-[120px]">{option.description}</span>
                    </button>
                  );
                })}
              </div>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    بيانات الوصل
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-zinc-100 dark:divide-zinc-800">
                    <div className="p-4 space-y-4">
                      {[
                        { key: 'show_store_logo', label: 'شعار المتجر', icon: MapPin },
                        { key: 'show_store_info', label: 'معلومات المتجر', icon: Info },
                        { key: 'show_customer_info', label: 'معلومات العميل', icon: User },
                        { key: 'show_employee_name', label: 'اسم الموظف', icon: User },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                              <item.icon className="h-4 w-4 text-zinc-500" />
                            </div>
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <Switch
                            checked={posSettings[item.key as keyof POSSettings] as boolean}
                            onCheckedChange={(checked) => updateSetting(item.key as keyof POSSettings, checked as any)}
                            className="scale-90"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-4 space-y-4">
                      {[
                        { key: 'show_date_time', label: 'التاريخ والوقت', icon: Clock },
                        { key: 'show_qr_code', label: 'رمز QR', icon: QrCode },
                        { key: 'show_tracking_code', label: 'رقم التتبع', icon: Type },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                              <item.icon className="h-4 w-4 text-zinc-500" />
                            </div>
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <Switch
                            checked={posSettings[item.key as keyof POSSettings] as boolean}
                            onCheckedChange={(checked) => updateSetting(item.key as keyof POSSettings, checked as any)}
                            className="scale-90"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Layout className="h-4 w-4 text-purple-500" />
                    نمط عرض العناصر
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-3">
                    {itemDisplayOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updatePrinterSetting('item_display_style', option.value as any)}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border transition-all h-full",
                          localPrinter.item_display_style === option.value
                            ? "border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                        )}
                      >
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="text-xs opacity-70 mt-1">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="paper" className="space-y-6 mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Maximize className="h-4 w-4 text-orange-500" />
                    حجم الورق
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-3">
                    {paperWidthOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updatePrinterSetting('paper_width', option.value)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                          localPrinter.paper_width === option.value
                            ? "border-orange-500 bg-orange-50/50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                        )}
                      >
                        <span className="text-lg font-bold font-mono">{option.value}mm</span>
                        <span className="text-xs opacity-70 mt-1">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">حجم الخط ({localPrinter.font_size}px)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[localPrinter.font_size]}
                      onValueChange={(value) => updatePrinterSetting('font_size', value[0])}
                      max={16}
                      min={8}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 font-medium">
                      <span>صغير (8px)</span>
                      <span>كبير (16px)</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">تباعد الأسطر ({localPrinter.line_spacing})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[localPrinter.line_spacing]}
                      onValueChange={(value) => updatePrinterSetting('line_spacing', value[0])}
                      max={2.0}
                      min={1.0}
                      step={0.1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 font-medium">
                      <span>مضغوط (1.0)</span>
                      <span>مريح (2.0)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Minimize className="h-4 w-4 text-zinc-500" />
                    هوامش الصفحة (مم)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'margin_top', label: 'أعلى', icon: '↑' },
                      { key: 'margin_bottom', label: 'أسفل', icon: '↓' },
                      { key: 'margin_left', label: 'يسار', icon: '←' },
                      { key: 'margin_right', label: 'يمين', icon: '→' },
                    ].map(item => (
                      <div key={item.key} className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-500">{item.label}</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-sans pointer-events-none">
                            {item.icon}
                          </div>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            value={localPrinter[item.key as keyof typeof localPrinter] as number}
                            onChange={(e) => updatePrinterSetting(item.key as keyof typeof localPrinter, parseInt(e.target.value) || 0 as any)}
                            className="pl-8 text-center font-mono h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4 text-zinc-500" />
                    خيارات إضافية
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">عدد النسخ</Label>
                      <p className="text-xs text-zinc-500">عدد مرات تكرار طباعة الوصل للطلب الواحد</p>
                    </div>
                    <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                      {printCopiesOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updatePrinterSetting('print_copies', option.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            localPrinter.print_copies === option.value
                              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                          )}
                        >
                          {option.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">كثافة الطباعة</Label>
                      <p className="text-xs text-zinc-500">درجة وضوح الحبر على الورق الحراري</p>
                    </div>
                    <Select
                      value={localPrinter.print_density}
                      onValueChange={(val) => updatePrinterSetting('print_density', val as any)}
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {printDensityOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">جرس التنبيه</Label>
                      <p className="text-xs text-zinc-500">تشغيل صوت Beep عند الانتهاء من الطباعة</p>
                    </div>
                    <Switch
                      checked={localPrinter.beep_after_print}
                      onCheckedChange={(checked) => updatePrinterSetting('beep_after_print', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {posSettings.receipt_template === 'custom' && (
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Type className="h-4 w-4 text-purple-500" />
                      تخصيص CSS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <textarea
                      className="w-full h-40 p-4 font-mono text-sm resize-none border-0 focus:ring-0 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300"
                      placeholder=".receipt-container { background: #fff; ... }"
                      value={posSettings.custom_css || ''}
                      onChange={(e) => updateSetting('custom_css', e.target.value)}
                      dir="ltr"
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* العمود الأيسر: المعاينة */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <Card className="border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden bg-zinc-900 text-zinc-100 dark:bg-black dark:border-zinc-800">
              <CardHeader className="border-b border-zinc-800 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-emerald-400" />
                    معاينة حية
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] h-5 border-zinc-700 text-zinc-400 bg-zinc-800/50 px-2">
                    {localPrinter.paper_width}mm
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-zinc-800/50 flex flex-col items-center justify-center min-h-[400px] relative">
                {/* إطار محاكاة */}
                <div className="w-full flex justify-center py-8 px-4 overflow-y-auto max-h-[600px] scrollbar-hide">
                  <div
                    ref={receiptPreviewRef}
                    className="bg-white text-black shadow-2xl transition-all duration-300 origin-top shadow-black/50"
                    style={{
                      width: getPreviewWidth(),
                      minHeight: '200px',
                      padding: '10px',
                      transform: 'scale(0.9)', // تصغير بسيط ليناسب الشاشة
                      marginBottom: '20px'
                    }}
                  >

                    <div
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      className="receipt-preview-content"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-3">
                <Button
                  onClick={handleTestPrint}
                  disabled={isPrinting || testPrintStatus === 'printing'}
                  className={cn(
                    "w-full font-medium transition-all shadow-lg active:scale-95",
                    testPrintStatus === 'success' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                      testPrintStatus === 'error' ? "bg-red-600 hover:bg-red-700 text-white" :
                        "bg-white text-black hover:bg-zinc-200"
                  )}
                >
                  {testPrintStatus === 'printing' ? (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      جاري الطباعة...
                    </>
                  ) : testPrintStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                      تم بنجاح
                    </>
                  ) : testPrintStatus === 'error' ? (
                    <>
                      <XCircle className="h-4 w-4 ml-2" />
                      فشل، حاول مرة أخرى
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة تجريبية
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingSettings;
