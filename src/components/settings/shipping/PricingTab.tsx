import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, ArrowDown, ShoppingBag, Truck, SearchIcon, MapPin } from 'lucide-react';
import { ShippingClonePrice, Province } from '@/api/shippingCloneService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PricingTabProps {
  editFormData: {
    is_home_delivery_enabled: boolean;
    is_desk_delivery_enabled: boolean;
    use_unified_price: boolean;
    unified_home_price: number;
    unified_desk_price: number;
    is_free_delivery_home: boolean;
    is_free_delivery_desk: boolean;
  };
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  clonePrices: ShippingClonePrice[];
  modifiedPrices: { [key: number]: { home_price?: number | null; desk_price?: number | null } };
  handlePriceChange: (provinceId: number, type: 'home' | 'desk', value: string) => void;
  applyUnifiedPrice: () => void;
}

const PricingTab: React.FC<PricingTabProps> = ({
  editFormData,
  setEditFormData,
  clonePrices,
  modifiedPrices,
  handlePriceChange,
  applyUnifiedPrice
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'home' | 'desk'>('all');

  // فلترة الولايات بناءً على مصطلح البحث
  const filteredProvinces = clonePrices.filter(price => 
    price.province_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // الحصول على سعر التوصيل (من الأسعار المعدلة أو الأصلية)
  const getPrice = (provinceId: number, type: 'home' | 'desk'): number | null => {
    if (
      modifiedPrices[provinceId] && 
      (type === 'home' ? modifiedPrices[provinceId].home_price !== undefined : modifiedPrices[provinceId].desk_price !== undefined)
    ) {
      return type === 'home' ? modifiedPrices[provinceId].home_price : modifiedPrices[provinceId].desk_price;
    }
    
    const price = clonePrices.find(p => p.province_id === provinceId);
    return type === 'home' ? price?.home_price ?? null : price?.desk_price ?? null;
  };

  return (
    <div className="space-y-6">
      {/* خيارات التسعير العامة */}
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Truck className="mr-2 h-5 w-5 text-primary" />
          خيارات التوصيل والتسعير
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* خيارات توصيل المنزل */}
          <div className="bg-muted/30 p-4 rounded-md border">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-medium flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                توصيل للمنزل
              </Label>
              <Switch
                checked={editFormData.is_home_delivery_enabled}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_home_delivery_enabled: checked }))}
              />
            </div>
            
            {editFormData.is_home_delivery_enabled && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">توصيل مجاني للمنزل</Label>
                  <Switch
                    checked={editFormData.is_free_delivery_home}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_free_delivery_home: checked }))}
                  />
                </div>
                
                {!editFormData.is_free_delivery_home && editFormData.use_unified_price && (
                  <div className="pt-2">
                    <Label htmlFor="unified-home-price" className="text-sm mb-2 block">
                      سعر التوصيل الموحد للمنزل
                    </Label>
                    <div className="flex items-center">
                      <Input
                        id="unified-home-price"
                        type="number"
                        value={editFormData.unified_home_price || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : 0;
                          setEditFormData(prev => ({ ...prev, unified_home_price: value }));
                        }}
                        className="flex-1"
                      />
                      <span className="mr-2 text-sm font-medium text-muted-foreground">د.ج</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* خيارات توصيل المكتب */}
          <div className="bg-muted/30 p-4 rounded-md border">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-medium flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                توصيل للمكتب
              </Label>
              <Switch
                checked={editFormData.is_desk_delivery_enabled}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_desk_delivery_enabled: checked }))}
              />
            </div>
            
            {editFormData.is_desk_delivery_enabled && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">توصيل مجاني للمكتب</Label>
                  <Switch
                    checked={editFormData.is_free_delivery_desk}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_free_delivery_desk: checked }))}
                  />
                </div>
                
                {!editFormData.is_free_delivery_desk && editFormData.use_unified_price && (
                  <div className="pt-2">
                    <Label htmlFor="unified-desk-price" className="text-sm mb-2 block">
                      سعر التوصيل الموحد للمكتب
                    </Label>
                    <div className="flex items-center">
                      <Input
                        id="unified-desk-price"
                        type="number"
                        value={editFormData.unified_desk_price || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : 0;
                          setEditFormData(prev => ({ ...prev, unified_desk_price: value }));
                        }}
                        className="flex-1"
                      />
                      <span className="mr-2 text-sm font-medium text-muted-foreground">د.ج</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium">استخدام سعر موحد</Label>
            <Switch
              checked={editFormData.use_unified_price}
              onCheckedChange={(checked) => {
                setEditFormData(prev => ({ ...prev, use_unified_price: checked }));
                if (checked) {
                  // عند تفعيل السعر الموحد، نقوم بتطبيقه على جميع الولايات
                  applyUnifiedPrice();
                }
              }}
            />
          </div>
          
          {editFormData.use_unified_price && 
           ((editFormData.is_home_delivery_enabled && !editFormData.is_free_delivery_home) || 
            (editFormData.is_desk_delivery_enabled && !editFormData.is_free_delivery_desk)) && (
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={applyUnifiedPrice} 
                className="group"
              >
                <Save className="mr-2 h-4 w-4 group-hover:text-primary" />
                <span className="group-hover:text-primary">تطبيق السعر الموحد</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {(!editFormData.use_unified_price || 
       (editFormData.is_home_delivery_enabled && !editFormData.is_free_delivery_home) || 
       (editFormData.is_desk_delivery_enabled && !editFormData.is_free_delivery_desk)) && (
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              أسعار التوصيل حسب الولاية
            </h3>
            
            <div className="flex items-center">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="بحث عن ولاية..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'home' | 'desk')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">جميع الأسعار</TabsTrigger>
              {editFormData.is_home_delivery_enabled && (
                <TabsTrigger value="home" disabled={editFormData.is_free_delivery_home}>
                  توصيل للمنزل {editFormData.is_free_delivery_home && <Badge variant="outline" className="mr-2">مجاني</Badge>}
                </TabsTrigger>
              )}
              {editFormData.is_desk_delivery_enabled && (
                <TabsTrigger value="desk" disabled={editFormData.is_free_delivery_desk}>
                  توصيل للمكتب {editFormData.is_free_delivery_desk && <Badge variant="outline" className="mr-2">مجاني</Badge>}
                </TabsTrigger>
              )}
            </TabsList>
            
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-right">#</TableHead>
                    <TableHead>الولاية</TableHead>
                    {(activeTab === 'all' || activeTab === 'home') && editFormData.is_home_delivery_enabled && !editFormData.is_free_delivery_home && (
                      <TableHead>سعر التوصيل للمنزل (د.ج)</TableHead>
                    )}
                    {(activeTab === 'all' || activeTab === 'desk') && editFormData.is_desk_delivery_enabled && !editFormData.is_free_delivery_desk && (
                      <TableHead>سعر التوصيل للمكتب (د.ج)</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProvinces.length > 0 ? (
                    filteredProvinces.map((price, index) => (
                      <TableRow key={price.province_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{price.province_name}</TableCell>
                        {(activeTab === 'all' || activeTab === 'home') && editFormData.is_home_delivery_enabled && !editFormData.is_free_delivery_home && (
                          <TableCell>
                            <Input
                              type="number"
                              value={getPrice(price.province_id, 'home') ?? ''}
                              onChange={(e) => handlePriceChange(price.province_id, 'home', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                        )}
                        {(activeTab === 'all' || activeTab === 'desk') && editFormData.is_desk_delivery_enabled && !editFormData.is_free_delivery_desk && (
                          <TableCell>
                            <Input
                              type="number"
                              value={getPrice(price.province_id, 'desk') ?? ''}
                              onChange={(e) => handlePriceChange(price.province_id, 'desk', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        لا توجد نتائج مطابقة لبحثك
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Tabs>
        </div>
      )}

      {/* عرض رسالة عندما تكون جميع خيارات التوصيل معطلة */}
      {!editFormData.is_home_delivery_enabled && !editFormData.is_desk_delivery_enabled && (
        <div className="bg-muted/30 p-8 rounded-lg border border-dashed text-center space-y-2">
          <ArrowDown className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-medium">جميع خيارات التوصيل معطلة</p>
          <p className="text-sm text-muted-foreground">قم بتفعيل خيار التوصيل للمنزل أو المكتب أولاً</p>
        </div>
      )}
      
      {/* عرض رسالة عندما تكون خيارات التوصيل مجانية */}
      {((editFormData.is_home_delivery_enabled && editFormData.is_free_delivery_home) && 
        (editFormData.is_desk_delivery_enabled && editFormData.is_free_delivery_desk)) && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-lg border border-emerald-200 dark:border-emerald-900 text-center space-y-2">
          <Badge variant="success" className="mx-auto">توصيل مجاني</Badge>
          <p className="text-emerald-700 dark:text-emerald-300 font-medium">تم تفعيل التوصيل المجاني لجميع الخيارات</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">سيتم تطبيق سعر صفر دينار لجميع الولايات</p>
        </div>
      )}
    </div>
  );
};

export default PricingTab;
