import React from 'react';
import {
    ClipboardList, RefreshCw, UserCheck, Wallet,
    FileText, AlertTriangle, Printer, Search,
    Filter, ArrowDownLeft, Receipt, Trash2,
    Users, CreditCard, PieChart
} from 'lucide-react';

/* 
 * ------------------------------------------------------------------
 * ORDERS & DEBTS VISUAL COMPONENTS
 * Matches the "Swiss Architectural" system of the POS section.
 * ------------------------------------------------------------------
 */

const BrandIcon = ({ icon: Icon, active = false, color }: { icon: React.ElementType, active?: boolean, color?: string }) => (
    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mb-2 ${active ? `bg-slate-900 border-slate-900 text-white` : 'bg-white border-slate-100 text-slate-300'}`}>
        <Icon className={`w-5 h-5 ${color ? color : ''}`} />
    </div>
);

const FeatureCard = ({ title, icon: Icon, desc }: { title: string, icon: React.ElementType, desc: string }) => (
    <div className="flex gap-3 p-3 border border-slate-100 rounded-lg bg-white items-start">
        <div className="p-2 bg-slate-50 rounded-lg shrink-0 text-slate-600">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">{title}</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
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

/*
 * PAGE 5: ORDERS & SEARCH
 */
export const OrdersPage1 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-none">سجل الطلبيات</h1>
                        <p className="text-[10px] text-slate-400 pt-1 font-medium">بحث • تصفية • إدارة</p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    مركز التحكم بجميع المبيعات السابقة. يمكنك البحث، إعادة الطباعة، أو حتى إلغاء الطلبيات وتعديلها.
                </p>
            </div>

            {/* Features Search Grid */}
            <div className="grid grid-cols-1 gap-3 my-2">
                <FeatureCard
                    title="البحث الذكي والتصفية"
                    icon={Search}
                    desc="استخدم الفلاتر للوصول لأي طلبية بسرعة: حسب التاريخ، اسم الزبون، أو رقم الفاتورة. النتائج تظهر فورياً."
                />
                <FeatureCard
                    title="تعديل وإلغاء الطلبيات"
                    icon={Trash2}
                    desc="يمكنك إلغاء أي فاتورة خاطئة أو تعديل محتوياتها طالما لديك الصلاحية. يتم تسجيل كل تعديل في سجل الأحداث."
                />
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-3 flex-1 justify-center mt-2">
                <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-orange-500" />
                    كيفية استرجاع (إرجاع) المنتجات
                </h3>
                <StepRow
                    num="01"
                    title="تحديد الطلبية"
                    desc="ابحث عن الطلبية الأصلية في السجل باستخدام رقم الفاتورة أو اسم الزبون."
                />
                <StepRow
                    num="02"
                    title="الإرجاع السريع"
                    desc="اضغط زر 'إرجاع' (Return). اختر المنتجات المراد إرجاعها والكمية. سيقوم النظام آلياً بإعادتها للمخزون."
                />
                <StepRow
                    num="03"
                    title="استرداد المبلغ"
                    desc="سيظهر المبلغ المستحق للإرجاع. يمكنك إعادته نقداً للعميل أو تسجيله كرصيد دائن في حسابه."
                />
            </div>

            {/* Footer Tip */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 text-slate-400">
                <Printer className="w-4 h-4" />
                <p className="text-[9px]">
                    يمكنك طباعة نسخة ثانية من الفاتورة في أي وقت بالضغط على أيقونة الطابعة.
                </p>
            </div>
        </div>
    );
};

/*
 * PAGE 6: CUSTOMERS & DEBTS
 */
export const OrdersPage2 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <UserCheck className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-none">العملاء والمديونيات</h1>
                    <p className="text-[10px] text-slate-400 pt-1 font-medium">سجل الديون • الدفعات • التقارير</p>
                </div>
            </div>

            {/* Customer Debt Flow */}
            <div className="mb-6">
                <div className="flex items-start justify-between w-full px-2 py-4 relative" dir="rtl">
                    {/* Connecting Line */}
                    <div className="absolute top-[2rem] left-0 w-full h-0.5 bg-slate-100 -z-10" />

                    <div className="flex flex-col items-center bg-white px-2 z-10 w-1/3">
                        <BrandIcon icon={Users} active />
                        <span className="text-[10px] font-bold text-slate-900 text-center">اختيار العميل</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-2 z-10 w-1/3">
                        <BrandIcon icon={CreditCard} color="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500 text-center">بيع آجل (دين)</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-2 z-10 w-1/3">
                        <BrandIcon icon={Wallet} color="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 text-center">تسديد دفعة</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 justify-center">
                <FeatureCard
                    title="ملف العميل الشامل"
                    icon={FileText}
                    desc="لكل عميل صفحة خاصة تعرض تاريخ مشترياته، ديونه الحالية، ومتوسط إنفاقه. يساعدك هذا في معرفة أفضل زبائنك."
                />

                <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-orange-500" />
                    إدارة الديون (الكريدي)
                </h3>
                <StepRow
                    num="01"
                    title="البيع بالدين"
                    desc="في شاشة البيع، اختر العميل ثم اضغط 'دفع آجل'. سيتم تسجيل المبلغ كدين عليه."
                />
                <StepRow
                    num="02"
                    title="تسجيل دفعة (Rembourser)"
                    desc="عندما يأتي العميل للسداد، اذهب لصفحة 'الديون'، ابحث عنه، واضغط 'دفع'. يمكنك تسجيل دفعة جزئية أو كاملة."
                />
            </div>

            {/* Footer */}
            <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-bold text-slate-700">تنبيه ذكي</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">
                    سيقوم النظام بتنبيهك تلقائياً إذا تخطى العميل "الحد الأقصى للدين" المسموح به (إذا تم تفعيله).
                </p>
            </div>
        </div>
    );
};

/*
 * PAGE 7: LOSSES & INVOICES
 */
export const OrdersPage3 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <PieChart className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-none">الخسائر والفواتير</h1>
                    <p className="text-[10px] text-slate-400 pt-1 font-medium">الهالك • التلف • الفوترة الرسمية</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-2 flex-1">
                {/* Losses Section */}
                <div className="border border-red-100 bg-red-50/30 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-red-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        التصريح بالخسائر (Loss Declarations)
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed mb-3">
                        نظام دقيق لتسوية المخزون وتحديد أسباب النقص (تلف، سرقة، انتهاء صلاحية) لضمان دقة التقارير المالية.
                    </p>

                    <div className="space-y-2">
                        <StepRow
                            num="01"
                            title="إنشاء التصريح"
                            desc="ابدأ 'تصريح جديد'. امسح المنتجات وحدد السبب (مثلاً: انتهاء صلاحية/Expiry). التطبيق يحسب تكلفة الخسارة (Cost) فوراً."
                        />
                        <StepRow
                            num="02"
                            title="دورة الاعتماد"
                            desc="التصاريح تبدأ بحالة 'معلق' (Pending). يجب على المدير مراجعتها واعتمادها (Approve) ليتم خصم الكميات من المخزون رسمياً."
                        />
                    </div>
                </div>

                {/* Invoices Section */}
                <div className="border border-slate-100 bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-500" />
                        نظام الفوترة المتقدم (Advanced Invoicing)
                    </h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                        أداة قوية للتعامل مع العملاء والشركات (B2B). لا تكتفِ بالإيصالات الصغيرة، أصدر فواتير رسمية كاملة.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700">فاتورة شكلية (Proforma)</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700">فاتورة مجمعة (Combined)</span>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400">
                        * الفاتورة المجمعة تتيح لك دمج عدة طلبيات لعميل واحد في فاتورة شهرية واحدة.
                    </p>
                </div>
            </div>

            {/* Footer Quote */}
            <div className="flex items-end justify-center pb-2 pt-2 border-t border-slate-50 text-center">
                <p className="text-[9px] text-slate-300 italic max-w-xs">
                    "التصريح الدقيق بالخسائر يحمي أرباحك الحقيقية، والفوترة الاحترافية تبني الثقة مع عملائك."
                </p>
            </div>
        </div>
    );
};
