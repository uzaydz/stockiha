import { supabase } from '@/lib/supabase-client';

// دالة معدلة للبحث عن مكتب الاستلام المتعلق بالبلدية
// تم تعديلها لترجع دائماً رقم البلدية بدلاً من مكتب ياليدين
// وهذا سيضمن أن النظام يستخدم البلديات دائمًا بغض النظر عن شركة الشحن
export async function findStopDeskForMunicipality(wilayaId: string | number, municipalityId: string | number): Promise<string | null> {
  if (!municipalityId || !wilayaId) {
    console.log(`[البحث عن البلدية] لا توجد بيانات كافية للبحث: ولاية=${wilayaId}, بلدية=${municipalityId}`);
    return null;
  }
  
  console.log(`[البحث عن البلدية] الاستخدام المباشر للبلدية ${municipalityId} في الولاية ${wilayaId}`);
  
  // نرجع رقم البلدية نفسه كمكتب استلام
  // وهذا يعني أن النظام سيستخدم البلديات بدلاً من البحث عن مكاتب ياليدين
  if (municipalityId) {
    console.log(`[البحث عن البلدية] تم اختيار البلدية ${municipalityId} للاستلام منها`);
    return municipalityId.toString();
  } else {
    console.log('[البحث عن البلدية] لم يتم توفير بلدية للاستلام منها');
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
      console.error('[البحث عن مكتب] خطأ في الاستعلام:', error);
      return null;
    }
    
    if (centers && centers.length > 0) {
      const centerId = centers[0].center_id.toString();
      console.log(`[البحث عن مكتب] تم العثور على مكتب ${centerId} (${centers[0].name}) للبلدية ${municipalityId}`);
      return centerId;
    } else {
      console.log(`[البحث عن مكتب] لم يتم العثور على مكتب للبلدية ${municipalityId}, البحث عن مكاتب في الولاية`);
      
      // إذا لم نجد مكتب مرتبط بالبلدية، نبحث عن مكاتب في الولاية
      const { data: wilayaCenters, error: wilayaError } = await supabase
        .from('yalidine_centers_global')
        .select('center_id, name, commune_id, wilaya_id, commune_name')
        .eq('wilaya_id', Number(wilayaId));
        
      if (wilayaError) {
        console.error('[البحث عن مكتب] خطأ في استعلام مكاتب الولاية:', wilayaError);
        return null;
      }
      
      if (wilayaCenters && wilayaCenters.length > 0) {
        const centerId = wilayaCenters[0].center_id.toString();
        console.log(`[البحث عن مكتب] تم العثور على مكتب ${centerId} (${wilayaCenters[0].name}) في الولاية ${wilayaId}`);
        return centerId;
      }
    }
    
    console.log('[البحث عن مكتب] لم يتم العثور على أي مكتب');
    return null;
  } catch (error) {
    console.error('[البحث عن مكتب] خطأ غير متوقع:', error);
    return null;
  }
  */
} 