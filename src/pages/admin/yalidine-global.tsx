import { useState, useEffect } from 'react';
import { Button, Card, Text, Group, Stack, Alert, Badge, Paper, List, Progress, Space, Container, Title } from '@mantine/core';
import { IconRefresh, IconCheck, IconX, IconInfoCircle, IconDatabase } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/dashboard/Layout';
import { notifications } from '@mantine/notifications';
import { syncAllGlobalData, isGlobalDataUpToDate } from '@/api/yalidine/global-sync';

export default function YalidineGlobalPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataUpToDate, setIsDataUpToDate] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    provinces: number;
    municipalities: number;
    centers: number;
  }>({
    provinces: 0,
    municipalities: 0,
    centers: 0,
  });

  // فحص حالة البيانات العالمية عند تحميل الصفحة
  useEffect(() => {
    checkGlobalDataStatus();
    loadStats();
  }, []);

  // فحص ما إذا كانت البيانات العالمية محدثة
  const checkGlobalDataStatus = async () => {
    try {
      const isUpdated = await isGlobalDataUpToDate();
      setIsDataUpToDate(isUpdated);

      // جلب تاريخ آخر تحديث
      if (isUpdated) {
        const { data } = await supabase
          .from('yalidine_global_info')
          .select('last_updated_at')
          .single();
        
        if (data) {
          setLastUpdate(new Date(data.last_updated_at).toLocaleString());
        }
      }
    } catch (error) {
      setIsDataUpToDate(false);
    }
  };

  // جلب إحصائيات البيانات العالمية
  const loadStats = async () => {
    try {
      // الولايات
      const { count: provincesCount } = await supabase
        .from('yalidine_provinces_global')
        .select('*', { count: 'exact', head: true });
      
      // البلديات
      const { count: municipalitiesCount } = await supabase
        .from('yalidine_municipalities_global')
        .select('*', { count: 'exact', head: true });
      
      // مكاتب التوصيل
      const { count: centersCount } = await supabase
        .from('yalidine_centers_global')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        provinces: provincesCount || 0,
        municipalities: municipalitiesCount || 0,
        centers: centersCount || 0,
      });
    } catch (error) {
    }
  };

  // تحديث البيانات العالمية
  const handleUpdateGlobalData = async () => {
    setIsLoading(true);
    notifications.show({
      id: 'sync-global',
      title: 'جاري مزامنة البيانات العالمية',
      message: 'يرجى الانتظار، قد تستغرق هذه العملية بضع دقائق...',
      loading: true,
      autoClose: false,
    });

    try {
      const result = await syncAllGlobalData();
      
      if (result) {
        notifications.update({
          id: 'sync-global',
          title: 'تمت المزامنة بنجاح',
          message: 'تم تحديث البيانات العالمية لياليدين بنجاح',
          color: 'green',
          icon: <IconCheck />,
          autoClose: 5000,
        });
        
        // تحديث الحالة والإحصائيات
        await checkGlobalDataStatus();
        await loadStats();
      } else {
        notifications.update({
          id: 'sync-global',
          title: 'فشلت المزامنة',
          message: 'حدث خطأ أثناء تحديث البيانات العالمية، يرجى المحاولة مرة أخرى',
          color: 'red',
          icon: <IconX />,
          autoClose: 5000,
        });
      }
    } catch (error) {
      notifications.update({
        id: 'sync-global',
        title: 'فشلت المزامنة',
        message: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
        color: 'red',
        icon: <IconX />,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Container size="lg">
        <Title order={2} mb="lg">إدارة بيانات ياليدين العالمية</Title>

        <Alert icon={<IconInfoCircle />} color="blue" mb="lg">
          هذه الصفحة تتيح لك إدارة البيانات العالمية لياليدين (الولايات، البلديات، مكاتب التوصيل).
          هذه البيانات مشتركة بين جميع المتاجر ويتم تحديثها مرة واحدة فقط.
        </Alert>

        <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
          <Group position="apart" mb="md">
            <Text size="xl" weight={500}>حالة البيانات العالمية</Text>
            <Badge 
              color={isDataUpToDate === null ? 'gray' : isDataUpToDate ? 'green' : 'red'}
              size="lg"
            >
              {isDataUpToDate === null 
                ? 'جاري الفحص...' 
                : isDataUpToDate 
                  ? 'محدثة' 
                  : 'تحتاج للتحديث'}
            </Badge>
          </Group>

          {lastUpdate && (
            <Text size="sm" color="dimmed" mb="md">
              آخر تحديث: {lastUpdate}
            </Text>
          )}

          <Stack spacing="md">
            <Button 
              onClick={handleUpdateGlobalData} 
              loading={isLoading}
              disabled={isLoading}
              rightIcon={<IconRefresh size={16} />}
              size="md"
            >
              تحديث البيانات العالمية
            </Button>
          </Stack>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text size="xl" weight={500} mb="md">إحصائيات البيانات العالمية</Text>
          
          <Stack spacing="lg">
            <Paper p="md" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500}>الولايات</Text>
                <Badge size="lg">{stats.provinces}</Badge>
              </Group>
              <Progress value={stats.provinces > 0 ? 100 : 0} color="blue" />
            </Paper>

            <Paper p="md" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500}>البلديات</Text>
                <Badge size="lg">{stats.municipalities}</Badge>
              </Group>
              <Progress value={stats.municipalities > 0 ? 100 : 0} color="green" />
            </Paper>

            <Paper p="md" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500}>مكاتب التوصيل</Text>
                <Badge size="lg">{stats.centers}</Badge>
              </Group>
              <Progress value={stats.centers > 0 ? 100 : 0} color="violet" />
            </Paper>
          </Stack>

          <Space h="lg" />

          <Alert icon={<IconDatabase />} color="yellow">
            <Text weight={500} mb="xs">ملاحظات هامة:</Text>
            <List size="sm">
              <List.Item>يجب تحديث البيانات العالمية مرة واحدة على الأقل شهرياً</List.Item>
              <List.Item>أي تغيير في البيانات العالمية سيتم تطبيقه تلقائياً عند المزامنة التالية للمتاجر</List.Item>
              <List.Item>هذه العملية تستخدم معرف المنظمة الافتراضي للوصول إلى API ياليدين</List.Item>
            </List>
          </Alert>
        </Card>
      </Container>
    </Layout>
  );
}
