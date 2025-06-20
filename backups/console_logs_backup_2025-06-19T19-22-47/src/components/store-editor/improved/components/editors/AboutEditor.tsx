import React, { useState } from 'react'
import { Info, Settings2, BarChart3, Star, Plus, Trash, Image as ImageIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import ImageUploader from '@/components/ui/ImageUploader'

import { PropertySection } from '../PropertySection'

interface AboutEditorProps {
  settings: any
  onUpdate: (key: string, value: any) => void
}

export const AboutEditor: React.FC<AboutEditorProps> = ({
  settings,
  onUpdate
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content', 'storeInfo', 'features'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  // تحديث معلومات المتجر
  const updateStoreInfo = (key: string, value: any) => {
    const currentStoreInfo = settings.storeInfo || {}
    const updatedStoreInfo = {
      ...currentStoreInfo,
      [key]: value
    }
    onUpdate('storeInfo', updatedStoreInfo)
  }

  // إدارة المميزات
  const addFeature = () => {
    const currentFeatures = settings.features || []
    onUpdate('features', [...currentFeatures, 'ميزة جديدة'])
  }

  const updateFeature = (index: number, value: string) => {
    const currentFeatures = settings.features || []
    const updatedFeatures = [...currentFeatures]
    updatedFeatures[index] = value
    onUpdate('features', updatedFeatures)
  }

  const removeFeature = (index: number) => {
    const currentFeatures = settings.features || []
    const updatedFeatures = currentFeatures.filter((_: any, i: number) => i !== index)
    onUpdate('features', updatedFeatures)
  }

  return (
    <div className="space-y-3">
      {/* قسم المحتوى الرئيسي */}
      <PropertySection
        title="المحتوى الرئيسي"
        icon={<Info className="w-4 h-4" />}
        expanded={expandedSections.has('content')}
        onToggle={() => toggleSection('content')}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">العنوان الرئيسي</Label>
            <Input
              id="title"
              value={settings.title || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="عن متجرنا"
              className="text-sm h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="subtitle" className="text-sm font-medium">العنوان الفرعي</Label>
            <Input
              id="subtitle"
              value={settings.subtitle || ''}
              onChange={(e) => onUpdate('subtitle', e.target.value)}
              placeholder="متجر إلكترونيات وتقنية متميز"
              className="text-sm h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">الوصف</Label>
            <Textarea
              id="description"
              value={settings.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="وصف مفصل عن المتجر وقصته..."
              className="text-sm resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              يمكنك كتابة فقرات متعددة لوصف قصة المتجر وأهدافه
            </p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              صورة القسم
            </Label>
            <ImageUploader
              imageUrl={settings.image || ''}
              onImageUploaded={(url) => onUpdate('image', url)}
              folder="about-images"
              maxSizeInMB={5}
              label="صورة قسم عن المتجر"
              aspectRatio="16:9"
            />
            <p className="text-xs text-muted-foreground">
              يُفضل استخدام صورة عالية الجودة بنسبة عرض إلى ارتفاع 16:9 وحجم لا يقل عن 1200×675 بكسل.
            </p>
          </div>
        </div>
      </PropertySection>

      {/* قسم معلومات المتجر */}
      <PropertySection
        title="معلومات المتجر"
        icon={<BarChart3 className="w-4 h-4" />}
        expanded={expandedSections.has('storeInfo')}
        onToggle={() => toggleSection('storeInfo')}
      >
        <div className="space-y-3">
          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">الإحصائيات والأرقام</h3>
              <p className="text-xs text-muted-foreground mb-4">
                هذه الأرقام ستُعرض للزوار لزيادة الثقة في المتجر
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">سنة التأسيس</Label>
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={settings.storeInfo?.yearFounded || new Date().getFullYear()}
                    onChange={(e) => updateStoreInfo('yearFounded', parseInt(e.target.value))}
                    className="text-sm h-9"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">عدد العملاء</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.storeInfo?.customersCount || 0}
                    onChange={(e) => updateStoreInfo('customersCount', parseInt(e.target.value))}
                    className="text-sm h-9"
                  />
                  <p className="text-xs text-muted-foreground">سيظهر: "عميل سعيد +"</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">عدد المنتجات</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.storeInfo?.productsCount || 0}
                    onChange={(e) => updateStoreInfo('productsCount', parseInt(e.target.value))}
                    className="text-sm h-9"
                  />
                  <p className="text-xs text-muted-foreground">سيظهر: "منتج متنوع +"</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">عدد الفروع</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.storeInfo?.branches || 0}
                    onChange={(e) => updateStoreInfo('branches', parseInt(e.target.value))}
                    className="text-sm h-9"
                  />
                  <p className="text-xs text-muted-foreground">سيظهر: "فروع في الجزائر"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PropertySection>

      {/* قسم المميزات */}
      <PropertySection
        title="مميزات المتجر"
        icon={<Star className="w-4 h-4" />}
        expanded={expandedSections.has('features')}
        onToggle={() => toggleSection('features')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              المميزات ({(settings.features || []).length})
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addFeature}
              className="flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              إضافة ميزة
            </Button>
          </div>

          {(settings.features || []).length > 0 ? (
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {(settings.features || []).map((feature: string, index: number) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          placeholder="اكتب الميزة هنا..."
                          className="flex-1 text-sm h-9"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">لا توجد مميزات</p>
                <p className="text-xs text-muted-foreground">أضف مميزات لعرضها للعملاء</p>
              </CardContent>
            </Card>
          )}

          {(settings.features || []).length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>نصيحة:</strong> اكتب مميزات واضحة ومحددة تساعد العملاء على فهم قيمة المتجر
              </p>
            </div>
          )}
        </div>
      </PropertySection>
    </div>
  )
}

export default AboutEditor
