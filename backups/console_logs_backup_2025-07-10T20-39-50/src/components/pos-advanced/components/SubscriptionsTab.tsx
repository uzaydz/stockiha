import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Plus, 
  Calendar,
  Sparkles,
  Clock,
  DollarSign
} from 'lucide-react';
import { SubscriptionsTabProps } from '../types';

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  subscriptionServices,
  subscriptionCategories,
  onAddToCart
}) => {
  const handleAddSubscription = (subscription: any) => {
    // تحويل الاشتراك إلى صيغة منتج للتوافق مع onAddToCart
    const subscriptionAsProduct = {
      id: subscription.id,
      name: subscription.name || subscription.service_name,
      price: subscription.price || subscription.monthly_price,
      description: subscription.description,
      type: 'subscription',
      subscription_data: subscription
    };
    
    onAddToCart(subscriptionAsProduct as any);
  };

  if (!subscriptionServices || subscriptionServices.length === 0) {
    return (
      <TabsContent value="subscriptions" className="flex-1 mt-0 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-4 pb-20">
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">لا توجد خدمات اشتراك</h3>
                <p className="text-muted-foreground">
                  لم يتم العثور على أي خدمات اشتراك متاحة
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="subscriptions" className="flex-1 mt-0 min-h-0">
      <ScrollArea className="h-full w-full">
        <div className="p-4 pb-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {subscriptionServices.map((subscription: any) => {
              // البحث عن معلومات الفئة
              const category = subscriptionCategories?.find((cat: any) => 
                cat.id === subscription.category_id || 
                cat.id === subscription.subscription_category_id
              );

              return (
                <motion.div
                  key={subscription.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group relative overflow-hidden ring-1 ring-border hover:ring-primary/30 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
                    {/* رأس البطاقة */}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg line-clamp-1">
                              {subscription.name || subscription.service_name || 'خدمة اشتراك'}
                            </CardTitle>
                            {category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {category.name || category.category_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* مؤشر النوع */}
                        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                          <Sparkles className="h-3 w-3 mr-1" />
                          اشتراك
                        </Badge>
                      </div>
                    </CardHeader>

                    {/* محتوى البطاقة */}
                    <CardContent className="space-y-4">
                      {/* الوصف */}
                      {subscription.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {subscription.description}
                        </p>
                      )}

                      {/* تفاصيل السعر والمدة */}
                      <div className="space-y-2">
                        {/* السعر */}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-lg">
                            {(subscription.price || subscription.monthly_price || 0).toLocaleString()} دج
                          </span>
                          {subscription.billing_period && (
                            <span className="text-sm text-muted-foreground">
                              / {subscription.billing_period === 'monthly' ? 'شهرياً' : 
                                 subscription.billing_period === 'yearly' ? 'سنوياً' : 
                                 subscription.billing_period}
                            </span>
                          )}
                        </div>

                        {/* مدة الاشتراك */}
                        {subscription.duration_months && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">
                              مدة الاشتراك: {subscription.duration_months} شهر
                            </span>
                          </div>
                        )}

                        {/* تاريخ البداية المقترح */}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-muted-foreground">
                            يبدأ من تاريخ الاشتراك
                          </span>
                        </div>
                      </div>

                      {/* زر الإضافة */}
                      <Button
                        onClick={() => handleAddSubscription(subscription)}
                        className="w-full group-hover:shadow-md transition-all duration-200 gap-2"
                        variant="default"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة للسلة
                      </Button>

                      {/* ميزات إضافية إن وجدت */}
                      {subscription.features && subscription.features.length > 0 && (
                        <div className="border-t pt-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">الميزات:</h4>
                          <div className="flex flex-wrap gap-1">
                            {subscription.features.slice(0, 3).map((feature: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {subscription.features.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{subscription.features.length - 3} أخرى
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </ScrollArea>
    </TabsContent>
  );
};

export default React.memo(SubscriptionsTab); 