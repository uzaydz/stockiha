import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryAdvanced } from '@/hooks/useInventoryAdvanced';
import { useInventoryVariants } from '@/hooks/useInventoryVariants';
import { 
  type BulkUpdateItem, 
  type BulkUpdateResult,
  type InventoryProduct 
} from '@/lib/api/inventory-advanced-api';
import {
  Package,
  Edit3,
  Save,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  Calculator,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BulkInventoryManagerProps {
  selectedProducts?: string[];
  onClose?: () => void;
  showTrigger?: boolean;
}

interface BulkUpdateRow {
  id: string;
  product_id: string;
  product_name: string;
  current_quantity: number;
  new_quantity: number;
  adjustment: number;
  operation_type: 'set' | 'add' | 'subtract';
  reason: string;
  notes: string;
  isValid: boolean;
  error?: string;
}

const BulkInventoryManager: React.FC<BulkInventoryManagerProps> = ({
  selectedProducts = [],
  onClose,
  showTrigger = true
}) => {
  const { bulkUpdate: bulkUpdateAdvanced } = useInventoryAdvanced();
  const { bulkUpdateVariants } = useInventoryVariants();
  
  // حالة المكون
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'configure' | 'preview' | 'process' | 'results'>('select');
  
  // بيانات التحديث
  const [updateRows, setUpdateRows] = useState<BulkUpdateRow[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    operation_type: 'set' as 'set' | 'add' | 'subtract',
    reason: '',
    apply_to_all: false,
    increment_value: 0,
    percentage_change: 0
  });
  
  // نتائج العملية
  const [updateResults, setUpdateResults] = useState<BulkUpdateResult | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  
  // تحميل بيانات المنتجات المحددة
  useEffect(() => {
    if (selectedProducts.length > 0 && isOpen) {
      loadSelectedProducts();
    }
  }, [selectedProducts, isOpen]);

  // تحميل بيانات المنتجات
  const loadSelectedProducts = useCallback(async () => {
    try {
      // هنا يجب جلب بيانات المنتجات من API
      // مؤقتاً سأستخدم بيانات وهمية
      const mockProducts = selectedProducts.map((id, index) => ({
        id: `${id}-${index}`,
        product_id: id,
        product_name: `منتج ${index + 1}`,
        current_quantity: Math.floor(Math.random() * 100) + 10,
        new_quantity: 0,
        adjustment: 0,
        operation_type: 'set' as const,
        reason: '',
        notes: '',
        isValid: true
      }));
      
      setUpdateRows(mockProducts);
      setCurrentStep('configure');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل بيانات المنتجات');
      console.error(error);
    }
  }, [selectedProducts]);

  // تحديث صف واحد
  const updateRow = useCallback((rowId: string, updates: Partial<BulkUpdateRow>) => {
    setUpdateRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, ...updates };
        
        // حساب القيمة الجديدة والتعديل
        if (updates.operation_type || updates.new_quantity !== undefined || updates.adjustment !== undefined) {
          const opType = updates.operation_type || row.operation_type;
          
          if (opType === 'set' && updates.new_quantity !== undefined) {
            updatedRow.adjustment = updates.new_quantity - row.current_quantity;
          } else if (opType === 'add' && updates.adjustment !== undefined) {
            updatedRow.new_quantity = row.current_quantity + updates.adjustment;
          } else if (opType === 'subtract' && updates.adjustment !== undefined) {
            updatedRow.new_quantity = row.current_quantity - Math.abs(updates.adjustment);
          }
        }
        
        // التحقق من صحة البيانات
        updatedRow.isValid = updatedRow.new_quantity >= 0 && updatedRow.reason.trim() !== '';
        if (!updatedRow.isValid) {
          updatedRow.error = updatedRow.new_quantity < 0 ? 'الكمية لا يمكن أن تكون سالبة' : 'السبب مطلوب';
        } else {
          delete updatedRow.error;
        }
        
        return updatedRow;
      }
      return row;
    }));
  }, []);

  // تطبيق إعدادات عامة
  const applyGlobalSettings = useCallback(() => {
    if (!globalSettings.apply_to_all) return;
    
    setUpdateRows(prev => prev.map(row => {
      const updates: Partial<BulkUpdateRow> = {
        operation_type: globalSettings.operation_type,
        reason: globalSettings.reason || row.reason
      };
      
      if (globalSettings.operation_type === 'set') {
        updates.new_quantity = globalSettings.increment_value;
      } else if (globalSettings.operation_type === 'add') {
        updates.adjustment = globalSettings.increment_value;
        updates.new_quantity = row.current_quantity + globalSettings.increment_value;
      } else if (globalSettings.operation_type === 'subtract') {
        updates.adjustment = globalSettings.increment_value;
        updates.new_quantity = row.current_quantity - globalSettings.increment_value;
      }
      
      // تطبيق التغيير بالنسبة المئوية
      if (globalSettings.percentage_change !== 0) {
        const percentageAdjustment = Math.round(row.current_quantity * (globalSettings.percentage_change / 100));
        updates.new_quantity = row.current_quantity + percentageAdjustment;
        updates.adjustment = percentageAdjustment;
      }
      
      return { ...row, ...updates };
    }));
  }, [globalSettings]);

  // معاينة التغييرات
  const previewChanges = useCallback(() => {
    const validRows = updateRows.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast.error('لا توجد تغييرات صالحة للمعاينة');
      return;
    }
    
    setCurrentStep('preview');
  }, [updateRows]);

  // تنفيذ التحديث المجمع
  const executeBulkUpdate = useCallback(async () => {
    try {
      setIsProcessing(true);
      setCurrentStep('process');
      setUpdateProgress(0);
      
      const validRows = updateRows.filter(row => row.isValid);
      const updates: BulkUpdateItem[] = validRows.map(row => ({
        product_id: row.product_id,
        new_quantity: row.new_quantity,
        reason: row.reason,
        notes: row.notes
      }));
      
      // محاكاة التقدم
      const progressInterval = setInterval(() => {
        setUpdateProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const result = await bulkUpdateAdvanced(updates);
      
      clearInterval(progressInterval);
      setUpdateProgress(100);
      
      setUpdateResults(result);
      setCurrentStep('results');
      
      if (result.success) {
        toast.success(`تم تحديث ${result.updated_count} منتج بنجاح`);
      } else {
        toast.error('فشل في بعض التحديثات');
      }
      
    } catch (error: any) {
      setUpdateProgress(0);
      setCurrentStep('configure');
      toast.error(error.message || 'حدث خطأ أثناء التحديث المجمع');
    } finally {
      setIsProcessing(false);
    }
  }, [updateRows, bulkUpdateAdvanced]);

  // تصدير القالب
  const exportTemplate = useCallback(() => {
    const headers = ['معرف المنتج', 'اسم المنتج', 'الكمية الحالية', 'الكمية الجديدة', 'نوع العملية', 'السبب', 'ملاحظات'];
    const rows = updateRows.map(row => [
      row.product_id,
      row.product_name,
      row.current_quantity,
      row.new_quantity,
      row.operation_type,
      row.reason,
      row.notes
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-inventory-update-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير القالب بنجاح');
  }, [updateRows]);

  // إعادة تعيين
  const resetForm = useCallback(() => {
    setUpdateRows([]);
    setGlobalSettings({
      operation_type: 'set',
      reason: '',
      apply_to_all: false,
      increment_value: 0,
      percentage_change: 0
    });
    setUpdateResults(null);
    setUpdateProgress(0);
    setCurrentStep('select');
  }, []);

  // مكون اختيار المنتجات
  const SelectStep = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">اختر المنتجات للتحديث المجمع</h3>
        <p className="text-muted-foreground mb-4">
          تم تحديد {selectedProducts.length} منتج
        </p>
        {selectedProducts.length > 0 && (
          <Button onClick={loadSelectedProducts}>
            المتابعة مع المنتجات المحددة
          </Button>
        )}
      </div>
    </div>
  );

  // مكون التكوين
  const ConfigureStep = () => (
    <div className="space-y-6">
      {/* الإعدادات العامة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            الإعدادات العامة
          </CardTitle>
          <CardDescription>
            طبق إعدادات موحدة على جميع المنتجات المحددة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="apply-to-all"
              checked={globalSettings.apply_to_all}
              onCheckedChange={(checked) => 
                setGlobalSettings(prev => ({ ...prev, apply_to_all: checked as boolean }))
              }
            />
            <Label htmlFor="apply-to-all">تطبيق على جميع المنتجات</Label>
          </div>
          
          {globalSettings.apply_to_all && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>نوع العملية</Label>
                <Select
                  value={globalSettings.operation_type}
                  onValueChange={(value) => 
                    setGlobalSettings(prev => ({ ...prev, operation_type: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">تعيين قيمة محددة</SelectItem>
                    <SelectItem value="add">إضافة</SelectItem>
                    <SelectItem value="subtract">طرح</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  {globalSettings.operation_type === 'set' ? 'القيمة الجديدة' : 'قيمة التعديل'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={globalSettings.increment_value}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ ...prev, increment_value: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label>تغيير بالنسبة المئوية (%)</Label>
                <Input
                  type="number"
                  value={globalSettings.percentage_change}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ ...prev, percentage_change: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              
              <div className="space-y-2 md:col-span-3">
                <Label>السبب (مطلوب)</Label>
                <Input
                  value={globalSettings.reason}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="أدخل سبب التحديث..."
                />
              </div>
            </div>
          )}
          
          {globalSettings.apply_to_all && (
            <Button onClick={applyGlobalSettings} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-1" />
              تطبيق الإعدادات
            </Button>
          )}
        </CardContent>
      </Card>

      {/* جدول التحديثات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              تحديث المنتجات ({updateRows.length})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTemplate}>
                <Download className="w-4 h-4 mr-1" />
                تصدير قالب
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {updateRows.map((row) => (
                <Card key={row.id} className={cn(
                  "p-4",
                  !row.isValid && "border-red-200 bg-red-50"
                )}>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">{row.product_name}</Label>
                      <div className="text-sm font-medium">{row.product_id}</div>
                      <div className="text-xs text-muted-foreground">
                        الحالي: {row.current_quantity}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">نوع العملية</Label>
                      <Select
                        value={row.operation_type}
                        onValueChange={(value) => updateRow(row.id, { operation_type: value as any })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set">تعيين</SelectItem>
                          <SelectItem value="add">إضافة</SelectItem>
                          <SelectItem value="subtract">طرح</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {row.operation_type === 'set' ? 'الكمية الجديدة' : 'قيمة التعديل'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8"
                        value={row.operation_type === 'set' ? row.new_quantity : row.adjustment}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (row.operation_type === 'set') {
                            updateRow(row.id, { new_quantity: value });
                          } else {
                            updateRow(row.id, { adjustment: value });
                          }
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">السبب</Label>
                      <Input
                        className="h-8"
                        value={row.reason}
                        onChange={(e) => updateRow(row.id, { reason: e.target.value })}
                        placeholder="مطلوب..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">النتيجة</Label>
                      <div className={cn(
                        "text-sm font-medium p-2 rounded text-center",
                        row.new_quantity >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {row.new_quantity}
                      </div>
                    </div>
                  </div>
                  
                  {row.error && (
                    <Alert className="mt-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{row.error}</AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={previewChanges} disabled={updateRows.filter(r => r.isValid).length === 0}>
          معاينة التغييرات ({updateRows.filter(r => r.isValid).length})
        </Button>
        <Button variant="outline" onClick={resetForm}>
          إعادة تعيين
        </Button>
      </div>
    </div>
  );

  // مكون المعاينة
  const PreviewStep = () => {
    const validRows = updateRows.filter(r => r.isValid);
    const totalIncrease = validRows.reduce((sum, row) => sum + Math.max(0, row.adjustment), 0);
    const totalDecrease = validRows.reduce((sum, row) => sum + Math.min(0, row.adjustment), 0);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ملخص التغييرات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{validRows.length}</div>
                <div className="text-xs text-muted-foreground">منتجات للتحديث</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">+{totalIncrease}</div>
                <div className="text-xs text-muted-foreground">إجمالي الزيادة</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{totalDecrease}</div>
                <div className="text-xs text-muted-foreground">إجمالي النقصان</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {totalIncrease + totalDecrease}
                </div>
                <div className="text-xs text-muted-foreground">صافي التغيير</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل التغييرات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {validRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between p-3 border-b">
                    <div>
                      <div className="font-medium">{row.product_name}</div>
                      <div className="text-sm text-muted-foreground">{row.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {row.current_quantity} → {row.new_quantity}
                      </div>
                      <div className={cn(
                        "text-sm",
                        row.adjustment > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {row.adjustment > 0 ? '+' : ''}{row.adjustment}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={executeBulkUpdate} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            تنفيذ التحديث المجمع
          </Button>
          <Button variant="outline" onClick={() => setCurrentStep('configure')}>
            العودة للتعديل
          </Button>
        </div>
      </div>
    );
  };

  // مكون العملية
  const ProcessStep = () => (
    <div className="space-y-6 text-center py-8">
      <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
      <h3 className="text-lg font-medium">جاري تحديث المخزون...</h3>
      <Progress value={updateProgress} className="w-full max-w-md mx-auto" />
      <p className="text-muted-foreground">{updateProgress}% مكتمل</p>
    </div>
  );

  // مكون النتائج
  const ResultsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        {updateResults?.success ? (
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
        ) : (
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        )}
        <h3 className="text-lg font-medium mb-2">
          {updateResults?.success ? 'تم التحديث بنجاح!' : 'تم التحديث مع بعض الأخطاء'}
        </h3>
        <p className="text-muted-foreground">{updateResults?.message}</p>
      </div>

      {updateResults && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{updateResults.updated_count}</div>
            <div className="text-xs text-muted-foreground">تحديثات ناجحة</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {updateResults.failed_updates?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">تحديثات فاشلة</div>
          </Card>
        </div>
      )}

      {updateResults?.failed_updates && updateResults.failed_updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">التحديثات الفاشلة</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {updateResults.failed_updates.map((failed, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{failed.product_id}:</strong> {failed.error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => { resetForm(); onClose?.(); }}>
          إغلاق
        </Button>
        <Button variant="outline" onClick={resetForm}>
          تحديث مجمع جديد
        </Button>
      </div>
    </div>
  );

  const content = (
    <div className="space-y-6">
      {/* شريط التقدم */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {(['select', 'configure', 'preview', 'process', 'results'] as const).map((step, index) => (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2",
                currentStep === step ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                currentStep === step ? "bg-primary text-white" : "bg-muted"
              )}>
                {index + 1}
              </div>
              <span className="hidden sm:block">
                {step === 'select' && 'اختيار'}
                {step === 'configure' && 'تكوين'}
                {step === 'preview' && 'معاينة'}
                {step === 'process' && 'معالجة'}
                {step === 'results' && 'النتائج'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* المحتوى */}
      {currentStep === 'select' && <SelectStep />}
      {currentStep === 'configure' && <ConfigureStep />}
      {currentStep === 'preview' && <PreviewStep />}
      {currentStep === 'process' && <ProcessStep />}
      {currentStep === 'results' && <ResultsStep />}
    </div>
  );

  if (showTrigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            تحديث مجمع
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة المخزون المجمع</DialogTitle>
            <DialogDescription>
              قم بتحديث كميات متعددة من المنتجات في عملية واحدة
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>إدارة المخزون المجمع</SheetTitle>
          <SheetDescription>
            قم بتحديث كميات متعددة من المنتجات في عملية واحدة
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BulkInventoryManager; 