import React from 'react';
import {
    ShoppingCart, Search, Users, CreditCard, Settings,
    Keyboard, Zap, ScanBarcode, ArrowLeft, Maximize, Smartphone,
    ChevronDown, Hash, PenTool, LayoutTemplate, BoxIcon,
    Printer, Monitor, MousePointerClick, Star
} from 'lucide-react';

/* 
 * ------------------------------------------------------------------
 * PERFECT FIXED LAYOUT SYSTEM
 * Designed to fill A5 pages perfectly using Flexbox distribution.
 * ------------------------------------------------------------------
 */

const BrandIcon = ({ icon: Icon, active = false }: { icon: React.ElementType, active?: boolean }) => (
    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mb-2 ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
        <Icon className="w-5 h-5" />
    </div>
);

const ProcessMapArabic = () => (
    <div className="flex items-start justify-between w-full px-2 py-6 relative" dir="rtl">
        {/* Connecting Line */}
        <div className="absolute top-[2.5rem] left-0 w-full h-0.5 bg-slate-100 -z-10" />

        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={Search} active />
            <span className="text-[10px] font-bold text-slate-900 text-center">1. مسح / بحث</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={ShoppingCart} />
            <span className="text-[10px] font-bold text-slate-400 text-center">2. السلة</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={Users} />
            <span className="text-[10px] font-bold text-slate-400 text-center">3. العميل</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={CreditCard} active />
            <span className="text-[10px] font-bold text-slate-900 text-center">4. دفع</span>
        </div>
    </div>
);

const StepRow = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
    <div className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg border border-slate-100/50">
        <div className="font-mono text-lg font-bold text-slate-200 shrink-0 leading-none mt-1">
            {num}
        </div>
        <div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
                {title}
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed font-light text-justify">
                {desc}
            </p>
        </div>
    </div>
);

const ShortcutKey = ({ k, label }: { k: string, label: string }) => (
    <div className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
        <span className="font-bold font-mono text-sm text-slate-800 mb-1" dir="ltr">{k}</span>
        <span className="text-[9px] text-slate-500 font-medium">{label}</span>
    </div>
);

const ModeItem = ({ label, desc, color }: { label: string, desc: string, color: string }) => (
    <div className={`p-3 rounded-lg border-r-4 bg-slate-50 ${color}`}>
        <h4 className="font-bold text-xs text-slate-900 mb-1">{label}</h4>
        <p className="text-[9px] text-slate-500 leading-tight">{desc}</p>
    </div>
);

/*
 * PAGE 1 CONTENT
 * -------------------
 */
export const POSPage1 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-none">نظام البيع السريع</h1>
                        <p className="text-[10px] text-slate-400 pt-1 font-medium">سرعة • دقة • سهولة</p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    واجهة مصممة لإنجاز أكبر عدد من الطلبات في أقل وقت ممكن. اتبع المسار البسيط أدناه لإتمام أي عملية.
                </p>
            </div>

            {/* Visual Diagram */}
            <div className="my-2">
                <ProcessMapArabic />
            </div>

            {/* Detailed Steps (Flex Grow to Fill Space) */}
            <div className="flex flex-col gap-3 flex-1 justify-center">
                <StepRow
                    num="01"
                    title="المسح والإدخال الذكي"
                    desc="النظام جاهز دائماً للمسح. استخدم القارئ لإضافة المنتجات فوراً. للمنتجات بدون باركود، اضغط (F2) للبحث بالاسم. الموازين تُقرأ تلقائياً."
                />
                <StepRow
                    num="02"
                    title="إدارة سلة المشتريات"
                    desc="اضغط على أي منتج لتعديل الكمية أو السعر. يمكنك حذف سطر بالسحب أو زر الحذف. الإجمالي والضريبة يحسبان لحظياً."
                />
                <StepRow
                    num="03"
                    title="تعدد المهام (Tabs)"
                    desc="لا داعي لانتظار الزبون! افتح فاتورة جديدة من علامة (+) لخدمة زبون آخر، ثم عد للفاتورة الأولى لاحقاً. (مثل متصفح الإنترنت)."
                />
                <StepRow
                    num="04"
                    title="خيارات الدفع والمرونة"
                    desc="للدفع النقدي السريع اضغط (مسافة). للدفع بالبطاقة أو الآجل اضغط (F10). الفاتورة تطبع تلقائياً عند النجاح."
                />
            </div>

            {/* Bottom Note */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 text-slate-400">
                <Star className="w-4 h-4 shrink-0" />
                <p className="text-[9px]">
                    نصيحة: تأكد من تحديد "الطابعة الافتراضية" من الإعدادات لضمان الطباعة المباشرة بدون نوافذ منبثقة.
                </p>
            </div>
        </div>
    );
};

/*
 * PAGE 2 CONTENT
 * -------------------
 */
export const POSPage2 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <Settings className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-none">التحكم المتقدم</h1>
                    <p className="text-[10px] text-slate-400 pt-1 font-medium">لوحة المفاتيح • الأوضاع • الأدوات</p>
                </div>
            </div>

            {/* Shortcut Grid */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-orange-500" />
                        الإختصارات الأساسية
                    </h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <ShortcutKey k="F2" label="بحث شامل" />
                    <ShortcutKey k="F10" label="دفع / إنهاء" />
                    <ShortcutKey k="Space" label="دفع نقدي سريع" />
                    <ShortcutKey k="Esc" label="إلغاء / عودة" />
                    <ShortcutKey k="Alt+1" label="وضع البيع" />
                    <ShortcutKey k="Alt+2" label="وضع الإرجاع" />
                    <ShortcutKey k="Del" label="حذف منتج" />
                    <ShortcutKey k="F11" label="أخذ الوزن" />
                </div>
            </div>

            {/* Modes Section */}
            <div className="flex-1 flex flex-col gap-3 justify-center mb-6">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <Monitor className="w-4 h-4 text-orange-500" />
                    أوضاع العمل المخصصة
                </h3>

                <ModeItem
                    label="1. وضع البيع (Standard)"
                    desc="الوضع الطبيعي الافتراضي بخلفية بيضاء. يستخدم لإصدار الفواتير وقبض المبالغ."
                    color="border-r-emerald-500"
                />
                <ModeItem
                    label="2. وضع الإرجاع (Returns)"
                    desc="يتميز بإطار برتقالي. يستخدم لاسترجاع بضاعة من الزبون، حيث يعيد النظام الكمية للمخزون ويخصم المبلغ من الصندوق."
                    color="border-r-orange-500"
                />
                <ModeItem
                    label="3. وضع التلف (Losses)"
                    desc="يتميز بإطار أحمر. يستخدم لإخراج المنتجات التالفة أو المنتهية الصلاحية من المخزون دون التأثير على رصيد الصندوق المالي."
                    color="border-r-red-500"
                />
            </div>

            {/* Footer Tools Grid */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded text-slate-500"><Printer className="w-4 h-4" /></div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-800">إعادة الطباعة</span>
                        <span className="block text-[9px] text-slate-400">اطبع نسخة أخرى (Shift+P)</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded text-slate-500"><MousePointerClick className="w-4 h-4" /></div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-800">الدفع الآجل</span>
                        <span className="block text-[9px] text-slate-400">سجل دفعة واترك الباقي ديناً</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
