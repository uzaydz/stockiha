import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  CreditCard, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Zap,
  TrendingUp,
  Users,
  ShoppingCart,
  X,
  Info,
  Clock,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface RechargePackage {
  id: string;
  name: string;
  description: string;
  orders_count: number;
  price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
}

interface OnlineOrdersLimit {
  current_limit: number;
  used_count: number;
  remaining_count: number;
  reset_date: string;
  last_recharge_date?: string;
  is_limit_exceeded: boolean;
}

interface RechargeHistory {
  id: string;
  package_id: string;
  orders_count: number;
  amount_paid: number;
  currency: string;
  status: string;
  created_at: string;
}

interface OnlineOrdersRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// دالة تحويل الأرقام إلى العربية
const toArabicNumbers = (num: number): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, (d) => arabicNumbers[parseInt(d)]);
};

// دالة تنسيق التاريخ بالعربية
const formatArabicDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  
  const arabicDate = new Intl.DateTimeFormat('ar-SA', options).format(date);
  return arabicDate.replace(/\d/g, (d) => toArabicNumbers(parseInt(d)));
};

// دالة تنسيق الوقت بالعربية
const formatArabicTime = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  const arabicTime = new Intl.DateTimeFormat('ar-SA', options).format(date);
  return arabicTime.replace(/\d/g, (d) => toArabicNumbers(parseInt(d)));
};

const OnlineOrdersRechargeModal: React.FC<OnlineOrdersRechargeModalProps> = ({
  isOpen,
  onClose
}) => {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [limits, setLimits] = useState<OnlineOrdersLimit | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (isOpen && organization) {
      fetchData();
    }
  }, [isOpen, organization]);

  const fetchData = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      // جلب حزم إعادة الشحن
      const { data: packagesData, error: packagesError } = await supabase
        .from('online_orders_recharge_packages' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (packagesError) throw packagesError;
      setPackages((packagesData as RechargePackage[]) || []);

      // جلب حدود الطلبيات
      const { data: limitsData, error: limitsError } = await supabase
        .rpc('check_online_orders_limit', {
          p_organization_id: organization.id
        });

      if (limitsError) throw limitsError;
      setLimits(limitsData as OnlineOrdersLimit);

      // جلب سجل إعادة الشحن
      try {
        const { data: historyData, error: historyError } = await supabase
          .from('online_orders_recharge_history' as any)
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });
        
        if (historyError) {
          console.warn('خطأ في جلب تاريخ إعادة الشحن:', historyError);
          setRechargeHistory([]);
        } else {
          setRechargeHistory((historyData as RechargeHistory[]) || []);
        }
      } catch (err) {
        console.warn('خطأ في جلب تاريخ إعادة الشحن:', err);
        setRechargeHistory([]);
      }

    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (pkg: RechargePackage) => {
    setSelectedPackage(pkg);
    setShowPaymentDialog(true);
  };

  const handlePayment = async () => {
    if (!selectedPackage || !organization) return;
    
    setLoading(true);
    try {
      // هنا يمكن إضافة منطق الدفع الفعلي
      // حالياً سنقوم بمحاكاة عملية الدفع
      
      const { data, error } = await supabase
        .from('online_orders_recharge_history' as any)
        .insert({
          organization_id: organization.id,
          package_id: selectedPackage.id,
          orders_count: selectedPackage.orders_count,
          amount_paid: selectedPackage.price,
          currency: selectedPackage.currency,
          status: 'pending',
          payment_method: 'online',
          payment_reference: `RECHARGE_${Date.now()}`
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`تم إضافة ${toArabicNumbers(selectedPackage.orders_count)} طلبية بنجاح!`);
      setShowPaymentDialog(false);
      setSelectedPackage(null);
      fetchData(); // تحديث البيانات

    } catch (error) {
      console.error('خطأ في عملية الدفع:', error);
      toast.error('حدث خطأ في عملية الدفع');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'قيد المعالجة';
      case 'failed': return 'فشل';
      default: return 'غير معروف';
    }
  };

  const formatPackageName = (ordersCount: number) => `حزمة ${toArabicNumbers(ordersCount)} طلبية`;

  return (
    <>
      {/* النافذة المنبثقة الرئيسية */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
          <DialogHeader className="relative bg-white rounded-t-lg p-6 shadow-sm border-b">
            <DialogTitle className="text-3xl font-bold text-center text-slate-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              إعادة شحن الطلبيات الإلكترونية
            </DialogTitle>
            <p className="text-center text-slate-600 mt-2">
              إدارة حدود الطلبيات وإعادة الشحن للمؤسسة
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 h-10 w-10 p-0 hover:bg-slate-100 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <RefreshCw className="h-12 w-12 animate-spin text-blue-600" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              </div>
              <span className="mt-4 text-lg text-slate-600 font-medium">جاري التحميل...</span>
              <span className="text-sm text-slate-500 mt-1">يرجى الانتظار</span>
            </div>
          ) : (
            <div className="p-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8 bg-white shadow-sm border rounded-xl p-1">
                  <TabsTrigger value="overview" className="flex items-center gap-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">النظرة العامة</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex items-center gap-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
                    <Package className="h-5 w-5" />
                    <span className="font-medium">الحزم المتاحة</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">السجل</span>
                  </TabsTrigger>
                  <TabsTrigger value="limits" className="flex items-center gap-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">الحدود</span>
                  </TabsTrigger>
                </TabsList>

                {/* تبويب النظرة العامة */}
                <TabsContent value="overview" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* بطاقة الحد الحالي */}
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-3 text-blue-800">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <ShoppingCart className="h-6 w-6 text-blue-600" />
                          </div>
                          الحد الحالي
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {limits ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-blue-600">{toArabicNumbers(limits.current_limit)}</div>
                                <div className="text-xs text-blue-600 font-medium">الحد الكلي</div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-orange-600">{toArabicNumbers(limits.used_count)}</div>
                                <div className="text-xs text-orange-600 font-medium">المستخدم</div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-emerald-600">{toArabicNumbers(limits.remaining_count)}</div>
                                <div className="text-xs text-emerald-600 font-medium">المتبقي</div>
                              </div>
                            </div>
                            {limits.is_limit_exceeded && (
                              <Badge variant="destructive" className="w-full justify-center py-2 text-sm font-medium">
                                ⚠️ تم تجاوز الحد
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 py-8">
                            <Info className="h-8 w-8 mx-auto mb-3 text-slate-400" />
                            <p>لا توجد بيانات متاحة</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* بطاقة إعادة الشحن */}
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-3 text-amber-800">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Zap className="h-6 w-6 text-amber-600" />
                          </div>
                          إعادة الشحن
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-amber-700 leading-relaxed">
                            اختر حزمة إعادة شحن لزيادة حد الطلبيات الإلكترونية
                          </p>
                          <Button 
                            onClick={() => document.getElementById('packages-tab')?.click()}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <Package className="h-4 w-4 ml-2" />
                            عرض الحزم المتاحة
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* بطاقة الإحصائيات */}
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-3 text-purple-800">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Users className="h-6 w-6 text-purple-600" />
                          </div>
                          الإحصائيات
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                            <span className="text-sm text-purple-700 font-medium">إجمالي الحزم:</span>
                            <span className="font-bold text-purple-800">{toArabicNumbers(packages.length)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                            <span className="text-sm text-purple-700 font-medium">المعاملات:</span>
                            <span className="font-bold text-purple-800">{toArabicNumbers(rechargeHistory.length)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                            <span className="text-sm text-purple-700 font-medium">آخر تحديث:</span>
                            <span className="font-bold text-purple-800 text-sm">
                              {limits?.last_recharge_date ? formatArabicDate(limits.last_recharge_date) : 'غير متوفر'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* تبويب الحزم المتاحة */}
                <TabsContent value="packages" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">اختر من بين الحزم المتاحة</h3>
                    <p className="text-slate-600">حزم مرنة تناسب احتياجاتك</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg, index) => (
                      <Card key={pkg.id} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 bg-gradient-to-br from-white to-blue-50">
                        <CardHeader className="text-center pb-4 relative">
                          <div className="absolute top-4 right-4">
                            <Badge variant="secondary" className="text-xs">
                              {toArabicNumbers(index + 1)}
                            </Badge>
                          </div>
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Package className="h-10 w-10 text-blue-600" />
                          </div>
                          <CardTitle className="text-xl text-slate-800 mb-2">{pkg.name}</CardTitle>
                          <CardDescription className="text-slate-600 leading-relaxed">{pkg.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                          <div className="space-y-3">
                            <div className="text-4xl font-bold text-blue-600 mb-2">
                              {toArabicNumbers(pkg.orders_count)}
                            </div>
                            <p className="text-sm text-slate-600 font-medium">طلبية إلكترونية</p>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-200">
                            <div className="text-3xl font-bold text-emerald-600 mb-1">
                              {toArabicNumbers(pkg.price)}
                            </div>
                            <p className="text-sm text-slate-600 font-medium">{pkg.currency}</p>
                          </div>

                          <Button 
                            onClick={() => handlePackageSelect(pkg)}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 py-3 text-lg font-medium"
                            disabled={loading}
                          >
                            <CreditCard className="h-5 w-5 ml-2" />
                            شراء الحزمة
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* تبويب السجل */}
                <TabsContent value="history" className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">سجل عمليات إعادة الشحن</h3>
                    <p className="text-slate-600">تاريخ جميع عمليات إعادة الشحن</p>
                  </div>
                  
                  <div className="space-y-4">
                    {rechargeHistory.length > 0 ? (
                      rechargeHistory.map((item) => (
                        <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-full">
                                  <Package className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-slate-800 mb-1">
                                    {formatPackageName(item.orders_count)}
                                  </h4>
                                  <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatArabicDate(item.created_at)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {formatArabicTime(item.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex flex-col items-end gap-2">
                                  <Badge 
                                    className={`${getStatusColor(item.status)} border px-3 py-1 font-medium`}
                                  >
                                    {getStatusText(item.status)}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-lg font-bold text-emerald-600">
                                    <DollarSign className="h-4 w-4" />
                                    {toArabicNumbers(item.amount_paid)} {item.currency}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-16">
                        <Package className="h-16 w-16 mx-auto mb-6 text-slate-400" />
                        <h4 className="text-xl font-medium mb-2">لا توجد معاملات إعادة شحن</h4>
                        <p className="text-slate-600 mb-6">
                          لم تقم بأي عملية إعادة شحن حتى الآن
                        </p>
                        <Button 
                          onClick={() => document.getElementById('packages-tab')?.click()}
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Zap className="h-4 w-4 ml-2" />
                          إعادة الشحن الآن
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* تبويب الحدود */}
                <TabsContent value="limits" className="space-y-8">
                  <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl flex items-center gap-3 text-slate-800">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <AlertCircle className="h-7 w-7 text-orange-600" />
                        </div>
                        تفاصيل حدود الطلبيات
                      </CardTitle>
                      <CardDescription className="text-lg text-slate-600">
                        معلومات مفصلة عن حدود الطلبيات الإلكترونية للمؤسسة
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {limits ? (
                        <div className="space-y-8">
                          {/* معلومات الحدود */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                              <div className="text-4xl font-bold text-blue-600 mb-2">{toArabicNumbers(limits.current_limit)}</div>
                              <div className="text-sm text-blue-700 font-medium">الحد الكلي</div>
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                              <div className="text-4xl font-bold text-orange-600 mb-2">{toArabicNumbers(limits.used_count)}</div>
                              <div className="text-sm text-orange-700 font-medium">المستخدم</div>
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                              <div className="text-4xl font-bold text-emerald-600 mb-2">{toArabicNumbers(limits.remaining_count)}</div>
                              <div className="text-sm text-emerald-700 font-medium">المتبقي</div>
                            </div>
                          </div>

                          {/* تفاصيل إضافية */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border">
                              <span className="font-medium text-slate-700 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                تاريخ إعادة التعيين:
                              </span>
                              <span className="font-semibold text-slate-800">{formatArabicDate(limits.reset_date)}</span>
                            </div>
                            {limits.last_recharge_date && (
                              <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border">
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-amber-600" />
                                  آخر إعادة شحن:
                                </span>
                                <span className="font-semibold text-slate-800">{formatArabicDate(limits.last_recharge_date)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border">
                              <span className="font-medium text-slate-700 flex items-center gap-2">
                                <Info className="h-4 w-4 text-purple-600" />
                                حالة الحد:
                              </span>
                              <Badge 
                                variant={limits.is_limit_exceeded ? "destructive" : "default"}
                                className={`px-4 py-2 text-sm font-medium ${limits.is_limit_exceeded ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                              >
                                {limits.is_limit_exceeded ? "⚠️ تم تجاوز الحد" : "✅ ضمن الحد"}
                              </Badge>
                            </div>
                          </div>

                          {/* تحذير إذا تم تجاوز الحد */}
                          {limits.is_limit_exceeded && (
                            <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
                              <div className="flex items-center gap-3 text-red-800 mb-3">
                                <AlertCircle className="h-6 w-6" />
                                <span className="text-lg font-semibold">تحذير: تم تجاوز حد الطلبيات</span>
                              </div>
                              <p className="text-red-700 leading-relaxed">
                                يجب عليك شراء حزمة إعادة شحن لاستئناف قبول الطلبيات الإلكترونية.
                              </p>
                              <Button 
                                onClick={() => document.getElementById('packages-tab')?.click()}
                                className="mt-4 bg-red-600 hover:bg-red-700 text-white border-0"
                              >
                                <Package className="h-4 w-4 ml-2" />
                                شراء حزمة إعادة شحن
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 py-16">
                          <AlertCircle className="h-16 w-16 mx-auto mb-6 text-slate-400" />
                          <h4 className="text-xl font-medium mb-2">لا توجد بيانات حدود متاحة</h4>
                          <p className="text-slate-600 mb-6">
                            لا يمكن تحميل بيانات الحدود حالياً
                          </p>
                          <Button onClick={fetchData} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                            <RefreshCw className="h-4 w-4 ml-2" />
                            إعادة المحاولة
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة الدفع */}
      {showPaymentDialog && selectedPackage && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md bg-gradient-to-br from-white to-blue-50">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-800">
                تأكيد الشراء
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
                <h4 className="font-bold text-lg text-slate-800 mb-3 text-center">{selectedPackage.name}</h4>
                <p className="text-sm text-slate-600 mb-4 text-center leading-relaxed">{selectedPackage.description}</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-slate-700 font-medium">عدد الطلبيات:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      {toArabicNumbers(selectedPackage.orders_count)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm text-slate-700 font-medium">السعر:</span>
                    <span className="font-bold text-xl text-emerald-600">
                      {toArabicNumbers(selectedPackage.price)} {selectedPackage.currency}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </Button>
                <Button 
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      معالجة...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 ml-2" />
                      تأكيد الشراء
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default OnlineOrdersRechargeModal;
