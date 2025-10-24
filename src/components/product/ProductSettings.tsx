import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { Star, Gift, Eye, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface ProductSettingsProps {
  form: UseFormReturn<any>;
}

export default function ProductSettings({ form }: ProductSettingsProps) {
  return (
    <TooltipProvider>
      <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-foreground text-xs sm:text-sm">إعدادات المنتج</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <div className="relative overflow-hidden group">
                    <div className="flex items-center space-x-3 space-x-reverse p-3 sm:p-4 border border-border/60 rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 dark:hover:from-amber-950/20 dark:hover:to-orange-950/10 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 dark:data-[state=checked]:bg-amber-600 dark:data-[state=checked]:border-amber-600 shadow-sm min-h-[44px] sm:min-h-auto"
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2 space-x-reverse flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl group-hover:from-amber-200 group-hover:to-amber-300 dark:group-hover:from-amber-800/80 dark:group-hover:to-amber-700/80 transition-all duration-300 shadow-sm flex-shrink-0">
                          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-medium text-foreground">منتج مميز</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-auto p-2 sm:p-0 -m-2 sm:m-0"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-amber-600 transition-colors cursor-help" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="max-w-[280px] sm:max-w-xs z-50 bg-popover border border-border shadow-lg"
                                side="top"
                                sideOffset={5}
                              >
                                <p className="text-xs">سيظهر المنتج في قسم المنتجات المميزة في الصفحة الرئيسية للمتجر.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">يظهر في المنتجات المميزة</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg sm:rounded-xl pointer-events-none" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_new"
              render={({ field }) => (
                <FormItem>
                  <div className="relative overflow-hidden group">
                    <div className="flex items-center space-x-3 space-x-reverse p-3 sm:p-4 border border-border/60 rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 dark:hover:from-green-950/20 dark:hover:to-emerald-950/10 hover:border-green-300/50 dark:hover:border-green-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 dark:data-[state=checked]:bg-green-600 dark:data-[state=checked]:border-green-600 shadow-sm min-h-[44px] sm:min-h-auto"
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2 space-x-reverse flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-800/80 dark:group-hover:to-green-700/80 transition-all duration-300 shadow-sm flex-shrink-0">
                          <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-medium text-foreground">منتج جديد</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-auto p-2 sm:p-0 -m-2 sm:m-0"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-green-600 transition-colors cursor-help" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="max-w-[280px] sm:max-w-xs z-50 bg-popover border border-border shadow-lg"
                                side="top"
                                sideOffset={5}
                              >
                                <p className="text-xs">سيتم وضع علامة "جديد" على المنتج وقد يظهر في قسم المنتجات الجديدة.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">يحمل علامة جديد</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg sm:rounded-xl pointer-events-none" />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="show_price_on_landing"
              render={({ field }) => (
                <FormItem>
                  <div className="relative overflow-hidden group">
                    <div className="flex items-center space-x-3 space-x-reverse p-3 sm:p-4 border border-border/60 rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 hover:border-blue-300/50 dark:hover:border-blue-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600 shadow-sm min-h-[44px] sm:min-h-auto"
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2 space-x-reverse flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800/80 dark:group-hover:to-blue-700/80 transition-all duration-300 shadow-sm flex-shrink-0">
                          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-medium text-foreground">إظهار السعر</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-auto p-2 sm:p-0 -m-2 sm:m-0"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="max-w-[280px] sm:max-w-xs z-50 bg-popover border border-border shadow-lg"
                                side="top"
                                sideOffset={5}
                              >
                                <p className="text-xs">تحديد ما إذا كان سعر المنتج سيظهر في صفحة المتجر أم سيتم إخفاؤه (مفيد للمنتجات التي تتطلب استفسار).</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">يظهر السعر في المتجر</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg sm:rounded-xl pointer-events-none" />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
