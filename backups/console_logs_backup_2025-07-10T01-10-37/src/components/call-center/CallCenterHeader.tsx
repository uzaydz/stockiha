import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  PhoneCall, 
  Clock, 
  CheckCircle, 
  User, 
  Bell,
  Activity,
  Headphones,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  TrendingUp,
  BarChart3,
  Users,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  getCurrentCallCenterTheme, 
  updateCallCenterThemeMode,
  applyCallCenterTheme,
  type CallCenterTheme 
} from '@/lib/callCenterTheme';

const CallCenterHeader: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const { theme: systemTheme, setTheme: setSystemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<CallCenterTheme['mode']>('light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // إحصائيات سريعة (ستأتي من API لاحقاً)
  const quickStats = {
    activeCalls: 3,
    pendingOrders: 12,
    completedToday: 8,
    avgCallTime: '4:32',
    satisfaction: 94,
    efficiency: 87
  };

  // الحصول على الأحرف الأولى من الاسم
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // دالة تغيير وضع الثيم
  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    // تحديث ثيم مركز الاتصال
    updateCallCenterThemeMode(mode);
    setCurrentTheme(mode);
    
    // تحديث ثيم النظام أيضًا للتوافق
    setSystemTheme(mode);
    
    // تطبيق الثيم الجديد مباشرة
    const theme = getCurrentCallCenterTheme();
    applyCallCenterTheme({ ...theme, mode });
    
    // تطبيق التغييرات على DOM مباشرة
    const root = document.documentElement;
    const body = document.body;
    
    // تحديد الوضع الفعلي
    let effectiveMode = mode;
    if (mode === 'system') {
      effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // إزالة الفئات السابقة
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    // إضافة الفئة الجديدة
    root.classList.add(effectiveMode);
    body.classList.add(effectiveMode);
    
    // تعيين data attributes
    root.setAttribute('data-theme', effectiveMode);
    body.setAttribute('data-theme', effectiveMode);
    
    // تحديث color-scheme
    document.body.style.colorScheme = effectiveMode;
    root.style.colorScheme = effectiveMode;
  };

  // تحديث الثيم الحالي عند التحميل
  useEffect(() => {
    const theme = getCurrentCallCenterTheme();
    setCurrentTheme(theme.mode);
    
    // مزامنة مع ثيم النظام
    if (systemTheme !== theme.mode) {
      handleThemeChange(systemTheme);
    }
  }, []);
  
  // مراقبة تغييرات ثيم النظام
  useEffect(() => {
    if (systemTheme !== currentTheme) {
      setCurrentTheme(systemTheme);
      updateCallCenterThemeMode(systemTheme);
      const theme = getCurrentCallCenterTheme();
      applyCallCenterTheme({ ...theme, mode: systemTheme });
    }
  }, [systemTheme, currentTheme]);

  // أيقونة الثيم الحالي
  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  // نص الثيم الحالي
  const getThemeText = () => {
    switch (currentTheme) {
      case 'light':
        return 'فاتح';
      case 'dark':
        return 'داكن';
      case 'system':
        return 'النظام';
      default:
        return 'فاتح';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* معلومات الوكيل والمؤسسة - محسنة للموبايل */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* زر القائمة للموبايل */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <Avatar className="h-8 sm:h-10 w-8 sm:w-10 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name || 'وكيل مركز الاتصال'} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-xs sm:text-sm">
                  {userProfile?.name ? getInitials(userProfile.name) : 'CC'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  {userProfile?.name || 'وكيل مركز الاتصال'}
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {currentOrganization?.name || 'مركز الاتصال'}
                  </p>
                  {/* حالة الاتصال - مدمجة */}
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">متصل</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* الإحصائيات السريعة - مخفية على الموبايل */}
          <div className="hidden xl:flex items-center space-x-6 space-x-reverse">
            {/* مكالمات نشطة */}
            <div className="group relative">
              <div className="flex items-center space-x-2 space-x-reverse p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all hover:shadow-md">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50">
                  <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">مكالمات نشطة</p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{quickStats.activeCalls}</p>
                </div>
              </div>
            </div>

            {/* في الانتظار */}
            <div className="group relative">
              <div className="flex items-center space-x-2 space-x-reverse p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 transition-all hover:shadow-md">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-800/50">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">في الانتظار</p>
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-100">{quickStats.pendingOrders}</p>
                </div>
              </div>
            </div>

            {/* مكتملة اليوم */}
            <div className="group relative">
              <div className="flex items-center space-x-2 space-x-reverse p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 transition-all hover:shadow-md">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/50">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">مكتملة اليوم</p>
                  <p className="text-sm font-bold text-green-900 dark:text-green-100">{quickStats.completedToday}</p>
                </div>
              </div>
            </div>

            {/* متوسط المكالمة */}
            <div className="group relative">
              <div className="flex items-center space-x-2 space-x-reverse p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 transition-all hover:shadow-md">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50">
                  <Headphones className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">متوسط المكالمة</p>
                  <p className="text-sm font-bold text-purple-900 dark:text-purple-100">{quickStats.avgCallTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* الإجراءات - محسنة للموبايل */}
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
            {/* إحصائيات موجزة للموبايل */}
            <div className="flex lg:hidden items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                <PhoneCall className="h-3 w-3 mr-1" />
                {quickStats.activeCalls}
              </Badge>
              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                <Clock className="h-3 w-3 mr-1" />
                {quickStats.pendingOrders}
              </Badge>
            </div>

            {/* مفتاح تبديل الثيم */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  {getThemeIcon()}
                  <span className="hidden sm:inline-block mr-2">{getThemeText()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <DropdownMenuLabel className="text-gray-700 dark:text-gray-300">وضع العرض</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem 
                  onClick={() => handleThemeChange('light')}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Sun className="h-4 w-4 ml-2" />
                  الوضع الفاتح
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleThemeChange('dark')}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Moon className="h-4 w-4 ml-2" />
                  الوضع الداكن
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleThemeChange('system')}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Monitor className="h-4 w-4 ml-2" />
                  حسب النظام
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* الإشعارات */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow-lg">
                3
              </span>
            </Button>

            {/* قائمة المستخدم */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block mr-2">الحساب</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-48"
              >
                <DropdownMenuLabel className="text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar} />
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
                        {userProfile?.name ? getInitials(userProfile.name) : 'CC'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium truncate">{userProfile?.name || 'الوكيل'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <User className="h-4 w-4 ml-2" />
                  الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <Settings className="h-4 w-4 ml-2" />
                  الإعدادات
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <BarChart3 className="h-4 w-4 ml-2" />
                  الإحصائيات
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400">
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* شريط الإحصائيات للموبايل والتابلت - محسن */}
        <div className="lg:hidden mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">نشطة</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{quickStats.activeCalls}</p>
              </div>
              <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">منتظرة</p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{quickStats.pendingOrders}</p>
              </div>
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">مكتملة</p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">{quickStats.completedToday}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">المتوسط</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{quickStats.avgCallTime}</p>
              </div>
              <Headphones className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* شريط الأداء - جديد */}
        <div className="hidden sm:flex mt-4 items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">الأداء:</span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{quickStats.efficiency}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">رضا العملاء:</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{quickStats.satisfaction}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400 animate-pulse" />
            <span className="text-xs text-gray-500 dark:text-gray-400">آخر تحديث: منذ 5 ثوان</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CallCenterHeader;
