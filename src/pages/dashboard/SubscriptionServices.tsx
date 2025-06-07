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
  Upload
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

// Types
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
  available_durations: any[];
  credentials_encrypted: string;
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
  created_at: string;
  updated_at: string;
  created_by: string;
  category?: SubscriptionServiceCategory;
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

const SubscriptionServicesPage = () => {
  const { organization } = useAuth();
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [categories, setCategories] = useState<SubscriptionServiceCategory[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SubscriptionService | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    service_type: 'streaming',
    category_id: '',
    supported_countries: ['الولايات المتحدة', 'المملكة المتحدة'],
    available_durations: [{ months: 1, label: 'شهر واحد' }],
    credentials_data: '',
    delivery_method: 'manual' as 'manual' | 'automatic',
    purchase_price: 0,
    selling_price: 0,
    total_quantity: 1,
    logo_url: '',
    terms_conditions: '',
    usage_instructions: '',
    support_contact: '',
    renewal_policy: ''
  });

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
      const { data, error } = await (supabase as any)
        .from('subscription_categories')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('name');

      if (error) throw error;
      setCategories((data as SubscriptionServiceCategory[]) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب فئات الخدمات",
        variant: "destructive",
      });
    }
  };

  // جلب خدمات الاشتراكات
  const fetchServices = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('subscription_services')
        .select(`
          *,
          category:subscription_categories(*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices((data as SubscriptionService[]) || []);
      
              // حساب الإحصائيات
        if (data) {
          const services = data as SubscriptionService[];
          const totalCount = services.length;
          const availableCount = services.filter(s => s.is_active && s.available_quantity > 0).length;
          const soldCount = services.filter(s => s.sold_quantity > 0).length;
          const expiredCount = services.filter(s => !s.is_active).length;
          const totalRevenue = services.reduce((sum, s) => sum + (s.selling_price * s.sold_quantity), 0);
          const totalProfit = services.reduce((sum, s) => sum + (s.profit_amount || 0), 0);
          const avgProfitMargin = soldCount > 0 ? totalProfit / soldCount : 0;

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

  // تصفية البيانات
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || service.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && service.is_active) ||
                         (selectedStatus === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // إضافة خدمة جديدة
  const handleAddService = async () => {
    if (!organization?.id) return;

    try {
      // التحقق من وتصحيح service_type للتأكد من أنه من القيم المسموحة
      const validServiceTypes = ['streaming', 'gaming', 'software', 'music', 'education', 'cloud', 'other'];
      let correctedServiceType = formData.service_type;
      
      // تصحيح القيم القديمة
      if (formData.service_type === 'productivity') {
        correctedServiceType = 'software';
      } else if (!validServiceTypes.includes(formData.service_type)) {
        correctedServiceType = 'streaming'; // القيمة الافتراضية
      }

      const serviceData = {
        organization_id: organization.id,
        category_id: formData.category_id || null,
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        service_type: correctedServiceType,
        supported_countries: formData.supported_countries,
        available_durations: formData.available_durations,
        credentials_encrypted: btoa(formData.credentials_data), // تشفير بسيط
        delivery_method: formData.delivery_method,
        purchase_price: formData.purchase_price,
        selling_price: formData.selling_price,
        total_quantity: formData.total_quantity,
        available_quantity: formData.total_quantity,
        logo_url: formData.logo_url,
        terms_conditions: formData.terms_conditions,
        usage_instructions: formData.usage_instructions,
        support_contact: formData.support_contact,
        renewal_policy: formData.renewal_policy,
        is_active: true,
        status: 'active'
      };

      // تحديث state إذا تم تصحيح القيمة
      if (correctedServiceType !== formData.service_type) {
        setFormData(prev => ({ ...prev, service_type: correctedServiceType }));
      }

      const { error } = await (supabase as any)
        .from('subscription_services')
        .insert([serviceData]);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إضافة خدمة الاشتراك بنجاح",
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة خدمة الاشتراك",
        variant: "destructive",
      });
    }
  };

  // تحديث خدمة
  const handleUpdateService = async () => {
    if (!selectedService) return;

    try {
      let updateData: any = {
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        service_type: formData.service_type,
        category_id: formData.category_id || null,
        supported_countries: formData.supported_countries,
        available_durations: formData.available_durations,
        delivery_method: formData.delivery_method,
        purchase_price: formData.purchase_price,
        selling_price: formData.selling_price,
        total_quantity: formData.total_quantity,
        logo_url: formData.logo_url,
        terms_conditions: formData.terms_conditions,
        usage_instructions: formData.usage_instructions,
        support_contact: formData.support_contact,
        renewal_policy: formData.renewal_policy
      };

      // تشفير البيانات إذا تم تحديثها
      if (formData.credentials_data) {
        updateData.credentials_encrypted = btoa(formData.credentials_data);
      }

      // @ts-ignore - جدول subscription_services غير موجود في types بعد
      const { error } = await supabase
        .from('subscription_services')
        .update(updateData)
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث خدمة الاشتراك بنجاح",
      });

      setIsEditDialogOpen(false);
      setSelectedService(null);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث خدمة الاشتراك",
        variant: "destructive",
      });
    }
  };

  // حذف خدمة
  const handleDeleteService = async (serviceId: string) => {
    try {
      // @ts-ignore - جدول subscription_services غير موجود في types بعد
      const { error } = await supabase
        .from('subscription_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم حذف خدمة الاشتراك بنجاح",
      });

      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف خدمة الاشتراك",
        variant: "destructive",
      });
    }
  };

  // تحديث حالة الخدمة
  const updateServiceStatus = async (serviceId: string, isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('subscription_services')
        .update({ 
          is_active: isActive,
          status: isActive ? 'active' : 'inactive'
        })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث حالة الخدمة بنجاح",
      });

      fetchServices();
    } catch (error) {
      console.error('Error updating service status:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث حالة الخدمة",
        variant: "destructive",
      });
    }
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
      available_durations: [{ months: 1, label: 'شهر واحد' }],
      credentials_data: '',
      delivery_method: 'manual',
      purchase_price: 0,
      selling_price: 0,
      total_quantity: 1,
      logo_url: '',
      terms_conditions: '',
      usage_instructions: '',
      support_contact: '',
      renewal_policy: ''
    });
  };

  // تحضير بيانات التحرير
  const prepareEditData = (service: SubscriptionService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      provider: service.provider,
      service_type: service.service_type || 'streaming',
      category_id: service.category_id || '',
      supported_countries: service.supported_countries || [],
      available_durations: service.available_durations || [],
      credentials_data: '', // لا نعرض البيانات المشفرة
      delivery_method: service.delivery_method,
      purchase_price: service.purchase_price,
      selling_price: service.selling_price,
      total_quantity: service.total_quantity || 1,
      logo_url: service.logo_url || '',
      terms_conditions: service.terms_conditions || '',
      usage_instructions: service.usage_instructions || '',
      support_contact: service.support_contact || '',
      renewal_policy: service.renewal_policy || ''
    });
  };

  // تحويل حالة الخدمة إلى نص عربي
  const getStatusText = (service: SubscriptionService) => {
    if (!service.is_active) return 'غير نشط';
    if (service.available_quantity === 0) return 'نفد المخزون';
    return 'نشط ومتاح';
  };

  // تحويل حالة الخدمة إلى لون
  const getStatusColor = (service: SubscriptionService) => {
    if (!service.is_active) return 'bg-red-500';
    if (service.available_quantity === 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // مكون النموذج مع key ثابت لمنع فقدان التركيز
  const ServiceForm = React.useMemo(() => {
    return ({ isEdit = false }: { isEdit?: boolean }) => (
      <div className="grid gap-4 py-4" dir="rtl" key="service-form">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">اسم الخدمة *</Label>
            <Input
              id="service-name"
              key="service-name-input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="مثل: Netflix Premium"
              dir="rtl"
              className="text-right"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-provider">مقدم الخدمة *</Label>
            <Input
              id="service-provider"
              key="service-provider-input"
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
              placeholder="مثل: Netflix, Xbox"
              dir="rtl"
              className="text-right"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-description">وصف الخدمة</Label>
          <Textarea
            id="service-description"
            key="service-description-input"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="وصف تفصيلي للخدمة..."
            rows={2}
            dir="rtl"
            className="text-right"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-category">الفئة</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
              <SelectTrigger id="service-category">
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
            <Label htmlFor="service-type-select">نوع الخدمة</Label>
            <Select value={formData.service_type} onValueChange={(value) => setFormData({...formData, service_type: value})}>
              <SelectTrigger id="service-type-select">
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
          <Label htmlFor="service-credentials">بيانات الاشتراك {isEdit && '(اتركه فارغاً إذا لم تريد التغيير)'}</Label>
          <Textarea
            id="service-credentials"
            key="service-credentials-input"
            value={formData.credentials_data}
            onChange={(e) => setFormData({...formData, credentials_data: e.target.value})}
            placeholder="إيميل: example@gmail.com&#10;كلمة السر: password123&#10;أو كود التفعيل: ABC123"
            rows={3}
            dir="ltr"
            className="text-left font-mono"
          />
          <p className="text-sm text-muted-foreground">
            ⚠️ هذه البيانات سيتم تشفيرها لحماية خصوصية العملاء
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchase-price">سعر الشراء *</Label>
            <Input
              id="purchase-price"
              key="purchase-price-input"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchase_price}
              onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="selling-price">سعر البيع *</Label>
            <Input
              id="selling-price"
              key="selling-price-input"
              type="number"
              step="0.01"
              min="0"
              value={formData.selling_price}
              onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total-quantity">الكمية المتاحة *</Label>
            <Input
              id="total-quantity"
              key="total-quantity-input"
              type="number"
              min="1"
              value={formData.total_quantity}
              onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value) || 1})}
              dir="ltr"
              className="text-left"
            />
          </div>
        </div>

        {formData.purchase_price > 0 && formData.selling_price > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              💰 هامش الربح: {(formData.selling_price - formData.purchase_price).toFixed(2)} دج
              ({(((formData.selling_price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(1)}%)
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-method">طريقة التسليم</Label>
            <Select value={formData.delivery_method} onValueChange={(value: 'manual' | 'automatic') => setFormData({...formData, delivery_method: value})}>
              <SelectTrigger id="delivery-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">يدوي</SelectItem>
                <SelectItem value="automatic">تلقائي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-url">رابط الشعار</Label>
            <Input
              id="logo-url"
              key="logo-url-input"
              value={formData.logo_url}
              onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
              placeholder="https://example.com/logo.png"
              dir="ltr"
              className="text-left"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="usage-instructions">تعليمات الاستخدام</Label>
          <Textarea
            id="usage-instructions"
            key="usage-instructions-input"
            value={formData.usage_instructions}
            onChange={(e) => setFormData({...formData, usage_instructions: e.target.value})}
            placeholder="تعليمات لكيفية استخدام الخدمة..."
            rows={2}
            dir="rtl"
            className="text-right"
          />
        </div>
      </div>
    );
  }, [formData, categories]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* الرأس */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">خدمات الاشتراكات</h1>
            <p className="text-muted-foreground">إدارة اشتراكات الخدمات الرقمية مثل Netflix و Xbox</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة خدمة اشتراك
          </Button>
        </div>

        {/* الإحصائيات */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_count}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متاح للبيع</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.available_count}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats.total_profit.toFixed(2)} دج</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط هامش الربح</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">{stats.avg_profit_margin.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* أدوات التصفية والبحث */}
        <Card>
          <CardHeader>
            <CardTitle>تصفية وبحث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>البحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن خدمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
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
              </div>
              
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>أدوات</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 ml-2" />
                    تصدير
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 ml-2" />
                    استيراد
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* قائمة الخدمات */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة خدمات الاشتراكات ({filteredServices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-muted-foreground">جارٍ التحميل...</div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p>لا توجد خدمات اشتراكات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الخدمة</TableHead>
                    <TableHead>المقدم</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>سعر الشراء</TableHead>
                    <TableHead>سعر البيع</TableHead>
                    <TableHead>هامش الربح</TableHead>
                    <TableHead>الكمية المتاحة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {service.logo_url && (
                            <img src={service.logo_url} alt={service.name} className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-muted-foreground">{service.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {service.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {service.category?.name || 'غير محدد'}
                        </Badge>
                      </TableCell>
                      <TableCell>{service.purchase_price.toFixed(2)} دج</TableCell>
                      <TableCell>{service.selling_price.toFixed(2)} دج</TableCell>
                      <TableCell>
                        <div className="text-green-600">
                          {(service.profit_amount || 0).toFixed(2)} دج
                          <br />
                          <span className="text-xs">
                            ({(service.profit_margin || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{service.available_quantity}</div>
                          <div className="text-xs text-muted-foreground">من {service.total_quantity}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(service)}>
                          {getStatusText(service)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                prepareEditData(service);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateServiceStatus(service.id, !service.is_active)}
                            >
                              {service.is_active ? (
                                <>
                                  <Clock className="h-4 w-4 ml-2" />
                                  إيقاف الخدمة
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                  تفعيل الخدمة
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="h-4 w-4 ml-2" />
                                  حذف
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف خدمة الاشتراك "{service.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteService(service.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* نافذة إضافة خدمة جديدة */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة خدمة اشتراك جديدة</DialogTitle>
              <DialogDescription>
                أضف خدمة اشتراك رقمية جديدة مثل Netflix أو Xbox Live
              </DialogDescription>
            </DialogHeader>
            <ServiceForm />
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

        {/* نافذة تعديل خدمة */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل خدمة الاشتراك</DialogTitle>
              <DialogDescription>
                تعديل معلومات خدمة الاشتراك "{selectedService?.name}"
              </DialogDescription>
            </DialogHeader>
            <ServiceForm isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateService}>
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SubscriptionServicesPage; 