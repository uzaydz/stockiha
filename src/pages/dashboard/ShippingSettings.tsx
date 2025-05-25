import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Copy, Settings } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import ShippingCloneManager from '@/components/settings/ShippingCloneManager';
import { Helmet } from 'react-helmet-async';
import ShippingSettings from '@/components/settings/ShippingSettings';
import Layout from '@/components/Layout';

export default function ShippingSettingsPage() {
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');

  // وظيفة للانتقال إلى تبويب نسخ مزودي التوصيل
  const navigateToClones = useCallback(() => {
    setActiveTab('clones');
  }, []);

  return (
    <Layout>
      <Helmet>
        <title>إعدادات خدمات التوصيل | بازار</title>
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إعدادات خدمات التوصيل</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>خدمات التوصيل</CardTitle>
            <CardDescription>
              إدارة وتكوين خدمات التوصيل المختلفة لمتجرك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك من هنا تكوين وإدارة التكامل مع مختلف شركات التوصيل في الجزائر لتسهيل عملية الشحن والتسليم لطلبات العملاء.
            </p>
          </CardContent>
        </Card>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-[400px] mb-6">
            <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
            <TabsTrigger value="clones">نسخ مزودي التوصيل</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <ShippingSettings onNavigateToClones={navigateToClones} />
          </TabsContent>
          
          <TabsContent value="clones">
            {organization && (
              <ShippingCloneManager organizationId={organization.id} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
} 