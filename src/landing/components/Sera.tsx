import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Sparkles, Send, BarChart3, AlertTriangle, ArrowUpRight, Search, Clock } from 'lucide-react';

// --- VISUAL: RESULT CARDS (Consistent Design) ---

const SalesResult = () => (
  <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl relative overflow-hidden">
    {/* Glow */}
    <div className="absolute top-0 right-0 w-20 h-20 bg-brand/10 blur-2xl rounded-full pointer-events-none"></div>

    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-[10px] text-gray-500 font-bold mb-1">صافي الأرباح (اليوم)</div>
        <div className="text-2xl font-black text-white flex items-baseline gap-2">
          24,500 <span className="text-sm font-normal text-gray-400">دج</span>
        </div>
      </div>
      <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-500 text-[10px] font-bold flex items-center gap-1">
        <ArrowUpRight className="w-3 h-3" />
        12%
      </div>
    </div>

    {/* Bar Chart Bars */}
    <div className="flex items-end gap-2 h-20 pt-4 border-t border-white/5">
      {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
        <div key={i} className="flex-1 bg-white/5 rounded-t-sm hover:bg-brand transition-colors group relative" style={{ height: `${h}%` }}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded transition-opacity">{h}00</div>
        </div>
      ))}
    </div>
  </div>
);

const InventoryResult = () => (
  <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl relative">
    <div className="flex gap-3">
      <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-yellow-500/20">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex-1">
        <h4 className="text-white font-bold text-sm mb-1">تنبيه نفاذ الكمية</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          المنتج <span className="text-white font-medium">ساعة Smart Watch Ultra</span> راهو قريب يخلص.
        </p>
        <div className="mt-3 flex items-center justify-between text-xs bg-[#0A0A0A] p-2 rounded border border-white/5">
          <span className="text-gray-500">الباقي في المخزون:</span>
          <span className="text-yellow-500 font-bold">3 قطع</span>
        </div>
      </div>
    </div>
  </div>
);

const CustomerResult = () => (
  <div className="w-full bg-[#141414] rounded-xl p-4 border border-white/5 shadow-2xl">
    <div className="flex justify-between items-center mb-3">
      <span className="text-[10px] text-gray-500 font-bold uppercase">بطاقة زبون</span>
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
    </div>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center text-white font-bold">M</div>
      <div>
        <div className="text-white font-bold text-sm">Mohamed Amine</div>
        <div className="text-[10px] text-gray-500">0550 12 34 56</div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-xs py-2 border-t border-white/5">
        <span className="text-gray-400">مجموع المشتريات</span>
        <span className="text-white font-mono">15,200 دج</span>
      </div>
      <div className="flex justify-between text-xs py-2 border-t border-white/5">
        <span className="text-gray-400">الديون (Crédit)</span>
        <span className="text-red-500 font-bold font-mono">4,500 دج</span>
      </div>
    </div>
  </div>
);

// --- SCENARIO DATA ---

const SCENARIOS = [
  {
    query: "شحال دخلنا دراهم اليوم؟",
    result: <SalesResult />
  },
  {
    query: "خاصني العميل محمد أمين",
    result: <CustomerResult />
  },
  {
    query: "واش هوما لي برودوي لي قريب يخلصو؟",
    result: <InventoryResult />
  }
];

export const Sera: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const ref = React.useRef(null);
  const isInView = useInView(ref, { margin: "-100px" });

  // Typing Effect Logic
  useEffect(() => {
    if (!isInView) return;

    let currentScenario = SCENARIOS[index];
    let charIndex = 0;

    // Reset state
    setDisplayText("");
    setShowResult(false);
    setIsTyping(true);

    // 1. Type the query
    const typeInterval = setInterval(() => {
      if (charIndex <= currentScenario.query.length) {
        setDisplayText(currentScenario.query.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);

        // 2. Wait a bit then show result
        setTimeout(() => {
          setShowResult(true);

          // 3. Wait then next scenario
          setTimeout(() => {
            setIndex(prev => (prev + 1) % SCENARIOS.length);
          }, 4000); // Duration to read result
        }, 600); // Processing time
      }
    }, 50); // Typing speed

    return () => clearInterval(typeInterval);
  }, [index, isInView]);

  return (
    <section ref={ref} className="py-24 md:py-32 bg-[#050505] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* 1. CONTENT (Right) */}
          <div className="w-full lg:w-1/2 text-center lg:text-right order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-bold mb-4 uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Smart Assistant (AI)
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.4]">
              المساعدة الذكية <span className="text-brand">سيرا (Sera)</span>. <br />
              <span className="text-gray-500 text-2xl md:text-4xl font-bold">أكتب واش حبيت، وهي تنفذ.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto lg:mr-0 mb-8">
              سيرا هي مساعد شخصي داخل البرنامج. في بلاصة ما تبقا تحوس في القوائم (Menus)، أكتب برك واش راك حاب: "شحال بعنا اليوم؟"، "زيد السلعة لفلان"، وهي تجبدلك المعلومة في ثانية.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <div className="px-4 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                <Search className="w-3 h-3" />
                بحث ذكي
              </div>
              <div className="px-4 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                تنفيذ فوري
              </div>
              <div className="px-4 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-gray-500 flex items-center gap-2 opacity-50 cursor-not-allowed" title="قريباً">
                <span>🎙️</span>
                الأوامر الصوتية (قريباً)
              </div>
            </div>
          </div>

          {/* 2. DEMO (Left) - Command Palette Style */}
          <div className="w-full lg:w-1/2 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand/5 blur-[80px] rounded-full pointer-events-none"></div>

              {/* Result Container (Floats above) */}
              <div className="h-[200px] flex items-end justify-center mb-4 perspective-[1000px]">
                <AnimatePresence mode="wait">
                  {showResult && (
                    <motion.div
                      key={`res-${index}`}
                      initial={{ opacity: 0, rotateX: -20, y: 20 }}
                      animate={{ opacity: 1, rotateX: 0, y: 0 }}
                      exit={{ opacity: 0, rotateX: 20, y: -20, transition: { duration: 0.2 } }}
                      className="w-full transform-gpu will-change-transform"
                    >
                      {SCENARIOS[index].result}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Bar (Always visible) */}
              <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand/50 flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 h-6 flex items-center overflow-hidden">
                  <span className="text-sm md:text-base text-gray-200 font-medium whitespace-nowrap">
                    {displayText}
                    {isTyping && <span className="animate-pulse text-brand">|</span>}
                  </span>
                </div>
                <div className={`p-2 rounded-lg transition-colors ${displayText.length > 0 ? 'bg-brand text-white' : 'bg-white/5 text-gray-600'}`}>
                  <Send className="w-4 h-4" />
                </div>
              </div>

              {/* Helper text */}
              <div className="text-center mt-4">
                <p className="text-[10px] text-gray-600 font-mono">
                  Sera AI 1.0 • Powered by Stoukiha Intelligence
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
