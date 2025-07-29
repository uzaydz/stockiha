import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { Slider } from '@/components/ui/slider';
import { 
  Check, AlertCircle, Mail, Phone, User, MapPin, FileText, Home, 
  Calendar, Clock, Briefcase, Image, Package
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// أنواع الحقول والأيقونات المرتبطة بها
const FIELD_ICONS = [
  { type: 'text', icon: <FileText className="h-4 w-4" /> },
  { type: 'email', icon: <Mail className="h-4 w-4" /> },
  { type: 'tel', icon: <Phone className="h-4 w-4" /> },
  { type: 'name', icon: <User className="h-4 w-4" /> },
  { type: 'textarea', icon: <FileText className="h-4 w-4" /> },
  { type: 'select', icon: <Check className="h-4 w-4" /> },
  { type: 'radio', icon: <Check className="h-4 w-4" /> },
  { type: 'checkbox', icon: <Check className="h-4 w-4" /> },
  { type: 'province', icon: <MapPin className="h-4 w-4" /> },
  { type: 'municipality', icon: <Home className="h-4 w-4" /> },
  { type: 'date', icon: <Calendar className="h-4 w-4" /> },
  { type: 'time', icon: <Clock className="h-4 w-4" /> },
  { type: 'file', icon: <Image className="h-4 w-4" /> },
  { type: 'product', icon: <Package className="h-4 w-4" /> }
];

// نماذج جاهزة للمظهر
const PRESET_STYLES = [
  { 
    id: 'modern', 
    name: 'عصري', 
    settings: {
      showIcons: true,
      fieldIconColor: '#6366f1',
      cardStyle: {
        shadow: 'lg',
        borderRadius: '0.75rem',
        borderWidth: '1px',
        borderColor: '#e2e8f0'
      },
      labelStyle: {
        fontSize: '0.875rem',
        fontWeight: 'medium',
        color: '#1e293b'
      },
      inputStyle: {
        height: 'default',
        borderRadius: '0.5rem',
        borderWidth: '1px'
      },
      fieldSpacing: 24,
      formLayout: 'single',
      buttonStyle: {
        variant: 'default',
        rounded: 'md',
        fullWidth: true
      }
    }
  },
  { 
    id: 'minimal', 
    name: 'بسيط', 
    settings: {
      showIcons: false,
      cardStyle: {
        shadow: 'sm',
        borderRadius: '0.25rem',
        borderWidth: '0px',
        borderColor: 'transparent'
      },
      labelStyle: {
        fontSize: '0.75rem',
        fontWeight: 'medium',
        color: '#64748b'
      },
      inputStyle: {
        height: 'sm',
        borderRadius: '0.25rem',
        borderWidth: '1px'
      },
      fieldSpacing: 16,
      formLayout: 'single',
      buttonStyle: {
        variant: 'default',
        rounded: 'sm',
        fullWidth: true
      }
    }
  },
  { 
    id: 'elegant', 
    name: 'أنيق', 
    settings: {
      showIcons: true,
      fieldIconColor: '#8b5cf6',
      cardStyle: {
        shadow: 'xl',
        borderRadius: '1rem',
        borderWidth: '0px',
        borderColor: 'transparent'
      },
      labelStyle: {
        fontSize: '0.875rem',
        fontWeight: 'bold',
        color: '#334155'
      },
      inputStyle: {
        height: 'default',
        borderRadius: '0.5rem',
        borderWidth: '2px'
      },
      fieldSpacing: 28,
      formLayout: 'single',
      buttonStyle: {
        variant: 'elegant',
        rounded: 'full',
        fullWidth: true
      }
    }
  }
];

interface FormSettingsPanelProps {
  settings: any;
  onSettingsChange: (newSettings: any) => void;
}

const FormSettingsPanel: React.FC<FormSettingsPanelProps> = ({ settings, onSettingsChange }) => {
  const { t } = useTranslation();
  
  // استخراج الإعدادات المتقدمة أو استخدام القيم الافتراضية
  const advancedSettings = settings.advancedSettings || {
    showIcons: true,
    fieldIconColor: '#6366f1',
    cardStyle: {
      shadow: 'md',
      borderRadius: '0.5rem',
      borderWidth: '1px',
      borderColor: '#e2e8f0'
    },
    labelStyle: {
      fontSize: '0.875rem',
      fontWeight: 'medium',
      color: '#1e293b'
    },
    inputStyle: {
      height: 'default',
      borderRadius: '0.5rem',
      borderWidth: '1px'
    },
    fieldSpacing: 20,
    formLayout: 'single',
    buttonStyle: {
      variant: 'default',
      rounded: 'md',
      fullWidth: true
    }
  };
  
  // تحديث الإعدادات بقيم جديدة
  const updateSettings = (path: string, value: any) => {

    // استنساخ الإعدادات الحالية
    const newAdvancedSettings = JSON.parse(JSON.stringify(advancedSettings));
    
    // تقسيم المسار إلى أجزاء (مثل cardStyle.borderRadius)
    const pathParts = path.split('.');
    
    // تحديث القيمة المطلوبة
    let current = newAdvancedSettings;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;

    // تحديث الإعدادات
    const updatedSettings = {
      ...settings,
      advancedSettings: newAdvancedSettings
    };

    onSettingsChange(updatedSettings);
  };
  
  // استخدام نموذج جاهز
  const applyPreset = (presetId: string) => {
    
    const preset = PRESET_STYLES.find(p => p.id === presetId);
    if (preset) {
      const updatedSettings = {
        ...settings,
        advancedSettings: JSON.parse(JSON.stringify(preset.settings))
      };

      onSettingsChange(updatedSettings);
    }
  };
  
  // معاينة الحقل مع الإعدادات الحالية
  const renderFieldPreview = () => {
    const { showIcons, fieldIconColor, labelStyle, inputStyle } = advancedSettings;
    
    return (
      <div className="border rounded-md p-4 mt-4">
        <div className="text-sm font-semibold mb-2">معاينة الحقل</div>
        <div className="space-y-1">
          <div 
            className="flex items-center space-x-1 space-x-reverse" 
            style={{ color: labelStyle.color }}
          >
            {showIcons && (
              <User 
                className="h-4 w-4 ml-1" 
                style={{ color: fieldIconColor }} 
              />
            )}
            <span 
              style={{ 
                fontSize: labelStyle.fontSize, 
                fontWeight: labelStyle.fontWeight === 'bold' ? '700' : 
                           labelStyle.fontWeight === 'medium' ? '500' : '400'
              }}
            >
              الاسم واللقب
            </span>
            <span className="text-red-500 mr-1">*</span>
          </div>
          <div>
            <Input 
              className="w-full"
              placeholder="أدخل الاسم واللقب" 
              style={{
                borderRadius: inputStyle.borderRadius,
                borderWidth: inputStyle.borderWidth
              }}
            />
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* الإعدادات الأساسية */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('عنوان النموذج')}</Label>
          <Input
            value={settings.title || ''}
            onChange={(e) => onSettingsChange({ ...settings, title: e.target.value })}
            placeholder={t('عنوان النموذج')}
          />
        </div>
        
        <div className="space-y-2">
          <Label>{t('نص زر الإرسال')}</Label>
          <Input
            value={settings.buttonText || ''}
            onChange={(e) => onSettingsChange({ ...settings, buttonText: e.target.value })}
            placeholder={t('إرسال الطلب')}
          />
        </div>
        
        <div className="space-y-2">
          <Label>{t('لون الخلفية')}</Label>
          <ColorPicker
            value={settings.backgroundColor || '#f9f9f9'}
            onChange={(color) => onSettingsChange({ ...settings, backgroundColor: color })}
          />
        </div>
      </div>
      
      {/* الإعدادات المتقدمة */}
      <Accordion type="single" collapsible className="mt-6">
        <AccordionItem value="advanced-settings">
          <AccordionTrigger>{t('إعدادات متقدمة')}</AccordionTrigger>
          <AccordionContent>
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="presets">{t('نماذج جاهزة')}</TabsTrigger>
                <TabsTrigger value="appearance">{t('المظهر')}</TabsTrigger>
                <TabsTrigger value="fields">{t('الحقول')}</TabsTrigger>
              </TabsList>
              
              {/* نماذج جاهزة */}
              <TabsContent value="presets" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {PRESET_STYLES.map(preset => (
                    <Card 
                      key={preset.id} 
                      className="cursor-pointer hover:border-primary transition-all"
                      onClick={() => applyPreset(preset.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="text-center font-medium mb-2">{preset.name}</div>
                        <div className="h-24 bg-muted rounded flex items-center justify-center">
                          <div 
                            className="w-full max-w-[200px] h-16 bg-white rounded shadow-sm p-2 mx-auto"
                            style={{
                              borderRadius: preset.settings.cardStyle.borderRadius,
                              boxShadow: preset.settings.cardStyle.shadow === 'xl' ? '0 20px 25px -5px rgba(0, 0, 0, 0.1)' :
                                         preset.settings.cardStyle.shadow === 'lg' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' :
                                         preset.settings.cardStyle.shadow === 'md' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' :
                                         preset.settings.cardStyle.shadow === 'sm' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                              borderWidth: preset.settings.cardStyle.borderWidth,
                              borderColor: preset.settings.cardStyle.borderColor
                            }}
                          >
                            <div className="flex items-center space-x-1 space-x-reverse">
                              {preset.settings.showIcons && (
                                <User className="h-3 w-3 ml-1" style={{ color: preset.settings.fieldIconColor }} />
                              )}
                              <div 
                                className="text-[10px]"
                                style={{ 
                                  color: preset.settings.labelStyle.color,
                                  fontWeight: preset.settings.labelStyle.fontWeight === 'bold' ? '700' : 
                                             preset.settings.labelStyle.fontWeight === 'medium' ? '500' : '400'
                                }}
                              >
                                الاسم
                              </div>
                            </div>
                            <div 
                              className="mt-1 h-4 bg-gray-100 rounded" 
                              style={{ 
                                borderRadius: preset.settings.inputStyle.borderRadius,
                                borderWidth: preset.settings.inputStyle.borderWidth,
                                borderColor: '#e2e8f0',
                                borderStyle: 'solid'
                              }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* إعدادات المظهر */}
              <TabsContent value="appearance" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('ظل البطاقة')}</Label>
                  <Select 
                    value={advancedSettings.cardStyle.shadow}
                    onValueChange={(value) => updateSettings('cardStyle.shadow', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر نوع الظل')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('بدون ظل')}</SelectItem>
                      <SelectItem value="sm">{t('خفيف')}</SelectItem>
                      <SelectItem value="md">{t('متوسط')}</SelectItem>
                      <SelectItem value="lg">{t('كبير')}</SelectItem>
                      <SelectItem value="xl">{t('كبير جدًا')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('زوايا البطاقة')}</Label>
                  <Select 
                    value={advancedSettings.cardStyle.borderRadius}
                    onValueChange={(value) => updateSettings('cardStyle.borderRadius', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر شكل الزوايا')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('بدون تدوير')}</SelectItem>
                      <SelectItem value="0.25rem">{t('صغير')}</SelectItem>
                      <SelectItem value="0.5rem">{t('متوسط')}</SelectItem>
                      <SelectItem value="0.75rem">{t('كبير')}</SelectItem>
                      <SelectItem value="1rem">{t('كبير جدًا')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('سمك حدود البطاقة')}</Label>
                  <Select 
                    value={advancedSettings.cardStyle.borderWidth}
                    onValueChange={(value) => updateSettings('cardStyle.borderWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر سمك الحدود')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0px">{t('بدون حدود')}</SelectItem>
                      <SelectItem value="1px">{t('رفيع')}</SelectItem>
                      <SelectItem value="2px">{t('متوسط')}</SelectItem>
                      <SelectItem value="4px">{t('سميك')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('لون حدود البطاقة')}</Label>
                  <ColorPicker
                    value={advancedSettings.cardStyle.borderColor}
                    onChange={(color) => updateSettings('cardStyle.borderColor', color)}
                  />
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label>{t('حجم خط العناوين')}</Label>
                  <Select 
                    value={advancedSettings.labelStyle.fontSize}
                    onValueChange={(value) => updateSettings('labelStyle.fontSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر حجم الخط')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.75rem">{t('صغير')}</SelectItem>
                      <SelectItem value="0.875rem">{t('متوسط')}</SelectItem>
                      <SelectItem value="1rem">{t('كبير')}</SelectItem>
                      <SelectItem value="1.125rem">{t('أكبر')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('وزن خط العناوين')}</Label>
                  <Select 
                    value={advancedSettings.labelStyle.fontWeight}
                    onValueChange={(value) => updateSettings('labelStyle.fontWeight', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر وزن الخط')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{t('عادي')}</SelectItem>
                      <SelectItem value="medium">{t('متوسط')}</SelectItem>
                      <SelectItem value="bold">{t('ثقيل')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('لون العناوين')}</Label>
                  <ColorPicker
                    value={advancedSettings.labelStyle.color}
                    onChange={(color) => updateSettings('labelStyle.color', color)}
                  />
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label>{t('المباعدة بين الحقول')}</Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Slider
                      value={[advancedSettings.fieldSpacing]}
                      min={8}
                      max={40}
                      step={2}
                      onValueChange={(value) => updateSettings('fieldSpacing', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{advancedSettings.fieldSpacing}px</span>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label>{t('تخطيط النموذج')}</Label>
                  <Select 
                    value={advancedSettings.formLayout}
                    onValueChange={(value) => updateSettings('formLayout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر تخطيط النموذج')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t('عمود واحد')}</SelectItem>
                      <SelectItem value="double">{t('عمودان')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              {/* إعدادات الحقول */}
              <TabsContent value="fields" className="space-y-4">
                <div className="flex items-center justify-between space-x-2 space-x-reverse">
                  <Label htmlFor="showIcons">{t('إظهار الأيقونات')}</Label>
                  <Switch
                    id="showIcons"
                    checked={advancedSettings.showIcons}
                    onCheckedChange={(checked) => updateSettings('showIcons', checked)}
                  />
                </div>
                
                {advancedSettings.showIcons && (
                  <div className="space-y-2">
                    <Label>{t('لون الأيقونات')}</Label>
                    <ColorPicker
                      value={advancedSettings.fieldIconColor}
                      onChange={(color) => updateSettings('fieldIconColor', color)}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{t('نمط حقول الإدخال')}</Label>
                  <Select 
                    value={advancedSettings.inputStyle.borderRadius}
                    onValueChange={(value) => updateSettings('inputStyle.borderRadius', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر شكل الحقول')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('مربع')}</SelectItem>
                      <SelectItem value="0.25rem">{t('زوايا خفيفة')}</SelectItem>
                      <SelectItem value="0.5rem">{t('زوايا متوسطة')}</SelectItem>
                      <SelectItem value="9999px">{t('دائري')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('سمك حدود الحقول')}</Label>
                  <Select 
                    value={advancedSettings.inputStyle.borderWidth}
                    onValueChange={(value) => updateSettings('inputStyle.borderWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر سمك الحدود')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0px">{t('بدون حدود')}</SelectItem>
                      <SelectItem value="1px">{t('رفيع')}</SelectItem>
                      <SelectItem value="2px">{t('متوسط')}</SelectItem>
                      <SelectItem value="3px">{t('سميك')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('حجم حقول الإدخال')}</Label>
                  <Select 
                    value={advancedSettings.inputStyle.height}
                    onValueChange={(value) => updateSettings('inputStyle.height', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر حجم الحقول')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">{t('صغير')}</SelectItem>
                      <SelectItem value="default">{t('متوسط')}</SelectItem>
                      <SelectItem value="lg">{t('كبير')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label>{t('شكل زر الإرسال')}</Label>
                  <Select 
                    value={advancedSettings.buttonStyle.variant}
                    onValueChange={(value) => updateSettings('buttonStyle.variant', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر شكل الزر')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t('أساسي')}</SelectItem>
                      <SelectItem value="outline">{t('مخطط')}</SelectItem>
                      <SelectItem value="elegant">{t('أنيق')}</SelectItem>
                      <SelectItem value="gradient">{t('متدرج')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('زوايا زر الإرسال')}</Label>
                  <Select 
                    value={advancedSettings.buttonStyle.rounded}
                    onValueChange={(value) => updateSettings('buttonStyle.rounded', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('اختر شكل زوايا الزر')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('بدون تدوير')}</SelectItem>
                      <SelectItem value="sm">{t('تدوير خفيف')}</SelectItem>
                      <SelectItem value="md">{t('تدوير متوسط')}</SelectItem>
                      <SelectItem value="lg">{t('تدوير كبير')}</SelectItem>
                      <SelectItem value="full">{t('دائري')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between space-x-2 space-x-reverse">
                  <Label htmlFor="fullWidthButton">{t('زر بعرض كامل')}</Label>
                  <Switch
                    id="fullWidthButton"
                    checked={advancedSettings.buttonStyle.fullWidth}
                    onCheckedChange={(checked) => updateSettings('buttonStyle.fullWidth', checked)}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            {/* معاينة الحقل */}
            {renderFieldPreview()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FormSettingsPanel;
