import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product, Order, User } from '@/types';
import { Barcode, Clock, FileText, History, Calculator, Percent, CreditCard, BadgeHelp, ScanLine, Star, ReceiptText, ShoppingCart, PlusCircle, ThumbsUp, Search, Tag, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, formatPrice } from '@/lib/utils';
import { resolveProductImageSrc } from '@/lib/products/productImageResolver';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface QuickActionsProps {
  onBarcodeScanned: (barcode: string) => void;
  recentOrders: Order[];
  onOpenOrder: (order: Order) => void;
  onQuickAddProduct: (product: Product) => void;
  favoriteProducts: Product[];
}

const CALC_ALLOWED_CHARS = /^[0-9+\-*/().\s]+$/;

function evaluateCalculatorExpression(expression: string): number | null {
  const cleaned = expression.replace(/\s+/g, '');
  if (!cleaned || !CALC_ALLOWED_CHARS.test(cleaned)) return null;

  const tokens = cleaned.match(/(\d+(\.\d+)?)|[+\-*/()]/g);
  if (!tokens) return null;

  const output: string[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  };

  let prevToken: string | null = null;

  for (const token of tokens) {
    const isNumber = !Number.isNaN(Number(token));
    if (isNumber) {
      output.push(token);
      prevToken = token;
      continue;
    }

    if (token === '(') {
      operators.push(token);
      prevToken = token;
      continue;
    }

    if (token === ')') {
      while (operators.length && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as string);
      }
      if (!operators.length) return null;
      operators.pop();
      prevToken = token;
      continue;
    }

    if (token in precedence) {
      if (token === '-' && (!prevToken || prevToken === '(' || prevToken in precedence)) {
        output.push('0');
      }

      while (
        operators.length &&
        operators[operators.length - 1] in precedence &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop() as string);
      }
      operators.push(token);
      prevToken = token;
      continue;
    }

    return null;
  }

  while (operators.length) {
    const op = operators.pop() as string;
    if (op === '(') return null;
    output.push(op);
  }

  const stack: number[] = [];
  for (const token of output) {
    const isNumber = !Number.isNaN(Number(token));
    if (isNumber) {
      stack.push(Number(token));
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;

    switch (token) {
      case '+':
        stack.push(a + b);
        break;
      case '-':
        stack.push(a - b);
        break;
      case '*':
        stack.push(a * b);
        break;
      case '/':
        if (b === 0) return null;
        stack.push(a / b);
        break;
      default:
        return null;
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  return stack[0];
}

export default function QuickActions({
  onBarcodeScanned,
  recentOrders,
  onOpenOrder,
  onQuickAddProduct,
  favoriteProducts
}: QuickActionsProps) {
  const [barcode, setBarcode] = useState('');
  const [activeTab, setActiveTab] = useState('barcode');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState('0');
  const [calculatorResult, setCalculatorResult] = useState('0');

  // التركيز تلقائيًا على مدخل الباركود عند التبديل إلى تبويب الباركود
  useEffect(() => {
    if (activeTab === 'barcode' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeTab]);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onBarcodeScanned(barcode.trim());
      setBarcode('');
    }
  };

  const handleCalculatorButton = (value: string) => {
    if (value === 'C') {
      setCalculatorInput('0');
      setCalculatorResult('0');
    } else if (value === '=') {
      try {
        const result = evaluateCalculatorExpression(calculatorInput);
        if (result === null) {
          setCalculatorResult('Error');
          return;
        }
        const resultString = result.toString();
        setCalculatorResult(resultString);
        setCalculatorInput(resultString);
      } catch (error) {
        setCalculatorResult('Error');
      }
    } else if (value === '⌫') {
      if (calculatorInput.length > 1) {
        setCalculatorInput(calculatorInput.slice(0, -1));
      } else {
        setCalculatorInput('0');
      }
    } else {
      if (calculatorInput === '0' && value !== '.') {
        setCalculatorInput(value);
      } else {
        setCalculatorInput(calculatorInput + value);
      }
    }
  };

  const formatOrderDate = (date: Date | string) => {
    try {
      // إذا كان التاريخ عبارة عن string، استخدم parseISO لتحويله إلى Date
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'dd MMM HH:mm', { locale: ar });
    } catch (error) {
      return 'تاريخ غير صالح';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Tabs 
      defaultValue="barcode" 
      value={activeTab}
      onValueChange={setActiveTab}
      className="h-full flex flex-col"
    >
      <TabsList className="w-full h-auto grid grid-cols-3 p-0 bg-transparent border-b">
        <TabsTrigger 
          value="barcode" 
          className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          <div className="flex flex-col items-center gap-0.5">
            <Barcode className="h-4 w-4" />
            <span className="text-xs">باركود</span>
          </div>
        </TabsTrigger>
        <TabsTrigger 
          value="recent" 
          className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          <div className="flex flex-col items-center gap-0.5">
            <History className="h-4 w-4" />
            <span className="text-xs">الطلبات</span>
          </div>
        </TabsTrigger>
        <TabsTrigger 
          value="favorites" 
          className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          <div className="flex flex-col items-center gap-0.5">
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs">المفضلة</span>
          </div>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent 
        value="barcode" 
        className="flex-1 pt-2 p-2 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
      >
        <div className="w-full space-y-3">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                ref={barcodeInputRef}
                type="text" 
                placeholder="أدخل الباركود..." 
                className="pl-9"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm">بحث</Button>
          </form>
          
          <div className="w-full text-center py-8">
            <Barcode className="h-16 w-16 mx-auto mb-2 text-muted-foreground/40" />
            <h4 className="text-sm font-medium">مسح الباركود</h4>
            <p className="text-xs text-muted-foreground mt-1">
              أدخل الباركود أو استخدم قارئ الباركود لإضافة المنتجات بسرعة
            </p>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent 
        value="recent" 
        className="flex-1 h-full mt-0 data-[state=active]:block"
      >
        <div className="h-full flex flex-col">
          <div className="border-b pb-2 pt-2">
            <div className="text-sm font-medium px-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>آخر العمليات</span>
            </div>
          </div>
          
          <ScrollArea className="flex-1 h-[calc(100%-2rem)]">
            {recentOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
                  <h4 className="text-sm font-medium">لا توجد طلبات حديثة</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    ستظهر الطلبات الأخيرة هنا عند إنشائها
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-1.5">
                {recentOrders.map(order => (
                  <Card 
                    key={order.id}
                    className="bg-card/50 shadow-sm hover:shadow hover:bg-accent/5 transition-all cursor-pointer"
                    onClick={() => onOpenOrder(order)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-sm">
                            طلب #{order.id.substring(0, 8)}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1 py-0 h-4 font-normal",
                            getOrderStatusColor(order.status)
                          )}
                        >
                          {order.status === 'completed' ? 'مكتمل' : 
                           order.status === 'pending' ? 'معلق' :
                           order.status === 'processing' ? 'قيد المعالجة' :
                           order.status === 'cancelled' ? 'ملغي' : order.status}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          <span>
                            {order.items.length + (order.services?.length || 0)} عناصر
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatOrderDate(order.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          <span>
                            {order.customerId === 'guest' || order.customerId === 'walk-in' ? 
                              'زائر' : `عميل #${order.customerId.substring(0, 6)}`}
                          </span>
                        </div>
                        <div className="flex items-center font-medium text-primary">
                          {formatPrice(order.total)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </TabsContent>
      
      <TabsContent 
        value="favorites" 
        className="flex-1 h-full mt-0 data-[state=active]:block"
      >
        <div className="h-full flex flex-col">
          <div className="border-b pb-2 pt-2">
            <div className="text-sm font-medium px-3 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-primary" />
              <span>الأكثر مبيعاً</span>
            </div>
          </div>
          
          <ScrollArea className="flex-1 h-[calc(100%-2rem)]">
            {favoriteProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <div className="text-center">
                  <ThumbsUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
                  <h4 className="text-sm font-medium">لا توجد منتجات مفضلة</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    ستظهر المنتجات الأكثر مبيعاً هنا
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2">
                {favoriteProducts.map(product => (
                  <Card
                    key={product.id}
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all",
                      product.stockQuantity > 0 
                        ? "hover:scale-105 hover:shadow-md hover:z-10" 
                        : "opacity-60"
                    )}
                    onClick={() => {
                      if (product.stockQuantity > 0) {
                        onQuickAddProduct(product);
                      }
                    }}
                  >
                    <div className="aspect-square bg-gradient-to-br from-muted/30 to-muted/10 dark:from-slate-800/50 dark:to-slate-900/30 relative">
                      <img 
                        src={resolveProductImageSrc(product as any, '/placeholder-product.svg')} 
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                      {product.stockQuantity <= 0 && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-xs font-medium">نفذت الكمية</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <h4 className="text-xs font-medium line-clamp-1">{product.name}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-primary font-medium">{formatPrice(product.price)}</span>
                        <Tag className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}
