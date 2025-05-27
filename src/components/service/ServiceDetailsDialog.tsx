import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Edit } from 'lucide-react';
import type { Service } from '@/lib/api/services';
import { formatPrice } from '@/lib/utils';

interface ServiceDetailsDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (service: Service) => void;
  onBook: (service: Service) => void;
}

const ServiceDetailsDialog = ({
  service,
  open,
  onOpenChange,
  onEdit,
  onBook,
}: ServiceDetailsDialogProps) => {
  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق المدة
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} ساعة`;
      } else {
        return `${hours} ساعة و ${remainingMinutes} دقيقة`;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{service.name}</DialogTitle>
          <DialogDescription className="text-center">
            معلومات وتفاصيل الخدمة
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* السعر والمدة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="text-sm font-medium text-muted-foreground mb-1">السعر</div>
              <div className="text-lg font-semibold">
                {service.is_price_dynamic ? 'سعر مفتوح' : formatPrice(service.price)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">المدة</div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{service.estimated_time}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* الوصف */}
          <div>
            <div className="text-sm font-medium mb-2">الوصف</div>
            <div className="text-sm text-muted-foreground">
              {service.description || 'لا يوجد وصف متاح لهذه الخدمة.'}
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">الفئة</div>
              <div>
                {service.category ? (
                  <Badge variant="outline">{service.category}</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">بدون فئة</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">الحالة</div>
              <Badge variant={service.is_available ? "default" : "secondary"}>
                {service.is_available ? "متاحة" : "غير متاحة"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">تاريخ الإضافة</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(service.created_at)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">آخر تحديث</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(service.updated_at)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2 mt-4">
          <Button variant="outline" onClick={() => onEdit(service)}>
            <Edit className="ml-2 h-4 w-4" />
            تعديل الخدمة
          </Button>
          <Button onClick={() => onBook(service)}>
            <Calendar className="ml-2 h-4 w-4" />
            حجز موعد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailsDialog;
