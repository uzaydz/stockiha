import { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
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
import { supabase } from '@/lib/supabase';

// نوع بيانات المؤسسة
interface Organization {
  id: string;
  name: string;
  domain: string | null;
  subdomain: string | null;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  users_count: number;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب بيانات المؤسسات من قاعدة البيانات
  useEffect(() => {
    const fetchOrganizations = async () => {
      setIsLoading(true);
      try {
        // استعلام يجلب المؤسسات
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select(`
            id, 
            name,
            domain,
            subdomain,
            subscription_tier,
            subscription_status,
            created_at
          `);

        if (orgsError) {
          throw orgsError;
        }

        // عمل استعلام منفصل للحصول على عدد المستخدمين في كل مؤسسة
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, organization_id');

        if (userError) {
          throw userError;
        }

        // تجميع عدد المستخدمين لكل مؤسسة
        const userCounts = userData.reduce((counts: Record<string, number>, user) => {
          if (user.organization_id) {
            counts[user.organization_id] = (counts[user.organization_id] || 0) + 1;
          }
          return counts;
        }, {});

        // تنسيق البيانات
        const formattedData = orgsData.map(org => ({
          id: org.id,
          name: org.name,
          domain: org.domain,
          subdomain: org.subdomain,
          subscription_tier: org.subscription_tier || 'free',
          subscription_status: org.subscription_status || 'inactive',
          created_at: org.created_at,
          users_count: userCounts[org.id] || 0
        }));

        setOrganizations(formattedData);
      } catch (err: any) {
        console.error('Error fetching organizations:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);
  
  // Filter organizations based on search query and filters
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      org.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.subdomain?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    const matchesSubscription = subscriptionFilter === 'all' || org.subscription_status === subscriptionFilter;
    const matchesTier = tierFilter === 'all' || org.subscription_tier === tierFilter;
    
    return matchesSearch && matchesSubscription && matchesTier;
  });
  
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
  const activeOrganizations = organizations.filter(org => org.subscription_status === 'active').length;
  const trialOrganizations = organizations.filter(org => org.subscription_status === 'trial').length;
  const expiredOrganizations = organizations.filter(org => org.subscription_status === 'expired').length;
  
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المؤسسات</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة جميع المؤسسات المسجلة في النظام</p>
          </div>
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            <span>إضافة مؤسسة</span>
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
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
            ) : filteredOrganizations.length === 0 ? (
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
                    {filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
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