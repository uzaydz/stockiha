import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { migrateProductImages } from '@/lib/api/productHelpers';

export default function DatabaseMigrationTool() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ 
    success?: boolean, 
    message?: string, 
    details?: { [key: string]: any } 
  }>({});

  // وظيفة لترحيل الصور الإضافية للمنتجات
  const handleMigrateProductImages = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setResults({});
    
    try {
      const migrationResult = await migrateProductImages();
      
      if (migrationResult.success) {
        setResults({
          success: true,
          message: 'تم ترحيل الصور الإضافية بنجاح',
          details: {
            productsProcessed: migrationResult.migratedProducts,
            totalImagesProcessed: migrationResult.totalImages
          }
        });
        
        toast.success(`تم ترحيل الصور الإضافية بنجاح لعدد ${migrationResult.migratedProducts} منتج`);
      } else {
        setResults({
          success: false,
          message: 'حدث خطأ أثناء ترحيل الصور الإضافية',
          details: { error: 'فشل الترحيل' }
        });
        
        toast.error('حدث خطأ أثناء ترحيل الصور الإضافية');
      }
    } catch (error) {
      console.error('خطأ أثناء ترحيل الصور الإضافية:', error);
      
      setResults({
        success: false,
        message: 'حدث خطأ غير متوقع أثناء ترحيل الصور الإضافية',
        details: { error: String(error) }
      });
      
      toast.error('حدث خطأ غير متوقع أثناء ترحيل الصور الإضافية');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">أدوات ترحيل قاعدة البيانات</h2>
        <p className="text-muted-foreground">
          استخدم هذه الأدوات لإجراء عمليات ترحيل ومزامنة قاعدة البيانات
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>ترحيل صور المنتجات</CardTitle>
            <CardDescription>
              نقل الصور الإضافية من حقل images إلى جدول product_images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              تقوم هذه الأداة بنقل الصور الإضافية من مصفوفة images في جدول المنتجات إلى جدول product_images المنفصل.
              هذا يضمن أن تكون جميع صور المنتجات متاحة في واجهة المستخدم.
            </p>
            
            {results.success !== undefined && (
              <div className={`mt-4 p-3 rounded-md ${results.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-semibold">{results.message}</p>
                {results.details && (
                  <ul className="mt-2 text-sm">
                    {Object.entries(results.details).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleMigrateProductImages} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : 'بدء الترحيل'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 