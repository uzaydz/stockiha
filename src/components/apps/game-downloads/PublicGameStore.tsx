import React, { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { updateOrganizationTheme } from '@/lib/themeManager/index';

// Import components
import StoreHeader from './store-components/StoreHeader';
import FiltersAndSearch from './store-components/FiltersAndSearch';
import GameCard from './store-components/GameCard';
import StoreFooter from './store-components/StoreFooter';
import StoreDialogs from './store-components/StoreDialogs';
import FloatingCartBar from './store-components/FloatingCartBar';

// Import types
import {
  Game,
  GameCategory,
  StoreSettings,
  GameOrder,
  CartItem,
  PublicGameStoreProps,
} from './store-components/types';

export default function PublicGameStore({ organizationId }: PublicGameStoreProps) {
  // State management
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  
  // Cart management
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Dialog states
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  
  // Order tracking
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<GameOrder | null>(null);
  
  // Order form
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
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
    toast.success(`تم إضافة ${game.name} إلى السلة`, {
      description: '🛒 يمكنك مراجعة السلة والمتابعة للطلب',
    });
  };

  const removeFromCart = (gameId: string) => {
    setCart(prevCart => prevCart.filter(item => item.game.id !== gameId));
    toast.info('تم حذف العنصر من السلة');
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
    toast.info('تم مسح السلة');
  };

  // Data fetching
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
      // جلب إعدادات تطبيق تحميل الألعاب
      const { data: gameSettings, error: gameError } = await supabase
        .from('game_downloads_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (gameError && gameError.code !== 'PGRST116') {
        throw gameError;
      }

      // جلب إعدادات المؤسسة للألوان والثيم باستخدام نظام التنسيق
      const { coordinateRequest } = await import('@/lib/api/requestCoordinator');
      let orgSettings = null;
      let orgError = null;
      
      try {
        orgSettings = await coordinateRequest(
          'organization_settings',
          { 
            organization_id: organizationId,
            select: 'theme_primary_color,theme_secondary_color,theme_mode,custom_css'
          },
          async () => {
            const { data, error } = await supabase
              .from('organization_settings')
              .select('theme_primary_color, theme_secondary_color, theme_mode, custom_css')
              .eq('organization_id', organizationId)
              .single();
            
            if (error) throw error;
            return data;
          },
          'PublicGameStore'
        );
      } catch (error) {
        orgError = error;
      }

      if (orgError && orgError.code !== 'PGRST116') {
      }

      // دمج الإعدادات
      const combinedSettings = {
        ...gameSettings,
        ...orgSettings
      };

      if (combinedSettings) {
        setSettings(combinedSettings);
        
        // تطبيق ثيم المؤسسة إذا كانت الإعدادات متاحة
        if (orgSettings && (orgSettings.theme_primary_color || orgSettings.theme_secondary_color)) {
          updateOrganizationTheme(organizationId, {
            theme_primary_color: orgSettings.theme_primary_color,
            theme_secondary_color: orgSettings.theme_secondary_color,
            theme_mode: orgSettings.theme_mode,
            custom_css: orgSettings.custom_css
          });
        }
      }
    } catch (error: any) {
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
    }
  };

  // Order handling
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة! يرجى إضافة ألعاب أولاً');
      return;
    }

    if (!orderForm.customer_name || !orderForm.customer_phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    try {
      setSubmittingOrder(true);

      toast.info('جاري إنشاء الطلب...', {
        duration: 3000,
      });

      const totalPrice = getTotalPrice();
      const totalItems = getTotalItems();
      
      const gamesList = cart.map(item => 
        `• ${item.game.name} (الكمية: ${item.quantity}, السعر: ${item.game.price.toLocaleString()} دج, المجموع: ${(item.game.price * item.quantity).toLocaleString()} دج)`
      ).join('\n');
      
      const detailedNotes = `📋 تفاصيل الطلب:\n${gamesList}\n\n` +
        `📊 الملخص:\n` +
        `• إجمالي الألعاب: ${totalItems}\n` +
        `• إجمالي السعر: ${totalPrice.toLocaleString()} دج`;

      const primaryGame = cart[0].game;
      
      const orderData = {
            organization_id: organizationId,
        game_id: primaryGame.id,
            customer_name: orderForm.customer_name,
            customer_phone: orderForm.customer_phone,
            customer_email: null,
            device_type: null,
            device_specs: null,
        notes: detailedNotes,
        price: totalPrice,
            status: 'pending',
            payment_status: 'unpaid',
      };

      const { data: orderResult, error: orderError } = await supabase
            .from('game_download_orders')
        .insert([orderData])
            .select('tracking_number')
            .single();
          
      if (orderError) {
        throw orderError;
        }

      const newTrackingNumber = orderResult.tracking_number;
      
      toast.success(`تم إنشاء الطلب بنجاح! 🎉`, {
        description: `رقم التتبع: ${newTrackingNumber}`,
        duration: 6000,
      });
      
      setTrackingNumber(newTrackingNumber);
      setShowOrderDialog(false);
      setShowTrackDialog(true);
      
      setOrderForm({
        customer_name: '',
        customer_phone: '',
      });
      clearCart();
    } catch (error: any) {
      let errorMessage = 'فشل في إنشاء الطلب';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
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
        .select('tracking_number, status, created_at, status_history, customer_phone, game:games_catalog(name)')
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

      if (data.customer_phone) {
        const orderDate = new Date(data.created_at);
        const startOfDay = new Date(orderDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(orderDate.setHours(23, 59, 59, 999));

        const { data: relatedOrders } = await supabase
          .from('game_download_orders')
          .select('tracking_number, game:games_catalog(name)')
          .eq('organization_id', organizationId)
          .eq('customer_phone', data.customer_phone)
          .filter('created_at', 'gte', startOfDay.toISOString())
          .filter('created_at', 'lte', endOfDay.toISOString())
          .neq('tracking_number', trackingNumber);

        if (relatedOrders && relatedOrders.length > 0) {
          toast.info(
            `🔍 وجدت ${relatedOrders.length} طلب${relatedOrders.length > 1 ? 'ات' : ''} أخرى لنفس رقم الهاتف في نفس اليوم`,
            { 
              description: `أرقام التتبع: ${relatedOrders.map(o => o.tracking_number).join(', ')}`,
              duration: 8000 
            }
          );
        }
      }
    } catch (error: any) {
      toast.error('فشل في تتبع الطلب');
    }
  };

  // Filtering logic
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg font-medium text-muted-foreground">جاري تحميل المتجر...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Store inactive state
  if (!settings.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="p-4 bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <Gamepad2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground">المتجر غير متاح حالياً</h3>
            <p className="text-sm text-muted-foreground">يرجى المحاولة لاحقاً أو الاتصال بالدعم</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header - بدون أزرار السلة والتتبع */}
      <header className="bg-gradient-to-r from-card/95 to-card/90 backdrop-blur-md border-b border-border/50 sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-6">
              {settings.business_logo ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                  <img
                    src={settings.business_logo}
                    alt={settings.business_name}
                    className="relative h-16 w-16 object-contain rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                  <div className="relative p-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl border border-primary/30 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <Gamepad2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
              )}
              <div className="space-y-1 text-center">
                <h1 
                  className={`text-3xl font-bold ${
                    settings.theme_primary_color 
                      ? '' 
                      : 'bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent'
                  }`}
                  style={
                    settings.theme_primary_color 
                      ? {
                          background: `linear-gradient(to right, ${settings.theme_primary_color}, ${settings.theme_primary_color}cc, ${settings.theme_secondary_color || settings.theme_primary_color})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }
                      : {}
                  }
                >
                  {settings.business_name || 'متجر تحميل الألعاب'}
                </h1>
                {settings.welcome_message && (
                  <p className="text-muted-foreground text-lg font-medium max-w-md">
                    {settings.welcome_message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <FiltersAndSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          categories={categories}
          primaryColor={settings.theme_primary_color}
          secondaryColor={settings.theme_secondary_color}
        />

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              cart={cart}
              onAddToCart={addToCart}
              primaryColor={settings.theme_primary_color}
              secondaryColor={settings.theme_secondary_color}
            />
          ))}
        </div>

        {/* No Games Found */}
        {filteredGames.length === 0 && (
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
        )}
      </main>

      {/* Footer */}
      <StoreFooter settings={settings} />

      {/* Floating Cart Bar - الشريط العائم الجديد */}
      <FloatingCartBar
        cart={cart}
        getTotalItems={getTotalItems}
        getTotalPrice={getTotalPrice}
        onCartClick={() => setShowCartDialog(true)}
        onTrackClick={() => setShowTrackDialog(true)}
        primaryColor={settings.theme_primary_color}
        secondaryColor={settings.theme_secondary_color}
      />

      {/* Dialogs */}
      <StoreDialogs
        showCartDialog={showCartDialog}
        setShowCartDialog={setShowCartDialog}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        getTotalPrice={getTotalPrice}
        getTotalItems={getTotalItems}
        clearCart={clearCart}
        onProceedToOrder={() => {
                    setShowCartDialog(false);
                    setShowOrderDialog(true);
                  }}
        showOrderDialog={showOrderDialog}
        setShowOrderDialog={setShowOrderDialog}
        orderForm={orderForm}
        setOrderForm={setOrderForm}
        submittingOrder={submittingOrder}
        onSubmitOrder={handleSubmitOrder}
        showTrackDialog={showTrackDialog}
        setShowTrackDialog={setShowTrackDialog}
        trackingNumber={trackingNumber}
        setTrackingNumber={setTrackingNumber}
        trackedOrder={trackedOrder}
        onTrackOrder={handleTrackOrder}
      />
    </div>
  );
}
