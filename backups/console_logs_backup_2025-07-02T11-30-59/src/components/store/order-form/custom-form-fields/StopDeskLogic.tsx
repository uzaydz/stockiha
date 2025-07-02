import { supabase } from '@/lib/supabase-client';

// دالة معدلة للبحث عن مكتب الاستلام المتعلق بالبلدية
// تم تعديلها لترجع دائماً رقم البلدية بدلاً من مكتب ياليدين
// وهذا سيضمن أن النظام يستخدم البلديات دائمًا بغض النظر عن شركة الشحن
export async function findStopDeskForMunicipality(wilayaId: string | number, municipalityId: string | number): Promise<string | null> {
  if (!municipalityId || !wilayaId) {
    return null;
  }
  
  // نرجع رقم البلدية نفسه كمكتب استلام
  // وهذا يعني أن النظام سيستخدم البلديات بدلاً من البحث عن مكاتب ياليدين
  if (municipalityId) {
    return municipalityId.toString();
  } else {
    return null;
  }

  // تم التعليق على الكود الأصلي واستبداله بالمنطق أعلاه
  /*
  try {
    const { data: centers, error } = await supabase
      .from('yalidine_centers_global')
      .select('center_id, name, commune_id, wilaya_id, commune_name')
      .eq('commune_id', Number(municipalityId))
      .eq('wilaya_id', Number(wilayaId));
      
    if (error) {
      return null;
    }
    
    if (centers && centers.length > 0) {
      const centerId = centers[0].center_id.toString();
      return centerId;
    } else {
      
      // إذا لم نجد مكتب مرتبط بالبلدية، نبحث عن مكاتب في الولاية
      const { data: wilayaCenters, error: wilayaError } = await supabase
        .from('yalidine_centers_global')
        .select('center_id, name, commune_id, wilaya_id, commune_name')
        .eq('wilaya_id', Number(wilayaId));
        
      if (wilayaError) {
        return null;
      }
      
      if (wilayaCenters && wilayaCenters.length > 0) {
        const centerId = wilayaCenters[0].center_id.toString();
        return centerId;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
  */
}
