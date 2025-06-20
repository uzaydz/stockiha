import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Gamepad2, Monitor, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Package, Clock, CheckCircle, XCircle, Truck, Filter, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  platform: string;
  size_gb?: number;
  requirements?: any;
  images?: string[];
  price: number;
  is_featured: boolean;
  category?: GameCategory;
}

interface StoreSettings {
  business_name?: string;
  business_logo?: string;
  welcome_message?: string;
  terms_conditions?: string;
  contact_info?: any;
  social_links?: any;
  working_hours?: any;
  is_active?: boolean;
}

interface GameOrder {
  tracking_number: string;
  status: string;
  game_name?: string;
  created_at: string;
  status_history?: any[];
}

interface CartItem {
  game: Game;
  quantity: number;
}

interface PublicGameStoreProps {
  organizationId: string;
}

const platforms = [
  { value: 'PC', label: 'كمبيوتر شخصي', icon: Monitor },
  { value: 'PlayStation', label: 'بلايستيشن', icon: Gamepad2 },
  { value: 'Xbox', label: 'إكس بوكس', icon: Gamepad2 },
  { value: 'Mobile', label: 'موبايل', icon: Phone },
];

const statusInfo = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500', icon: Clock },
  processing: { label: 'قيد المعالجة', color: 'bg-blue-500', icon: Package },
  ready: { label: 'جاهز للتسليم', color: 'bg-purple-500', icon: CheckCircle },
  delivered: { label: 'تم التسليم', color: 'bg-green-500', icon: Truck },
  cancelled: { label: 'ملغي', color: 'bg-red-500', icon: XCircle },
};

export default function PublicGameStore({ organizationId }: PublicGameStoreProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<GameOrder | null>(null);
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    device_type: '',
    device_specs: '',
    notes: '',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Cart functions
  const addToCart = (game: Game) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.game.id === game.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.game.id === game.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { game, quantity: 1 }];
      }
    });
    toast.success(`تم إضافة ${game.name} إلى السلة`);
  };

  const removeFromCart = (gameId: string) => {
    setCart(prevCart => prevCart.filter(item => item.game.id !== gameId));
  };

  const updateQuantity = (gameId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(gameId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.game.id === gameId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.game.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchGames(), fetchCategories()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('game_downloads_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games_catalog')
        .select('*, category:game_categories(*)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      console.error('Error fetching games:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('game_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة! يرجى إضافة ألعاب أولاً');
      return;
    }

    // التحقق من البيانات المطلوبة
    if (!orderForm.customer_name || !orderForm.customer_phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    try {
      setSubmittingOrder(true);

      // إنشاء قائمة بالطلبات المطلوب إنشاؤها
      const ordersToCreate = [];
      
      for (const item of cart) {
        // إنشاء طلبات متعددة إذا كانت الكمية أكثر من 1
        for (let i = 0; i < item.quantity; i++) {
          ordersToCreate.push({
            organization_id: organizationId,
            game_id: item.game.id,
            customer_name: orderForm.customer_name,
            customer_phone: orderForm.customer_phone,
            customer_email: orderForm.customer_email || null,
            device_type: orderForm.device_type || null,
            device_specs: orderForm.device_specs || null,
            notes: orderForm.notes ? `${orderForm.notes} | جزء من طلب سلة يحتوي على ${cart.length} ألعاب مختلفة (${i + 1}/${item.quantity})` : `جزء من طلب سلة يحتوي على ${cart.length} ألعاب مختلفة (${i + 1}/${item.quantity})`,
            price: item.game.price,
            status: 'pending',
            payment_status: 'unpaid',
          });
        }
      }

      // تنفيذ الطلبات بشكل متسلسل بدلاً من متوازي لتجنب تعارض tracking numbers
      const results = [];
      for (let i = 0; i < ordersToCreate.length; i++) {
        try {
          const result = await supabase
            .from('game_download_orders')
            .insert([ordersToCreate[i]])
            .select('tracking_number')
            .single();
          
          results.push(result);
          
          // انتظار قصير بين الطلبات لضمان عدم التعارض
          if (i < ordersToCreate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Error creating order ${i + 1}:`, error);
          results.push({ error });
        }
      }
      
      // التحقق من وجود أخطاء
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Order creation errors:', errors.map(e => e.error));
        // إذا فشل أكثر من نصف الطلبات، اعتبرها مشكلة كبيرة
        if (errors.length > results.length / 2) {
          throw new Error(`فشل في إنشاء ${errors.length} من ${results.length} طلبات`);
        }
        // وإلا، أظهر تحذير لكن لا توقف العملية
        toast.error(`تحذير: فشل في إنشاء ${errors.length} من ${results.length} طلبات`);
      }

      // جمع أرقام التتبع
      const successfulOrders = results.filter(result => result.data);
      const trackingNumbersList = successfulOrders.map(result => result.data.tracking_number);

      // إنشاء رسالة مخصصة بناءً على عدد الطلبات
      let successMessage;
      if (successfulOrders.length === 1) {
        successMessage = `تم إنشاء الطلب بنجاح! رقم التتبع: ${trackingNumbersList[0]}`;
      } else if (successfulOrders.length === ordersToCreate.length) {
        successMessage = `تم إنشاء جميع الطلبات بنجاح! (${successfulOrders.length} طلب)`;
      } else {
        successMessage = `تم إنشاء ${successfulOrders.length} من ${ordersToCreate.length} طلبات بنجاح`;
      }
      
      toast.success(successMessage);
      
      // إظهار أول رقم تتبع في نافذة التتبع
      setTrackingNumber(trackingNumbersList[0]);
      setShowOrderDialog(false);
      setShowTrackDialog(true);
      
      // إعادة تعيين النموذج والسلة
      setOrderForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        device_type: '',
        device_specs: '',
        notes: '',
      });
      clearCart();
    } catch (error: any) {
      console.error('Error submitting order:', error);
      let errorMessage = 'فشل في إنشاء الطلب';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      // إضافة نصائح للمستخدم
      errorMessage += '. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.';
      
      toast.error(errorMessage);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleTrackOrder = async () => {
    if (!trackingNumber) {
      toast.error('يرجى إدخال رقم التتبع');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_download_orders')
        .select('tracking_number, status, created_at, status_history, game:games_catalog(name)')
        .eq('organization_id', organizationId)
        .eq('tracking_number', trackingNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('لم يتم العثور على طلب بهذا الرقم');
        } else {
          throw error;
        }
        return;
      }

      setTrackedOrder({
        ...data,
        game_name: data.game?.name,
      });
    } catch (error: any) {
      console.error('Error tracking order:', error);
      toast.error('فشل في تتبع الطلب');
    }
  };

  const filteredGames = games.filter(game => {
    let matches = true;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matches = game.name.toLowerCase().includes(searchLower) ||
                (game.description?.toLowerCase().includes(searchLower) || false);
    }

    if (selectedCategory !== 'all') {
      matches = matches && game.category_id === selectedCategory;
    }

    if (selectedPlatform !== 'all') {
      matches = matches && game.platform === selectedPlatform;
    }

    return matches;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">المتجر غير متاح حالياً</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-gradient-to-r from-card/80 to-card backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {settings.business_logo ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-sm"></div>
                  <img
                    src={settings.business_logo}
                    alt={settings.business_name}
                    className="relative h-16 w-16 object-contain rounded-xl shadow-lg"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-sm"></div>
                  <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20 shadow-lg">
                    <Gamepad2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {settings.business_name || 'متجر تحميل الألعاب'}
                </h1>
                {settings.welcome_message && (
                  <p className="text-muted-foreground text-lg font-medium">{settings.welcome_message}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setShowCartDialog(true)} 
                variant="outline" 
                size="lg"
                className="relative bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20 hover:from-green-500/20 hover:to-green-600/20 transition-all duration-300 shadow-lg"
              >
                <ShoppingBag className="ml-2 h-5 w-5" />
                السلة ({getTotalItems()})
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 rounded-full text-xs">
                    {cart.length}
                  </Badge>
                )}
              </Button>
              <Button 
                onClick={() => setShowTrackDialog(true)} 
                variant="outline" 
                size="lg"
                className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 hover:from-primary/20 hover:to-secondary/20 transition-all duration-300 shadow-lg"
              >
                <Package className="ml-2 h-5 w-5" />
                تتبع طلبك
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <Card className="mb-12 bg-gradient-to-r from-card/50 to-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="relative group">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="ابحث عن لعبتك المفضلة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-12 h-12 text-lg bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[220px] h-12 bg-background/50 border-border/50 hover:border-primary/50 transition-all duration-300">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-sm border-border/50">
                  <SelectItem value="all" className="font-medium">🎮 جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id} className="font-medium">
                      📁 {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-[220px] h-12 bg-background/50 border-border/50 hover:border-primary/50 transition-all duration-300">
                  <Monitor className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="اختر المنصة" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-sm border-border/50">
                  <SelectItem value="all" className="font-medium">💻 جميع المنصات</SelectItem>
                  {platforms.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="font-medium">
                      <div className="flex items-center gap-3">
                        <platform.icon className="h-4 w-4" />
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredGames.map((game) => {
            const PlatformIcon = platforms.find(p => p.value === game.platform)?.icon || Gamepad2;
            
            return (
              <Card key={game.id} className="group overflow-hidden bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:scale-[1.02] transform">
                {game.images && game.images[0] && (
                  <div className="aspect-video relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
                    <img
                      src={game.images[0]}
                      alt={game.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                    />
                    {game.is_featured && (
                      <Badge className="absolute top-3 right-3 z-20 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg animate-pulse">
                        ✨ مميز
                      </Badge>
                    )}
                    <div className="absolute bottom-3 left-3 z-20">
                      <div className="bg-black/40 backdrop-blur-sm rounded-full p-2">
                        <PlatformIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-1">
                        {game.name}
                      </CardTitle>
                      {!game.images?.[0] && (
                        <div className="bg-primary/10 rounded-full p-2">
                          <PlatformIcon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {game.category && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                          🏆 {game.category.name}
                        </Badge>
                      )}
                      {game.size_gb && (
                        <Badge variant="outline" className="text-xs">
                          💾 {game.size_gb} GB
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {game.description && (
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          {game.price} دج
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          سعر نهائي
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addToCart(game)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-lg font-semibold"
                        size="lg"
                      >
                        <Plus className="ml-2 h-5 w-5" />
                        🛒 أضف للسلة
                      </Button>
                      {cart.find(item => item.game.id === game.id) && (
                        <div className="flex items-center bg-muted/50 rounded-lg px-3">
                          <span className="text-sm font-bold text-primary">
                            {cart.find(item => item.game.id === game.id)?.quantity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="col-span-full">
            <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border-dashed border-2 border-border/50">
              <CardContent className="py-20">
                <div className="text-center space-y-4">
                  <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                    <Gamepad2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-muted-foreground">لا توجد ألعاب متاحة</h3>
                  <p className="text-muted-foreground">جرب تغيير فلاتر البحث أو الفئة</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setSelectedPlatform('all');
                    }}
                    className="mt-4"
                  >
                    إعادة تعيين الفلاتر
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm border-t border-border/50 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Contact Info */}
            {settings.contact_info && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">معلومات الاتصال</h3>
                </div>
                <div className="space-y-4 text-muted-foreground">
                  {settings.contact_info.phone && (
                    <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="p-2 bg-green-500/10 rounded-full">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">هاتف</p>
                        <p className="text-sm">{settings.contact_info.phone}</p>
                      </div>
                    </div>
                  )}
                  {settings.contact_info.email && (
                    <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="p-2 bg-blue-500/10 rounded-full">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">إيميل</p>
                        <p className="text-sm">{settings.contact_info.email}</p>
                      </div>
                    </div>
                  )}
                  {settings.contact_info.address && (
                    <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="p-2 bg-red-500/10 rounded-full">
                        <MapPin className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">العنوان</p>
                        <p className="text-sm">{settings.contact_info.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Working Hours */}
            {settings.working_hours && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">ساعات العمل</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(settings.working_hours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between items-center p-3 bg-background/50 rounded-lg border border-border/50">
                      <span className="font-medium text-foreground">
                        {day === 'sunday' ? '🌅 الأحد' : 
                         day === 'monday' ? '📅 الإثنين' :
                         day === 'tuesday' ? '📅 الثلاثاء' :
                         day === 'wednesday' ? '📅 الأربعاء' :
                         day === 'thursday' ? '📅 الخميس' :
                         day === 'friday' ? '🕌 الجمعة' :
                         '📅 السبت'}
                      </span>
                      <span className={`text-sm font-semibold ${hours.is_closed ? 'text-red-500' : 'text-green-600'}`}>
                        {hours.is_closed ? '❌ مغلق' : `🕒 ${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {settings.social_links && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Instagram className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">تابعنا على</h3>
                </div>
                <div className="space-y-4">
                  {settings.social_links.facebook && (
                    <a
                      href={settings.social_links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg border border-blue-600/20 hover:border-blue-600/40 transition-all duration-300 group"
                    >
                      <div className="p-2 bg-blue-600/20 rounded-full group-hover:bg-blue-600/30 transition-colors">
                        <Facebook className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-600">فيسبوك</p>
                        <p className="text-xs text-muted-foreground">تابعنا على فيسبوك</p>
                      </div>
                    </a>
                  )}
                  {settings.social_links.instagram && (
                    <a
                      href={settings.social_links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-500/10 to-purple-600/10 hover:from-pink-500/20 hover:to-purple-600/20 rounded-lg border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 group"
                    >
                      <div className="p-2 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-full group-hover:from-pink-500/30 group-hover:to-purple-600/30 transition-colors">
                        <Instagram className="h-5 w-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-pink-600">إنستغرام</p>
                        <p className="text-xs text-muted-foreground">تابعنا على إنستغرام</p>
                      </div>
                    </a>
                  )}
                  {settings.social_links.twitter && (
                    <a
                      href={settings.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg border border-sky-500/20 hover:border-sky-500/40 transition-all duration-300 group"
                    >
                      <div className="p-2 bg-sky-500/20 rounded-full group-hover:bg-sky-500/30 transition-colors">
                        <Twitter className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sky-600">تويتر</p>
                        <p className="text-xs text-muted-foreground">تابعنا على تويتر</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Section */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">
                  © 2024 {settings.business_name || 'متجر تحميل الألعاب'} - جميع الحقوق محفوظة
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  🔒 آمن ومضمون
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  ⚡ خدمة سريعة
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-4xl bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm border border-border/50">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ShoppingBag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  🛒 سلة التسوق
                </DialogTitle>
                <DialogDescription className="text-lg mt-2">
                  📋 مراجعة الألعاب المضافة للسلة ({getTotalItems()} منتج)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-muted-foreground">السلة فارغة</h3>
                <p className="text-muted-foreground">أضف بعض الألعاب لبدء التسوق</p>
              </div>
            ) : (
              <>
                {cart.map((item, index) => {
                  const PlatformIcon = platforms.find(p => p.value === item.game.platform)?.icon || Gamepad2;
                  return (
                    <div key={item.game.id} className="bg-gradient-to-r from-background/50 to-background/30 rounded-xl p-6 border border-border/50">
                      <div className="flex items-center gap-6">
                        {item.game.images && item.game.images[0] && (
                          <img
                            src={item.game.images[0]}
                            alt={item.game.name}
                            className="h-20 w-20 object-cover rounded-lg shadow-lg"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <h4 className="text-lg font-bold">{item.game.name}</h4>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              <PlatformIcon className="h-3 w-3 mr-1" />
                              {item.game.platform}
                            </Badge>
                            {item.game.category && (
                              <Badge variant="secondary">{item.game.category.name}</Badge>
                            )}
                          </div>
                          <p className="text-lg font-semibold text-primary">{item.game.price} دج</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.game.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-bold text-lg min-w-[40px] text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.game.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFromCart(item.game.id)}
                            className="h-8 w-8 p-0 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {(item.game.price * item.quantity).toLocaleString()} دج
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Cart Summary */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/20 sticky bottom-0">
                  <div className="flex items-center justify-between text-2xl font-bold">
                    <span>💰 المجموع الكلي:</span>
                    <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {getTotalPrice().toLocaleString()} دج
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                    <span>📦 عدد المنتجات: {getTotalItems()}</span>
                    <span>🎮 عدد الألعاب: {cart.length}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex gap-4 pt-6">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12 text-lg"
              onClick={() => setShowCartDialog(false)}
            >
              ⬅️ متابعة التسوق
            </Button>
            {cart.length > 0 && (
              <>
                <Button 
                  variant="destructive" 
                  size="lg"
                  className="h-12 text-lg"
                  onClick={clearCart}
                >
                  🗑️ إفراغ السلة
                </Button>
                <Button 
                  onClick={() => {
                    setShowCartDialog(false);
                    setShowOrderDialog(true);
                  }}
                  size="lg"
                  className="flex-1 h-12 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white border-0 shadow-lg"
                >
                  ✅ إتمام الطلب
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm border border-border/50">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  📦 تأكيد الطلب
                </DialogTitle>
                <DialogDescription className="text-lg mt-2">
                  📝 يرجى ملء البيانات المطلوبة لإتمام طلب السلة ({getTotalItems()} منتج)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {cart.length > 0 && (
            <div className="space-y-4">
              {/* Cart Summary for Order */}
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/20">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  🛒 ملخص السلة
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.game.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {item.game.images && item.game.images[0] && (
                          <img
                            src={item.game.images[0]}
                            alt={item.game.name}
                            className="h-12 w-12 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{item.game.name}</p>
                          <p className="text-sm text-muted-foreground">{item.game.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">x{item.quantity}</p>
                        <p className="text-sm text-green-600">{(item.game.price * item.quantity).toLocaleString()} دج</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>💰 المجموع الكلي:</span>
                    <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {getTotalPrice().toLocaleString()} دج
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                    <span>📦 إجمالي المنتجات: {getTotalItems()}</span>
                    <span>🎮 عدد الألعاب: {cart.length}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold">👤 معلومات العميل</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="customer_name" className="text-base font-semibold flex items-center gap-2">
                      📝 الاسم الكامل *
                    </Label>
                    <Input
                      id="customer_name"
                      value={orderForm.customer_name}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="أدخل اسمك الكامل"
                      className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="customer_phone" className="text-base font-semibold flex items-center gap-2">
                      📱 رقم الهاتف *
                    </Label>
                    <Input
                      id="customer_phone"
                      value={orderForm.customer_phone}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                      placeholder="05xxxxxxxx"
                      className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="customer_email" className="text-base font-semibold flex items-center gap-2">
                  📧 البريد الإلكتروني (اختياري)
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={orderForm.customer_email}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="example@email.com"
                  className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                />
              </div>

              {/* Device Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Monitor className="h-5 w-5 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold">💻 معلومات الجهاز</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="device_type" className="text-base font-semibold flex items-center gap-2">
                      🎮 نوع الجهاز
                    </Label>
                    <Input
                      id="device_type"
                      value={orderForm.device_type}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, device_type: e.target.value }))}
                      placeholder="مثال: PC, PS5, Xbox"
                      className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="device_specs" className="text-base font-semibold flex items-center gap-2">
                      ⚙️ مواصفات الجهاز
                    </Label>
                    <Input
                      id="device_specs"
                      value={orderForm.device_specs}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, device_specs: e.target.value }))}
                      placeholder="المعالج، الرامات، كرت الشاشة..."
                      className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes" className="text-base font-semibold flex items-center gap-2">
                  📝 ملاحظات إضافية
                </Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات أو متطلبات خاصة..."
                  className="min-h-[100px] text-lg bg-background/80 border-border/50 focus:border-primary/50 resize-none"
                  rows={4}
                />
              </div>

              {/* Requirements Info */}
              {cart.some(item => item.game.requirements && Object.keys(item.game.requirements).some(key => item.game.requirements[key])) && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">📋 ملاحظة: متطلبات التشغيل</h4>
                  <p className="text-sm text-muted-foreground">
                    يرجى التأكد من أن جهازك يلبي متطلبات تشغيل الألعاب المختارة. سيتم إرسال متطلبات كل لعبة مع تفاصيل الطلب.
                  </p>
                </div>
              )}

              {/* Terms */}
              {settings.terms_conditions && (
                <div className="bg-muted/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-semibold mb-2">الشروط والأحكام</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {settings.terms_conditions}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-4 pt-6">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12 text-lg"
              onClick={() => {
                setShowOrderDialog(false);
                setOrderForm({
                  customer_name: '',
                  customer_phone: '',
                  customer_email: '',
                  device_type: '',
                  device_specs: '',
                  notes: '',
                });
              }}
            >
              ❌ إلغاء
            </Button>
            <Button 
              onClick={handleSubmitOrder} 
              disabled={submittingOrder}
              size="lg"
              className="flex-1 h-12 text-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-lg"
            >
              {submittingOrder ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري إنشاء الطلبات...
                </>
              ) : (
                <>
                  ✅ تأكيد الطلب
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Order Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm border border-border/50">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  📦 تتبع طلبك
                </DialogTitle>
                <DialogDescription className="text-lg mt-2">
                  🔍 أدخل رقم التتبع لمعرفة حالة وتفاصيل طلبك
                  <br />
                  <small className="text-muted-foreground">
                    💡 إذا كان لديك عدة ألعاب، فلكل لعبة رقم تتبع منفصل
                  </small>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="tracking" className="text-base font-semibold flex items-center gap-2">
                🏷️ رقم التتبع
              </Label>
              <div className="flex gap-3">
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="GD-000001"
                  className="h-12 text-lg bg-background/80 border-border/50 focus:border-primary/50"
                />
                <Button 
                  onClick={handleTrackOrder}
                  size="lg"
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white border-0 shadow-lg"
                >
                  🔍 بحث
                </Button>
              </div>
            </div>

            {trackedOrder && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-foreground">🎮 {trackedOrder.game_name}</p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        🏷️ رقم التتبع: <Badge variant="outline">{trackedOrder.tracking_number}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        📅 تاريخ الطلب: {new Date(trackedOrder.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="text-center">
                      <Badge className={`${statusInfo[trackedOrder.status as keyof typeof statusInfo]?.color} text-white text-lg py-2 px-4`}>
                        {statusInfo[trackedOrder.status as keyof typeof statusInfo]?.label}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Status Timeline */}
                  {trackedOrder.status_history && trackedOrder.status_history.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-lg font-semibold">📈 سجل الحالات</p>
                      </div>
                      <div className="space-y-4">
                        {trackedOrder.status_history.map((history: any, index: number) => {
                          const StatusIcon = statusInfo[history.to_status as keyof typeof statusInfo]?.icon || Clock;
                          const isLatest = index === 0;
                          return (
                            <div key={index} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${isLatest ? 'bg-primary/5 border-primary/20' : 'bg-background/50 border-border/50'}`}>
                              <div className={`p-3 rounded-full ${statusInfo[history.to_status as keyof typeof statusInfo]?.color} ${isLatest ? 'shadow-lg' : ''}`}>
                                <StatusIcon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className={`font-bold ${isLatest ? 'text-primary text-lg' : 'text-foreground'}`}>
                                    {statusInfo[history.to_status as keyof typeof statusInfo]?.label}
                                  </p>
                                  {isLatest && (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                      ✨ الحالة الحالية
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground font-medium">
                                  🕰️ {new Date(history.changed_at).toLocaleString('ar-SA')}
                                </p>
                                {history.notes && (
                                  <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg mt-2">
                                    📝 {history.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-6">
            <Button 
              variant="outline" 
              size="lg"
              className="w-full h-12 text-lg"
              onClick={() => {
                setShowTrackDialog(false);
                setTrackingNumber('');
                setTrackedOrder(null);
              }}
            >
              ✖️ إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}