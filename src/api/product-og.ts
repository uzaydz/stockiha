// API endpoint لتوفير Open Graph metadata للمنتجات
import { getProductPageData } from './product-page';
import { getSupabaseClient } from '@/lib/supabase-client';

export interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
  site_name: string;
  type: 'product';
  price?: {
    amount: string;
    currency: string;
  };
  availability?: string;
}

/**
 * جلب Open Graph metadata للمنتج
 * @param organizationId معرف المؤسسة
 * @param productSlug slug المنتج
 * @returns Open Graph data أو null إذا لم يوجد المنتج
 */
export async function getProductOpenGraphData(
  organizationId: string,
  productSlug: string
): Promise<OpenGraphData | null> {
  try {
    // جلب بيانات المنتج
    const productData = await getProductPageData(organizationId, productSlug);

    if (!productData || !productData.product) {
      return null;
    }

    const product = productData.product;

    // جلب بيانات المؤسسة
    const supabase = getSupabaseClient();
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', organizationId)
      .single();

    if (!organization) {
      return null;
    }

    // إنشاء العنوان
    const storeName = organization.name || 'المتجر';
    const title = `${product.name} | ${storeName}`;

    // إنشاء الوصف
    let description = `اشتري ${product.name} بأفضل سعر من ${storeName}. `;
    if (product.description) {
      // استخراج أول 150 حرف من الوصف
      const cleanDescription = product.description.replace(/<[^>]*>/g, '').trim();
      description += cleanDescription.length > 100
        ? cleanDescription.substring(0, 100) + '...'
        : cleanDescription;
    } else {
      description += 'توصيل سريع لجميع الولايات. جودة عالية وأسعار منافسة.';
    }

    // تحديد الصورة
    const defaultColorImage = (product.colors || product.variants?.colors || [])
      .find((c: any) => c && (c.is_default || c.isDefault))?.image_url;

    const ogImage = defaultColorImage ||
                   product.images?.thumbnail_image ||
                   product.images?.additional_images?.[0]?.url ||
                   organization.settings?.logo_url ||
                   '/images/logo-new.webp';

    // تحديد الـ URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://stockiha.com';
    const url = `${baseUrl}/product-purchase-max-v3/${productSlug}`;

    // تحديد السعر والتوفر
    const price = product.price ? {
      amount: product.price.toString(),
      currency: 'DZD'
    } : undefined;

    const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';

    return {
      title,
      description,
      image: ogImage,
      url,
      site_name: storeName,
      type: 'product',
      price,
      availability
    };

  } catch (error) {
    console.error('Error fetching Open Graph data:', error);
    return null;
  }
}

/**
 * إنشاء HTML meta tags من Open Graph data
 * @param ogData Open Graph data
 * @returns HTML string يحتوي على meta tags
 */
export function generateOpenGraphMetaTags(ogData: OpenGraphData): string {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(ogData.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(ogData.description)}" />`,
    `<meta property="og:image" content="${ogData.image}" />`,
    `<meta property="og:url" content="${ogData.url}" />`,
    `<meta property="og:site_name" content="${escapeHtml(ogData.site_name)}" />`,
    `<meta property="og:type" content="${ogData.type}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(ogData.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(ogData.description)}" />`,
    `<meta name="twitter:image" content="${ogData.image}" />`,
  ];

  if (ogData.price) {
    tags.push(`<meta property="product:price:amount" content="${ogData.price.amount}" />`);
    tags.push(`<meta property="product:price:currency" content="${ogData.price.currency}" />`);
  }

  if (ogData.availability) {
    tags.push(`<meta property="product:availability" content="${ogData.availability}" />`);
  }

  return tags.join('\n');
}

/**
 * دالة مساعدة للهروب من HTML entities
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
