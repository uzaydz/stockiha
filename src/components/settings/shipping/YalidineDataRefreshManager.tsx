import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { CircularProgress, LinearProgress, Alert, Button, Card, CardContent, CardHeader, Switch, FormControlLabel, TextField, Typography, Box, Divider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface YalidineRefreshStatus {
  status: string;
  organization_id: string;
  initialized: boolean;
  auto_refresh_enabled?: boolean;
  refresh_frequency_hours?: number;
  last_wilayas_refresh?: string;
  last_communes_refresh?: string;
  last_centers_refresh?: string;
  last_fees_refresh?: string;
  wilayas_completed?: boolean;
  communes_completed?: boolean;
  centers_completed?: boolean;
  fees_completed?: boolean;
}

interface YalidineRefreshResult {
  status: string;
  organization_id: string;
  wilayas_updated?: boolean;
  communes_updated?: boolean;
  centers_updated?: boolean;
  fees_updated?: boolean;
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  rate_limit_exceeded?: boolean;
}

interface YalidineDataRefreshManagerProps {
  organizationId: string;
}

export default function YalidineDataRefreshManager({ organizationId }: YalidineDataRefreshManagerProps) {
  const supabase = useSupabaseClient();
  const [refreshStatus, setRefreshStatus] = useState<YalidineRefreshStatus | null>(null);
  const [refreshResult, setRefreshResult] = useState<YalidineRefreshResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshFrequency, setRefreshFrequency] = useState(24);

  // Cargar el estado de actualización inicial
  useEffect(() => {
    fetchRefreshStatus();
  }, [organizationId]);

  // Obtener el estado de actualización
  const fetchRefreshStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_organization_yalidine_refresh_status', {
        p_organization_id: organizationId
      });

      if (error) throw error;

      setRefreshStatus(data);
      
      if (data.auto_refresh_enabled !== undefined) {
        setAutoRefreshEnabled(data.auto_refresh_enabled);
      }
      
      if (data.refresh_frequency_hours !== undefined) {
        setRefreshFrequency(data.refresh_frequency_hours);
      }
    } catch (err: any) {
      console.error('Error fetching refresh status:', err);
      setError(err.message || 'Error al obtener el estado de actualización');
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar una actualización manual
  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      setRefreshResult(null);

      const { data, error } = await supabase.rpc('refresh_organization_yalidine_data', {
        p_organization_id: organizationId,
        p_force_refresh: true
      });

      if (error) throw error;

      setRefreshResult(data);
      
      // Actualizar el estado después de la actualización
      await fetchRefreshStatus();
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Error al actualizar los datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Guardar configuración de actualización automática
  const saveConfiguration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('configure_organization_yalidine_refresh', {
        p_organization_id: organizationId,
        p_auto_refresh_enabled: autoRefreshEnabled,
        p_refresh_frequency_hours: refreshFrequency
      });

      if (error) throw error;

      setRefreshStatus(data);
    } catch (err: any) {
      console.error('Error saving configuration:', err);
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular el progreso general
  const calculateProgress = () => {
    if (!refreshStatus) return 0;
    
    let progress = 0;
    if (refreshStatus.wilayas_completed) progress += 25;
    if (refreshStatus.communes_completed) progress += 25;
    if (refreshStatus.centers_completed) progress += 25;
    if (refreshStatus.fees_completed) progress += 25;
    
    return progress;
  };

  // Formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لم يتم التحديث';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Renderizar el componente
  return (
    <Card className="bg-white shadow-md rounded-lg" dir="rtl">
      <CardHeader 
        title="إدارة تحديث بيانات ياليدين"
        subheader="تحديث البيانات المحلية من API ياليدين"
        action={
          <Button
            color="primary"
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </Button>
        }
      />
      
      <CardContent>
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        {isLoading ? (
          <CircularProgress className="m-8" />
        ) : !refreshStatus?.initialized ? (
          <Alert severity="info">
            لم يتم تهيئة التحديث التلقائي لهذه المؤسسة بعد. اضغط على زر "تحديث البيانات" للبدء.
          </Alert>
        ) : (
          <>
            {/* حالة التحديث الحالية */}
            <Box className="mb-6">
              <Typography variant="subtitle1" className="mb-2 font-bold">
                حالة التحديث: {refreshStatus.status}
              </Typography>
              
              <LinearProgress 
                variant="determinate" 
                value={calculateProgress()} 
                className="h-2 mb-1" 
              />
              
              <Typography variant="body2" className="text-right text-gray-600">
                {calculateProgress()}% مكتمل
              </Typography>
            </Box>
            
            {/* نتيجة آخر تحديث */}
            {refreshResult && (
              <Box className="mb-6 p-3 bg-gray-50 rounded-md">
                <Typography variant="subtitle2" className="mb-2">
                  نتيجة آخر تحديث:
                </Typography>
                
                <Typography variant="body2" className="mb-1">
                  حالة: {refreshResult.status}
                </Typography>
                
                {refreshResult.duration_ms && (
                  <Typography variant="body2" className="mb-1">
                    مدة التنفيذ: {(refreshResult.duration_ms / 1000).toFixed(2)} ثانية
                  </Typography>
                )}
                
                <Typography variant="body2" className="mb-1">
                  تم تحديث الولايات: {refreshResult.wilayas_updated ? 'نعم' : 'لا'}
                </Typography>
                
                <Typography variant="body2" className="mb-1">
                  تم تحديث البلديات: {refreshResult.communes_updated ? 'نعم' : 'لا'}
                </Typography>
                
                <Typography variant="body2" className="mb-1">
                  تم تحديث المراكز: {refreshResult.centers_updated ? 'نعم' : 'لا'}
                </Typography>
                
                <Typography variant="body2">
                  تم تحديث التعريفات: {refreshResult.fees_updated ? 'نعم' : 'لا'}
                </Typography>
              </Box>
            )}
            
            {/* تفاصيل آخر تحديث */}
            <Box className="mb-6">
              <Typography variant="subtitle1" className="mb-2 font-bold">
                تفاصيل آخر تحديث
              </Typography>
              
              <Box className="grid grid-cols-2 gap-3">
                <Box>
                  <Typography variant="body2" className="font-bold">الولايات:</Typography>
                  <Typography variant="body2">{formatDate(refreshStatus.last_wilayas_refresh)}</Typography>
                  <Typography variant="body2" className="text-xs text-gray-600">
                    {refreshStatus.wilayas_completed ? 'مكتمل' : 'غير مكتمل'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" className="font-bold">البلديات:</Typography>
                  <Typography variant="body2">{formatDate(refreshStatus.last_communes_refresh)}</Typography>
                  <Typography variant="body2" className="text-xs text-gray-600">
                    {refreshStatus.communes_completed ? 'مكتمل' : 'غير مكتمل'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" className="font-bold">مراكز التوصيل:</Typography>
                  <Typography variant="body2">{formatDate(refreshStatus.last_centers_refresh)}</Typography>
                  <Typography variant="body2" className="text-xs text-gray-600">
                    {refreshStatus.centers_completed ? 'مكتمل' : 'غير مكتمل'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" className="font-bold">تعريفات الشحن:</Typography>
                  <Typography variant="body2">{formatDate(refreshStatus.last_fees_refresh)}</Typography>
                  <Typography variant="body2" className="text-xs text-gray-600">
                    {refreshStatus.fees_completed ? 'مكتمل' : 'غير مكتمل'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Divider className="my-4" />
            
            {/* إعدادات التحديث التلقائي */}
            <Box className="mt-6">
              <Typography variant="subtitle1" className="mb-4 font-bold">
                إعدادات التحديث التلقائي
              </Typography>
              
              <Box className="flex flex-col space-y-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefreshEnabled}
                      onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="تفعيل التحديث التلقائي"
                />
                
                <TextField
                  label="تكرار التحديث (ساعات)"
                  type="number"
                  value={refreshFrequency}
                  onChange={(e) => setRefreshFrequency(Number(e.target.value))}
                  disabled={!autoRefreshEnabled}
                  InputProps={{
                    inputProps: { min: 1, max: 168 } // Max 1 week
                  }}
                  helperText="القيمة المثلى: 24 ساعة (مرة يوميًا)"
                  size="small"
                  className="w-48"
                />
                
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={saveConfiguration}
                  disabled={isLoading}
                >
                  حفظ الإعدادات
                </Button>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
} 