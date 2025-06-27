import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Package, 
  DollarSign, 
  BarChart3, 
  Layers,
  RefreshCw 
} from 'lucide-react';

// Import components
import { ServiceStatsCards, TransactionStatsCards } from '@/components/subscription-services/StatsCards';
import { ServiceFilters, TransactionFilters } from '@/components/subscription-services/Filters';
import { ServicesDisplay } from '@/components/subscription-services/ServicesDisplay';
import { TransactionsTable } from '@/components/subscription-services/TransactionsTable';
import { AddServiceDialog } from '@/components/subscription-services/AddServiceDialog';
import { useSubscriptionServices } from '@/components/subscription-services/useSubscriptionServices';
import { SubscriptionService } from '@/components/subscription-services/types';

const SubscriptionServicesPage = () => {
  const { organization } = useAuth();
  
  // Dialog states
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SubscriptionService | null>(null);

  // Use custom hook
  const {
    // Services
    services,
    categories,
    serviceStats,
    servicesLoading,
    
    // Transactions
    transactions,
    transactionStats,
    transactionsLoading,
    
    // Filters
    serviceSearchTerm,
    setServiceSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedServiceStatus,
    setSelectedServiceStatus,
    
    transactionSearchTerm,
    setTransactionSearchTerm,
    selectedTransactionStatus,
    setSelectedTransactionStatus,
    selectedTransactionType,
    setSelectedTransactionType,
    
    // UI
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    
    // Actions
    fetchServices,
    fetchTransactions,
    refetchAll
  } = useSubscriptionServices(organization?.id);

  const handleManagePricing = (service: SubscriptionService) => {
    setSelectedService(service);
    setIsPricingDialogOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">خدمات الاشتراكات</h1>
            <p className="text-muted-foreground mt-1">إدارة خدمات الاشتراكات الرقمية وأسعارها</p>
          </div>
          
          <div className="flex gap-3">
            {activeTab === 'services' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      عرض جدولي
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4 mr-2" />
                      عرض شبكي
                    </>
                  )}
                </Button>
                
                <Button onClick={() => setIsAddServiceDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة خدمة جديدة
                </Button>
              </>
            )}
            
            {activeTab === 'transactions' && (
              <Button onClick={fetchTransactions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                تحديث البيانات
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'services' | 'transactions')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              الخدمات
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              طلبات الاشتراكات
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {/* Service Stats */}
            {serviceStats && <ServiceStatsCards stats={serviceStats} />}

            {/* Service Filters */}
            <ServiceFilters
              searchTerm={serviceSearchTerm}
              setSearchTerm={setServiceSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStatus={selectedServiceStatus}
              setSelectedStatus={setSelectedServiceStatus}
              categories={categories}
            />

            {/* Services Display */}
            <ServicesDisplay
              services={services}
              loading={servicesLoading}
              viewMode={viewMode}
              onManagePricing={handleManagePricing}
            />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Transaction Stats */}
            {transactionStats && <TransactionStatsCards stats={transactionStats} />}

            {/* Transaction Filters */}
            <TransactionFilters
              searchTerm={transactionSearchTerm}
              setSearchTerm={setTransactionSearchTerm}
              selectedStatus={selectedTransactionStatus}
              setSelectedStatus={setSelectedTransactionStatus}
              selectedType={selectedTransactionType}
              setSelectedType={setSelectedTransactionType}
            />

            {/* Transactions Table */}
            <TransactionsTable
              transactions={transactions}
              loading={transactionsLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Add Service Dialog */}
        <AddServiceDialog
          isOpen={isAddServiceDialogOpen}
          onClose={() => setIsAddServiceDialogOpen(false)}
          categories={categories}
          organizationId={organization?.id || ''}
          onSuccess={fetchServices}
        />
      </div>
    </Layout>
  );
};

export default SubscriptionServicesPage;
