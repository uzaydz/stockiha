import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Scale, FileText, AlertCircle, CheckCircle2, Gavel, Server, CreditCard, Ban, Globe } from 'lucide-react';

export const TermsPage: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#020202] pt-32 pb-20 relative overflow-hidden" dir="rtl">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-5xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-6"
                    >
                        <Scale className="w-4 h-4" />
                        <span>المرجع القانوني الموحد</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
                    >
                        شروط الاستخدام والخدمة
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed"
                    >
                        اتفاقية ملزمة قانوناً بين "شركة سطوكيها للحلول الرقمية" وبين "التاجر/المستخدم".
                        <br />
                        <span className="text-amber-500 text-sm">آخر تحديث: 16 ديسمبر 2025</span>
                    </motion.p>
                </div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="prose prose-invert prose-lg max-w-none bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
                >
                    {/* Watermark */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand via-orange-500 to-brand opacity-50"></div>

                    <div className="space-y-16">

                        {/* 1. Definitions */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <FileText className="text-brand" />
                                1. التعريفات والمصطلحات
                            </h2>
                            <p className="text-gray-400 text-base mb-4">لغايات هذه الاتفاقية، تحمل المصطلحات التالية المعاني الموضحة أدناه:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                                    <strong className="text-white block mb-1">"المنصة/النظام":</strong>
                                    <span className="text-sm text-gray-500">يشمل موقع سطوكيها، تطبيق سطح المكتب، تطبيق الهاتف، أدوات الـ POS، وأي خدمات سحابية مرتبطة بها.</span>
                                </div>
                                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                                    <strong className="text-white block mb-1">"التاجر/المشترك":</strong>
                                    <span className="text-sm text-gray-500">أي شخص طبيعي أو اعتباري يقوم بالتسجيل واستخدام خدماتنا لإدارة نشاطه التجاري.</span>
                                </div>
                                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                                    <strong className="text-white block mb-1">"العميل النهائي":</strong>
                                    <span className="text-sm text-gray-500">مستهلكي التاجر الذين يشترون المنتجات عبر متجر التاجر الإلكتروني أو محله.</span>
                                </div>
                                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                                    <strong className="text-white block mb-1">"الاشتراك":</strong>
                                    <span className="text-sm text-gray-500">الرخصة المدفوعة التي تخول التاجر استخدام النظام لمدة زمنية محددة.</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. License & Account */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Shield className="text-brand" />
                                2. ترخيص الاستخدام وحماية الحساب
                            </h2>
                            <ul className="space-y-4">
                                <ListItem>
                                    تمنحك سطوكيها ترخيصاً محدوداً، غير حصري، وغير قابل للتحويل لاستخدام البرمجيات لأغراضك التجارية المشروعة فقط.
                                </ListItem>
                                <ListItem danger>
                                    يمنع منعاً باتاً: الهندسة العكسية للنظام، محاولة الوصول للكود المصدري، بيع حسابك لطرف ثالث، أو استخدام النظام لأغراض احتيالية.
                                </ListItem>
                                <ListItem>
                                    أنت المسؤول الوحيد عن سرية بيانات الدخول (البريد الإلكتروني وكلمة المرور). أي نشاط يتم عبر حسابك هو مسؤوليتك القانونية الكاملة.
                                </ListItem>
                                <ListItem>
                                    يجب أن يكون عمرك 18 سنة على الأقل لإنشاء حساب تجاري، أو تملك السجل التجاري اللازم لممارسة التجارة في الجزائر.
                                </ListItem>
                            </ul>
                        </section>

                        {/* 3. Subscription & Payments */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <CreditCard className="text-brand" />
                                3. الاشتراكات والمدفوعات
                            </h2>
                            <div className="bg-brand/5 border border-brand/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">سياسة عدم الاسترجاع (No Refund Policy)</h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                    نظراً لطبيعة الخدمات الرقمية (SaaS) والفترة التجريبية المجانية التي نوفرها، فإن جميع المدفوعات للاشتراكات (الشهرية أو السنوية) نهائية وغير قابلة للاسترداد، حتى في حال عدم استخدامك للنظام بعد الدفع.
                                </p>
                                <ul className="text-sm text-gray-500 space-y-2 list-disc list-inside">
                                    <li>يتم تجديد الاشتراك يدوياً أو آلياً بناءً على طلبك.</li>
                                    <li>في حال انتهاء الاشتراك، تمنح مهلة 7 أيام قبل تجميد الوصول للبيانات، و30 يوماً قبل الحذف النهائي للبيانات.</li>
                                    <li>الأسعار المعلنة قابلة للتغيير، مع التزامنا بإشعارك قبل 30 يوماً من أي تعديل يمس اشتراكك الحالي.</li>
                                </ul>
                            </div>
                        </section>

                        {/* 4. Limitation of Liability */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Ban className="text-brand" />
                                4. حدود المسؤولية وإخلاء الطرف
                            </h2>
                            <p className="text-gray-400 mb-6 font-bold">سطوكيها هي "مقدم خدمة تكنولوجية" (Technology Enabler) وليست طرفاً في معاملاتك التجارية.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DisclaimerCard title="المتجر الإلكتروني">
                                    نحن نوفر الأدوات لإنشاء متجرك، لكننا لسنا مسؤولين عن المنتجات التي تبيعها، جودتها، أو شحنها. أي نزاع مع عملائك هو مسؤوليتك وحدك.
                                </DisclaimerCard>
                                <DisclaimerCard title="خدمات التوصيل (Yalidine/Procolis)">
                                    الربط التقني (API) مع شركات التوصيل هو لغرض تسهيل نقل المعلومات. سطوكيها لا تتحمل أي مسؤولية عن تأخر الطرود، ضياعها، أو مشاكل تحصيل الأموال (Cash on Delivery) من طرف شركة التوصيل.
                                </DisclaimerCard>
                                <DisclaimerCard title="دقة البيانات">
                                    رغم أننا نستخدم أفضل التقنيات لضمان التزامن (Sync)، لا تضمن سطوكيها دقة المخزون بنسبة 100% في حالات انقطاع الإنترنت أو الأعطال القاهرة.
                                </DisclaimerCard>
                                <DisclaimerCard title="الخسائر المالية">
                                    في أقصى حدود القانون، لا تتجاوز مسؤولية تعويض سطوكيها مبلغ قيمة اشتراكك للشهر الأخير، ولا نتحمل أي خسائر للأرباح المتوقعة.
                                </DisclaimerCard>
                            </div>
                        </section>

                        {/* 5. Content & Pixels */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Globe className="text-brand" />
                                5. المحتوى وأدوات التتبع (Pixels)
                            </h2>
                            <p className="text-gray-400 text-sm mb-4">
                                عند استخدامك لأدوات التتبع مثل Facebook Pixel أو TikTok Pixel عبر منصتنا:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                                <li>أنت المسؤول عن الالتزام بسياسات الخصوصية الخاصة بتلك المنصات.</li>
                                <li>أنت المسؤول عن إعلام عملائك بأنك تقوم بتتبعهم لأغراض إعلانية (بموجب قانون حماية البيانات).</li>
                                <li>تتعهد بعدم استخدام المنصة لبيع سلع ممنوعة قانوناً في الجزائر (مثل المكملات غير المرخصة، السلاح، المخدرات، أو السلع المقلدة).</li>
                            </ul>
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold">
                                يحق لسطوكيها إغلاق أي متجر فوراً ودون إنذار في حال اكتشاف بيع سلع غير قانونية أو احتيالية.
                            </div>
                        </section>

                        {/* 6. Governing Law */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Gavel className="text-brand" />
                                6. القانون الواجب التطبيق
                            </h2>
                            <p className="text-gray-400 leading-relaxed">
                                تخضع هذه الشروط وتفسر وفقاً للقوانين السارية في <strong>الجمهورية الجزائرية الديمقراطية الشعبية</strong>.
                                في حال نشوب أي نزاع، يتم اللجوء أولاً للحل الودي، وفي حال تعذره، ينعقد الاختصاص القضائي للمحاكم المختصة في الجزائر العاصمة.
                            </p>
                        </section>

                    </div>
                </motion.div>

                {/* Signature */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm">وثيقة معتمدة رقمياً - الإصدار 2.5</p>
                    <p className="text-gray-600 text-xs mt-1">Stoukiha Digital Solutions LLC</p>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const ListItem = ({ children, danger = false }: { children: React.ReactNode, danger?: boolean }) => (
    <li className={`flex gap-4 items-start ${danger ? 'text-red-400' : 'text-gray-300'}`}>
        {danger ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-1" />
        ) : (
            <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-1" />
        )}
        <span className="text-sm md:text-base leading-relaxed">{children}</span>
    </li>
);

const DisclaimerCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-[#151515] p-5 rounded-2xl border border-white/5 hover:border-brand/20 transition-colors">
        <h4 className="text-white font-bold mb-2 text-sm">{title}</h4>
        <p className="text-gray-500 text-xs leading-relaxed">{children}</p>
    </div>
);
