import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Trash2, 
  PlusCircle, 
  Gift, 
  Truck, 
  Percent, 
  BadgePercent,
  Eye,
  Settings,
  LayoutTemplate,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { QuantityOffer, Product } from "@/lib/api/products"; 

// Define the type for the product list prop
interface ProductListItem {
  id: string;
  name: string;
}

interface QuantityOfferSettingsProps {
  offers: QuantityOffer[];
  onChange: (newOffers: QuantityOffer[]) => void;
  organizationId: string;
  productList: ProductListItem[]; 
}

const QuantityOfferSettings = ({ offers, onChange, organizationId, productList }: QuantityOfferSettingsProps) => {
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [selectedPrice, setSelectedPrice] = useState<number>(5000); // سعر افتراضي للمعاينة

  // عروض سريعة جاهزة
  const quickTemplates = [
    {
      name: "شحن مجاني للكميات الكبيرة",
      description: "شحن مجاني عند شراء كميات أكبر",
      offers: [
        { id: "1", minQuantity: 2, type: "free_shipping", name: "شحن مجاني", description: "وفر رسوم التوصيل عند شراء قطعتين أو أكثر" }
      ]
    },
    {
      name: "خصم تدريجي",
      description: "زيادة الخصم مع زيادة الكمية",
      offers: [
        { id: "1", minQuantity: 2, type: "percentage_discount", discountValue: 10, name: "خصم 10%", description: "خصم 10% عند شراء قطعتين" },
        { id: "2", minQuantity: 3, type: "percentage_discount", discountValue: 15, name: "خصم 15%", description: "خصم 15% عند شراء 3 قطع" },
        { id: "3", minQuantity: 5, type: "percentage_discount", discountValue: 20, name: "خصم 20%", description: "خصم 20% عند شراء 5 قطع أو أكثر" }
      ]
    },
    {
      name: "اشتر واحصل على هدية",
      description: "هدية مع الشراء للكميات الكبيرة",
      offers: [
        { id: "1", minQuantity: 3, type: "buy_x_get_y_free", discountValue: 1, name: "منتج مجاني", description: "اشتر 3 واحصل على 1 مجاناً" }
      ]
    }
  ];

  const handleAddOffer = () => {
    const newOffer: QuantityOffer = {
      id: Date.now().toString(), // Temporary unique ID
      name: '',
      description: '',
      minQuantity: 2,
      type: 'free_shipping',
    };
    onChange([...offers, newOffer]);
    setActiveTab("settings");
  };

  const handleRemoveOffer = (id: string) => {
    onChange(offers.filter(offer => offer.id !== id));
  };

  const handleOfferChange = (id: string, field: keyof QuantityOffer, value: any) => {
    onChange(
      offers.map(offer =>
        offer.id === id ? { ...offer, [field]: value } : offer
      )
    );
  };

  const handleGiftProductSelect = (offerId: string, selectedProductId: string | null) => {
    const selectedProduct = selectedProductId ? productList.find(p => p.id === selectedProductId) : null;
    const productIdToSet = selectedProductId || null;
    const productNameToSet = selectedProduct ? selectedProduct.name : null;

    onChange(
      offers.map(offer =>
        offer.id === offerId 
          ? { 
              ...offer, 
              freeProductId: productIdToSet, 
              freeProductName: productNameToSet 
            } 
          : offer
      )
    );
  };

  const applyTemplate = (templateOffers: QuantityOffer[]) => {
    // Generate new IDs for all offers to avoid conflicts
    const newOffers = templateOffers.map(offer => ({
      ...offer,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
    }));
    
    onChange(newOffers);
    setActiveTab("settings");
  };

  // Helper to get correct icon based on offer type
  const getOfferTypeIcon = (type: string) => {
    switch (type) {
      case 'free_shipping': return <Truck className="h-4 w-4 text-green-600" />;
      case 'percentage_discount': return <Percent className="h-4 w-4 text-blue-600" />;
      case 'fixed_amount_discount': return <BadgePercent className="h-4 w-4 text-purple-600" />;
      case 'buy_x_get_y_free': return <Gift className="h-4 w-4 text-orange-600" />;
      default: return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getOfferTypeText = (offer: QuantityOffer): string => {
    switch (offer.type) {
      case 'free_shipping': return 'شحن مجاني';
      case 'percentage_discount': return `خصم ${offer.discountValue || 0}%`;
      case 'fixed_amount_discount': 
        return `خصم ${formatCurrency(offer.discountValue || 0)}`;
      case 'buy_x_get_y_free': {
        const giftQuantity = offer.discountValue || 1;
        const giftText = giftQuantity === 1 ? 'هدية' : `${giftQuantity} هدايا`;
        return `احصل على ${giftText}`;
      }
      default: return '';
    }
  };

  // Calculate final price after discount for preview
  const calculateFinalPrice = (basePrice: number, offer: QuantityOffer): number => {
    if (!offer) return basePrice;
    
    const quantity = offer.minQuantity;
    const totalBasePrice = basePrice * quantity;
    
    switch (offer.type) {
      case 'percentage_discount':
        if (offer.discountValue) {
          return totalBasePrice * (1 - (offer.discountValue / 100));
        }
        return totalBasePrice;
      
      case 'fixed_amount_discount':
        if (offer.discountValue) {
          return Math.max(0, totalBasePrice - offer.discountValue);
        }
        return totalBasePrice;
      
      default:
        return totalBasePrice;
    }
  };

  // Format quantity text (1 قطعة, 2 قطعتين, 3+ قطع)
  const formatQuantityText = (quantity: number): string => {
    if (quantity === 1) return 'قطعة واحدة';
    if (quantity === 2) return 'قطعتين';
    if (quantity >= 3 && quantity <= 10) return `${quantity} قطع`;
    return `${quantity} قطعة`;
  };

  return (
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

      <TabsContent value="settings" className="space-y-4">
        {offers.length === 0 ? (
          <Card className="text-center p-6">
            <CardContent className="pt-4 pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">لا توجد عروض كمية حالياً</h3>
              <p className="text-muted-foreground mb-4">أضف عروضاً للكميات المتعددة لتشجيع العملاء على شراء المزيد.</p>
              <Button variant="default" onClick={handleAddOffer} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> إضافة عرض كمية
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                {offers.map((offer, index) => (
                  <Card key={offer.id} className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getOfferTypeIcon(offer.type)}
                          <CardTitle className="text-base mr-2">
                            {offer.name || `العرض #${index + 1}`}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveOffer(offer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {`شراء ${formatQuantityText(offer.minQuantity)} أو أكثر: ${getOfferTypeText(offer)}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Accordion type="single" collapsible defaultValue="general">
                        <AccordionItem value="general" className="border-none">
                          <AccordionTrigger className="py-2 text-sm">الإعدادات العامة</AccordionTrigger>
                          <AccordionContent className="pt-2">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`offerName-${offer.id}`}>اسم العرض</Label>
                                  <Input
                                    id={`offerName-${offer.id}`}
                                    type="text"
                                    placeholder="مثال: عرض التوصيل المجاني"
                                    value={offer.name || ''}
                                    onChange={(e) => handleOfferChange(offer.id, 'name', e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`minQuantity-${offer.id}`}>الحد الأدنى للكمية</Label>
                                  <Input
                                    id={`minQuantity-${offer.id}`}
                                    type="number"
                                    min="2"
                                    value={offer.minQuantity}
                                    onChange={(e) => handleOfferChange(offer.id, 'minQuantity', parseInt(e.target.value) || 2)}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`offerDescription-${offer.id}`}>وصف العرض</Label>
                                <Textarea
                                   id={`offerDescription-${offer.id}`}
                                   placeholder="مثال: احصل على توصيل مجاني عند شراء قطعتين أو أكثر."
                                   value={offer.description || ''}
                                   onChange={(e) => handleOfferChange(offer.id, 'description', e.target.value)}
                                   className="mt-1"
                                   rows={2}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`offerType-${offer.id}`}>نوع العرض</Label>
                                <Select
                                   value={offer.type}
                                   onValueChange={(value: any) => handleOfferChange(offer.id, 'type', value)}
                                >
                                  <SelectTrigger id={`offerType-${offer.id}`} className="mt-1">
                                    <SelectValue placeholder="اختر نوع العرض" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free_shipping">توصيل مجاني</SelectItem>
                                    <SelectItem value="percentage_discount">خصم نسبة مئوية</SelectItem>
                                    <SelectItem value="fixed_amount_discount">خصم مبلغ ثابت</SelectItem>
                                    <SelectItem value="buy_x_get_y_free">منتج هدية (اشتر X واحصل على Y مجاناً)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* نوع الخصم */}
                        {(offer.type === 'percentage_discount' || offer.type === 'fixed_amount_discount' || offer.type === 'buy_x_get_y_free') && (
                          <AccordionItem value="discountDetails" className="border-none">
                            <AccordionTrigger className="py-2 text-sm">تفاصيل العرض</AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-3">
                              {offer.type === 'percentage_discount' && (
                                <div>
                                  <Label htmlFor={`discountValue-${offer.id}`}>نسبة الخصم (%)</Label>
                                  <Input
                                    id={`discountValue-${offer.id}`}
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={offer.discountValue || ''}
                                    onChange={(e) => handleOfferChange(offer.id, 'discountValue', parseFloat(e.target.value) || 0)}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">أدخل النسبة المئوية للخصم (1-100)</p>
                                </div>
                              )}
                               {offer.type === 'fixed_amount_discount' && (
                                <div>
                                  <Label htmlFor={`discountValue-${offer.id}`}>مبلغ الخصم</Label>
                                  <Input
                                    id={`discountValue-${offer.id}`}
                                    type="number"
                                    min="0"
                                    value={offer.discountValue || ''}
                                    onChange={(e) => handleOfferChange(offer.id, 'discountValue', parseFloat(e.target.value) || 0)}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">المبلغ الذي سيتم خصمه من إجمالي سعر المنتجات</p>
                                </div>
                              )}
                               {offer.type === 'buy_x_get_y_free' && (
                                <div className="space-y-3">
                                  <div>
                                    <Label htmlFor={`freeProduct-${offer.id}`}>المنتج الهدية</Label>
                                    <Select
                                      value={offer.freeProductId || ''}
                                      onValueChange={(value) => handleGiftProductSelect(offer.id, value || null)}
                                    >
                                      <SelectTrigger id={`freeProduct-${offer.id}`} className="mt-1">
                                        <SelectValue placeholder="اختر المنتج الهدية..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {productList.length === 0 && <SelectItem value="" disabled>لا توجد منتجات متاحة</SelectItem>}
                                        {productList.map((product) => (
                                          <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">المنتج الذي سيتم إضافته كهدية مجانية</p>
                                  </div>

                                  <div>
                                    <Label htmlFor={`discountValue-${offer.id}`}>كمية الهدية (Y)</Label>
                                    <Input
                                      id={`discountValue-${offer.id}`}
                                      type="number"
                                      min="1"
                                      value={offer.discountValue || 1} 
                                      onChange={(e) => handleOfferChange(offer.id, 'discountValue', parseInt(e.target.value) || 1)}
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">عدد المنتجات المجانية التي يحصل عليها العميل</p>
                                  </div>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button variant="outline" onClick={handleAddOffer} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> إضافة عرض كمية جديد
              </Button>
              <p className="text-xs text-muted-foreground">
                يمكنك إضافة عروض متعددة بحدود كمية مختلفة
              </p>
            </div>
          </>
        )}
      </TabsContent>
      
      <TabsContent value="templates">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">نماذج عروض جاهزة</h3>
          <p className="text-sm text-muted-foreground">
            اختر نموذجًا لإنشاء عروض كمية بشكل سريع. ستحل هذه العروض محل أي عروض موجودة حاليًا.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {quickTemplates.map((template, index) => (
              <Card key={index} className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-md overflow-hidden"
              )}>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {template.offers.map((offer, i) => (
                      <div key={i} className="flex items-center text-sm py-1 px-2 bg-muted/50 rounded">
                        {getOfferTypeIcon(offer.type)}
                        <span className="mr-2 flex-grow">{offer.name}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full hover:bg-primary/5 hover:text-primary"
                    onClick={() => applyTemplate(template.offers as QuantityOffer[])}
                  >
                    تطبيق النموذج
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="preview" className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">معاينة الكميات والعروض</CardTitle>
              <div className="flex items-center gap-3">
                <div className="text-sm">سعر المنتج:</div>
                <Input
                  type="number"
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-sm"
                />
              </div>
            </div>
            <CardDescription>
              هذا هو شكل عروض الكميات كما ستظهر للعملاء
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            {offers.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground">لم يتم إضافة عروض كميات حتى الآن</p>
                <Button onClick={handleAddOffer} variant="outline" className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" /> إضافة عرض كمية
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
                {/* Option for 1 item */}
                <Card className="overflow-hidden">
                  <div className="p-1 text-center text-xs font-medium bg-muted text-muted-foreground">
                    انقر للاختيار
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/5 border border-primary/20 text-muted-foreground shrink-0">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-bold text-base text-foreground">
                          {`شراء قطعة واحدة`}
                        </p>
                      </div>
                      <div className="min-w-24 text-end">
                        <span className="font-bold text-lg">
                          {formatCurrency(selectedPrice)} <span className="text-xs">د.ج</span>
                        </span>
                      </div>
                      <div className="ml-2">
                        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Options for quantity offers */}
                {offers.sort((a, b) => a.minQuantity - b.minQuantity).map((offer, index) => {
                  const baseTotal = selectedPrice * offer.minQuantity;
                  const finalPrice = calculateFinalPrice(selectedPrice, offer);
                  const hasDiscount = finalPrice < baseTotal;
                  
                  return (
                    <Card key={offer.id} className={cn(
                      "overflow-hidden transition-all duration-200",
                      index === 0 && "ring-2 ring-primary border-primary shadow-md" // selected by default
                    )}>
                      <div className={cn(
                        "p-1 text-center text-xs font-medium",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {index === 0 ? 'العرض المختار' : 'انقر للاختيار'}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex items-center justify-center h-12 w-12 rounded-full shrink-0",
                            index === 0 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-primary/5 border border-primary/20 text-muted-foreground"
                          )}>
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          <div className="flex-grow">
                            <p className={cn(
                              "font-bold text-base",
                              index === 0 ? "text-primary" : "text-foreground"
                            )}>
                              {`شراء ${formatQuantityText(offer.minQuantity)}`}
                            </p>
                            <div className="flex items-center mt-0.5">
                              <div className="flex items-center gap-1 mr-0.5">
                                {getOfferTypeIcon(offer.type)}
                                <p className={cn(
                                  "text-sm",
                                  index === 0 ? "text-primary" : "text-foreground"
                                  )}>
                                   {getOfferTypeText(offer)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-center gap-0.5 min-w-24">
                            {hasDiscount && (
                              <>
                                <span className="text-sm line-through text-muted-foreground">
                                  {baseTotal.toLocaleString()} <span className="text-xs">د.ج</span>
                                </span>
                                <span className="font-bold text-lg text-green-600">
                                  {finalPrice.toLocaleString()} <span className="text-xs">د.ج</span>
                                </span>
                              </>
                            )}
                            {!hasDiscount && (
                              <span className="font-bold text-lg">
                                {baseTotal.toLocaleString()} <span className="text-xs">د.ج</span>
                              </span>
                            )}
                          </div>
                          <div className="ml-2">
                            {index === 0 ? (
                              <div className="h-6 w-6 flex items-center justify-center">
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30"></div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

// مساعد لتنسيق العملة
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
};

export default QuantityOfferSettings;
