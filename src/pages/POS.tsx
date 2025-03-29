import React, { useState } from 'react';
import { 
  Search, 
  X, 
  ShoppingCart, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  Printer, 
  QrCode,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Product, User, OrderStatus } from '@/types';
import { useShop } from '@/context/ShopContext';
import Layout from '@/components/Layout';
import { getCategoryName } from '@/data/mockData';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

interface POSCartItem {
  product: Product;
  quantity: number;
}

const POS = () => {
  const { products, addOrder, addTransaction, users, currentUser } = useShop();
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  
  const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + tax;
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === null || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const customers = users.filter(user => user.role === 'customer');
  
  const categories = Array.from(new Set(products.map(product => product.category)));
  
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };
  
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      ));
    }
  };
  
  const clearCart = () => {
    setCart([]);
  };
  
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "لا توجد منتجات في السلة",
        description: "الرجاء إضافة منتجات قبل إتمام عملية الدفع",
        variant: "destructive",
      });
      return;
    }
    
    const newOrder = {
      customerId: selectedCustomer,
      items: cart.map(item => ({
        id: nanoid(),
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        isDigital: item.product.isDigital || false,
      })),
      subtotal,
      tax,
      total,
      status: 'completed' as OrderStatus,
      paymentMethod: paymentMethod === 'cash' ? 'نقدي' : 'بطاقة ائتمان',
      paymentStatus: 'paid' as 'pending' | 'paid' | 'failed',
      isOnline: false,
      employeeId: currentUser?.id || ''
    };
    
    addOrder(newOrder);
    
    addTransaction({
      orderId: Date.now().toString(),
      amount: total,
      type: 'sale',
      paymentMethod: paymentMethod === 'cash' ? 'نقدي' : 'بطاقة ائتمان',
      description: 'مبيعات في المتجر',
      employeeId: currentUser?.id
    });
    
    toast.success('تم إكمال العملية بنجاح');
    
    setIsCheckoutOpen(false);
    clearCart();
    setPaymentMethod('cash');
    setSelectedCustomer('');
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4">
        <div className="lg:w-2/3 bg-card rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن منتجات بالاسم أو رقم SKU..."
                  className="pl-8 text-right"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  dir="rtl"
                />
              </div>
              <Select onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="جميع الفئات" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {getCategoryName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${product.stockQuantity <= 0 ? 'opacity-50' : ''}`}
                  onClick={() => product.stockQuantity > 0 && addToCart(product)}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.thumbnailImage || '/placeholder.svg'}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium truncate text-sm">{product.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-primary font-bold">{product.price} ر.س</span>
                      <span className="text-xs text-muted-foreground">
                        {product.stockQuantity > 0 ? `المخزون: ${product.stockQuantity}` : 'نفذت الكمية'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">لا توجد منتجات متطابقة مع معايير البحث</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:w-1/3 bg-card rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center">
              <ShoppingCart className="ml-2 h-5 w-5" />
              سلة المشتريات
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <X className="h-4 w-4 ml-1" />
                مسح
              </Button>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  السلة فارغة، قم بإضافة منتجات للبدء
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center border-b pb-4">
                    <div className="h-16 w-16 bg-muted rounded overflow-hidden">
                      <img
                        src={item.product.thumbnailImage || '/placeholder.svg'}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mr-3 flex-grow">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.product.price} ر.س</p>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>المجموع:</span>
                <span>{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>{tax.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>الإجمالي:</span>
                <span>{total.toFixed(2)} ر.س</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                className="w-full text-lg py-6" 
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                إتمام العملية
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إتمام العملية</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <Label>اختيار العميل (اختياري)</Label>
                <Select onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="text-right mt-1">
                    <SelectValue placeholder="بدون حساب عميل" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="">بدون حساب عميل</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>طريقة الدفع</Label>
                <RadioGroup defaultValue="cash" className="mt-1 flex" dir="rtl" onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center">
                      <DollarSign className="ml-1 h-4 w-4" />
                      نقدي
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse mr-4">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center">
                      <CreditCard className="ml-1 h-4 w-4" />
                      بطاقة
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>المجموع:</span>
                  <span>{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span>{tax.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>الإجمالي:</span>
                  <span>{total.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              إلغاء
            </Button>
            <Button variant="outline" className="flex-1">
              <Printer className="ml-2 h-4 w-4" />
              طباعة الإيصال
            </Button>
            <Button onClick={completeTransaction} className="flex-1">
              <CreditCard className="ml-2 h-4 w-4" />
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default POS;
