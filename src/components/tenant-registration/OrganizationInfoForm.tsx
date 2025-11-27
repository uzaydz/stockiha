import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { ArrowRight, Check, Loader2, Building2, Globe } from 'lucide-react';

interface OrganizationInfoFormProps {
    form: UseFormReturn<any>;
    onPrevious: () => void;
    onSubmit: () => void;
    isLoading?: boolean;
}

export const OrganizationInfoForm = ({
    form,
    onPrevious,
    onSubmit,
    isLoading = false
}: OrganizationInfoFormProps) => {
    return (
        <div className="space-y-6" dir="rtl">
            <div className="space-y-5">
                <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">اسم المؤسسة</FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="مثال: متجر الأناقة"
                                        className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                        dir="rtl"
                                    />
                                </FormControl>
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <FormLabel htmlFor="subdomain" className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">رابط المتجر</FormLabel>
                    <FormField
                        control={form.control}
                        name="subdomain"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="flex flex-col sm:flex-row items-stretch shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-300 bg-white dark:bg-slate-900/50 h-auto sm:h-14">
                                        <div className="bg-slate-50 dark:bg-slate-800 border-b sm:border-b-0 sm:border-l border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center justify-center sm:justify-start text-sm font-bold text-slate-600 dark:text-slate-300 font-mono tracking-wide shrink-0 min-w-[140px]" dir="ltr">
                                            <Globe className="w-4 h-4 mr-2 opacity-50" />
                                            .stockiha.com
                                        </div>
                                        <div className="flex-1 relative">
                                            <Input
                                                {...field}
                                                id="subdomain"
                                                placeholder="your-store"
                                                className="h-14 border-0 focus-visible:ring-0 rounded-none bg-transparent pl-4 font-mono text-left lowercase placeholder:text-slate-300 text-base"
                                                dir="ltr"
                                                onChange={(e) => {
                                                    const value = e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
                                                    field.onChange(value);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </FormControl>
                                <FormDescription className="text-xs text-slate-500 mt-2 mr-1">
                                    يمكنك استخدام الأحرف الإنجليزية والأرقام والشرطات (-) فقط
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    {[
                        'متجر إلكتروني متكامل مجاناً',
                        'لوحة تحكم شاملة للمبيعات',
                        'نظام إدارة مخزون ذكي',
                        'دعم فني مباشر 24/7'
                    ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-8 flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrevious}
                    className="h-14 px-8 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
                    disabled={isLoading}
                >
                    <ArrowRight className="h-5 w-5 ml-2" />
                    <span>السابق</span>
                </Button>

                <Button
                    type="button"
                    onClick={onSubmit}
                    className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 text-lg"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin ml-2" />
                            <span>جاري تهيئة المتجر...</span>
                        </>
                    ) : (
                        <span>إطلاق متجري الآن 🚀</span>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default OrganizationInfoForm;
