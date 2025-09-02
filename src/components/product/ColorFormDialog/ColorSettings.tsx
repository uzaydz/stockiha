import React from 'react';
import { Settings, Hash, Image, Wand2, Star, Ruler, Loader2, CheckCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import ImageUploader from '@/components/ui/ImageUploader';

interface ColorSettingsProps {
  form: UseFormReturn<any>;
  useSizes: boolean;
  colorsCount: number;
  generatingBarcode: boolean;
  onGenerateBarcode: () => Promise<void>;
  getCurrentSizes: () => any[];
  className?: string;
}

const ColorSettings: React.FC<ColorSettingsProps> = ({
  form,
  useSizes,
  colorsCount,
  generatingBarcode,
  onGenerateBarcode,
  getCurrentSizes,
  className = '',
}) => {
  const currentBarcode = form.watch('barcode') || '';
  const currentImageUrl = form.watch('image_url') || '';
  const isDefault = form.watch('is_default') || false;
  const hasSizes = form.watch('has_sizes') || false;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* العنوان */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg">
          <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          الإعدادات المتقدمة
        </h3>
        <div className="h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 flex-1" />
      </div>

      {/* الباركود والصورة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الباركود */}
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                الباركود
              </FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        placeholder="باركود متغير المنتج" 
                        {...field} 
                        className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 pl-10"
                      />
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onGenerateBarcode}
                      disabled={generatingBarcode}
                      className="h-12 px-4 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-800/40 dark:hover:to-indigo-700/30"
                    >
                      {generatingBarcode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* معاينة الباركود */}
                  {currentBarcode && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>الباركود جاهز:</span>
                        <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded font-mono text-slate-900 dark:text-slate-100">
                          {currentBarcode}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* صورة اللون */}
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Image className="h-4 w-4" />
                صورة اللون
              </FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <ImageUploader
                    imageUrl={field.value}
                    onImageUploaded={(url) => field.onChange(url)}
                    label=""
                    maxSizeInMB={5}
                    folder="colors"
                    className="w-full"
                    compact={true}
                    aspectRatio="1:1"
                  />
                  
                  {currentImageUrl && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>تم رفع الصورة بنجاح</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* خيارات اللون */}
      <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            خيارات اللون
          </h4>
          
          <div className="space-y-5">
            {/* استخدام المقاسات */}
            {useSizes && (
              <FormField
                control={form.control}
                name="has_sizes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked && getCurrentSizes().length > 0) {
                              const totalQuantity = getCurrentSizes().reduce((sum: number, size: any) => sum + size.quantity, 0);
                              form.setValue('quantity', totalQuantity);
                              toast.success(`تم تفعيل المقاسات! الكمية المحسوبة: ${totalQuantity}`);
                            } else if (checked) {
                              toast.success('تم تفعيل المقاسات! يمكنك الآن إضافة مقاسات مختلفة');
                            }
                          }}
                          className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                      </FormControl>
                      <div className="space-y-2 leading-none flex-1">
                        <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                          <Ruler className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          يحتوي على مقاسات متعددة
                        </FormLabel>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          فعّل هذا الخيار إذا كان هذا اللون متوفر بمقاسات مختلفة (S, M, L, XL)
                        </p>
                        {hasSizes && (
                          <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <p className="text-xs text-indigo-700 dark:text-indigo-300">
                              ✨ يمكنك الآن إدارة المقاسات من تبويب "المقاسات"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            {/* اللون الافتراضي */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={colorsCount === 0}
                        className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                      />
                    </FormControl>
                    <div className="space-y-2 leading-none flex-1">
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                        <Star className={`h-4 w-4 ${isDefault ? 'text-amber-500 fill-amber-500' : 'text-amber-600 dark:text-amber-400'}`} />
                        اللون الافتراضي
                      </FormLabel>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        هذا اللون سيظهر كخيار افتراضي عند عرض المنتج للعملاء
                      </p>
                      {isDefault && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            ⭐ هذا اللون محدد كافتراضي
                          </p>
                        </div>
                      )}
                      {colorsCount === 0 && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            💡 هذا هو اللون الأول، سيكون افتراضياً تلقائياً
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorSettings;
