import React from 'react';
import {
    ShoppingCart, Search, Package, Users, CreditCard, Settings,
    Keyboard, Zap, Monitor, Barcode, Printer, ArrowRight,
    ScanBarcode, MousePointerClick, RefreshCcw, Trash2,
    Banknote, Split, AlertTriangle
} from 'lucide-react';

/* 
  Visual Components for "Diagram-like" Explanations
*/

const FlowStep = ({
    icon: Icon,
    title,
    desc,
    isLast = false
}: {
    icon: React.ElementType,
    title: string,
    desc: string,
    isLast?: boolean
}) => (
    <div className="relative flex gap-4">
        {/* Left Line Graphic */}
        <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-600 shadow-sm z-10 shrink-0">
                <Icon className="w-5 h-5" />
            </div>
            {!isLast && <div className="w-0.5 flex-1 bg-slate-100 my-2" />}
        </div>

        {/* Content */}
        <div className={`pb-8 ${isLast ? '' : ''}`}>
            <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[90%]">{desc}</p>
        </div>
    </div>
);

const MiniProcessDiagram = ({ steps }: { steps: { label: string, icon: React.ElementType }[] }) => (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100 my-4 shadow-sm break-inside-avoid">
        {steps.map((step, idx) => (
            <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-orange-600 shadow-sm">
                        <step.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">{step.label}</span>
                </div>

                {idx < steps.length - 1 && (
                    <div className="flex-1 h-px bg-slate-300 mx-2 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-slate-300" />
                    </div>
                )}
            </React.Fragment>
        ))}
    </div>
);

/* 
  Part 1: The Core Sales Cycle
*/
export function POSSectionPart1() {
    return (
        <div className="h-full flex flex-col py-2">
            {/* Header Diagram: The Big Picture */}
            <div className="mb-8 break-inside-avoid">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">دورة البيع السريعة</h2>
                </div>
                <MiniProcessDiagram steps={[
                    { label: 'مسح/بحث', icon: Search },
                    { label: 'السلة', icon: ShoppingCart },
                    { label: 'العميل', icon: Users },
                    { label: 'الدفع', icon: CreditCard },
                ]} />
            </div>

            {/* Detailed Flow */}
            <div className="flex-1 pl-2">
                <FlowStep
                    icon={ScanBarcode}
                    title="1. إضافة المنتجات"
                    desc="امسح الباركود مباشرة (أسرع طريقة) أو اضغط F2 للبحث بالاسم. المنتجات الموزونة ستطلب الوزن تلقائياً."
                />

                <FlowStep
                    icon={MousePointerClick}
                    title="2. التحكم في السلة"
                    desc="اضغط على أي منتج لتعديل (الكمية، السعر، أو الخصم). اسحب لليسار للحذف. يمكنك تعليق الطلب لخدمة عميل آخر."
                />

                <FlowStep
                    icon={Users}
                    title="3. تحديد العميل (اختياري)"
                    desc="للبيع النقدي السريع: اتركها فارغة. للبيع الآجل (الكريدي) أو لنقاط الولاء: يجب اختيار عميل مسجل."
                    isLast
                />
            </div>

            {/* Pro Tip Box */}
            <div className="mt-auto bg-slate-900 text-white p-4 rounded-xl shadow-lg break-inside-avoid">
                <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-xs mb-1 text-orange-200">وضع التبويبات (Tabs)</h4>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                            يمكنك فتح أكثر من فاتورة في نفس الوقت (مثل المتصفح). اضغط على علامة (+) في الشريط العلوي لخدمة زبون جديد دون إلغاء طلب الزبون الحالي.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* 
  Part 2: Advanced & Modes & Shortcuts
*/
const ModeBadge = ({ title, kbd, info, color }: { title: string, kbd: string, info: string, color: string }) => (
    <div className={`p-3 rounded-lg border ${color} bg-opacity-50 flex flex-col gap-2 break-inside-avoid`}>
        <div className="flex justify-between items-center">
            <span className="font-bold text-xs text-slate-800">{title}</span>
            <kbd className="px-1.5 py-0.5 bg-white text-[9px] font-mono border border-slate-200 rounded text-slate-500">{kbd}</kbd>
        </div>
        <p className="text-[9px] text-slate-500 leading-tight">{info}</p>
    </div>
);

export function POSSectionPart2() {
    return (
        <div className="h-full flex flex-col py-2">

            {/* Payment Section */}
            <div className="mb-6 break-inside-avoid">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">أنظمة الدفع والفوترة</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-green-600">
                            <Banknote className="w-4 h-4" />
                            <span className="font-bold text-xs">نقدي / فوري</span>
                        </div>
                        <p className="text-[9px] text-slate-500">الدفع الافتراضي. يمكنك تفعيل "الدفع السريع (F10)" لتجاوز شاشة التأكيد.</p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                            <Split className="w-4 h-4" />
                            <span className="font-bold text-xs">دفع مجزأ / آجل</span>
                        </div>
                        <p className="text-[9px] text-slate-500">ادفع جزء واترك الباقي ديناً. يتم تسجيل الدين تلقائياً في حساب العميل.</p>
                    </div>
                </div>
            </div>

            {/* Modes Grid */}
            <div className="mb-6 break-inside-avoid">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <RefreshCcw className="w-4 h-4 text-orange-500" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">أوضاع العمل</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <ModeBadge
                        title="وضع البيع"
                        kbd="Alt+1"
                        info="الوضع الافتراضي للبيع."
                        color="border-green-100 bg-green-50"
                    />
                    <ModeBadge
                        title="وضع الإرجاع"
                        kbd="Alt+2"
                        info="يعيد للمخزون وينقص الكاش."
                        color="border-orange-100 bg-orange-50"
                    />
                    <ModeBadge
                        title="وضع التلف"
                        kbd="Alt+3"
                        info="ينقص المخزون بدون كاش."
                        color="border-red-100 bg-red-50"
                    />
                </div>
            </div>

            {/* Ultimate Shortcut Grid Footer */}
            <div className="mt-auto border-t-2 border-slate-100 pt-4 break-inside-avoid">
                <h3 className="text-center text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">Quick Command Reference</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                    {['F2 بحث', 'F10 دفع', 'Esc إلغاء', 'Alt+1 بيع', 'Alt+2 إرجاع', 'Alt+3 تلف', 'F11 ملء', 'Space باركود'].map((k, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded p-1.5 text-[9px] font-mono font-bold text-slate-600">
                            {k}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
