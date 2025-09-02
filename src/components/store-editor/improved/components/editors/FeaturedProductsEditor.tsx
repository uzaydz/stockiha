import React, { useState, useEffect, useMemo } from 'react'
import { Type, Settings2, Package, Search, Plus, X, Eye, EyeOff, Grid3X3, List, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { getProducts } from '@/lib/api/products'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  compare_at_price?: number
  thumbnail_url?: string
  thumbnail_image?: string
  category?: any
  stock_quantity: number
  is_featured?: boolean
  is_new?: boolean
  slug?: string
}

interface FeaturedProductsEditorProps {
  settings: any
  onUpdate: (key: string, value: any) => void
  organizationId?: string
}

export const FeaturedProductsEditor: React.FC<FeaturedProductsEditorProps> = ({
  settings,
  onUpdate,
  organizationId: propOrganizationId
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content', 'display', 'selection'])
  )
  
  // حالة الاختيار اليدوي للمنتجات
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productPickerView, setProductPickerView] = useState<'grid' | 'list'>('grid')
  
  // استخدام organizationId من props أو من localStorage كـ fallback
  const organizationId = propOrganizationId || localStorage.getItem('bazaar_organization_id')

  // تنظيف البيانات القديمة من localStorage عند تغيير organizationId
  useEffect(() => {
    if (!organizationId) return;

    // البحث عن جميع المفاتيح المتعلقة بالمنتجات في localStorage
    const keysToRemove: string[] = [];
    const currentTime = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('featured_editor_products_')) {
        // إزالة البيانات الخاصة بمنظمات أخرى
        if (!key.includes(organizationId)) {
          keysToRemove.push(key);
          // إزالة البيانات والـ timestamp المرتبطة
          if (key.endsWith('_data')) {
            const baseKey = key.replace('_data', '');
            keysToRemove.push(baseKey);
            keysToRemove.push(`${baseKey}_timestamp`);
          } else if (!key.endsWith('_timestamp')) {
            keysToRemove.push(`${key}_data`);
            keysToRemove.push(`${key}_timestamp`);
          }
        } else {
          // التحقق من أن البيانات ليست قديمة جداً (أكثر من 30 دقيقة)
          const storedTime = localStorage.getItem(`${key}_timestamp`);
          if (storedTime && (currentTime - parseInt(storedTime)) > 30 * 60 * 1000) {
            keysToRemove.push(key);
            if (!key.endsWith('_timestamp') && !key.endsWith('_data')) {
              keysToRemove.push(`${key}_data`);
              keysToRemove.push(`${key}_timestamp`);
            }
          }
        }
      }
    }

    // إزالة المفاتيح القديمة (تجنب التكرار)
    const uniqueKeys = [...new Set(keysToRemove)];
    uniqueKeys.forEach(key => localStorage.removeItem(key));
  }, [organizationId]);

  // Logging للتتبع

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

  // تحميل المنتجات المتاحة
  const loadAvailableProducts = async () => {

    if (!organizationId) {
      setProductsError('لا يوجد معرف مؤسسة متاح')
      return
    }

    setProductsLoading(true)
    setProductsError(null)

    try {
      const products = await getProducts(organizationId)

      setAvailableProducts(products || [])

      // حفظ البيانات في localStorage
      const cacheKey = `featured_editor_products_${organizationId}`;
      localStorage.setItem(`${cacheKey}_data`, JSON.stringify(products || []));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

      if (!products || products.length === 0) {
        setProductsError('لا توجد منتجات متاحة')
      }
    } catch (error) {
      setProductsError('فشل في تحميل المنتجات. تأكد من الاتصال بالشبكة.')
    } finally {
      setProductsLoading(false)
    }
  }

  // تحميل المنتجات المحددة من الإعدادات
  useEffect(() => {
    if (settings.selectedProducts && Array.isArray(settings.selectedProducts)) {
      const productsFromSettings = availableProducts.filter(product => 
        settings.selectedProducts.includes(product.id)
      )
      setSelectedProducts(productsFromSettings)
    }
  }, [settings.selectedProducts, availableProducts])

  // تحميل المنتجات عند تحميل المكون مع نظام كاش
  useEffect(() => {
    const loadProductsWithCache = async () => {
      if (!organizationId) return;

      const cacheKey = `featured_editor_products_${organizationId}`;
      const cachedProducts = localStorage.getItem(`${cacheKey}_data`);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const isCacheValid = cacheTimestamp &&
        (Date.now() - parseInt(cacheTimestamp)) < 30 * 60 * 1000; // 30 دقيقة

      if (cachedProducts && isCacheValid) {
        try {
          const products = JSON.parse(cachedProducts);
          setAvailableProducts(products);
          return;
        } catch (error) {
        }
      }

      // جلب المنتجات إذا لم تكن في الكاش أو انتهت صلاحيتها
      await loadAvailableProducts();
    };

    loadProductsWithCache();
  }, [organizationId])

  // تحميل المنتجات عند فتح الحوار إذا لم تكن محملة
  useEffect(() => {
    if (showProductPicker && availableProducts.length === 0 && !productsLoading && organizationId) {
      loadAvailableProducts()
    }
  }, [showProductPicker, availableProducts.length, productsLoading, organizationId])

  // تصفية المنتجات حسب البحث
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery) return availableProducts
    
    return availableProducts.filter(product =>
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(productSearchQuery.toLowerCase())
    )
  }, [availableProducts, productSearchQuery])

  // إضافة منتج للاختيار
  const addProductToSelection = (product: Product) => {
    if (!selectedProducts.find(p => p.id === product.id)) {
      const newSelection = [...selectedProducts, product]
      setSelectedProducts(newSelection)
      onUpdate('selectedProducts', newSelection.map(p => p.id))
    }
  }

  // إزالة منتج من الاختيار
  const removeProductFromSelection = (productId: string) => {
    const newSelection = selectedProducts.filter(p => p.id !== productId)
    setSelectedProducts(newSelection)
    onUpdate('selectedProducts', newSelection.map(p => p.id))
  }

  // إعادة ترتيب المنتجات المحددة
  const reorderSelectedProducts = (fromIndex: number, toIndex: number) => {
    const newSelection = [...selectedProducts]
    const [moved] = newSelection.splice(fromIndex, 1)
    newSelection.splice(toIndex, 0, moved)
    setSelectedProducts(newSelection)
    onUpdate('selectedProducts', newSelection.map(p => p.id))
  }

  // رندر بطاقة منتج صغيرة
  const renderProductCard = (product: Product, isSelected: boolean = false, compact: boolean = false) => {
    const imageUrl = product.thumbnail_url || product.thumbnail_image || '/placeholder-product.jpg'
    
    return (
      <Card className={`overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md border-border'
      } ${compact ? 'h-20' : 'h-32'}`}>
        <CardContent className="p-0 h-full">
          <div className={`flex ${compact ? 'flex-row' : 'flex-col'} h-full`}>
            <div className={`relative ${compact ? 'w-20 h-20' : 'w-full h-20'} bg-muted flex-shrink-0`}>
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg'
                }}
              />
              {product.is_new && (
                <Badge className="absolute top-1 left-1 text-xs bg-blue-500 hover:bg-blue-600">
                  جديد
                </Badge>
              )}
              {product.is_featured && (
                <Badge className="absolute top-1 right-1 text-xs bg-yellow-500 hover:bg-yellow-600">
                  مميز
                </Badge>
              )}
            </div>
            <div className={`p-2 flex-1 flex flex-col justify-between ${compact ? 'min-w-0' : ''}`}>
              <div>
                <h4 className={`font-medium text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {product.name}
                </h4>
                {!compact && product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {product.description}
                  </p>
                )}
              </div>
              <div className={`flex items-center justify-between mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                <span className="font-bold text-primary">
                  {product.price.toLocaleString()} د.ج
                </span>
                <span className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
                  مخزون: {product.stock_quantity}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* قسم المحتوى */}
      <PropertySection
        title="المحتوى الأساسي"
        icon={<Type className="w-4 h-4" />}
        expanded={expandedSections.has('content')}
        onToggle={() => toggleSection('content')}
        className="properties-section-responsive"
      >
        <div className="space-y-3 lg:space-y-4">
          <div className="grid gap-3 lg:gap-4">
            <div>
              <Label htmlFor="featured-title" className="text-sm font-medium">العنوان</Label>
              <Input
                id="featured-title"
                value={settings.title || ''}
                onChange={(e) => onUpdate('title', e.target.value)}
                placeholder="منتجاتنا المميزة"
                className="mt-1.5 input-responsive"
              />
            </div>

            <div>
              <Label htmlFor="featured-description" className="text-sm font-medium">الوصف</Label>
              <Textarea
                id="featured-description"
                value={settings.description || ''}
                onChange={(e) => onUpdate('description', e.target.value)}
                placeholder="اكتشف أفضل ما لدينا من منتجات مختارة بعناية"
                rows={3}
                className="mt-1.5 input-responsive resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label htmlFor="show-view-all" className="text-sm font-medium">إظهار زر "عرض الكل"</Label>
            <Switch
              id="show-view-all"
              checked={settings.showViewAllButton ?? true}
              onCheckedChange={(checked) => onUpdate('showViewAllButton', checked)}
              className="switch-responsive"
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
        className="properties-section-responsive"
      >
        <div className="space-y-3 lg:space-y-4">
          <div className="p-3 bg-card/50 rounded-lg border border-border/50">
            <Label htmlFor="display-count" className="text-sm font-medium">عدد المنتجات المعروضة</Label>
            <div className="mt-2 slider-responsive">
              <Slider
                value={[settings.displayCount || 4]}
                onValueChange={(value) => onUpdate('displayCount', value[0])}
                max={20}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>2</span>
                <span className="font-medium text-primary">{settings.displayCount || 4} منتج</span>
                <span>20</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="display-type" className="text-sm font-medium">نوع العرض</Label>
            <div className="select-responsive">
              <Select
                value={settings.displayType || 'grid'}
                onValueChange={(value) => onUpdate('displayType', value)}
              >
                <SelectTrigger className="mt-1.5 select-trigger">
                  <SelectValue placeholder="اختر نوع العرض" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4" />
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
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>خيارات العرض المتقدمة</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-prices" className="text-sm">إظهار الأسعار</Label>
              <Switch
                id="show-prices"
                checked={settings.showPrices ?? true}
                onCheckedChange={(checked) => onUpdate('showPrices', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-ratings" className="text-sm">إظهار التقييمات</Label>
              <Switch
                id="show-ratings"
                checked={settings.showRatings ?? true}
                onCheckedChange={(checked) => onUpdate('showRatings', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-add-to-cart" className="text-sm">إظهار أزرار الإضافة للسلة</Label>
              <Switch
                id="show-add-to-cart"
                checked={settings.showAddToCart ?? true}
                onCheckedChange={(checked) => onUpdate('showAddToCart', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-badges" className="text-sm">إظهار شارات المنتجات</Label>
              <Switch
                id="show-badges"
                checked={settings.showBadges ?? true}
                onCheckedChange={(checked) => onUpdate('showBadges', checked)}
              />
            </div>
          </div>
        </div>
      </PropertySection>

      {/* اختيار المنتجات */}
      <PropertySection
        title="اختيار المنتجات"
        icon={<Package className="w-4 h-4" />}
        expanded={expandedSections.has('selection')}
        onToggle={() => toggleSection('selection')}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="selection-method">طريقة الاختيار</Label>
            <Select
              value={settings.selectionMethod || 'automatic'}
              onValueChange={(value) => onUpdate('selectionMethod', value)}
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
              </SelectContent>
            </Select>
          </div>

          {settings.selectionMethod === 'automatic' && (
            <div>
              <Label htmlFor="selection-criteria">معايير الاختيار التلقائي</Label>
              <Select
                value={settings.selectionCriteria || 'featured'}
                onValueChange={(value) => onUpdate('selectionCriteria', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر المعيار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      المنتجات المميزة
                    </div>
                  </SelectItem>
                  <SelectItem value="best_selling">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">📈</span>
                      الأكثر مبيعاً
                    </div>
                  </SelectItem>
                  <SelectItem value="newest">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">🆕</span>
                      الأحدث
                    </div>
                  </SelectItem>
                  <SelectItem value="discounted">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">🏷️</span>
                      المخفضة
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {settings.selectionMethod === 'manual' && (
            <div className="space-y-4">
              {/* عرض المنتجات المحددة */}
              {selectedProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>المنتجات المحددة ({selectedProducts.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProducts([])
                        onUpdate('selectedProducts', [])
                      }}
                    >
                      مسح الكل
                    </Button>
                  </div>
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    <div className="space-y-2">
                      {selectedProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {renderProductCard(product, true, true)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderSelectedProducts(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderSelectedProducts(index, Math.min(selectedProducts.length - 1, index + 1))}
                              disabled={index === selectedProducts.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductFromSelection(product.id)}
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

              {/* زر إضافة منتجات */}
              <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={productsLoading}
                    onClick={() => {
                      if (availableProducts.length === 0 && !productsLoading) {
                        loadAvailableProducts()
                      }
                      setShowProductPicker(true)
                    }}
                  >
                    {productsLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {productsLoading ? 'جاري التحميل...' : 'اختيار منتجات'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>اختيار المنتجات</DialogTitle>
                    <DialogDescription>
                      اختر المنتجات التي تريد عرضها في قسم المنتجات المميزة
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* شريط البحث والفلاتر */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="البحث في المنتجات..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                      <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                          variant={productPickerView === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProductPickerView('grid')}
                          className="h-8 w-8 p-0"
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={productPickerView === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProductPickerView('list')}
                          className="h-8 w-8 p-0"
                        >
                          <List className="w-4 h-4" />
                        </Button>
              </div>
            </div>

                    {/* حالة التحميل */}
                    {productsLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>جاري تحميل المنتجات...</span>
                      </div>
                    )}

                    {/* حالة الخطأ */}
                    {productsError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{productsError}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadAvailableProducts}
                            disabled={productsLoading}
                            className="mr-2"
                          >
                            {productsLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'إعادة المحاولة'
                            )}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* قائمة المنتجات */}
                    {!productsLoading && !productsError && (
                      <ScrollArea className="h-96">
                        {filteredProducts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm font-medium mb-2">
                              {availableProducts.length === 0 ? 'لا توجد منتجات في المتجر' : 'لم يتم العثور على منتجات مطابقة'}
                            </p>
                            {availableProducts.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                يرجى إضافة منتجات إلى المتجر أولاً
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className={`gap-3 ${
                            productPickerView === 'grid' 
                              ? 'grid grid-cols-2 md:grid-cols-3' 
                              : 'space-y-2'
                          }`}>
                            {filteredProducts.map(product => {
                              const isSelected = selectedProducts.some(p => p.id === product.id)
                              return (
                                <TooltipProvider key={product.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`relative cursor-pointer transition-all duration-200 ${
                                          isSelected ? 'opacity-50' : 'hover:scale-105'
                                        }`}
                                        onClick={() => {
                                          if (!isSelected) {
                                            addProductToSelection(product)
                                          }
                                        }}
                                      >
                                        {renderProductCard(product, isSelected, productPickerView === 'list')}
                                        {isSelected && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg z-10">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{isSelected ? 'منتج محدد مسبقاً' : 'انقر للإضافة'}</p>
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
                      <span>تم اختيار {selectedProducts.length} منتج</span>
                      <div className="flex items-center gap-2">
                        <span>متاح {filteredProducts.length} منتج</span>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowProductPicker(false)}
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
              {selectedProducts.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    لم يتم اختيار أي منتجات. انقر على "اختيار منتجات" لبدء الاختيار.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </PropertySection>
    </div>
  )
}
