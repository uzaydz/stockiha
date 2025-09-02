import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { CalendarIcon, Menu as MenuIcon, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// أنواع الفترات الزمنية
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// تعريف نوع المستخدم
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
  const { user } = useAuth() as { user: UserType };
  const { currentOrganization } = useTenant() as TenantType;
  const navigate = useNavigate();
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeType>('monthly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });

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
    <div className="w-full mb-6">
      {/* الهيدر الرئيسي */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          {/* الصف الأول - الترحيب والتحكم */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-8 w-8" 
                onClick={toggleSidebar}
              >
                <MenuIcon className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-semibold">
                    أهلاً بك، {user?.full_name?.split(' ')[0] || 'صديقي'}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {currentOrganization?.name || 'لوحة التحكم'}
                  </p>
                </div>
              </div>
            </div>

            {/* مؤشر الفترة الزمنية */}
            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg text-xs">
              <CalendarIcon className="h-3 w-3 text-primary" />
              <span className="font-medium">{getTimeframeTitle()}</span>
            </div>
          </div>

          {/* الآية الكريمة */}
          <Card className="mb-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <BookOpen className="h-3 w-3 text-emerald-600" />
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    ﴿ وَفِى ٱلسَّمَآءِ رِزْقُكُمْ وَمَا تُوعَدُونَ ﴾
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    [الذاريات: 22]
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الرسالة التحفيزية */}
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs leading-relaxed text-foreground/90 mb-1">
                    كل منتج تعرضه اليوم قد يكون سببًا في فتح أبواب رزق جديدة وغلق شهر بأرباح لم تتوقعها…
                  </p>
                  <p className="text-xs font-medium text-primary">
                    استثمر وقتك وطاقتك في البيع، فالسوق لا ينتظر المتأخرين!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* تبويبات الفترة الزمنية */}
          <Tabs 
            defaultValue="monthly" 
            value={activeTimeframe}
            className="w-full mb-4"
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

          {/* اختيار التاريخ المخصص */}
          {showDatePicker && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto flex gap-3">
                    <div className="w-full sm:w-auto">
                      <label className="text-xs text-muted-foreground block mb-1">من:</label>
                      <input 
                        type="date" 
                        className="w-full border rounded-md text-xs py-1.5 px-2 bg-background"
                        value={customDateRange.start.toISOString().split('T')[0]}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-auto">
                      <label className="text-xs text-muted-foreground block mb-1">إلى:</label>
                      <input 
                        type="date" 
                        className="w-full border rounded-md text-xs py-1.5 px-2 bg-background"
                        value={customDateRange.end.toISOString().split('T')[0]}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="w-full sm:w-auto text-xs px-4 py-1.5"
                    onClick={handleApplyCustomRange}
                  >
                    تطبيق
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHeader;
