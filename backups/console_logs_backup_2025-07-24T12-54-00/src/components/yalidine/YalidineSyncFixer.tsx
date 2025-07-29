import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase-client';
import { checkYalidineFees, fixYalidineFeeTable } from '@/api/yalidine/fees-sync-fix';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface SyncFixerProps {
  onComplete?: () => void;
}

export default function YalidineSyncFixer({ onComplete }: SyncFixerProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [fixing, setFixing] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'diagnosing' | 'fixing' | 'success' | 'error'>('idle');
  const [diagnosticResult, setDiagnosticResult] = useState<{
    count: number;
    hasProblem: boolean;
    fixes: string[];
  } | null>(null);
  const [fixResult, setFixResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // تشغيل التشخيص تلقائياً عند تحميل المكون
  useEffect(() => {
    if (organization?.id) {
      runDiagnostics();
    }
  }, [organization?.id]);

  // وظيفة لتشغيل تشخيص المشكلة
  async function runDiagnostics() {
    if (!organization?.id) return;
    
    try {
      setDiagnosing(true);
      setStatus('diagnosing');
      
      // استدعاء وظيفة التشخيص
      const result = await checkYalidineFees(organization.id);
      setDiagnosticResult(result);
      
      // التحقق من وجود مشكلة في SQL تحتاج إلى إصلاح
      if (result.hasProblem || result.fixes.length > 0) {
        // تحقق من وجود وظائف الإصلاح في قاعدة البيانات
        const { data: hasFunctions, error: functionsError } = await supabase.rpc(
          'check_function_exists',
          { function_name: 'table_exists' }
        );
        
        if (functionsError || !hasFunctions) {
          // إنشاء وظائف الإصلاح في قاعدة البيانات
          const { error: sqlError } = await supabase.rpc(
            'execute_sql_file',
            { sql_file: 'yalidine/db-functions.sql' }
          );
          
          if (sqlError) {
            setFixResult({
              success: false,
              message: 'فشل في إنشاء وظائف قاعدة البيانات اللازمة للإصلاح'
            });
          }
        }
      }
      
      // تعيين الحالة بناءً على نتيجة التشخيص
      setStatus(result.hasProblem ? 'error' : 'success');
    } catch (error) {
      setStatus('error');
      setFixResult({
        success: false,
        message: 'حدث خطأ أثناء التشخيص: ' + (error as Error).message
      });
    } finally {
      setDiagnosing(false);
    }
  }

  // وظيفة لإصلاح المشكلة
  async function applyFix() {
    if (!organization?.id) return;
    
    try {
      setFixing(true);
      setStatus('fixing');
      
      // إصلاح هيكل جدول الرسوم
      const fixed = await fixYalidineFeeTable();
      
      if (fixed) {
        // إصلاح قيود المفتاح الفريد
        const { data: constraintsFixed, error: constraintError } = await supabase.rpc(
          'fix_yalidine_fees_constraints'
        );
        
        if (constraintError) {
          setFixResult({
            success: false,
            message: 'فشل في إصلاح قيود المفتاح الفريد: ' + constraintError.message
          });
          setStatus('error');
          return;
        }
        
        // تنظيف البيانات المكررة
        const { data: cleanupCount, error: cleanupError } = await supabase.rpc(
          'cleanup_duplicate_yalidine_fees'
        );
        
        if (cleanupError) {
          // يمكن المتابعة حتى مع وجود خطأ في التنظيف
        }
        
        setFixResult({
          success: true,
          message: `تم إصلاح هيكل الجدول بنجاح. تم حذف ${cleanupCount || 0} سجل مكرر.`
        });
        
        // تحديث نتيجة التشخيص بعد الإصلاح
        const updatedResult = await checkYalidineFees(organization.id);
        setDiagnosticResult(updatedResult);
        
        setStatus('success');
        
        // استدعاء وظيفة الإكمال إذا تم توفيرها
        if (onComplete) {
          onComplete();
        }
      } else {
        setFixResult({
          success: false,
          message: 'فشل في إصلاح هيكل جدول الرسوم'
        });
        setStatus('error');
      }
    } catch (error) {
      setFixResult({
        success: false,
        message: 'حدث خطأ أثناء تطبيق الإصلاح: ' + (error as Error).message
      });
      setStatus('error');
    } finally {
      setFixing(false);
    }
  }

  // رسالة الحالة
  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'جاهز للتشخيص';
      case 'diagnosing':
        return 'جاري تشخيص مشكلة مزامنة الرسوم...';
      case 'fixing':
        return 'جاري إصلاح مشكلة مزامنة الرسوم...';
      case 'success':
        return diagnosticResult?.hasProblem 
          ? 'تم تشخيص المشكلة، جاهز للإصلاح' 
          : 'لا توجد مشاكل في مزامنة الرسوم';
      case 'error':
        return 'حدثت مشكلة أثناء العملية';
      default:
        return '';
    }
  };

  return (
    <Card className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-bold mb-3">أداة إصلاح مزامنة رسوم ياليدين</h2>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={status === 'error' ? 'destructive' : status === 'success' ? 'outline' : 'default'}
            className={status === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
          >
            {getStatusMessage()}
          </Badge>
          {(diagnosing || fixing) && <Spinner size="sm" />}
        </div>
        
        {status !== 'idle' && (
          <Progress 
            value={status === 'diagnosing' ? 50 : status === 'fixing' ? 75 : status === 'success' ? 100 : 30} 
            className="h-2 mb-2"
          />
        )}
      </div>
      
      {/* نتيجة التشخيص */}
      {diagnosticResult && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">نتيجة التشخيص:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              عدد سجلات الرسوم في قاعدة البيانات: {diagnosticResult.count}
              {diagnosticResult.count === 0 && (
                <span className="text-red-500 font-bold"> (مشكلة)</span>
              )}
            </li>
            {diagnosticResult.fixes.map((fix, index) => (
              <li key={index} className="text-amber-600">
                {fix}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* نتيجة الإصلاح */}
      {fixResult && (
        <Alert 
          variant={fixResult.success ? "default" : "destructive"}
          className="mb-4"
        >
          <AlertDescription className={fixResult.success ? "text-green-600" : ""}>
            {fixResult.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* أزرار الإجراءات */}
      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          onClick={runDiagnostics}
          disabled={diagnosing || fixing}
        >
          {diagnosing ? <Spinner size="sm" className="mr-2" /> : null}
          تشخيص المشكلة
        </Button>
        
        <Button
          onClick={applyFix}
          disabled={
            fixing || 
            diagnosing || 
            !diagnosticResult?.hasProblem ||
            (diagnosticResult?.hasProblem && diagnosticResult?.fixes.length === 0)
          }
        >
          {fixing ? <Spinner size="sm" className="mr-2" /> : null}
          تطبيق الإصلاح
        </Button>
      </div>
    </Card>
  );
}

// Custom spinner component since it might not exist in the UI kit
function Spinner({ size = "default", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  };
  
  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
}
