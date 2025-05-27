import { supabase } from "@/lib/supabase";

/**
 * التحقق من الاتصال بقاعدة البيانات قبل إرسال الطلب
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    
    // محاولة تنفيذ استعلام بسيط للتأكد من وجود اتصال
    const { data, error } = await supabase.from('inventory_log')
      .select('id')
      .limit(1);
      
    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};
