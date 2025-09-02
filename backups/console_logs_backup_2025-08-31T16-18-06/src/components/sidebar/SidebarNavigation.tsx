import React, { useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Menu, Search, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { createNavigationData } from './navigationData';
import { checkPermission, debugPermissions } from './utils';
import NavigationGroup from './NavigationGroup';
import PopupMenu from './PopupMenu';
import MerchantTypeToggle from './MerchantTypeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MerchantType } from './types';
import { supabase } from '@/lib/supabase';

interface SidebarNavigationProps {
  activeGroup: string | null;
  onToggleGroup: (group: string) => void;
  onSetActiveGroup: (group: string | null) => void;
  onLogout: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeGroup,
  onToggleGroup,
  onSetActiveGroup,
  onLogout
}) => {
  const location = useLocation();
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const userRole = userProfile?.role || null;
  const isMobile = useMediaQuery('(max-width: 768px)');

  // إضافة debug log لمراقبة currentOrganization
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [currentOrganization, userProfile?.id]);

  // حل بديل: التحقق من currentOrganization بشكل دوري
  React.useEffect(() => {
    if (!currentOrganization && userProfile?.organization_id) {
      if (process.env.NODE_ENV === 'development') {
      }

      // إرسال حدث لإجبار TenantContext على التحقق من AuthContext
      const checkInterval = setInterval(() => {
        if (currentOrganization) {
          clearInterval(checkInterval);
        } else {
          window.dispatchEvent(new CustomEvent('checkAuthOrganization'));
        }
      }, 1000); // كل ثانية

      return () => clearInterval(checkInterval);
    }
  }, [currentOrganization, userProfile?.organization_id]);

  // الاستماع إلى أحداث AuthContext لتحديث currentOrganization
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }

    const handleAuthOrganizationReady = (event: CustomEvent) => {
      const { organization: authOrg } = event.detail;
      if (process.env.NODE_ENV === 'development') {
      }
    };

    window.addEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);

    return () => {
      window.removeEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
    };
  }, [currentOrganization]);
  const userPermissions = (userProfile?.permissions || {}) as Record<string, boolean>;
  const { organizationApps } = useApps();
  // إزالة popup ref - لا حاجة له بعد إزالة الطي
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const permissions = userPermissions;
  const isAdmin = userRole === 'admin';

  // حالة نوع التاجر المحلية
  const [merchantType, setMerchantType] = React.useState<MerchantType>('both');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  // فحص أن supabase جاهز
  const isSupabaseReady = React.useMemo(() => {
    const ready = supabase && typeof supabase.from === 'function' && typeof supabase.channel === 'function';
    if (!ready) {
    }
    return ready;
  }, []);

  // دالة لإجبار تحديث البيانات
  const handleForceRefresh = async () => {
    if (!userProfile?.id) return;
    
    setIsRefreshing(true);
    try {
      // مسح البيانات المحفوظة
      localStorage.removeItem('user_data_cache');
      localStorage.removeItem('bazaar_organization_id');
      
      // إعادة تحميل الصفحة لإجبار تحديث البيانات
      window.location.reload();
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // استخراج نوع التاجر من إعدادات المؤسسة
  React.useEffect(() => {
    const getMerchantType = async () => {
      if (!currentOrganization?.id) {
        setMerchantType('both');
        return;
      }

      // فحص أن supabase جاهز
      if (!isSupabaseReady) {
        setMerchantType('both');
        return;
      }

      try {
        // محاولة الحصول على merchant_type من قاعدة البيانات
        const { data: orgSettings, error } = await supabase
          .from('organization_settings')
          .select('merchant_type')
          .eq('organization_id', currentOrganization.id)
          .single() as { data: any, error: any };

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (orgSettings?.merchant_type) {
          setMerchantType(orgSettings.merchant_type as MerchantType);
        } else {
          // القيمة الافتراضية
          setMerchantType('both');
        }
      } catch (error) {
        // إذا لم يكن الحقل موجود في قاعدة البيانات، استخدم القيمة الافتراضية
        setMerchantType('both');
        
        // إضافة معالجة أفضل للأخطاء
        if (error && typeof error === 'object' && 'message' in error) {
        }
      }
    };

    // تأخير صغير للتأكد من أن supabase جاهز
    const timer = setTimeout(() => {
      getMerchantType();
    }, 100);

    return () => clearTimeout(timer);
  }, [currentOrganization?.id]);

  // إضافة مراقبة لتغييرات merchantType في قاعدة البيانات
  React.useEffect(() => {
    if (!currentOrganization?.id) {
      return;
    }

    // فحص أن supabase جاهز
    if (!isSupabaseReady) {
      return;
    }

    const channel = supabase
      .channel('organization_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organization_settings',
          filter: `organization_id=eq.${currentOrganization.id}`
        },
        (payload) => {
          if (payload.new && payload.new.merchant_type) {
            setMerchantType(payload.new.merchant_type as MerchantType);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentOrganization?.id]);

  // تحسين isAppEnabled مع memoization
  const enabledApps = useMemo(() => {
    return organizationApps.filter((app: any) => app.is_enabled).map((app: any) => app.app_id);
  }, [organizationApps]);

  const isAppEnabledMemo = useMemo(() => {
    return (appId: string): boolean => enabledApps.includes(appId);
  }, [enabledApps]);

  // إضافة console.log للتشخيص عند تغيير التطبيقات
  useEffect(() => {
    // إضافة تأخير صغير للتأكد من تحديث البيانات
    setTimeout(() => {
      // طباعة معلومات تشخيصية للصلاحيات
      if (userProfile && permissions) {
      }
    }, 100);
  }, [organizationApps, enabledApps, userProfile, permissions, userRole, isAdmin]);

  // إنشاء بيانات التنقل مع تمرير نوع التاجر
  const navItems = useMemo(() => {
    return createNavigationData(isAppEnabledMemo, merchantType);
  }, [isAppEnabledMemo, merchantType]);
  
  // تصفية المجموعات التي يملك المستخدم صلاحيات عرضها - محسنة
  const filteredNavItems = useMemo(() => {
    const filtered = navItems.filter(group => {
      // إذا كان المستخدم مدير، يظهر له كل شيء
      if (isAdmin) {
        return true;
      }
      
      // إذا لم تتطلب المجموعة صلاحية، تظهر للجميع
      if (!group.requiredPermission) {
        return true;
      }
      
      // التحقق من الصلاحية مع تشخيص
      const hasPermission = checkPermission(group.requiredPermission, permissions);
      
      // طباعة معلومات تشخيصية للمجموعات المفلترة
      if (process.env.NODE_ENV === 'development') {
        const debugInfo = debugPermissions(group.requiredPermission, permissions, userRole);
        if (!hasPermission) {
        }
      }
      
      return hasPermission;
    });
    
    // طباعة معلومات تشخيصية للنتيجة النهائية
    if (process.env.NODE_ENV === 'development') {
    }
    
    return filtered;
  }, [navItems, isAdmin, permissions, userRole]);
  
  // تحديد المجموعة التي تحتوي على العنصر النشط
  const currentPath = location.pathname;
  const activeGroupByPath = useMemo(() => {
    return filteredNavItems.find(group => 
      group.items.some(item => 
        currentPath === item.href || 
        (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
        (item.href === '/dashboard' && currentPath === '/dashboard')
      )
    );
  }, [filteredNavItems, currentPath]);

  // تحديث المجموعة النشطة عند تغيير المسار
  useEffect(() => {
    if (!activeGroup && activeGroupByPath) {
      onSetActiveGroup(activeGroupByPath.group);
    }
  }, [activeGroup, activeGroupByPath, onSetActiveGroup]);

  // إزالة دالة عرض زر المجموعة المطوية - القائمة دائماً موسعة

  // تصفية العناصر بناءً على البحث
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return filteredNavItems;
    
    return filteredNavItems.filter(group => 
      group.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.items.some(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [filteredNavItems, searchQuery]);

  return (
    <nav 
      id="sidebar-content"
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        // تحسين الارتفاع للهاتف المحمول
        isMobile 
          ? "h-[calc(100vh-12rem)] px-2 py-3" 
          : "h-[calc(100vh-14rem)] px-3 py-5"
      )}
    >
      <div className={cn(
        "h-full overflow-y-auto sidebar-scrollbar",
        // تحسين التمرير للهاتف المحمول
        isMobile && "pb-20" // إضافة مساحة إضافية في الأسفل للهاتف
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-2"
          >
            {/* عنوان القسم الرئيسي */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "px-4 my-3",
                isMobile && "px-2 my-2" // تقليل المسافات للهاتف
              )}
            >
              <h2 className={cn(
                "text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2",
                isMobile && "text-[10px]" // تقليل حجم الخط للهاتف
              )}>
                <Menu className={cn(
                  "text-primary",
                  isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
                )} />
                القائمة الرئيسية
              </h2>
            </motion.div>

            {/* شريط البحث */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "px-3",
                isMobile && "px-2" // تقليل المسافات للهاتف
              )}
            >
              <div className="relative">
                <Search className={cn(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground",
                  isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
                )} />
                <input
                  type="text"
                  placeholder="البحث في القائمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                    isMobile && "py-1.5 text-xs" // تقليل الحجم للهاتف
                  )}
                />
              </div>
            </motion.div>

            {/* تبديل نوع التاجر */}
            <MerchantTypeToggle 
              currentType={merchantType}
              onTypeChange={setMerchantType}
            />

            {/* المجموعات */}
            {filteredItems.map((group, index) => (
              <motion.div
                key={group.group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.4 + (index * 0.1),
                  duration: 0.3,
                  ease: "easeOut"
                }}
              >
                <NavigationGroup
                  group={group}
                  isAdmin={isAdmin}
                  permissions={permissions}
                  isGroupActive={activeGroup === group.group}
                  hasActiveItem={group.items.some(item => 
                    currentPath === item.href || 
                    (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                    (item.href === '/dashboard' && currentPath === '/dashboard')
                  )}
                  currentPath={currentPath}
                  toggleGroup={onToggleGroup}
                  isCollapsed={false}
                  isMobile={isMobile} // تمرير حالة الهاتف المحمول
                />
              </motion.div>
            ))}

            {/* رسالة إذا لم توجد عناصر */}
            {filteredItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-center py-8 text-muted-foreground",
                  isMobile && "py-4" // تقليل المسافات للهاتف
                )}
              >
                <p className={isMobile ? "text-sm" : "text-base"}>
                  لا توجد عناصر متاحة
                </p>
                {searchQuery && (
                  <p className={cn(
                    "text-sm mt-2",
                    isMobile && "text-xs mt-1" // تقليل الحجم للهاتف
                  )}>
                    جرب البحث بكلمات مختلفة
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* زر تسجيل الخروج */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={cn(
          "px-3 mt-4",
          isMobile && "px-2 mt-2" // تقليل المسافات للهاتف
        )}
      >
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent",
            isMobile && "py-1.5 text-xs" // تقليل الحجم للهاتف
          )}
        >
          <LogOut className={cn(
            "text-muted-foreground",
            isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
          )} />
          تسجيل الخروج
        </button>
      </motion.div>
    </nav>
  );
};

export default SidebarNavigation;
