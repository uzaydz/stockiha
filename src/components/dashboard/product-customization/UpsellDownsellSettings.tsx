import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Trash2, 
  PlusCircle, 
  ArrowDown, 
  ArrowUp, 
  Crown, 
  Star, 
  BadgePercent, 
  Eye, 
  Settings, 
  LayoutTemplate,
  ArrowUpRight,
  ShoppingCart,
  BadgePercent as BadgePercentIcon,
  Zap,
  Percent
} from "lucide-react";
import type { UpsellDownsellItem, Product } from "@/lib/api/products";
import { searchProductsByName, getProductById } from '@/lib/api/products';
import { DebounceInput } from 'react-debounce-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import UpsellDownsellDisplay from '@/components/store/product-purchase/UpsellDownsellDisplay';

interface UpsellDownsellSettingsProps {
  upsells: UpsellDownsellItem[];
  downsells: UpsellDownsellItem[];
  onChange: (type: 'upsell' | 'downsell', items: UpsellDownsellItem[]) => void;
  organizationId: string;
  productName?: string; // اسم المنتج الأصلي للمعاينة
}

const UpsellDownsellSettings = ({ 
  upsells, 
  downsells, 
  onChange, 
  organizationId,
  productName = "المنتج الأصلي" 
}: UpsellDownsellSettingsProps) => {
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [activeType, setActiveType] = useState<'upsell' | 'downsell'>('upsell');

  // نماذج جاهزة 
  const quickTemplates = {
    upsell: [
      {
        name: "ترقية بسيطة",
        description: "منتج واحد بخصم صغير لتشجيع الترقية",
        items: [
          { 
            id: "u1", 
            productId: "", 
            discountType: "percentage", 
            discountValue: 10,
            product: null
          }
        ]
      },
      {
        name: "ترقية مغرية",
        description: "منتج واحد بخصم كبير لتشجيع الترقية",
        items: [
          { 
            id: "u2", 
            productId: "", 
            discountType: "percentage", 
            discountValue: 25,
            product: null
          }
        ]
      }
    ],
    downsell: [
      {
        name: "بديل اقتصادي",
        description: "منتج واحد أرخص كبديل",
        items: [
          { 
            id: "d1", 
            productId: "", 
            discountType: "percentage", 
            discountValue: 5,
            product: null 
          }
        ]
      },
      {
        name: "بديل بخصم كبير",
        description: "منتج بديل بخصم كبير لزيادة فرص التحويل",
        items: [
          { 
            id: "d2", 
            productId: "", 
            discountType: "percentage", 
            discountValue: 20,
            product: null 
          }
        ]
      }
    ]
  };

  // تطبيق نموذج جاهز
  const applyTemplate = (template: any, type: 'upsell' | 'downsell') => {
    const newItems = template.items.map((item: UpsellDownsellItem) => ({
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
    }));
    
    onChange(type, newItems);
    setActiveTab("settings");
  };

  // مكون رندر القائمة المشتركة
  const renderList = (type: 'upsell' | 'downsell') => {
    const items = type === 'upsell' ? upsells : downsells;
    const [searchResults, setSearchResults] = useState<Partial<Product>[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

    const handleAddItem = () => {
      const newItem: UpsellDownsellItem = {
        id: Date.now().toString(), // معرف مؤقت فريد
        productId: '',
        discountType: 'percentage',
        discountValue: 10,
      };
      onChange(type, [...items, newItem]);
    };

    const handleRemoveItem = (id: string) => {
      onChange(type, items.filter(item => item.id !== id));
    };

    const handleProductSearch = async (query: string, itemId: string) => {
      // تحديث قيمة البحث الحالية
      setSearchQueries(prev => ({ ...prev, [itemId]: query }));
      
      if (query.length < 2 || !organizationId) {
        setSearchResults([]);
        return;
      }

      setIsLoadingSearch(true);
      try {
        const results = await searchProductsByName(query, organizationId);
        const selectedIds = items.map(i => i.productId);
        const filteredResults = results.filter(r => !selectedIds.includes(r.id));
        setSearchResults(filteredResults);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    const handleProductSelect = (itemId: string, product: Partial<Product>) => {
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, productId: product.id!, product: product } : item
      );
      onChange(type, updatedItems);
      setSearchResults([]);
      
      // تحديث قيمة البحث بالاسم المحدد
      setSearchQueries(prev => ({ ...prev, [itemId]: product.name || '' }));
    };

    const handleDiscountChange = (itemId: string, field: 'discountType' | 'discountValue', value: any) => {
      const updatedItems = items.map(item => {
        if (item.id !== itemId) {
          return item;
        }

        if (field === 'discountType') {
          const typedValue = value as 'percentage' | 'fixed' | 'none';
          if (typedValue === 'none') {
            return { ...item, discountType: 'none', discountValue: 0 };
          } else {
            return { ...item, discountType: typedValue };
          }
        } else if (field === 'discountValue') {
          const numericValue = parseFloat(value) || 0;
          return { ...item, discountValue: numericValue };
        } else {
          return item;
        }
      });
      onChange(type, updatedItems as UpsellDownsellItem[]);
    };

    return (
      <div className="space-y-3">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              {type === 'upsell' ? 
                <Crown className="mr-2 h-5 w-5 text-amber-500"/> : 
                <Star className="mr-2 h-5 w-5 text-blue-500"/>
              }
              <CardTitle className="text-base">
                {type === 'upsell' ? 'منتجات Upsell (الترقية)' : 'منتجات Downsell (البديل)'}
              </CardTitle>
            </div>
            <CardDescription>
              {type === 'upsell'
                ? 'منتجات تقترحها على العميل كبديل أفضل أو مكمل للمنتج الحالي.'
                : 'منتجات تقترحها كبديل أرخص أو مختلف إذا تردد العميل في شراء المنتج الأصلي.'}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-4">
            <ScrollArea className="max-h-[400px] pr-2">
              {items.length === 0 ? (
                <div className="text-center p-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {type === 'upsell' ? 
                      <ArrowUpRight className="h-6 w-6 text-primary" /> : 
                      <ArrowDown className="h-6 w-6 text-primary" />
                    }
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {type === 'upsell' 
                      ? 'لا توجد منتجات ترقية حالياً' 
                      : 'لا توجد منتجات بديلة حالياً'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {type === 'upsell'
                      ? 'أضف منتجات ترقية لزيادة متوسط قيمة الطلب.'
                      : 'أضف منتجات بديلة لاستعادة العملاء المترددين.'
                    }
                  </p>
                  <Button variant="default" onClick={handleAddItem} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> 
                    {type === 'upsell' ? 'إضافة منتج ترقية' : 'إضافة منتج بديل'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <Card key={item.id} className={cn(
                      "relative overflow-hidden",
                      type === 'upsell' 
                        ? 'hover:border-amber-200 hover:shadow-amber-100/20' 
                        : 'hover:border-blue-200 hover:shadow-blue-100/20'
                    )}>
                      <CardHeader className={cn(
                        "pb-2 flex flex-row items-center justify-between",
                        type === 'upsell' ? 'bg-amber-50/50 dark:bg-amber-950/10' : 'bg-blue-50/50 dark:bg-blue-950/10'
                      )}>
                        <div className="flex items-center">
                          {type === 'upsell' ? 
                            <Crown className="mr-2 h-4 w-4 text-amber-500"/> : 
                            <Star className="mr-2 h-4 w-4 text-blue-500"/>
                          }
                          <CardTitle className="text-sm font-medium">
                            {item.product?.name || (type === 'upsell' ? 'منتج ترقية جديد' : 'منتج بديل جديد')}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="relative">
                          <Label htmlFor={`productSearch-${type}-${item.id}`}>المنتج المقترح</Label>
                          <DebounceInput
                            minLength={2}
                            debounceTimeout={300}
                            element={Input as unknown as React.ComponentType<any>}
                            id={`productSearch-${type}-${item.id}`}
                            placeholder="ابحث عن اسم المنتج..."
                            onChange={(e) => handleProductSearch(e.target.value, item.id)}
                            className="mt-1 pr-8"
                            value={searchQueries[item.id] || item.product?.name || ''}
                          />
                          {isLoadingSearch && <p className="text-xs text-muted-foreground mt-1">جاري البحث...</p>}
                          {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-background border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                              {searchResults.map((product) => (
                                <div
                                  key={product.id}
                                  className="p-2 hover:bg-muted cursor-pointer text-sm flex items-center gap-2"
                                  onClick={() => handleProductSelect(item.id, product)}
                                >
                                  {product.thumbnail_image && (
                                    <img 
                                      src={product.thumbnail_image} 
                                      alt={product.name} 
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <div>{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{formatCurrency(product.price || 0)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <Input type="hidden" value={item.productId || ''} />
                        </div>
                        
                        {item.productId && (
                          <Accordion type="single" collapsible defaultValue="discount">
                            <AccordionItem value="discount" className="border-none">
                              <AccordionTrigger className="py-2 text-sm">إعدادات الخصم</AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`discountType-${type}-${item.id}`}>نوع الخصم</Label>
                                    <Select
                                      value={item.discountType || 'none'}
                                      onValueChange={(value) => handleDiscountChange(item.id, 'discountType', value)}
                                    >
                                      <SelectTrigger id={`discountType-${type}-${item.id}`} className="mt-1">
                                        <SelectValue placeholder="اختر نوع الخصم" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">بدون خصم</SelectItem>
                                        <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {(item.discountType === 'percentage' || item.discountType === 'fixed') && (
                                    <div>
                                      <Label htmlFor={`discountValue-${type}-${item.id}`}>
                                        {item.discountType === 'percentage' ? 'نسبة الخصم' : 'مبلغ الخصم'}
                                      </Label>
                                      <Input
                                        id={`discountValue-${type}-${item.id}`}
                                        type="number"
                                        min="0"
                                        value={item.discountValue || ''}
                                        onChange={(e) => handleDiscountChange(item.id, 'discountValue', e.target.value)}
                                        className="mt-1"
                                      />
                                      {item.discountType === 'percentage' && 
                                      <p className="text-xs text-muted-foreground mt-1">أدخل النسبة بدون علامة %</p>}
                                      {item.discountType === 'fixed' && 
                                      <p className="text-xs text-muted-foreground mt-1">سيتم خصم هذا المبلغ من سعر المنتج المقترح.</p>}
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex items-center gap-2 border-t p-4">
            <Button variant="outline" onClick={handleAddItem} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> 
              {type === 'upsell' ? 'إضافة منتج ترقية' : 'إضافة منتج بديل'}
            </Button>
            <p className="text-xs text-muted-foreground mr-auto">
              {type === 'upsell' 
                ? 'يتم عرض منتج ترقية واحد فقط للعميل' 
                : 'يتم عرض منتج بديل واحد فقط للعميل'}
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // مكون المعاينة
  const PreviewSection = () => {
    const items = activeType === 'upsell' ? upsells : downsells;
    
    // إذا لم توجد عناصر للمعاينة
    if (!items.length || !items[0].productId) {
      return (
        <div className="text-center py-8">
          {activeType === 'upsell' ? 
            <Crown className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /> :
            <Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          }
          <p className="text-muted-foreground">
            {activeType === 'upsell' 
              ? 'لم يتم إضافة منتجات ترقية للمعاينة' 
              : 'لم يتم إضافة منتجات بديلة للمعاينة'
            }
          </p>
          <Button 
            onClick={() => setActiveTab("settings")}
            variant="outline" 
            className="mt-4"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 
            {activeType === 'upsell' ? 'إضافة منتج ترقية' : 'إضافة منتج بديل'}
          </Button>
        </div>
      );
    }

    // كود المعاينة باستخدام مكون UpsellDownsellDisplay
    return (
      <div className="max-w-lg mx-auto">
        <UpsellDownsellDisplay
          items={items}
          type={activeType}
          onAcceptOffer={() => {}}
          originalProductName={productName}
        />
      </div>
    );
  };

  // مكون قوالب جاهزة
  const TemplatesSection = () => {
    const templates = activeType === 'upsell' ? quickTemplates.upsell : quickTemplates.downsell;
    
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {activeType === 'upsell' ? 'نماذج منتجات الترقية الجاهزة' : 'نماذج المنتجات البديلة الجاهزة'}
        </h3>
        <p className="text-sm text-muted-foreground">
          اختر نموذجًا جاهزًا لإنشاء {activeType === 'upsell' ? 'عرض ترقية' : 'عرض بديل'} بشكل سريع.
          ستحتاج إلى اختيار المنتج المناسب بعد تطبيق النموذج.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {templates.map((template, index) => (
            <Card key={index} className={cn(
              "cursor-pointer transition-all overflow-hidden",
              activeType === 'upsell' 
                ? "hover:border-amber-300 hover:shadow-amber-100/50"
                : "hover:border-blue-300 hover:shadow-blue-100/50"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {template.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/50 rounded">
                      {item.discountType === 'percentage' ? (
                        <Percent className="h-4 w-4 text-primary" />
                      ) : item.discountType === 'fixed' ? (
                        <BadgePercentIcon className="h-4 w-4 text-primary" />
                      ) : (
                        <Zap className="h-4 w-4 text-primary" />
                      )}
                      <span className="flex-grow">
                        {item.discountType === 'percentage' ? `خصم ${item.discountValue}%` : 
                         item.discountType === 'fixed' ? `خصم ${item.discountValue} د.ج` : 
                         'بدون خصم'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full",
                    activeType === 'upsell' 
                      ? "hover:bg-amber-50 hover:text-amber-600" 
                      : "hover:bg-blue-50 hover:text-blue-600"
                  )}
                  onClick={() => applyTemplate(template, activeType)}
                >
                  تطبيق النموذج
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="settings" className="w-1/3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>الإعدادات</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="w-1/3 flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <span>نماذج جاهزة</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="w-1/3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>معاينة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="space-y-6">
            {renderList('upsell')}
            {renderList('downsell')}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-4">
            <Tabs defaultValue="upsell" onValueChange={(value) => setActiveType(value as 'upsell' | 'downsell')}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="upsell" className="w-1/2 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>نماذج الترقية (Upsell)</span>
                </TabsTrigger>
                <TabsTrigger value="downsell" className="w-1/2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span>نماذج البدائل (Downsell)</span>
                </TabsTrigger>
              </TabsList>
              <TemplatesSection />
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">معاينة عروض الترقية والبدائل</CardTitle>
                <div>
                  <Select value={activeType} onValueChange={(value) => setActiveType(value as 'upsell' | 'downsell')}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="اختر نوع العرض" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upsell">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span>معاينة الترقية (Upsell)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="downsell">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-500" />
                          <span>معاينة البديل (Downsell)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>
                هذا هو شكل {activeType === 'upsell' ? 'عروض الترقية' : 'العروض البديلة'} كما ستظهر للعملاء
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="p-6">
              <PreviewSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
     return 'السعر غير متوفر';
  }
  return `${amount.toLocaleString()} د.ج`;
};

export default UpsellDownsellSettings;
