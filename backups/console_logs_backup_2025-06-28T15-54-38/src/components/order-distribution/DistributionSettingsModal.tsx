import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle, Loader2, Users, Package, Info, ArrowLeft, ArrowRight, Settings } from 'lucide-react';
import { DistributionPlan, DistributionSettings } from '@/types/orderDistribution';
import { PlanSettings } from './PlanSettings';
import { SimulationCard } from './SimulationCard';
import { ProductSelectionList } from './ProductSelectionList';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Employee {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  category?: string;
}

interface DistributionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DistributionPlan;
  settings: DistributionSettings;
  onSave: (settings: DistributionSettings) => Promise<void>;
  employees: Employee[];
  products: Product[];
}

export const DistributionSettingsModal: React.FC<DistributionSettingsModalProps> = ({
  isOpen,
  onClose,
  plan,
  settings,
  onSave,
  employees,
  products
}) => {
  const [localSettings, setLocalSettings] = useState<DistributionSettings>(settings);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(settings.selectedEmployees || []);
  const [employeeProducts, setEmployeeProducts] = useState<Record<string, string[]>>(settings.employeeProducts || {});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLocalSettings(settings);
    setSelectedEmployees(settings.selectedEmployees || []);
    setEmployeeProducts(settings.employeeProducts || {});
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...localSettings,
        selectedEmployees,
        employeeProducts
      });
      onClose();
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleProductForEmployee = (employeeId: string, productId: string) => {
    setEmployeeProducts(prev => {
      const currentProducts = prev[employeeId] || [];
      const newProducts = currentProducts.includes(productId)
        ? currentProducts.filter(id => id !== productId)
        : [...currentProducts, productId];
      
      return {
        ...prev,
        [employeeId]: newProducts
      };
    });
  };

  const getPlanDescription = () => {
    const descriptions: Record<string, { title: string; description: string; features: string[] }> = {
      round_robin: {
        title: 'نظام الطابور العادل',
        description: 'يوزع الطلبات بالتساوي بين جميع الموظفين المختارين بطريقة دورية.',
        features: [
          'توزيع عادل ومتساوٍ للطلبات',
          'لا يتأثر بأداء الموظف أو سرعته',
          'مناسب للفرق المتجانسة في المهارات',
          'يضمن حصول كل موظف على نفس عدد الطلبات تقريباً'
        ]
      },
      smart: {
        title: 'النظام الذكي',
        description: 'يحلل أداء الموظفين ونشاطهم لتوزيع الطلبات بشكل أمثل.',
        features: [
          'يأخذ في الاعتبار معدل إنجاز الموظف',
          'يحسب متوسط وقت الاستجابة',
          'يوزع الطلبات بناءً على الأداء السابق',
          'يحفز الموظفين على تحسين أدائهم'
        ]
      },
      availability: {
        title: 'نظام الجاهزية',
        description: 'يوزع الطلبات فقط على الموظفين المتصلين والمتاحين حالياً.',
        features: [
          'توزيع فوري على الموظفين المتاحين',
          'يتجاهل الموظفين غير المتصلين',
          'مناسب للعمل بنظام الورديات',
          'يقلل وقت انتظار العملاء'
        ]
      },
      priority: {
        title: 'نظام الأولوية القصوى',
        description: 'يختار الموظف المتفرغ تماماً وليس لديه أي مهام.',
        features: [
          'يحسب عدد المهام المفتوحة لكل موظف',
          'يعطي الأولوية للموظفين الأقل انشغالاً',
          'يوازن العبء بين الموظفين',
          'يمنع تراكم المهام'
        ]
      },
      expert: {
        title: 'نظام الخبير المختص',
        description: 'يوزع الطلبات على الموظفين المختصين بنوع المنتج المطلوب.',
        features: [
          'تخصيص موظفين لمنتجات محددة',
          'يضمن جودة الخدمة',
          'مناسب للمنتجات التقنية أو المتخصصة',
          'يحسن رضا العملاء'
        ]
      }
    };

    return descriptions[plan.type] || { title: plan.name, description: plan.description, features: [] };
  };

  const planInfo = getPlanDescription();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] p-0 bg-gradient-to-br from-background to-muted/30 border-2 shadow-xl rounded-xl">
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b bg-gradient-to-r from-muted/40 to-background relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-primary/5 to-transparent dark:from-primary/2 rounded-bl-full" />
            
            <div className="flex items-center gap-3 mb-1">
              <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full shadow-inner">
                <span className="text-2xl">{plan.icon}</span>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl md:text-2xl bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  خطة {plan.name}
                </DialogTitle>
                <DialogDescription className="text-sm md:text-base text-muted-foreground mt-1">
                  قم بتخصيص إعدادات خطة التوزيع حسب احتياجات مؤسستك
                </DialogDescription>
              </div>
            </div>
            
            <Badge 
              variant="outline" 
              className="absolute top-4 left-4 bg-gradient-to-r from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/10 border-primary/20 text-primary"
            >
              {planInfo.title}
            </Badge>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 md:px-6 pt-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white">
                  <Info className="w-4 h-4 ml-2" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="employees" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white">
                  <Users className="w-4 h-4 ml-2" />
                  الموظفين
                </TabsTrigger>
                <TabsTrigger value="products" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white">
                  <Package className="w-4 h-4 ml-2" />
                  المنتجات
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white">
                  <Settings className="w-4 h-4 ml-2" />
                  الإعدادات
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-4 md:px-6 pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="pt-6"
                >
                  <TabsContent value="overview" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">{planInfo.title}</h3>
                        <p className="text-muted-foreground">{planInfo.description}</p>
                      </div>

                      <Separator className="bg-primary/10" />

                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                          <Info className="w-4 h-4" />
                          مميزات هذا النظام
                        </h4>
                        <ul className="space-y-2">
                          {planInfo.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Separator className="bg-primary/10" />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">الموظفون المختارون</span>
                          </div>
                          <p className="text-2xl font-bold">{selectedEmployees.length}</p>
                          <p className="text-sm text-muted-foreground">من أصل {employees.length} موظف</p>
                        </div>
                        
                        {plan.type === 'expert' && (
                          <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">المنتجات المخصصة</span>
                            </div>
                            <p className="text-2xl font-bold">
                              {Object.values(employeeProducts).flat().filter((v, i, a) => a.indexOf(v) === i).length}
                            </p>
                            <p className="text-sm text-muted-foreground">من أصل {products.length} منتج</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="employees" className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-medium mb-3">اختر الموظفين المشاركين في نظام التوزيع</h3>
                      <div className="space-y-2">
                        {employees.map((employee) => (
                          <div
                            key={employee.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              selectedEmployees.includes(employee.id) && "bg-muted/50 border-primary"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`emp-${employee.id}`}
                                checked={selectedEmployees.includes(employee.id)}
                                onCheckedChange={() => toggleEmployee(employee.id)}
                              />
                              <Label
                                htmlFor={`emp-${employee.id}`}
                                className="flex items-center gap-3 cursor-pointer"
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={employee.avatar_url} />
                                  <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{employee.name}</p>
                                  {employee.email && (
                                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                                  )}
                                </div>
                              </Label>
                            </div>
                            <Badge variant={employee.is_active ? "success" : "secondary"}>
                              {employee.is_active ? "نشط" : "غير نشط"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="space-y-4 mt-4">
                    {plan.type === 'expert' ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">تخصيص المنتجات لكل موظف</h3>
                          {selectedEmployees.length > 0 && (
                            <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
                              {products.length} منتج متاح
                            </Badge>
                          )}
                        </div>
                        
                        {selectedEmployees.length === 0 ? (
                          <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
                            <Info className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 dark:text-amber-200">
                              يرجى اختيار الموظفين أولاً من تبويب "الموظفين" لتتمكن من تخصيص المنتجات لهم
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-6">
                            {selectedEmployees.map((employeeId) => {
                              const employee = employees.find(e => e.id === employeeId);
                              if (!employee) return null;

                              const assignedProducts = employeeProducts[employeeId] || [];
                              const allSelected = products.length > 0 && assignedProducts.length === products.length;
                              const noneSelected = assignedProducts.length === 0;

                              return (
                                <div key={employeeId} className="space-y-4 p-4 rounded-xl border-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50">
                                  {/* Employee Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                                        <AvatarImage src={employee.avatar_url} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                          {employee.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{employee.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {employee.email}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "font-medium",
                                          assignedProducts.length > 0 
                                            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" 
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                        )}
                                      >
                                        {assignedProducts.length} من {products.length} منتج
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                                    <button
                                      onClick={() => {
                                        // Select all products
                                        setEmployeeProducts(prev => ({
                                          ...prev,
                                          [employeeId]: products.map(p => p.id)
                                        }));
                                      }}
                                      disabled={allSelected}
                                      className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                                        allSelected 
                                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed" 
                                          : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm hover:shadow-md"
                                      )}
                                    >
                                      تحديد الكل
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        // Deselect all products
                                        setEmployeeProducts(prev => ({
                                          ...prev,
                                          [employeeId]: []
                                        }));
                                      }}
                                      disabled={noneSelected}
                                      className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                                        noneSelected 
                                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed" 
                                          : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-sm hover:shadow-md"
                                      )}
                                    >
                                      إلغاء الكل
                                    </button>

                                    <div className="mr-auto text-xs text-gray-500 dark:text-gray-400">
                                      {assignedProducts.length > 0 && (
                                        <span className="font-medium">
                                          {Math.round((assignedProducts.length / products.length) * 100)}% محدد
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Products Grid */}
                                  {products.length > 12 ? (
                                    /* For many products, use a compact list with search */
                                    <ProductSelectionList 
                                      products={products}
                                      employeeId={employeeId}
                                      assignedProducts={assignedProducts}
                                      onToggleProduct={toggleProductForEmployee}
                                    />
                                  ) : (
                                    /* For fewer products, use the grid layout */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {products.map((product) => {
                                        const isSelected = assignedProducts.includes(product.id);
                                        return (
                                          <div
                                            key={product.id}
                                            className={cn(
                                              "group relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                                              isSelected 
                                                ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-sm" 
                                                : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                            )}
                                            onClick={() => toggleProductForEmployee(employeeId, product.id)}
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() => toggleProductForEmployee(employeeId, product.id)}
                                              className="shrink-0"
                                            />
                                            
                                            {product.image_url && (
                                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                                                <img 
                                                  src={product.image_url} 
                                                  alt={product.name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                  }}
                                                />
                                              </div>
                                            )}
                                            
                                            <div className="flex-1 min-w-0">
                                              <Label className="cursor-pointer block">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                                                  {product.name}
                                                </span>
                                                <div className="flex items-center justify-between mt-1">
                                                  <span className="text-xs font-semibold text-primary">
                                                    {new Intl.NumberFormat('ar-DZ', { 
                                                      style: 'currency', 
                                                      currency: 'DZD',
                                                      minimumFractionDigits: 0
                                                    }).format(product.price)}
                                                  </span>
                                                  {product.category && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-20">
                                                      {product.category}
                                                    </span>
                                                  )}
                                                </div>
                                              </Label>
                                            </div>
                                            
                                            {isSelected && (
                                              <div className="absolute top-2 left-2 w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200">
                          تخصيص المنتجات متاح فقط في خطة "الخبير حسب المنتج"
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <PlanSettings 
                          plan={plan}
                          settings={localSettings}
                          onUpdateSettings={setLocalSettings}
                        />
                      </div>
                      
                      <div>
                        <SimulationCard 
                          plan={plan}
                          onSimulate={async () => {
                            // محاكاة بسيطة للتوضيح
                            const activeEmployees = employees.filter(e => 
                              selectedEmployees.includes(e.id) && e.is_active
                            );
                            
                            if (activeEmployees.length === 0) {
                              return {
                                employeeId: '',
                                employeeName: 'لا يوجد موظفين متاحين',
                                reason: 'لم يتم اختيار أي موظف نشط'
                              };
                            }

                            const randomEmployee = activeEmployees[Math.floor(Math.random() * activeEmployees.length)];
                            return {
                              employeeId: randomEmployee.id,
                              employeeName: randomEmployee.name,
                              reason: `تم الاختيار بناءً على خطة ${plan.name}`
                            };
                          }}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </ScrollArea>
          </Tabs>

          <div className="px-4 md:px-6 py-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 bg-gradient-to-r from-muted/40 to-background">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto border-2 hover:bg-muted/50"
              disabled={isSaving}
            >
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            
            <Button
              variant="default"
              onClick={handleSave}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              disabled={isSaving}
            >
              {isSaving ? (
                <motion.div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </motion.div>
              ) : (
                <motion.div 
                  className="flex items-center justify-center"
                  whileTap={{ scale: 0.95 }}
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ الإعدادات
                </motion.div>
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
