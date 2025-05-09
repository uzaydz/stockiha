import { supabase } from "@/lib/supabase";

/**
 * التحقق من الاتصال بقاعدة البيانات قبل إرسال الطلب
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("التحقق من الاتصال بـ Supabase...");
    // محاولة تنفيذ استعلام بسيط للتأكد من وجود اتصال
    const { data, error } = await supabase.from('inventory_log')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error("خطأ أثناء التحقق من الاتصال:", error);
      return false;
    }
    
    console.log("تم التحقق من الاتصال بـ Supabase بنجاح");
    return true;
  } catch (error) {
    console.error("استثناء أثناء التحقق من الاتصال:", error);
    return false;
  }
}; 