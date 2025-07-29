import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerTestProps {
  onBarcodeSearch?: (barcode: string) => void;
  isScannerLoading?: boolean;
}

const BarcodeScannerTest: React.FC<BarcodeScannerTestProps> = ({
  onBarcodeSearch,
  isScannerLoading = false
}) => {
  const [testBarcode, setTestBarcode] = useState('');
  const [lastTestResult, setLastTestResult] = useState<string>('');

  // باركودات تجريبية للاختبار
  const testBarcodes = [
    '1234567890123',
    '9781234567890',
    '0123456789012',
    '6281234567890',
    'TEST123456789'
  ];

  const handleTestScan = (barcode: string) => {
    if (!onBarcodeSearch) {
      toast.error('❌ دالة السكانر غير متوفرة');
      setLastTestResult(`❌ دالة السكانر غير متوفرة`);
      return;
    }

    console.log('🧪 [BarcodeScannerTest] اختبار باركود:', barcode);
    setLastTestResult(`🔍 جاري اختبار: ${barcode}`);
    
    try {
      onBarcodeSearch(barcode);
      toast.info(`🧪 تم إرسال باركود الاختبار: ${barcode}`);
      setLastTestResult(`✅ تم إرسال: ${barcode}`);
    } catch (error) {
      console.error('💥 [BarcodeScannerTest] خطأ في الاختبار:', error);
      setLastTestResult(`❌ خطأ في الإرسال: ${barcode}`);
    }
  };

  const handleCustomTest = () => {
    if (testBarcode.trim()) {
      handleTestScan(testBarcode.trim());
      setTestBarcode('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <TestTube className="h-5 w-5 text-blue-500" />
          أداة تشخيص السكانر
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          اختبر وظيفة السكانر باستخدام باركودات تجريبية
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* حالة السكانر */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">حالة السكانر:</span>
          <Badge variant={isScannerLoading ? "default" : onBarcodeSearch ? "success" : "destructive"}>
            {isScannerLoading ? (
              <span className="flex items-center gap-1">
                <Scan className="h-3 w-3 animate-pulse" />
                جاري البحث...
              </span>
            ) : onBarcodeSearch ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                جاهز
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                غير متوفر
              </span>
            )}
          </Badge>
        </div>

        {/* اختبار مخصص */}
        <div className="space-y-2">
          <label className="text-sm font-medium">اختبار باركود مخصص:</label>
          <div className="flex gap-2">
            <Input
              placeholder="أدخل باركود للاختبار..."
              value={testBarcode}
              onChange={(e) => setTestBarcode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomTest()}
              disabled={isScannerLoading}
            />
            <Button 
              onClick={handleCustomTest}
              disabled={!testBarcode.trim() || isScannerLoading || !onBarcodeSearch}
              size="sm"
            >
              <Scan className="h-4 w-4 mr-1" />
              اختبار
            </Button>
          </div>
        </div>

        {/* باركودات تجريبية */}
        <div className="space-y-2">
          <label className="text-sm font-medium">باركودات تجريبية:</label>
          <div className="grid grid-cols-2 gap-2">
            {testBarcodes.map((barcode, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleTestScan(barcode)}
                disabled={isScannerLoading || !onBarcodeSearch}
                className="justify-start font-mono text-xs"
              >
                {barcode}
              </Button>
            ))}
          </div>
        </div>

        {/* نتيجة آخر اختبار */}
        {lastTestResult && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm">
              <strong>آخر اختبار:</strong> {lastTestResult}
            </div>
          </div>
        )}

        {/* تعليمات الاستخدام */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <strong>كيفية الاستخدام:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>اختر باركود تجريبي أو أدخل باركود مخصص</li>
            <li>راقب الإشعارات في أعلى الشاشة</li>
            <li>تحقق من وحدة التحكم (Console) للتفاصيل التقنية</li>
            <li>إذا وُجد المنتج، سيتم إضافته للسلة تلقائياً</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodeScannerTest; 