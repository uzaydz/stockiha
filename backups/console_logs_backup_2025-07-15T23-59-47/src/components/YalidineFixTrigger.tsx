import { useState } from 'react';
import axios from 'axios';
import { Button, Text, Card, Badge, Alert, Space, Group, Loader } from '@mantine/core';
import { IconAlertTriangle, IconCheckCircle } from '@tabler/icons-react';

/**
 * مكون لإصلاح مشكلة محفز ياليدين
 */
export default function YalidineFixTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: any;
  } | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<{
    tableStats?: {
      yalidine_fees: { count: number };
      yalidine_fees_new: { count: number };
    };
    triggerStatus?: string;
  } | null>(null);

  // وظيفة لتشخيص حالة الجداول
  const diagnoseTables = async () => {
    setDiagnosisLoading(true);
    try {
      // فحص حالة الجداول
      const feesRes = await axios.post('/api/yalidine/check-tables');
      if (feesRes.data && feesRes.data.success) {
        setDiagnosis({
          tableStats: feesRes.data.tableStats,
          triggerStatus: feesRes.data.triggerStatus
        });
      } else {
        setDiagnosis({
          tableStats: {
            yalidine_fees: { count: 0 },
            yalidine_fees_new: { count: 0 }
          },
          triggerStatus: 'غير معروف'
        });
      }
    } catch (error) {
      setDiagnosis({
        tableStats: {
          yalidine_fees: { count: 0 },
          yalidine_fees_new: { count: 0 }
        },
        triggerStatus: 'فشل التشخيص'
      });
    } finally {
      setDiagnosisLoading(false);
    }
  };

  // وظيفة لإصلاح المحفز
  const fixTrigger = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post('/api/yalidine/fix-trigger');
      setResult({
        success: response.data.success,
        message: response.data.message,
        stats: response.data.stats
      });
      
      // تشخيص الجداول بعد الإصلاح
      await diagnoseTables();
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'حدث خطأ أثناء محاولة إصلاح المحفز'
      });
    } finally {
      setLoading(false);
    }
  };

  // تلقائياً عند تحميل المكون
  useState(() => {
    diagnoseTables();
  });

  return (
    <Card shadow="sm" padding="lg" withBorder>
      <Card.Section p="md" bg="gray.1">
        <Text fw={700} size="lg">أداة إصلاح مشكلة محفز ياليدين</Text>
      </Card.Section>

      {/* قسم التشخيص */}
      <Card.Section p="md">
        <Text size="sm" mb={10}>معلومات حالة جداول ياليدين:</Text>
        
        {diagnosisLoading ? (
          <Group position="center" py={20}>
            <Loader size="sm" />
            <Text size="sm">جاري التشخيص...</Text>
          </Group>
        ) : (
          <>
            <Text size="sm">عدد السجلات في yalidine_fees: {diagnosis?.tableStats?.yalidine_fees.count || 0}</Text>
            <Space h="xs" />
            <Text size="sm">عدد السجلات في yalidine_fees_new: {diagnosis?.tableStats?.yalidine_fees_new.count || 0}</Text>
            <Space h="xs" />
            <Text size="sm">حالة المحفز: {diagnosis?.triggerStatus || 'غير معروف'}</Text>
            
            <Group position="right" mt={15}>
              <Button
                variant="outline"
                size="xs"
                onClick={diagnoseTables}
                loading={diagnosisLoading}
              >
                تحديث التشخيص
              </Button>
            </Group>
          </>
        )}
      </Card.Section>

      {/* قسم الإصلاح */}
      <Card.Section p="md">
        <Text size="sm" mb={10}>
          إذا كانت بيانات ياليدين لا تظهر في الجدول yalidine_fees بعد المزامنة، 
          فقد يكون محفز yalidine_fees_redirect_trigger نشطاً ويقوم بتحويل البيانات.
        </Text>
        
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="تحذير"
          color="orange"
          mb={15}
        >
          هذه العملية تتطلب صلاحيات قاعدة بيانات متقدمة. إذا فشلت، يجب تنفيذ استعلام SQL يدوياً.
        </Alert>
        
        <Button
          color="red"
          loading={loading}
          onClick={fixTrigger}
          mb={15}
        >
          تعطيل المحفز وإصلاح المشكلة
        </Button>
        
        {result && (
          <Alert
            icon={result.success ? <IconCheckCircle size={18} /> : <IconAlertTriangle size={18} />}
            title={result.success ? 'تم بنجاح' : 'فشلت العملية'}
            color={result.success ? 'green' : 'red'}
          >
            {result.message}
            
            {result.stats && (
              <Text size="sm" mt={10}>
                عدد السجلات بعد الإصلاح: {result.stats.feesCount || 0}
              </Text>
            )}
          </Alert>
        )}
      </Card.Section>
      
      {/* تعليمات يدوية */}
      <Card.Section p="md" bg="gray.1">
        <Text size="sm" fw={600} mb={10}>
          في حالة فشل الإصلاح التلقائي، يمكنك تنفيذ الاستعلام التالي يدوياً في قاعدة البيانات:
        </Text>
        
        <Text component="pre" style={{ background: '#f6f6f6', padding: 10, borderRadius: 4, fontSize: '12px', overflow: 'auto' }}>
          {`ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;`}
        </Text>
      </Card.Section>
    </Card>
  );
}
