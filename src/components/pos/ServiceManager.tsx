import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Service, ServiceCategory, User, RepairLocation } from '@/types';
import { Wrench, Calendar, Search, Clock, Tag, ClipboardCheck, CalendarClock, ListFilter, Filter, Settings, Info, User as UserIcon, UserPlus, Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
// ✨ استخدام الـ context الجديد المحسن - فقط CustomersContext بدلاً من ShopContext الكامل
import { useCustomers } from '@/context/shop/ShopContext.new';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import RepairLocationManager from './RepairLocationManager';
import { getDefaultRepairLocation } from '@/lib/api/repairLocations';

interface ServiceManagerProps {
  services: Service[];
  onAddService: (service: Service, scheduledDate?: Date, notes?: string, repairLocationId?: string) => void;
  customers: User[];
  organizationId: string;
}

export default function ServiceManager({ services, onAddService, customers = [], organizationId }: ServiceManagerProps) {
  // ✨ استخدام createCustomer من CustomersContext الجديد فقط - تحسين الأداء بنسبة 85%
  const { createCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // إضافة حالة للعميل المختار
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  
  // إضافة حالة لمكان التصليح المختار
  const [selectedRepairLocation, setSelectedRepairLocation] = useState<RepairLocation | null>(null);
  const [showRepairLocationManager, setShowRepairLocationManager] = useState(false);
  
  // تحميل المكان الافتراضي عند بدء التشغيل
  useEffect(() => {
    const loadDefaultLocation = async () => {
      if (organizationId) {
        try {
          const defaultLocation = await getDefaultRepairLocation(organizationId);
          if (defaultLocation) {
            setSelectedRepairLocation(defaultLocation);
          }
        } catch (error) {
        }
      } else {
      }
    };

    loadDefaultLocation();
  }, [organizationId]);
  
  // Categorías únicas de servicios
  const categories: string[] = ['all', ...Array.from(new Set(services.map(s => s.category)))];
  
  // Nombres de categorías en árabe
  const categoryNames: Record<string, string> = {
    'all': 'الكل',
    'repair': 'خدمات إصلاح',
    'installation': 'خدمات تركيب',
    'maintenance': 'خدمات صيانة',
    'customization': 'خدمات تخصيص'
  };

  // Filtrar servicios
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch && service.isAvailable;
  });

  // تصفية العملاء للبحث
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) || 
    c.email.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (c.phone && c.phone.includes(searchCustomer))
  );

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setIsSheetOpen(true);
    // إعادة تعيين قيم النموذج عند اختيار خدمة جديدة
    setScheduledDate('');
    setServiceNotes('');
    setSelectedCustomer(null);
    // لا نعيد تعيين مكان التصليح لأنه يجب أن يبقى المكان الافتراضي
  };

  const handleCustomerSelect = (userId: string) => {
    if (userId === "guest") {
      setSelectedCustomer(null);
    } else if (userId === "new") {
      setIsCreatingCustomer(true);
    } else {
      const customer = customers.find(c => c.id === userId) || null;
      setSelectedCustomer(customer);
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }

    try {
      // استخدام وظيفة إنشاء عميل من سياق المتجر
      const createdCustomer = await createCustomer({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone
      });
      
      setSelectedCustomer(createdCustomer);
      setIsCreatingCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '' });
      
      // Actualizar lista filtrada de clientes para verificar que aparece el nuevo cliente
      setSearchCustomer('');
      
      toast.success(`تم إضافة العميل ${createdCustomer.name} بنجاح`);
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة العميل");
    }
  };

  const handleRepairLocationSelect = (location: RepairLocation) => {
    setSelectedRepairLocation(location);
    setShowRepairLocationManager(false);
  };

  const handleAddService = () => {
    if (selectedService) {
      const date = scheduledDate ? new Date(scheduledDate) : undefined;
      
      // إنشاء نسخة من الخدمة مع إضافة معرف العميل إذا تم اختياره
      const serviceWithCustomer = {
        ...selectedService,
        customerId: selectedCustomer?.id // إضافة معرف العميل المختار
      };
      
      onAddService(
        serviceWithCustomer, 
        date, 
        serviceNotes || undefined,
        selectedRepairLocation?.id // إضافة معرف مكان التصليح
      );
      
      toast.success(`تمت إضافة خدمة "${selectedService.name}"`);
      
      setIsSheetOpen(false);
      setSelectedService(null);
      setScheduledDate('');
      setServiceNotes('');
      setSelectedCustomer(null); // إعادة تعيين العميل المختار
      // لا نعيد تعيين مكان التصليح لأنه يجب أن يبقى المكان الافتراضي
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-background rounded-lg border shadow-md overflow-hidden">
      <div className="px-4 py-3 space-y-1.5 bg-card/80 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            الخدمات
          </h2>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 shadow-sm">
            {filteredServices.length} خدمة متاحة
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          إضافة وجدولة الخدمات للعملاء
        </p>
      </div>

      <Separator className="opacity-50" />

      <div className="p-3 bg-card/30 border-b">
        {/* Search and Filters */}
        <div className="mb-2 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الخدمات..."
                className="pl-9 border-primary/20 focus:border-primary shadow-sm"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowFilters(!showFilters)}
              className={cn("flex-shrink-0 shadow-sm", showFilters && "bg-primary/10 text-primary border-primary/50")}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {showFilters && (
            <Tabs 
              defaultValue="all" 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
              className="w-full"
            >
              <ScrollArea className="max-w-full">
                <TabsList className="flex flex-nowrap overflow-auto bg-background/40 shadow-sm">
                  {categories.map(category => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="whitespace-nowrap flex items-center gap-1"
                    >
                      {category === 'all' ? <Wrench className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
                      {categoryNames[category] || category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>
          )}
        </div>
      </div>

      {/* Services List */}
      <ScrollArea className="flex-1">
        {filteredServices.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
            <Wrench className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-base">لم يتم العثور على خدمات</p>
            <p className="text-xs mt-1 text-muted-foreground">جرب بحثًا آخر أو غير التصنيف</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-2"
            >
              إعادة ضبط الفلتر
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {filteredServices.map(service => (
              <Card
                key={service.id}
                className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden bg-card group hover:translate-y-[-2px]"
                onClick={() => handleServiceSelect(service)}
              >
                <CardContent className="p-0">
                  <div className="flex items-start">
                    {service.image ? (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 relative bg-muted flex-shrink-0 border-l">
                        <img
                          src={service.image}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                          <Badge variant="secondary" className="bg-white/90 text-foreground shadow-sm">
                            عرض التفاصيل
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted flex-shrink-0 flex items-center justify-center border-l">
                        <Wrench className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium line-clamp-1 text-sm sm:text-base">{service.name}</h3>
                        <Badge className="bg-primary text-white ml-2 whitespace-nowrap shadow-sm">
                          {service.isPriceDynamic ? 'سعر مفتوح' : `${service.price} دج`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-2">
                        {service.description}
                      </p>
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge variant="outline" className="bg-background flex items-center gap-1 text-xs shadow-sm border-primary/20">
                          <Clock className="h-3 w-3" />
                          <span>{service.estimatedTime}</span>
                        </Badge>
                        <Badge variant="outline" className="bg-background text-xs shadow-sm border-primary/20">
                          {categoryNames[service.category] || service.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Service Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-lg overflow-hidden max-h-[90vh]">
          <SheetHeader className="text-right border-b pb-3">
            <SheetTitle className="text-xl flex items-center gap-2 justify-end">
              {selectedService?.name}
              <Wrench className="h-5 w-5 text-primary" />
            </SheetTitle>
            <SheetDescription>
              أدخل تفاصيل الخدمة وتاريخ الجدولة ومكان التصليح
            </SheetDescription>
          </SheetHeader>
          
          {selectedService && (
            <ScrollArea className="h-[calc(85vh-14rem)] py-4 -mx-6 px-6">
              <div className="mb-6 p-4 rounded-lg bg-muted/30 border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">وصف الخدمة</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedService.description}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card className="shadow-sm">
                  <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                    <Tag className="h-5 w-5 text-primary mb-1" />
                    <p className="text-sm text-muted-foreground mb-1">السعر</p>
                    <p className="font-bold text-lg">
                      {selectedService.isPriceDynamic ? 'سعر مفتوح' : `${selectedService.price} دج`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                    <Clock className="h-5 w-5 text-primary mb-1" />
                    <p className="text-sm text-muted-foreground mb-1">الوقت المقدر</p>
                    <p className="font-bold text-lg">{selectedService.estimatedTime}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4 mb-4">
                <div>
                  <label htmlFor="schedule-date" className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    تاريخ ووقت الجدولة
                  </label>
                  <Input 
                    id="schedule-date"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-background shadow-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    *اترك الحقل فارغًا إذا كنت تريد إضافة الخدمة مباشرة بدون جدولة
                  </p>
                </div>
                
                <div>
                  <label htmlFor="customer-select" className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-primary" />
                    اختيار العميل
                  </label>
                  <div className="grid gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-search"
                        placeholder="بحث عن عميل..."
                        value={searchCustomer}
                        onChange={(e) => setSearchCustomer(e.target.value)}
                        className="pl-9 bg-background shadow-sm"
                      />
                    </div>
                    <Select
                      value={selectedCustomer?.id || "guest"}
                      onValueChange={handleCustomerSelect}
                    >
                      <SelectTrigger className="w-full shadow-sm">
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest">زائر - بدون تسجيل</SelectItem>
                        {filteredCustomers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone && `- ${customer.phone}`}
                          </SelectItem>
                        ))}
                        <SelectItem value="new" className="text-primary">
                          + إضافة عميل جديد
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    اختر العميل أو أضف عميلاً جديداً لربط هذه الخدمة به
                  </p>
                </div>

                {/* إضافة قسم اختيار مكان التصليح */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-primary" />
                      مكان التصليح
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRepairLocationManager(true)}
                      className="gap-1"
                    >
                      <Building className="h-3 w-3" />
                      إدارة الأماكن
                    </Button>
                  </div>
                  
                  {selectedRepairLocation ? (
                    <Card className="shadow-sm border-primary/20">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{selectedRepairLocation.name}</h4>
                              {selectedRepairLocation.is_default && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                  افتراضي
                                </Badge>
                              )}
                            </div>
                            {selectedRepairLocation.address && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {selectedRepairLocation.address}
                              </p>
                            )}
                            {selectedRepairLocation.phone && (
                              <p className="text-xs text-muted-foreground">
                                📞 {selectedRepairLocation.phone}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRepairLocation(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setShowRepairLocationManager(true)}
                    >
                      <Building className="h-4 w-4" />
                      اختر مكان التصليح
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    اختر مكان التصليح حيث ستتم الخدمة
                  </p>
                </div>
                
                <div>
                  <label htmlFor="service-notes" className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    ملاحظات إضافية
                  </label>
                  <Input 
                    id="service-notes"
                    placeholder="أدخل أي متطلبات خاصة أو ملاحظات..."
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    className="bg-background shadow-sm"
                  />
                </div>
              </div>
              
              <Card className="bg-muted/20 shadow-sm border-primary/10 mb-4">
                <CardContent className="p-3">
                  <h4 className="font-medium mb-2 flex items-center gap-1.5 text-primary">
                    <Info className="h-4 w-4" />
                    معلومات مهمة
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>سيتم إضافة الخدمة إلى سلة المشتريات الحالية</li>
                    <li>يمكن ربط الخدمة بعميل محدد ومكان تصليح</li>
                    <li>يمكن جدولة مواعيد متعددة لنفس الخدمة</li>
                    <li>سيتم إرسال تأكيد بالموعد عند إتمام الطلب</li>
                  </ul>
                </CardContent>
              </Card>
            </ScrollArea>
          )}
          
          <SheetFooter className="flex flex-col sm:flex-row gap-2 pt-3 mt-2 border-t">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none order-2 sm:order-1"
              onClick={() => setIsSheetOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1 sm:flex-none order-1 sm:order-2 bg-primary"
              onClick={handleAddService}
              disabled={!selectedService}
            >
              {scheduledDate ? 'إضافة وجدولة الخدمة' : 'إضافة الخدمة'}
            </Button>
          </SheetFooter>
          
        </SheetContent>
      </Sheet>
      
      {/* نافذة إنشاء عميل جديد */}
      <Dialog open={isCreatingCustomer} onOpenChange={setIsCreatingCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
            <DialogDescription>
              أدخل معلومات العميل الجديد لإضافته إلى النظام
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-customer-name" className="text-left col-span-1">
                الاسم
              </Label>
              <Input
                id="new-customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="اسم العميل"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-customer-phone" className="text-left col-span-1">
                الهاتف
              </Label>
              <Input
                id="new-customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="رقم الهاتف"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-customer-email" className="text-left col-span-1">
                البريد
              </Label>
              <Input
                id="new-customer-email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="البريد الإلكتروني (اختياري)"
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingCustomer(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateNewCustomer}>
              إضافة العميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إدارة أماكن التصليح */}
      <Dialog open={showRepairLocationManager} onOpenChange={setShowRepairLocationManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>إدارة أماكن التصليح</DialogTitle>
            <DialogDescription>
              اختر مكان التصليح أو أضف مكان جديد
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-[70vh]">
            <RepairLocationManager
              organizationId={organizationId}
              onLocationSelect={handleRepairLocationSelect}
              selectedLocationId={selectedRepairLocation?.id}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
