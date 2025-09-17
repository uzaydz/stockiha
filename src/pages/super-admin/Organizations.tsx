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
  Clock
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
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    notes: ''
  });

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err: any) {
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
      const { data, error } = await supabase.rpc('admin_get_organizations_with_subscriptions', {
        p_search: searchQuery.trim() || null,
        p_status: subscriptionFilter === 'all' ? null : subscriptionFilter,
        p_tier: tierFilter === 'all' ? null : tierFilter,
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب بيانات المؤسسات');
      setOrganizations([]);
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
      notes: ''
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
        notes: ''
      });
    }
  };

  const handleFormChange = (key: keyof typeof formState, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
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
    try {
      const { data, error } = await supabase.rpc('admin_upsert_subscription', {
        p_organization_id: selectedOrganization.organization_id,
        p_plan_id: formState.planId,
        p_status: formState.status,
        p_billing_cycle: formState.billingCycle,
        p_start_date: formState.startDate || null,
        p_end_date: formState.endDate || null,
        p_amount_paid: formState.amountPaid ? Number(formState.amountPaid) : 0,
        p_currency: formState.currency || 'DZD',
        p_notes: formState.notes || null
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'فشل في تحديث الاشتراك');
      }

      subscriptionCache.clearCache(selectedOrganization.organization_id);

      toast({
        title: 'تم تحديث الاشتراك',
        description: 'تم حفظ الاشتراك بنجاح وتحديث بيانات المؤسسة.'
      });

      handleManageClose(false);
      await fetchOrganizations();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'فشل في تحديث الاشتراك',
        description: err.message || 'حدث خطأ غير متوقع.'
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [searchQuery, subscriptionFilter, tierFilter]);
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
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
            <Button variant="outline" className="gap-1" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              <span>تحديث البيانات</span>
            </Button>
            <Button className="gap-1" disabled>
              <Plus className="h-4 w-4" />
              <span>إضافة مؤسسة</span>
            </Button>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                مؤسسات نشطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeOrganizations}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                مؤسسات تجريبية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trialOrganizations}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                اشتراكات منتهية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expiredOrganizations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                اشتراكات قيد التفعيل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingOrganizations}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>قائمة المؤسسات</CardTitle>
            <CardDescription>عرض وإدارة المؤسسات المسجلة في النظام ({organizations.length} مؤسسة)</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters and search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مؤسسة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="حالة الاشتراك" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">فعّال</SelectItem>
                    <SelectItem value="trial">تجريبي</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-40">
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
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <XCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
                  <p className="text-destructive">حدث خطأ أثناء تحميل البيانات</p>
                  <p className="text-muted-foreground text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : organizations.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Building className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">لا توجد مؤسسات تطابق معايير البحث</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">اسم المؤسسة</TableHead>
                      <TableHead>النطاق الفرعي</TableHead>
                      <TableHead>نوع الاشتراك</TableHead>
                      <TableHead>حالة الاشتراك</TableHead>
                      <TableHead>المستخدمين</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.organization_id}>
                        <TableCell className="font-medium">{org.organization_name}</TableCell>
                        <TableCell>{org.subdomain || 'غير محدد'}</TableCell>
                        <TableCell>
                          <SubscriptionTierBadge tier={org.subscription_tier} />
                        </TableCell>
                        <TableCell>
                          <SubscriptionStatusBadge status={org.subscription_status} />
                        </TableCell>
                        <TableCell>{org.users_count}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(org.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">فتح القائمة</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
                              <DropdownMenuItem>تعديل المؤسسة</DropdownMenuItem>
                              <DropdownMenuItem>إدارة المستخدمين</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">تعليق الحساب</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
