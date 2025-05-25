import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calculator,
  ArrowRight,
  ShoppingCart,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductPricingProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductPricing({ form }: ProductPricingProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "wholesale_tiers",
  });

  const price = form.watch("price");
  const purchasePrice = form.watch("purchase_price");
  const compareAtPrice = form.watch("compare_at_price");

  // حسابات الربحية المتقدمة
  let profitMargin: number | null = null;
  let profitPercentage: number | null = null;
  let marginPercentage: number | null = null;
  let discountFromOriginal: number | null = null;

  if (typeof price === 'number' && typeof purchasePrice === 'number' && purchasePrice > 0) {
    profitMargin = price - purchasePrice;
    profitPercentage = (profitMargin / purchasePrice) * 100;
    marginPercentage = (profitMargin / price) * 100;
  }

  if (typeof compareAtPrice === 'number' && typeof price === 'number' && compareAtPrice > price) {
    discountFromOriginal = ((compareAtPrice - price) / compareAtPrice) * 100;
  }

  // تنسيق الأرقام بالدينار الجزائري
  const formatDZD = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return 'غير محدد';
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // حالة التحليل
  const getAnalysisStatus = () => {
    if (!price || !purchasePrice) return 'incomplete';
    if (profitMargin && profitMargin > 0) return 'profitable';
    if (profitMargin && profitMargin === 0) return 'break-even';
    return 'loss';
  };

  const analysisStatus = getAnalysisStatus();

  return (
    <div className="space-y-6">
      {/* Basic Pricing Section */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            التسعير الأساسي
            <Badge variant="outline" className="mr-auto">
              الدينار الجزائري
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Input Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Price */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      سعر الشراء (التكلفة)
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="pr-12 h-12 text-lg font-medium border-blue-200 focus:border-blue-400"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseFloat(val));
                          }}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground font-medium">
                          د.ج
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      التكلفة الفعلية لشراء أو إنتاج المنتج
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Selling Price */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <Package className="w-4 h-4 text-green-600" />
                      سعر البيع
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="pr-12 h-12 text-lg font-medium border-green-200 focus:border-green-400"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value));
                          }}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground font-medium">
                          د.ج
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      السعر الذي سيدفعه العميل
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Visual Price Comparison */}
          {purchasePrice && price && (
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                مقارنة الأسعار
              </h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">سعر الشراء</div>
                    <div className="text-lg font-bold text-blue-600">{formatDZD(purchasePrice)}</div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">سعر البيع</div>
                    <div className="text-lg font-bold text-green-600">{formatDZD(price)}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">الفرق</div>
                  <div className={`text-lg font-bold ${
                    profitMargin && profitMargin > 0 ? 'text-green-600' : 
                    profitMargin === 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatDZD(profitMargin)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compare At Price */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="compare_at_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium">
                    <Percent className="w-4 h-4 text-orange-600" />
                    سعر المقارنة (السعر القديم)
                    <Badge variant="secondary" className="text-xs">اختياري</Badge>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        className="pr-12 h-11"
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        د.ج
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {discountFromOriginal && (
                    <p className="text-xs text-green-600">
                      خصم {discountFromOriginal.toFixed(1)}% من السعر الأصلي
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Profit Analysis Section */}
      {(typeof price === 'number' || typeof purchasePrice === 'number') && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className={`p-2 rounded-full ${
                analysisStatus === 'profitable' ? 'bg-green-100' :
                analysisStatus === 'break-even' ? 'bg-yellow-100' :
                analysisStatus === 'loss' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <TrendingUp className={`h-4 w-4 ${
                  analysisStatus === 'profitable' ? 'text-green-600' :
                  analysisStatus === 'break-even' ? 'text-yellow-600' :
                  analysisStatus === 'loss' ? 'text-red-600' : 'text-gray-600'
                }`} />
              </div>
              تحليل الربحية المتقدم
              <Badge variant={
                analysisStatus === 'profitable' ? 'default' :
                analysisStatus === 'break-even' ? 'secondary' :
                analysisStatus === 'loss' ? 'destructive' : 'outline'
              }>
                {analysisStatus === 'profitable' ? 'مربح' :
                 analysisStatus === 'break-even' ? 'نقطة التعادل' :
                 analysisStatus === 'loss' ? 'خسارة' : 'غير مكتمل'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Alert */}
            {analysisStatus !== 'incomplete' && (
              <Alert className={
                analysisStatus === 'profitable' ? 'border-green-200 bg-green-50' :
                analysisStatus === 'break-even' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }>
                {analysisStatus === 'profitable' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                 analysisStatus === 'break-even' ? <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                 <AlertCircle className="h-4 w-4 text-red-600" />}
                <AlertDescription className={
                  analysisStatus === 'profitable' ? 'text-green-800' :
                  analysisStatus === 'break-even' ? 'text-yellow-800' :
                  'text-red-800'
                }>
                  {analysisStatus === 'profitable' ? 
                    `هذا المنتج مربح! ستحصل على ${formatDZD(profitMargin)} لكل وحدة مباعة.` :
                   analysisStatus === 'break-even' ?
                    'هذا المنتج في نقطة التعادل - لا ربح ولا خسارة.' :
                    `هذا المنتج يحقق خسارة قدرها ${formatDZD(Math.abs(profitMargin || 0))} لكل وحدة.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Profit Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Profit Margin */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <DollarSign className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-blue-900">هامش الربح</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>الفرق بين سعر البيع وسعر الشراء</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {formatDZD(profitMargin)}
                </div>
              </div>

              {/* Profit Percentage */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-1.5 rounded-full">
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-emerald-900">نسبة الربح</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-emerald-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>نسبة الربح من تكلفة الشراء</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-lg font-bold text-emerald-900">
                  {profitPercentage !== null ? `${profitPercentage.toFixed(1)}%` : 'غير محدد'}
                </div>
              </div>

              {/* Margin Percentage */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-1.5 rounded-full">
                      <Percent className="h-3 w-3 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-purple-900">هامش المبيعات</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-purple-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>نسبة الربح من سعر البيع</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {marginPercentage !== null ? `${marginPercentage.toFixed(1)}%` : 'غير محدد'}
                </div>
              </div>

              {/* ROI */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-1.5 rounded-full">
                      <Calculator className="h-3 w-3 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-orange-900">عائد الاستثمار</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-orange-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>نسبة العائد على الاستثمار (ROI)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-lg font-bold text-orange-900">
                  {profitPercentage !== null ? `${profitPercentage.toFixed(1)}%` : 'غير محدد'}
                </div>
              </div>
            </div>

            {/* Price Breakdown Chart */}
            {price && purchasePrice && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-medium mb-3">تحليل مكونات السعر</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">تكلفة المنتج</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-blue-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${(purchasePrice / price) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{((purchasePrice / price) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">هامش الربح</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-green-200 rounded-full">
                        <div 
                          className="h-2 bg-green-600 rounded-full" 
                          style={{ width: `${((profitMargin || 0) / price) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{marginPercentage !== null ? `${marginPercentage.toFixed(1)}%` : '0%'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wholesale Tiers Section */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              أسعار الجملة
              <Badge variant="secondary" className="text-xs">اختياري</Badge>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ min_quantity: undefined, price_per_unit: undefined })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة سعر
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">لا توجد أسعار جملة</p>
              <p className="text-xs">انقر "إضافة سعر" لإنشاء مستويات تسعير للكميات الكبيرة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div key={item.id} className="flex gap-3 p-4 border border-border rounded-lg bg-muted/20">
                  <FormField
                    control={form.control}
                    name={`wholesale_tiers.${index}.min_quantity`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="الحد الأدنى للكمية"
                            className="h-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`wholesale_tiers.${index}.price_per_unit`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="السعر للوحدة"
                              className="h-10 pr-10"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                              }}
                            />
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                              د.ج
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="px-3 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 