import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Database,
  Globe
} from 'lucide-react';

interface FacebookCatalogManagerProps {
  settings?: any;
}

interface ProductFeedItem {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new' | 'used' | 'refurbished';
  price: string;
  link: string;
  image_link: string;
  brand?: string;
  google_product_category?: string;
  product_type?: string;
  additional_image_link?: string[];
}

interface CatalogStats {
  total_products: number;
  active_products: number;
  out_of_stock: number;
  last_updated: string;
}

export const FacebookCatalogManager: React.FC<FacebookCatalogManagerProps> = ({ settings }) => {
  const [catalogId, setCatalogId] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const [catalogName, setCatalogName] = useState<string>('');
  const [feedUrl, setFeedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [feedData, setFeedData] = useState<ProductFeedItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('setup');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ar-DZ');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // جلب بيانات المنتجات من قاعدة البيانات
  const fetchProductsData = async () => {
    try {
      setIsLoading(true);
      addLog('بدء جلب بيانات المنتجات...');

      // استدعاء API للحصول على المنتجات
      const response = await fetch('/api/inventory/products-paginated?page=1&pageSize=1000');
      const data = await response.json();

      if (data.products) {
        const feedItems: ProductFeedItem[] = data.products.map((product: any) => ({
          id: product.id,
          title: product.name,
          description: product.description || product.name,
          availability: product.stock_quantity > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          price: `${product.price} DZD`,
          link: `${window.location.origin}/product/${product.id}`,
          image_link: product.thumbnailImage || product.images?.[0] || '',
          brand: product.brand || 'غير محدد',
          google_product_category: product.category || 'عام',
          product_type: product.subcategory || product.category || 'عام',
          additional_image_link: product.images?.slice(1) || []
        }));

        setFeedData(feedItems);
        setCatalogStats({
          total_products: feedItems.length,
          active_products: feedItems.filter(item => item.availability === 'in stock').length,
          out_of_stock: feedItems.filter(item => item.availability === 'out of stock').length,
          last_updated: new Date().toISOString()
        });

        addLog(`تم جلب ${feedItems.length} منتج بنجاح`);
      }
    } catch (error) {
      addLog(`خطأ في جلب البيانات: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // إنشاء Product Feed بصيغة XML
  const generateProductFeedXML = () => {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>منتجات المتجر</title>
    <link>${window.location.origin}</link>
    <description>كتالوج منتجات المتجر</description>`;

    const xmlItems = feedData.map(item => `
    <item>
      <g:id>${item.id}</g:id>
      <g:title><![CDATA[${item.title}]]></g:title>
      <g:description><![CDATA[${item.description}]]></g:description>
      <g:link>${item.link}</g:link>
      <g:image_link>${item.image_link}</g:image_link>
      <g:availability>${item.availability}</g:availability>
      <g:price>${item.price}</g:price>
      <g:condition>${item.condition}</g:condition>
      <g:brand><![CDATA[${item.brand}]]></g:brand>
      <g:google_product_category><![CDATA[${item.google_product_category}]]></g:google_product_category>
      <g:product_type><![CDATA[${item.product_type}]]></g:product_type>
      ${item.additional_image_link?.map(img => `<g:additional_image_link>${img}</g:additional_image_link>`).join('') || ''}
    </item>`).join('');

    const xmlFooter = `
  </channel>
</rss>`;

    return xmlHeader + xmlItems + xmlFooter;
  };

  // تحميل Product Feed
  const downloadProductFeed = () => {
    const xmlContent = generateProductFeedXML();
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-feed.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('تم تحميل Product Feed بنجاح');
  };

  // رفع Product Feed إلى الخادم
  const uploadProductFeed = async () => {
    try {
      setIsLoading(true);
      addLog('بدء رفع Product Feed...');

      const xmlContent = generateProductFeedXML();
      
      const response = await fetch('/api/facebook-catalog/upload-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedContent: xmlContent,
          catalogId,
          businessId
        })
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`تم رفع Product Feed بنجاح: ${result.message}`);
        setFeedUrl(result.feedUrl);
      } else {
        addLog('فشل في رفع Product Feed');
      }
    } catch (error) {
      addLog(`خطأ في رفع Product Feed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // إنشاء كتالوج جديد على Facebook
  const createFacebookCatalog = async () => {
    try {
      setIsLoading(true);
      addLog('بدء إنشاء كتالوج Facebook...');

      const response = await fetch('/api/facebook-catalog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: catalogName,
          businessId,
          accessToken: settings?.facebook?.access_token
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCatalogId(result.catalogId);
        addLog(`تم إنشاء الكتالوج بنجاح: ${result.catalogId}`);
      } else {
        addLog('فشل في إنشاء الكتالوج');
      }
    } catch (error) {
      addLog(`خطأ في إنشاء الكتالوج: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ربط الكتالوج بـ Pixel
  const linkCatalogToPixel = async () => {
    try {
      setIsLoading(true);
      addLog('بدء ربط الكتالوج بـ Pixel...');

      const response = await fetch('/api/facebook-catalog/link-pixel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalogId,
          pixelId: settings?.facebook?.pixel_id,
          accessToken: settings?.facebook?.access_token
        })
      });

      if (response.ok) {
        addLog('تم ربط الكتالوج بـ Pixel بنجاح');
      } else {
        addLog('فشل في ربط الكتالوج بـ Pixel');
      }
    } catch (error) {
      addLog(`خطأ في ربط الكتالوج: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            إدارة Facebook Product Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">الإعداد</TabsTrigger>
              <TabsTrigger value="feed">Product Feed</TabsTrigger>
              <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              <TabsTrigger value="logs">السجلات</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessId">معرف الأعمال (Business ID)</Label>
                  <Input
                    id="businessId"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="أدخل معرف الأعمال"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalogName">اسم الكتالوج</Label>
                  <Input
                    id="catalogName"
                    value={catalogName}
                    onChange={(e) => setCatalogName(e.target.value)}
                    placeholder="أدخل اسم الكتالوج"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalogId">معرف الكتالوج (Catalog ID)</Label>
                  <Input
                    id="catalogId"
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                    placeholder="أدخل معرف الكتالوج الموجود"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedUrl">رابط Product Feed</Label>
                  <Input
                    id="feedUrl"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="رابط Product Feed"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={createFacebookCatalog}
                  disabled={isLoading || !catalogName || !businessId}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  إنشاء كتالوج جديد
                </Button>
                <Button 
                  onClick={linkCatalogToPixel}
                  disabled={isLoading || !catalogId}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  ربط بـ Pixel
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>معرف مجموعة البيانات:</strong> 1286277189547078<br/>
                  <strong>موقع الويب:</strong> uzaydz3bvc3.localhost<br/>
                  تأكد من إدخال معرف الأعمال الصحيح لربط الكتالوج بحسابك.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="feed" className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  onClick={fetchProductsData}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  تحديث البيانات
                </Button>
                <Button 
                  onClick={downloadProductFeed}
                  disabled={feedData.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  تحميل Feed
                </Button>
                <Button 
                  onClick={uploadProductFeed}
                  disabled={isLoading || feedData.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  رفع Feed
                </Button>
              </div>

              {feedData.length > 0 && (
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold mb-2">معاينة Product Feed ({feedData.length} منتج)</h3>
                  <div className="space-y-2">
                    {feedData.slice(0, 5).map((item, index) => (
                      <div key={index} className="border-b pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-gray-600">{item.price}</p>
                          </div>
                          <Badge variant={item.availability === 'in stock' ? 'default' : 'secondary'}>
                            {item.availability}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {feedData.length > 5 && (
                      <p className="text-sm text-gray-500">... و {feedData.length - 5} منتج آخر</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {catalogStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-600">إجمالي المنتجات</p>
                          <p className="text-2xl font-bold">{catalogStats.total_products}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-600">متوفر</p>
                          <p className="text-2xl font-bold">{catalogStats.active_products}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm text-gray-600">غير متوفر</p>
                          <p className="text-2xl font-bold">{catalogStats.out_of_stock}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">معلومات إضافية</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>آخر تحديث:</strong> {catalogStats?.last_updated ? new Date(catalogStats.last_updated).toLocaleString('ar-DZ') : 'غير محدد'}</p>
                    <p><strong>معرف Pixel:</strong> {settings?.facebook?.pixel_id || 'غير محدد'}</p>
                    <p><strong>معرف مجموعة البيانات:</strong> 1286277189547078</p>
                    <p><strong>حالة Conversion API:</strong> {settings?.facebook?.conversion_api_enabled ? 'مفعل' : 'غير مفعل'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                <h3 className="font-semibold mb-2">سجل العمليات</h3>
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono">
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-gray-500">لا توجد سجلات حتى الآن</p>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setLogs([])}
                variant="outline"
                size="sm"
              >
                مسح السجلات
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
