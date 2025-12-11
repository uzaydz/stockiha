import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Store, Globe, Package, HelpCircle, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface ProductVisibilitySettingsProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductVisibilitySettings({ form }: ProductVisibilitySettingsProps) {
  return (
    <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-emerald-500/5 via-emerald-500/3 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 dark:from-emerald-500/30 dark:to-emerald-500/15 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
            <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-foreground text-xs sm:text-sm truncate block">إعدادات العرض والنشر</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground block mt-0.5">تحكم في كيفية ظهور المنتج للعملاء</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background/50 to-background">

        {/* 1. عرض المنتج في المتجر */}
        <FormField
          control={form.control}
          name="show_in_store"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start sm:items-center justify-between rounded-lg border border-border/60 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-background to-background/80">
              <div className="space-y-0.5 sm:space-y-1 flex-1">
                <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                  عرض المنتج في المتجر
                  <span title="عند تفعيل هذا الخيار، سيظهر المنتج للعملاء في واجهة المتجر ويمكنهم شراؤه">
                    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                  </span>
                </FormLabel>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  يمكن للعملاء رؤية المنتج وشراؤه من متجرك
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* 2. السوق الشاملة (قريباً) */}
        <FormField
          control={form.control}
          name="allow_marketplace"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start sm:items-center justify-between rounded-lg border border-border/60 p-3 sm:p-4 shadow-sm bg-gradient-to-r from-purple-50/30 to-indigo-50/20 dark:from-purple-950/20 dark:to-indigo-950/10 relative overflow-hidden">
              {/* شارة "قريباً" */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 gap-1">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  قريباً
                </Badge>
              </div>

              <div className="space-y-0.5 sm:space-y-1 flex-1 pt-5 sm:pt-0">
                <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                  السوق الشاملة (Marketplace)
                  <span title="اعرض منتجاتك في السوق الشاملة لملايين العملاء وزد مبيعاتك مجاناً">
                    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                  </span>
                </FormLabel>
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                    اعرض منتجك لملايين العملاء في السوق الشاملة
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3 h-3" />
                    <span className="font-medium">زد مبيعاتك مجاناً!</span>
                  </div>
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  disabled={true} // معطل حالياً - قريباً
                  className="data-[state=checked]:bg-purple-600 opacity-50"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* 3. إخفاء كمية المخزون */}
        <FormField
          control={form.control}
          name="hide_stock_quantity"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start sm:items-center justify-between rounded-lg border border-border/60 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-background to-background/80">
              <div className="space-y-0.5 sm:space-y-1 flex-1">
                <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                  إخفاء كمية المخزون
                  <span title="عند تفعيل هذا الخيار، لن يرى العملاء كم منتج متبقي في المخزون">
                    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                  </span>
                </FormLabel>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  لن يرى العملاء كم منتج متبقي في المخزون
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-amber-600"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* نصيحة */}
        <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2.5 sm:p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
          <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
            <span className="text-base leading-none">💡</span>
            <span>
              <strong>نصيحة:</strong> إخفاء كمية المخزون يمكن أن يمنع العملاء من تأجيل الشراء عند رؤية مخزون كبير.
            </span>
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
