import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Truck } from 'lucide-react';
import DeliveryProvidersTable from '@/components/delivery/DeliveryProvidersTable';
import AddDeliveryProviderDialog from '@/components/delivery/AddDeliveryProviderDialog';

export default function DeliveryManagement() {
  const { organization } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddProviderSuccess = () => {
    // تحديث refreshKey لإعادة تحميل المكونات
    setRefreshKey(prev => prev + 1);
    setIsAddDialogOpen(false);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إدارة التوصيل</h1>
              <p className="text-muted-foreground">
                إدارة وتكوين شركات التوصيل لمتجرك
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة شركة توصيل
          </Button>
        </div>

        {/* Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              شركات التوصيل المتاحة
            </CardTitle>
            <CardDescription>
              عرض وإدارة جميع شركات التوصيل المكونة لمتجرك. يمكنك إضافة شركات جديدة أو تعديل إعدادات الشركات الموجودة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeliveryProvidersTable 
              key={refreshKey}
              organizationId={organization?.id || ''} 
            />
          </CardContent>
        </Card>

        {/* Add Provider Dialog */}
        <AddDeliveryProviderDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          organizationId={organization?.id || ''}
          onSuccess={handleAddProviderSuccess}
        />
      </div>
    </Layout>
  );
}
