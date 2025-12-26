import React from 'react';
import {
    ShoppingCart, Search, Users, CreditCard, Settings,
    Keyboard, Zap, ScanBarcode, ArrowDown, Maximize, Smartphone,
    ChevronDown, Hash, PenTool, LayoutTemplate, BoxIcon
} from 'lucide-react';

/* 
 * ------------------------------------------------------------------
 * PROFESSIONAL MINIMALIST SYSTEM (Orange & Slate Only)
 * ------------------------------------------------------------------
 */

const BrandIcon = ({ icon: Icon, active = false }: { icon: React.ElementType, active?: boolean }) => (
    <div className={`w-8 h-8 rounded border flex items-center justify-center ${active ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
        <Icon className="w-4 h-4" />
    </div>
);

export const ProcessMap = () => (
    <div className="flex items-center justify-between w-full px-4 py-8 relative">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-slate-100 -z-10" />

        {/* Nodes */}
        <div className="flex flex-col items-center gap-3 bg-white px-2 z-10">
            <BrandIcon icon={Search} active />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-900">Scan</span>
        </div>
        <div className="flex flex-col items-center gap-3 bg-white px-2 z-10">
            <BrandIcon icon={ShoppingCart} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Cart</span>
        </div>
        <div className="flex flex-col items-center gap-3 bg-white px-2 z-10">
            <BrandIcon icon={Users} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Client</span>
        </div>
        <div className="flex flex-col items-center gap-3 bg-white px-2 z-10">
            <BrandIcon icon={CreditCard} active />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-900">Pay</span>
        </div>
    </div>
);

export const StepRow = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
    <div className="flex gap-6 py-4 border-b border-slate-50 last:border-0 relative group">
        <div className="font-mono text-xl font-light text-slate-200 group-hover:text-orange-200 transition-colors">
            {num}
        </div>
        <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                {title}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-light text-justify">
                {desc}
            </p>
        </div>
    </div>
);

export const TechSpec = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-bold text-slate-900 font-mono">{value}</span>
    </div>
);

export const KeyCap = ({ k, label }: { k: string, label: string }) => (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-colors">
        <div className="h-6 min-w-[32px] px-1 flex items-center justify-center border border-slate-200 bg-white rounded text-[10px] font-bold text-slate-700 shadow-[0_2px_0_0_rgba(226,232,240,1)]">
            {k}
        </div>
        <span className="text-[10px] text-slate-500">{label}</span>
    </div>
);

// --- Data Structure ---

export interface POSContentBlock {
    id: string;
    type: 'header' | 'diagram' | 'list' | 'grid' | 'footer';
    weight: number;
    component: React.ReactNode;
}

export const posContentData: POSContentBlock[] = [
    // --- PAGE 1: CORE WORKFLOW ---
    {
        id: 'header-1',
        type: 'header',
        weight: 15,
        component: (
            <div className="mb-2">
                <div className="w-8 h-1 bg-orange-500 mb-4" />
                <h1 className="text-2xl font-light text-slate-900 mb-1">POS <b className="font-black">Workflow</b></h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Efficiency & Speed System</p>
            </div>
        )
    },
    {
        id: 'diagram-1',
        type: 'diagram',
        weight: 20,
        component: <ProcessMap />
    },
    {
        id: 'steps-1',
        type: 'list',
        weight: 50,
        component: (
            <div className="mt-4">
                <StepRow
                    num="01"
                    title="المسح والإدخال"
                    desc="النظام مصمم للسرعة القصوى. استخدم قارئ الباركود للإضافة الفورية، أو المفتاح F2 للبحث الذكي. يتم دمج المنتجات المتشابهة تلقائياً في سطر واحد."
                />
                <StepRow
                    num="02"
                    title="إدارة الجلسة الحالية"
                    desc="لدينا نظام 'Multi-Tab' يتيح لك خدمة 3 زبائن في وقت واحد. اضغط (+) لفتح فاتورة جديدة دون إغلاق الحالية."
                />
                <StepRow
                    num="03"
                    title="الفوترة والدفع"
                    desc="اختيار العميل ضروري فقط للديون. للدفع: (Space) للنقد السريع، أو (F10) لخيارات الدفع المتعددة (بطاقة/تقسيط)."
                />
            </div>
        )
    },
    {
        id: 'specs-1',
        type: 'grid',
        weight: 15,
        component: (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <h4 className="text-[10px] font-bold text-orange-600 mb-3 uppercase flex items-center gap-2">
                    <Zap className="w-3 h-3" /> System Specs
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <TechSpec label="Engine" value="React V2" />
                    <TechSpec label="Latency" value="<50ms" />
                    <TechSpec label="Offline" value="Supported" />
                    <TechSpec label="Sync" value="Auto" />
                </div>
            </div>
        )
    },

    // --- PAGE 2: CONTROLS & SHORTCUTS ---

    {
        id: 'header-2',
        type: 'header',
        weight: 15,
        component: (
            <div className="mb-6 pt-4">
                <div className="w-8 h-1 bg-slate-200 mb-4" />
                <h1 className="text-xl font-light text-slate-900 mb-1">Advanced <b className="font-black">Controls</b></h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Shortcuts & Modes</p>
            </div>
        )
    },
    {
        id: 'shortcuts-list',
        type: 'grid',
        weight: 40,
        component: (
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="border-r border-slate-100 pr-4">
                    <span className="block text-[9px] font-bold text-slate-900 uppercase mb-4 opacity-50">Essential Keys</span>
                    <div className="flex flex-col gap-1">
                        <KeyCap k="F2" label="بحث عن منتج" />
                        <KeyCap k="Space" label="دفع نقدي فوري" />
                        <KeyCap k="F10" label="قائمة الدفع" />
                        <KeyCap k="Esc" label="إلغاء / عودة" />
                    </div>
                </div>
                <div>
                    <span className="block text-[9px] font-bold text-slate-900 uppercase mb-4 opacity-50">Operations</span>
                    <div className="flex flex-col gap-1">
                        <KeyCap k="Alt+1" label="وضع البيع" />
                        <KeyCap k="Alt+2" label="وضع الإرجاع" />
                        <KeyCap k="Alt+3" label="وضع التلف" />
                        <KeyCap k="Shft+P" label="إعادة الطباعة" />
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'footer-notes',
        type: 'list',
        weight: 30,
        component: (
            <div className="border-t border-slate-100 pt-6">
                <StepRow
                    num="NB"
                    title="ملاحظات النظام"
                    desc="تأكد دائماً من الاتصال بالطابعة الافتراضية. في حالة انقطاع الإنترنت، سيستمر النظام بالعمل (Offline Mode) وسيتم مزامنة البيانات تلقائياً عند العودة."
                />
            </div>
        )
    }
];
