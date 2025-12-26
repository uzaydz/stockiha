import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Wifi, WifiOff, RefreshCw, Zap, Globe, Smartphone, Server, ShoppingCart, Truck, Database, Lock, Wrench, ScanBarcode } from 'lucide-react';

// Animation Variants
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 }
  }
};

// Custom Check/X Icons
const StatusIcon = ({ status }: { status: 'bad' | 'good' | 'best' }) => {
  if (status === 'bad') return <X className="w-4 h-4 text-red-500" />;
  if (status === 'good') return <Check className="w-4 h-4 text-brand" />;
  return (
    <div className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/40">
      <Check className="w-3.5 h-3.5 stroke-[3]" />
    </div>
  );
};

const FeatureRow = ({
  title,
  classic,
  stoukiha,
  icon: Icon
}: {
  title: string,
  classic: { text: string, status: 'bad' | 'good' },
  stoukiha: { text: string, status: 'best' },
  icon: any
}) => {
  return (
    <motion.div
      variants={rowVariants}
      className="grid grid-cols-12 gap-4 items-center py-5 border-b border-dashed border-gray-200 dark:border-white/10 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] px-3 rounded-lg transition-colors group transform-gpu will-change-transform"
    >
      {/* Feature Title */}
      <div className="col-span-12 md:col-span-4 flex items-center gap-3 mb-2 md:mb-0">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-gray-700 dark:text-gray-200">{title}</span>
      </div>

      {/* Classic (Old) */}
      <div className="col-span-6 md:col-span-4 flex flex-col items-start md:items-center gap-1.5 px-2 opacity-70 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <span className="md:hidden"><StatusIcon status={classic.status} /></span>
          <span>{classic.text}</span>
          <span className="hidden md:block"><StatusIcon status={classic.status} /></span>
        </div>
      </div>

      {/* Stoukiha (New) */}
      <div className="col-span-6 md:col-span-4 flex flex-col items-start md:items-center gap-1.5 bg-brand/5 rounded-lg py-2 px-3 border border-brand/10 relative">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          {/* Mobile: Icon on Left */}
          <span className="md:hidden"><StatusIcon status="best" /></span>
          {/* Text */}
          <span className="text-brand">{stoukiha.text}</span>
          {/* Desktop: Icon on Right */}
          <span className="hidden md:block"><StatusIcon status="best" /></span>
        </div>
      </div>
    </motion.div>
  );
};

export const Comparison: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
  return (
    <section className="py-24 bg-white dark:bg-[#080808] overflow-hidden relative">

      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-xs font-bold mb-4 border border-brand/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            الفرق واضح يا الخاوة
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-[1.4] md:leading-[1.5]"
          >
            واش الفرق بين <span className="text-gray-400 dark:text-gray-600 line-through decoration-brand decoration-4">القديم</span> <br />
            <span className="inline-block mt-2">وبين <span className="text-brand">الجديد (سطوكيها)</span>؟</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto"
          >
            بزاف تجار مازالو حايرين: "علاش نبدل السيستام لي عندي؟". <br className="hidden md:block" />
            هذا الجدول يجاوبك بالدارجة، بلا زواق وبلا تعقيدات.
          </motion.p>
        </div>

        {/* The Comparison Box */}
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">

          {/* Header Labels (Desktop Only) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-white/10 text-sm font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">الحاجة (الميزة)</div>
            <div className="col-span-4 text-center text-gray-400">السيستام الكلاسيكي (القديم)</div>
            <div className="col-span-4 text-center text-brand">منظومة سطوكيها</div>
          </div>

          {/* List */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="p-4 md:p-6 space-y-2"
          >
            <FeatureRow
              title="الإنترنت (راحت وجات)"
              icon={Wifi}
              classic={{ text: "يحبس المحل (بلوكاج)", status: "bad" }}
              stoukiha={{ text: "ما تحبسش (Offline 100%)", status: "best" }}
            />
            <FeatureRow
              title="السلعة في السيت والحانوت"
              icon={RefreshCw}
              classic={{ text: "تخلط عليك (Stock مخبل)", status: "bad" }}
              stoukiha={{ text: "سطوك واحد (Sync)", status: "best" }}
            />
            <FeatureRow
              title="المراقبة من الدار"
              icon={Smartphone}
              classic={{ text: "مكاش منها (لازم تحضر)", status: "bad" }}
              stoukiha={{ text: "تشوف كلش من تليفونك", status: "best" }}
            />
            <FeatureRow
              title="التوصيل (Yalidine..)"
              icon={Truck}
              classic={{ text: "تكتب بالستيلو (تعب)", status: "bad" }}
              stoukiha={{ text: "كليك واحد (Bordereau)", status: "best" }}
            />
            <FeatureRow
              title="ضياع المعلومات (PC فسد)"
              icon={Database}
              classic={{ text: "راح كلش (كارثة)", status: "bad" }}
              stoukiha={{ text: "محفوظة في السحاب (Cloud)", status: "best" }}
            />
            <FeatureRow
              title="التحديثات (Mise à jour)"
              icon={Server}
              classic={{ text: "لازم يجي التقني ويخلص", status: "bad" }}
              stoukiha={{ text: "باطل وأوتوماتيك", status: "best" }}
            />
            <FeatureRow
              title="السرقة والتلاعب"
              icon={Lock}
              classic={{ text: "ساهل يسرقوك", status: "bad" }}
              stoukiha={{ text: "كل حركة مسجلة (Audit)", status: "best" }}
            />
            {/* New Store Features */}
            <FeatureRow
              title="المتجر الإلكتروني (Store)"
              icon={ShoppingCart}
              classic={{ text: "تخلص عليه اشتراك وحدو", status: "bad" }}
              stoukiha={{ text: "يجيك باطل (Gratuit)", status: "best" }}
            />
            <FeatureRow
              title="البيكسل (Pixel Tracking)"
              icon={ScanBarcode}
              classic={{ text: "صعيب ولازم مبرمج", status: "bad" }}
              stoukiha={{ text: "بيكسل لكل منتج (L'infini)", status: "best" }}
            />
            <FeatureRow
              title="طريقة الطلب (C.O.D)"
              icon={Zap}
              classic={{ text: "نموذج واحد فقط", status: "bad" }}
              stoukiha={{ text: "سلة (Panier) + طلب سريع", status: "best" }}
            />
            <FeatureRow
              title="تتبع التصليحات (Réparation)"
              icon={Wrench}
              classic={{ text: "العيط وتكسار الراس", status: "bad" }}
              stoukiha={{ text: "الزبون يتبع من السيت", status: "best" }}
            />

          </motion.div>

        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">ماشي خير كي تخدم وانت مهني؟</p>
          <button
            onClick={() => onNavigate('download')}
            className="px-8 py-3.5 bg-brand hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all transform hover:-translate-y-1"
          >
            بدل للسيستام الجديد (Gratuit)
          </button>
        </div>

      </div>
    </section>
  );
};