import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Home, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSWorkSessions from './POSWorkSessions';
import StaffList from '@/components/pos/settings/StaffList';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

const StaffManagement: React.FC = () => {
  const perms = useUnifiedPermissions();
  const [activeTab, setActiveTab] = useState('staff');

  const allowedTabs = useMemo(() => {
    if (perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin) {
      return ['staff', 'sessions'] as const;
    }

    const canStaff = perms.ready ? perms.anyOf(['canViewStaff', 'canManageStaff']) : false;
    const canSessions = perms.ready ? perms.anyOf(['canViewWorkSessions', 'canManageWorkSessions', 'canViewSessionReports']) : false;

    return [
      canStaff ? 'staff' : null,
      canSessions ? 'sessions' : null,
    ].filter(Boolean) as Array<'staff' | 'sessions'>;
  }, [perms.ready, perms.isAdminMode, perms.isOrgAdmin, perms.isSuperAdmin]);

  const hasAnyAccess = allowedTabs.length > 0;

  if (!hasAnyAccess) {
    return (
      <POSPureLayout>
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-5xl">🔒</div>
            <h2 className="text-xl font-bold">ليس لديك الصلاحيات</h2>
            <p className="text-muted-foreground">لا تملك صلاحية الوصول لإدارة الموظفين أو جلسات العمل.</p>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  useEffect(() => {
    if (!allowedTabs.includes(activeTab as 'staff' | 'sessions')) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  return (
    <POSPureLayout>
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    الرئيسية
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-bold">إدارة الموظفين</h1>
                </div>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/pos-settings" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  إعدادات نقطة البيع
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: `repeat(${allowedTabs.length}, minmax(0, 1fr))` }}>
              {allowedTabs.includes('staff') && (
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  الموظفين
                </TabsTrigger>
              )}
              {allowedTabs.includes('sessions') && (
                <TabsTrigger value="sessions" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  جلسات العمل
                </TabsTrigger>
              )}
            </TabsList>

            {allowedTabs.includes('staff') && (
              <TabsContent value="staff" className="mt-0">
                <StaffList />
              </TabsContent>
            )}

            {allowedTabs.includes('sessions') && (
              <TabsContent value="sessions" className="mt-0">
                <POSWorkSessions useStandaloneLayout={false} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default StaffManagement;
