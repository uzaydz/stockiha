import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/context/TenantContext';
import OrganizationBrandSettings from './OrganizationBrandSettings';
import GamePlatformSettings from './GamePlatformSettings';

const OrganizationSettingsPage = () => {
  const { isOrgAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState('brand');
  
  // Si el usuario no es administrador
  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
        <p>ليس لديك صلاحية لعرض إعدادات المؤسسة</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-right">إعدادات المؤسسة</h1>
        <p className="text-muted-foreground text-right">
          تخصيص العلامة التجارية وإعدادات منصة الألعاب الخاصة بك
        </p>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex justify-end mb-4">
          <TabsList>
            <TabsTrigger value="brand">العلامة التجارية</TabsTrigger>
            <TabsTrigger value="platform">إعدادات المنصة</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="brand">
          <OrganizationBrandSettings />
        </TabsContent>
        
        <TabsContent value="platform">
          <GamePlatformSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationSettingsPage; 