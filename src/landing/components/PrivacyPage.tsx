import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Server, UserCheck, Smartphone, ShieldCheck, Database, Share2, Cookie, Trash2, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
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
                        <Lock className="w-4 h-4" />
                        <span>الخصوصية وحماية البيانات</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
                    >
                        سياسة الخصوصية الشاملة
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg max-w-2xl mx-auto"
                    >
                        نلتزم بأعلى معايير الأمان والشفافية لحماية بياناتك وبيانات عملائك، بما يتوافق مع القانون الجزائري 18-07 المتعلق بحماية البيانات الشخصية.
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
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-brand to-blue-500 opacity-50"></div>

                    <div className="space-y-16">

                        {/* 1. Introduction & Controller */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <ShieldCheck className="text-brand" />
                                1. من نحن ودورنا في معالجة البيانات
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                شركة سطوكيها تعمل بصفتين قانونيتين فيما يخص البيانات:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RoleCard title="مسؤول المعالجة (Controller)" role="تجاه بياناتك أنت (التاجر)">
                                    نحن المسؤولون عن حماية بيانات تسجيلك، معلومات دفعك، وسجلات اشتراكك.
                                </RoleCard>
                                <RoleCard title="معالج البيانات (Processor)" role="تجاه بيانات عملائك">
                                    أنت (التاجر) تملك بيانات عملائك (زبائن المتجر). نحن فقط نوفر النظام لمعالجتها وحفظها نيابة عنك.
                                </RoleCard>
                            </div>
                        </section>

                        {/* 2. Data Collection */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Database className="text-brand" />
                                2. البيانات التي نقوم بجمعها
                            </h2>
                            <div className="space-y-4">
                                <DataPoint title="معلومات التسجيل والتحقق">
                                    الاسم الكامل، رقم الهاتف (يتم التحقق منه عبر OTP)، البريد الإلكتروني، اسم المتجر، والعنوان التجاري. قد نطلب وثائق إضافية للتحقق من الهوية لتفادي الاحتيال.
                                </DataPoint>
                                <DataPoint title="بيانات العمليات (Operations Data)">
                                    محتوى المخزون، أسعار الشراء والبيع، هوامش الربح، وبيانات الموردين. هذه البيانات مشفرة وتعتبر أسراراً تجارية خاصة بك.
                                </DataPoint>
                                <DataPoint title="بيانات العملاء النهائيين">
                                    أسماء وعناوين وأرقام هواتف زبائنك الذين يقومون بالطلب عبر متجرك الإلكتروني.
                                </DataPoint>
                                <DataPoint title="بيانات الاستخدام التقني">
                                    عنوان IP، نوع الجهاز، نظام التشغيل، وسجلات الأخطاء (Logs) لتحسين أداء السيرفرات.
                                </DataPoint>
                            </div>
                        </section>

                        {/* 3. Data Sharing */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Share2 className="text-brand" />
                                3. مشاركة البيانات مع أطراف ثالثة
                            </h2>
                            <p className="text-gray-400 text-sm mb-4">
                                نحن لا نبيع بياناتك أبداً. نشارك البيانات فقط في الحالات الضرورية لعمل النظام:
                            </p>
                            <ul className="grid grid-cols-1 gap-3">
                                <li className="bg-[#151515] p-3 rounded-lg border border-white/5 flex items-center gap-3">
                                    <div className="bg-green-500/10 p-2 rounded text-green-500 text-xs font-bold">شركات التوصيل</div>
                                    <span className="text-gray-400 text-sm">تتم مشاركة اسم العميل، هاتفه، وعنوانه وعنوانك مع (Yalidine/Procolis) لإنشاء بوليصة الشحن آلياً.</span>
                                </li>
                                <li className="bg-[#151515] p-3 rounded-lg border border-white/5 flex items-center gap-3">
                                    <div className="bg-blue-500/10 p-2 rounded text-blue-500 text-xs font-bold">الإعلانات (Pixels)</div>
                                    <span className="text-gray-400 text-sm">عند تفعيلك لـ Facebook/TikTok Pixel، يتم إرسال أحداث التصفح (Events) لتلك المنصات تحت حسابك الإعلاني.</span>
                                </li>
                                <li className="bg-[#151515] p-3 rounded-lg border border-white/5 flex items-center gap-3">
                                    <div className="bg-red-500/10 p-2 rounded text-red-500 text-xs font-bold">السلطات القانونية</div>
                                    <span className="text-gray-400 text-sm">في حال ورود أمر قضائي رسمي من محكمة جزائرية، ملزمون قانوناً بالكشف عن بيانات محددة.</span>
                                </li>
                            </ul>
                        </section>

                        {/* 4. Tracking & Cookies */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Cookie className="text-brand" />
                                4. ملفات تعريف الارتباط وتقنيات التتبع
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                نستخدم "Cookies" لضمان بقاء جلسة تسجيل دخولك نشطة وآمنة. بالنسبة لمتجرك الإلكتروني، يتم استخدام الكوكيز لحفظ محتويات "سلة الشراء" لزبائنك.
                                <br /><br />
                                <span className="text-brand font-bold">تنبيه هام للتاجر:</span> استخدامك لبيكسل فيسبوك وتيك توك يجعلك ملزماً بوضع سياسة خصوصية في متجرك تخبر زوارك بأنك تجمع بياناتهم لأغراض التسويق. سطوكيها توفر لك رابطاً جاهزاً لسياسة الخصوصية يمكنك استخدامه في متجرك.
                            </p>
                        </section>

                        {/* 5. Data Retention & Deletion */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Trash2 className="text-brand" />
                                5. الاحتفاظ بالبيانات والحذف
                            </h2>
                            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-brand shrink-0"></div>
                                        <span>نحتفظ ببياناتك طالما أن اشتراكك ساري المفعول.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-brand shrink-0"></div>
                                        <span>عند انتهاء الاشتراك، يتم تجميد البيانات لمدة <strong>30 يوماً</strong> (فترة سماح للتجديد).</span>
                                    </li>
                                    <li className="flex gap-3 text-sm text-gray-300">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-brand shrink-0"></div>
                                        <span>بعد 90 يوماً من عدم التجديد، يتم <strong>حذف جميع البيانات أوتوماتيكياً ونهائياً</strong> (Hard Delete) من خوادمنا ولا يمكن استرجاعها، حفاظاً على أمان ومساحة الخوادم.</span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* 6. Security */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                                <Server className="text-brand" />
                                6. البنية التحتية والأمان
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                يتم استضافة بيانات سطوكيها على خوادم سحابية عالمية عالية الأمان (Tier-4 Data Centers). يتم تشفير كلمات المرور باستخدام خوارزميات (Bcrypt/Argon2). وتشفير الاتصال عبر (TLS 1.3). نقوم بإجراء نسخ احتياطي يومي (Database Snapshots) لحماية عملك من أي فقدان مفاجئ.
                            </p>
                        </section>

                    </div>
                </motion.div>

                {/* Contact */}
                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                    <p className="text-gray-500 text-sm mb-2">لأي استفسار بخصوص بياناتك أو لممارسة حقك في الحذف:</p>
                    <a href="mailto:privacy@stoukiha.com" className="text-brand font-mono text-lg font-bold hover:underline">privacy@stoukiha.com</a>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const RoleCard = ({ title, role, children }: { title: string, role: string, children: React.ReactNode }) => (
    <div className="bg-[#111] p-5 rounded-2xl border border-white/5">
        <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
        <span className="text-xs text-brand font-bold bg-brand/10 px-2 py-0.5 rounded mb-3 inline-block">{role}</span>
        <p className="text-gray-500 text-sm leading-relaxed">{children}</p>
    </div>
);

const DataPoint = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="flex gap-4 items-start bg-[#151515] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
        <div className="mt-1 p-1 bg-white/10 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
        <div>
            <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
            <p className="text-gray-400 text-xs leading-relaxed">{children}</p>
        </div>
    </div>
);
