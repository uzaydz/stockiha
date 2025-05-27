import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/context/TenantContext';
import OrganizationBrandSettings from './OrganizationBrandSettings';
import GamePlatformSettings from './GamePlatformSettings';
import DomainSettings from './DomainSettings';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const OrganizationSettingsPage = () => {
  const { isOrgAdmin, currentOrganization } = useTenant();
  const [activeTab, setActiveTab] = useState('brand');
  const navigate = useNavigate();
  
  // Si el usuario no es administrador
  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
        <p>ليس لديك صلاحية لعرض إعدادات المؤسسة</p>
      </div>
    );
  }
  
  // التنقل إلى إعدادات النطاقات المخصصة
  const goToDomainSettings = () => {
    navigate('/dashboard/settings/domains');
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-right">إعدادات المؤسسة</h1>
        <p className="text-muted-foreground text-right">
          تخصيص العلامة التجارية، النطاقات وإعدادات منصة الألعاب الخاصة بك
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
            <TabsTrigger value="domains">النطاقات المخصصة</TabsTrigger>
            <TabsTrigger value="platform">إعدادات المنصة</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="brand">
          <OrganizationBrandSettings />
        </TabsContent>
        
        <TabsContent value="domains">
          <DomainSettings />
        </TabsContent>
        
        <TabsContent value="platform">
          <GamePlatformSettings />
        </TabsContent>
      </Tabs>
      
      {/* إضافة رابط لإعدادات النطاقات المخصصة */}
      <div className="mt-6 bg-muted p-4 rounded-lg border border-border">
        <h3 className="font-semibold text-lg mb-2">النطاقات المخصصة</h3>
        <p className="text-sm text-muted-foreground mb-3">
          أضف نطاقك الخاص بدلاً من استخدام النطاق الفرعي الافتراضي. زد من احترافية متجرك وحسّن من تجربة عملائك.
        </p>
        <Button variant="default" onClick={goToDomainSettings} className="mt-2">
          <Globe className="h-4 w-4 ml-2" />
          إدارة النطاقات المخصصة
        </Button>
      </div>
    </div>
  );
};

export default OrganizationSettingsPage;
