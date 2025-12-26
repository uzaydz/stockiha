import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { staffService, POSStaffSession } from '@/services/staffService';
import { AddStaffDialog } from '@/components/staff/AddStaffDialog';
import StaffTableResponsive from '@/components/staff/StaffTableResponsive';
import PermissionsDesignerDialog from '@/components/staff/PermissionsDesignerDialog';
import { inventoryDB } from '@/database/localDb';
import { useAuth } from '@/context/AuthContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { updateStaffMetadataOffline } from '@/lib/offline/staffCredentials';
import UpdateOfflinePinDialog from '@/components/staff/UpdateOfflinePinDialog';

const StaffList: React.FC = () => {
  const [staffList, setStaffList] = useState<POSStaffSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<POSStaffSession | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<Record<string, 'saved' | 'missing' | 'outdated'>>({});
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [targetStaff, setTargetStaff] = useState<POSStaffSession | null>(null);
  const { organization } = useAuth();
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<POSStaffSession | null>(null);
  const perms = useUnifiedPermissions();

  const canViewStaff = perms.ready ? perms.anyOf(['canViewStaff', 'canManageStaff']) : false;
  const canManageStaff = perms.ready ? perms.anyOf(['canManageStaff']) : false;
  const canAddStaff = perms.ready ? perms.anyOf(['canAddStaff', 'canManageStaff']) : false;
  const canEditStaff = perms.ready ? perms.anyOf(['canEditStaff', 'canManageStaff']) : false;
  const canDeleteStaff = perms.ready ? perms.anyOf(['canDeleteStaff', 'canManageStaff']) : false;
  const canToggleStaffStatus = perms.ready ? perms.anyOf(['canToggleStaffStatus', 'canManageStaff']) : false;
  const canManageStaffPermissions = perms.ready ? perms.anyOf(['canManageStaffPermissions', 'canManageStaff']) : false;
  const canUpdateOffline = perms.ready ? perms.anyOf(['canEditStaff', 'canManageStaff']) : false;

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

  // فحص حالة حفظ PIN أوفلاين لكل موظف
  const refreshOfflineStatus = useCallback(async () => {
    try {
      if (!organization?.id) return;
      const orgId = organization.id;
      const pins = await inventoryDB.staffPins.where('organization_id').equals(orgId).toArray();
      const map: Record<string, 'saved' | 'missing' | 'outdated'> = {};
      for (const s of staffList) {
        const rec = pins.find((p: any) => p.staff_id === s.id || p.id === `pin_${s.id}` || p.id === s.id);
        if (!rec) { map[s.id] = 'missing'; continue; }
        const sameName = rec.staff_name === s.staff_name;
        const recPerms = typeof (rec as any).permissions === 'string'
          ? (() => { try { return JSON.parse((rec as any).permissions); } catch { return {}; } })()
          : ((rec as any).permissions || {});
        const samePerms = JSON.stringify(recPerms || {}) === JSON.stringify(s.permissions || {});
        map[s.id] = sameName && samePerms ? 'saved' : 'outdated';
      }
      setOfflineStatus(map);
    } catch (e) {
      // تجاهل
    }
  }, [organization?.id, staffList]);

  useEffect(() => {
    void refreshOfflineStatus();
  }, [refreshOfflineStatus]);

  // حذف موظف
  const handleDelete = async (id: string) => {
    if (!canDeleteStaff) {
      toast.error('لا تملك صلاحية حذف الموظفين');
      return;
    }
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
    if (!canToggleStaffStatus) {
      toast.error('لا تملك صلاحية تفعيل/تعطيل الموظفين');
      return;
    }
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

  // تحديث بيانات الأوفلاين (طلب PIN جديد وتحديثه محلياً وعلى السيرفر إن أمكن)
  const handleUpdateOffline = async (staff: POSStaffSession) => {
    if (!canUpdateOffline) {
      toast.error('لا تملك صلاحية تحديث بيانات الأوفلاين');
      return;
    }
    setTargetStaff(staff);
    setShowUpdateDialog(true);
  };

  const handleSyncOfflineMetadata = async () => {
    if (!canUpdateOffline) {
      toast.error('لا تملك صلاحية مزامنة بيانات الأوفلاين');
      return;
    }
    try {
      if (!organization?.id) return;
      const orgId = organization.id;
      // تحديث metadata (الاسم/الصلاحيات) للسجلات الموجودة فقط
      const pins = await inventoryDB.staffPins.where('organization_id').equals(orgId).toArray();
      const existingIds = new Set(
        pins
          .map((p: any) => p.staff_id || (typeof p.id === 'string' ? p.id.replace(/^pin_/, '') : undefined))
          .filter(Boolean)
      );
      let updatedCount = 0;
      for (const s of staffList) {
        if (existingIds.has(s.id)) {
          await updateStaffMetadataOffline({
            staffId: s.id,
            organizationId: orgId,
            staffName: s.staff_name,
            permissions: s.permissions,
            isActive: s.is_active,
          });
          updatedCount++;
        }
      }
      toast.success(`تمت مزامنة بيانات الأوفلاين (${updatedCount})`);
      void refreshOfflineStatus();
    } catch (e: any) {
      toast.error(e?.message || 'تعذر مزامنة بيانات الأوفلاين');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">قائمة الموظفين</CardTitle>
              <CardDescription className="text-sm mt-1">إدارة موظفي نقطة البيع وصلاحياتهم</CardDescription>
            </div>

            {/* أزرار الإجراءات - متجاوبة للموبايل */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* الأزرار الثانوية - مخفية على الموبايل الصغير */}
              <div className="hidden md:flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchStaff} title="تحديث">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => { void refreshOfflineStatus(); }} className="text-xs sm:text-sm">
                  <RefreshCw className="h-4 w-4 ml-1 sm:ml-2" />
                  <span className="hidden lg:inline">تحديث حالة</span> الأوفلاين
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSyncOfflineMetadata}
                  className="text-xs sm:text-sm"
                  disabled={!canUpdateOffline}
                >
                  <RefreshCw className="h-4 w-4 ml-1 sm:ml-2" />
                  <span className="hidden lg:inline">مزامنة بيانات</span> الأوفلاين
                </Button>
              </div>

              {/* الأزرار على الموبايل */}
              <div className="flex gap-2 md:hidden">
                <Button variant="outline" size="sm" onClick={fetchStaff} className="flex-1">
                  <RefreshCw className="h-4 w-4 ml-1" />
                  تحديث
                </Button>
                {canAddStaff && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة موظف
                  </Button>
                )}
              </div>

              {/* زر الإضافة للشاشات الكبيرة */}
              {canAddStaff && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="hidden md:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة موظف
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!canViewStaff ? (
            <div className="text-center py-10 text-muted-foreground">
              لا تملك صلاحية عرض الموظفين.
            </div>
          ) : isLoading ? (
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
              {canAddStaff && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة موظف
                </Button>
              )}
            </div>
          ) : (
            <StaffTableResponsive
              staff={staffList}
              onEdit={(staff) => {
                if (!canEditStaff) {
                  toast.error('لا تملك صلاحية تعديل الموظفين');
                  return;
                }
                setEditingStaff(staff);
                setShowAddDialog(true);
              }}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              offlineStatus={offlineStatus}
              onUpdateOffline={handleUpdateOffline}
              onCustomizePermissions={(staff) => {
                if (!canManageStaffPermissions) {
                  toast.error('لا تملك صلاحية إدارة الصلاحيات');
                  return;
                }
                setPermTarget(staff);
                setPermDialogOpen(true);
              }}
              canEdit={canEditStaff}
              canDelete={canDeleteStaff}
              canToggleActive={canToggleStaffStatus}
              canManagePermissions={canManageStaffPermissions}
              canUpdateOffline={canUpdateOffline}
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
        existingStaff={staffList}
      />

      <UpdateOfflinePinDialog
        open={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
        staff={targetStaff}
        onUpdated={() => { void refreshOfflineStatus(); }}
      />

      {/* مصمم الصلاحيات */}
      {permTarget && (
        <PermissionsDesignerDialog
          open={permDialogOpen}
          onOpenChange={(open) => { setPermDialogOpen(open); if (!open) setPermTarget(null); }}
          staff={permTarget}
          onSave={async (perms) => {
            if (!permTarget) return;
            await staffService.save({
              id: permTarget.id,
              staff_name: permTarget.staff_name,
              permissions: perms,
              is_active: permTarget.is_active,
            });
            toast.success('تم حفظ صلاحيات الموظف');
            await fetchStaff();
          }}
        />
      )}
    </>
  );
};

export default StaffList;
