import { useState, useEffect } from 'react';
import { Employee, EmployeeActivity } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEmployeeActivities } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  Calendar, 
  Package, 
  User, 
  LogIn, 
  LogOut, 
  Info 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmployeeActivityDialogProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}

const EmployeeActivityDialog = ({
  employee,
  open,
  onClose
}: EmployeeActivityDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<EmployeeActivity[]>([]);

  useEffect(() => {
    if (open && employee) {
      loadActivities();
    }
  }, [open, employee]);

  const loadActivities = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const data = await getEmployeeActivities(employee.id, 50); // جلب آخر 50 نشاط
      setActivities(data);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل سجل النشاطات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير متوفر';
    try {
      return format(new Date(dateString), 'PPP p', { locale: ar });
    } catch (error) {
      return 'تاريخ غير صالح';
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'login':
        return 'تسجيل دخول';
      case 'logout':
        return 'تسجيل خروج';
      case 'order_created':
        return 'إنشاء طلب';
      case 'service_assigned':
        return 'تعيين خدمة';
      case 'product_updated':
        return 'تحديث منتج';
      default:
        return 'إجراء آخر';
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-orange-500" />;
      case 'order_created':
        return <ShoppingBag className="h-4 w-4 text-blue-500" />;
      case 'service_assigned':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'product_updated':
        return <Package className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEntityTypeLabel = (type: string | undefined) => {
    if (!type) return 'غير محدد';
    
    switch (type) {
      case 'order':
        return 'طلب';
      case 'product':
        return 'منتج';
      case 'service':
        return 'خدمة';
      case 'customer':
        return 'عميل';
      default:
        return 'آخر';
    }
  };

  const getEntityTypeIcon = (type: string | undefined) => {
    if (!type) return null;
    
    switch (type) {
      case 'order':
        return <ShoppingBag className="h-4 w-4 text-blue-500" />;
      case 'product':
        return <Package className="h-4 w-4 text-amber-500" />;
      case 'service':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'customer':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderActivityList = () => {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ));
    }

    if (activities.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            لا توجد سجلات نشاط لهذا الموظف
          </TableCell>
        </TableRow>
      );
    }

    return activities.map((activity) => (
      <TableRow key={activity.id}>
        <TableCell>{formatDate(activity.created_at)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {getActionTypeIcon(activity.action_type)}
            <span>{getActionTypeLabel(activity.action_type)}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm">{activity.action_details}</span>
        </TableCell>
        <TableCell>
          {activity.related_entity && (
            <Badge variant="outline" className="gap-1">
              {getEntityTypeIcon(activity.related_entity)}
              <span>{getEntityTypeLabel(activity.related_entity)}</span>
              {activity.related_entity_id && (
                <span className="text-xs opacity-75">#{activity.related_entity_id.slice(0, 5)}</span>
              )}
            </Badge>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>سجل النشاطات</DialogTitle>
          <DialogDescription>
            عرض سجل نشاطات الموظف {employee.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>نوع النشاط</TableHead>
                  <TableHead>تفاصيل النشاط</TableHead>
                  <TableHead>الكيان المرتبط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderActivityList()}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeActivityDialog;
