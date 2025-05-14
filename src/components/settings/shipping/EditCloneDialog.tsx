import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ShippingProviderClone, ShippingClonePrice } from '@/api/shippingCloneService';
import { Save, X, Truck, Settings, TagIcon } from 'lucide-react';
import GeneralSettingsTab from './GeneralSettingsTab';
import PricingTab from './PricingTab';

interface EditCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  selectedClone: ShippingProviderClone | null;
  clonePrices: ShippingClonePrice[];
  editFormData: {
    name: string;
    is_active: boolean;
    is_home_delivery_enabled: boolean;
    is_desk_delivery_enabled: boolean;
    use_unified_price: boolean;
    unified_home_price: number;
    unified_desk_price: number;
    is_free_delivery_home: boolean;
    is_free_delivery_desk: boolean;
  };
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  modifiedPrices: { [key: number]: { home_price?: number | null; desk_price?: number | null } };
  handlePriceChange: (provinceId: number, type: 'home' | 'desk', value: string) => void;
  applyUnifiedPrice: () => void;
  isLoading: boolean;
  progress: number;
}

const EditCloneDialog: React.FC<EditCloneDialogProps> = ({
  isOpen,
  onClose,
  onUpdate,
  selectedClone,
  clonePrices,
  editFormData,
  setEditFormData,
  modifiedPrices,
  handlePriceChange,
  applyUnifiedPrice,
  isLoading,
  progress
}) => {
  const [activeTab, setActiveTab] = useState<string>('general');
  
  // إعادة تعيين علامة التبويب النشطة عند فتح الحوار
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  if (!selectedClone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="bg-primary/10 p-2 rounded-full">
              <Truck className="h-5 w-5 text-primary" />
            </span>
            تعديل نسخة {selectedClone.name}
          </DialogTitle>
          <DialogDescription className="pt-2">
            تعديل إعدادات وأسعار نسخة مزود التوصيل
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && (
          <div className="mb-4">
            <Progress value={progress} className="w-full h-2" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              {progress < 100 ? 'جاري حفظ التغييرات...' : 'تم الحفظ بنجاح'}
            </p>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs 
            defaultValue="general" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex border-b">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="general" 
                  className={`rounded-none border-b-2 ${
                    activeTab === 'general' 
                      ? 'border-primary' 
                      : 'border-transparent'
                  } px-4 py-2 data-[state=active]:bg-transparent`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  الإعدادات العامة
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing" 
                  className={`rounded-none border-b-2 ${
                    activeTab === 'pricing' 
                      ? 'border-primary' 
                      : 'border-transparent'
                  } px-4 py-2 data-[state=active]:bg-transparent`}
                >
                  <TagIcon className="h-4 w-4 mr-2" />
                  أسعار التوصيل
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-auto p-1">
              <TabsContent 
                value="general" 
                className="mt-0 h-full overflow-auto py-4 pr-2"
              >
                <GeneralSettingsTab
                  editFormData={{
                    name: editFormData.name,
                    is_active: editFormData.is_active
                  }}
                  setEditFormData={setEditFormData}
                />
              </TabsContent>
              
              <TabsContent 
                value="pricing" 
                className="mt-0 h-full overflow-auto py-4 pr-2"
              >
                <PricingTab
                  editFormData={editFormData}
                  setEditFormData={setEditFormData}
                  clonePrices={clonePrices}
                  modifiedPrices={modifiedPrices}
                  handlePriceChange={handlePriceChange}
                  applyUnifiedPrice={applyUnifiedPrice}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <DialogFooter className="flex gap-2 pt-4 mt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            إلغاء
          </Button>
          <Button 
            onClick={onUpdate} 
            disabled={!editFormData.name.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الحفظ...
              </span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCloneDialog; 