import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertySection } from '../PropertySection';
import { Type, Image as ImageIcon, MousePointer, Settings, Package, Star, Eye, Search } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import { supabase } from '@/lib/supabase';

interface EnhancedHeroEditorProps {
  settings: any;
  onUpdate: (key: string, value: any) => void;
  onUpdateNested: (path: string[], value: any) => void;
  organizationId?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  thumbnail_image?: string;
  thumbnail_url?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_active?: boolean;
  category?: any;
  sku?: string;
  stock_quantity?: number;
  slug?: string;
}

export const EnhancedHeroEditor: React.FC<EnhancedHeroEditorProps> = ({
  settings,
  onUpdate,
  onUpdateNested,
  organizationId: propOrganizationId,
  isMobile = false,
  isTablet = false,
  isDesktop = false
}) => {
  // استخدام organizationId من props أو من localStorage مع useMemo لتجنب إعادة الحساب
  const organizationId = useMemo(() =>
    propOrganizationId || localStorage.getItem('bazaar_organization_id'),
    [propOrganizationId]
  );

  // استخراج productsType من settings باستخدام useMemo لتجنب إعادة الجلب غير الضرورية
  const productsType = useMemo(() => settings.productsType || 'featured', [settings.productsType]);

  // استخراج selectedProducts من settings باستخدام useMemo
  const initialSelectedProducts = useMemo(() => settings.selectedProducts || [], [settings.selectedProducts]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    initialSelectedProducts
  );
  const [searchQuery, setSearchQuery] = useState('');

  // تنظيف البيانات القديمة من localStorage عند تغيير organizationId
  useEffect(() => {
    if (!organizationId) return;

    // البحث عن جميع المفاتيح المتعلقة بالمنتجات في localStorage
    const keysToRemove: string[] = [];
    const currentTime = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hero_products_')) {
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

  // استرجاع المنتجات من localStorage عند تغيير organizationId أو productsType
  useEffect(() => {
    if (organizationId && productsType) {
      const fetchKey = `hero_products_${organizationId}_${productsType}`;
      const storedProducts = localStorage.getItem(`${fetchKey}_data`);
      if (storedProducts) {
        try {
          const parsedProducts = JSON.parse(storedProducts);
          setProducts(parsedProducts);
          return; // إذا كانت المنتجات موجودة في الكاش، لا نحتاج لجلبها
        } catch (error) {
        }
      }
    }
  }, [organizationId, productsType]);

  // تحديث selectedProducts عند تغير initialSelectedProducts
  useEffect(() => {
    setSelectedProducts(initialSelectedProducts);
  }, [initialSelectedProducts]);

  // جلب المنتجات من قاعدة البيانات حسب النوع
  useEffect(() => {
    const fetchProducts = async () => {
      if (!organizationId) return;

      // إنشاء مفتاح فريد للمنتجات المجلبة
      const fetchKey = `hero_products_${organizationId}_${productsType}`;

      // التحقق من localStorage إذا كانت المنتجات مجلبة سابقاً
      const hasFetched = localStorage.getItem(fetchKey) === 'true';
      const hasData = localStorage.getItem(`${fetchKey}_data`);

      // إذا كانت المنتجات مجلبة سابقاً والبيانات موجودة، لا نجلب مرة أخرى
      if (hasFetched && hasData) {
        return;
      }

      setLoadingProducts(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, description, price, images, thumbnail_image, is_featured, is_new, is_active, category, sku, created_at')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        // تطبيق الفلاتر حسب نوع المنتجات
        switch (productsType) {
          case 'featured':
            query = query.eq('is_featured', true);
            break;
          case 'selected':
            // في حالة المنتجات المحددة، نجلب جميع المنتجات للاختيار
            break;
          case 'latest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'new':
            query = query.eq('is_new', true);
            break;
          default:
            query = query.eq('is_featured', true);
        }

        // الترتيب الافتراضي
        if (productsType !== 'latest') {
          query = query.order('is_featured', { ascending: false }).order('name', { ascending: true });
        }

        const { data, error } = await query;

        if (error) {
          return;
        }

        setProducts(data || []);
        // حفظ المنتجات في localStorage مع timestamp
        localStorage.setItem(`${fetchKey}_data`, JSON.stringify(data || []));
        localStorage.setItem(fetchKey, 'true');
        localStorage.setItem(`${fetchKey}_timestamp`, Date.now().toString());
      } catch (error) {
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [organizationId, productsType]);

  // تحديث المنتجات المحددة
  const handleProductSelection = (productId: string, checked: boolean) => {
    const newSelectedProducts = checked
      ? [...selectedProducts, productId]
      : selectedProducts.filter(id => id !== productId);

    setSelectedProducts(newSelectedProducts);
    onUpdate('selectedProducts', newSelectedProducts);
  };

  // فلترة المنتجات حسب البحث
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* المحتوى الأساسي */}
      <PropertySection title="المحتوى الأساسي" icon={<Type className="w-4 h-4" />}>
        <div className="space-y-3 lg:space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">العنوان الرئيسي</Label>
            <Input
              id="title"
              value={settings.title || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="أدخل العنوان الرئيسي"
              className="mt-1.5 input-responsive"
            />
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium">الوصف</Label>
            <Textarea
              id="description"
              value={settings.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="أدخل وصفاً للقسم"
              rows={3}
              className="mt-1.5 input-responsive resize-none"
            />
          </div>

          <div>
            <Label htmlFor="imageUrl" className="text-sm font-medium">صورة الخلفية</Label>
            <div className="mt-1.5">
              <ImageUploader
                imageUrl={settings.imageUrl || ''}
                onImageUploaded={(url) => onUpdate('imageUrl', url)}
                className="input-responsive"
                maxSizeInMB={5}
              />
            </div>
          </div>
        </div>
      </PropertySection>

      {/* الأزرار */}
      <PropertySection title="الأزرار" icon={<MousePointer className="w-4 h-4" />}>
        <div className="space-y-4">
          {/* الزر الأساسي */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">الزر الأساسي</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="primaryButtonText" className="text-xs">النص</Label>
                <Input
                  id="primaryButtonText"
                  value={settings.primaryButton?.text || settings.primaryButtonText || ''}
                  onChange={(e) => {
                    onUpdateNested(['primaryButton', 'text'], e.target.value);
                    onUpdate('primaryButtonText', e.target.value);
                  }}
                  placeholder="نص الزر"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="primaryButtonLink" className="text-xs">الرابط</Label>
                <Input
                  id="primaryButtonLink"
                  value={settings.primaryButton?.link || settings.primaryButtonLink || ''}
                  onChange={(e) => {
                    onUpdateNested(['primaryButton', 'link'], e.target.value);
                    onUpdate('primaryButtonLink', e.target.value);
                  }}
                  placeholder="/products"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* الزر الثانوي */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">الزر الثانوي</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="secondaryButtonText" className="text-xs">النص</Label>
                <Input
                  id="secondaryButtonText"
                  value={settings.secondaryButton?.text || settings.secondaryButtonText || ''}
                  onChange={(e) => {
                    onUpdateNested(['secondaryButton', 'text'], e.target.value);
                    onUpdate('secondaryButtonText', e.target.value);
                  }}
                  placeholder="نص الزر"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="secondaryButtonLink" className="text-xs">الرابط</Label>
                <Input
                  id="secondaryButtonLink"
                  value={settings.secondaryButton?.link || settings.secondaryButtonLink || ''}
                  onChange={(e) => {
                    onUpdateNested(['secondaryButton', 'link'], e.target.value);
                    onUpdate('secondaryButtonLink', e.target.value);
                  }}
                  placeholder="/offers"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </PropertySection>

      {/* المنتجات المعروضة */}
      <PropertySection title="المنتجات المعروضة" icon={<Package className="w-4 h-4" />}>
        <div className="space-y-3 lg:space-y-4">
          {/* تفعيل عرض المنتجات */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">عرض المنتجات في البانر</Label>
            <Switch
              checked={settings.showProducts === true}
              onCheckedChange={(checked) => onUpdate('showProducts', checked)}
              className="switch-responsive"
            />
          </div>

          {/* نوع المنتجات */}
          {settings.showProducts === true && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع المنتجات</Label>
              <Select
                value={settings.productsType || 'featured'}
                onValueChange={(value) => onUpdate('productsType', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر نوع المنتجات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">المنتجات المميزة</SelectItem>
                  <SelectItem value="selected">منتجات محددة</SelectItem>
                  <SelectItem value="latest">أحدث المنتجات</SelectItem>
                  <SelectItem value="new">المنتجات الجديدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {settings.showProducts === true && (
            <div className="space-y-3 p-3 bg-card/50 rounded-lg border border-border/50">
              {/* حد عدد المنتجات */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">عدد المنتجات المعروضة</Label>
                <div className="select-responsive">
                  <Select
                    value={(settings.productsLimit || 4).toString()}
                    onValueChange={(value) => onUpdate('productsLimit', parseInt(value))}
                  >
                    <SelectTrigger className="select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 منتجات</SelectItem>
                      <SelectItem value="4">4 منتجات</SelectItem>
                      <SelectItem value="6">6 منتجات</SelectItem>
                      <SelectItem value="8">8 منتجات</SelectItem>
                      <SelectItem value="10">10 منتجات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* اختيار المنتجات يدوياً */}
              {(settings.productsType || 'featured') === 'selected' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في المنتجات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    منتجات محددة: {selectedProducts.length}
                  </div>

                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {loadingProducts ? (
                      <div className="text-center py-4 text-muted-foreground">
                        جار تحميل المنتجات...
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        {searchQuery ? 'لم يتم العثور على منتجات' : 'لا توجد منتجات متاحة'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                          >
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) =>
                                handleProductSelection(product.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {product.name}
                                </span>
                                {(product.is_featured || product.is_new) && (
                                  <div className="flex items-center gap-1">
                                    {product.is_featured && (
                                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                    )}
                                    {product.is_new && (
                                      <Badge className="text-xs px-1 py-0 h-4 bg-blue-500">جديد</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {product.sku || 'بدون كود'} • {product.price?.toLocaleString() || '0'} دج
                                {product.stock_quantity !== undefined && (
                                  <span className="ml-2">• مخزون: {product.stock_quantity}</span>
                                )}
                              </div>
                            </div>
                            {(product.thumbnail_image || product.thumbnail_url) && (
                              <img
                                src={product.thumbnail_image || product.thumbnail_url}
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-product.jpg';
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {selectedProducts.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {selectedProducts.length} منتج محدد
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PropertySection>

      {/* شارات الثقة */}
      <PropertySection title="شارات الثقة" icon={<Star className="w-4 h-4" />}>
        <div className="space-y-3">
          <Label className="text-sm font-medium">شارات الثقة (اختياري)</Label>
          <div className="space-y-2">
            {(settings.trustBadges || []).map((badge: any, index: number) => (
              <div key={badge.id || index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <Input
                  value={badge.text || ''}
                  onChange={(e) => {
                    const newBadges = [...(settings.trustBadges || [])];
                    newBadges[index] = { ...badge, text: e.target.value };
                    onUpdate('trustBadges', newBadges);
                  }}
                  placeholder="نص الشارة"
                  className="flex-1 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newBadges = (settings.trustBadges || []).filter((_: any, i: number) => i !== index);
                    onUpdate('trustBadges', newBadges);
                  }}
                  className="text-xs"
                >
                  حذف
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newBadges = [...(settings.trustBadges || []), {
                  id: Date.now().toString(),
                  text: '',
                  icon: 'Gem'
                }];
                onUpdate('trustBadges', newBadges);
              }}
              className="w-full text-xs"
            >
              إضافة شارة ثقة
            </Button>
          </div>
        </div>
      </PropertySection>
    </div>
  );
};
