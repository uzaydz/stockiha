import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Palette, 
  Type, 
  Eye, 
  EyeOff, 
  AlignCenter, 
  AlignLeft, 
  AlignRight,
  Table,
  List,
  DollarSign
} from 'lucide-react';
import { POSSettings } from '@/types/posSettings';
import { 
  receiptTemplateOptions,
  textAlignmentOptions,
  itemDisplayOptions,
  pricePositionOptions,
  currencyPositionOptions
} from '@/types/posSettings';

interface ReceiptAppearanceSettingsProps {
  settings: POSSettings | null;
  updateSetting: <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => void;
}

const ReceiptAppearanceSettings: React.FC<ReceiptAppearanceSettingsProps> = ({ 
  settings, 
  updateSetting 
}) => {
  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* نصوص الوصل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" />
            نصوص الوصل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* رسالة الترحيب */}
          <div className="space-y-2">
            <Label htmlFor="welcome_message" className="text-sm font-medium">
              رسالة الترحيب
            </Label>
            <Input
              id="welcome_message"
              value={settings.welcome_message}
              onChange={(e) => updateSetting('welcome_message', e.target.value)}
              placeholder="أهلاً وسهلاً بكم"
              className="text-right"
            />
          </div>

          {/* نص الرأسية */}
          <div className="space-y-2">
            <Label htmlFor="receipt_header_text" className="text-sm font-medium">
              نص الرأسية
            </Label>
            <Textarea
              id="receipt_header_text"
              value={settings.receipt_header_text}
              onChange={(e) => updateSetting('receipt_header_text', e.target.value)}
              placeholder="شكراً لتعاملكم معنا"
              className="text-right min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* نص التذييل */}
          <div className="space-y-2">
            <Label htmlFor="receipt_footer_text" className="text-sm font-medium">
              نص التذييل
            </Label>
            <Textarea
              id="receipt_footer_text"
              value={settings.receipt_footer_text}
              onChange={(e) => updateSetting('receipt_footer_text', e.target.value)}
              placeholder="نتطلع لخدمتكم مرة أخرى"
              className="text-right min-h-[60px] resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* العناصر المرئية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            العناصر المرئية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* إظهار شعار المتجر */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار شعار المتجر</Label>
              <p className="text-xs text-muted-foreground">
                عرض شعار المتجر في أعلى الوصل
              </p>
            </div>
            <Switch
              checked={settings.show_store_logo}
              onCheckedChange={(checked) => updateSetting('show_store_logo', checked)}
            />
          </div>

          {/* إظهار معلومات المتجر */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار معلومات المتجر</Label>
              <p className="text-xs text-muted-foreground">
                عرض اسم المتجر ورقم الهاتف والعنوان
              </p>
            </div>
            <Switch
              checked={settings.show_store_info}
              onCheckedChange={(checked) => updateSetting('show_store_info', checked)}
            />
          </div>

          {/* إظهار التاريخ والوقت */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار التاريخ والوقت</Label>
              <p className="text-xs text-muted-foreground">
                عرض تاريخ ووقت إنشاء الوصل
              </p>
            </div>
            <Switch
              checked={settings.show_date_time}
              onCheckedChange={(checked) => updateSetting('show_date_time', checked)}
            />
          </div>

          {/* إظهار معلومات العميل */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار معلومات العميل</Label>
              <p className="text-xs text-muted-foreground">
                عرض اسم العميل إذا كان متوفراً
              </p>
            </div>
            <Switch
              checked={settings.show_customer_info}
              onCheckedChange={(checked) => updateSetting('show_customer_info', checked)}
            />
          </div>

          {/* إظهار اسم الموظف */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار اسم الموظف</Label>
              <p className="text-xs text-muted-foreground">
                عرض اسم الموظف الذي أنشأ الطلب
              </p>
            </div>
            <Switch
              checked={settings.show_employee_name}
              onCheckedChange={(checked) => updateSetting('show_employee_name', checked)}
            />
          </div>

          {/* إظهار رمز QR */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار رمز QR</Label>
              <p className="text-xs text-muted-foreground">
                عرض رمز QR لتتبع الطلب
              </p>
            </div>
            <Switch
              checked={settings.show_qr_code}
              onCheckedChange={(checked) => updateSetting('show_qr_code', checked)}
            />
          </div>

          {/* إظهار كود التتبع */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إظهار كود التتبع</Label>
              <p className="text-xs text-muted-foreground">
                عرض كود التتبع النصي للطلب
              </p>
            </div>
            <Switch
              checked={settings.show_tracking_code}
              onCheckedChange={(checked) => updateSetting('show_tracking_code', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* الألوان والمظهر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            الألوان والمظهر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* قالب الوصل */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">قالب الوصل</Label>
            <Select
              value={settings.receipt_template}
              onValueChange={(value) => updateSetting('receipt_template', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر قالب الوصل" />
              </SelectTrigger>
              <SelectContent>
                {receiptTemplateOptions.map(option => (
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

          {/* الألوان */}
          <div className="grid grid-cols-2 gap-4">
            {/* اللون الأساسي */}
            <div className="space-y-2">
              <Label htmlFor="primary_color" className="text-sm font-medium">
                اللون الأساسي
              </Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  placeholder="#0099ff"
                  className="flex-1 text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* اللون الثانوي */}
            <div className="space-y-2">
              <Label htmlFor="secondary_color" className="text-sm font-medium">
                اللون الثانوي
              </Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  placeholder="#6c757d"
                  className="flex-1 text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تخطيط الوصل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlignCenter className="h-5 w-5" />
            تخطيط الوصل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* محاذاة الرأسية */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">محاذاة الرأسية</Label>
            <Select
              value={settings.header_style}
              onValueChange={(value) => updateSetting('header_style', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر محاذاة الرأسية" />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* محاذاة التذييل */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">محاذاة التذييل</Label>
            <Select
              value={settings.footer_style}
              onValueChange={(value) => updateSetting('footer_style', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر محاذاة التذييل" />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* عرض العناصر */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">عرض العناصر</Label>
            <Select
              value={settings.item_display_style}
              onValueChange={(value) => updateSetting('item_display_style', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر طريقة عرض العناصر" />
              </SelectTrigger>
              <SelectContent>
                {itemDisplayOptions.map(option => (
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

          {/* موضع السعر */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">موضع السعر</Label>
            <Select
              value={settings.price_position}
              onValueChange={(value) => updateSetting('price_position', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر موضع السعر" />
              </SelectTrigger>
              <SelectContent>
                {pricePositionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات العملة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            إعدادات العملة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* رمز العملة */}
          <div className="space-y-2">
            <Label htmlFor="currency_symbol" className="text-sm font-medium">
              رمز العملة
            </Label>
            <Input
              id="currency_symbol"
              value={settings.currency_symbol}
              onChange={(e) => updateSetting('currency_symbol', e.target.value)}
              placeholder="دج"
              className="text-right"
            />
          </div>

          {/* موضع رمز العملة */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">موضع رمز العملة</Label>
            <Select
              value={settings.currency_position}
              onValueChange={(value) => updateSetting('currency_position', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="اختر موضع رمز العملة" />
              </SelectTrigger>
              <SelectContent>
                {currencyPositionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* تسمية الضريبة */}
          <div className="space-y-2">
            <Label htmlFor="tax_label" className="text-sm font-medium">
              تسمية الضريبة
            </Label>
            <Input
              id="tax_label"
              value={settings.tax_label}
              onChange={(e) => updateSetting('tax_label', e.target.value)}
              placeholder="الضريبة"
              className="text-right"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptAppearanceSettings;
