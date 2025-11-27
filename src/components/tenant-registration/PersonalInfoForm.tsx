import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { ArrowLeft, User, Mail, Phone, Lock, Loader2 } from 'lucide-react';

interface PersonalInfoFormProps {
    form: UseFormReturn<any>;
    onNext: () => void;
    isLoading?: boolean;
}

export const PersonalInfoForm = ({
    form,
    onNext,
    isLoading = false
}: PersonalInfoFormProps) => {
    return (
        <div className="space-y-6">
            <div className="space-y-5">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">الاسم الكامل</FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="أدخل اسمك الكامل"
                                        className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                        dir="rtl"
                                    />
                                </FormControl>
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">البريد الإلكتروني</FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="email"
                                        placeholder="name@company.com"
                                        className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                        dir="rtl"
                                    />
                                </FormControl>
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">رقم الهاتف</FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="tel"
                                        placeholder="05xxxxxxxx"
                                        className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                        dir="rtl"
                                    />
                                </FormControl>
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">كلمة المرور</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                            dir="rtl"
                                        />
                                    </FormControl>
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base text-slate-900 dark:text-slate-200 font-semibold mb-1.5 block">تأكيد كلمة المرور</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-14 px-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all duration-300 text-base"
                                            dir="rtl"
                                        />
                                    </FormControl>
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="pt-8">
                <Button
                    type="button"
                    onClick={onNext}
                    className="w-full h-14 text-lg bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-white dark:to-slate-100 dark:text-slate-900 dark:hover:from-slate-100 dark:hover:to-slate-200 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-white/5 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <>
                            <span>متابعة الخطوات</span>
                            <ArrowLeft className="h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PersonalInfoForm;
