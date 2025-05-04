import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info } from 'lucide-react';

export interface BarcodeSettings {
  barcodeType: 'code128' | 'code39' | 'ean13' | 'qrcode';
  printFormat: 'labels' | 'sheet' | 'custom';
  paperSize: 'A4' | 'A5' | 'label50x90' | 'custom';
  barcodeSize: 'small' | 'medium' | 'large' | 'custom';
  copiesPerProduct: number;
  scaleValue: number;
  heightValue: number;
  textSize: number;
  includePrice: boolean;
  includeName: boolean;
  includeText: boolean;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  spacingX: number;
  spacingY: number;
  orientation: 'portrait' | 'landscape';
  showBorder: boolean;
  alignment: 'center' | 'start' | 'end';
  customWidth: number;
  customHeight: number;
  showSku: boolean;
  fontSize: number;
  labelTextAlign: 'center' | 'start' | 'end';
  colorScheme: 'default' | 'dark' | 'light' | 'custom';
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
}

export const DEFAULT_BARCODE_SETTINGS: BarcodeSettings = {
  barcodeType: 'code128',
  printFormat: 'sheet',
  paperSize: 'A4',
  barcodeSize: 'medium',
  copiesPerProduct: 1,
  scaleValue: 3,
  heightValue: 20,
  textSize: 10,
  includePrice: true,
  includeName: true,
  includeText: true,
  columns: 3,
  rows: 8,
  marginTop: 10,
  marginLeft: 10,
  marginRight: 10,
  marginBottom: 10,
  spacingX: 5,
  spacingY: 5,
  orientation: 'portrait',
  showBorder: true,
  alignment: 'center',
  customWidth: 0,
  customHeight: 0,
  showSku: true,
  fontSize: 10,
  labelTextAlign: 'center',
  colorScheme: 'default',
  fontFamily: 'Arial',
  fontColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#eeeeee'
};

type BarcodeSettingsProps = {
  settings: BarcodeSettings | any;
  onChange: (settings: Partial<BarcodeSettings>) => void;
  savedSettings?: { name: string; settings: any }[];
  onSaveSettings?: () => void;
  currentSavedSettingName?: string | null;
  onLoadSavedSettings?: (name: string) => void;
}

const BarcodeSettings = ({ settings, onChange }: BarcodeSettingsProps) => {
  const handleSettingChange = <K extends keyof BarcodeSettings>(
    key: K, 
    value: BarcodeSettings[K]
  ) => {
    onChange({ [key]: value } as Pick<BarcodeSettings, K>);
  };

  const getSizePreview = () => {
    if (settings.paperSize === 'A4') {
      return 'A4 (210mm × 297mm)';
    } else if (settings.paperSize === 'A5') {
      return 'A5 (148mm × 210mm)';
    } else if (settings.paperSize === 'label50x90') {
      return 'ملصق صغير (50mm × 90mm)';
    } else {
      return `مخصص (${settings.customWidth}mm × ${settings.customHeight}mm)`;
    }
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="basic">إعدادات أساسية</TabsTrigger>
        <TabsTrigger value="layout">التخطيط</TabsTrigger>
        <TabsTrigger value="advanced">إعدادات متقدمة</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="barcodeType">نوع الباركود</Label>
            <Select 
              value={settings.barcodeType} 
              onValueChange={(value) => handleSettingChange('barcodeType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الباركود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code 128 (متوافق مع معظم الماسحات)</SelectItem>
                <SelectItem value="code39">Code 39 (نص ورقم فقط)</SelectItem>
                <SelectItem value="ean13">EAN-13 (13 رقم فقط)</SelectItem>
                <SelectItem value="qrcode">QR Code (رمز الاستجابة السريعة)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="printFormat">تنسيق الطباعة</Label>
            <Select 
              value={settings.printFormat} 
              onValueChange={(value) => handleSettingChange('printFormat', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر تنسيق الطباعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labels">ملصقات منفصلة</SelectItem>
                <SelectItem value="sheet">صفحة كاملة</SelectItem>
                <SelectItem value="custom">تنسيق مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="paperSize">حجم الورق</Label>
            <Select 
              value={settings.paperSize} 
              onValueChange={(value) => handleSettingChange('paperSize', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر حجم الورق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 (210mm × 297mm)</SelectItem>
                <SelectItem value="A5">A5 (148mm × 210mm)</SelectItem>
                <SelectItem value="label50x90">ملصق (50mm × 90mm)</SelectItem>
                <SelectItem value="custom">حجم مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {settings.paperSize === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="customWidth">العرض (مم)</Label>
                <Input 
                  id="customWidth"
                  type="number" 
                  min={10} 
                  max={500}
                  value={settings.customWidth} 
                  onChange={(e) => handleSettingChange('customWidth', parseInt(e.target.value) || 0)} 
                />
              </div>
              <div>
                <Label htmlFor="customHeight">الارتفاع (مم)</Label>
                <Input 
                  id="customHeight"
                  type="number" 
                  min={10} 
                  max={500}
                  value={settings.customHeight} 
                  onChange={(e) => handleSettingChange('customHeight', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="orientation">اتجاه الطباعة</Label>
            <Select 
              value={settings.orientation} 
              onValueChange={(value) => handleSettingChange('orientation', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر اتجاه الطباعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">عمودي (Portrait)</SelectItem>
                <SelectItem value="landscape">أفقي (Landscape)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-4">
          <Label>بيانات لإظهارها مع الباركود</Label>
          <div className="flex flex-wrap gap-2">
            <Toggle 
              pressed={settings.includeName} 
              onPressedChange={(pressed) => handleSettingChange('includeName', pressed)}
              variant="outline"
            >
              اسم المنتج
            </Toggle>
            <Toggle 
              pressed={settings.includePrice} 
              onPressedChange={(pressed) => handleSettingChange('includePrice', pressed)}
              variant="outline"
            >
              السعر
            </Toggle>
            <Toggle 
              pressed={settings.includeText} 
              onPressedChange={(pressed) => handleSettingChange('includeText', pressed)}
              variant="outline"
            >
              قيمة الباركود
            </Toggle>
            <Toggle 
              pressed={settings.showSku} 
              onPressedChange={(pressed) => handleSettingChange('showSku', pressed)}
              variant="outline"
            >
              رمز المنتج (SKU)
            </Toggle>
          </div>
          
          <div className="space-y-4">
            <Label htmlFor="copiesPerProduct">عدد النسخ لكل منتج</Label>
            <div className="flex items-center gap-4">
              <Input 
                id="copiesPerProduct"
                type="number" 
                min={1} 
                max={100}
                className="w-20" 
                value={settings.copiesPerProduct} 
                onChange={(e) => handleSettingChange('copiesPerProduct', parseInt(e.target.value) || 1)} 
              />
              <Slider 
                min={1}
                max={20}
                step={1}
                value={[settings.copiesPerProduct]} 
                onValueChange={(value) => handleSettingChange('copiesPerProduct', value[0])} 
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="layout" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="barcodeSize">حجم الباركود</Label>
            <Select 
              value={settings.barcodeSize} 
              onValueChange={(value) => handleSettingChange('barcodeSize', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر حجم الباركود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">صغير</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="large">كبير</SelectItem>
                <SelectItem value="custom">حجم مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {settings.barcodeSize === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="scaleValue">مقياس الباركود</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm w-12 text-center">{settings.scaleValue.toFixed(1)}</span>
                  <Slider 
                    min={0.5}
                    max={5}
                    step={0.1}
                    value={[settings.scaleValue]} 
                    onValueChange={(value) => handleSettingChange('scaleValue', value[0])} 
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heightValue">ارتفاع الباركود</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm w-12 text-center">{settings.heightValue}</span>
                  <Slider 
                    min={20}
                    max={120}
                    step={5}
                    value={[settings.heightValue]} 
                    onValueChange={(value) => handleSettingChange('heightValue', value[0])} 
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="fontSize">حجم الخط</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm w-12 text-center">{settings.fontSize}</span>
              <Slider 
                min={8}
                max={24}
                step={1}
                value={[settings.fontSize]} 
                onValueChange={(value) => handleSettingChange('fontSize', value[0])} 
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="labelTextAlign">محاذاة النص</Label>
            <Select 
              value={settings.labelTextAlign} 
              onValueChange={(value) => handleSettingChange('labelTextAlign', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر محاذاة النص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">وسط</SelectItem>
                <SelectItem value="start">يمين</SelectItem>
                <SelectItem value="end">يسار</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="columns">عدد الأعمدة</Label>
            <div className="flex items-center gap-4">
              <Input 
                id="columns"
                type="number" 
                min={1} 
                max={10}
                className="w-20" 
                value={settings.columns} 
                onChange={(e) => handleSettingChange('columns', parseInt(e.target.value) || 1)} 
              />
              <Slider 
                min={1}
                max={6}
                step={1}
                value={[settings.columns]} 
                onValueChange={(value) => handleSettingChange('columns', value[0])} 
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="rows">عدد الصفوف</Label>
            <div className="flex items-center gap-4">
              <Input 
                id="rows"
                type="number" 
                min={1} 
                max={20}
                className="w-20" 
                value={settings.rows} 
                onChange={(e) => handleSettingChange('rows', parseInt(e.target.value) || 1)} 
              />
              <Slider 
                min={1}
                max={12}
                step={1}
                value={[settings.rows]} 
                onValueChange={(value) => handleSettingChange('rows', value[0])} 
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="marginTop">الهامش العلوي (mm)</Label>
            <Input 
              id="marginTop"
              type="number" 
              min={0} 
              max={50}
              value={settings.marginTop} 
              onChange={(e) => handleSettingChange('marginTop', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <Label htmlFor="marginLeft">الهامش الأيمن (mm)</Label>
            <Input 
              id="marginLeft"
              type="number" 
              min={0} 
              max={50}
              value={settings.marginLeft} 
              onChange={(e) => handleSettingChange('marginLeft', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <Label htmlFor="marginRight">الهامش الأيسر (mm)</Label>
            <Input 
              id="marginRight"
              type="number" 
              min={0} 
              max={50}
              value={settings.marginRight} 
              onChange={(e) => handleSettingChange('marginRight', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <Label htmlFor="marginBottom">الهامش السفلي (mm)</Label>
            <Input 
              id="marginBottom"
              type="number" 
              min={0} 
              max={50}
              value={settings.marginBottom} 
              onChange={(e) => handleSettingChange('marginBottom', parseInt(e.target.value) || 0)} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="spacingX">المسافة بين الأعمدة (mm)</Label>
            <Input 
              id="spacingX"
              type="number" 
              min={0} 
              max={50}
              value={settings.spacingX} 
              onChange={(e) => handleSettingChange('spacingX', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <Label htmlFor="spacingY">المسافة بين الصفوف (mm)</Label>
            <Input 
              id="spacingY"
              type="number" 
              min={0} 
              max={50}
              value={settings.spacingY} 
              onChange={(e) => handleSettingChange('spacingY', parseInt(e.target.value) || 0)} 
            />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="advanced" className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="showBorder">إظهار الحدود</Label>
            <Toggle 
              pressed={settings.showBorder} 
              onPressedChange={(pressed) => handleSettingChange('showBorder', pressed)}
              variant="outline"
            >
              {settings.showBorder ? 'تفعيل' : 'إيقاف'}
            </Toggle>
          </div>
          
          <div>
            <Label htmlFor="colorScheme">نظام الألوان</Label>
            <Select 
              value={settings.colorScheme} 
              onValueChange={(value) => handleSettingChange('colorScheme', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نظام الألوان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">افتراضي</SelectItem>
                <SelectItem value="dark">داكن</SelectItem>
                <SelectItem value="light">فاتح</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {settings.colorScheme === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fontColor">لون النص</Label>
                <div className="flex mt-1">
                  <Input 
                    id="fontColor"
                    type="color"
                    value={settings.fontColor} 
                    onChange={(e) => handleSettingChange('fontColor', e.target.value)} 
                    className="w-10 h-10 p-1 rounded-l-md"
                  />
                  <Input 
                    type="text" 
                    value={settings.fontColor} 
                    onChange={(e) => handleSettingChange('fontColor', e.target.value)} 
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="backgroundColor">لون الخلفية</Label>
                <div className="flex mt-1">
                  <Input 
                    id="backgroundColor"
                    type="color"
                    value={settings.backgroundColor} 
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)} 
                    className="w-10 h-10 p-1 rounded-l-md"
                  />
                  <Input 
                    type="text" 
                    value={settings.backgroundColor} 
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)} 
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="borderColor">لون الحدود</Label>
                <div className="flex mt-1">
                  <Input 
                    id="borderColor"
                    type="color"
                    value={settings.borderColor} 
                    onChange={(e) => handleSettingChange('borderColor', e.target.value)} 
                    className="w-10 h-10 p-1 rounded-l-md"
                  />
                  <Input 
                    type="text" 
                    value={settings.borderColor} 
                    onChange={(e) => handleSettingChange('borderColor', e.target.value)} 
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="fontFamily">نوع الخط</Label>
            <Select 
              value={settings.fontFamily} 
              onValueChange={(value) => handleSettingChange('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الخط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Tahoma">Tahoma</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">نصائح ومعلومات</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>اختر Code 128 للباركود العام متوافق مع معظم الماسحات</li>
                  <li>استخدم QR Code للمعلومات الأكثر تعقيدًا أو الروابط</li>
                  <li>مقاس A4 هو الأنسب للطباعة العادية</li>
                  <li>تنسيق الملصقات مناسب لطابعات الباركود المتخصصة</li>
                  <li>يمكنك حفظ هذه الإعدادات تلقائيًا للاستخدامات المستقبلية</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default BarcodeSettings; 