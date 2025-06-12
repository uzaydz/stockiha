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
    <header className="w-full rounded-xl bg-background/80 border border-border/30 shadow-sm mb-6">
      {/* شريط أدوات لوحة التحكم */}
      <div className="flex flex-col gap-4 p-5">
        {/* رأس الصفحة مع الأزرار */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              <h1 className="text-xl font-bold mb-1">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground">
                {currentOrganization?.name ? `${currentOrganization.name} - ` : ''}
                نظرة عامة على متجرك ومبيعاتك
              </p>
              {/* عرض عنوان الفترة الزمنية */}
              <div className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-md text-xs text-primary border border-primary/20 mt-2">
                <CalendarIcon className="h-3 w-3" />
                <span>{getTimeframeTitle()}</span>
              </div>
            </div>
          </div>
        
          <div className="flex items-center gap-2 self-end md:self-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/dashboard/notifications')}
            >
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || ""} alt={user?.full_name || "صورة المستخدم"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{getNameInitials()}</AvatarFallback>
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
        <div>
          <Tabs 
            defaultValue="monthly" 
            value={activeTimeframe}
            className="w-full"
            onValueChange={(value) => handleTimeframeChange(value as TimeframeType)}
          >
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="daily" className="text-xs">يومي</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">أسبوعي</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">شهري</TabsTrigger>
              <TabsTrigger value="annual" className="text-xs">سنوي</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">مخصص</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* اختيار التاريخ المخصص */}
        {showDatePicker && (
          <div className="bg-muted/30 p-4 rounded-lg border border-border/30">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto flex gap-3">
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-muted-foreground block mb-1">من:</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md text-sm py-1.5 px-2.5 bg-background"
                    value={customDateRange.start.toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-muted-foreground block mb-1">إلى:</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md text-sm py-1.5 px-2.5 bg-background"
                    value={customDateRange.end.toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                  />
                </div>
              </div>
              <Button 
                size="sm"
                className="w-full sm:w-auto mt-3 sm:mt-0"
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
