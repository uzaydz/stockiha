import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { fixYalidineFeeTable, checkYalidineFees } from './fees-sync-fix';
import { Button, Card, Text, Divider, Spinner, Badge } from '@/components/ui';

export default function YalidineSyncFixer({ organizationId }: { organizationId: string }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle');
  const [feeStats, setFeeStats] = useState<{ count: number, hasProblem: boolean, fixes: string[] } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [fixResults, setFixResults] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus('checking');
    addLog('التحقق من حالة بيانات الرسوم...');
    
    try {
      const result = await checkYalidineFees(organizationId);
      setFeeStats(result);
      addLog(`تم العثور على ${result.count} سجل في قاعدة البيانات`);
      
      if (result.hasProblem || result.fixes.length > 0) {
        addLog('⚠️ تم اكتشاف مشاكل محتملة:');
        result.fixes.forEach(fix => addLog(`- ${fix}`));
      } else {
        addLog('✅ لم يتم العثور على مشاكل ظاهرة');
      }
      
      // التحقق من المشكلة المعروفة: الحذف التلقائي للسجلات
      const { data: stats, error: statsError } = await supabase.rpc(
        'get_table_stats', 
        { table_name: 'yalidine_fees' }
      );
      
      if (statsError) {
        addLog(`❌ خطأ في الحصول على إحصائيات الجدول: ${statsError.message}`);
      } else if (stats) {
        addLog(`📊 إحصائيات الجدول: ${stats.inserts} إدخال، ${stats.deletes} حذف، ${stats.live_records} سجل نشط`);
        
        if (stats.deletes > 0 && stats.live_records === 0) {
          addLog('⚠️ تم اكتشاف مشكلة: يتم حذف السجلات تلقائيًا بعد إدخالها');
          addLog('🔍 سبب محتمل: قيود المفاتيح الأجنبية مع CASCADE DELETE');
        }
      }
      
      setStatus('idle');
    } catch (error: any) {
      addLog(`❌ خطأ في التحقق من الحالة: ${error.message}`);
      setStatus('error');
    }
  };

  const fixTableStructure = async () => {
    setStatus('fixing');
    addLog('جاري إصلاح هيكل الجدول...');
    
    try {
      const result = await fixYalidineFeeTable();
      setFixResults(prev => ({ ...prev, tableStructure: result }));
      
      if (result) {
        addLog('✅ تم إصلاح هيكل الجدول بنجاح');
      } else {
        addLog('❌ فشل في إصلاح هيكل الجدول');
      }
      
      await checkStatus();
    } catch (error: any) {
      addLog(`❌ خطأ أثناء إصلاح هيكل الجدول: ${error.message}`);
      setStatus('error');
    }
  };

  const fixForeignKeys = async () => {
    setStatus('fixing');
    addLog('جاري إصلاح قيود المفاتيح الأجنبية...');
    
    try {
      const { data, error } = await supabase.rpc('fix_yalidine_fees_foreign_keys');
      
      if (error) {
        addLog(`❌ خطأ في إصلاح قيود المفاتيح الأجنبية: ${error.message}`);
        setFixResults(prev => ({ ...prev, foreignKeys: false }));
      } else {
        addLog('✅ تم إصلاح قيود المفاتيح الأجنبية بنجاح');
        setFixResults(prev => ({ ...prev, foreignKeys: true }));
      }
      
      await checkStatus();
    } catch (error: any) {
      addLog(`❌ خطأ أثناء إصلاح قيود المفاتيح الأجنبية: ${error.message}`);
      setStatus('error');
    }
  };

  const cleanupDuplicates = async () => {
    setStatus('fixing');
    addLog('جاري تنظيف البيانات المكررة...');
    
    try {
      const { data, error } = await supabase.rpc('cleanup_duplicate_yalidine_fees');
      
      if (error) {
        addLog(`❌ خطأ في تنظيف البيانات المكررة: ${error.message}`);
        setFixResults(prev => ({ ...prev, cleanupDuplicates: false }));
      } else {
        addLog(`✅ تم حذف ${data} سجل مكرر بنجاح`);
        setFixResults(prev => ({ ...prev, cleanupDuplicates: true }));
      }
      
      await checkStatus();
    } catch (error: any) {
      addLog(`❌ خطأ أثناء تنظيف البيانات المكررة: ${error.message}`);
      setStatus('error');
    }
  };

  const fixConstraints = async () => {
    setStatus('fixing');
    addLog('جاري إصلاح قيود المفتاح الفريد...');
    
    try {
      const { data, error } = await supabase.rpc('fix_yalidine_fees_constraints');
      
      if (error) {
        addLog(`❌ خطأ في إصلاح قيود المفتاح الفريد: ${error.message}`);
        setFixResults(prev => ({ ...prev, constraints: false }));
      } else {
        addLog('✅ تم إصلاح قيود المفتاح الفريد بنجاح');
        setFixResults(prev => ({ ...prev, constraints: true }));
      }
      
      await checkStatus();
    } catch (error: any) {
      addLog(`❌ خطأ أثناء إصلاح قيود المفتاح الفريد: ${error.message}`);
      setStatus('error');
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const isLoading = status === 'checking' || status === 'fixing';

  return (
    <Card className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Text className="text-lg font-semibold">أداة إصلاح مزامنة رسوم ياليدين</Text>
        <Badge variant={status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'default'}>
          {status === 'idle' && 'جاهز'}
          {status === 'checking' && 'جاري التحقق'}
          {status === 'fixing' && 'جاري الإصلاح'}
          {status === 'success' && 'تم الإصلاح بنجاح'}
          {status === 'error' && 'حدث خطأ'}
        </Badge>
      </div>
      
      <Divider className="my-3" />
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button 
          onClick={checkStatus} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          التحقق من الحالة
        </Button>
        
        <Button 
          onClick={fixTableStructure} 
          disabled={isLoading || (feeStats && !feeStats.hasProblem && feeStats.fixes.length === 0)}
          className="bg-green-600 hover:bg-green-700"
        >
          إصلاح هيكل الجدول
        </Button>
        
        <Button 
          onClick={fixForeignKeys} 
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          إصلاح المفاتيح الأجنبية
        </Button>
        
        <Button 
          onClick={cleanupDuplicates} 
          disabled={isLoading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          تنظيف البيانات المكررة
        </Button>
        
        <Button 
          onClick={fixConstraints} 
          disabled={isLoading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          إصلاح قيود المفتاح الفريد
        </Button>
      </div>
      
      <Divider className="my-3" />
      
      <div className="max-h-64 overflow-y-auto bg-gray-100 dark:bg-gray-800 p-3 rounded">
        {logs.length === 0 ? (
          <Text className="text-gray-500">لا توجد سجلات بعد، اضغط على "التحقق من الحالة" للبدء.</Text>
        ) : (
          logs.map((log, index) => (
            <Text key={index} className="text-sm mb-1 font-mono">
              {log}
            </Text>
          ))
        )}
      </div>
      
      {isLoading && (
        <div className="flex justify-center mt-4">
          <Spinner size="md" />
        </div>
      )}
    </Card>
  );
} 