import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// صفحة وسيطة للتوجيه إلى ProductPurchase مع تحسين SEO
const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // إضافة بيانات وصفية لتحسين SEO
  const getMetaDescription = () => {
    return `اشتري ${slug} الآن بأفضل سعر وجودة عالية. توصيل سريع لجميع الولايات والبلديات.`;
  };
  
  const getTitle = () => {
    // تحويل سبيل المنتج إلى عنوان مقروء
    const formattedSlug = slug
      ?.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${formattedSlug} - شراء المنتج بأفضل سعر`;
  };

  useEffect(() => {
    // تحميل مسبق لوظائف قاعدة البيانات
    const preloadDbFunctions = async () => {
      try {
        // هذا الاستعلام سيحمل وظائف قاعدة البيانات مسبقًا عند تصفح الشبكة
        // بدون تنفيذ فعلي للبيانات، مما يسرع من الاستجابة لاحقًا
        await fetch(`/api/preload-functions?functions=get_complete_product_data,get_shipping_provinces`, {
          method: 'HEAD'
        });
      } catch (error) {
        // تجاهل الأخطاء - هذا مجرد تحسين أداء
      }
    };
    
    preloadDbFunctions();
  }, []);

  return (
    <>
      <Helmet>
        <title>{getTitle()}</title>
        <meta name="description" content={getMetaDescription()} />
        <meta property="og:title" content={getTitle()} />
        <meta property="og:description" content={getMetaDescription()} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={window.location.href} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      {/* توجيه المستخدم إلى صفحة شراء المنتج */}
      <Navigate to={`/product-purchase/${slug}`} replace />
    </>
  );
};

export default ProductPage; 