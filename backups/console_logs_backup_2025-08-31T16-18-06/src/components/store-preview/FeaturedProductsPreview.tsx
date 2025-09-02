import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Package, Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase-unified';

interface FeaturedProductsPreviewProps {
  title?: string;
  description?: string;
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[];
  displayCount?: number;
  displayType?: 'grid' | 'list';
  showPrices?: boolean;
  showRatings?: boolean;
  showAddToCart?: boolean;
  showBadges?: boolean;
  organizationId?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  thumbnail_url?: string;
  thumbnail_image?: string;
  category?: any;
  stock_quantity: number;
  is_featured?: boolean;
  is_new?: boolean;
  slug?: string;
}

const FeaturedProductsPreview: React.FC<FeaturedProductsPreviewProps> = ({
  title = 'منتجاتنا المميزة',
  description = 'اكتشف أفضل ما لدينا من منتجات مختارة بعناية',
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [],
  displayCount = 4,
  displayType = 'grid',
  showPrices = true,
  showRatings = true,
  showAddToCart = true,
  showBadges = true,
  organizationId
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Logging للتتبع
  console.log('🎯 FeaturedProductsPreview Render:', {
    organizationId,
    selectionMethod,
    selectionCriteria,
    displayCount,
    showProducts: true // دائماً true في المعاينة
  });

  // جلب المنتجات للمعاينة
  useEffect(() => {
    const fetchProducts = async () => {
      console.log('🔄 FeaturedProductsPreview: Fetching products for org:', organizationId);

      if (!organizationId) {
        console.error('❌ FeaturedProductsPreview: No organizationId');
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, description, price, compare_at_price, images, thumbnail_image, is_featured, is_new, category, sku, stock_quantity, slug, created_at, updated_at')
          .eq('is_active', true)
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false });

        // تطبيق الفلاتر حسب طريقة الاختيار
        if (selectionMethod === 'automatic') {
          switch (selectionCriteria) {
            case 'featured':
              query = query.eq('is_featured', true);
              break;
            case 'newest':
              query = query.order('created_at', { ascending: false });
              break;
            case 'discounted':
              // المنتجات التي لها compare_at_price أعلى من price
              query = query.not('compare_at_price', 'is', null);
              break;
            case 'best_selling':
              // يمكن إضافة منطق المبيعات هنا لاحقاً
              query = query.eq('is_featured', true);
              break;
            default:
              query = query.eq('is_featured', true);
          }
        } else if (selectionMethod === 'manual' && selectedProducts.length > 0) {
          query = query.in('id', selectedProducts);
        } else {
          // إذا لم تكن هناك منتجات محددة، استخدم المنتجات المميزة
          query = query.eq('is_featured', true);
        }

        if (displayCount && displayCount > 0) {
          query = query.limit(displayCount);
        }

        const { data, error } = await query;

        if (error) {
          console.error('خطأ في جلب المنتجات للمعاينة:', error);
          setProducts([]);
        } else {
          console.log(`✅ تم جلب ${data?.length || 0} منتج للمعاينة`);
          setProducts(data || []);
        }
      } catch (error) {
        console.error('خطأ في جلب المنتجات للمعاينة:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [organizationId, selectionMethod, selectionCriteria, selectedProducts, displayCount]);

  // عرض منتج فردي
  const ProductCard = ({ product }: { product: Product }) => {
    const imageUrl = product.thumbnail_url || product.thumbnail_image || '/placeholder-product.jpg';

    return (
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg border-border/50">
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.jpg';
              }}
            />

            {/* شارات المنتج */}
            {showBadges && (
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.is_new && (
                  <Badge className="text-xs bg-blue-500 hover:bg-blue-600">
                    جديد
                  </Badge>
                )}
                {product.is_featured && (
                  <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                    مميز
                  </Badge>
                )}
              </div>
            )}

            {/* زر الإضافة للسلة */}
            {showAddToCart && (
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 rounded-full"
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            {showPrices && (
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-primary">
                  {product.price.toLocaleString()} د.ج
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {product.compare_at_price.toLocaleString()} د.ج
                  </span>
                )}
              </div>
            )}

            {/* التقييم */}
            {showRatings && (
              <div className="flex items-center gap-1 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-3 w-3 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">(4.5)</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              مخزون: {product.stock_quantity}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // حالة التحميل
  if (loading) {
    return (
      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </section>
    );
  }

  // حالة عدم وجود منتجات
  if (products.length === 0) {
    return (
      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد منتجات متاحة حالياً</h3>
            <p className="text-muted-foreground mb-4">سنضيف منتجات مميزة قريباً</p>
            <Button variant="outline" asChild>
              <Link to="/products">تصفح جميع المنتجات</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 bg-background">
      <div className="container mx-auto px-4">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        {/* شبكة المنتجات */}
        <div className={`grid gap-4 mb-8 ${
          displayType === 'grid'
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1'
        }`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* زر تصفح جميع المنتجات */}
        <div className="text-center">
          <Button asChild className="group">
            <Link to="/products" className="flex items-center gap-2">
              تصفح جميع المنتجات
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsPreview;
