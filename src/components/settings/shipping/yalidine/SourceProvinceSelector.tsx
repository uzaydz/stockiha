import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Province } from './YalidineTypes';
import { useTranslation } from 'react-i18next';

interface SourceProvinceSelectorProps {
  currentOrganizationId?: string;
  originWilayaId?: string | number;
  disabled?: boolean;
  onChange: (provinceId: number) => void;
}

/**
 * مكون لاختيار ولاية المصدر
 */
export const SourceProvinceSelector: React.FC<SourceProvinceSelectorProps> = ({
  currentOrganizationId,
  originWilayaId,
  disabled = false,
  onChange
}) => {
  const { t } = useTranslation();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | undefined>(
    originWilayaId ? Number(originWilayaId) : undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  // جلب قائمة الولايات عند تحميل المكون
  useEffect(() => {
    const fetchProvinces = async () => {
      if (!currentOrganizationId) return;
      
      setIsLoading(true);
      try {
        // محاولة جلب الولايات من قاعدة البيانات
        const { data, error } = await supabase
          .from('yalidine_provinces')
          .select('id, name, zone, is_deliverable')
          .eq('organization_id', currentOrganizationId)
          .order('id', { ascending: true });
        
        if (error) {
          return;
        }
        
        if (data && data.length > 0) {
          setProvinces(data);
          
          // إذا لم يتم تحديد ولاية المصدر، استخدم الولاية الأولى
          if (!selectedProvinceId && data.length > 0) {
            const defaultProvince = data.find(p => p.id === 16) || data[0]; // استخدم الجزائر العاصمة كافتراضي إذا وجدت
            setSelectedProvinceId(defaultProvince.id);
            onChange(defaultProvince.id);
          }
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProvinces();
  }, [currentOrganizationId]);

  // تحديث القيمة المحددة عند تغيير originWilayaId
  useEffect(() => {
    if (originWilayaId) {
      const numericId = Number(originWilayaId);
      setSelectedProvinceId(numericId);
    }
  }, [originWilayaId]);

  // معالجة تغيير الولاية المحددة
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvinceId = Number(e.target.value);
    setSelectedProvinceId(newProvinceId);
    onChange(newProvinceId);
  };

  return (
    <div className="mb-4">
      <label htmlFor="sourceProvince" className="block text-sm font-medium text-gray-700 mb-1">
        {t('yalidine.settings.sourceProvince', 'ولاية المصدر')}
      </label>
      <select
        id="sourceProvince"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        value={selectedProvinceId || ''}
        onChange={handleProvinceChange}
        disabled={disabled || isLoading}
      >
        <option value="">{t('yalidine.settings.selectProvince', 'اختر الولاية')}</option>
        {provinces.map((province) => (
          <option key={province.id} value={province.id}>
            {province.id} - {province.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500">
        {t('yalidine.settings.sourceProvinceHelp', 'اختر ولاية المصدر التي سيتم جلب أسعار التوصيل منها إلى باقي الولايات')}
      </p>
    </div>
  );
};
