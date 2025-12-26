import React from 'react';
import {
    ClipboardList, ScanBarcode, CheckCircle2, RotateCcw,
    History, WifiOff, Box, ArrowRight,
    Search,
    AlertTriangle,
    Eye,
    EyeOff
} from 'lucide-react';

/* 
 * ------------------------------------------------------------------
 * INVENTORY VISUAL COMPONENTS
 * Matches the "Swiss Architectural" system of the POS section.
 * ------------------------------------------------------------------
 */

const BrandIcon = ({ icon: Icon, active = false, color }: { icon: React.ElementType, active?: boolean, color?: string }) => (
    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mb-2 ${active ? `bg-slate-900 border-slate-900 text-white` : 'bg-white border-slate-100 text-slate-300'}`}>
        <Icon className={`w-5 h-5 ${color ? color : ''}`} />
    </div>
);

const InvProcessMap = () => (
    <div className="flex items-start justify-between w-full px-2 py-6 relative" dir="rtl">
        {/* Connecting Line */}
        <div className="absolute top-[2.5rem] left-0 w-full h-0.5 bg-slate-100 -z-10" />

        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={ClipboardList} active />
            <span className="text-[10px] font-bold text-slate-900 text-center">1. إنشاء</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={ScanBarcode} />
            <span className="text-[10px] font-bold text-slate-400 text-center">2. مسح</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={CheckCircle2} />
            <span className="text-[10px] font-bold text-slate-400 text-center">3. مراجعة</span>
        </div>
        <div className="flex flex-col items-center bg-white px-2 z-10 w-1/4">
            <BrandIcon icon={History} active />
            <span className="text-[10px] font-bold text-slate-900 text-center">4. اعتماد</span>
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

const ModeCard = ({ title, icon: Icon, desc }: { title: string, icon: React.ElementType, desc: string }) => (
    <div className="flex flex-col items-center text-center p-3 border border-slate-100 rounded-lg bg-white">
        <div className="p-2 bg-slate-50 rounded-lg mb-2 text-slate-600">
            <Icon className="w-4 h-4" />
        </div>
        <h4 className="font-bold text-xs text-slate-900 mb-1">{title}</h4>
        <p className="text-[9px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
);

/*
 * PAGE 1: INVENTORY WORKFLOW
 */
export const InventoryPage1 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Box className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-none">نظام الجرد الذكي</h1>
                        <p className="text-[10px] text-slate-400 pt-1 font-medium">مسح • تدقيق • تسوية</p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    قم بإدارة مخزونك بدقة متناهية. يدعم النظام الجرد المحلي (Offline) والمزامنة التلقائية عند الاتصال.
                </p>
            </div>

            {/* Visual Diagram */}
            <div className="my-2">
                <InvProcessMap />
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-3 flex-1 justify-center">
                <StepRow
                    num="01"
                    title="فتح جلسة جديدة"
                    desc="ابدأ بإنشاء جلسة. حدد النطاق (مثلاً: المخزن الرئيسي) ونوع الجرد (دوري، شامل، أو أعمى). سيقوم النظام بتحميل قاعدة البيانات محلياً."
                />
                <StepRow
                    num="02"
                    title="المسح والمطابقة"
                    desc="استخدم قارئ الباركود لمسح المنتجات في الرفوف. سيظهر النظام العدد المحسوب فوراً. يمكنك تعديل الكمية يدوياً في حال وجود تلف أو خطأ."
                />
                <StepRow
                    num="03"
                    title="المراجعة والفوارق"
                    desc="بعد الانتهاء، انتقل لشاشة المراجعة. سيعرض النظام الفوارق بين المخزون النظري والفعلي بالألون (أخضر للمطابق، أحمر للفارق)."
                />
                <StepRow
                    num="04"
                    title="الاعتماد النهائي"
                    desc="عند التأكد، اضغط 'اعتماد'. سيقوم النظام بتحديث أرصدة المخزون وتوليد حركات تسوية (Stock Adjustments) آلياً."
                />
            </div>

            {/* Offline Badge */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                <div className="flex gap-2 items-center">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-[9px] font-bold">يعمل بدون إنترنت (100% Offline Capable)</span>
                </div>
            </div>
        </div>
    );
};

/*
 * PAGE 2: MODES & DETAILS
 */
export const InventoryPage2 = () => {
    return (
        <div className="h-full flex flex-col justify-between" dir="rtl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <History className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-none">أنواع الجرد المتاحة</h1>
                    <p className="text-[10px] text-slate-400 pt-1 font-medium">اختر الاستراتيجية المناسبة لعملك</p>
                </div>
            </div>

            {/* Modes Grid */}
            <div className="grid grid-cols-1 gap-3 mb-8">
                <div className="flex gap-4 p-3 border-r-4 border-r-blue-500 bg-slate-50 rounded-lg">
                    <div className="mt-1"><RotateCcw className="w-5 h-5 text-blue-500" /></div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-900">1. الجرد الدوري (Cycle Count)</h3>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            الأكثر استخداماً. يسمح لك بجرد جزء محدد من المتجر (مثلاً: رف المشروبات فقط) دون إيقاف العمل في باقي الأقسام. مثال: جرد يومي سريع.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 p-3 border-r-4 border-r-emerald-500 bg-slate-50 rounded-lg">
                    <div className="mt-1"><Box className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-900">2. الجرد الشامل (Full Stocktake)</h3>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            يتطلب جرد كل صنف في المخزن. عادة ما يتم في نهاية السنة المالية. يفضل إيقاف البيع أثناء هذا النوع لضمان الدقة.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 p-3 border-r-4 border-r-slate-500 bg-slate-50 rounded-lg">
                    <div className="mt-1"><EyeOff className="w-5 h-5 text-slate-500" /></div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-900">3. الجرد الأعمى (Blind Count)</h3>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            للرقابة الصارمة. لا يظهر للموظف الكمية المتوقعة في النظام، بل يطلب منه إدخال ما يجده فعلياً فقط، لمنع التلاعب.
                        </p>
                    </div>
                </div>
            </div>

            {/* Color Legend */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 flex flex-col justify-center">
                <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-3 text-center">دليل ألوان الفوارق</h4>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700">مطابق (Matched)</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700">فارق بسيط (Review)</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                        <span className="text-[10px] font-bold text-red-700">فارق حاد (Alert)</span>
                        <span className="text-[10px] font-mono font-bold text-red-500">Qty Error</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center">
                <p className="text-[9px] text-slate-300">نظام الجرد المتكامل Pro Inventory System</p>
            </div>
        </div>
    );
};
