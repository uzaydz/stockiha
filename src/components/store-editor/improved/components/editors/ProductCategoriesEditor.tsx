import React, { useState, useEffect, useMemo } from 'react'
import { Type, Settings2, Layers, Search, Plus, X, Grid3X3, List, Loader2, AlertCircle, CheckCircle2, Eye, Filter, Image } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { PropertySection } from '../PropertySection'
import { getCategories } from '@/lib/api/categories'
import { useTenant } from '@/context/TenantContext'

// تعريف واجهة الفئة
interface Category {
  id: string
  name: string
  description?: string
  slug: string
  image_url?: string
  icon?: string
  is_active: boolean
  product_count?: number
  parent_id?: string | null
}

interface ProductCategoriesEditorProps {
  settings: any
  onUpdate: (key: string, value: any) => void
}

export const ProductCategoriesEditor: React.FC<ProductCategoriesEditorProps> = ({
  settings,
  onUpdate
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content', 'display', 'selection'])
  )
  
  // حالة الاختيار اليدوي للفئات
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [categoryPickerView, setCategoryPickerView] = useState<'grid' | 'list'>('grid')
  
  const { currentOrganization } = useTenant()
  const organizationId = currentOrganization?.id || localStorage.getItem('bazaar_organization_id')

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

  // تحميل الفئات المتاحة
  const loadAvailableCategories = async () => {
    if (!organizationId) {
      setCategoriesError('لا يوجد معرف مؤسسة متاح')
      return
    }
    
    setCategoriesLoading(true)
    setCategoriesError(null)
    
    try {
      const categories = await getCategories(organizationId)
      
      // تشخيص الصور
      if (categories && categories.length > 0) {
      }
      
      setAvailableCategories(categories?.filter(cat => cat.is_active) || [])
      
      if (!categories || categories.length === 0) {
        setCategoriesError('لا توجد فئات متاحة')
      }
    } catch (error) {
      setCategoriesError('فشل في تحميل الفئات. تأكد من الاتصال بالشبكة.')
    } finally {
      setCategoriesLoading(false)
    }
  }

  // تحميل الفئات المحددة من الإعدادات
  useEffect(() => {
    if (settings.selectedCategories && Array.isArray(settings.selectedCategories)) {
      const categoriesFromSettings = availableCategories.filter(category => 
        settings.selectedCategories.includes(category.id)
      )
      setSelectedCategories(categoriesFromSettings)
    }
  }, [settings.selectedCategories, availableCategories])

  // تحميل الفئات عند تحميل المكون
  useEffect(() => {
    if (organizationId) {
      loadAvailableCategories()
    }
  }, [organizationId])

  // تحميل الفئات عند فتح الحوار إذا لم تكن محملة
  useEffect(() => {
    if (showCategoryPicker && availableCategories.length === 0 && !categoriesLoading && organizationId) {
      loadAvailableCategories()
    }
  }, [showCategoryPicker, availableCategories.length, categoriesLoading, organizationId])

  // تحديث المعاينة فوريًا عند تغيير إعدادات العرض
  useEffect(() => {
    // تحديث إعدادات المعاينة مع بيانات الفئات الحقيقية
    const previewCategories = availableCategories.length > 0 
      ? availableCategories.slice(0, settings.displayCount || 6)
      : []
    
    const updatedSettings = {
      ...settings,
      _previewCategories: previewCategories
    }
    
    // تحديث الإعدادات في المكون الأب
    onUpdate('_previewCategories', previewCategories)
    
    // إرسال إشارة لتحديث المعاينة
    const previewUpdateEvent = new CustomEvent('storePreviewUpdate', {
      detail: {
        componentType: 'product_categories',
        settings: updatedSettings,
        timestamp: Date.now()
      }
    })
    window.dispatchEvent(previewUpdateEvent)
  }, [
    settings.displayCount,
    settings.maxCategories,
    settings.displayStyle,
    settings.backgroundStyle,
    settings.showDescription,
    settings.showProductCount,
    settings.showImages,
    settings.enableHoverEffects,
    settings.selectionMethod,
    settings.selectedCategories,
    availableCategories
  ])

  // تصفية الفئات حسب البحث
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return availableCategories
    
    return availableCategories.filter(category =>
      category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(categorySearchQuery.toLowerCase())
    )
  }, [availableCategories, categorySearchQuery])

  // إضافة فئة للاختيار
  const addCategoryToSelection = (category: Category) => {
    if (!selectedCategories.find(c => c.id === category.id)) {
      const newSelection = [...selectedCategories, category]
      setSelectedCategories(newSelection)
      const categoryIds = newSelection.map(c => c.id)
      onUpdate('selectedCategories', categoryIds)
    }
  }

  // إزالة فئة من الاختيار
  const removeCategoryFromSelection = (categoryId: string) => {
    const newSelection = selectedCategories.filter(c => c.id !== categoryId)
    setSelectedCategories(newSelection)
    onUpdate('selectedCategories', newSelection.map(c => c.id))
  }

  // إعادة ترتيب الفئات المحددة
  const reorderSelectedCategories = (fromIndex: number, toIndex: number) => {
    const newSelection = [...selectedCategories]
    const [moved] = newSelection.splice(fromIndex, 1)
    newSelection.splice(toIndex, 0, moved)
    setSelectedCategories(newSelection)
    onUpdate('selectedCategories', newSelection.map(c => c.id))
  }

  // رندر بطاقة فئة صغيرة
  const renderCategoryCard = (category: Category, isSelected: boolean = false, compact: boolean = false) => {
    // استخدام صورة افتراضية مع أيقونة إذا لم تكن هناك صورة
    const hasImage = category.image_url && category.image_url.trim() !== ''
    
    return (
      <Card className={`overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md border-border'
      } ${compact ? 'h-20' : 'h-32'}`}>
        <CardContent className="p-0 h-full">
          <div className={`flex ${compact ? 'flex-row' : 'flex-col'} h-full`}>
            <div className={`relative ${compact ? 'w-20 h-20' : 'w-full h-20'} bg-gradient-to-br from-primary/10 to-primary/20 flex-shrink-0`}>
              {hasImage ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // تشخيص فشل تحميل الصورة
                    
                    // إخفاء الصورة وإظهار الأيقونة عند فشل التحميل
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      const iconDiv = parent.querySelector('.fallback-icon') as HTMLElement
                      if (iconDiv) iconDiv.style.display = 'flex'
                    }
                  }}
                />
              ) : null}
              
              {/* أيقونة احتياطية */}
              <div 
                className={`fallback-icon absolute inset-0 flex flex-col items-center justify-center text-primary ${hasImage ? 'hidden' : 'flex'}`}
                style={{ display: hasImage ? 'none' : 'flex' }}
              >
                {category.icon ? (
                  <span className="text-2xl mb-1">{category.icon}</span>
                ) : (
                  <>
                    <Image className="w-6 h-6 mb-1" />
                    {!compact && <span className="text-xs opacity-75">لا توجد صورة</span>}
                  </>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
              {category.product_count !== undefined && (
                <Badge className="absolute bottom-1 right-1 text-xs bg-primary/90 text-primary-foreground">
                  {category.product_count || 0} منتج
                </Badge>
              )}
            </div>
            <div className={`p-2 flex-1 flex flex-col justify-between ${compact ? 'min-w-0' : ''}`}>
              <div>
                <h4 className={`font-medium text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {category.name}
                </h4>
                {!compact && category.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              <div className={`flex items-center justify-between mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                <span className="text-xs text-muted-foreground">
                  {category.slug}
                </span>
                {!compact && (
                  <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-xs">
                    {category.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* قسم المحتوى */}
      <PropertySection
        title="المحتوى الأساسي"
        icon={<Type className="w-4 h-4" />}
        expanded={expandedSections.has('content')}
        onToggle={() => toggleSection('content')}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="categories-title">العنوان</Label>
            <Input
              id="categories-title"
              value={settings.title || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="تصفح فئات منتجاتنا"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="categories-description">الوصف</Label>
            <Textarea
              id="categories-description"
              value={settings.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="أفضل الفئات المختارة لتلبية احتياجاتك"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-view-all">إظهار زر "عرض الكل"</Label>
            <Switch
              id="show-view-all"
              checked={settings.showViewAllButton ?? true}
              onCheckedChange={(checked) => onUpdate('showViewAllButton', checked)}
            />
          </div>
        </div>
      </PropertySection>

      {/* إعدادات العرض */}
      <PropertySection
        title="إعدادات العرض"
        icon={<Settings2 className="w-4 h-4" />}
        expanded={expandedSections.has('display')}
        onToggle={() => toggleSection('display')}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-count">عدد الفئات المعروضة</Label>
            <div className="mt-2">
              <Slider
                value={[settings.displayCount || settings.maxCategories || 6]}
                onValueChange={(value) => onUpdate('displayCount', value[0])}
                max={12}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>2</span>
                <span className="font-medium">{settings.displayCount || settings.maxCategories || 6} فئة</span>
                <span>12</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="display-style">طريقة العرض</Label>
            <Select
              value={settings.displayStyle || 'cards'}
              onValueChange={(value) => onUpdate('displayStyle', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="اختر طريقة العرض" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cards">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    بطاقات
                  </div>
                </SelectItem>
                <SelectItem value="grid">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    شبكة
                  </div>
                </SelectItem>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    قائمة
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="background-style">لون الخلفية</Label>
            <Select
              value={settings.backgroundStyle || 'light'}
              onValueChange={(value) => onUpdate('backgroundStyle', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="اختر لون الخلفية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">فاتح</SelectItem>
                <SelectItem value="dark">داكن</SelectItem>
                <SelectItem value="muted">هادئ</SelectItem>
                <SelectItem value="gradient">متدرج</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>خيارات العرض المتقدمة</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-description" className="text-sm">إظهار وصف الفئات</Label>
              <Switch
                id="show-description"
                checked={settings.showDescription ?? true}
                onCheckedChange={(checked) => onUpdate('showDescription', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-product-count" className="text-sm">إظهار عدد المنتجات</Label>
              <Switch
                id="show-product-count"
                checked={settings.showProductCount ?? true}
                onCheckedChange={(checked) => onUpdate('showProductCount', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-images" className="text-sm">إظهار صور الفئات</Label>
              <Switch
                id="show-images"
                checked={settings.showImages ?? true}
                onCheckedChange={(checked) => onUpdate('showImages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-hover-effects" className="text-sm">تفعيل تأثيرات الحوم</Label>
              <Switch
                id="enable-hover-effects"
                checked={settings.enableHoverEffects ?? true}
                onCheckedChange={(checked) => onUpdate('enableHoverEffects', checked)}
              />
            </div>
          </div>
        </div>
      </PropertySection>

      {/* اختيار الفئات */}
      <PropertySection
        title="اختيار الفئات"
        icon={<Filter className="w-4 h-4" />}
        expanded={expandedSections.has('selection')}
        onToggle={() => toggleSection('selection')}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="selection-method">طريقة الاختيار</Label>
            <Select
              value={settings.selectionMethod || 'automatic'}
              onValueChange={(value) => {
                onUpdate('selectionMethod', value)
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="اختر طريقة الاختيار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    تلقائي
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    يدوي
                  </div>
                </SelectItem>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    الأكثر شعبية
                  </div>
                </SelectItem>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    الأحدث
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.selectionMethod === 'automatic' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                سيتم اختيار الفئات تلقائياً بناءً على النشاط والشعبية
              </AlertDescription>
            </Alert>
          )}

          {settings.selectionMethod === 'manual' && (
            <div className="space-y-4">
              {/* عرض الفئات المحددة */}
              {selectedCategories.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>الفئات المحددة ({selectedCategories.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategories([])
                        onUpdate('selectedCategories', [])
                      }}
                    >
                      مسح الكل
                    </Button>
                  </div>
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    <div className="space-y-2">
                      {selectedCategories.map((category, index) => (
                        <div key={category.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {renderCategoryCard(category, true, true)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderSelectedCategories(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderSelectedCategories(index, Math.min(selectedCategories.length - 1, index + 1))}
                              disabled={index === selectedCategories.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCategoryFromSelection(category.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* زر إضافة فئات */}
              <Dialog open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={categoriesLoading}
                    onClick={() => {
                      if (availableCategories.length === 0 && !categoriesLoading) {
                        loadAvailableCategories()
                      }
                      setShowCategoryPicker(true)
                    }}
                  >
                    {categoriesLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {categoriesLoading ? 'جاري التحميل...' : 'اختيار فئات'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>اختيار الفئات</DialogTitle>
                    <DialogDescription>
                      اختر الفئات التي تريد عرضها في قسم فئات المنتجات
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* شريط البحث والفلاتر */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="البحث في الفئات..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                      <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                          variant={categoryPickerView === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCategoryPickerView('grid')}
                          className="h-8 w-8 p-0"
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={categoryPickerView === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCategoryPickerView('list')}
                          className="h-8 w-8 p-0"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* حالة التحميل */}
                    {categoriesLoading && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 mb-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">جاري تحميل الفئات...</p>
                        <p className="text-xs text-muted-foreground">قد يستغرق هذا بضع ثوانٍ</p>
                      </div>
                    )}

                    {/* حالة الخطأ */}
                    {categoriesError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{categoriesError}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadAvailableCategories}
                            disabled={categoriesLoading}
                            className="mr-2"
                          >
                            {categoriesLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'إعادة المحاولة'
                            )}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* قائمة الفئات */}
                    {!categoriesLoading && !categoriesError && (
                      <ScrollArea className="h-96">
                        {filteredCategories.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                              <Layers className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-sm font-medium mb-2">
                              {availableCategories.length === 0 ? 'لا توجد فئات في المتجر' : 'لم يتم العثور على فئات مطابقة'}
                            </p>
                            {availableCategories.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                يرجى إضافة فئات إلى المتجر أولاً
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className={`gap-3 ${
                            categoryPickerView === 'grid' 
                              ? 'grid grid-cols-2 md:grid-cols-3' 
                              : 'space-y-2'
                          }`}>
                            {filteredCategories.map(category => {
                              const isSelected = selectedCategories.some(c => c.id === category.id)
                              return (
                                <TooltipProvider key={category.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`relative cursor-pointer transition-all duration-200 ${
                                          isSelected ? 'opacity-50' : 'hover:scale-105'
                                        }`}
                                        onClick={() => {
                                          if (!isSelected) {
                                            addCategoryToSelection(category)
                                          }
                                        }}
                                      >
                                        {renderCategoryCard(category, isSelected, categoryPickerView === 'list')}
                                        {isSelected && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg z-10">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{isSelected ? 'فئة محددة مسبقاً' : 'انقر للإضافة'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    )}

                    {/* معلومات إضافية */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                      <span>تم اختيار {selectedCategories.length} فئة</span>
                      <div className="flex items-center gap-2">
                        <span>متاح {filteredCategories.length} فئة</span>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowCategoryPicker(false)}
                          className="h-8"
                        >
                          تم
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* حالة فارغة */}
              {selectedCategories.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    لم يتم اختيار أي فئات. انقر على "اختيار فئات" لبدء الاختيار.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {(settings.selectionMethod === 'popular' || settings.selectionMethod === 'newest') && (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                {settings.selectionMethod === 'popular' 
                  ? 'سيتم عرض الفئات الأكثر شعبية (بناءً على عدد المنتجات والمشاهدات)'
                  : 'سيتم عرض أحدث الفئات المضافة'
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      </PropertySection>
    </div>
  )
}
