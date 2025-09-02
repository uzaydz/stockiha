import React, { useState, useMemo } from 'react';
import { Search, Filter, Package, Star, Calendar, Plus, CheckCircle, TrendingUp, Tag, CreditCard, Globe, Zap, Users, Award, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SubscriptionsTabProps } from '../types';

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ 
  subscriptions, 
  categories, 
  onAddSubscription 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // State for plan selection dialog
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  // Filter subscriptions based on search and category
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription: any) => {
      const matchesSearch = !searchTerm || 
        subscription.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        subscription.category_id === selectedCategory ||
        subscription.subscription_category_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [subscriptions, searchTerm, selectedCategory]);

  // رسم أيقونة الخدمة حسب النوع
  const getServiceIcon = (serviceType: string | null | undefined) => {
    if (!serviceType) return CreditCard;
    
    switch (serviceType.toLowerCase()) {
      case 'streaming': return Globe;
      case 'gaming': return Zap;
      case 'music': return Users;
      case 'education': return Award;
      case 'vpn': return Shield;
      default: return CreditCard;
    }
  };

  // الحصول على أسعار الخدمة
  const getServicePricing = (subscription: any) => {
    // إذا كان لدينا أسعار متعددة من النظام الجديد
    if (subscription.pricing_options && subscription.pricing_options.length > 0) {
      return subscription.pricing_options.filter((p: any) => p.is_active);
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

  // معالجة إضافة الاشتراك
  const handleAddSubscription = (subscription: any) => {
    const availablePricing = getServicePricing(subscription);
    
    if (availablePricing.length > 1) {
      // إذا كان هناك أكثر من خيار سعر، اعرض نافذة الاختيار
      setSelectedService(subscription);
      setIsDurationDialogOpen(true);
    } else if (availablePricing.length === 1) {
      // إضافة مباشرة بالسعر الوحيد المتاح
      onAddSubscription(subscription, availablePricing[0]);
    } else {
      // لا توجد أسعار متاحة
    }
  };

  // إضافة الاشتراك مع السعر المحدد
  const handleAddWithPricing = (pricing: any) => {
    if (selectedService) {
      if (pricing.available_quantity <= 0) {
        return;
      }
      onAddSubscription(selectedService, pricing);
      setIsDurationDialogOpen(false);
      setSelectedService(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
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
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubscriptions.map((subscription, index) => {
              const availablePricing = getServicePricing(subscription);
              const hasMultiplePlans = availablePricing.length > 1;
              const defaultPricing = availablePricing.find((p: any) => p.is_default) || availablePricing[0];
              
              const price = subscription.price || 
                           subscription.monthly_price || 
                           subscription.selling_price || 
                           subscription.base_price ||
                           subscription.cost ||
                           (subscription.pricing_options?.[0]?.selling_price) ||
                           (defaultPricing?.selling_price) ||
                           0;

              return (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border transition-all duration-200 hover:shadow-md hover:border-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {React.createElement(getServiceIcon(subscription.service_type), { 
                              className: "h-5 w-5 text-primary" 
                            })}
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{subscription.name}</h3>
                            <p className="text-xs text-muted-foreground">{subscription.provider}</p>
                          </div>
                        </div>
                        {subscription.is_featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            مميز
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {price > 0 ? `${price.toLocaleString()} دج` : 'سعر غير محدد'}
                          </div>
                          {hasMultiplePlans && (
                            <div className="text-xs text-muted-foreground">
                              {availablePricing.length} خطط متاحة
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddSubscription(subscription);
                          }}
                          className="text-xs px-4 h-8 transition-all duration-200 bg-primary hover:bg-primary/90 hover:scale-105"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          إضافة
                        </Button>
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
            {selectedService && getServicePricing(selectedService).map((pricing: any, index: number) => {
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
                                {originalPrice.toLocaleString()} دج
                              </div>
                            )}
                            <div className="font-bold text-primary text-xl">
                              {finalPrice.toLocaleString()} دج
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {monthlyPrice.toLocaleString()} دج / شهر
                          </div>
                          {pricing.discount_percentage > 0 && (
                            <div className="text-sm text-green-600 font-medium">
                              توفر {(originalPrice - finalPrice).toLocaleString()} دج
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

export default SubscriptionsTab;
