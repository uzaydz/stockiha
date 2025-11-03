import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Key, 
  Search,
  Power,
  PowerOff,
  Shield,
  Loader2,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { staffService } from '@/services/staffService';
import type { POSStaffSession } from '@/types/staff';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AddStaffDialog } from '@/components/staff/AddStaffDialog';
import { UpdatePinDialog } from '@/components/staff/UpdatePinDialog';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';

interface StaffManagementProps {
  useStandaloneLayout?: boolean;
  onRegisterRefresh?: (handler: RefreshHandler) => void;
  onLayoutStateChange?: (state: POSLayoutState) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange,
}) => {
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<POSStaffSession | null>(null);
  const [isUpdatePinDialogOpen, setIsUpdatePinDialogOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<POSStaffSession | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<POSStaffSession | null>(null);

  // منع الوصول عند عدم وجود صلاحية إدارة الموظفين (حماية إضافية داخل الصفحة)
  if (perms.ready && !perms.anyOf(['manageEmployees'])) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية إدارة الموظفين.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // جلب الموظفين
  const { 
    data: staffSessions = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['pos-staff-sessions'],
    queryFn: () => staffService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
  });

  // حذف موظف
  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => staffService.delete(staffId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم حذف الموظف بنجاح');
        queryClient.invalidateQueries({ queryKey: ['pos-staff-sessions'] });
      } else {
        toast.error(data.error || 'فشل حذف الموظف');
      }
      setDeletingStaff(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف الموظف');
      setDeletingStaff(null);
    },
  });

  // تبديل حالة التفعيل
  const toggleActiveMutation = useMutation({
    mutationFn: ({ staffId, isActive }: { staffId: string; isActive: boolean }) =>
      staffService.toggleActive(staffId, isActive),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم تحديث حالة الموظف بنجاح');
        queryClient.invalidateQueries({ queryKey: ['pos-staff-sessions'] });
      } else {
        toast.error(data.error || 'فشل تحديث حالة الموظف');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث حالة الموظف');
    },
  });

  // تسجيل وظيفة التحديث
  useEffect(() => {
    if (onRegisterRefresh) {
      const handleRefresh = async () => {
        const startTime = performance.now();
        await refetch();
        const endTime = performance.now();
        const executionTime = Math.round(endTime - startTime);
        
        if (onLayoutStateChange) {
          onLayoutStateChange({
            connectionStatus: 'connected',
            isRefreshing: false,
            executionTime,
          });
        }
      };
      onRegisterRefresh(() => handleRefresh());
    }
  }, [onRegisterRefresh, onLayoutStateChange, refetch]);

  // تحديث حالة التحميل
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({
        connectionStatus: error ? 'disconnected' : 'connected',
        isRefreshing: isLoading,
      });
    }
  }, [isLoading, error, onLayoutStateChange]);

  // فلترة النتائج
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffSessions;
    
    const query = searchQuery.toLowerCase();
    return staffSessions.filter((staff) =>
      staff.staff_name.toLowerCase().includes(query)
    );
  }, [staffSessions, searchQuery]);

  // معالجة الحذف
  const handleDelete = useCallback((staff: POSStaffSession) => {
    setDeletingStaff(staff);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingStaff) {
      deleteMutation.mutate(deletingStaff.id);
    }
  }, [deletingStaff, deleteMutation]);

  // معالجة تغيير كود PIN
  const handleChangePinClick = useCallback((staff: POSStaffSession) => {
    setSelectedStaffForPin(staff);
    setIsUpdatePinDialogOpen(true);
  }, []);

  // معالجة التعديل
  const handleEditClick = useCallback((staff: POSStaffSession) => {
    setEditingStaff(staff);
    setIsAddDialogOpen(true);
  }, []);

  // معالجة تبديل حالة التفعيل
  const handleToggleActive = useCallback((staff: POSStaffSession) => {
    toggleActiveMutation.mutate({
      staffId: staff.id,
      isActive: !staff.is_active,
    });
  }, [toggleActiveMutation]);

  // إغلاق الدايلوج
  const handleCloseAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
    setEditingStaff(null);
  }, []);

  // عدد الصلاحيات النشطة
  const getActivePermissionsCount = useCallback((permissions: any): number => {
    if (!permissions || typeof permissions !== 'object') return 0;
    return Object.values(permissions).filter((v) => v === true).length;
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4" dir="rtl">
        <Shield className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium text-red-600">حدث خطأ أثناء تحميل بيانات الموظفين</p>
        <Button onClick={() => refetch()} variant="outline">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">إدارة موظفي نقطة البيع</CardTitle>
              <CardDescription className="mt-2">
                إدارة جلسات الموظفين وصلاحياتهم وأكواد الوصول الخاصة بهم
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة موظف جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن موظف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{filteredStaff.length} موظف</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-muted-foreground">
              <Users className="h-16 w-16" />
              <p className="text-lg font-medium">
                {searchQuery ? 'لا توجد نتائج بحث' : 'لا يوجد موظفون حالياً'}
              </p>
              <p className="text-sm">
                {searchQuery ? 'جرب كلمات بحث مختلفة' : 'ابدأ بإضافة موظفين لنقطة البيع'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الموظف</TableHead>
                    <TableHead className="text-right">الإيميل</TableHead>
                    <TableHead className="text-right">الصلاحيات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الإضافة</TableHead>
                    <TableHead className="text-right">آخر تسجيل دخول</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          {staff.staff_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {staff.email ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {staff.email}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            بدون إيميل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getActivePermissionsCount(staff.permissions)} صلاحية نشطة
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {staff.is_active ? (
                          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                            <Power className="h-3 w-3" />
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <PowerOff className="h-3 w-3" />
                            غير نشط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(staff.created_at).toLocaleDateString('ar-DZ', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {staff.last_login
                          ? new Date(staff.last_login).toLocaleDateString('ar-DZ', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'لم يسجل دخول بعد'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(staff)}
                            title={staff.is_active ? 'تعطيل الموظف' : 'تفعيل الموظف'}
                          >
                            {staff.is_active ? (
                              <PowerOff className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleChangePinClick(staff)}
                            title="تغيير كود PIN"
                          >
                            <Key className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(staff)}
                            title="تعديل الموظف"
                          >
                            <Pencil className="h-4 w-4 text-yellow-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(staff)}
                            title="حذف الموظف"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddStaffDialog
        open={isAddDialogOpen}
        onClose={handleCloseAddDialog}
        editingStaff={editingStaff}
      />

      <UpdatePinDialog
        open={isUpdatePinDialogOpen}
        onClose={() => {
          setIsUpdatePinDialogOpen(false);
          setSelectedStaffForPin(null);
        }}
        staff={selectedStaffForPin}
      />

      <AlertDialog open={!!deletingStaff} onOpenChange={(open) => !open && setDeletingStaff(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الموظف "{deletingStaff?.staff_name}"؟
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffManagement;
