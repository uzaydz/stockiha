import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  ShieldCheck, 
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Upload,
  Star,
  Layers,
  BarChart3,
  Settings2,
  Copy,
  Percent
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from "framer-motion";

// Types
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
}

interface SubscriptionServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  delivery_method: 'manual' | 'automatic';
  status: 'active' | 'inactive';
  purchase_price: number;
  selling_price: number;
  profit_margin: number;
  profit_amount: number;
  expires_at: string;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  is_featured: boolean;
  is_active: boolean;
  logo_url: string;
  terms_conditions: string;
  usage_instructions: string;
  support_contact: string;
  renewal_policy: string;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  category?: SubscriptionServiceCategory;
  pricing_options?: SubscriptionServicePricing[];
}

interface ServiceStats {
  total_count: number;
  available_count: number;
  sold_count: number;
  expired_count: number;
  total_revenue: number;
  total_profit: number;
  avg_profit_margin: number;
}

interface PricingFormData {
  duration_months: number;
  duration_label: string;
  purchase_price: number;
  selling_price: number;
  total_quantity: number;
  available_quantity: number;
  is_default: boolean;
  is_featured: boolean;
  discount_percentage: number;
  promo_text: string;
  bonus_days: number;
}

const SubscriptionServicesPage = () => {
  const { organization } = useAuth();
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [categories, setCategories] = useState<SubscriptionServiceCategory[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SubscriptionService | null>(null);

  // Form state for service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    service_type: 'streaming',
    category_id: '',
    supported_countries: ['الولايات المتحدة', 'المملكة المتحدة'],
    delivery_method: 'manual' as 'manual' | 'automatic',
    logo_url: '',
    terms_conditions: '',
    usage_instructions: '',
    support_contact: '',
    renewal_policy: ''
  });

  // Pricing management state
  const [pricingOptions, setPricingOptions] = useState<PricingFormData[]>([
    {
      duration_months: 1,
      duration_label: 'شهر واحد',
      purchase_price: 0,
      selling_price: 0,
      total_quantity: 1,
      available_quantity: 1,
      is_default: true,
      is_featured: false,
      discount_percentage: 0,
      promo_text: '',
      bonus_days: 0
    }
  ]);

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    if (organization?.id) {
      fetchCategories();
      fetchServices();
    }
  }, [organization?.id]);

  // جلب الفئات
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_categories')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب فئات الخدمات",
        variant: "destructive",
      });
    }
  };

  // جلب خدمات الاشتراكات مع الأسعار
  const fetchServices = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      // جلب الخدمات
      const { data: servicesData, error: servicesError } = await supabase
        .from('subscription_services')
        .select(`
          *,
          category:subscription_categories(*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      // جلب أسعار كل خدمة
      const servicesWithPricing = await Promise.all(
        (servicesData || []).map(async (service) => {
          const { data: pricingData } = await supabase
            .from('subscription_service_pricing')
            .select('*')
            .eq('subscription_service_id', service.id)
            .eq('is_active', true)
            .order('display_order');

          return {
            ...service,
            pricing_options: pricingData || []
          };
        })
      );

      setServices(servicesWithPricing);
      
              // حساب الإحصائيات
      if (servicesWithPricing) {
        const totalCount = servicesWithPricing.length;
        const availableCount = servicesWithPricing.filter(s => s.is_active && s.available_quantity > 0).length;
        const soldCount = servicesWithPricing.filter(s => s.sold_quantity > 0).length;
        const expiredCount = servicesWithPricing.filter(s => !s.is_active).length;
        
        // حساب الإيرادات من خيارات الأسعار
        let totalRevenue = 0;
        let totalProfit = 0;
        
        servicesWithPricing.forEach(service => {
          if (service.pricing_options && service.pricing_options.length > 0) {
            service.pricing_options.forEach(pricing => {
              totalRevenue += pricing.selling_price * pricing.sold_quantity;
              totalProfit += pricing.profit_amount * pricing.sold_quantity;
            });
          } else {
            totalRevenue += service.selling_price * service.sold_quantity;
            totalProfit += service.profit_amount * service.sold_quantity;
          }
        });

        const avgProfitMargin = soldCount > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        setStats({
          total_count: totalCount,
          available_count: availableCount,
          sold_count: soldCount,
          expired_count: expiredCount,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          avg_profit_margin: avgProfitMargin
        });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب خدمات الاشتراكات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // إضافة خدمة جديدة
  const handleAddService = async () => {
    if (!formData.name || !formData.provider) {
      toast({
        title: "خطأ",
        description: "اسم الخدمة ومقدم الخدمة مطلوبان",
        variant: "destructive",
      });
      return;
    }

    try {
      // إضافة الخدمة الرئيسية
      const { data: serviceData, error: serviceError } = await supabase
        .from('subscription_services')
        .insert([{
          ...formData,
          organization_id: organization?.id,
        is_active: true,
          available_quantity: 0, // سيتم حسابه من الأسعار
          sold_quantity: 0,
          reserved_quantity: 0
        }])
        .select()
        .single();

      if (serviceError) throw serviceError;

      // إضافة خيارات الأسعار
      const pricingData = pricingOptions.map(pricing => ({
        ...pricing,
        subscription_service_id: serviceData.id,
        organization_id: organization?.id,
        is_active: true
      }));

      const { error: pricingError } = await supabase
        .from('subscription_service_pricing')
        .insert(pricingData);

      if (pricingError) throw pricingError;

      toast({
        title: "نجح",
        description: "تم إضافة خدمة الاشتراك بنجاح",
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الخدمة",
        variant: "destructive",
      });
    }
  };

  // إضافة خيار سعر جديد
  const addPricingOption = () => {
    setPricingOptions([...pricingOptions, {
      duration_months: 3,
      duration_label: '3 أشهر',
      purchase_price: 0,
      selling_price: 0,
      total_quantity: 1,
      available_quantity: 1,
      is_default: false,
      is_featured: false,
      discount_percentage: 0,
      promo_text: '',
      bonus_days: 0
    }]);
  };

  // حذف خيار سعر
  const removePricingOption = (index: number) => {
    if (pricingOptions.length > 1) {
      setPricingOptions(pricingOptions.filter((_, i) => i !== index));
    }
  };

  // تحديث خيار سعر
  const updatePricingOption = (index: number, field: keyof PricingFormData, value: any) => {
    const updated = [...pricingOptions];
    updated[index] = { ...updated[index], [field]: value };
    
    // إذا تم تعيين هذا كافتراضي، قم بإلغاء الآخرين
    if (field === 'is_default' && value === true) {
      updated.forEach((option, i) => {
        if (i !== index) option.is_default = false;
      });
    }
    
    setPricingOptions(updated);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      provider: '',
      service_type: 'streaming',
      category_id: '',
      supported_countries: ['الولايات المتحدة', 'المملكة المتحدة'],
      delivery_method: 'manual',
      logo_url: '',
      terms_conditions: '',
      usage_instructions: '',
      support_contact: '',
      renewal_policy: ''
    });
    
    setPricingOptions([{
      duration_months: 1,
      duration_label: 'شهر واحد',
      purchase_price: 0,
      selling_price: 0,
      total_quantity: 1,
      available_quantity: 1,
      is_default: true,
      is_featured: false,
      discount_percentage: 0,
      promo_text: '',
      bonus_days: 0
    }]);
  };

  // تحديد أقل سعر للخدمة
  const getLowestPrice = (service: SubscriptionService) => {
    if (service.pricing_options && service.pricing_options.length > 0) {
      return Math.min(...service.pricing_options.map(p => p.selling_price));
    }
    return service.selling_price || 0;
  };

  // تحديد أعلى سعر للخدمة
  const getHighestPrice = (service: SubscriptionService) => {
    if (service.pricing_options && service.pricing_options.length > 0) {
      return Math.max(...service.pricing_options.map(p => p.selling_price));
    }
    return service.selling_price || 0;
  };

  // فلترة الخدمات
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && service.is_active) ||
                         (selectedStatus === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">خدمات الاشتراكات</h1>
            <p className="text-muted-foreground mt-1">إدارة خدمات الاشتراكات الرقمية وأسعارها</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            >
              {viewMode === 'grid' ? <BarChart3 className="h-4 w-4 mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
              {viewMode === 'grid' ? 'عرض جدولي' : 'عرض شبكي'}
            </Button>
            
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة خدمة جديدة
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">إجمالي الخدمات</p>
                      <p className="text-3xl font-bold text-foreground">{stats.total_count}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">المتاحة</p>
                      <p className="text-3xl font-bold text-green-600">{stats.available_count}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
                      <p className="text-3xl font-bold text-green-600">{stats.total_revenue.toFixed(2)} دج</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">إجمالي الأرباح</p>
                      <p className="text-3xl font-bold text-primary">{stats.total_profit.toFixed(2)} دج</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ابحث عن خدمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Services Display */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {service.logo_url ? (
                          <img 
                            src={service.logo_url} 
                            alt={service.name}
                            className="w-12 h-12 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{service.provider}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedService(service);
                            setIsPricingDialogOpen(true);
                          }}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            إدارة الأسعار
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description || 'لا يوجد وصف'}
                    </p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {service.category?.name || 'غير محدد'}
                      </Badge>
                      {service.is_featured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          مميز
                        </Badge>
                      )}
                      <Badge variant={service.is_active ? "default" : "destructive"}>
                        {service.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      {service.pricing_options && service.pricing_options.length > 1 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">النطاق السعري:</span>
                          <div className="text-right">
                            <span className="font-semibold text-lg text-primary">
                              {getLowestPrice(service).toFixed(2)} - {getHighestPrice(service).toFixed(2)} دج
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {service.pricing_options.length} خيار سعر
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">السعر:</span>
                          <span className="font-semibold text-lg text-primary">
                            {(service.selling_price || 0).toFixed(2)} دج
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantities */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">متاح:</span>
                        <span className="font-medium">{service.available_quantity || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">مباع:</span>
                        <span className="font-medium">{service.sold_quantity || 0}</span>
                      </div>
                    </div>

                    {/* Rating */}
                    {service.rating && service.rating > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium ml-1">{service.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({service.review_count} تقييم)
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          // Table view would go here
          <Card>
            <CardHeader>
              <CardTitle>قائمة الخدمات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                العرض الجدولي قيد التطوير...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Service Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة خدمة اشتراك جديدة</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل خدمة الاشتراك وخيارات الأسعار المختلفة
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                <TabsTrigger value="pricing">الأسعار والمدد</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">اسم الخدمة *</Label>
            <Input
              id="service-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="مثل: Netflix Premium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-provider">مقدم الخدمة *</Label>
            <Input
              id="service-provider"
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
              placeholder="مثل: Netflix, Xbox"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-description">وصف الخدمة</Label>
          <Textarea
            id="service-description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="وصف تفصيلي للخدمة..."
                    rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
                    <Label>الفئة</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                      <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
                    <Label>نوع الخدمة</Label>
            <Select value={formData.service_type} onValueChange={(value) => setFormData({...formData, service_type: value})}>
                      <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streaming">بث الفيديو</SelectItem>
                <SelectItem value="gaming">ألعاب</SelectItem>
                <SelectItem value="music">موسيقى</SelectItem>
                <SelectItem value="software">برمجيات</SelectItem>
                <SelectItem value="education">تعليمية</SelectItem>
                <SelectItem value="cloud">خدمات سحابية</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
                  <Label htmlFor="logo-url">رابط الشعار</Label>
                  <Input
                    id="logo-url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
        </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">خيارات الأسعار والمدد</h3>
                  <Button onClick={addPricingOption} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة خيار سعر
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {pricingOptions.map((pricing, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">خيار السعر {index + 1}</h4>
                          {pricingOptions.length > 1 && (
                            <Button 
                              onClick={() => removePricingOption(index)}
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
                            <Label>المدة (بالأشهر)</Label>
            <Input
              type="number"
                              value={pricing.duration_months}
                              onChange={(e) => updatePricingOption(index, 'duration_months', parseInt(e.target.value) || 1)}
                              min="1"
            />
          </div>
          <div className="space-y-2">
                            <Label>تسمية المدة</Label>
            <Input
                              value={pricing.duration_label}
                              onChange={(e) => updatePricingOption(index, 'duration_label', e.target.value)}
                              placeholder="مثل: شهر واحد"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>سعر الشراء</Label>
                            <Input
              type="number"
              step="0.01"
                              value={pricing.purchase_price}
                              onChange={(e) => updatePricingOption(index, 'purchase_price', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
                            <Label>سعر البيع</Label>
            <Input
              type="number"
                              step="0.01"
                              value={pricing.selling_price}
                              onChange={(e) => updatePricingOption(index, 'selling_price', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
                            <Label>الكمية المتاحة</Label>
            <Input
                              type="number"
                              value={pricing.available_quantity}
                              onChange={(e) => updatePricingOption(index, 'available_quantity', parseInt(e.target.value) || 1)}
                              min="0"
            />
          </div>
        <div className="space-y-2">
                            <Label>نسبة الخصم (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={pricing.discount_percentage}
                              onChange={(e) => updatePricingOption(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
          />
        </div>
      </div>

                        <div className="space-y-2 mt-4">
                          <Label>النص الترويجي</Label>
                  <Input
                            value={pricing.promo_text}
                            onChange={(e) => updatePricingOption(index, 'promo_text', e.target.value)}
                            placeholder="مثل: الأكثر شعبية، أفضل قيمة"
                          />
              </div>
              
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={pricing.is_default}
                              onCheckedChange={(checked) => updatePricingOption(index, 'is_default', checked)}
                            />
                            <Label>السعر الافتراضي</Label>
              </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={pricing.is_featured}
                              onCheckedChange={(checked) => updatePricingOption(index, 'is_featured', checked)}
                            />
                            <Label>مميز</Label>
              </div>
                </div>

                        {pricing.selling_price > 0 && pricing.purchase_price > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>هامش الربح:</span>
                                <span className="font-medium">
                                  {(((pricing.selling_price - pricing.purchase_price) / pricing.purchase_price) * 100).toFixed(2)}%
                                </span>
              </div>
                              <div className="flex justify-between">
                                <span>الربح لكل بيعة:</span>
                                <span className="font-medium text-green-600">
                                  {(pricing.selling_price - pricing.purchase_price).toFixed(2)} دج
                          </span>
                        </div>
                        </div>
                          </div>
                        )}
        </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddService}>
                إضافة الخدمة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pricing Management Dialog */}
        <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                إدارة أسعار: {selectedService?.name}
              </DialogTitle>
              <DialogDescription>
                عرض وتعديل أسعار خدمة الاشتراك للمدد المختلفة
              </DialogDescription>
            </DialogHeader>

            {selectedService && selectedService.pricing_options && (
              <div className="space-y-4">
                {selectedService.pricing_options.map((pricing) => (
                  <Card key={pricing.id} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <div className="text-center">
                          <div className="text-lg font-bold">{pricing.duration_months}</div>
                          <div className="text-xs text-muted-foreground">أشهر</div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm">
                          <div className="font-medium">{pricing.duration_label}</div>
                          {pricing.promo_text && (
                            <div className="text-xs text-primary">{pricing.promo_text}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-lg font-bold">{pricing.selling_price.toFixed(2)} دج</div>
                        <div className="text-xs text-muted-foreground">سعر البيع</div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-medium">{pricing.available_quantity}</div>
                        <div className="text-xs text-muted-foreground">متاح</div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-medium text-green-600">
                          {pricing.profit_amount.toFixed(2)} دج
                        </div>
                        <div className="text-xs text-muted-foreground">ربح</div>
                      </div>
                      <div className="col-span-2 flex justify-center gap-2">
                        {pricing.is_default && (
                          <Badge variant="secondary">افتراضي</Badge>
                        )}
                        {pricing.is_featured && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            <Star className="h-3 w-3 mr-1" />
                            مميز
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SubscriptionServicesPage; 