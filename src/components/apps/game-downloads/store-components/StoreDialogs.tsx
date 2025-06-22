import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CartItem, GameOrder, statusInfo } from './types';

interface StoreDialogsProps {
  // Cart Dialog
  showCartDialog: boolean;
  setShowCartDialog: (show: boolean) => void;
  cart: CartItem[];
  updateQuantity: (gameId: string, quantity: number) => void;
  removeFromCart: (gameId: string) => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  clearCart: () => void;
  onProceedToOrder: () => void;

  // Order Dialog
  showOrderDialog: boolean;
  setShowOrderDialog: (show: boolean) => void;
  orderForm: any;
  setOrderForm: (form: any) => void;
  submittingOrder: boolean;
  onSubmitOrder: () => void;

  // Track Dialog
  showTrackDialog: boolean;
  setShowTrackDialog: (show: boolean) => void;
  trackingNumber: string;
  setTrackingNumber: (number: string) => void;
  trackedOrder: GameOrder | null;
  onTrackOrder: () => void;
}

export default function StoreDialogs({
  showCartDialog,
  setShowCartDialog,
  cart,
  updateQuantity,
  removeFromCart,
  getTotalPrice,
  getTotalItems,
  clearCart,
  onProceedToOrder,
  showOrderDialog,
  setShowOrderDialog,
  orderForm,
  setOrderForm,
  submittingOrder,
  onSubmitOrder,
  showTrackDialog,
  setShowTrackDialog,
  trackingNumber,
  setTrackingNumber,
  trackedOrder,
  onTrackOrder,
}: StoreDialogsProps) {
  const getStatusIcon = (status: string) => {
    const statusConfig = statusInfo[status as keyof typeof statusInfo];
    if (!statusConfig) return Clock;
    
    switch (statusConfig.icon) {
      case 'Clock': return Clock;
      case 'Package': return Package;
      case 'CheckCircle': return CheckCircle;
      case 'Truck': return Truck;
      case 'XCircle': return XCircle;
      default: return Clock;
    }
  };

  return (
    <>
      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShoppingCart className="h-6 w-6 text-primary" />
              سلة التسوق
            </DialogTitle>
            <DialogDescription>
              لديك {getTotalItems()} عنصر في السلة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {cart.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">السلة فارغة</p>
                  <p className="text-sm text-muted-foreground">أضف بعض الألعاب لتبدأ التسوق</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {cart.map((item) => (
                  <Card key={item.game.id} className="border border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {item.game.images?.[0] ? (
                          <img
                            src={item.game.images[0]}
                            alt={item.game.name}
                            className="w-20 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        
                        <div className="flex-1 space-y-2">
                          <h4 className="font-semibold text-lg">{item.game.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.game.platform}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.game.price.toLocaleString()} دج
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.game.id, item.quantity - 1)}
                              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-600"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.game.id, item.quantity + 1)}
                              className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.game.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">المجموع:</span>
                        <span className="font-bold text-lg text-primary">
                          {(item.game.price * item.quantity).toLocaleString()} دج
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>الإجمالي النهائي:</span>
                      <span className="text-primary">{getTotalPrice().toLocaleString()} دج</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            {cart.length > 0 && (
              <Button variant="outline" onClick={clearCart} className="hover:bg-red-500/10 hover:text-red-600">
                مسح السلة
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowCartDialog(false)}>
              إغلاق
            </Button>
            {cart.length > 0 && (
              <Button onClick={onProceedToOrder} className="bg-gradient-to-r from-green-600 to-green-500">
                متابعة الطلب
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إتمام الطلب</DialogTitle>
            <DialogDescription>
              املأ بياناتك لإتمام عملية الطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">الاسم الكامل *</Label>
              <Input
                id="customer_name"
                value={orderForm.customer_name}
                onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                placeholder="أدخل اسمك الكامل"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer_phone">رقم الهاتف *</Label>
              <Input
                id="customer_phone"
                value={orderForm.customer_phone}
                onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                placeholder="05xxxxxxxx"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer_email">البريد الإلكتروني (اختياري)</Label>
              <Input
                id="customer_email"
                type="email"
                value={orderForm.customer_email}
                onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="device_type">نوع الجهاز (اختياري)</Label>
              <Select
                value={orderForm.device_type}
                onValueChange={(value) => setOrderForm({ ...orderForm, device_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع جهازك" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pc">كمبيوتر شخصي</SelectItem>
                  <SelectItem value="laptop">لابتوب</SelectItem>
                  <SelectItem value="playstation">بلايستيشن</SelectItem>
                  <SelectItem value="xbox">إكس بوكس</SelectItem>
                  <SelectItem value="mobile">موبايل</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="device_specs">مواصفات الجهاز (اختياري)</Label>
              <Textarea
                id="device_specs"
                value={orderForm.device_specs}
                onChange={(e) => setOrderForm({ ...orderForm, device_specs: e.target.value })}
                placeholder="مثال: Windows 11, Intel i5, 8GB RAM, GTX 1060"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
              <Textarea
                id="notes"
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="أي ملاحظات أو طلبات خاصة..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={onSubmitOrder} 
              disabled={submittingOrder || !orderForm.customer_name || !orderForm.customer_phone}
              className="bg-gradient-to-r from-green-600 to-green-500"
            >
              {submittingOrder ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Order Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              تتبع الطلب
            </DialogTitle>
            <DialogDescription>
              أدخل رقم التتبع لمعرفة حالة طلبك
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_number">رقم التتبع</Label>
              <Input
                id="tracking_number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="GAME-000001"
              />
            </div>
            
            <Button onClick={onTrackOrder} className="w-full">
              تتبع الطلب
            </Button>
            
            {trackedOrder && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">رقم التتبع:</span>
                    <span className="font-bold">{trackedOrder.tracking_number}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">الحالة:</span>
                    <div className="flex items-center gap-2">
                      {React.createElement(getStatusIcon(trackedOrder.status), { 
                        className: "h-4 w-4" 
                      })}
                      <Badge className={statusInfo[trackedOrder.status as keyof typeof statusInfo]?.color || 'bg-gray-500'}>
                        {statusInfo[trackedOrder.status as keyof typeof statusInfo]?.label || trackedOrder.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {trackedOrder.game_name && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">اللعبة:</span>
                      <span>{trackedOrder.game_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">تاريخ الطلب:</span>
                    <span className="text-sm">
                      {new Date(trackedOrder.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border/50">
                    💡 سيتم التواصل معك قريباً لتسليم الطلب
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrackDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 