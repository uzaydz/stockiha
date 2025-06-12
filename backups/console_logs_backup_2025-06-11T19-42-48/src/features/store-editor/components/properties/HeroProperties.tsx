import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  Plus, 
  Trash2, 
  Image, 
  Type, 
  Palette, 
  Shield, 
  Truck, 
  Gem, 
  Clock, 
  Award, 
  HeartHandshake, 
  CheckCircle,
  Eye,
  EyeOff,
  Link,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Copy,
  RotateCcw
} from 'lucide-react'
import { ElementConfig } from '../../types/editor.types'
import { buttonStyles, outlineButtonStyles } from '../elements/HeroElement'
import { HeroTemplateSelector } from './HeroTemplateSelector'

interface HeroPropertiesProps {
  element: ElementConfig
  onUpdate: (updates: Partial<ElementConfig>) => void
}

// الأيقونات المتاحة لشارات الثقة
const trustIconOptions = [
  { value: 'truck', label: 'توصيل سريع', icon: Truck, color: 'text-blue-500' },
  { value: 'shield', label: 'حماية آمنة', icon: Shield, color: 'text-green-500' },
  { value: 'gem', label: 'جودة عالية', icon: Gem, color: 'text-purple-500' },
  { value: 'clock', label: 'خدمة سريعة', icon: Clock, color: 'text-orange-500' },
  { value: 'award', label: 'جائزة الأفضل', icon: Award, color: 'text-yellow-500' },
  { value: 'heart', label: 'رعاية عملاء', icon: HeartHandshake, color: 'text-pink-500' },
  { value: 'check', label: 'مؤكد', icon: CheckCircle, color: 'text-teal-500' },
]

// أنماط الأزرار مع الأوصاف
const buttonStyleOptions = [
  { value: 'primary', label: 'أساسي', preview: 'bg-primary text-primary-foreground' },
  { value: 'secondary', label: 'ثانوي', preview: 'bg-secondary text-secondary-foreground' },
  { value: 'teal', label: 'تيل', preview: 'bg-teal-600 text-white' },
  { value: 'blue', label: 'أزرق', preview: 'bg-blue-600 text-white' },
  { value: 'purple', label: 'بنفسجي', preview: 'bg-purple-600 text-white' },
  { value: 'amber', label: 'كهرماني', preview: 'bg-amber-600 text-white' },
  { value: 'emerald', label: 'زمردي', preview: 'bg-emerald-600 text-white' },
  { value: 'rose', label: 'وردي', preview: 'bg-rose-600 text-white' },
  { value: 'indigo', label: 'نيلي', preview: 'bg-indigo-600 text-white' },
  { value: 'neutral', label: 'محايد', preview: 'bg-neutral-700 text-white' },
]

export const HeroProperties: React.FC<HeroPropertiesProps> = ({ element, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('template')
  const [previewMode, setPreviewMode] = useState(false)
  const settings = element.properties.storeSettings as any

  // دالة التحديث المحلية
  const updateSettings = (newSettings: any) => {
    onUpdate({
      properties: {
        ...element.properties,
        storeSettings: {
          ...settings,
          ...newSettings,
        },
      },
    })
  }

  // دالة إعادة تعيين الإعدادات للافتراضية
  const resetToDefaults = () => {
    updateSettings({
      title: 'أحدث المنتجات',
      description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
      imageUrl: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop',
      primaryButton: { text: 'تصفح الكل', link: '/products' },
      secondaryButton: { text: 'العروض الخاصة', link: '/offers' },
      primaryButtonStyle: 'primary',
      secondaryButtonStyle: 'primary',
      trustBadges: [
        { icon: 'truck', text: 'توصيل سريع' },
        { icon: 'shield', text: 'دفع آمن' },
        { icon: 'gem', text: 'جودة عالية' },
      ],
    })
  }

  // دالة نسخ الإعدادات
  const copySettings = () => {
    navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
  }

  // دالة إضافة شارة ثقة جديدة
  const addTrustBadge = () => {
    const currentBadges = settings?.trustBadges || []
    updateSettings({
      trustBadges: [
        ...currentBadges,
        { icon: 'check', text: 'ميزة جديدة' },
      ],
    })
  }

  // دالة حذف شارة ثقة
  const removeTrustBadge = (index: number) => {
    const currentBadges = settings?.trustBadges || []
    updateSettings({
      trustBadges: currentBadges.filter((_: any, i: number) => i !== index),
    })
  }

  // دالة تحديث شارة ثقة
  const updateTrustBadge = (index: number, field: string, value: string) => {
    const currentBadges = settings?.trustBadges || []
    const updatedBadges = [...currentBadges]
    updatedBadges[index] = {
      ...updatedBadges[index],
      [field]: value,
    }
    updateSettings({
      trustBadges: updatedBadges,
    })
  }

  return (
    <div className="w-full space-y-4">
      {/* رأس اللوحة */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1 bg-primary/10 rounded">
                <Image className="h-4 w-4 text-primary" />
              </div>
              البانر الأساسي
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setPreviewMode(!previewMode)}
                size="sm"
                variant="outline"
                className="h-7 px-2"
              >
                {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                onClick={copySettings}
                size="sm"
                variant="outline"
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                onClick={resetToDefaults}
                size="sm"
                variant="outline"
                className="h-7 px-2"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* معلومات سريعة */}
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              <span>متجاوب</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              <span>{Object.keys(settings || {}).length} إعداد</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>{(settings?.trustBadges || []).length} شارة ثقة</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* علامات التبويب المحسنة */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-6 pt-6">
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="template" className="flex items-center gap-1 text-xs">
                <Palette className="h-3 w-3" />
                القالب
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
                <Type className="h-3 w-3" />
                المحتوى
              </TabsTrigger>
              <TabsTrigger value="buttons" className="flex items-center gap-1 text-xs">
                <Link className="h-3 w-3" />
                الأزرار
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-1 text-xs">
                <Image className="h-3 w-3" />
                الوسائط
              </TabsTrigger>
              <TabsTrigger value="trust" className="flex items-center gap-1 text-xs">
                <Shield className="h-3 w-3" />
                شارات الثقة
              </TabsTrigger>
            </TabsList>
          </div>

          {/* تبويب القالب */}
          <TabsContent value="template" className="p-6 space-y-4 mt-0">
            <HeroTemplateSelector
              currentTemplate={settings?.template || 'classic'}
              onTemplateChange={(template) => updateSettings({ template })}
            />
          </TabsContent>

          {/* تبويب المحتوى */}
          <TabsContent value="content" className="p-6 space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                  العنوان الرئيسي
                  <Badge variant="secondary" className="text-xs">مطلوب</Badge>
                </Label>
                <Input
                  id="title"
                  value={settings?.title || ''}
                  onChange={(e) => updateSettings({ title: e.target.value })}
                  placeholder="أحدث المنتجات"
                  className="font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  العنوان الذي سيظهر بأكبر خط في البانر
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">الوصف التفصيلي</Label>
                <Textarea
                  id="description"
                  value={settings?.description || ''}
                  onChange={(e) => updateSettings({ description: e.target.value })}
                  placeholder="تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية..."
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>وصف مختصر وجذاب للعملاء</span>
                  <span>{(settings?.description || '').length}/200</span>
                </div>
              </div>

              {/* معاينة المحتوى */}
              {previewMode && (
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">{settings?.title || 'أحدث المنتجات'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {settings?.description || 'تسوق أحدث منتجاتنا المختارة بعناية...'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* تبويب الأزرار */}
          <TabsContent value="buttons" className="p-6 space-y-6 mt-0">
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={["primary", "secondary"]} className="w-full">
                {/* الزر الأساسي */}
                <AccordionItem value="primary">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">زر أساسي</Badge>
                      <span>{settings?.primaryButton?.text || 'غير محدد'}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="primaryButtonText" className="text-sm">نص الزر</Label>
                        <Input
                          id="primaryButtonText"
                          value={settings?.primaryButton?.text || ''}
                          onChange={(e) => updateSettings({
                            primaryButton: {
                              ...settings?.primaryButton,
                              text: e.target.value,
                            },
                          })}
                          placeholder="تصفح الكل"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="primaryButtonLink" className="text-sm">الرابط</Label>
                        <Input
                          id="primaryButtonLink"
                          value={settings?.primaryButton?.link || ''}
                          onChange={(e) => updateSettings({
                            primaryButton: {
                              ...settings?.primaryButton,
                              link: e.target.value,
                            },
                          })}
                          placeholder="/products"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="primaryButtonStyle" className="text-sm">نمط الزر</Label>
                        <Select
                          value={settings?.primaryButtonStyle || 'primary'}
                          onValueChange={(value) => updateSettings({ primaryButtonStyle: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {buttonStyleOptions.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded ${style.preview}`}></div>
                                  {style.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* معاينة الزر */}
                      {settings?.primaryButton?.text && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground">معاينة:</Label>
                          <div className="mt-1">
                            <Button size="sm" className={buttonStyles[settings?.primaryButtonStyle || 'primary']}>
                              {settings.primaryButton.text}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* الزر الثانوي */}
                <AccordionItem value="secondary">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">زر ثانوي</Badge>
                      <span>{settings?.secondaryButton?.text || 'غير محدد'}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="secondaryButtonText" className="text-sm">نص الزر</Label>
                        <Input
                          id="secondaryButtonText"
                          value={settings?.secondaryButton?.text || ''}
                          onChange={(e) => updateSettings({
                            secondaryButton: {
                              ...settings?.secondaryButton,
                              text: e.target.value,
                            },
                          })}
                          placeholder="العروض الخاصة"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="secondaryButtonLink" className="text-sm">الرابط</Label>
                        <Input
                          id="secondaryButtonLink"
                          value={settings?.secondaryButton?.link || ''}
                          onChange={(e) => updateSettings({
                            secondaryButton: {
                              ...settings?.secondaryButton,
                              link: e.target.value,
                            },
                          })}
                          placeholder="/offers"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="secondaryButtonStyle" className="text-sm">نمط الزر</Label>
                        <Select
                          value={settings?.secondaryButtonStyle || 'primary'}
                          onValueChange={(value) => updateSettings({ secondaryButtonStyle: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {buttonStyleOptions.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded border ${style.value === 'primary' ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}`}></div>
                                  {style.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* معاينة الزر */}
                      {settings?.secondaryButton?.text && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Label className="text-xs text-muted-foreground">معاينة:</Label>
                          <div className="mt-1">
                            <Button size="sm" variant="outline" className={outlineButtonStyles[settings?.secondaryButtonStyle || 'primary']}>
                              {settings.secondaryButton.text}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* تبويب الوسائط */}
          <TabsContent value="media" className="p-6 space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium">رابط الصورة</Label>
                <Input
                  id="imageUrl"
                  value={settings?.imageUrl || ''}
                  onChange={(e) => updateSettings({ imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  رابط مباشر لصورة البانر (يفضل أن تكون عالية الجودة)
                </p>
              </div>

              {/* معاينة الصورة */}
              {settings?.imageUrl && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={settings.imageUrl}
                        alt="معاينة البانر"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Ctext x='200' y='150' font-family='Arial' font-size='16' fill='%2394a3b8' text-anchor='middle'%3Eخطأ في تحميل الصورة%3C/text%3E%3C/svg%3E"
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Badge variant="secondary" className="text-xs">معاينة الصورة</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* نصائح التحسين */}
              <Card className="bg-blue-50/50 border-blue-200/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-600" />
                    نصائح لأفضل النتائج
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• استخدم صور عالية الجودة (1920x1080 أو أكثر)</li>
                    <li>• تأكد من أن الصورة متناسقة مع ألوان الموقع</li>
                    <li>• تجنب الصور المزدحمة بالتفاصيل</li>
                    <li>• استخدم صيغ WebP أو JPEG للأداء الأفضل</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* تبويب شارات الثقة */}
          <TabsContent value="trust" className="p-6 space-y-4 mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">شارات الثقة</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    عناصر لبناء الثقة مع العملاء
                  </p>
                </div>
                <Button
                  onClick={addTrustBadge}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  إضافة شارة
                </Button>
              </div>

              <div className="space-y-3">
                {(settings?.trustBadges || []).map((badge: any, index: number) => {
                  const iconOption = trustIconOptions.find(opt => opt.value === badge.icon)
                  const IconComponent = iconOption?.icon || CheckCircle
                  
                  return (
                    <Card key={index} className="border-muted hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${iconOption?.color || 'text-gray-500'}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">الأيقونة</Label>
                                <Select
                                  value={badge.icon || 'check'}
                                  onValueChange={(value) => updateTrustBadge(index, 'icon', value)}
                                >
                                  <SelectTrigger className="h-8 mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {trustIconOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <option.icon className={`h-3 w-3 ${option.color}`} />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">النص</Label>
                                <Input
                                  value={badge.text || ''}
                                  onChange={(e) => updateTrustBadge(index, 'text', e.target.value)}
                                  placeholder="نص الشارة"
                                  className="h-8 mt-1"
                                />
                              </div>
                            </div>

                            {/* معاينة الشارة */}
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                              <IconComponent className={`h-3 w-3 ${iconOption?.color || 'text-gray-500'}`} />
                              <span>{badge.text || 'نص الشارة'}</span>
                            </div>
                          </div>

                          <Button
                            onClick={() => removeTrustBadge(index)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {(!settings?.trustBadges || settings.trustBadges.length === 0) && (
                  <Card className="border-dashed border-muted-foreground/25">
                    <CardContent className="p-8">
                      <div className="text-center text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">لا توجد شارات ثقة</p>
                        <p className="text-xs mt-1">اضغط "إضافة شارة" لإضافة شارة جديدة</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* إحصائيات سريعة */}
              {settings?.trustBadges && settings.trustBadges.length > 0 && (
                <Card className="bg-green-50/50 border-green-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700">إجمالي شارات الثقة:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {settings.trustBadges.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
} 