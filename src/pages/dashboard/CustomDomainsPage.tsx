import React, { useCallback, useState } from 'react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import DomainSettingsComponent from '@/components/settings/DomainSettings';
import { useTitle } from '@/hooks/useTitle';
import { POSLayoutState } from '@/components/pos-layout/types';
import { Link2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CustomDomainsPage: React.FC = () => {
  useTitle('النطاقات المخصصة');

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });

  const handleRefresh = useCallback(() => {
    // يمكن إضافة logic للتحديث هنا
  }, []);

  return (
    <POSPureLayout
      onRefresh={handleRefresh}
      isRefreshing={Boolean(layoutState.isRefreshing)}
      connectionStatus={layoutState.connectionStatus ?? 'connected'}
      executionTime={layoutState.executionTime}
    >
      <div className="space-y-6 p-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">النطاقات المخصصة</h1>
              <p className="text-sm text-muted-foreground">
                ربط نطاقك الخاص بمتجرك الإلكتروني وإدارة إعدادات DNS
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
          >
            <Link to="/dashboard/settings-operations/domains-docs">
              <BookOpen className="h-4 w-4" />
              دليل الإعداد
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <div className="p-6">
            <DomainSettingsComponent />
          </div>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default CustomDomainsPage;
