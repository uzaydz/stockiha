import { useState, useRef } from 'react';
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
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Etat104ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  isValidating: boolean;
}

const Etat104ImportDialog = ({
  open,
  onOpenChange,
  onImport,
  isValidating,
}: Etat104ImportDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('يرجى اختيار ملف Excel صالح (.xls أو .xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = () => {
    if (selectedFile) {
      onImport(selectedFile);
    }
  };

  const downloadTemplate = () => {
    // إنشاء ملف Excel نموذجي
    const csvContent = `الاسم التجاري,رقم التعريف الجبائي (NIF),رقم السجل التجاري (RC),رقم مادة جدول الضرائب,العنوان,المبلغ خارج الرسوم (HT),ضريبة القيمة المضافة (TVA)
شركة مثال 1,123456789012345,12/34-5678901,001,الجزائر العاصمة,100000.00,19000.00
شركة مثال 2,987654321098765,98/76-5432109,002,وهران,50000.00,9500.00`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'نموذج_كشف_104.csv';
    link.click();
    toast.success('تم تنزيل النموذج بنجاح');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استيراد بيانات العملاء
          </DialogTitle>
          <DialogDescription>
            قم برفع ملف Excel يحتوي على بيانات عملائك للتحقق من صحتها
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* تنزيل النموذج */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>هل تحتاج إلى نموذج؟ قم بتنزيل ملف Excel النموذجي</span>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                تنزيل النموذج
              </Button>
            </AlertDescription>
          </Alert>

          {/* منطقة السحب والإفلات */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  إزالة الملف
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="font-medium">اسحب وأفلت ملف Excel هنا</p>
                <p className="text-sm text-muted-foreground">أو انقر للاختيار من جهازك</p>
                <p className="text-xs text-muted-foreground">
                  الصيغ المدعومة: .xls, .xlsx (حتى 10 ميجابايت)
                </p>
              </div>
            )}
          </div>

          {/* المعلومات المطلوبة */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">يجب أن يحتوي الملف على الأعمدة التالية:</p>
              <ul className="text-sm space-y-1 mr-4">
                <li>• الاسم التجاري (إلزامي)</li>
                <li>• رقم التعريف الجبائي NIF (إلزامي)</li>
                <li>• رقم السجل التجاري RC (إلزامي)</li>
                <li>• رقم مادة جدول الضرائب (اختياري)</li>
                <li>• العنوان الكامل (إلزامي)</li>
                <li>• المبلغ خارج الرسوم HT (إلزامي)</li>
                <li>• ضريبة القيمة المضافة TVA (إلزامي)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isValidating}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isValidating}
            className="gap-2"
          >
            {isValidating ? (
              <>
                <span className="animate-spin">⏳</span>
                جاري التحقق...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                استيراد والتحقق
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Etat104ImportDialog;
