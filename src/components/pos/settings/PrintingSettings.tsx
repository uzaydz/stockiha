import React, { useState, useRef } from 'react';
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
  Bell,
  BellOff,
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
  XCircle
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
import { PrinterSelector } from '@/components/print/PrinterSelector';
import type { LocalPrinterSettings } from '@/api/localPrinterSettingsService';

interface PrintingSettingsProps {
  settings: POSSettings | null;
  updateSetting: <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => void;
}

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
    printTest,
    openCashDrawer,
    isElectron,
    isPrinting
  } = usePrinter();

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

  // إعدادات POS المُزامنة (معلومات المتجر، نصوص الوصل، إلخ)
  const posSettings: POSSettings = {
    ...rawSettings,
    receipt_template: rawSettings.receipt_template ?? 'apple',
    item_display_style: rawSettings.item_display_style ?? 'compact',
  };

  // إعدادات الطابعة المحلية (من الـ hook)
  const localPrinter = printerSettings;

  // دالة اختبار الطباعة
  const handleTestPrint = async () => {
    setTestPrintStatus('printing');
    try {
      const result = await printTest();
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

  // حساب العرض بالبكسل للمعاينة
  const getPreviewWidth = () => {
    switch (localPrinter.paper_width) {
      case 48: return 144;
      case 58: return 174;
      case 80: return 240;
      default: return 174;
    }
  };

  // حفظ إعدادات الطابعة المحلية
  const handleSavePrinterSettings = async () => {
    await savePrinterSettings();
  };

  // إعادة تعيين إعدادات الطابعة المحلية
  const handleResetPrinterSettings = async () => {
    await resetPrinterSettings();
  };

  return (
    <div className="space-y-6">
      {/* Device Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Laptop className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">إعدادات هذا الجهاز</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">معرف الجهاز: {deviceId.slice(0, 20)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPrinterSettings}
              disabled={isSaving}
              className="border-blue-200 dark:border-blue-700"
            >
              <RotateCcw className="h-4 w-4 ml-1" />
              إعادة تعيين
            </Button>
            <Button
              size="sm"
              onClick={handleSavePrinterSettings}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 ml-1" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">نوع الطابعة</div>
          <div className="text-sm font-semibold mt-1 flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-500" />
            {localPrinter.printer_type === 'thermal' ? 'حرارية' : 'عادية'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">عرض الورق</div>
          <div className="text-sm font-semibold mt-1 flex items-center gap-2">
            <Layout className="h-4 w-4 text-emerald-500" />
            {localPrinter.paper_width} مم
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">القالب</div>
          <div className="text-sm font-semibold mt-1 flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-500" />
            {receiptTemplateOptions.find(t => t.value === localPrinter.receipt_template)?.label || 'Apple'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">الطباعة</div>
          <div className="text-sm font-semibold mt-1 flex items-center gap-2">
            {localPrinter.silent_print ? (
              <>
                <VolumeX className="h-4 w-4 text-amber-500" />
                صامتة
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-zinc-500" />
                عادية
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <TabsTrigger value="printer" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <Printer className="h-4 w-4 ml-2" />
            الطابعة
          </TabsTrigger>
          <TabsTrigger value="paper" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <FileText className="h-4 w-4 ml-2" />
            الورق
          </TabsTrigger>
          <TabsTrigger value="template" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <Palette className="h-4 w-4 ml-2" />
            القالب
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <Zap className="h-4 w-4 ml-2" />
            متقدم
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: إعدادات الطابعة (محلية) ====== */}
        <TabsContent value="printer" className="mt-6 space-y-6">
          {/* نوع الطابعة */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Printer className="h-5 w-5 text-blue-500" />
                نوع الطابعة
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
              <CardDescription>اختر نوع الطابعة المتصلة بهذا الجهاز</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {printerTypeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePrinterSetting('printer_type', option.value as any)}
                    className={cn(
                      "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
                      localPrinter.printer_type === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    {localPrinter.printer_type === option.value && (
                      <div className="absolute top-2 left-2">
                        <Check className="h-4 w-4 text-blue-500" />
                      </div>
                    )}
                    <span className="text-2xl mb-2">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                  </button>
                ))}
              </div>

              {/* اختيار الطابعة */}
              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-500" />
                    اختيار الطابعة
                  </Label>
                  {isElectron && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchPrinters}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 ml-1" />
                      تحديث القائمة
                    </Button>
                  )}
                </div>

                {isElectron ? (
                  <Select
                    value={selectedPrinter || ''}
                    onValueChange={(value) => {
                      setSelectedPrinter(value);
                      updatePrinterSetting('printer_name', value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر الطابعة..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الطابعة الافتراضية</SelectItem>
                      {printers.map((printer) => (
                        <SelectItem key={printer.name} value={printer.name}>
                          {printer.displayName}
                          {printer.isDefault && ' (افتراضية)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">اختيار الطابعة متاح فقط في تطبيق سطح المكتب</p>
                    </div>
                  </div>
                )}

                {printers.length === 0 && isElectron && (
                  <p className="text-xs text-zinc-500">
                    لم يتم العثور على طابعات. تأكد من توصيل الطابعة واضغط على "تحديث القائمة"
                  </p>
                )}

                {printers.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    تم العثور على {printers.length} طابعة متصلة
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* إعدادات الطباعة التلقائية */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-amber-500" />
                الطباعة التلقائية
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
              <CardDescription>تحكم في سلوك الطباعة عند إتمام الطلب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* الطباعة الصامتة */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {localPrinter.silent_print ? <VolumeX className="h-4 w-4 text-amber-500" /> : <Volume2 className="h-4 w-4" />}
                    طباعة صامتة
                  </Label>
                  <p className="text-xs text-zinc-500">
                    الطباعة مباشرة بدون نافذة تأكيد
                  </p>
                </div>
                <Switch
                  checked={localPrinter.silent_print}
                  onCheckedChange={(checked) => updatePrinterSetting('silent_print', checked)}
                />
              </div>

              {/* طباعة تلقائية عند إتمام الطلب */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    طباعة عند إتمام الطلب
                  </Label>
                  <p className="text-xs text-zinc-500">
                    طباعة الوصل تلقائياً عند إتمام كل طلب
                  </p>
                </div>
                <Switch
                  checked={localPrinter.print_on_order}
                  onCheckedChange={(checked) => updatePrinterSetting('print_on_order', checked)}
                />
              </div>

              {/* عدد النسخ */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  عدد النسخ
                </Label>
                <div className="flex gap-2">
                  {printCopiesOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updatePrinterSetting('print_copies', option.value)}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-lg border transition-all text-sm",
                        localPrinter.print_copies === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إعدادات إضافية للطابعة الحرارية */}
          {localPrinter.printer_type === 'thermal' && (
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5 text-emerald-500" />
                  إعدادات الطابعة الحرارية
                  <Badge variant="outline" className="text-xs">محلي</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* فتح درج النقود */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      فتح درج النقود
                    </Label>
                    <p className="text-xs text-zinc-500">
                      فتح درج النقود تلقائياً بعد الطباعة
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isElectron && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestCashDrawer}
                        className="text-xs"
                      >
                        اختبار
                      </Button>
                    )}
                    <Switch
                      checked={localPrinter.open_cash_drawer}
                      onCheckedChange={(checked) => updatePrinterSetting('open_cash_drawer', checked)}
                    />
                  </div>
                </div>

                {/* القطع التلقائي */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      القطع التلقائي
                    </Label>
                    <p className="text-xs text-zinc-500">
                      قطع الورق تلقائياً بعد انتهاء الطباعة
                    </p>
                  </div>
                  <Switch
                    checked={localPrinter.auto_cut}
                    onCheckedChange={(checked) => updatePrinterSetting('auto_cut', checked)}
                  />
                </div>

                {/* صوت بعد الطباعة */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {localPrinter.beep_after_print ? <Bell className="h-4 w-4 text-amber-500" /> : <BellOff className="h-4 w-4" />}
                      صوت تنبيه
                    </Label>
                    <p className="text-xs text-zinc-500">
                      صوت تنبيه بعد إتمام الطباعة
                    </p>
                  </div>
                  <Switch
                    checked={localPrinter.beep_after_print}
                    onCheckedChange={(checked) => updatePrinterSetting('beep_after_print', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====== TAB 2: إعدادات الورق (محلية) ====== */}
        <TabsContent value="paper" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* إعدادات الورق */}
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layout className="h-5 w-5 text-blue-500" />
                  أبعاد الورق
                  <Badge variant="outline" className="text-xs">محلي</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* عرض الورق */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">عرض الورق</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {paperWidthOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updatePrinterSetting('paper_width', option.value)}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                          localPrinter.paper_width === option.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        <span className="font-semibold">{option.label}</span>
                        <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* حجم الخط */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">حجم الخط</Label>
                    <Badge variant="outline" className="font-mono">{localPrinter.font_size}px</Badge>
                  </div>
                  <Slider
                    value={[localPrinter.font_size]}
                    onValueChange={(value) => updatePrinterSetting('font_size', value[0])}
                    max={16}
                    min={8}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>صغير</span>
                    <span>كبير</span>
                  </div>
                </div>

                {/* تباعد الأسطر */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">تباعد الأسطر</Label>
                    <Badge variant="outline" className="font-mono">{localPrinter.line_spacing.toFixed(1)}</Badge>
                  </div>
                  <Slider
                    value={[localPrinter.line_spacing]}
                    onValueChange={(value) => updatePrinterSetting('line_spacing', value[0])}
                    max={2.0}
                    min={1.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>ضيق</span>
                    <span>واسع</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معاينة */}
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-5 w-5 text-emerald-500" />
                  معاينة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    ref={receiptPreviewRef}
                    className="bg-white border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg shadow-inner"
                    style={{
                      width: getPreviewWidth(),
                      minHeight: 200,
                      padding: '12px 8px',
                      fontSize: `${localPrinter.font_size}px`,
                      lineHeight: localPrinter.line_spacing
                    }}
                  >
                    <div className="text-center border-b border-zinc-200 pb-2 mb-2">
                      <p className="font-bold text-base">{posSettings.store_name}</p>
                      {posSettings.store_address && (
                        <p className="text-xs text-zinc-500">{posSettings.store_address}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>منتج تجريبي</span>
                        <span className="font-mono">1,500 دج</span>
                      </div>
                      <div className="flex justify-between">
                        <span>منتج آخر</span>
                        <span className="font-mono">850 دج</span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 mt-3 pt-2">
                      <div className="flex justify-between font-bold">
                        <span>المجموع</span>
                        <span className="font-mono">2,350 دج</span>
                      </div>
                    </div>

                    <div className="text-center mt-4 pt-2 border-t border-dashed border-zinc-200">
                      <p className="text-xs text-zinc-500">{posSettings.receipt_footer_text}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-zinc-500">
                    معاينة تقريبية • {localPrinter.paper_width} مم × {localPrinter.font_size}px
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* كثافة الطباعة */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-purple-500" />
                جودة الطباعة
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {printDensityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePrinterSetting('print_density', option.value as any)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                      localPrinter.print_density === option.value
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full mb-2",
                      option.value === 'light' && "bg-zinc-200",
                      option.value === 'normal' && "bg-zinc-400",
                      option.value === 'dark' && "bg-zinc-800"
                    )} />
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 3: قالب الوصل (مختلط: محلي + مُزامن) ====== */}
        <TabsContent value="template" className="mt-6 space-y-6">
          {/* اختيار القالب - محلي */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5 text-purple-500" />
                قالب الوصل
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
              <CardDescription>اختر التصميم المناسب لهذا الجهاز</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {receiptTemplateOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePrinterSetting('receipt_template', option.value as any)}
                    className={cn(
                      "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                      localPrinter.receipt_template === option.value
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    {localPrinter.receipt_template === option.value && (
                      <div className="absolute top-2 left-2">
                        <Check className="h-4 w-4 text-purple-500" />
                      </div>
                    )}
                    <span className="text-2xl mb-2">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-zinc-500 mt-1 text-center">{option.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* نمط عرض العناصر - محلي */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layout className="h-5 w-5 text-blue-500" />
                نمط عرض العناصر
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {itemDisplayOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePrinterSetting('item_display_style', option.value as any)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                      localPrinter.item_display_style === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* العناصر المرئية - مُزامنة (تظهر على كل الأجهزة) */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-5 w-5 text-amber-500" />
                العناصر المرئية
                <Badge variant="secondary" className="text-xs">مُزامن</Badge>
              </CardTitle>
              <CardDescription>هذه الإعدادات تُزامن على كل الأجهزة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'show_store_logo', label: 'شعار المتجر', icon: '🏪' },
                  { key: 'show_store_info', label: 'معلومات المتجر', icon: '📍' },
                  { key: 'show_customer_info', label: 'معلومات العميل', icon: '👤' },
                  { key: 'show_employee_name', label: 'اسم الموظف', icon: '👨‍💼' },
                  { key: 'show_date_time', label: 'التاريخ والوقت', icon: '🕐' },
                  { key: 'show_qr_code', label: 'رمز QR', icon: '📱' },
                  { key: 'show_tracking_code', label: 'رقم التتبع', icon: '🔢' },
                ].map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <Label className="text-sm font-medium">{item.label}</Label>
                    </div>
                    <Switch
                      checked={posSettings[item.key as keyof POSSettings] as boolean}
                      onCheckedChange={(checked) => updateSetting(item.key as keyof POSSettings, checked as any)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 4: إعدادات متقدمة (مختلط) ====== */}
        <TabsContent value="advanced" className="mt-6 space-y-6">
          {/* هوامش الطباعة - محلية */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layout className="h-5 w-5 text-blue-500" />
                هوامش الطباعة (مم)
                <Badge variant="outline" className="text-xs">محلي</Badge>
              </CardTitle>
              <CardDescription>ضبط المسافات حول محتوى الوصل لهذا الجهاز</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'margin_top', label: 'أعلى' },
                  { key: 'margin_bottom', label: 'أسفل' },
                  { key: 'margin_left', label: 'يسار' },
                  { key: 'margin_right', label: 'يمين' },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <Label className="text-sm">{item.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={localPrinter[item.key as keyof typeof localPrinter] as number}
                        onChange={(e) => updatePrinterSetting(item.key as keyof typeof localPrinter, parseInt(e.target.value) || 0 as any)}
                        className="text-center"
                      />
                      <span className="text-xs text-zinc-500">مم</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* إعدادات الأمان - مُزامنة */}
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-red-500" />
                إعدادات الأمان
                <Badge variant="secondary" className="text-xs">مُزامن</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">السماح بتعديل الأسعار</Label>
                  <p className="text-xs text-zinc-500">
                    السماح للموظفين بتعديل أسعار المنتجات أثناء البيع
                  </p>
                </div>
                <Switch
                  checked={posSettings.allow_price_edit}
                  onCheckedChange={(checked) => updateSetting('allow_price_edit', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">موافقة المدير</Label>
                  <p className="text-xs text-zinc-500">
                    مطالبة بموافقة المدير على العمليات الحساسة
                  </p>
                </div>
                <Switch
                  checked={posSettings.require_manager_approval}
                  onCheckedChange={(checked) => updateSetting('require_manager_approval', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* CSS مخصص - مُزامن */}
          {posSettings.receipt_template === 'custom' && (
            <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5 text-purple-500" />
                  CSS مخصص
                  <Badge variant="secondary" className="text-xs">مُزامن</Badge>
                </CardTitle>
                <CardDescription>أضف أنماطك الخاصة للوصل</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-sm resize-none"
                  placeholder=".receipt { ... }"
                  value={posSettings.custom_css || ''}
                  onChange={(e) => updateSetting('custom_css', e.target.value)}
                  dir="ltr"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* اختبار الطباعة */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                اختبار الطباعة
                {isElectron && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Electron
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-zinc-400">
                {isElectron
                  ? 'اختبر الطباعة المباشرة على الطابعة المختارة'
                  : 'الطباعة المباشرة متاحة فقط في تطبيق سطح المكتب'
                }
              </p>
            </div>

            <Button
              onClick={handleTestPrint}
              size="lg"
              disabled={isPrinting || testPrintStatus === 'printing'}
              className={cn(
                "min-w-[160px]",
                testPrintStatus === 'success' && "bg-emerald-500 hover:bg-emerald-600",
                testPrintStatus === 'error' && "bg-red-500 hover:bg-red-600",
                testPrintStatus === 'idle' && "bg-white text-zinc-900 hover:bg-zinc-100",
                testPrintStatus === 'printing' && "bg-blue-500"
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
                  تمت الطباعة!
                </>
              ) : testPrintStatus === 'error' ? (
                <>
                  <XCircle className="h-4 w-4 ml-2" />
                  فشلت الطباعة
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة تجريبية
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">الطابعة:</span>
                <span className="mr-2 text-white">{selectedPrinter || localPrinter.printer_name || 'الافتراضية'}</span>
              </div>
              <div>
                <span className="text-zinc-400">الورق:</span>
                <span className="mr-2 text-white">{localPrinter.paper_width} مم</span>
              </div>
              <div>
                <span className="text-zinc-400">النسخ:</span>
                <span className="mr-2 text-white">{localPrinter.print_copies}</span>
              </div>
              <div>
                <span className="text-zinc-400">الوضع:</span>
                <span className="mr-2 text-white">{localPrinter.silent_print ? 'صامت' : 'عادي'}</span>
              </div>
            </div>
          </div>

          {/* معلومات إضافية للتطوير */}
          {printers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <p className="text-xs text-zinc-500">
                الطابعات المتاحة: {printers.map(p => p.displayName).join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintingSettings;
