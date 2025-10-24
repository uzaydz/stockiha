import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ValidationResult {
  clients: any[];
  totalClients: number;
  validClients: number;
  warningClients: number;
  errorClients: number;
  totalAmountHT: number;
  totalTVA: number;
}

interface Etat104ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: 'excel' | 'pdf') => void;
  validationResult: ValidationResult | null;
}

const Etat104ExportDialog = ({
  open,
  onOpenChange,
  onExport,
  validationResult,
}: Etat104ExportDialogProps) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [includeErrors, setIncludeErrors] = useState(false);

  const hasErrors = validationResult && validationResult.errorClients > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير كشف 104
          </DialogTitle>
          <DialogDescription>
            اختر صيغة التصدير المناسبة لتقديم الكشف
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* تحذير إذا كان هناك أخطاء */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                يوجد {validationResult.errorClients} عميل بأخطاء. يُنصح بتصحيح الأخطاء قبل التصدير.
              </AlertDescription>
            </Alert>
          )}

          {/* اختيار صيغة التصدير */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">صيغة التصدير</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as 'excel' | 'pdf')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">ملف Excel (.xlsx)</p>
                      <p className="text-sm text-muted-foreground">
                        الصيغة المطلوبة من المديرية العامة للضرائب
                      </p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">ملف PDF</p>
                      <p className="text-sm text-muted-foreground">
                        للطباعة والأرشفة
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* خيارات إضافية */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">خيارات إضافية</Label>
            <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4">
              <input
                type="checkbox"
                id="includeErrors"
                checked={includeErrors}
                onChange={(e) => setIncludeErrors(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="includeErrors" className="flex-1 cursor-pointer">
                <p className="font-medium">تضمين العملاء بأخطاء</p>
                <p className="text-sm text-muted-foreground">
                  سيتم تمييزهم في الملف المصدر
                </p>
              </Label>
            </div>
          </div>

          {/* ملخص */}
          {validationResult && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold">ملخص الكشف:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">إجمالي العملاء:</span>
                  <span className="font-medium mr-2">{validationResult.totalClients}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">عملاء صالحون:</span>
                  <span className="font-medium mr-2 text-green-600">
                    {validationResult.validClients}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">المبلغ HT:</span>
                  <span className="font-medium mr-2">
                    {validationResult.totalAmountHT.toLocaleString('ar-DZ')} دج
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">TVA:</span>
                  <span className="font-medium mr-2">
                    {validationResult.totalTVA.toLocaleString('ar-DZ')} دج
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={() => onExport(exportFormat)} className="gap-2">
            <Download className="h-4 w-4" />
            تصدير {exportFormat === 'excel' ? 'Excel' : 'PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Etat104ExportDialog;
