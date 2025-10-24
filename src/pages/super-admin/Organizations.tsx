import { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  RefreshCw,
  Package,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { subscriptionCache } from '@/lib/subscription-cache';
import { SubscriptionPlan } from '@/types/subscription';

// نوع بيانات المؤسسة
interface AdminOrganization {
  organization_id: string;
  organization_name: string;
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
  domain: string | null;
  subdomain: string | null;
  users_count: number;
  subscription_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_code: string | null;
  subscription_state: string | null;
  billing_cycle: string | null;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
  amount_paid: number | null;
  last_updated: string | null;
}

// Subscription status badge component
const SubscriptionStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">فعّال</Badge>;
    case 'trial':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">تجريبي</Badge>;
    case 'expired':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">منتهي</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">قيد المراجعة</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Subscription tier badge component
const SubscriptionTierBadge = ({ tier }: { tier: string }) => {
  switch (tier) {
    case 'free':
      return <Badge variant="outline">مجاني</Badge>;
    case 'basic':
      return <Badge variant="secondary">أساسي</Badge>;
    case 'premium':
      return <Badge variant="default">متميز</Badge>;
    case 'enterprise':
      return <Badge variant="destructive">مؤسسات</Badge>;
    default:
      return <Badge>{tier}</Badge>;
  }
};

export default function SuperAdminOrganizations() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<AdminOrganization | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    planId: '',
    status: 'active',
    billingCycle: 'yearly',
    startDate: '',
    endDate: '',
    amountPaid: '',
    currency: 'DZD',
    notes: '',
    trainingCoursesAccess: false
  });

  // States for termination dialog
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [terminateFormState, setTerminateFormState] = useState({
    keepCoursesAccess: false,
    terminationReason: '',
    terminationNotes: ''
  });

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans((data || []) as any);
    } catch (err: any) {
      console.error('[Organizations] خطأ في جلب الخطط:', err);
      toast({
        variant: 'destructive',
        title: 'خطأ في جلب خطط الاشتراك',
        description: err.message || 'تعذر تحميل خطط الاشتراك.'
      });
    }
  };

  const fetchOrganizations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      
      const { data, error } = await supabase.rpc('admin_get_organizations_with_subscriptions' as any, {
        p_search: debouncedSearchQuery.trim() || null,
        p_status: subscriptionFilter === 'all' ? null : subscriptionFilter,
        p_tier: tierFilter === 'all' ? null : tierFilter,
        p_limit: pageSize,
        p_offset: offset
      });

      if (error) {
        console.error('[Organizations] خطأ في جلب المؤسسات:', error);
        throw error;
      }
      
      const organizations = (data || []) as AdminOrganization[];
      setOrganizations(organizations);
      
      // حساب العدد الكلي (يمكن تحسينه بإضافة RPC منفصل)
      // في حالة وصول عدد النتائج للحد الأقصى، نفترض وجود المزيد
      if (organizations.length === pageSize) {
        setTotalCount((currentPage + 1) * pageSize);
      } else {
        setTotalCount(offset + organizations.length);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Organizations] تم جلب', organizations.length, 'مؤسسة، الصفحة', currentPage);
      }
    } catch (err: any) {
      console.error('[Organizations] خطأ:', err);
      setError(err.message || 'فشل في جلب بيانات المؤسسات');
      setOrganizations([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrganizations();
  };

  const openManageDialog = (org: AdminOrganization) => {
    setSelectedOrganization(org);
    const defaultPlan = org.plan_id ?? plans[0]?.id ?? '';
    const status = org.subscription_state || org.subscription_status || 'pending';
    const billingCycle = org.billing_cycle || 'yearly';
    const startDate = org.start_date || new Date().toISOString().split('T')[0];
    const endDate = org.end_date || '';

    setFormState({
      planId: defaultPlan,
      status,
      billingCycle,
      startDate,
      endDate,
      amountPaid: org.amount_paid ? String(org.amount_paid) : '',
      currency: 'DZD',
      notes: '',
      trainingCoursesAccess: false
    });

    setManageDialogOpen(true);
  };

  const handleManageClose = (open: boolean) => {
    setManageDialogOpen(open);
    if (!open) {
      setSelectedOrganization(null);
      setFormState({
        planId: '',
        status: 'active',
        billingCycle: 'yearly',
        startDate: '',
        endDate: '',
        amountPaid: '',
        currency: 'DZD',
        notes: '',
        trainingCoursesAccess: false
      });
    }
  };

  const handleFormChange = (key: keyof typeof formState, value: string | boolean) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleTerminateFormChange = (key: keyof typeof terminateFormState, value: string | boolean) => {
    setTerminateFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSubscription = async () => {
    if (!selectedOrganization) return;
    if (!formState.planId) {
      toast({
        variant: 'destructive',
        title: 'يرجى اختيار الخطة',
        description: 'يجب اختيار خطة اشتراك قبل الحفظ.'
      });
      return;
    }

    setSaving(true);
    
    // إضافة loading indicator للزر
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.rpc('admin_upsert_subscription' as any, {
        p_organization_id: selectedOrganization.organization_id,
        p_plan_id: formState.planId,
        p_status: formState.status,
        p_billing_cycle: formState.billingCycle,
        p_start_date: formState.startDate || null,
        p_end_date: formState.endDate || null,
        p_amount_paid: formState.amountPaid ? Number(formState.amountPaid) : 0,
        p_currency: formState.currency || 'DZD',
        p_notes: formState.notes || null,
        p_training_courses_access: formState.trainingCoursesAccess
      });

      if (error) {
        console.error('[Organizations] خطأ في تحديث الاشتراك:', error);
        throw new Error(error.message || 'فشل في تحديث الاشتراك');
      }

      if (!(data as any)?.success) {
        console.error('[Organizations] خطأ في تحديث الاشتراك:', (data as any)?.error);
        throw new Error((data as any)?.error || 'فشل في تحديث الاشتراك');
      }

      subscriptionCache.clearCache(selectedOrganization.organization_id);

      // قياس الأداء
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Organizations] تم تحديث الاشتراك في ${duration}ms`);
      }

      toast({
        title: 'تم تحديث الاشتراك',
        description: `تم حفظ الاشتراك بنجاح وتحديث بيانات المؤسسة${formState.trainingCoursesAccess ? ' مع الوصول للدورات التدريبية' : ''}.`
      });

      handleManageClose(false);
      await fetchOrganizations();
    } catch (err: any) {
      console.error('[Organizations] خطأ في تحديث الاشتراك:', err);
      
      // تحسين رسائل الخطأ
      let errorMessage = 'حدث خطأ غير متوقع';
      if (err.message.includes('subscription_id')) {
        errorMessage = 'خطأ في بنية قاعدة البيانات - يرجى التواصل مع المطور';
      } else if (err.message.includes('not_authorized')) {
        errorMessage = 'ليس لديك صلاحيات لتعديل الاشتراكات';
      } else if (err.message.includes('plan_not_found')) {
        errorMessage = 'خطة الاشتراك المحددة غير موجودة';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      toast({
        variant: 'destructive',
        title: 'فشل في تحديث الاشتراك',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSubscription = async () => {
    if (!selectedOrganization) return;

    setSaving(true);
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.rpc('admin_terminate_subscription' as any, {
        p_organization_id: selectedOrganization.organization_id,
        p_keep_courses_access: terminateFormState.keepCoursesAccess,
        p_termination_reason: terminateFormState.terminationReason,
        p_termination_notes: terminateFormState.terminationNotes
      });

      if (error) {
        console.error('[Organizations] خطأ في إنهاء الاشتراك:', error);
        throw new Error(error.message || 'فشل في إنهاء الاشتراك');
      }

      if (!(data as any)?.success) {
        console.error('[Organizations] خطأ في إنهاء الاشتراك:', (data as any)?.error);
        throw new Error((data as any)?.error || 'فشل في إنهاء الاشتراك');
      }

      subscriptionCache.clearCache(selectedOrganization.organization_id);

      // قياس الأداء
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Organizations] تم إنهاء الاشتراك في ${duration}ms`);
      }

      toast({
        title: 'تم إنهاء الاشتراك',
        description: `تم إنهاء اشتراك المؤسسة بنجاح${terminateFormState.keepCoursesAccess ? ' مع الاحتفاظ بالوصول للدورات مدى الحياة' : ''}.`
      });

      setTerminateDialogOpen(false);
      await fetchOrganizations();
    } catch (err: any) {
      console.error('[Organizations] خطأ في إنهاء الاشتراك:', err);
      
      let errorMessage = 'حدث خطأ غير متوقع';
      if (err.message.includes('not_authorized')) {
        errorMessage = 'ليس لديك صلاحيات لإنهاء الاشتراكات';
      } else if (err.message.includes('subscription_not_found')) {
        errorMessage = 'الاشتراك غير موجود';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      toast({
        variant: 'destructive',
        title: 'فشل في إنهاء الاشتراك',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const openTerminateDialog = (org: AdminOrganization) => {
    setSelectedOrganization(org);
    setTerminateFormState({
      keepCoursesAccess: false,
      terminationReason: '',
      terminationNotes: ''
    });
    setTerminateDialogOpen(true);
  };

  const handleTerminateClose = (open: boolean) => {
    setTerminateDialogOpen(open);
    if (!open) {
      setSelectedOrganization(null);
      setTerminateFormState({
        keepCoursesAccess: false,
        terminationReason: '',
        terminationNotes: ''
      });
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // إعادة تعيين الصفحة إلى 1 عند تغيير الفلاتر أو البحث
    setCurrentPage(1);
  }, [debouncedSearchQuery, subscriptionFilter, tierFilter]);

  useEffect(() => {
    fetchOrganizations();
  }, [currentPage, pageSize, debouncedSearchQuery, subscriptionFilter, tierFilter]);
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  // عدد المؤسسات النشطة والتجريبية والمنتهية
  const { activeOrganizations, trialOrganizations, expiredOrganizations, pendingOrganizations } = useMemo(() => {
    let active = 0;
    let trial = 0;
    let expired = 0;
    let pending = 0;

    organizations.forEach(org => {
      const status = org.subscription_status || org.subscription_state || 'unknown';
      switch (status) {
        case 'active':
          active++;
          break;
        case 'trial':
          trial++;
          break;
        case 'expired':
          expired++;
          break;
        case 'pending':
          pending++;
          break;
        default:
          break;
      }
    });

    return { activeOrganizations: active, trialOrganizations: trial, expiredOrganizations: expired, pendingOrganizations: pending };
  }, [organizations]);
  
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المؤسسات</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة جميع المؤسسات المسجلة في النظام</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>تحديث</span>
            </Button>
            <Button className="gap-2" disabled>
              <Plus className="h-4 w-4" />
              <span>إضافة مؤسسة</span>
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                مؤسسات نشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-green-600">
                {activeOrganizations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">اشتراكات مدفوعة</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                مؤسسات تجريبية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-blue-600">
                {trialOrganizations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">فترة تجريبية</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                اشتراكات منتهية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-red-600">
                {expiredOrganizations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">تحتاج متابعة</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                قيد التفعيل
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-amber-600">
                {pendingOrganizations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">في انتظار الموافقة</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>قائمة المؤسسات</CardTitle>
                <CardDescription>
                  عرض وإدارة المؤسسات المسجلة في النظام 
                  {!isLoading && totalCount > 0 && (
                    <span className="font-medium text-foreground"> ({totalCount} مؤسسة)</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOrganizations}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">تحديث</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">إضافة مؤسسة</span>
                  <span className="sm:hidden">إضافة</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters and search */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن مؤسسة أو نطاق فرعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-4 pr-10 h-10"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">تصفية:</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                      <SelectTrigger className="w-full sm:w-44 h-10">
                        <SelectValue placeholder="حالة الاشتراك" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="active">فعّال</SelectItem>
                        <SelectItem value="trial">تجريبي</SelectItem>
                        <SelectItem value="expired">منتهي</SelectItem>
                        <SelectItem value="pending">قيد المراجعة</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="w-full sm:w-44 h-10">
                        <SelectValue placeholder="نوع الاشتراك" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        <SelectItem value="free">مجاني</SelectItem>
                        <SelectItem value="basic">أساسي</SelectItem>
                        <SelectItem value="premium">متميز</SelectItem>
                        <SelectItem value="enterprise">مؤسسات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">جاري تحميل المؤسسات...</p>
                    <p className="text-xs text-muted-foreground mt-1">يرجى الانتظار</p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">خطأ في تحميل البيانات</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={fetchOrganizations}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  إعادة المحاولة
                </Button>
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مؤسسات</h3>
                <p className="text-sm text-muted-foreground mb-4">لا توجد مؤسسات تطابق معايير البحث الحالية</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setSubscriptionFilter('all');
                    setTierFilter('all');
                  }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  مسح الفلاتر
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 shadow-sm bg-card overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-b border-border/50">
                      <TableHead className="w-[250px] min-w-[200px] font-semibold text-foreground sticky right-0 bg-muted/30 z-10">اسم المؤسسة</TableHead>
                      <TableHead className="w-[150px] min-w-[120px] font-semibold text-foreground">النطاق الفرعي</TableHead>
                      <TableHead className="w-[120px] min-w-[100px] font-semibold text-foreground">الباقة الحالية</TableHead>
                      <TableHead className="w-[100px] min-w-[80px] font-semibold text-foreground">الحالة</TableHead>
                      <TableHead className="w-[120px] min-w-[100px] font-semibold text-foreground">الأيام المتبقية</TableHead>
                      <TableHead className="w-[100px] min-w-[80px] font-semibold text-foreground">المستخدمين</TableHead>
                      <TableHead className="w-[140px] min-w-[120px] font-semibold text-foreground">تاريخ الإنشاء</TableHead>
                      <TableHead className="w-[200px] min-w-[180px] text-left font-semibold text-foreground">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/30">
                    {organizations.map((org, index) => (
                      <TableRow 
                        key={org.organization_id}
                        className="hover:bg-muted/20 transition-colors duration-200 group"
                      >
                        <TableCell className="py-4 w-[250px] min-w-[200px] sticky right-0 bg-background z-10">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground break-words leading-tight" title={org.organization_name}>
                                {org.organization_name}
                              </div>
                              {org.plan_name && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Package className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate" title={org.plan_name}>{org.plan_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[150px] min-w-[120px]">
                          <div className="flex items-center gap-2">
                            {org.subdomain ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md border truncate" title={org.subdomain}>
                                  {org.subdomain}
                                </span>
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <XCircle className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">غير محدد</span>
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[120px] min-w-[100px]">
                          <div className="flex items-center justify-center">
                            <SubscriptionTierBadge tier={org.subscription_tier} />
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[100px] min-w-[80px]">
                          <div className="flex items-center justify-center">
                            <SubscriptionStatusBadge status={org.subscription_status} />
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[120px] min-w-[100px]">
                          {org.days_remaining !== null ? (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                org.days_remaining < 7 ? 'bg-red-500' :
                                org.days_remaining < 30 ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}></div>
                              <span className={`text-sm font-medium truncate ${
                                org.days_remaining < 7 ? 'text-red-600' :
                                org.days_remaining < 30 ? 'text-amber-600' :
                                'text-green-600'
                              }`}>
                                {org.days_remaining > 0 ? `${org.days_remaining} يوم` : 'منتهي'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>—</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 w-[100px] min-w-[80px]">
                          <div className="flex items-center justify-center gap-1">
                            <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                              {org.users_count}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[140px] min-w-[120px]">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate" title={formatDate(org.created_at)}>
                              {formatDate(org.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 w-[200px] min-w-[180px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openManageDialog(org)}
                              className="h-8 px-3 text-xs flex-shrink-0"
                            >
                              <Package className="w-3 h-3 ml-1" />
                              <span className="hidden sm:inline">تغيير الباقة</span>
                              <span className="sm:hidden">تغيير</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <span className="sr-only">فتح القائمة</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  عرض التفاصيل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" />
                                  إدارة المستخدمين
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 flex items-center gap-2"
                                  onClick={() => openTerminateDialog(org)}
                                >
                                  <XCircle className="w-4 h-4" />
                                  إنهاء الاشتراك
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 flex items-center gap-2">
                                  <XCircle className="w-4 h-4" />
                                  تعليق الحساب
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination */}
            {!isLoading && !error && organizations.length > 0 && (
              <div className="bg-muted/20 rounded-lg p-4 mt-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">عرض</span>
                      <Select value={pageSize.toString()} onValueChange={(v) => {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="h-9 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 / صفحة</SelectItem>
                          <SelectItem value="20">20 / صفحة</SelectItem>
                          <SelectItem value="50">50 / صفحة</SelectItem>
                          <SelectItem value="100">100 / صفحة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {((currentPage - 1) * pageSize) + 1}
                      </span>
                      <span className="mx-1">-</span>
                      <span className="font-medium text-foreground">
                        {Math.min(currentPage * pageSize, totalCount)}
                      </span>
                      <span className="mx-1">من</span>
                      <span className="font-medium text-foreground">{totalCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="الصفحة الأولى"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        title="الصفحة السابقة"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border">
                      <span className="text-sm font-medium">الصفحة</span>
                      <Input
                        type="number"
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page > 0 && page <= Math.ceil(totalCount / pageSize)) {
                            setCurrentPage(page);
                          }
                        }}
                        className="h-7 w-12 text-center text-sm"
                        min={1}
                        max={Math.ceil(totalCount / pageSize)}
                      />
                      <span className="text-sm text-muted-foreground">
                        من {Math.ceil(totalCount / pageSize)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage * pageSize >= totalCount}
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9"
                        onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                        disabled={currentPage * pageSize >= totalCount}
                        title="الصفحة الأخيرة"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog لتعديل الاشتراك */}
      <Dialog open={manageDialogOpen} onOpenChange={handleManageClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              إدارة اشتراك {selectedOrganization?.organization_name}
            </DialogTitle>
            <DialogDescription>
              قم بتحديث خطة الاشتراك وتفاصيل الفوترة للمؤسسة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* معلومات المؤسسة الحالية */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">الاشتراك الحالي</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">الباقة الحالية: </span>
                  <span className="font-medium">{selectedOrganization?.plan_name || 'غير محدد'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة: </span>
                  {selectedOrganization && (
                    <SubscriptionStatusBadge status={selectedOrganization.subscription_status} />
                  )}
                </div>
                {selectedOrganization?.end_date && (
                  <div>
                    <span className="text-muted-foreground">تاريخ الانتهاء: </span>
                    <span className="font-medium">{formatDate(selectedOrganization.end_date)}</span>
                  </div>
                )}
                {selectedOrganization?.days_remaining !== null && selectedOrganization?.days_remaining !== undefined && (
                  <div>
                    <span className="text-muted-foreground">الأيام المتبقية: </span>
                    <span className={`font-medium ${
                      (selectedOrganization?.days_remaining ?? 0) < 7 ? 'text-red-600' : 
                      (selectedOrganization?.days_remaining ?? 0) < 30 ? 'text-amber-600' : 
                      'text-green-600'
                    }`}>
                      {selectedOrganization?.days_remaining ?? 0} يوم
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* خطة الاشتراك الجديدة */}
            <div className="space-y-2">
              <Label htmlFor="plan">خطة الاشتراك الجديدة *</Label>
              <Select value={formState.planId} onValueChange={(v) => handleFormChange('planId', v)}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="اختر خطة الاشتراك" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(plan as any).code || (plan as any).plan_code || 'N/A'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.planId && plans.find(p => p.id === formState.planId) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {plans.find(p => p.id === formState.planId)?.description}
                </p>
              )}
            </div>

            {/* حالة الاشتراك */}
            <div className="space-y-2">
              <Label htmlFor="status">حالة الاشتراك *</Label>
              <Select value={formState.status} onValueChange={(v) => handleFormChange('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعّال</SelectItem>
                  <SelectItem value="trial">تجريبي</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* دورة الفوترة */}
            <div className="space-y-2">
              <Label htmlFor="billing">دورة الفوترة</Label>
              <Select value={formState.billingCycle} onValueChange={(v) => handleFormChange('billingCycle', v)}>
                <SelectTrigger id="billing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="quarterly">ربع سنوي</SelectItem>
                  <SelectItem value="yearly">سنوي</SelectItem>
                  <SelectItem value="lifetime">مدى الحياة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* تواريخ الاشتراك */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">تاريخ البدء</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">تاريخ الانتهاء</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formState.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                  min={formState.startDate}
                />
              </div>
            </div>

            {/* المبلغ المدفوع */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="amount">المبلغ المدفوع</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formState.amountPaid}
                  onChange={(e) => handleFormChange('amountPaid', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select value={formState.currency} onValueChange={(v) => handleFormChange('currency', v)}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DZD">دينار جزائري</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">يورو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* خيارات الدورات التدريبية */}
            <div className="space-y-3">
              <Label className="text-base font-medium">خيارات الدورات التدريبية</Label>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="trainingCourses"
                    checked={formState.trainingCoursesAccess}
                    onCheckedChange={(checked) => handleFormChange('trainingCoursesAccess', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="trainingCourses" className="text-sm font-medium cursor-pointer">
                      منح الوصول لجميع دورات سطوكيها مدى الحياة
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      سيحصل المستخدمون على وصول كامل لجميع الدورات التدريبية المتاحة في منصة سطوكيها
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                placeholder="أضف أي ملاحظات حول هذا الاشتراك..."
                value={formState.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleManageClose(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSaveSubscription} disabled={saving || !formState.planId}>
              {saving ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog لإنهاء الاشتراك */}
      <Dialog open={terminateDialogOpen} onOpenChange={handleTerminateClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">
              إنهاء اشتراك {selectedOrganization?.organization_name}
            </DialogTitle>
            <DialogDescription>
              تحذير: هذا الإجراء سينهي اشتراك المؤسسة نهائياً. يرجى التأكد من جميع التفاصيل قبل المتابعة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* معلومات المؤسسة الحالية */}
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2 border border-red-200">
              <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">الاشتراك الحالي</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-red-600">الباقة الحالية: </span>
                  <span className="font-medium">{selectedOrganization?.plan_name || 'غير محدد'}</span>
                </div>
                <div>
                  <span className="text-red-600">الحالة: </span>
                  {selectedOrganization && (
                    <SubscriptionStatusBadge status={selectedOrganization.subscription_status} />
                  )}
                </div>
                {selectedOrganization?.end_date && (
                  <div>
                    <span className="text-red-600">تاريخ الانتهاء: </span>
                    <span className="font-medium">{formatDate(selectedOrganization.end_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* سبب إنهاء الاشتراك */}
            <div className="space-y-2">
              <Label htmlFor="terminationReason">سبب إنهاء الاشتراك *</Label>
              <Select 
                value={terminateFormState.terminationReason} 
                onValueChange={(v) => handleTerminateFormChange('terminationReason', v)}
              >
                <SelectTrigger id="terminationReason">
                  <SelectValue placeholder="اختر سبب إنهاء الاشتراك" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_payment">عدم السداد</SelectItem>
                  <SelectItem value="violation">انتهاك شروط الاستخدام</SelectItem>
                  <SelectItem value="request">طلب من المؤسسة</SelectItem>
                  <SelectItem value="fraud">احتيال أو نشاط مشبوه</SelectItem>
                  <SelectItem value="other">أسباب أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* خيار إبقاء الدورات */}
            <div className="space-y-3">
              <Label className="text-base font-medium">خيارات الدورات التدريبية</Label>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="keepCoursesAccess"
                    checked={terminateFormState.keepCoursesAccess}
                    onCheckedChange={(checked) => handleTerminateFormChange('keepCoursesAccess', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="keepCoursesAccess" className="text-sm font-medium cursor-pointer">
                      إبقاء الوصول للدورات التدريبية مدى الحياة
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      سيحتفظ المستخدمون بالوصول لجميع الدورات التدريبية حتى بعد إنهاء الاشتراك
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <div className="space-y-2">
              <Label htmlFor="terminationNotes">ملاحظات إضافية (اختياري)</Label>
              <Textarea
                id="terminationNotes"
                placeholder="أضف أي ملاحظات حول إنهاء الاشتراك..."
                value={terminateFormState.terminationNotes}
                onChange={(e) => handleTerminateFormChange('terminationNotes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleTerminateClose(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleTerminateSubscription}
              disabled={saving || !terminateFormState.terminationReason}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري إنهاء الاشتراك...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  إنهاء الاشتراك نهائياً
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
