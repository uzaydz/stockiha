import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock,
  Award,
  Target,
  BarChart3
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// أنواع البيانات - تطابق مع دالة RPC
interface UserActivity {
  user_id: string;
  user_name?: string;
  user_role?: string;
  operations_count?: number; // من RPC
  operations_breakdown?: {   // من RPC
    sales: number;
    purchases: number;
    adjustments: number;
  };
  products_affected?: number;
  total_quantity_handled?: number;
  last_activity?: string;
  operations_today?: number;
  
  // قيم مالية من RPC
  total_sales_value?: number;
  total_purchase_value?: number;
  total_value?: number;
  
  // حقول محسوبة أو اختيارية
  user_email?: string;
  user_avatar?: string;
  avg_daily_operations?: number;
}

interface UserActivitiesSectionProps {
  userActivities: UserActivity[];
  isLoading?: boolean;
  detailed?: boolean;
}

// تنسيق العملة
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// تنسيق التاريخ النسبي
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  return `منذ ${Math.floor(diffDays / 30)} أشهر`;
};

// ألوان أنواع العمليات - تطابق مع RPC
const operationColors = {
  sales: 'bg-blue-500',
  purchases: 'bg-green-500', 
  adjustments: 'bg-yellow-500'
};

// أسماء أنواع العمليات - تطابق مع RPC
const operationNames = {
  sales: 'مبيعات',
  purchases: 'مشتريات',
  adjustments: 'تعديلات'
};

// مكون بطاقة المستخدم البسيط
const UserActivityCard = ({ user, rank }: { user: UserActivity; rank: number }) => {
  // التأكد من وجود operations_breakdown وتوفير قيم افتراضية
  const safeOperationBreakdown = user.operations_breakdown || {
    sales: 0,
    purchases: 0,
    adjustments: 0
  };
  
  const maxOperations = Math.max(...Object.values(safeOperationBreakdown), 1);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 mb-4">
          {/* ترتيب */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {rank === 1 ? <Award className="h-4 w-4" /> : rank}
          </div>
          
          {/* معلومات المستخدم */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_avatar} />
            <AvatarFallback>
              {user.user_name?.split(' ').map(n => n[0]).join('') || 'UN'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">{user.user_name || 'مستخدم غير محدد'}</h4>
            {user.user_role && (
              <Badge variant="secondary" className="text-xs mt-1">
                {user.user_role}
              </Badge>
            )}
          </div>
          
          {/* الإحصائيات الرئيسية */}
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {(user.operations_count || 0).toLocaleString('en-US')}
            </div>
            <div className="text-xs text-muted-foreground">عملية</div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-sm font-bold text-green-600">
              {formatCurrency(user.total_value || 0)}
            </div>
            <div className="text-xs text-muted-foreground">إجمالي القيمة</div>
          </div>
          
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-sm font-bold">
              {(user.avg_daily_operations || 0).toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">متوسط يومي</div>
          </div>
        </div>

        {/* توزيع العمليات */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">توزيع العمليات</div>
          {Object.entries(safeOperationBreakdown).map(([type, count]) => {
            if (count === 0) return null;
            const percentage = maxOperations > 0 ? (count / maxOperations) * 100 : 0;
            
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className={cn("w-2 h-2 rounded-full", operationColors[type as keyof typeof operationColors])} />
                <span className="flex-1">{operationNames[type as keyof typeof operationNames]}</span>
                <span className="font-medium">{count}</span>
                <div className="w-16">
                  <Progress value={percentage} className="h-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* معلومات إضافية */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-4 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>آخر نشاط: {user.last_activity ? formatRelativeTime(user.last_activity) : 'غير محدد'}</span>
          </div>
          
          {user.operations_today !== undefined && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>اليوم: {user.operations_today}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * مكون قسم أنشطة المستخدمين
 */
const UserActivitiesSection: React.FC<UserActivitiesSectionProps> = ({
  userActivities,
  isLoading = false,
  detailed = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أنشطة المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أنشطة المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد بيانات للمستخدمين في هذه الفترة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ترتيب المستخدمين حسب إجمالي العمليات
  const sortedUsers = [...userActivities].sort((a, b) => (b.operations_count || 0) - (a.operations_count || 0));

  // حساب الإحصائيات العامة
  const totalUsers = userActivities.length;
  const totalOperations = userActivities.reduce((sum, user) => sum + (user.operations_count || 0), 0);
  const avgOperationsPerUser = totalUsers > 0 ? totalOperations / totalUsers : 0;

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">{totalUsers}</div>
            <div className="text-sm text-muted-foreground">مستخدم نشط</div>
          </CardContent>
        </Card>

                 <Card>
           <CardContent className="p-4 text-center">
             <div className="text-2xl font-bold text-primary mb-1">
               {totalOperations.toLocaleString('en-US')}
             </div>
             <div className="text-sm text-muted-foreground">إجمالي العمليات</div>
           </CardContent>
         </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {avgOperationsPerUser.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">متوسط لكل مستخدم</div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            ترتيب المستخدمين حسب النشاط
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            المستخدمون مرتبون حسب إجمالي عدد العمليات في الفترة المحددة
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedUsers.map((user, index) => (
              <UserActivityCard
                key={user.user_id}
                user={user}
                rank={index + 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivitiesSection;
