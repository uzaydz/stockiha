import { supabase } from "@/lib/supabase";

/**
 * الحصول على اسم المنتج حسب المعرف
 * @param productId معرف المنتج
 * @returns الاسم أو فارغ في حالة الفشل
 */
export const getProductNameById = async (productId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .single();
    
    if (error) {
      console.error("خطأ في الحصول على اسم المنتج:", error);
      return "";
    }
    
    return data?.name || "";
  } catch (error) {
    console.error("خطأ غير متوقع أثناء الحصول على اسم المنتج:", error);
    return "";
  }
} 