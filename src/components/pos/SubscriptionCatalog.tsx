import React, { useState } from 'react';
import { Search, Filter, Package, Tag, Star, Zap, Calendar, TrendingUp, Clock, Shield, Globe, CreditCard, Users, Award, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';

// Types
interface SubscriptionServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SubscriptionServicePricing {
  id: string;
  duration_months: number;
  duration_label: string;
  purchase_price: number;
  selling_price: number;
  profit_margin: number;
  profit_amount: number;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  is_default: boolean;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  discount_percentage: number;
  promo_text: string;
  bonus_days: number;
  features?: any[];
  limitations?: any;
}

interface SubscriptionService {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description: string;
  provider: string;
  service_type: string;
  supported_countries: any[];
  available_durations: any[]; // للتوافق مع الإصدارات القديمة
  selling_price: number; // للتوافق مع الإصدارات القديمة
  purchase_price: number; // للتوافق مع الإصدارات القديمة
  profit_margin: number;
  profit_amount: number;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  is_featured: boolean;
  is_active: boolean;
  logo_url: string;
  terms_conditions: string;
  usage_instructions: string;
  support_contact: string;
  rating?: number;
  review_count?: number;
  pricing_options?: SubscriptionServicePricing[];
  category?: SubscriptionServiceCategory;
}

interface SubscriptionCatalogProps {
  subscriptions: SubscriptionService[];
  categories: SubscriptionServiceCategory[];
  onAddToCart: (subscription: SubscriptionService, pricing?: SubscriptionServicePricing) => void;
}

const SubscriptionCatalog: React.FC<SubscriptionCatalogProps> = ({
  subscriptions,
  categories,
  onAddToCart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<SubscriptionService | null>(null);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Debug: مراقبة البيانات الواردة
  React.useEffect(() => {
  }, [subscriptions, categories]);

  // حساب إحصائيات سريعة
  const stats = {
    total: subscriptions.length,
    available: subscriptions.filter(s => {
      if (!s.is_active) return false;
      
      // فحص الكمية المتاحة بناءً على نظام الأسعار
      if (s.pricing_options && s.pricing_options.length > 0) {
        const hasPricingStock = s.pricing_options.some(p => p.is_active && p.available_quantity > 0);
        const hasServiceStock = s.available_quantity > 0;
        return hasPricingStock || hasServiceStock;
      } else {
        return s.available_quantity > 0;
      }
    }).length,
    featured: subscriptions.filter(s => s.is_featured && s.is_active).length,
    totalValue: subscriptions.reduce((sum, s) => {
      // حساب القيمة الإجمالية بناءً على نظام الأسعار
      if (s.pricing_options && s.pricing_options.length > 0) {
        return sum + s.pricing_options.reduce((pSum, p) => 
          pSum + (p.selling_price * p.available_quantity), 0);
      } else {
        return sum + (s.selling_price * s.available_quantity);
      }
    }, 0)
  };

  // تصفية الاشتراكات
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || subscription.category_id === selectedCategory;
    
    // التحقق من الحالة النشطة والكمية المتاحة
    let isAvailable = subscription.is_active;
    
    // فحص الكمية المتاحة بناءً على نظام الأسعار
    if (subscription.pricing_options && subscription.pricing_options.length > 0) {
      // استخدام نظام الأسعار الجديد - فحص إذا كان هناك كمية متاحة
      isAvailable = isAvailable && (
        subscription.pricing_options.some(p => p.is_active && p.available_quantity > 0) ||
        subscription.available_quantity > 0
      );
    } else {
      // استخدام النظام القديم - فحص الكمية الأساسية
      isAvailable = isAvailable && subscription.available_quantity > 0;
    }
    
    return matchesSearch && matchesCategory && isAvailable;
  });

  // Debug: نتائج التصفية
  React.useEffect(() => {
  }, [filteredSubscriptions, searchTerm, selectedCategory]);

  // الحصول على معلومات الفئة
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || { name: 'غير محدد', icon: 'package' };
  };

  // الحصول على أسعار الخدمة
  const getServicePricing = (subscription: SubscriptionService) => {
    // إذا كان لدينا أسعار متعددة من النظام الجديد
    if (subscription.pricing_options && subscription.pricing_options.length > 0) {
      return subscription.pricing_options.filter(p => p.is_active);
    }
    
    // للتوافق مع النظام القديم
    if (subscription.available_durations && subscription.available_durations.length > 0) {
      return subscription.available_durations.map((duration: any, index: number) => ({
        id: `legacy-${subscription.id}-${index}`,
        duration_months: duration.months || 1,
        duration_label: duration.label || 'شهر واحد',
        purchase_price: subscription.purchase_price || 0,
        selling_price: subscription.selling_price || 0,
        profit_margin: subscription.profit_margin || 0,
        profit_amount: subscription.profit_amount || 0,
        total_quantity: subscription.total_quantity || 1,
        available_quantity: subscription.available_quantity || 1,
        sold_quantity: subscription.sold_quantity || 0,
        is_default: index === 0,
        is_active: true,
        is_featured: subscription.is_featured || false,
        display_order: index,
        discount_percentage: 0,
        promo_text: '',
        bonus_days: 0
      }));
    }
    
    // إنشاء سعر افتراضي
    return [{
      id: `default-${subscription.id}`,
      duration_months: 1,
      duration_label: 'شهر واحد',
      purchase_price: subscription.purchase_price || 0,
      selling_price: subscription.selling_price || 0,
      profit_margin: subscription.profit_margin || 0,
      profit_amount: subscription.profit_amount || 0,
      total_quantity: subscription.total_quantity || 1,
      available_quantity: subscription.available_quantity || 1,
      sold_quantity: subscription.sold_quantity || 0,
      is_default: true,
      is_active: true,
      is_featured: subscription.is_featured || false,
      display_order: 0,
      discount_percentage: 0,
      promo_text: '',
      bonus_days: 0
    }];
  };

  // الحصول على أقل سعر للخدمة
  const getLowestPrice = (subscription: SubscriptionService) => {
    const pricing = getServicePricing(subscription);
    if (pricing.length === 0) return subscription.selling_price || 0;
    return Math.min(...pricing.map(p => p.selling_price * (1 - (p.discount_percentage || 0) / 100)));
  };

  // الحصول على أعلى سعر للخدمة
  const getHighestPrice = (subscription: SubscriptionService) => {
    const pricing = getServicePricing(subscription);
    if (pricing.length === 0) return subscription.selling_price || 0;
    return Math.max(...pricing.map(p => p.selling_price));
  };

  // التعامل مع إضافة الاشتراك للسلة
  const handleAddSubscription = (subscription: SubscriptionService) => {
    const availablePricing = getServicePricing(subscription);
    
    if (availablePricing.length > 1) {
      // إذا كان هناك أكثر من خيار سعر، اعرض نافذة الاختيار
      setSelectedService(subscription);
      setIsDurationDialogOpen(true);
    } else if (availablePricing.length === 1) {
      // إضافة مباشرة بالسعر الوحيد المتاح
      onAddToCart(subscription, availablePricing[0]);
    } else {
      // لا توجد أسعار متاحة
    }
  };

  // إضافة الاشتراك مع السعر المحدد
  const handleAddWithPricing = (pricing: SubscriptionServicePricing) => {
    if (selectedService) {
      if (pricing.available_quantity <= 0) {
        return;
      }
      onAddToCart(selectedService, pricing);
      setIsDurationDialogOpen(false);
      setSelectedService(null);
    }
  };

  // رسم أيقونة الخدمة حسب النوع
  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'streaming': return Globe;
      case 'gaming': return Zap;
      case 'music': return Users;
      case 'education': return Award;
      case 'vpn': return Shield;
      default: return CreditCard;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* شريط الأدوات والفلاتر */}
      <div className="flex-shrink-0 space-y-3 p-4 bg-muted/20 border-b">
        {/* أدوات البحث الرئيسية */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ابحث عن خدمة اشتراك، مقدم، أو وصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-background border-border focus:border-primary/50"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary/10 border-primary/50")}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* فلاتر إضافية */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">الفئة:</span>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-56 bg-background">
                <SelectValue>
                  {selectedCategory === 'all' 
                    ? `جميع الفئات (${stats.total})`
                    : `${getCategoryInfo(selectedCategory).name} (${filteredSubscriptions.length})`
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>جميع الفئات</span>
                    <Badge variant="default" className="text-xs mr-auto">
                      {stats.total}
                    </Badge>
                  </div>
                </SelectItem>
                
                <Separator className="my-1" />
                
                {categories.map((category) => {
                  const categoryCount = subscriptions.filter(s => {
                    if (s.category_id !== category.id || !s.is_active) return false;
                    
                    // فحص الكمية المتاحة بناءً على نظام الأسعار
                    if (s.pricing_options && s.pricing_options.length > 0) {
                      return s.pricing_options.some(p => p.is_active && p.available_quantity > 0);
                    } else {
                      return s.available_quantity > 0;
                    }
                  }).length;
                  return (
                    <SelectItem 
                      key={category.id} 
                      value={category.id}
                      disabled={categoryCount === 0}
                      className={cn(categoryCount === 0 && "opacity-60")}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span>{category.name}</span>
                        <Badge variant="secondary" className="text-xs mr-auto">
                          {categoryCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* إحصائيات سريعة */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4 text-blue-500" />
            <span>المجموع: {stats.total}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>المتاح: {stats.available}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>مميز: {stats.featured}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>القيمة الإجمالية: {formatPrice(stats.totalValue)}</span>
          </div>
        </motion.div>

        {/* تصفية نشطة */}
        {(searchTerm || selectedCategory !== 'all') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">النتائج:</span>
            <Badge variant="outline" className="bg-background/80">
              {filteredSubscriptions.length} خدمة
            </Badge>
            {searchTerm && (
              <Badge variant="outline" className="bg-background/80">
                بحث: {searchTerm}
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="outline" className="bg-background/80">
                {getCategoryInfo(selectedCategory).name}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="h-6 px-2 text-xs"
            >
              مسح الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* قائمة الاشتراكات */}
      <ScrollArea className="flex-1">
        {filteredSubscriptions.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center p-8 bg-muted/30 rounded-xl max-w-md mx-4">
              <CreditCard className="h-16 w-16 mb-4 mx-auto opacity-20" />
              <h3 className="text-lg font-medium mb-2">لا توجد خدمات اشتراك</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'لم يتم العثور على خدمات تطابق البحث المحدد'
                  : 'لم يتم العثور على أي خدمات اشتراك متاحة في هذه المؤسسة'
                }
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="bg-background/80"
                >
                  إعادة ضبط الفلاتر
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 p-4">
            {filteredSubscriptions.map((subscription, index) => {
              const ServiceIcon = getServiceIcon(subscription.service_type);
              const categoryInfo = getCategoryInfo(subscription.category_id);
              
              return (
                <motion.div
                  key={subscription.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="group"
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-lg border-border/50",
                      "hover:border-primary/50 hover:scale-[1.02] relative overflow-hidden bg-card/50",
                      subscription.is_featured && "ring-1 ring-primary/20 border-primary/30"
                    )}
                    onClick={() => handleAddSubscription(subscription)}
                  >
                    {/* شريط علوي للخدمات المميزة */}
                    {subscription.is_featured && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 to-primary" />
                    )}
                    
                    <CardContent className="p-4 space-y-3">
                      {/* رأس البطاقة */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {subscription.logo_url ? (
                            <img 
                              src={subscription.logo_url} 
                              alt={subscription.name}
                              className="w-12 h-12 rounded-lg object-contain bg-white p-1.5 border border-border/20 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center border border-primary/20">
                              <ServiceIcon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {subscription.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{subscription.provider}</span>
                            </p>
                          </div>
                        </div>
                        
                        {subscription.is_featured && (
                          <Badge variant="outline" className="bg-primary/5 border-primary/30 text-primary text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            مميز
                          </Badge>
                        )}
                      </div>

                      {/* الوصف */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {subscription.description}
                      </p>

                      {/* معلومات الفئة والمدد */}
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="bg-muted/40 text-muted-foreground">
                          {categoryInfo.name}
                        </Badge>
                        
                        {(() => {
                          const availablePricing = getServicePricing(subscription);
                          return availablePricing.length > 1 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{availablePricing.length} خيار</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* الجزء السفلي - السعر والزر */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/30">
                        <div className="text-left">
                          {(() => {
                            const availablePricing = getServicePricing(subscription);
                            const lowestPrice = getLowestPrice(subscription);
                            const highestPrice = getHighestPrice(subscription);
                            
                            if (availablePricing.length > 1 && lowestPrice !== highestPrice) {
                              return (
                                <div>
                                  <div className="text-lg font-bold text-primary">
                                    {formatPrice(lowestPrice)} - {formatPrice(highestPrice)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {availablePricing.length} خيار سعر
                                  </div>
                                </div>
                              );
                            } else {
                              const defaultPricing = availablePricing.find(p => p.is_default) || availablePricing[0];
                              const finalPrice = defaultPricing ? 
                                defaultPricing.selling_price * (1 - (defaultPricing.discount_percentage || 0) / 100) : 
                                subscription.selling_price;
                              
                              return (
                                <div>
                                  <div className="text-lg font-bold text-primary">
                                    {formatPrice(finalPrice)}
                                  </div>
                                  <div className={cn(
                                    "text-xs",
                                    (defaultPricing?.available_quantity || 0) > 0 
                                      ? "text-muted-foreground" 
                                      : "text-red-500 font-medium"
                                  )}>
                                    {(defaultPricing?.available_quantity || 0) > 0 
                                      ? `متاح: ${defaultPricing?.available_quantity || 0}`
                                      : "نفد المخزون"
                                    }
                                  </div>
                                  {defaultPricing?.discount_percentage > 0 && (
                                    <div className="text-xs text-green-600 font-medium">
                                      وفر {defaultPricing.discount_percentage}%
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          })()}
                        </div>
                        
                        {(() => {
                          const availablePricing = getServicePricing(subscription);
                          const hasStock = availablePricing.some(p => p.available_quantity > 0);
                          
                          return (
                            <Button 
                              size="sm" 
                              disabled={!hasStock}
                              onClick={() => hasStock && handleAddSubscription(subscription)}
                              className={cn(
                                "text-xs px-4 h-8 transition-all duration-200",
                                hasStock 
                                  ? "bg-primary hover:bg-primary/90 hover:scale-105" 
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                              )}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {hasStock ? "إضافة" : "نفد المخزون"}
                            </Button>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* نافذة اختيار السعر والمدة */}
      <Dialog open={isDurationDialogOpen} onOpenChange={setIsDurationDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              اختيار خطة الاشتراك
            </DialogTitle>
            <DialogDescription>
              اختر خطة الاشتراك المناسبة لـ <span className="font-medium text-foreground">{selectedService?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedService && getServicePricing(selectedService).map((pricing: SubscriptionServicePricing, index: number) => {
              const finalPrice = pricing.selling_price * (1 - (pricing.discount_percentage || 0) / 100);
              const monthlyPrice = finalPrice / pricing.duration_months;
              const originalPrice = pricing.selling_price;
              
              return (
                <motion.div
                  key={pricing.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={cn(
                      "border transition-all duration-200 relative",
                      pricing.available_quantity > 0 
                        ? "cursor-pointer hover:shadow-md hover:border-primary/50 hover:scale-[1.01]"
                        : "opacity-50 cursor-not-allowed",
                      pricing.is_featured && "ring-2 ring-primary/30 border-primary/50"
                    )}
                    onClick={() => pricing.available_quantity > 0 && handleAddWithPricing(pricing)}
                  >
                    {/* شارة مميزة */}
                    {pricing.is_featured && (
                      <div className="absolute -top-2 left-4 z-10">
                        <Badge className="bg-primary text-primary-foreground">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {pricing.promo_text || 'الأكثر شعبية'}
                        </Badge>
                      </div>
                    )}
                    
                    {/* شارة الخصم */}
                    {pricing.discount_percentage > 0 && (
                      <div className="absolute -top-2 right-4 z-10">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          وفر {pricing.discount_percentage}%
                        </Badge>
                      </div>
                    )}
                    
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            {pricing.duration_label}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {pricing.duration_months} {pricing.duration_months === 1 ? 'شهر' : 'أشهر'}
                          </div>
                          {pricing.promo_text && !pricing.is_featured && (
                            <div className="text-xs text-primary font-medium">
                              {pricing.promo_text}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            متاح: {pricing.available_quantity} وحدة
                          </div>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2">
                            {pricing.discount_percentage > 0 && (
                              <div className="text-sm text-muted-foreground line-through">
                                {formatPrice(originalPrice)}
                              </div>
                            )}
                            <div className="font-bold text-primary text-xl">
                              {formatPrice(finalPrice)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatPrice(monthlyPrice)} / شهر
                          </div>
                          {pricing.discount_percentage > 0 && (
                            <div className="text-sm text-green-600 font-medium">
                              توفر {formatPrice(originalPrice - finalPrice)}
                            </div>
                          )}
                          {pricing.bonus_days > 0 && (
                            <div className="text-xs text-blue-600">
                              + {pricing.bonus_days} يوم مجاني
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* الميزات الإضافية */}
                      {pricing.features && Array.isArray(pricing.features) && pricing.features.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <div className="text-xs text-muted-foreground mb-2">الميزات المضمنة:</div>
                          <div className="flex flex-wrap gap-1">
                            {pricing.features.map((feature: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionCatalog;
