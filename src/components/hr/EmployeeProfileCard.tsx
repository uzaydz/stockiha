/**
 * 👤 Employee Profile Card Component - مكون بطاقة الملف الشخصي للموظف
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  Award,
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Edit,
  MoreVertical,
} from 'lucide-react';
import type { EmployeeProfile, EmployeeDetailView } from '@/types/hr/dashboard';

interface EmployeeProfileCardProps {
  employee: EmployeeProfile;
  onEdit?: () => void;
  compact?: boolean;
}

export function EmployeeProfileCard({
  employee,
  onEdit,
  compact = false,
}: EmployeeProfileCardProps) {
  if (compact) {
    return <CompactProfileCard employee={employee} onEdit={onEdit} />;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url} />
              <AvatarFallback className="text-xl">
                {employee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.job_title || 'موظف'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                  {employee.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
                {employee.department && (
                  <Badge variant="outline">{employee.department}</Badge>
                )}
              </div>
            </div>
          </div>
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* معلومات الاتصال */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem icon={Mail} label="البريد الإلكتروني" value={employee.email} />
          <InfoItem icon={Phone} label="رقم الهاتف" value={employee.phone || '-'} />
          <InfoItem icon={MapPin} label="العنوان" value={employee.address || '-'} />
          <InfoItem
            icon={Calendar}
            label="تاريخ الانضمام"
            value={employee.created_at ? formatDate(employee.created_at) : '-'}
          />
        </div>

        {/* ملخص الحضور */}
        {employee.attendance_summary && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              ملخص الحضور هذا الشهر
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {employee.attendance_summary.present_days}
                </p>
                <p className="text-xs text-muted-foreground">يوم حضور</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {employee.attendance_summary.absent_days}
                </p>
                <p className="text-xs text-muted-foreground">يوم غياب</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">
                  {employee.attendance_summary.late_days}
                </p>
                <p className="text-xs text-muted-foreground">مرات تأخير</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {employee.attendance_summary.total_work_hours.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">ساعة عمل</p>
              </div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {employee.documents_count || 0} مستند
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {employee.warnings_count || 0} تحذير
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactProfileCard({
  employee,
  onEdit,
}: {
  employee: EmployeeProfile;
  onEdit?: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={employee.avatar_url} />
            <AvatarFallback>{employee.name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{employee.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {employee.job_title || employee.email}
            </p>
          </div>
          <Badge variant={employee.is_active ? 'default' : 'secondary'} className="shrink-0">
            {employee.is_active ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Employee Detail View Component
// ============================================

interface EmployeeDetailViewProps {
  employee: EmployeeDetailView;
  onClose?: () => void;
}

export function EmployeeDetailViewComponent({
  employee,
  onClose,
}: EmployeeDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={employee.avatar_url} />
          <AvatarFallback className="text-2xl">
            {employee.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-lg text-muted-foreground">{employee.job_title}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
              {employee.is_active ? 'نشط' : 'غير نشط'}
            </Badge>
            {employee.department && (
              <Badge variant="outline">{employee.department}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leave">الإجازات</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="documents">المستندات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InfoItem icon={Mail} label="البريد الإلكتروني" value={employee.email} />
              <InfoItem icon={Phone} label="الهاتف" value={employee.phone || '-'} />
              <InfoItem icon={MapPin} label="العنوان" value={employee.address || '-'} />
              <InfoItem
                icon={Calendar}
                label="تاريخ الانضمام"
                value={employee.created_at ? formatDate(employee.created_at) : '-'}
              />
            </CardContent>
          </Card>

          {/* Work Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                معلومات العمل
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InfoItem icon={Briefcase} label="المسمى الوظيفي" value={employee.job_title || '-'} />
              <InfoItem icon={User} label="القسم" value={employee.department || '-'} />
              <InfoItem icon={User} label="المدير المباشر" value={employee.manager?.name || '-'} />
              <InfoItem icon={DollarSign} label="الراتب الأساسي" value={formatCurrency(employee.salary_structure?.base_salary || 0)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          {employee.attendance_stats ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إحصائيات الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox
                    label="أيام الحضور"
                    value={employee.attendance_stats.present_days}
                    color="green"
                  />
                  <StatBox
                    label="أيام الغياب"
                    value={employee.attendance_stats.absent_days}
                    color="red"
                  />
                  <StatBox
                    label="مرات التأخير"
                    value={employee.attendance_stats.late_days}
                    color="yellow"
                  />
                  <StatBox
                    label="ساعات العمل"
                    value={employee.attendance_stats.total_work_hours.toFixed(0)}
                    color="blue"
                  />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>نسبة الحضور</span>
                    <span className="font-medium">{employee.attendance_stats.attendance_rate}%</span>
                  </div>
                  <Progress value={employee.attendance_stats.attendance_rate} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState message="لا توجد بيانات حضور" />
          )}
        </TabsContent>

        <TabsContent value="leave">
          {employee.leave_balances && employee.leave_balances.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">أرصدة الإجازات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employee.leave_balances.map((balance, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">
                          {balance.leave_type?.name_ar || balance.leave_type?.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {balance.used_days}/{balance.total_days} يوم
                        </span>
                      </div>
                      <Progress
                        value={(balance.remaining_days / balance.total_days) * 100}
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        متبقي: {balance.remaining_days} يوم
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState message="لا توجد أرصدة إجازات" />
          )}
        </TabsContent>

        <TabsContent value="performance">
          {employee.performance_reviews && employee.performance_reviews.length > 0 ? (
            <div className="space-y-4">
              {employee.performance_reviews.map((review, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{review.period?.name || 'تقييم الأداء'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {review.overall_score?.toFixed(1) || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">من 5</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="لا توجد تقييمات أداء" />
          )}
        </TabsContent>

        <TabsContent value="documents">
          {employee.documents && employee.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employee.documents.map((doc, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_type}
                      </p>
                    </div>
                    {doc.expiry_date && (
                      <Badge variant={isExpiringSoon(doc.expiry_date) ? 'destructive' : 'outline'}>
                        {formatDate(doc.expiry_date)}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="لا توجد مستندات" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
  };

  return (
    <div className="text-center p-4 bg-muted/50 rounded-lg">
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(amount);
}

function isExpiringSoon(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
}

export default EmployeeProfileCard;
