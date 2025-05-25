import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Settings, 
  Zap, 
  Scissors,
  Monitor,
  TestTube
} from 'lucide-react';
import { POSSettings } from '@/types/posSettings';
import { 
  paperWidthOptions,
  printDensityOptions
} from '@/types/posSettings';

interface PrintingSettingsProps {
  settings: POSSettings | null;
  updateSetting: <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => void;
}

const PrintingSettings: React.FC<PrintingSettingsProps> = ({ settings, updateSetting }) => {
  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  // دالة اختبار الطباعة
  const handleTestPrint = () => {
    // هنا يمكن إضافة منطق اختبار الطباعة
    console.log('اختبار طباعة بالإعدادات:', settings);
    // يمكن فتح نافذة طباعة أو إرسال أمر للطابعة
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* إعدادات الورق */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            إعدادات الورق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* عرض الورق */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">عرض الورق</Label>
            <Select
              value={settings.paper_width.toString()}
              onValueChange={(value) => updateSetting('paper_width', parseInt(value))}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر عرض الورق" />
              </SelectTrigger>
              <SelectContent>
                {paperWidthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="text-right">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* حجم الخط */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">حجم الخط</Label>
              <span className="text-sm text-muted-foreground">{settings.font_size}px</span>
            </div>
            <Slider
              value={[settings.font_size]}
              onValueChange={(value) => updateSetting('font_size', value[0])}
              max={16}
              min={8}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>صغير (8px)</span>
              <span>كبير (16px)</span>
            </div>
          </div>

          {/* تباعد الأسطر */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">تباعد الأسطر</Label>
              <span className="text-sm text-muted-foreground">{settings.line_spacing}</span>
            </div>
            <Slider
              value={[settings.line_spacing]}
              onValueChange={(value) => updateSetting('line_spacing', value[0])}
              max={2.0}
              min={1.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ضيق (1.0)</span>
              <span>واسع (2.0)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات جودة الطباعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            جودة الطباعة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* كثافة الطباعة */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">كثافة الطباعة</Label>
            <Select
              value={settings.print_density}
              onValueChange={(value) => updateSetting('print_density', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر كثافة الطباعة" />
              </SelectTrigger>
              <SelectContent>
                {printDensityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="text-right">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* القطع التلقائي */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                القطع التلقائي
              </Label>
              <p className="text-xs text-muted-foreground">
                قطع الورق تلقائياً بعد انتهاء الطباعة
              </p>
            </div>
            <Switch
              checked={settings.auto_cut}
              onCheckedChange={(checked) => updateSetting('auto_cut', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات متقدمة للطباعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            إعدادات متقدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* السماح بتعديل الأسعار */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">السماح بتعديل الأسعار</Label>
              <p className="text-xs text-muted-foreground">
                السماح للموظفين بتعديل أسعار المنتجات
              </p>
            </div>
            <Switch
              checked={settings.allow_price_edit}
              onCheckedChange={(checked) => updateSetting('allow_price_edit', checked)}
            />
          </div>

          {/* مطالبة بموافقة المدير */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">مطالبة بموافقة المدير</Label>
              <p className="text-xs text-muted-foreground">
                مطالبة بموافقة المدير على العمليات الحساسة
              </p>
            </div>
            <Switch
              checked={settings.require_manager_approval}
              onCheckedChange={(checked) => updateSetting('require_manager_approval', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* معاينة حجم الطباعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            معاينة حجم الطباعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div 
                className="border-2 border-dashed border-border bg-muted/30 flex items-center justify-center"
                style={{
                  width: `${settings.paper_width * 2}px`,
                  height: '200px',
                  fontSize: `${settings.font_size}px`,
                  lineHeight: settings.line_spacing
                }}
              >
                <div className="text-center p-4">
                  <p className="font-bold">{settings.store_name}</p>
                  <p className="text-sm mt-2">عرض الورق: {settings.paper_width}مم</p>
                  <p className="text-sm">حجم الخط: {settings.font_size}px</p>
                  <p className="text-sm">تباعد: {settings.line_spacing}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                معاينة تقريبية لحجم الطباعة (مقياس 1:2)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* اختبار الطباعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TestTube className="h-5 w-5" />
            اختبار الطباعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اختبر إعدادات الطباعة الحالية قبل حفظها لضمان عملها بشكل صحيح.
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleTestPrint}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                طباعة تجريبية
              </Button>
              
              {/* معلومات تقنية */}
              <div className="flex-1 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>العرض: {settings.paper_width}مم</div>
                  <div>الخط: {settings.font_size}px</div>
                  <div>التباعد: {settings.line_spacing}</div>
                  <div>الكثافة: {
                    printDensityOptions.find(opt => opt.value === settings.print_density)?.label
                  }</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ملاحظات مهمة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
              <p>تأكد من أن الطابعة متصلة ومتاحة قبل اختبار الطباعة</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
              <p>إعدادات الورق يجب أن تتطابق مع نوع الطابعة المستخدمة</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
              <p>بعض الطابعات قد لا تدعم القطع التلقائي</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
              <p>حجم الخط الأصغر يوفر مساحة لكن قد يكون صعب القراءة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintingSettings; 