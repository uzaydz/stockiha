import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, MapPin, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StopDesk {
  center_id: number;
  name: string;
  address: string;
  commune_name: string;
  wilaya_name: string;
  wilaya_id: number;
  commune_id: number;
}

interface StopDeskSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (stopdeskId: number, selectedCenter: any) => void;
  wilayaId?: string | number;
  communeId?: string | number;
  organizationId: string;
}

export function StopDeskSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  wilayaId,
  communeId,
  organizationId
}: StopDeskSelectionDialogProps) {
  const [stopDesks, setStopDesks] = useState<StopDesk[]>([]);
  const [selectedStopDeskId, setSelectedStopDeskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromWilaya, setIsFromWilaya] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStopDesks();
    }
  }, [open, wilayaId, communeId]);

  const fetchStopDesks = async () => {
    setLoading(true);
    setError(null);
    setIsFromWilaya(false);
    
    try {
      // التحقق من أن wilayaId موجود
      if (!wilayaId) {
        setError('معلومات الولاية غير متوفرة في الطلبية. يرجى التحقق من بيانات الطلبية.');
        setLoading(false);
        return;
      }
      
      console.log('StopDeskDialog: Fetching centers for wilaya:', wilayaId, 'commune:', communeId);
      
      // استيراد الدالة من shippingOrderIntegration
      const { getYalidineStopDesks } = await import('@/utils/shippingOrderIntegration');
      
      const result = await getYalidineStopDesks(organizationId, wilayaId, communeId);
      
      console.log('StopDeskDialog: Received result:', result);
      
      if (result.centers.length === 0) {
        setError(`لا توجد مكاتب متاحة في هذه الولاية (رمز: ${wilayaId}). يرجى اختيار التوصيل للمنزل بدلاً من ذلك.`);
      } else {
        setStopDesks(result.centers);
        setIsFromWilaya(result.isFromWilaya);
      }
    } catch (err: any) {
      console.error('Error fetching stop desks:', err);
      setError(err.message || 'فشل في تحميل قائمة المكاتب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedStopDeskId && selectedStopDesk) {
      onConfirm(selectedStopDeskId, selectedStopDesk);
      onOpenChange(false);
    }
  };

  const selectedStopDesk = stopDesks.find(sd => sd.center_id === selectedStopDeskId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            اختيار مكتب التوصيل
          </DialogTitle>
          <DialogDescription className="text-sm">
            الطلبية مخصصة للتوصيل للمكتب. يرجى اختيار المكتب المناسب من نفس البلدية.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="mr-3 text-sm text-muted-foreground">جاري تحميل المكاتب...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : stopDesks.length > 0 ? (
            <>
              {/* تحذير إذا كانت المكاتب من بلديات أخرى */}
              {isFromWilaya && (
                <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    <div className="space-y-1">
                      <div className="font-semibold">⚠️ لا توجد مكاتب في بلدية الطلب</div>
                      <div className="text-sm">
                        المكاتب المعروضة من بلديات أخرى في نفس الولاية. عند اختيار مكتب، سيتم تحديث بيانات التوصيل لتطابق البلدية التي ينتمي لها المكتب.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  المكتب <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedStopDeskId?.toString() || ""}
                  onValueChange={(value) => setSelectedStopDeskId(parseInt(value))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر المكتب" />
                  </SelectTrigger>
                  <SelectContent>
                    {stopDesks.map((desk) => (
                      <SelectItem 
                        key={desk.center_id} 
                        value={desk.center_id.toString()}
                        className="py-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{desk.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {desk.commune_name}, {desk.wilaya_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStopDesk && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium">{selectedStopDesk.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedStopDesk.address}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedStopDesk.commune_name}, {selectedStopDesk.wilaya_name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                لا توجد مكاتب متاحة في هذه المنطقة.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedStopDeskId || loading}
          >
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

