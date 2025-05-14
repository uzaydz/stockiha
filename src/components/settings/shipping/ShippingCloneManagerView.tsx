import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BoxIcon, 
  Truck, 
  Plus, 
  LayoutDashboard, 
  History, 
  ChevronDown, 
  Filter, 
  SearchIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import useShippingCloneManager from './useShippingCloneManager';
import ShippingProviderCard from './ShippingProviderCard';
import CloneCard from './CloneCard';
import CloneDialog from './CloneDialog';
import EditCloneDialog from './EditCloneDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ShippingCloneManagerViewProps {
  organizationId: string;
}

const ShippingCloneManagerView: React.FC<ShippingCloneManagerViewProps> = ({ organizationId }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<string>('providers');
  const [filterActive, setFilterActive] = React.useState<boolean | null>(null);
  
  const {
    providers,
    selectedProvider,
    selectedClone,
    clonePrices,
    isCloneDialogOpen,
    isEditDialogOpen,
    editFormData,
    modifiedPrices,
    isLoading,
    progress,
    
    setSelectedProvider,
    loadCloneDetails,
    openCloneDialog,
    openEditDialog,
    setIsCloneDialogOpen,
    setIsEditDialogOpen,
    setEditFormData,
    handleClone,
    handleUpdateSettings,
    handlePriceChange,
    applyUnifiedPrice,
  } = useShippingCloneManager(organizationId);

  // فلترة النسخ المستنسخة بناءً على النص المدخل
  const filteredClones = selectedProvider?.clones?.filter(clone => {
    // فلترة بناءً على نص البحث
    const matchesSearch = searchTerm === '' || 
      clone.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // فلترة بناءً على الحالة (نشط/غير نشط)
    const matchesActiveFilter = filterActive === null || clone.is_active === filterActive;
    
    return matchesSearch && matchesActiveFilter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const handleAsyncClone = async (name: string, copyApiCredentials: boolean, enableSync: boolean) => {
    await handleClone(name, copyApiCredentials, enableSync);
  };
  
  const handleAsyncUpdate = async () => {
    await handleUpdateSettings();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">إدارة مزودي التوصيل</h1>
            <p className="text-muted-foreground mt-1">استنساخ وإدارة مزودي التوصيل لمتجرك</p>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse mt-4 md:mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="providers" className="flex items-center">
                  <BoxIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">المزودين</span>
                </TabsTrigger>
                <TabsTrigger value="clones" className="flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">النسخ</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <TabsContent value="providers" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && !providers.length ? (
              // عناصر تحميل
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              ))
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {providers.map(provider => (
                  <motion.div key={provider.id} variants={itemVariants}>
                    <ShippingProviderCard
                      provider={provider}
                      isSelected={selectedProvider?.id === provider.id}
                      onSelect={setSelectedProvider}
                      onClone={openCloneDialog}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="clones" className="mt-0">
          {selectedProvider ? (
            <>
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">
                    نسخ {selectedProvider.name}
                  </h2>
                  <span className="ml-2 bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                    {filteredClones?.length || 0} نسخة
                  </span>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="بحث عن نسخة..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterActive(null)}>
                        الكل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterActive(true)}>
                        مفعل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterActive(false)}>
                        غير مفعل
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    onClick={() => openCloneDialog(selectedProvider)} 
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">استنساخ جديد</span>
                  </Button>
                </div>
              </div>
              
              {filteredClones && filteredClones.length > 0 ? (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredClones.map(clone => (
                    <motion.div key={clone.id} variants={itemVariants}>
                      <CloneCard
                        clone={clone}
                        originalProviderName={selectedProvider.name}
                        isSelected={selectedClone?.id === clone.id}
                        onSelect={loadCloneDetails}
                        onEdit={openEditDialog}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">لا توجد نسخ مستنسخة</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filterActive !== null ? 
                      'لا توجد نتائج مطابقة لمعايير البحث' : 
                      'قم بإنشاء نسخة مستنسخة من مزود التوصيل الحالي'
                    }
                  </p>
                  {!(searchTerm || filterActive !== null) && (
                    <Button 
                      onClick={() => openCloneDialog(selectedProvider)} 
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      استنساخ مزود التوصيل
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">يرجى اختيار مزود توصيل</h3>
              <p className="text-muted-foreground mb-6">
                قم باختيار مزود توصيل من قائمة المزودين لعرض النسخ المستنسخة
              </p>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('providers')} 
                className="gap-2"
              >
                <BoxIcon className="h-4 w-4" />
                عرض مزودي التوصيل
              </Button>
            </div>
          )}
        </TabsContent>
      </div>
      
      {/* حوار استنساخ مزود التوصيل */}
      <CloneDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        onClone={handleAsyncClone}
        provider={selectedProvider}
        isLoading={isLoading}
      />
      
      {/* حوار تعديل نسخة مزود التوصيل */}
      <EditCloneDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleAsyncUpdate}
        selectedClone={selectedClone}
        clonePrices={clonePrices}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        modifiedPrices={modifiedPrices}
        handlePriceChange={handlePriceChange}
        applyUnifiedPrice={applyUnifiedPrice}
        isLoading={isLoading}
        progress={progress}
      />
    </div>
  );
};

export default ShippingCloneManagerView; 