import {
  Wrench,
  PlusCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ServicesHeaderProps {
  serviceCount: number;
  totalCount: number;
  onAddService: () => void;
}

const ServicesHeader = ({ 
  serviceCount, 
  totalCount, 
  onAddService 
}: ServicesHeaderProps) => {
  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
      <div className="flex items-center space-x-4">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة الخدمات</h1>
          <p className="text-muted-foreground">
            {serviceCount} خدمة من أصل {totalCount}
            {serviceCount !== totalCount && ' (تم تطبيق الفلتر)'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline"
          size="sm"
        >
          <Calendar className="mr-2 h-4 w-4" />
          جدول المواعيد
        </Button>
        <Button 
          variant="outline"
          size="sm"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          إحصائيات الخدمات
        </Button>
        <Button 
          onClick={onAddService}
          size="sm"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          إضافة خدمة
        </Button>
      </div>

      <div className="hidden md:block">
        <Card className="h-full">
          <CardContent className="flex items-center justify-center h-full p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-xs text-muted-foreground">الخدمات</div>
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">المواعيد اليوم</div>
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">قيد الانتظار</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServicesHeader;
