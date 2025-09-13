import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, 
  Clock, 
  Zap, 
  AlertCircle, 
  Repeat, 
  Bell, 
  CheckCircle2,
  Calendar,
  Timer,
  Sparkles,
  Settings,
  Info
} from 'lucide-react';
import { format, addHours, addDays, addMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ScheduleOptions {
  dateTime: Date;
  recurring: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: Date;
  notifications: boolean;
  notificationMinutes: number;
}

interface QuickOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  duration: number; // in minutes
  color: string;
  description: string;
}

interface SchedulePublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (options: ScheduleOptions) => void;
  productTitle?: string;
  currentDateTime?: Date;
}

const SchedulePublishDialog: React.FC<SchedulePublishDialogProps> = ({
  open,
  onOpenChange,
  onSchedule,
  productTitle = "المنتج",
  currentDateTime,
}) => {
  const getDefaultDateTime = () => addMinutes(new Date(), 30);

  // States
  const [scheduledUTC, setScheduledUTC] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'advanced'>('quick');
  const [recurring, setRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [notifications, setNotifications] = useState(true);
  const [notificationMinutes, setNotificationMinutes] = useState(15);
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null);

  // Quick schedule options
  const quickOptions: QuickOption[] = useMemo(() => [
    {
      id: '30min',
      label: 'خلال 30 دقيقة',
      icon: <Timer className="h-4 w-4" />,
      duration: 30,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'نشر سريع'
    },
    {
      id: '1hour',
      label: 'خلال ساعة',
      icon: <Clock className="h-4 w-4" />,
      duration: 60,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'مناسب للمراجعة'
    },
    {
      id: '3hours',
      label: 'خلال 3 ساعات',
      icon: <Zap className="h-4 w-4" />,
      duration: 180,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'وقت كافي للتحضير'
    },
    {
      id: '6hours',
      label: 'خلال 6 ساعات',
      icon: <Calendar className="h-4 w-4" />,
      duration: 360,
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'نشر مجدول'
    },
    {
      id: 'tomorrow_9am',
      label: 'غداً 9 صباحاً',
      icon: <Sparkles className="h-4 w-4" />,
      duration: -1, // special case
      color: 'bg-pink-500 hover:bg-pink-600',
      description: 'بداية يوم عمل جديد'
    },
    {
      id: 'next_week',
      label: 'الأسبوع القادم',
      icon: <Calendar className="h-4 w-4" />,
      duration: -2, // special case
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'تخطيط طويل المدى'
    }
  ], []);

  // Initialize default values
  useEffect(() => {
    if (open) {
      const defaultDateTime = currentDateTime || getDefaultDateTime();
      setScheduledUTC(defaultDateTime);
      setSelectedQuickOption(null);
    }
  }, [open, currentDateTime]);

  const getCurrentDateTime = () => scheduledUTC || null;

  const isValidDateTime = () => {
    const dateTime = getCurrentDateTime();
    if (!dateTime) return false;
    
    const minDateTime = addMinutes(new Date(), 5);
    return !isBefore(dateTime, minDateTime);
  };

  const getTimeUntilSchedule = () => {
    const dateTime = getCurrentDateTime();
    if (!dateTime) return null;
    
    const now = new Date();
    return differenceInMinutes(dateTime, now);
  };

  const handleSchedule = () => {
    const dateTime = getCurrentDateTime();
    if (!dateTime || !isValidDateTime()) {
      toast.error('يرجى اختيار تاريخ ووقت صالح في المستقبل');
      return;
    }

    const options: ScheduleOptions = {
      dateTime,
      recurring,
      recurringType: recurring ? recurringType : undefined,
      recurringEndDate: recurring ? recurringEndDate : undefined,
      notifications,
      notificationMinutes,
    };

    onSchedule(options);
    toast.success('تم جدولة نشر المنتج بنجاح!');
    onOpenChange(false);
  };

  const handleQuickSchedule = (option: QuickOption) => {
    setSelectedQuickOption(option.id);
    let targetDate: Date;

    if (option.duration === -1) {
      // Tomorrow 9 AM
      targetDate = addDays(new Date(), 1);
      targetDate.setHours(9, 0, 0, 0);
    } else if (option.duration === -2) {
      // Next week
      targetDate = addDays(new Date(), 7);
      targetDate.setHours(12, 0, 0, 0);
    } else {
      // Regular duration
      targetDate = addMinutes(new Date(), option.duration);
    }

    setScheduledUTC(targetDate);
  };

  const handleReset = () => {
    const defaultDateTime = getDefaultDateTime();
    setScheduledUTC(defaultDateTime);
    setSelectedQuickOption(null);
    setRecurring(false);
    setNotifications(true);
    setNotificationMinutes(15);
  };

  const timeUntilSchedule = getTimeUntilSchedule();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // منع إغلاق الحوار عند النقر على منتقي التاريخ
          const target = e.target as Element;
          if (target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="pb-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
            جدولة نشر المنتج
          </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  اختر التوقيت المناسب لنشر "{productTitle}" تلقائياً
          </DialogDescription>
              </div>
            </div>
            {scheduledUTC && isValidDateTime() && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                مجدول
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-6">
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
              خيارات سريعة
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تخصيص الوقت
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إعدادات متقدمة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {quickOptions.map((option) => (
                  <Card 
                    key={option.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedQuickOption === option.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleQuickSchedule(option)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg text-white ${option.color}`}>
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {option.label}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {option.description}
                          </p>
            </div>
          </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    اختيار التاريخ والوقت
                  </CardTitle>
                  <CardDescription>
                    حدد التاريخ والوقت بدقة (توقيت الجزائر)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DateTimePicker 
                    value={scheduledUTC} 
                    onChange={setScheduledUTC}
                    className="w-full"
                    disabled={(date) => {
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                      return checkDate < today;
                    }}
                  />
                  
          {!isValidDateTime() && scheduledUTC && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                يجب أن يكون التاريخ والوقت في المستقبل (على الأقل 5 دقائق من الآن)
              </AlertDescription>
            </Alert>
          )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Repeat className="h-5 w-5 text-purple-600" />
                    النشر المتكرر
                  </CardTitle>
                  <CardDescription>
                    جدولة نشر متكررة للمحتوى
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recurring" className="text-sm font-medium">
                      تفعيل النشر المتكرر
                    </Label>
                    <Switch 
                      id="recurring"
                      checked={recurring} 
                      onCheckedChange={setRecurring}
                    />
                  </div>
                  
                  {recurring && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">نوع التكرار</Label>
                        <Select value={recurringType} onValueChange={(value: any) => setRecurringType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">يومياً</SelectItem>
                            <SelectItem value="weekly">أسبوعياً</SelectItem>
                            <SelectItem value="monthly">شهرياً</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">تاريخ انتهاء التكرار</Label>
                        <DateTimePicker 
                          value={recurringEndDate} 
                          onChange={setRecurringEndDate}
                          className="w-full"
                          disabled={(date) => {
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            return checkDate < today;
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-orange-600" />
                    الإشعارات
                  </CardTitle>
                  <CardDescription>
                    تذكيرات قبل النشر
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications" className="text-sm font-medium">
                      تفعيل الإشعارات
                    </Label>
                    <Switch 
                      id="notifications"
                      checked={notifications} 
                      onCheckedChange={setNotifications}
                    />
                  </div>
                  
                  {notifications && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-medium">التذكير قبل (بالدقائق)</Label>
                      <Select value={notificationMinutes.toString()} onValueChange={(value) => setNotificationMinutes(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 دقائق</SelectItem>
                          <SelectItem value="15">15 دقيقة</SelectItem>
                          <SelectItem value="30">30 دقيقة</SelectItem>
                          <SelectItem value="60">ساعة واحدة</SelectItem>
                          <SelectItem value="120">ساعتان</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* معاينة الجدولة */}
          {scheduledUTC && isValidDateTime() && (
            <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-blue-900">معاينة الجدولة</h3>
                  </div>
                  {timeUntilSchedule && timeUntilSchedule > 0 && (
                    <Badge variant="outline" className="bg-white/50">
                      <Timer className="h-3 w-3 mr-1" />
                      خلال {timeUntilSchedule} دقيقة
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-blue-700">التاريخ والوقت</Label>
                    <div className="text-lg font-bold text-blue-900">
                      {format(scheduledUTC, 'EEEE، dd MMMM yyyy', { locale: ar })}
                    </div>
                    <div className="text-sm text-blue-700">
                      الساعة {format(scheduledUTC, 'HH:mm')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-blue-700">الإعدادات</Label>
                    <div className="space-y-1">
                      {recurring && (
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <Repeat className="h-3 w-3" />
                          تكرار {recurringType === 'daily' ? 'يومي' : recurringType === 'weekly' ? 'أسبوعي' : 'شهري'}
                        </div>
                      )}
                      {notifications && (
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <Bell className="h-3 w-3" />
                          تذكير قبل {notificationMinutes} دقيقة
                        </div>
                      )}
                </div>
              </div>
            </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 pt-6 border-t">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            إعادة تعيين
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={!isValidDateTime()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            جدولة النشر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePublishDialog;
