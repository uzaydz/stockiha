import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Trash,
  Calendar as CalendarIcon,
  Clock,
  Tag,
  ShoppingBag,
  MoveVertical,
  Info,
  Edit
} from 'lucide-react';
import { getProducts } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';

// نوع بيانات عرض العد التنازلي
interface CountdownOffer {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productDescription?: string;
  productSlug?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  endDate: string;
}

// نوع بيانات منتج
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  thumbnail_image: string;
  slug?: string;
  compare_at_price?: number;
  [key: string]: any;
}

interface CountdownOffersEditorProps {
  settings: {
    title?: string;
    subtitle?: string;
    offers?: CountdownOffer[];
    currency?: string;
    layout?: 'grid' | 'slider' | 'featured';
    maxItems?: number;
    buttonText?: string;
    theme?: 'light' | 'dark' | 'primary';
    showViewAll?: boolean;
    viewAllUrl?: string;
  };
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
}

const CountdownOffersEditor: React.FC<CountdownOffersEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
  addArrayItem,
  removeArrayItem,
  updateArrayItem
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSelector, setShowProductSelector] = useState<boolean>(false);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [offerToAdd, setOfferToAdd] = useState<Partial<CountdownOffer>>({
    discountPercentage: 0,
    discountedPrice: 0,
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  // استخدام سياق المستأجر للحصول على معرف المؤسسة الحالية
  const { currentOrganization } = useTenant();

  // تحميل المنتجات من خلال API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // الحصول على معرف المؤسسة الحالي من السياق أو التخزين المحلي كاحتياطي
        const organizationId = currentOrganization?.id || localStorage.getItem('currentOrganizationId');
        console.log("معرف المؤسسة المستخدم:", organizationId);
        
        if (!organizationId) {
          throw new Error('لم يتم العثور على معرف المؤسسة');
        }
        
        const fetchedProducts = await getProducts(organizationId);
        console.log("تم جلب المنتجات بنجاح:", fetchedProducts.length);
        
        if (fetchedProducts.length === 0) {
          console.warn("لم يتم العثور على منتجات للمؤسسة");
        }
        
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (error) {
        console.error('خطأ في جلب المنتجات:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // تحديث قائمة المنتجات المفلترة عند تغيير استعلام البحث
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // حساب نسبة الخصم تلقائيًا عند تغيير السعر الأصلي أو المخفض
  const calculateDiscountPercentage = (originalPrice: number, discountedPrice: number) => {
    if (!originalPrice || originalPrice <= 0) return 0;
    const percentage = 100 - (discountedPrice / originalPrice) * 100;
    return Math.round(percentage);
  };

  // تحديث سعر الخصم تلقائيًا عند تغيير النسبة المئوية
  const updateDiscountedPrice = (originalPrice: number, discountPercentage: number) => {
    if (!originalPrice || originalPrice <= 0) return 0;
    const price = originalPrice * (1 - discountPercentage / 100);
    return Math.round(price);
  };

  // اختيار منتج للعرض
  const selectProduct = (product: Product) => {
    console.log("تم اختيار المنتج:", product);
    
    // التأكد من وجود المنتج وبياناته الأساسية
    if (!product.id || !product.name || !product.thumbnail_image) {
      console.error("بيانات المنتج المحدد غير مكتملة:", product);
      return;
    }
    
    setSelectedProduct(product);
    
    // استخدام سعر المقارنة كسعر أصلي إذا كان موجودًا، وإلا استخدم السعر العادي
    const originalPrice = product.compare_at_price || product.price;
    const discountedPrice = product.price;
    const discountPercentage = product.compare_at_price 
      ? calculateDiscountPercentage(product.compare_at_price, product.price) 
      : 0;
    
    console.log("تعيين بيانات العرض:", {
      productId: product.id,
      productName: product.name,
      originalPrice,
      discountedPrice,
      discountPercentage
    });
    
    setOfferToAdd({
      productId: product.id,
      productName: product.name,
      productImage: product.thumbnail_image,
      productDescription: product.description,
      productSlug: product.slug,
      originalPrice,
      discountedPrice,
      discountPercentage,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    // الانتقال تلقائيًا إلى تفاصيل العرض بعد اختيار المنتج
    setTimeout(() => {
      const editOfferTab = document.querySelector('[value="editOffer"]');
      if (editOfferTab instanceof HTMLElement) {
        editOfferTab.click();
      }
    }, 100);
  };

  // إضافة عرض جديد
  const addOffer = () => {
    console.log("محاولة إضافة عرض جديد، المنتج المحدد:", selectedProduct);
    
    if (!selectedProduct) {
      console.error("لم يتم تحديد منتج");
      return;
    }
    
    if (!offerToAdd.productId || !offerToAdd.productName || !offerToAdd.productImage) {
      console.error("بيانات العرض غير مكتملة:", offerToAdd);
      return;
    }
    
    const newOffer: CountdownOffer = {
      id: `offer-${Date.now()}`,
      productId: offerToAdd.productId!,
      productName: offerToAdd.productName!,
      productImage: offerToAdd.productImage!,
      productDescription: offerToAdd.productDescription,
      productSlug: offerToAdd.productSlug,
      originalPrice: offerToAdd.originalPrice!,
      discountedPrice: offerToAdd.discountedPrice!,
      discountPercentage: offerToAdd.discountPercentage!,
      endDate: offerToAdd.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    console.log("إضافة عرض جديد:", newOffer);
    
    if (editingIndex !== null) {
      // تحديث عرض موجود
      updateArrayItem('offers', editingIndex, newOffer);
      setEditingIndex(null);
    } else {
      // إضافة عرض جديد
      addArrayItem('offers', newOffer);
    }
    
    // إعادة تعيين حالة الإضافة
    setSelectedProduct(null);
    setOfferToAdd({
      discountPercentage: 0,
      discountedPrice: 0,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    setSelectedEndDate(undefined);
    
    // إغلاق نافذة اختيار المنتج بعد الإضافة بنجاح
    setShowProductSelector(false);
  };

  // تحرير عرض موجود
  const editOffer = (index: number) => {
    console.log("تحرير العرض رقم:", index);
    const offer = settings.offers?.[index];
    if (!offer) {
      console.error("لم يتم العثور على العرض المطلوب تعديله");
      return;
    }
    
    // تعيين مؤشر العرض الحالي للتعديل
    setEditingIndex(index);
    
    // تعيين المنتج المختار
    const productData = {
      id: offer.productId,
      name: offer.productName,
      description: offer.productDescription,
      price: offer.discountedPrice,
      thumbnail_image: offer.productImage,
      slug: offer.productSlug,
      compare_at_price: offer.originalPrice
    };
    console.log("تعيين بيانات المنتج للتعديل:", productData);
    setSelectedProduct(productData);
    
    // تعيين بيانات العرض للتعديل
    const offerData = {
      productId: offer.productId,
      productName: offer.productName,
      productImage: offer.productImage,
      productDescription: offer.productDescription,
      productSlug: offer.productSlug,
      originalPrice: offer.originalPrice,
      discountedPrice: offer.discountedPrice,
      discountPercentage: offer.discountPercentage,
      endDate: offer.endDate
    };
    console.log("تعيين بيانات العرض للتعديل:", offerData);
    setOfferToAdd(offerData);
    
    // تعيين تاريخ انتهاء العرض
    try {
      const date = new Date(offer.endDate);
      console.log("تعيين تاريخ انتهاء العرض:", date);
      setSelectedEndDate(date);
    } catch (error) {
      console.error("خطأ في تعيين تاريخ انتهاء العرض:", error);
      setSelectedEndDate(undefined);
    }
    
    // عرض واجهة اختيار المنتج وتعديل العرض
    setShowProductSelector(true);
    
    // الانتقال تلقائيًا إلى تبويب تفاصيل العرض
    setTimeout(() => {
      const editOfferTab = document.querySelector('[value="editOffer"]');
      if (editOfferTab instanceof HTMLElement) {
        editOfferTab.click();
      } else {
        console.error("لم يتم العثور على تبويب تعديل العرض");
      }
    }, 100);
  };

  // حذف عرض
  const deleteOffer = (index: number) => {
    removeArrayItem('offers', index);
  };

  // تنسيق تاريخ العرض بالعربية
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'PPP', { locale: ar });
  };

  return (
    <div className="space-y-6">
      {/* الإعدادات العامة */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">الإعدادات العامة</h3>
          
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">عنوان القسم</Label>
              <Input
                id="title"
                value={settings.title || ''}
                onChange={(e) => updateSetting('title', e.target.value)}
                placeholder="عروض محدودة"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subtitle">وصف القسم</Label>
              <Textarea
                id="subtitle"
                value={settings.subtitle || ''}
                onChange={(e) => updateSetting('subtitle', e.target.value)}
                placeholder="عروض حصرية متاحة لفترة محدودة"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">العملة</Label>
                <Input
                  id="currency"
                  value={settings.currency || 'دج'}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  placeholder="دج"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="buttonText">نص زر الشراء</Label>
                <Input
                  id="buttonText"
                  value={settings.buttonText || 'تسوق الآن'}
                  onChange={(e) => updateSetting('buttonText', e.target.value)}
                  placeholder="تسوق الآن"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="layout">تخطيط العرض</Label>
                <Select
                  value={settings.layout || 'grid'}
                  onValueChange={(value) => updateSetting('layout', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر تخطيط العرض" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">شبكة</SelectItem>
                    <SelectItem value="slider">شريط متحرك</SelectItem>
                    <SelectItem value="featured">مميز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="theme">سمة التصميم</Label>
                <Select
                  value={settings.theme || 'light'}
                  onValueChange={(value) => updateSetting('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر سمة التصميم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                    <SelectItem value="primary">ألوان المتجر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxItems">الحد الأقصى للعناصر</Label>
                <Input
                  id="maxItems"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxItems || 3}
                  onChange={(e) => updateSetting('maxItems', parseInt(e.target.value))}
                />
              </div>
              
              <div className="flex items-center space-x-4 pt-6">
                <Switch
                  id="showViewAll"
                  checked={settings.showViewAll || false}
                  onCheckedChange={(checked) => updateSetting('showViewAll', checked)}
                />
                <Label htmlFor="showViewAll" className="mr-2">عرض زر "عرض الكل"</Label>
              </div>
            </div>
            
            {settings.showViewAll && (
              <div className="grid gap-2">
                <Label htmlFor="viewAllUrl">رابط صفحة "عرض الكل"</Label>
                <Input
                  id="viewAllUrl"
                  value={settings.viewAllUrl || '/offers'}
                  onChange={(e) => updateSetting('viewAllUrl', e.target.value)}
                  placeholder="/offers"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* إدارة العروض */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">العروض المحدودة</h3>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProductSelector(true);
                setEditingIndex(null);
                setSelectedProduct(null);
                setOfferToAdd({
                  discountPercentage: 0,
                  discountedPrice: 0,
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
                setSelectedEndDate(undefined);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة عرض جديد
            </Button>
          </div>
          
          {/* قائمة العروض الحالية */}
          {settings.offers && settings.offers.length > 0 ? (
            <div className="space-y-3">
              {settings.offers.map((offer, index) => (
                <Card key={offer.id} className="border border-muted">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={offer.productImage} alt={offer.productName} className="w-12 h-12 object-cover rounded-md" />
                      <div className="flex-grow">
                        <div className="font-medium">{offer.productName}</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 font-semibold">{offer.discountedPrice} {settings.currency}</span>
                          <span className="line-through text-gray-500">{offer.originalPrice} {settings.currency}</span>
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            خصم {offer.discountPercentage}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          ينتهي في: {formatDate(offer.endDate)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => editOffer(index)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteOffer(index)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed rounded-md bg-muted/30">
              <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لم تتم إضافة أي عروض بعد</p>
              <p className="text-xs text-muted-foreground mt-1">اضغط على زر "إضافة عرض جديد" لإضافة عرض محدود بوقت</p>
            </div>
          )}
          
          {/* قسم إضافة/تحرير عرض */}
          {showProductSelector && (
            <div className="mt-6 border rounded-lg p-4 bg-muted/20">
              <h4 className="font-medium mb-3">
                {editingIndex !== null ? 'تحرير العرض' : 'إضافة عرض جديد'}
              </h4>
              
              <Tabs defaultValue={selectedProduct ? "editOffer" : "selectProduct"}>
                <TabsList className="mb-4">
                  <TabsTrigger value="selectProduct">اختيار منتج</TabsTrigger>
                  <TabsTrigger 
                    value="editOffer" 
                    disabled={!selectedProduct}
                  >
                    تفاصيل العرض
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="selectProduct">
                  <div className="mb-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن منتج بالاسم أو الرمز..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {loading ? (
                      <div className="text-center p-4">جاري تحميل المنتجات...</div>
                    ) : filteredProducts.length > 0 ? (
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredProducts.map(product => (
                          <div
                            key={product.id}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted ${
                              selectedProduct?.id === product.id ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => selectProduct(product)}
                          >
                            <img
                              src={product.thumbnail_image}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-md"
                            />
                            <div className="flex-grow">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.price} {settings.currency}
                              </div>
                            </div>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <Badge className="bg-red-600">
                                خصم {calculateDiscountPercentage(product.compare_at_price, product.price)}%
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-dashed rounded-md">
                        لم يتم العثور على منتجات.
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="editOffer">
                  {selectedProduct && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                        <img
                          src={selectedProduct.thumbnail_image}
                          alt={selectedProduct.name}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                        <div>
                          <div className="font-medium">{selectedProduct.name}</div>
                          {selectedProduct.sku && (
                            <div className="text-xs text-muted-foreground">
                              الرمز: {selectedProduct.sku}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="originalPrice">السعر الأصلي</Label>
                          <Input
                            id="originalPrice"
                            type="number"
                            min={0}
                            value={offerToAdd.originalPrice || 0}
                            onChange={(e) => {
                              const originalPrice = parseFloat(e.target.value);
                              const discountPercentage = offerToAdd.discountPercentage || 0;
                              const discountedPrice = updateDiscountedPrice(originalPrice, discountPercentage);
                              
                              setOfferToAdd({
                                ...offerToAdd,
                                originalPrice,
                                discountedPrice
                              });
                            }}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="discountPercentage">نسبة الخصم (%)</Label>
                          <Input
                            id="discountPercentage"
                            type="number"
                            min={0}
                            max={100}
                            value={offerToAdd.discountPercentage || 0}
                            onChange={(e) => {
                              const discountPercentage = parseFloat(e.target.value);
                              const originalPrice = offerToAdd.originalPrice || 0;
                              const discountedPrice = updateDiscountedPrice(originalPrice, discountPercentage);
                              
                              setOfferToAdd({
                                ...offerToAdd,
                                discountPercentage,
                                discountedPrice
                              });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="discountedPrice">سعر العرض</Label>
                        <Input
                          id="discountedPrice"
                          type="number"
                          min={0}
                          value={offerToAdd.discountedPrice || 0}
                          onChange={(e) => {
                            const discountedPrice = parseFloat(e.target.value);
                            const originalPrice = offerToAdd.originalPrice || 0;
                            const discountPercentage = calculateDiscountPercentage(originalPrice, discountedPrice);
                            
                            setOfferToAdd({
                              ...offerToAdd,
                              discountedPrice,
                              discountPercentage
                            });
                          }}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">تاريخ انتهاء العرض</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedEndDate ? (
                                format(selectedEndDate, 'PPP', { locale: ar })
                              ) : (
                                <span>اختر تاريخاً</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedEndDate}
                              onSelect={(date) => {
                                setSelectedEndDate(date);
                                if (date) {
                                  setOfferToAdd({
                                    ...offerToAdd,
                                    endDate: date.toISOString()
                                  });
                                }
                              }}
                              initialFocus
                              disabled={{ before: new Date() }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowProductSelector(false)}
                        >
                          إلغاء
                        </Button>
                        <Button onClick={addOffer}>
                          {editingIndex !== null ? 'حفظ التغييرات' : 'إضافة العرض'}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CountdownOffersEditor; 