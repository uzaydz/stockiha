import React, { useRef } from 'react';
import { BookletImposer } from './stockiha-guide/BookletImposer';
import { GuideCoverPageV2, GuideBackCoverPageV2 } from './stockiha-guide/v2/covers';
import { POSPage1, POSPage2 } from './stockiha-guide/v2/POSFixedPages';
import { InventoryPage1, InventoryPage2 } from './stockiha-guide/v2/InventoryFixedPages';
import { OrdersPage1, OrdersPage2, OrdersPage3 } from './stockiha-guide/v2/OrdersHistoryFixedPages';
import { StockihaGuidePrintStyles } from './stockiha-guide/printStyles';
import { Button } from '@/components/ui/button';
import { Printer, BookOpen } from 'lucide-react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

/* 
  GuidePageContainer: 
  Wraps content in a standard A5 page container with header/footer.
*/
const GuidePageContainer = ({ children, title, pageNum }: { children: React.ReactNode, title: string, pageNum: number }) => (
    <section className="guide-page flex flex-col relative overflow-hidden bg-white">
        {/* Ultra-Compact Header */}
        <div className="px-8 pt-5 pb-2 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
                <div className="w-1 bg-orange-600 h-5 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">{title}</h2>
            </div>
            <div className="flex gap-2 items-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Stockiha POS</span>
                <span className="text-[10px] font-black text-slate-900 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">0{pageNum}</span>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-4 overflow-hidden">
            {children}
        </div>

        {/* Minimalist Footer */}
        <div className="h-8 px-8 flex items-center justify-between text-[8px] text-slate-300 font-medium tracking-widest uppercase border-t border-slate-50">
            <span>Stockiha POS Guide</span>
            <span>{pageNum}</span>
        </div>
    </section>

);

export default function StockihaGuideV2() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [layoutMode, setLayoutMode] = React.useState<'a5' | 'booklet'>('booklet');

    const handlePrint = () => {
        window.print();
    };

    return (
        <POSPureLayout>
            <div className="min-h-screen bg-slate-100 p-8 font-sans" dir="rtl">

                {/* Controls */}
                <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">دليل المستخدم V2</h1>
                            <p className="text-xs text-slate-500">جاهز للطباعة بصيغة مطوية (Booklet)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setLayoutMode('a5')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${layoutMode === 'a5' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                تصفح (A5)
                            </button>
                            <button
                                onClick={() => setLayoutMode('booklet')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${layoutMode === 'booklet' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                طباعة (Booklet)
                            </button>
                        </div>

                        <Button onClick={handlePrint} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                            <Printer className="w-4 h-4" />
                            <span>طباعة الدليل</span>
                        </Button>
                    </div>
                </div>

                <StockihaGuidePrintStyles layout={layoutMode} />

                {/* Guide Content Wrapper */}
                <div className={`mx-auto transition-all ${layoutMode === 'booklet' ? 'guide-booklet' : ''}`} data-print-layout={layoutMode}>

                    {/* Source Content (Hidden during booklet print, shown during A5 preview) */}
                    <div ref={containerRef} className={`guide-source-container flex flex-col items-center gap-8 print:block ${layoutMode === 'booklet' ? 'hidden' : ''}`}>

                        {/* Front Cover (Page 0) */}
                        <GuideCoverPageV2 />

                        {/* Fixed Page 1 */}
                        <GuidePageContainer title="نظام نقطة البيع" pageNum={1}>
                            <POSPage1 />
                        </GuidePageContainer>

                        {/* Fixed Page 2 */}
                        <GuidePageContainer title="التحكم والاختصارات" pageNum={2}>
                            <POSPage2 />
                        </GuidePageContainer>

                        {/* Fixed Page 3: Inventory Main */}
                        <GuidePageContainer title="نظام الجرد والمخزون" pageNum={3}>
                            <InventoryPage1 />
                        </GuidePageContainer>

                        {/* Fixed Page 4: Inventory Modes */}
                        <GuidePageContainer title="أنواع واستراتيجيات الجرد" pageNum={4}>
                            <InventoryPage2 />
                        </GuidePageContainer>

                        {/* Fixed Page 5: Orders & Returns */}
                        <GuidePageContainer title="سجل الطلبيات والإرجاع" pageNum={5}>
                            <OrdersPage1 />
                        </GuidePageContainer>

                        {/* Fixed Page 6: Customers & Debts */}
                        <GuidePageContainer title="العملاء والديون" pageNum={6}>
                            <OrdersPage2 />
                        </GuidePageContainer>

                        {/* Fixed Page 7: Losses & Invoices */}
                        <GuidePageContainer title="الخسائر والفواتير" pageNum={7}>
                            <OrdersPage3 />
                        </GuidePageContainer>

                        {/* Back Cover */}
                        <GuideBackCoverPageV2 />

                    </div>

                    {/* Booklet Imposer */}
                    <BookletImposer
                        enabled={layoutMode === 'booklet'}
                        sourceRef={containerRef}
                        layoutKey="v2"
                    />

                </div>
            </div>
        </POSPureLayout>
    );
}
