import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Home, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSWorkSessions from './POSWorkSessions';
import StaffList from '@/components/pos/settings/StaffList';

const StaffManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('staff');

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
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                الموظفين
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                جلسات العمل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff" className="mt-0">
              <StaffList />
            </TabsContent>

            <TabsContent value="sessions" className="mt-0">
              <POSWorkSessions useStandaloneLayout={false} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default StaffManagement;
