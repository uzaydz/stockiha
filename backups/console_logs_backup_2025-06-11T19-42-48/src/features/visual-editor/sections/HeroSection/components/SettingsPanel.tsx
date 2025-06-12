import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Settings, X, Truck, ShieldCheck, Gem, Zap, Award, Heart, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageEditor from '../../../controls/ImageEditor';
import ColorPicker from '../../../controls/ColorPicker';
import { CommonProps, TrustBadge } from '../types';
import { buttonStyles, outlineButtonStyles } from '../styles';
import { useTheme } from '@/context/ThemeContext';
import {
  BgStyleType,
  ButtonStyleType,
  ImageStyleType,
  LayoutStyleType,
  TextAlignmentType
} from '../types';
import { cn } from '@/lib/utils';

interface SettingsPanelProps extends CommonProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  section,
  updateProps,
  showSettings,
  setShowSettings
}) => {
  // استخدام هوك السمة للتحكم في وضع الإضاءة/الظلام
  const { theme, setTheme } = useTheme();
  
  // دالة للتبديل بين وضعي الإضاءة والظلام
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // الخصائص المستخرجة من القسم
  const {
    imageUrl = '',
    showSecondaryButton = true,
    primaryButtonStyle = 'primary',
    secondaryButtonStyle = 'primary',
    trustBadges = [],
    bgStyle = 'gradient',
    overlayOpacity = 40,
    imageStyle = 'standard',
    layoutStyle = 'standard',
    textAlignment = 'start',
    highlightColor = 'primary',
    customBgColor = '',
    customBgColorLight = '',
    customBgColorDark = '',
    enableParallax = false,
    buttonRadius = 'default',
    headingStyle = 'default'
  } = section.props || {};

  // أيقونات الشارات الافتراضية
  const badgeIcons = [
    { icon: <Truck className="h-4 w-4" />, name: 'شحن' },
    { icon: <ShieldCheck className="h-4 w-4" />, name: 'ضمان' },
    { icon: <Gem className="h-4 w-4" />, name: 'جودة' },
    { icon: <Zap className="h-4 w-4" />, name: 'سرعة' },
    { icon: <Award className="h-4 w-4" />, name: 'جائزة' },
    { icon: <Heart className="h-4 w-4" />, name: 'موثوق' },
  ];

  // إضافة شارة ثقة جديدة
  const addTrustBadge = (iconIndex: number) => {
    const newBadges = [...(trustBadges || [])];
    newBadges.push({
      icon: badgeIcons[iconIndex].name.toLowerCase(),
      text: badgeIcons[iconIndex].name
    });
    updateProps({ trustBadges: newBadges });
  };

  // حذف شارة ثقة
  const removeTrustBadge = (index: number) => {
    const newBadges = [...(trustBadges || [])];
    newBadges.splice(index, 1);
    updateProps({ trustBadges: newBadges });
  };

  // تحديث نص شارة الثقة
  const updateBadgeText = (index: number, text: string) => {
    const newBadges = [...(trustBadges || [])];
    newBadges[index] = { ...newBadges[index], text };
    updateProps({ trustBadges: newBadges });
  };

  return (
    <>
      <div className="absolute top-4 right-4 z-20">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          إعدادات القسم
        </Button>
      </div>
      
      {showSettings && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 dark:bg-black/70 z-[100] flex items-start justify-center overflow-auto py-8"
          onClick={(e) => {
            // إغلاق اللوحة فقط عند النقر على الخلفية، وليس على اللوحة نفسها
            if (e.target === e.currentTarget) {
              setShowSettings(false);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-[28rem] bg-background dark:bg-card rounded-xl shadow-lg dark:shadow-2xl border border-border dark:border-border/50 max-h-[90vh] overflow-hidden relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس لوحة الإعدادات */}
            <div className="sticky top-0 bg-muted/30 dark:bg-muted/80 border-b border-border/30 dark:border-border/50 px-6 py-4 z-[101]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-primary dark:text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground dark:text-foreground">إعدادات Hero</h3>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">تخصيص المظهر والسلوك</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* زر تبديل وضع الإضاءة/الظلام */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'تفعيل وضع الإضاءة' : 'تفعيل وضع الظلام'}
                    className="hover:bg-muted/70"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4 text-yellow-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-700" />
                    )}
                  </Button>
                  
                  {/* زر الإغلاق */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowSettings(false)}
                    className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* محتوى لوحة الإعدادات */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] bg-background dark:bg-card">
              <Tabs defaultValue="general" className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="w-full grid grid-cols-5 bg-muted/50 dark:bg-muted/30">
                    <TabsTrigger value="general">عام</TabsTrigger>
                    <TabsTrigger value="text">النص</TabsTrigger>
                    <TabsTrigger value="image">الصورة</TabsTrigger>
                    <TabsTrigger value="badges">الشارات</TabsTrigger>
                    <TabsTrigger value="appearance">المظهر</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="general" className="p-6 space-y-6">
                  {/* تخطيط القسم */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">تخطيط القسم</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['standard', 'reverse', 'centered', 'overlapping'] as LayoutStyleType[]).map((style) => (
                        <Button
                          key={style}
                          variant={layoutStyle === style ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateProps({ layoutStyle: style })}
                          className="text-xs capitalize"
                        >
                          {style === 'standard' ? 'قياسي' : 
                           style === 'reverse' ? 'معكوس' : 
                           style === 'centered' ? 'وسط' : 'متداخل'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* نمط الخلفية */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">نمط الخلفية</h4>
                    
                    {/* الأنماط الأساسية */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={bgStyle === 'transparent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProps({ bgStyle: 'transparent' })}
                        className="text-xs"
                      >
                        شفافة
                      </Button>
                      <Button
                        variant={bgStyle === 'solid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProps({ bgStyle: 'solid' })}
                        className="text-xs"
                      >
                        لون واحد
                      </Button>
                      <Button
                        variant={bgStyle === 'gradient' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProps({ bgStyle: 'gradient' })}
                        className="text-xs"
                      >
                        تدرج
                      </Button>
                      <Button
                        variant={bgStyle === 'image' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateProps({ bgStyle: 'image' })}
                        className="text-xs"
                      >
                        صورة
                      </Button>
                    </div>
                    
                    {/* الأنماط المتقدمة */}
                    <div className="mt-3">
                      <h5 className="text-xs font-medium mb-2">أنماط مقترحة</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {/* نمط النقاط */}
                        <button
                          onClick={() => updateProps({ bgStyle: 'dotted' })}
                          className={cn(
                            "h-16 rounded-md border bg-white dark:bg-black bg-[radial-gradient(rgba(0,0,0,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] transition-all",
                            bgStyle === 'dotted' ? "ring-2 ring-primary" : "hover:border-primary/50"
                          )}
                        >
                          <span className="text-xs bg-background/80 dark:bg-background/80 px-2 py-0.5 rounded">نقاط</span>
                        </button>
                        
                        {/* نمط الخطوط */}
                        <button
                          onClick={() => updateProps({ bgStyle: 'lined' })}
                          className={cn(
                            "h-16 rounded-md border bg-white dark:bg-black bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] transition-all",
                            bgStyle === 'lined' ? "ring-2 ring-primary" : "hover:border-primary/50"
                          )}
                        >
                          <span className="text-xs bg-background/80 dark:bg-background/80 px-2 py-0.5 rounded">خطوط</span>
                        </button>
                        
                        {/* نمط الأمواج */}
                        <button
                          onClick={() => updateProps({ bgStyle: 'waves' })}
                          className={cn(
                            "h-16 rounded-md border bg-white dark:bg-black transition-all",
                            bgStyle === 'waves' ? "ring-2 ring-primary" : "hover:border-primary/50"
                          )}
                        >
                          <span className="text-xs bg-background/80 dark:bg-background/80 px-2 py-0.5 rounded">أمواج</span>
                        </button>
                        
                        {/* نمط الدوائر */}
                        <button
                          onClick={() => updateProps({ bgStyle: 'circuit' })}
                          className={cn(
                            "h-16 rounded-md border bg-white dark:bg-black transition-all",
                            bgStyle === 'circuit' ? "ring-2 ring-primary" : "hover:border-primary/50"
                          )}
                        >
                          <span className="text-xs bg-background/80 dark:bg-background/80 px-2 py-0.5 rounded">دوائر</span>
                        </button>
                        
                        {/* نمط Pattern */}
                        <button
                          onClick={() => updateProps({ bgStyle: 'pattern' })}
                          className={cn(
                            "h-16 rounded-md border bg-pattern-light dark:bg-pattern-dark transition-all",
                            bgStyle === 'pattern' ? "ring-2 ring-primary" : "hover:border-primary/50"
                          )}
                        >
                          <span className="text-xs bg-background/80 dark:bg-background/80 px-2 py-0.5 rounded">نمط</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* محاذاة النص */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">محاذاة النص</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(['start', 'center', 'end'] as TextAlignmentType[]).map((align) => (
                        <Button
                          key={align}
                          variant={textAlignment === align ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateProps({ textAlignment: align })}
                          className="text-xs capitalize"
                        >
                          {align === 'start' ? 'يمين' : 
                           align === 'center' ? 'وسط' : 'يسار'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* تفعيل تأثير التوازي */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">تأثير التوازي (Parallax)</label>
                    <Button
                      size="sm"
                      variant={enableParallax ? 'default' : 'outline'}
                      onClick={() => updateProps({ enableParallax: !enableParallax })}
                      className="w-20"
                    >
                      {enableParallax ? 'مفعل' : 'معطل'}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="text" className="p-6 space-y-6">
                  {/* نمط العنوان */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">نمط العنوان</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['default', 'highlight', 'gradient', 'outlined'] as const).map((style) => (
                        <Button
                          key={style}
                          variant={headingStyle === style ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateProps({ headingStyle: style })}
                          className="text-xs capitalize"
                        >
                          {style === 'default' ? 'عادي' : 
                           style === 'highlight' ? 'تظليل' : 
                           style === 'gradient' ? 'تدرج' : 'محدد'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* لون التظليل/التدرج */}
                  {(headingStyle === 'highlight' || headingStyle === 'gradient') && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">لون {headingStyle === 'highlight' ? 'التظليل' : 'التدرج'}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(['primary', 'secondary', 'teal', 'blue', 'purple', 'amber'] as ButtonStyleType[]).map((color) => (
                          <Button
                            key={color}
                            variant={highlightColor === color ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateProps({ highlightColor: color })}
                            className={`text-xs ${color !== 'primary' && color !== 'secondary' ? `bg-${color}-100 text-${color}-800 border-${color}-200` : ''}`}
                          >
                            {color}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* إعدادات الأزرار */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">إعدادات الأزرار</h4>
                    
                    {/* نمط الزر الرئيسي */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium block">نمط الزر الرئيسي</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['primary', 'secondary', 'teal', 'blue', 'purple', 'amber'] as ButtonStyleType[]).map((style) => (
                          <Button
                            key={style}
                            size="sm"
                            variant={primaryButtonStyle === style ? 'default' : 'outline'}
                            onClick={() => updateProps({ primaryButtonStyle: style })}
                            className="text-xs capitalize"
                          >
                            {style}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* الزر الثانوي */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">إظهار الزر الثانوي</label>
                      <Button
                        size="sm"
                        variant={showSecondaryButton ? 'default' : 'outline'}
                        onClick={() => updateProps({ showSecondaryButton: !showSecondaryButton })}
                        className="w-20"
                      >
                        {showSecondaryButton ? 'مفعل' : 'معطل'}
                      </Button>
                    </div>

                    {/* نمط الزر الثانوي */}
                    {showSecondaryButton && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">نمط الزر الثانوي</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['primary', 'secondary', 'teal', 'blue', 'purple', 'amber'] as ButtonStyleType[]).map((style) => (
                            <Button
                              key={style}
                              size="sm"
                              variant={secondaryButtonStyle === style ? 'default' : 'outline'}
                              onClick={() => updateProps({ secondaryButtonStyle: style })}
                              className="text-xs capitalize"
                            >
                              {style}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* نمط تدوير الأزرار */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium block">شكل الأزرار</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['default', 'rounded', 'pill'] as const).map((style) => (
                          <Button
                            key={style}
                            size="sm"
                            variant={buttonRadius === style ? 'default' : 'outline'}
                            onClick={() => updateProps({ buttonRadius: style })}
                            className="text-xs capitalize"
                          >
                            {style === 'default' ? 'عادي' : 
                             style === 'rounded' ? 'دائري' : 'كبسولة'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="image" className="p-6 space-y-6">
                  {/* صورة Hero */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">صورة القسم الرئيسي</h4>
                    <ImageEditor
                      value={imageUrl}
                      onChange={(url) => updateProps({ imageUrl: url })}
                      onRemove={() => updateProps({ imageUrl: '' })}
                      placeholder="/placeholder.svg"
                      aspectRatio="16/9"
                    />
                  </div>
                  
                  {/* نمط عرض الصورة */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">نمط عرض الصورة</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['standard', 'floating', 'angled', 'phone', 'browser', 'laptop'] as ImageStyleType[]).map((style) => (
                        <Button
                          key={style}
                          variant={imageStyle === style ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateProps({ imageStyle: style })}
                          className="text-xs capitalize"
                        >
                          {style === 'standard' ? 'عادي' : 
                           style === 'floating' ? 'عائم' : 
                           style === 'angled' ? 'مائل' : 
                           style === 'phone' ? 'هاتف' : 
                           style === 'browser' ? 'متصفح' : 'لابتوب'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="badges" className="p-6 space-y-6">
                  {/* شارات الثقة */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">شارات الثقة</h4>
                      <div className="flex gap-1">
                        {badgeIcons.map((badge, index) => (
                          <Button
                            key={index}
                            size="icon"
                            variant="outline"
                            onClick={() => addTrustBadge(index)}
                            className="h-7 w-7"
                          >
                            {badge.icon}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* عرض الشارات الحالية */}
                    <div className="space-y-2">
                      {trustBadges?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">لا توجد شارات. أضف شارات لتعزيز الثقة.</p>
                      ) : (
                        trustBadges?.map((badge: TrustBadge, index: number) => {
                          // تحديد الأيقونة المناسبة حسب نوع الشارة
                          let BadgeIcon = Truck;
                          
                          switch(badge.icon) {
                            case 'truck':
                            case 'شحن':
                              BadgeIcon = Truck;
                              break;
                            case 'shieldcheck':
                            case 'shield':
                            case 'ضمان':
                              BadgeIcon = ShieldCheck;
                              break;
                            case 'gem':
                            case 'جودة':
                              BadgeIcon = Gem;
                              break;
                            case 'zap':
                            case 'سرعة':
                              BadgeIcon = Zap;
                              break;
                            case 'award':
                            case 'جائزة':
                              BadgeIcon = Award;
                              break;
                            case 'heart':
                            case 'موثوق':
                              BadgeIcon = Heart;
                              break;
                            default:
                              BadgeIcon = Award;
                          }
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 border border-border/30 dark:border-border/20 rounded-md bg-background dark:bg-card">
                              <div className="flex items-center gap-2">
                                <span className="h-5 w-5 text-primary/80 dark:text-primary/70 flex items-center justify-center">
                                  <BadgeIcon className="h-4 w-4" />
                                </span>
                                <input
                                  type="text"
                                  value={badge.text}
                                  onChange={(e) => updateBadgeText(index, e.target.value)}
                                  className="border-0 bg-transparent text-sm focus:ring-0 text-foreground dark:text-foreground"
                                />
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive dark:text-muted-foreground dark:hover:text-destructive"
                                onClick={() => removeTrustBadge(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="appearance" className="p-6 space-y-6">
                  {/* إعدادات المظهر */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-semibold">إعدادات المظهر</h4>
                    
                    {/* وضع الإضاءة/الظلام */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-medium">وضع الإضاءة/الظلام</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={theme === 'light' ? 'default' : 'outline'}
                          onClick={() => setTheme('light')}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Sun className="h-4 w-4 text-amber-500" />
                          وضع الإضاءة
                        </Button>
                        <Button
                          size="sm"
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          onClick={() => setTheme('dark')}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Moon className="h-4 w-4 text-blue-500" />
                          وضع الظلام
                        </Button>
                        <Button
                          size="sm"
                          variant={theme === 'system' ? 'default' : 'outline'}
                          onClick={() => setTheme('system')}
                          className="flex items-center gap-2 text-xs col-span-2"
                        >
                          <Settings className="h-4 w-4" />
                          استخدام إعدادات النظام
                        </Button>
                      </div>
                    </div>

                    {/* معلومات عن الألوان المخصصة */}
                    {bgStyle === 'solid' && (
                      <div className="space-y-3 p-4 border border-primary/20 dark:border-primary/30 rounded-lg bg-primary/5 dark:bg-primary/10">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                            <Sun className="h-3.5 w-3.5 text-primary" />
                          </span>
                          ألوان الخلفية المخصصة
                        </h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          لقد اخترت نمط خلفية <strong>لون واحد</strong>. يمكنك تخصيص لون مختلف لكل وضع من أوضاع الإضاءة والظلام.
                          <br />
                          انتقل إلى تبويب <strong>عام</strong> ثم قسم <strong>نمط الخلفية</strong> لتعديل هذه الألوان.
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">وضع الإضاءة:</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-5 w-5 rounded border"
                                style={{ backgroundColor: customBgColorLight || customBgColor || '' }}
                              />
                              <span className="text-xs truncate">
                                {customBgColorLight || customBgColor || 'غير محدد'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">وضع الظلام:</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-5 w-5 rounded border"
                                style={{ backgroundColor: customBgColorDark || customBgColor || '' }}
                              />
                              <span className="text-xs truncate">
                                {customBgColorDark || customBgColor || 'غير محدد'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* نصائح وإرشادات */}
                    <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-4 text-sm">
                      <h5 className="font-medium mb-2">نصائح لتصميم متوافق مع وضع الظلام</h5>
                      <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                        <li>استخدم ألواناً عالية التباين لتحسين القراءة في كلا الوضعين</li>
                        <li>تجنب استخدام الظلال الداكنة جداً في وضع الظلام</li>
                        <li>اختبر التصميم في كلا الوضعين قبل النشر النهائي</li>
                        <li>تأكد من أن النصوص مقروءة في كلا الوضعين</li>
                      </ul>
                    </div>
                    
                    {/* معلومات الوضع الحالي */}
                    <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/10 dark:border-primary/20">
                      <div>
                        <p className="text-sm font-medium mb-1">الوضع الحالي</p>
                        <p className="text-xs text-muted-foreground">
                          {theme === 'light' ? 'وضع الإضاءة' : 
                           theme === 'dark' ? 'وضع الظلام' : 
                           'وضع النظام' + (window.matchMedia('(prefers-color-scheme: dark)').matches ? ' (ظلام)' : ' (إضاءة)')}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-background dark:bg-background flex items-center justify-center shadow-sm">
                        {theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) ? (
                          <Sun className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Moon className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SettingsPanel; 