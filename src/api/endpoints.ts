import { getProductNameById } from "./products";

/**
 * معالج API للحصول على اسم المنتج حسب المعرف
 * @param req طلب API
 * @param res استجابة API
 */
export const handleGetProductName = async (req, res) => {
  const { productId } = req.params;
  
  if (!productId) {
    return res.status(400).json({ error: "معرف المنتج مطلوب" });
  }
  
  try {
    const productName = await getProductNameById(productId);
    return res.status(200).json({ name: productName });
  } catch (error) {
    console.error("خطأ في معالج الحصول على اسم المنتج:", error);
    return res.status(500).json({ error: "حدث خطأ أثناء الحصول على اسم المنتج" });
  }
} 