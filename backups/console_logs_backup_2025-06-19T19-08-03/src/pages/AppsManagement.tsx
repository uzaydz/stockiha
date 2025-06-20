import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useApps, AppDefinition, OrganizationApp } from '@/context/AppsContext';
import EnhancedLoader from '@/components/EnhancedLoader';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Grid3X3, 
  Wrench, 
  CreditCard, 
  Package, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Star,
  Info,
  Settings,
  Download,
  Trash2,
  Smartphone,
  Store,
  Search,
  Filter,
  ArrowUpDown,
  Zap,
  Shield,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '@/lib/utils';

// تعيين الأيقونات
const iconMap: Record<string, React.ElementType> = {
  'Wrench': Wrench,
  'CreditCard': CreditCard,
  'Package': Package,
  'Apps': Grid3X3,
  'Smartphone': Smartphone,
  'Store': Store
};

// تعيين ألوان الفئات
const categoryColors: Record<string, string> = {
  'مبيعات': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'خدمات': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'خدمات رقمية': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'خدمات مالية': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  'default': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
};

const AppsManagement: React.FC = () => {
  const { 
    availableApps, 
    organizationApps, 
    isLoading, 
    enableApp, 
    disableApp, 
    isAppEnabled,
    refreshApps
  } = useApps();



  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);
  const [isAppDetailsOpen, setIsAppDetailsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'enable' | 'disable'>('enable');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);



  // فلترة التطبيقات
  const filteredApps = useMemo(() => {
    return availableApps.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.features.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesStatus = !showOnlyEnabled || isAppEnabled(app.id);
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [availableApps, searchQuery, selectedCategory, showOnlyEnabled, isAppEnabled]);

  // الحصول على الفئات المتاحة
  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableApps.map(app => app.category)));
    return cats;
  }, [availableApps]);

  // احصائيات سريعة
  const stats = {
    total: availableApps.length,
    enabled: organizationApps.filter(app => app.is_enabled).length,
    disabled: availableApps.length - organizationApps.filter(app => app.is_enabled).length
  };

  // التعامل مع تغيير حالة التطبيق مع إشعارات محسّنة
  const handleAppToggle = async (appId: string, enabled: boolean) => {
    
    const app = availableApps.find(a => a.id === appId);
    if (!app) {
      return;
    }

    if (isProcessing || processingAppId === appId) {
      return;
    }

    setIsProcessing(true);
    setProcessingAppId(appId);
    
    try {
      let success = false;
      
      if (enabled) {
        success = await enableApp(appId);
      } else {
        success = await disableApp(appId);
      }
      
      if (success) {
        // Context سيقوم بالتحديث تلقائياً - لا نحتاج refreshApps هنا
      } else {
      }
    } catch (error) {
    } finally {
      setIsProcessing(false);
      setProcessingAppId(null);
    }
  };

  // إظهار تفاصيل التطبيق مع تشخيص
  const showAppDetails = (app: AppDefinition) => {
    setSelectedApp(app);
    setIsAppDetailsOpen(true);
  };

  // تأكيد العملية
  const confirmAction = (app: AppDefinition, action: 'enable' | 'disable') => {
    setSelectedApp(app);
    setActionType(action);
    setIsConfirmDialogOpen(true);
  };

  // تنفيذ العملية المؤكدة
  const executeAction = async () => {
    if (!selectedApp) return;

    setIsProcessing(true);
    setIsConfirmDialogOpen(false);

    try {
      let success = false;
      if (actionType === 'enable') {
        success = await enableApp(selectedApp.id);
      } else {
        success = await disableApp(selectedApp.id);
      }
      
      if (!success) {
      }
    } catch (error) {
    } finally {
      setIsProcessing(false);
      setSelectedApp(null);
    }
  };

  // الحصول على الأيقونة
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Package;
    return IconComponent;
  };

  // الحصول على لون الحالة
  const getStatusColor = (appId: string) => {
    return isAppEnabled(appId) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500';
  };

  // تحويل حالة التحميل
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <EnhancedLoader
            size="xl"
            variant="apps"
            text="جاري تحميل التطبيقات"
            subText="يرجى الانتظار، جاري تحميل التطبيقات المتاحة..."
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full space-y-6">
        {/* العنوان والإحصائيات */}
        <motion.div 
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              <div className="relative">
                <Grid3X3 className="h-8 w-8 text-primary" />
                <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1 animate-pulse" />
              </div>
              إدارة التطبيقات
            </h1>
            <p className="text-lg text-muted-foreground">
              تفعيل وإدارة التطبيقات المتاحة في نظامك التجاري
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={refreshApps} variant="outline" className="gap-2 hover:scale-105 transition-transform">
                    <Download className="h-4 w-4" />
                    تحديث
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>تحديث قائمة التطبيقات</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* بطاقات الإحصائيات المحسّنة */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-4 translate-x-4" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Package className="h-5 w-5" />
                إجمالي التطبيقات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">{stats.total}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">تطبيق متاح</p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-4 translate-x-4" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="h-5 w-5" />
                التطبيقات المفعّلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{stats.enabled}</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">نشط حالياً</p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/30 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gray-500/10 rounded-full -translate-y-4 translate-x-4" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <XCircle className="h-5 w-5" />
                التطبيقات المعطّلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{stats.disabled}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">غير نشط</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* أدوات البحث والفلترة المحسّنة */}
        <motion.div 
          className="bg-card rounded-xl border-2 shadow-lg p-6 backdrop-blur-sm bg-gradient-to-br from-card/80 to-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* شريط البحث الرئيسي */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative search-container">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
              <Input
                placeholder="ابحث عن التطبيقات والمميزات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 h-12 border-2 focus:border-primary/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:shadow-lg text-base"
              />
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </div>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setShowOnlyEnabled(false);
              }}
              className="h-12 px-6 gap-2 border-2 hover:border-primary/50 transition-all duration-300"
            >
              <Filter className="h-4 w-4" />
              إعادة تعيين
            </Button>
          </div>
          
          {/* عوامل التصفية */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">تصفية:</span>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border-2 border-input bg-background/80 backdrop-blur-sm rounded-lg focus:border-primary/50 focus:outline-none transition-all duration-300 hover:bg-background text-sm min-w-[140px]"
            >
              <option value="all">جميع الفئات ({availableApps.length})</option>
              {categories.map(category => {
                const count = availableApps.filter(app => app.category === category).length;
                return (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                );
              })}
            </select>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 backdrop-blur-sm rounded-lg border">
              <Switch
                id="show-enabled"
                checked={showOnlyEnabled}
                onCheckedChange={setShowOnlyEnabled}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="show-enabled" className="text-sm font-medium cursor-pointer">
                المفعّل فقط
              </Label>
            </div>
            
            {/* عداد النتائج */}
            <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {filteredApps.length} من {availableApps.length} تطبيق
              </span>
            </div>
          </div>
          
          {/* مؤشرات البحث */}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t"
            >
              <p className="text-xs text-muted-foreground">
                🔍 البحث عن: <span className="font-medium text-foreground">"{searchQuery}"</span>
                {filteredApps.length === 0 && (
                  <span className="text-destructive"> - لا توجد نتائج</span>
                )}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* قائمة التطبيقات */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredApps.map((app, index) => {
              const IconComponent = getIcon(app.icon);
              const isEnabled = isAppEnabled(app.id);
              
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ 
                    duration: 0.4,
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="h-full"
                >
                  <Card className={cn(
                    "h-full transition-all duration-300 border-2 relative overflow-hidden group app-card-enhanced",
                    isEnabled 
                      ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-transparent hover:shadow-xl hover:shadow-emerald-500/20" 
                      : "border-gray-200 dark:border-gray-800 bg-gradient-to-br from-card/80 to-card/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  )}>
                    {/* خلفية متحركة */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* شارة الحالة */}
                    <div className={cn(
                      "absolute top-4 left-4 w-3 h-3 rounded-full",
                      isEnabled ? "bg-emerald-500 shadow-emerald-500/50" : "bg-gray-400 shadow-gray-400/50"
                    )}>
                      <div className={cn(
                        "absolute inset-0 rounded-full animate-ping",
                        isEnabled ? "bg-emerald-500" : "bg-gray-400"
                      )} />
                    </div>

                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
                            isEnabled 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                          )}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                              {app.name}
                            </CardTitle>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "mt-1 text-xs font-medium border-2",
                                categoryColors[app.category] || categoryColors.default
                              )}
                            >
                              {app.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {app.description}
                      </CardDescription>

                      {/* المميزات */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">المميزات الرئيسية</p>
                        <div className="space-y-1">
                          {app.features.slice(0, 3).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                              <span className="line-clamp-1">{feature}</span>
                            </div>
                          ))}
                          {app.features.length > 3 && (
                            <p className="text-xs text-primary font-medium">و {app.features.length - 3} مميزات أخرى...</p>
                          )}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* أزرار الإجراءات المحسّنة */}
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showAppDetails(app);
                          }}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10 transition-all app-action-button flex-1"
                          style={{ position: 'relative', zIndex: 24 }}
                        >
                          <Info className="h-4 w-4 ml-2" />
                          عرض التفاصيل
                        </Button>

                        <div className="flex items-center gap-2" style={{ zIndex: 20 }}>
                          {/* مفتاح التفعيل/التعطيل */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center" style={{ zIndex: 21 }}>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      if (checked !== isEnabled) {
                                        handleAppToggle(app.id, checked);
                                      }
                                    }}
                                    disabled={isProcessing || processingAppId === app.id}
                                    className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700"
                                    style={{ position: 'relative', zIndex: 22 }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">
                                  {isEnabled ? 'إلغاء تفعيل التطبيق' : 'تفعيل التطبيق'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* زر بديل للتفعيل/التعطيل */}
                          <Button
                            variant={isEnabled ? "destructive" : "default"}
                            size="sm"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleAppToggle(app.id, !isEnabled);
                            }}
                            disabled={isProcessing || processingAppId === app.id}
                            className={cn(
                              "transition-all duration-300 min-w-[90px] font-medium app-action-button",
                              isEnabled 
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25" 
                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                            )}
                            style={{ position: 'relative', zIndex: 23 }}
                          >
                            {(isProcessing && processingAppId === app.id) ? (
                              <div className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs">معالجة...</span>
                              </div>
                            ) : isEnabled ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                <span className="text-xs">إلغاء</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span className="text-xs">تفعيل</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>

                    {/* مؤشر التحميل المحسّن للبطاقة المحددة */}
                    {(isProcessing && processingAppId === app.id) && (
                      <motion.div 
                        className="absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center rounded-lg border-2 border-primary/20"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <div className="text-center">
                          <EnhancedLoader
                            size="md"
                            variant="apps"
                            text="جاري تحديث التطبيق..."
                            subText={`${isEnabled ? 'إلغاء تفعيل' : 'تفعيل'} ${app.name}`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* رسالة عدم وجود نتائج */}
        {filteredApps.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تطبيقات مطابقة</h3>
            <p className="text-muted-foreground">جرب تغيير معايير البحث أو الفلترة</p>
          </motion.div>
        )}

        {/* نافذة تفاصيل التطبيق المحسّنة */}
        <Dialog open={isAppDetailsOpen} onOpenChange={setIsAppDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0">
            {selectedApp && (
              <div className="flex flex-col">
                {/* رأس النافذة المحسّن */}
                <div className="sticky top-0 z-10 p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-b backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <motion.div 
                        className={cn(
                          "p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0",
                          isAppEnabled(selectedApp.id) 
                            ? "bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800" 
                            : "bg-gray-500/10 border border-gray-200 dark:border-gray-800"
                        )}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {React.createElement(getIcon(selectedApp.icon), { 
                          className: cn(
                            "h-6 w-6 sm:h-8 sm:w-8",
                            isAppEnabled(selectedApp.id) 
                              ? "text-emerald-600 dark:text-emerald-400" 
                              : "text-gray-600 dark:text-gray-400"
                          )
                        })}
                      </motion.div>
                      
                      <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                        <DialogTitle className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="truncate">{selectedApp.name}</span>
                          <Badge variant="outline" className="text-xs font-medium flex-shrink-0">
                            v{selectedApp.version}
                          </Badge>
                        </DialogTitle>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <Badge className={cn(
                            "text-xs font-medium px-2 sm:px-3 py-1",
                            categoryColors[selectedApp.category] || categoryColors.default
                          )}>
                            {selectedApp.category}
                          </Badge>
                          
                          <div className="flex items-center gap-2">
                            {isAppEnabled(selectedApp.id) ? (
                              <>
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">نشط</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">غير نشط</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {selectedApp.description}
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </div>

                {/* محتوى النافذة */}
                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                  {/* إحصائيات سريعة */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="p-3 sm:p-4 text-center border-2">
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">المميزات</p>
                      <p className="text-lg sm:text-xl font-bold">{selectedApp.features.length}</p>
                    </Card>
                    
                    <Card className="p-3 sm:p-4 text-center border-2">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">الإصدار</p>
                      <p className="text-lg sm:text-xl font-bold">{selectedApp.version}</p>
                    </Card>
                    
                    <Card className="p-3 sm:p-4 text-center border-2 col-span-2 sm:col-span-1">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">الحالة</p>
                      <p className="text-lg sm:text-xl font-bold">
                        {isAppEnabled(selectedApp.id) ? 'نشط' : 'غير نشط'}
                      </p>
                    </Card>
                  </div>

                  {/* المميزات المفصّلة */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">المميزات والخصائص</h3>
                    </div>
                    
                    <div className="grid gap-2 sm:gap-3">
                      {selectedApp.features.map((feature, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-muted/50 to-muted/20 border border-muted-foreground/10 hover:border-primary/30 transition-colors group"
                        >
                          <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5">
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {feature}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* معلومات إضافية */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">معلومات التطبيق</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">الفئة</p>
                        <p className="text-sm sm:text-base font-semibold text-foreground">{selectedApp.category}</p>
                      </div>
                      
                      <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">الحالة</p>
                        <div className="flex items-center gap-2">
                          {isAppEnabled(selectedApp.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                              <span className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400">مفعّل</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                              <span className="text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-400">غير مفعّل</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="sticky bottom-0 p-4 sm:p-6 border-t bg-background/95 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 order-2 sm:order-1">
                      {isAppEnabled(selectedApp.id) && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm">
                          ✨ نشط حالياً
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAppDetailsOpen(false)}
                        className="gap-2 flex-1 sm:flex-none"
                        size="sm"
                      >
                        إغلاق
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          await handleAppToggle(selectedApp.id, !isAppEnabled(selectedApp.id));
                        }}
                        disabled={isProcessing || processingAppId === selectedApp.id}
                        size="sm"
                        className={cn(
                          "gap-2 min-w-[120px] sm:min-w-[140px] transition-all duration-300 font-medium flex-1 sm:flex-none",
                          isAppEnabled(selectedApp.id) 
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25" 
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                        )}
                      >
                        {(isProcessing && processingAppId === selectedApp.id) ? (
                          <>
                            <EnhancedLoader size="sm" variant="minimal" />
                            <span className="text-xs sm:text-sm">معالجة...</span>
                          </>
                        ) : isAppEnabled(selectedApp.id) ? (
                          <>
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">إلغاء التفعيل</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">تفعيل التطبيق</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* نافذة التأكيد المحسّنة */}
        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                {actionType === 'enable' ? (
                  <motion.div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </motion.div>
                )}
              </div>
              
              <AlertDialogTitle className="text-xl font-bold">
                {actionType === 'enable' ? 'تفعيل التطبيق' : 'إلغاء تفعيل التطبيق'}
              </AlertDialogTitle>
              
              <AlertDialogDescription className="text-base text-center leading-relaxed">
                {actionType === 'enable' ? (
                  <>
                    هل تريد تفعيل تطبيق{' '}
                    <span className="font-semibold text-foreground">"{selectedApp?.name}"</span>؟
                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        ✨ سيتم إظهار جميع المميزات والصفحات المرتبطة بهذا التطبيق
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    هل تريد إلغاء تفعيل تطبيق{' '}
                    <span className="font-semibold text-foreground">"{selectedApp?.name}"</span>؟
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        ⚠️ سيتم إخفاء جميع الصفحات والميزات المرتبطة بهذا التطبيق
                      </p>
                    </div>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="gap-2 pt-6">
              <AlertDialogCancel className="flex-1">
                إلغاء
              </AlertDialogCancel>
              
              <AlertDialogAction
                onClick={executeAction}
                disabled={isProcessing}
                className={cn(
                  "flex-1 gap-2",
                  actionType === 'enable' 
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
                )}
              >
                {isProcessing ? (
                  <EnhancedLoader size="sm" variant="minimal" />
                ) : actionType === 'enable' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    تفعيل
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    إلغاء التفعيل
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
                </div>
    </Layout>
  );
};

export default AppsManagement;
