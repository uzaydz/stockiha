import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { staffService, POSStaffSession } from '@/services/staffService';
import { AddStaffDialog } from '@/components/staff/AddStaffDialog';
import StaffTable from '@/components/staff/StaffTable';

const StaffList: React.FC = () => {
  const [staffList, setStaffList] = useState<POSStaffSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<POSStaffSession | null>(null);

  // جلب قائمة الموظفين
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const staff = await staffService.getAll();
      setStaffList(staff);
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل الموظفين');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // حذف موظف
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      const result = await staffService.delete(id);
      if (result.success) {
        toast.success('تم حذف الموظف بنجاح');
        fetchStaff();
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء حذف الموظف');
    }
  };

  // تبديل حالة التفعيل
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const result = await staffService.toggleActive(id, !currentStatus);
      if (result.success) {
        toast.success(currentStatus ? 'تم تعطيل الموظف' : 'تم تفعيل الموظف');
        fetchStaff();
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحديث حالة الموظف');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الموظفين</CardTitle>
              <CardDescription>إدارة موظفي نقطة البيع وصلاحياتهم</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchStaff}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد موظفين</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ابدأ بإضافة موظفك الأول
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            </div>
          ) : (
            <StaffTable
              staff={staffList}
              onEdit={(staff) => {
                setEditingStaff(staff);
                setShowAddDialog(true);
              }}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      <AddStaffDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingStaff(null);
          fetchStaff();
        }}
        editingStaff={editingStaff || undefined}
      />
    </>
  );
};

export default StaffList;
