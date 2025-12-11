/**
 * 📅 Attendance Management Page - صفحة إدارة الحضور والانصراف
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock,
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
  Users,
  Download,
  Plus,
  RefreshCw,
  MapPin,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceTable } from '@/components/hr/AttendanceTable';
import {
  getAttendanceRecords,
  recordCheckIn,
  recordCheckOut,
  createManualAttendance,
  getDailyAttendanceStats,
  getEmployeesNotCheckedIn,
  getTodayAttendance,
} from '@/lib/api/hr/attendanceService';
import type { AttendanceWithEmployee, DailyAttendanceStats, AttendanceStatus } from '@/types/hr/attendance';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function AttendanceManagement() {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('today');

  const organizationId = currentOrganization?.id || '';

  // استعلامات البيانات
  const { data: attendanceRecords = { data: [], total: 0 }, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['attendance-records', organizationId, selectedDate.toISOString().split('T')[0]],
    queryFn: () => getAttendanceRecords({
      organization_id: organizationId,
      date_from: selectedDate.toISOString().split('T')[0],
      date_to: selectedDate.toISOString().split('T')[0],
    }),
    enabled: !!organizationId,
  });

  const { data: dailyStats } = useQuery({
    queryKey: ['daily-attendance-stats', organizationId],
    queryFn: () => getDailyAttendanceStats(organizationId),
    enabled: !!organizationId,
  });

  const { data: notCheckedIn = [] } = useQuery({
    queryKey: ['not-checked-in', organizationId],
    queryFn: () => getEmployeesNotCheckedIn(organizationId),
    enabled: !!organizationId,
  });

  const { data: myTodayAttendance, refetch: refetchMyAttendance } = useQuery({
    queryKey: ['my-today-attendance', userProfile?.id],
    queryFn: () => getTodayAttendance(userProfile?.id || ''),
    enabled: !!userProfile?.id,
  });

  // تسجيل الحضور
  const checkInMutation = useMutation({
    mutationFn: recordCheckIn,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تسجيل الحضور بنجاح');
        refetchMyAttendance();
        queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
        queryClient.invalidateQueries({ queryKey: ['daily-attendance-stats'] });
      } else {
        toast.error(result.error || 'فشل تسجيل الحضور');
      }
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تسجيل الحضور');
    },
  });

  // تسجيل الانصراف
  const checkOutMutation = useMutation({
    mutationFn: recordCheckOut,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تسجيل الانصراف بنجاح');
        refetchMyAttendance();
        queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      } else {
        toast.error(result.error || 'فشل تسجيل الانصراف');
      }
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تسجيل الانصراف');
    },
  });

  // إضافة حضور يدوي
  const manualAttendanceMutation = useMutation({
    mutationFn: createManualAttendance,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم إضافة سجل الحضور بنجاح');
        setIsManualDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      } else {
        toast.error(result.error || 'فشل إضافة سجل الحضور');
      }
    },
  });

  const handleCheckIn = () => {
    if (!userProfile?.id) return;

    // محاولة الحصول على الموقع
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkInMutation.mutate({
            employee_id: userProfile.id,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            device: navigator.userAgent,
          });
        },
        () => {
          // في حالة فشل الحصول على الموقع، سجل بدون موقع
          checkInMutation.mutate({
            employee_id: userProfile.id,
            device: navigator.userAgent,
          });
        }
      );
    } else {
      checkInMutation.mutate({
        employee_id: userProfile.id,
        device: navigator.userAgent,
      });
    }
  };

  const handleCheckOut = () => {
    if (!userProfile?.id) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkOutMutation.mutate({
            employee_id: userProfile.id,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            device: navigator.userAgent,
          });
        },
        () => {
          checkOutMutation.mutate({
            employee_id: userProfile.id,
            device: navigator.userAgent,
          });
        }
      );
    } else {
      checkOutMutation.mutate({
        employee_id: userProfile.id,
        device: navigator.userAgent,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الحضور والانصراف</h1>
          <p className="text-muted-foreground">
            تتبع وإدارة حضور وانصراف الموظفين
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة يدوي
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة سجل حضور يدوي</DialogTitle>
              </DialogHeader>
              <ManualAttendanceForm
                onSubmit={(data) => manualAttendanceMutation.mutate(data)}
                isLoading={manualAttendanceMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* بطاقة تسجيل الحضور الشخصي */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">تسجيل الحضور الشخصي</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {myTodayAttendance && (
                  <div className="flex items-center gap-2 mt-1">
                    {myTodayAttendance.check_in_time && (
                      <Badge variant="outline" className="text-green-600">
                        <Clock className="h-3 w-3 ml-1" />
                        حضور: {myTodayAttendance.check_in_time?.substring(11, 16)}
                      </Badge>
                    )}
                    {myTodayAttendance.check_out_time && (
                      <Badge variant="outline" className="text-red-600">
                        <Clock className="h-3 w-3 ml-1" />
                        انصراف: {myTodayAttendance.check_out_time?.substring(11, 16)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending || !!myTodayAttendance?.check_in_time}
                className="min-w-[140px]"
              >
                <UserCheck className="h-5 w-5 ml-2" />
                تسجيل حضور
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleCheckOut}
                disabled={
                  checkOutMutation.isPending ||
                  !myTodayAttendance?.check_in_time ||
                  !!myTodayAttendance?.check_out_time
                }
                className="min-w-[140px]"
              >
                <UserX className="h-5 w-5 ml-2" />
                تسجيل انصراف
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات سريعة */}
      {dailyStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            title="إجمالي الموظفين"
            value={dailyStats.total_employees}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="حاضر"
            value={dailyStats.present}
            icon={UserCheck}
            color="green"
          />
          <StatsCard
            title="متأخر"
            value={dailyStats.late}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="غائب"
            value={dailyStats.absent}
            icon={UserX}
            color="red"
          />
          <StatsCard
            title="نسبة الحضور"
            value={`${dailyStats.attendance_rate}%`}
            icon={CalendarIcon}
            color="purple"
          />
        </div>
      )}

      {/* التبويبات */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="today">اليوم</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
          <TabsTrigger value="not-checked">لم يسجلوا</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                سجلات اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable
                data={attendanceRecords.data}
                isLoading={isLoadingRecords}
                onExport={() => toast.info('جاري تصدير البيانات...')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">اختر التاريخ</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  سجلات {selectedDate.toLocaleDateString('ar-SA')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceTable
                  data={attendanceRecords.data}
                  isLoading={isLoadingRecords}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="not-checked" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                الموظفون الذين لم يسجلوا حضورهم اليوم ({notCheckedIn.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notCheckedIn.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>جميع الموظفين سجلوا حضورهم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notCheckedIn.map((employee) => (
                    <Card key={employee.id} className="border-orange-200">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <UserX className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ManualAttendanceFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function ManualAttendanceForm({ onSubmit, isLoading }: ManualAttendanceFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '08:00',
    check_out_time: '17:00',
    status: 'present' as AttendanceStatus,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>معرف الموظف</Label>
        <Input
          value={formData.employee_id}
          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          placeholder="أدخل معرف الموظف"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>التاريخ</Label>
        <Input
          type="date"
          value={formData.attendance_date}
          onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>وقت الحضور</Label>
          <Input
            type="time"
            value={formData.check_in_time}
            onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>وقت الانصراف</Label>
          <Input
            type="time"
            value={formData.check_out_time}
            onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>الحالة</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as AttendanceStatus })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="present">حاضر</SelectItem>
            <SelectItem value="absent">غائب</SelectItem>
            <SelectItem value="late">متأخر</SelectItem>
            <SelectItem value="on_leave">في إجازة</SelectItem>
            <SelectItem value="remote">عمل عن بعد</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>ملاحظات</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="أي ملاحظات إضافية..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري الحفظ...' : 'حفظ'}
      </Button>
    </form>
  );
}
