import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { CalendarIcon, Bell, Menu as MenuIcon, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// أنواع الفترات الزمنية
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// تعريف نوع المستخدم المتوافق مع السياق
interface UserType {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

// تعريف نوع سياق المستأجر
interface TenantType {
  currentOrganization?: {
    id: string;
    name?: string;
  };
}

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  onTimeframeChange: (timeframe: TimeframeType) => void;
  onCustomDateChange?: (startDate: Date, endDate: Date) => void;
}

const DashboardHeader = ({ toggleSidebar, onTimeframeChange, onCustomDateChange }: DashboardHeaderProps) => {
  const { user, signOut } = useAuth() as { user: UserType, signOut: () => Promise<void> };
  const { currentOrganization } = useTenant() as TenantType;
  const navigate = useNavigate();
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeType>('monthly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });

  // الحصول على الحروف الأولى من اسم المستخدم
  const getNameInitials = () => {
    if (!user?.full_name) return 'مس';
    return user.full_name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // تسجيل الخروج
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // تغيير الفترة الزمنية
  const handleTimeframeChange = (value: TimeframeType) => {
    setActiveTimeframe(value);
    
    if (value === 'custom') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      onTimeframeChange(value);
    }
  };

  // تغيير التاريخ المخصص
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const date = new Date(value);
    setCustomDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  // تطبيق النطاق المخصص
  const handleApplyCustomRange = () => {
    if (onCustomDateChange) {
      onCustomDateChange(customDateRange.start, customDateRange.end);
    }
  };

  // الحصول على عنوان الفترة الزمنية
  const getTimeframeTitle = () => {
    const now = new Date();
    
    switch (activeTimeframe) {
      case 'daily':
        return `اليوم (${now.toLocaleDateString('ar', { calendar: 'gregory' })})`;
      case 'weekly':
        return 'هذا الأسبوع';
      case 'monthly':
        return 'هذا الشهر';
      case 'annual':
        return 'هذه السنة';
      case 'custom':
        return `من ${customDateRange.start.toLocaleDateString('ar', { calendar: 'gregory' })} إلى ${customDateRange.end.toLocaleDateString('ar', { calendar: 'gregory' })}`;
      default:
        return 'هذا الشهر';
    }
  };

  return (
    <header className="w-full bg-card rounded-lg shadow-sm mb-6 border">
      {/* شريط أدوات لوحة التحكم */}
      <div className="flex flex-col gap-5 p-6">
        {/* رأس الصفحة مع الأزرار */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden mr-3" 
              onClick={toggleSidebar}
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">لوحة التحكم</h1>
              <p className="text-muted-foreground text-sm mb-3">
                {currentOrganization?.name ? `${currentOrganization.name} - ` : ''}
                نظرة عامة على متجرك ومبيعاتك
              </p>
              {/* عرض عنوان الفترة الزمنية */}
              <div className="inline-flex items-center gap-2 bg-muted py-1.5 px-4 rounded-full text-sm text-muted-foreground border">
                <CalendarIcon className="h-4 w-4" />
                <span>{getTimeframeTitle()}</span>
              </div>
            </div>
          </div>
        
          <div className="flex items-center gap-3 self-end md:self-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/dashboard/notifications')}
            >
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatar_url || ""} alt={user?.full_name || "صورة المستخدم"} />
                    <AvatarFallback>{getNameInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <User className="ml-2 h-4 w-4" />
                  <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="ml-2 h-4 w-4" />
                  <span>الإعدادات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* عناصر التحكم في الفترة الزمنية */}
        <div className="bg-background rounded-lg shadow-sm overflow-hidden w-full border">
          <Tabs 
            defaultValue="monthly" 
            value={activeTimeframe}
            className="w-full"
            onValueChange={(value) => handleTimeframeChange(value as TimeframeType)}
          >
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="daily">يومي</TabsTrigger>
              <TabsTrigger value="weekly">أسبوعي</TabsTrigger>
              <TabsTrigger value="monthly">شهري</TabsTrigger>
              <TabsTrigger value="annual">سنوي</TabsTrigger>
              <TabsTrigger value="custom">مخصص</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* اختيار التاريخ المخصص */}
        {showDatePicker && (
          <div className="bg-background p-5 rounded-lg shadow-sm border">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-full sm:w-auto flex gap-3 sm:gap-5">
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-muted-foreground block mb-1.5">من:</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md focus:ring focus:ring-primary/20 text-sm py-2 px-3"
                    value={customDateRange.start.toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-muted-foreground block mb-1.5">إلى:</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md focus:ring focus:ring-primary/20 text-sm py-2 px-3"
                    value={customDateRange.end.toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="w-full sm:w-auto mt-3 sm:mt-5"
                onClick={handleApplyCustomRange}
              >
                تطبيق
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
