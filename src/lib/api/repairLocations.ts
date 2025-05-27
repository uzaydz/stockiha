import { supabase } from '@/lib/supabase';
import { RepairLocation } from '@/types';

// الحصول على أماكن التصليح النشطة لمؤسسة معينة
export async function getActiveRepairLocations(organizationId: string): Promise<RepairLocation[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('repair_locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

// الحصول على جميع أماكن التصليح لمؤسسة معينة
export async function getRepairLocations(organizationId: string): Promise<RepairLocation[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('repair_locations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

// إنشاء أو تحديث مكان تصليح
export async function upsertRepairLocation(
  repairLocation: Partial<RepairLocation> & { organization_id: string }
): Promise<string> {
  try {
    // إذا كان هذا المكان افتراضي، قم بإلغاء الافتراضية من الأماكن الأخرى
    if (repairLocation.is_default) {
      const { error: updateError } = await (supabase as any)
        .from('repair_locations')
        .update({ is_default: false })
        .eq('organization_id', repairLocation.organization_id)
        .neq('id', repairLocation.id || '');

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    const locationData = {
      ...repairLocation,
      updated_at: new Date().toISOString(),
      ...(repairLocation.id ? {} : { created_at: new Date().toISOString() })
    };

    const { data, error } = await (supabase as any)
      .from('repair_locations')
      .upsert(locationData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.id;
  } catch (error) {
    throw error;
  }
}

// حذف مكان تصليح
export async function deleteRepairLocation(organizationId: string, locationId: string): Promise<void> {
  try {
    // التحقق من أن المكان ليس افتراضي
    const { data: location, error: fetchError } = await (supabase as any)
      .from('repair_locations')
      .select('is_default')
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (location?.is_default) {
      throw new Error('لا يمكن حذف المكان الافتراضي');
    }

    const { error } = await (supabase as any)
      .from('repair_locations')
      .delete()
      .eq('id', locationId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    throw error;
  }
}

// الحصول على مكان تصليح بالمعرف
export async function getRepairLocationById(organizationId: string, locationId: string): Promise<RepairLocation | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('repair_locations')
      .select('*')
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // لم يتم العثور على المكان
      }
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// الحصول على المكان الافتراضي
export async function getDefaultRepairLocation(organizationId: string): Promise<RepairLocation | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('repair_locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // لا يوجد مكان افتراضي
      }
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// تعيين مكان كافتراضي
export async function setDefaultRepairLocation(organizationId: string, locationId: string): Promise<void> {
  try {
    // إلغاء الافتراضية من جميع الأماكن
    const { error: updateError } = await (supabase as any)
      .from('repair_locations')
      .update({ is_default: false })
      .eq('organization_id', organizationId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // تعيين المكان الجديد كافتراضي
    const { error: setError } = await (supabase as any)
      .from('repair_locations')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', locationId)
      .eq('organization_id', organizationId);

    if (setError) {
      throw new Error(setError.message);
    }
  } catch (error) {
    throw error;
  }
}
