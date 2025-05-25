import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Award, DollarSign, Settings, CalendarClock, HelpCircle, Clock, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LoyaltyPointsTabProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const LoyaltyPointsTab: React.FC<LoyaltyPointsTabProps> = ({ form, organizationId, productId }) => {
  const { control, watch } = form;

  const loyaltyPointsEnabled = watch('marketingSettings.loyalty_points_enabled');
  const redeemPointsEnabled = watch('marketingSettings.redeem_points_for_discount');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="mr-2 h-6 w-6" />
          نقاط الولاء
        </CardTitle>
        <CardDescription>
          قم بإعداد وتخصيص برنامج نقاط الولاء لمنتجاتك لتعزيز تفاعل العملاء ومكافأتهم.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 flex items-center justify-center mb-4 mx-auto border-2 border-orange-200 dark:border-orange-700">
              <div className="relative">
                <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-orange-300/20 rounded-full animate-ping opacity-75" />
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-3">
            قريباً سيتم إطلاق هذه الخاصية
          </h3>
          
          <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
            نحن نعمل على تطوير نظام نقاط الولاء المتكامل ليوفر لك ولعملائك تجربة مميزة ومكافآت رائعة.
          </p>
          
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700/50 max-w-lg">
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5" />
              ما يمكنك توقعه:
            </h4>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-2 text-right">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                برنامج نقاط ولاء شامل ومتكامل
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                مكافآت وعروض مخصصة للعملاء المميزين
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                تقارير تفصيلية لمتابعة أداء البرنامج
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                إعدادات مرنة للنقاط والمكافآت
              </li>
            </ul>
          </div>
        </div>

        {/* تم حذف المحتوى الأصلي المخفي */}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsTab; 