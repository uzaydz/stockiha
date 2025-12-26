import React, { useMemo, useRef, useState } from 'react';
import { Printer, BookOpen, ShoppingCart, Users, CreditCard, Boxes, BarChart3, ClipboardList, Wallet, RotateCcw, AlertTriangle, Lock, Settings, Cloud, FileText, Search, Filter, Download, Keyboard, Package, DollarSign, Globe, Lightbulb, Gift, LayoutDashboard, ScanBarcode, Truck, Wrench, Link2, Store, UserCog, Crown, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { StockihaGuidePrintStyles } from './stockiha-guide/printStyles';
import { WelcomePage } from './stockiha-guide/WelcomePage';
import { GuideCoverPage, GuideBackCoverPage } from './stockiha-guide/CoverPages';
import { TableOfContentsPage } from './stockiha-guide/TableOfContentsPage';
import { PaginatedSection } from './stockiha-guide/PaginatedSection';
import { GuideCard, GuideBullets, Kbd } from './stockiha-guide/blocks';
import { BookletImposer } from './stockiha-guide/BookletImposer';

function pageLabel(start: number, count: number) {
  if (count <= 1) return String(start).padStart(2, '0');
  const end = start + count - 1;
  return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
}

export default function StockihaGuide() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'a5' | 'booklet'>('a5');
  const [counts, setCounts] = useState({
    access: 2,
    pos: 3,
    inventory: 1,
    orders: 1,
    customers: 2,
    debts: 1,
    returns: 1,
    losses: 1,
    invoices: 1,
    sidebar: 3,
  });

  const pageCover = 1;
  const pageToc = pageCover + 1;
  const pageWelcome = pageToc + 1;

  const startAccess = pageWelcome + 1;
  const startPOS = startAccess + counts.access;
  const startInventory = startPOS + counts.pos;
  const startOrders = startInventory + counts.inventory;
  const startCustomers = startOrders + counts.orders;
  const startDebts = startCustomers + counts.customers;
  const startReturns = startDebts + counts.debts;
  const startLosses = startReturns + counts.returns;
  const startInvoices = startLosses + counts.losses;
  const startSidebar = startInvoices + counts.invoices;

  const tocItems = useMemo(
    () => [
      { num: '00', title: 'رسالة ترحيب', pageLabel: pageLabel(pageWelcome, 1) },
      { num: '01', title: 'البداية والوصول للنظام', pageLabel: pageLabel(startAccess, counts.access) },
      { num: '02', title: 'نقطة البيع (المبيعات والاختصارات)', pageLabel: pageLabel(startPOS, counts.pos) },
      { num: '03', title: 'المخزون والتقارير', pageLabel: pageLabel(startInventory, counts.inventory) },
      { num: '04', title: 'الطلبيات (إدارة ما بعد البيع)', pageLabel: pageLabel(startOrders, counts.orders) },
      { num: '05', title: 'العملاء', pageLabel: pageLabel(startCustomers, counts.customers) },
      { num: '06', title: 'مديونيات العملاء', pageLabel: pageLabel(startDebts, counts.debts) },
      { num: '07', title: 'إرجاعات المنتجات', pageLabel: pageLabel(startReturns, counts.returns) },
      { num: '08', title: 'التصريح بالخسائر', pageLabel: pageLabel(startLosses, counts.losses) },
      { num: '09', title: 'الفواتير', pageLabel: pageLabel(startInvoices, counts.invoices) },
      { num: '10', title: 'دليل الصفحات (داخل النظام)', pageLabel: pageLabel(startSidebar, counts.sidebar) },
    ],
    [
      counts.access,
      counts.customers,
      counts.debts,
      counts.inventory,
      counts.invoices,
      counts.losses,
      counts.orders,
      counts.pos,
      counts.returns,
      counts.sidebar,
      pageWelcome,
      startAccess,
      startCustomers,
      startDebts,
      startInventory,
      startInvoices,
      startLosses,
      startOrders,
      startPOS,
      startReturns,
      startSidebar,
    ],
  );

  const accessBlocks = useMemo(
    () => [
      {
        key: 'access-intro',
        node: (
          <GuideCard title="هدف هذه البداية" icon={<BookOpen className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'تسجيل الدخول بالطريقة المناسبة (مدير النظام أو الموظف).',
                'ضبط الإعدادات الأساسية قبل أول عملية بيع.',
                'فهم مبادئ الأمان والصلاحيات لتجنب الأخطاء اليومية.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'access-login',
        node: (
          <GuideCard title="طرق الدخول" icon={<Lock className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'مدير النظام: دخول بالبريد الإلكتروني وكلمة المرور للتحكم الكامل (الإعدادات والصلاحيات والتقارير).',
                'الموظف (Cashier): دخول سريع عبر PIN (6 أرقام) لبدء البيع بسرعة مع صلاحيات محددة.',
              ]}
            />
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">رابط الدخول</div>
              <div className="font-mono text-[12px] text-slate-800" dir="ltr">
                app.bazaar-console.com/login
              </div>
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'access-setup',
        node: (
          <GuideCard title="إعدادات ضرورية قبل أول بيع" icon={<Settings className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'بيانات المؤسسة: الاسم، العنوان، الشعار، المعلومات الضريبية (إن كانت مطلوبة للفواتير).',
                'الموظفون: إنشاء حسابات وتحديد الأدوار (من يحق له تعديل السعر، الإرجاع، تسجيل خسائر، تحصيل ديون).',
                'الطابعة: اختيار الطابعة الافتراضية وتجربة طباعة فاتورة تجريبية.',
                'طرق الدفع: تفعيل النقد/البطاقة/التحويل حسب واقع المتجر.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'access-security',
        node: (
          <GuideCard title="الأمان والصلاحيات" icon={<Lock className="w-4 h-4" />} tone="dark">
            <GuideBullets
              items={[
                'حصر تعديل الأسعار والخصومات على صلاحيات محددة لتفادي أخطاء الأرباح.',
                'تسجيل الخسائر والإرجاعات يجب أن يكون بإذن واضح لضمان أثر محاسبي صحيح.',
                'مراجعة التقارير يومياً تقلل التراكم وتكشف الفروقات مبكراً.',
              ]}
          />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const posBlocks = useMemo(
    () => [
      {
        key: 'pos-intro',
        node: (
          <GuideCard title="نقطة البيع باختصار" icon={<ShoppingCart className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'البيع = اختيار المنتجات → تحديد العميل (أو عميل عابر) → الدفع → طباعة الفاتورة.',
                'نفس الصفحة تدعم الإرجاع وتسجيل الخسائر وفق الصلاحيات.',
                'الاختصارات تقلّل الوقت وتمنع النقر المتكرر أثناء ضغط العمل.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-add-products',
        node: (
          <GuideCard title="إضافة المنتجات للسلة" icon={<Search className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'ابحث بالاسم أو الكود (SKU) أو امسح الباركود لإضافة المنتج بسرعة.',
                'تحقق من الوحدة (قطعة/وزن/متر/صندوق) قبل تثبيت الكمية.',
                'في حال وجود صلاحية تعديل السعر: راجع السعر قبل التأكيد لتجنّب أخطاء الفوترة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-cart',
        node: (
          <GuideCard title="إدارة السلة" icon={<Package className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'تعديل الكمية، حذف سطر، أو إفراغ السلة عند الحاجة.',
                'تطبيق خصم على سطر محدد أو على كامل الفاتورة حسب سياسة المتجر.',
                'قبل الدفع: راجع الإجمالي، الضريبة/الخصم (إن وُجد)، وطريقة الدفع المتوقعة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-customer',
        node: (
          <GuideCard title="اختيار العميل (مهم للفوترة والديون)" icon={<Users className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'عميل عابر: مناسب للبيع السريع عندما لا تحتاج بيانات العميل.',
                'عميل مسجل: يُفضل عند الفوترة الرسمية أو عند البيع بالدين أو المتابعة لاحقاً.',
                'بيع بالدين: اختر العميل أولاً ثم أكمل الدفع جزئياً أو اترك المتبقي كمديونية.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-payment',
        node: (
          <GuideCard title="الدفع وإصدار الفاتورة" icon={<CreditCard className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'اختر طريقة الدفع: نقد/بطاقة/تحويل (حسب الإعدادات).',
                'الدفع الجزئي ينشئ مديونية مرتبطة بالعميل حتى تُسجَّل الدفعات لاحقاً.',
                'بعد التأكيد: اطبع الفاتورة أو أعد طباعتها عند الحاجة (حسب الصلاحية).',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-modes',
        node: (
          <GuideCard title="أوضاع العمل داخل نقطة البيع" icon={<Settings className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'وضع البيع: العملية الافتراضية لإصدار فواتير المبيعات.',
                'وضع الإرجاع: لإرجاع منتج أو فاتورة (يرفع المخزون ويعدل الأثر المالي حسب السياسة).',
                'وضع الخسائر: لتسجيل تلف/انتهاء/فقدان (يخفض المخزون ويظهر في التقارير).',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'pos-shortcuts',
        node: (
          <GuideCard title="اختصارات أساسية" icon={<Keyboard className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2" dir="ltr">
              <Kbd>F2</Kbd>
              <span className="text-[11px] text-slate-700">بحث</span>
              <Kbd>F10</Kbd>
              <span className="text-[11px] text-slate-700">الدفع</span>
              <Kbd>Esc</Kbd>
              <span className="text-[11px] text-slate-700">إلغاء</span>
              <Kbd>Alt+1</Kbd>
              <span className="text-[11px] text-slate-700">بيع</span>
              <Kbd>Alt+2</Kbd>
              <span className="text-[11px] text-slate-700">إرجاع</span>
              <Kbd>Alt+3</Kbd>
              <span className="text-[11px] text-slate-700">خسائر</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              إذا كانت الاختصارات مختلفة في مؤسستك، راجع إعدادات POS لتخصيصها ثم اعتمد نسخة واحدة لكل الموظفين لتقليل الأخطاء.
            </p>
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const inventoryBlocks = useMemo(
    () => [
      {
        key: 'inv-products',
        node: (
          <GuideCard title="المنتجات والمخزون" icon={<Boxes className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'إضافة منتج: الاسم، الباركود/الكود، السعر، التكلفة، والوحدة.',
                'تنبيه المخزون: حد منخفض لتفادي نفاد مفاجئ أثناء البيع.',
                'تعديل سريع: تصحيح سعر/كمية من القائمة عند الحاجة (حسب الصلاحيات).',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'inv-audit',
        node: (
          <GuideCard title="الجرد وتقليل الفروقات" icon={<ClipboardList className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'نفّذ جرداً دورياً (يومي/أسبوعي حسب حجم المتجر).',
                'عالج الفروقات بإرجاع/خسائر/تصحيح مخزون حسب سبب الفرق، ولا تستخدم حذف العمليات.',
                'سجّل السبب دائماً لتسهيل المراجعة وتحسين الانضباط التشغيلي.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'inv-reports',
        node: (
          <GuideCard title="التقارير المالية" icon={<BarChart3 className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'راقب المبيعات اليومية، طرق الدفع، والأصناف الأكثر مبيعاً.',
                'راجع الخصومات والإرجاعات والخسائر لأنها تؤثر مباشرة على الربحية.',
                'اعتمد تقرير نهاية اليوم (Z) كروتين إغلاق لتقليل الأخطاء.',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const ordersBlocks = useMemo(
    () => [
      {
        key: 'orders-overview',
        node: (
          <GuideCard title="إدارة الطلبيات بعد البيع" icon={<ClipboardList className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'استخدم الطلبيات للبحث عن فواتير سابقة، الطباعة، الإرجاع، والمتابعة.',
                'اجعل رقم الطلب مرجعاً أساسياً عند أي نزاع أو مراجعة مالية.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'orders-search',
        node: (
          <GuideCard title="البحث والتصفية" icon={<Filter className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'ابحث برقم الطلب أو اسم العميل أو الهاتف.',
                'فلترة بالتاريخ، حالة الطلب، وحالة الدفع للحصول على نتائج دقيقة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'orders-status',
        node: (
          <GuideCard title="الحالات والإجراءات" icon={<Settings className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'حالة الطلب مستقلة عن حالة الدفع: راجع الاثنين قبل أي إجراء.',
                'إجراءات متكررة: عرض التفاصيل، طباعة، إرجاع جزئي/كلي، إلغاء (يعيد المخزون حسب السياسة).',
                'قبل الإلغاء/الإرجاع: تأكد من أن العملية صحيحة لتفادي اختلاف المخزون.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'orders-sync',
        node: (
          <GuideCard title="المزامنة عند ضعف الإنترنت" icon={<Cloud className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'عند انقطاع الإنترنت قد تُحفظ بعض العمليات محلياً ثم تُزامن تلقائياً عند عودة الاتصال.',
                'تجنب تكرار نفس العملية مرتين إذا لاحظت تأخيراً؛ راجع الحالة أولاً.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'orders-shortcuts',
        node: (
          <GuideCard title="اختصارات سريعة" icon={<Keyboard className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2" dir="ltr">
              <Kbd>Ctrl+F</Kbd>
              <span className="text-[11px] text-slate-700">بحث</span>
              <Kbd>Ctrl+P</Kbd>
              <span className="text-[11px] text-slate-700">طباعة</span>
              <Kbd>Enter</Kbd>
              <span className="text-[11px] text-slate-700">تفاصيل</span>
              <Kbd>R</Kbd>
              <span className="text-[11px] text-slate-700">إرجاع</span>
              <Kbd>Esc</Kbd>
              <span className="text-[11px] text-slate-700">إغلاق</span>
            </div>
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const customersBlocks = useMemo(
    () => [
      {
        key: 'customers-intro',
        node: (
          <GuideCard title="إدارة العملاء" icon={<Users className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'العملاء يساعدونك في الفوترة، الديون، المتابعة، والتقارير.',
                'كلما كانت البيانات دقيقة (هاتف/عنوان/بيانات ضريبية) كانت العمليات أسرع وأوضح.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'customers-add',
        node: (
          <GuideCard title="إضافة عميل وتحديث البيانات" icon={<FileText className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الاسم هو الحقل الأساسي، ويُفضل إضافة الهاتف لتسهيل البحث.',
                'للعملاء التجاريين: أضف البيانات الضريبية لتظهر في الفواتير الرسمية.',
                'التحديث المستمر يمنع أخطاء التسليم والفوترة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'customers-search',
        node: (
          <GuideCard title="البحث والتصفية" icon={<Search className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'ابحث بالاسم أو الهاتف أو البريد الإلكتروني.',
                'استخدم الفلاتر للوصول سريعاً للعملاء حسب الحالة أو معايير أخرى.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'customers-details',
        node: (
          <GuideCard title="تفاصيل العميل وما يجب مراجعته" icon={<ClipboardList className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'سجل الطلبات والمشتريات: مرجع للتاريخ الشرائي والتكرار.',
                'الديون والدفعات: راجع الرصيد قبل منح الدين مرة أخرى.',
                'ملاحظات داخلية: لتوثيق سياسة خاصة أو تنبيه مهم للموظفين.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'customers-export',
        node: (
          <GuideCard title="التصدير والمشاركة" icon={<Download className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'تصدير العملاء بصيغة Excel لمشاركة البيانات أو التحليل.',
                'التصدير يعتمد على النتائج الحالية (حسب الفلاتر المطبقة).',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const debtsBlocks = useMemo(
    () => [
      {
        key: 'debts-what',
        node: (
          <GuideCard title="ما هي المديونية؟" icon={<Wallet className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'مديونية العميل تظهر عندما يكون هناك مبلغ متبقٍ من طلبات غير مكتملة الدفع.',
                'هدف الصفحة هو تتبع المستحقات وتسجيل الدفعات حتى يتم تصفير الرصيد.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'debts-where',
        node: (
          <GuideCard title="أين تظهر المديونية" icon={<Users className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'في صفحة العملاء يظهر مؤشر للعميل المدين.',
                'داخل تفاصيل العميل تجد إجمالي المستحق وسجل الدفعات المرتبطة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'debts-payment',
        node: (
          <GuideCard title="تسجيل دفعة" icon={<DollarSign className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'سجّل دفعة جزئية أو كاملة مع اختيار طريقة الدفع وتاريخ العملية.',
                'بعد التسجيل يتحدّث رصيد العميل فوراً ويظهر في السجل للمراجعة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'debts-policy',
        node: (
          <GuideCard title="سياسة عمل مقترحة" icon={<Lock className="w-4 h-4" />} tone="warning">
            <GuideBullets
              items={[
                'حدد سقفاً ائتمانياً لكل عميل لتقليل المخاطر.',
                'اجعل اعتماد بيع بالدين أو شطب دين بصلاحية إدارية فقط.',
                'اعتمد موعد تحصيل واضح ودوّن أي استثناء داخل ملاحظات العميل.',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const returnsBlocks = useMemo(
    () => [
      {
        key: 'returns-when',
        node: (
          <GuideCard title="متى نستخدم الإرجاع؟" icon={<RotateCcw className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'خطأ في المنتج أو الكمية أو المقاس.',
                'طلب تم إلغاؤه بعد الدفع أو قبل التسليم.',
                'إرجاع جزئي: إعادة بعض البنود فقط مع حفظ بقية الفاتورة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'returns-how',
        node: (
          <GuideCard title="طريقة الإرجاع الصحيحة" icon={<ClipboardList className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'ابدأ من الطلبيات وابحث عن الفاتورة ثم اختر إرجاع (جزئي/كلي).',
                'تأكد من اختيار السبب وتوثيق الملاحظة عند الحاجة.',
                'راجِع أثر الإرجاع: يعيد المخزون، ويعدل المبلغ المدفوع أو ينشئ استرداداً حسب طريقة الدفع.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'returns-rules',
        node: (
          <GuideCard title="ملاحظات مهمة" icon={<AlertTriangle className="w-4 h-4" />} tone="warning">
            <GuideBullets
              items={[
                'لا تستخدم حذف طلب كحل للإرجاع؛ الإرجاع يحفظ الأثر المحاسبي ويمنع تضارب المخزون.',
                'اجعل الإرجاع بصلاحية محددة لتفادي الاستغلال أو الأخطاء.',
                'عند الدفع الجزئي: راجع رصيد العميل بعد الإرجاع لأنه قد يؤثر على المديونية.',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const lossesBlocks = useMemo(
    () => [
      {
        key: 'losses-why',
        node: (
          <GuideCard title="متى نُصرّح بالخسائر؟" icon={<AlertTriangle className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'تلف/انتهاء صلاحية/كسر أثناء النقل أو التخزين.',
                'فقدان أو نقص غير مبرر بعد الجرد ويحتاج توثيقاً.',
                'تصحيح أخطاء إدخال كميات بشرط وجود سياسة مراجعة واضحة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'losses-how',
        node: (
          <GuideCard title="تسجيل خسارة خطوة بخطوة" icon={<ClipboardList className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'اختر المنتج ثم أدخل الكمية المتضررة.',
                'حدد السبب واكتب ملاحظة قصيرة (متى/أين/من).',
                'بعد الحفظ: ينخفض المخزون ويظهر الأثر في التقارير.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'losses-control',
        node: (
          <GuideCard title="الضبط والرقابة" icon={<Lock className="w-4 h-4" />} tone="warning">
            <GuideBullets
              items={[
                'اجعل تسجيل الخسائر بصلاحية مشرف أو مدير فقط.',
                'راجِع قائمة الخسائر أسبوعياً وربطها بنتائج الجرد.',
                'التوثيق الجيد يحميك عند المراجعة ويكشف نقاط الضعف في التخزين.',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const invoicesBlocks = useMemo(
    () => [
      {
        key: 'inv-intro',
        node: (
          <GuideCard title="الفواتير" icon={<FileText className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'الفاتورة هي المرجع الرسمي لعملية البيع وتاريخها وطريقة الدفع.',
                'تُستخدم للطباعة، الإرجاع، المتابعة، وإثبات العمليات المالية.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'inv-create',
        node: (
          <GuideCard title="إنشاء فاتورة من نقطة البيع" icon={<ShoppingCart className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'أضف المنتجات للسلة ثم اختر العميل (أو عميل عابر) ثم أكمل الدفع.',
                'للفاتورة الرسمية: تأكد من بيانات العميل الضريبية قبل الطباعة.',
                'إذا كان الدفع جزئياً: سيُنشأ رصيد/مديونية حتى يتم تحصيل المتبقي.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'inv-print',
        node: (
          <GuideCard title="قبل الطباعة" icon={<Printer className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'راجع اسم العميل (للرسمي) أو عميل عابر (للبيع السريع).',
                'تأكد من التاريخ والوقت، المنتجات والكميات والأسعار.',
                'راجع الإجمالي وطريقة الدفع وحالة الدفع قبل اعتماد الفاتورة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'inv-fix',
        node: (
          <GuideCard title="تصحيح الأخطاء بدون حذف" icon={<AlertTriangle className="w-4 h-4" />} tone="warning">
            <GuideBullets
              items={[
                'عند خطأ بعد الطباعة: استخدم إرجاعاً (جزئي/كلي) أو فاتورة تصحيح حسب السياسة بدل حذف السجل.',
                'الحذف يسبب فجوات محاسبية ويؤدي لاختلاف المخزون والتقارير.',
              ]}
            />
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const sidebarBlocks = useMemo(
    () => [
      {
        key: 'pages-intro',
        node: (
          <GuideCard title="كيف تصل لأي صفحة داخل النظام" icon={<BookOpen className="w-4 h-4" />} tone="soft">
            <GuideBullets
              items={[
                'الدخول: من الشريط الجانبي داخل لوحة التحكم، ثم اضغط اسم الصفحة (أو افتح الرابط مباشرة).',
                'إذا لم تظهر صفحة: تحقق من الصلاحيات (موظف/مدير) أو من وضع Online/Offline.',
                'معظم المراكز تحتوي تبويبات أعلى الصفحة؛ تغيير التبويب يغير المسار ويعرض أدوات مختلفة.',
              ]}
            />
          </GuideCard>
        ),
      },
      {
        key: 'page-pos-dashboard',
        node: (
          <GuideCard title="نظرة عامة (لوحة تحكم نقطة البيع)" icon={<LayoutDashboard className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (نظرة عامة).',
                'داخل الصفحة: تبويبات (نظرة عامة/المبيعات/المنتجات/العملاء) مع مؤشرات، مخططات، وآخر الطلبات.',
                'الاستخدام: راقب مبيعات اليوم، راجع الأكثر مبيعاً، ثم انتقل عبر الإجراءات السريعة لفتح نقطة البيع أو السجلات المرتبطة.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/pos-dashboard
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-pos-advanced',
        node: (
          <GuideCard title="نقطة البيع" icon={<ScanBarcode className="w-4 h-4" />} tone="dark">
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (نقطة البيع).',
                'داخل الصفحة: بحث/سكانر باركود + قائمة المنتجات + السلة + الدفع/الطباعة + نوافذ (العميل/الإعدادات/مصروف سريع/آلة حاسبة/إرجاع).',
                'الاستخدام: ابحث أو اسكن المنتج → اضبط الكمية/الخصم → اختر العميل (أو عميل عابر) → أكمل الدفع → اطبع الوصل/الفاتورة حسب الحاجة.',
              ]}
            />
            <div className="mt-2 text-[10px] text-white/70 font-mono" dir="ltr">
              /dashboard/pos-advanced
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-product-operations',
        node: (
          <GuideCard title="المنتجات" icon={<Package className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (المنتجات).',
                'داخل الصفحة: تبويبات (المنتجات/الفئات/المخزون/تتبع المخزون) مع بحث وفلاتر وإجراءات.',
                'الاستخدام: أنشئ منتجاً أو عدّل بياناته → نظّم الفئات → راجع الكميات في المخزون → استخدم تتبع المخزون لمعرفة الحركات والتعديلات.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/product-operations/products
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-pos-operations',
        node: (
          <GuideCard title="سجل الطلبات" icon={<ClipboardList className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (سجل الطلبات).',
                'داخل الصفحة: تبويبات (طلبيات نقطة البيع/العملاء/مديونيات/إرجاعات/خسائر/فواتير).',
                'الاستخدام: ابحث عن العملية → افتح التفاصيل → نفّذ إجراء (طباعة/إرجاع/تسجيل دفعة/تعديل حسب الصلاحية) مع الحفاظ على سجل محاسبي واضح.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/pos-operations/orders
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-analytics',
        node: (
          <GuideCard title="التقارير" icon={<BarChart3 className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (التقارير).',
                'داخل الصفحة: تبويبات (تحليلات مالية/تحليلات المبيعات/المصروفات/الزكاة/تقارير الموردين).',
                'الاستخدام: اختر تبويب التقرير → حدد الفترة الزمنية → راجع المؤشرات والمخططات → استخدم الجداول للبحث والمقارنة قبل اتخاذ القرار.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/analytics (قد يتحول إلى /dashboard/reports-operations/financial)
            </div>
          </GuideCard>
        ),
      },

      {
        key: 'page-supplier-operations',
        node: (
          <GuideCard title="الموردين" icon={<Truck className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الموردين).',
                'داخل الصفحة: تبويبات (الموردين/المشتريات/المدفوعات/التقارير).',
                'الاستخدام: أضف مورد → أنشئ عملية شراء وربطها بالمورد → سجل دفعة/سداد → راجع التقارير لمتابعة الأرصدة والتدفقات.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/supplier-operations/suppliers
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-services-operations',
        node: (
          <GuideCard title="الصيانة" icon={<Wrench className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الصيانة).',
                'داخل الصفحة: تبويبات (خدمات التصليح/خدمات الاشتراكات/تحميل الألعاب).',
                'الاستخدام: أنشئ/تابع طلب تصليح أو اشتراك → حدّد الحالة والتواريخ → استخدم السجلات لتتبع ما تم تسليمه وما هو قيد التنفيذ.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/services-operations/repair
            </div>
          </GuideCard>
        ),
      },

      {
        key: 'page-sales-operations',
        node: (
          <GuideCard title="طلبات المتجر" icon={<Globe className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (طلبات المتجر).',
                'داخل الصفحة: تبويبات (الطلبات الإلكترونية/المحظورين/المتروكة/مجموعات الطلبات).',
                'الاستخدام: افتح الطلب → حدّث الحالة والتوصيل → راجع العملاء المحظورين لتقليل الطلبات الوهمية → استخدم المتروكة لتحسين التحويلات.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/sales-operations/onlineOrders
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-store-operations',
        node: (
          <GuideCard title="إعدادات المتجر" icon={<Store className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (إعدادات المتجر).',
                'داخل الصفحة: تبويبات (إعدادات المتجر/محرر المكونات/قوالب المتجر/صفحات الهبوط/صفحة الشكر/إدارة التوصيل).',
                'الاستخدام: اضبط بيانات المتجر أولاً → اختر قالباً → خصص صفحات الهبوط → فعّل مناطق التوصيل وأسعارها → راجع صفحة الشكر لتجربة عميل أفضل.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/store-operations/store-settings
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-custom-domains',
        node: (
          <GuideCard title="النطاقات المخصصة" icon={<Link2 className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (النطاقات المخصصة).',
                'داخل الصفحة: معلومات الربط + حالة التحقق + خطوات DNS + زر (دليل الإعداد).',
                'الاستخدام: أضف النطاق → انسخ سجلات DNS المطلوبة → انتظر التحقق → فعّل النطاق بعد نجاح الربط.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/custom-domains
            </div>
          </GuideCard>
        ),
      },

      {
        key: 'page-hr-operations',
        node: (
          <GuideCard title="الموارد البشرية" icon={<UserCog className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الموارد البشرية).',
                'داخل الصفحة: تبويبات (نظرة عامة/الحضور والانصراف/الإجازات/الرواتب/الأداء).',
                'الاستخدام: ابدأ بلوحة النظرة العامة → راقب حضور الموظفين → أدِر طلبات الإجازة والموافقات → حدّث الرواتب → تابع الأداء والأهداف.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/hr-operations/dashboard
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-staff-management',
        node: (
          <GuideCard title="الموظفين" icon={<Users className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الموظفين).',
                'داخل الصفحة: بحث + جدول الموظفين + حالة الاتصال + إجراءات (إضافة/تعديل/تغيير PIN/تفعيل/تعطيل/حذف حسب الصلاحية).',
                'الاستخدام: أنشئ موظفاً → حدّد الصلاحيات → عيّن PIN للدخول السريع → راقب حالة الاتصال قبل إجراء تغييرات مهمة.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/staff-management
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-settings-unified',
        node: (
          <GuideCard title="الإعدادات" icon={<Settings className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الإعدادات).',
                'داخل الصفحة: أقسام (المتجر/السلة/المظهر/الوصل/الطباعة/الوصول/متقدم) مع زر (حفظ الإعدادات).',
                'الاستخدام: اضبط بيانات المتجر أولاً → فعّل/عطّل السلة → عدّل المظهر → خصص الوصل والطباعة → راجع الوصول والصلاحيات قبل تشغيل الموظفين.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/settings-unified
            </div>
          </GuideCard>
        ),
      },

      {
        key: 'page-subscription',
        node: (
          <GuideCard title="الاشتراك" icon={<Crown className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الاشتراك).',
                'داخل الصفحة: الباقات والمزايا والحدود + التفعيل بكود + حالة الاشتراك.',
                'الاستخدام: راجع حدود خطتك (منتجات/مستخدمين/نقاط بيع) → اختر باقة عند الحاجة → استخدم التفعيل بالكود إذا تم تزويدك به.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/subscription
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-referral',
        node: (
          <GuideCard title="برنامج الإحالة" icon={<Gift className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (برنامج الإحالة).',
                'داخل الصفحة: كود الإحالة + النقاط والمستويات + المكافآت + سجل المعاملات وأسئلة شائعة.',
                'الاستخدام: انسخ الكود وشاركه → راقب النقاط المتاحة → استبدل النقاط عند توفرها → راجع سجل المعاملات للتتبع.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/referral
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-feature-suggestions',
        node: (
          <GuideCard title="اقتراحات الميزات" icon={<Lightbulb className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (اقتراحات الميزات).',
                'داخل الصفحة: إنشاء اقتراح + بحث/فلاتر + تصويت + تعليقات + عرض (قائمة/خارطة طريق).',
                'الاستخدام: أنشئ اقتراحاً واضحاً → استخدم الفلاتر لتحديد الأولويات → صوّت للاقتراحات المهمة → تابع التحديثات داخل خارطة الطريق.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/feature-suggestions
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-etat104',
        node: (
          <GuideCard title="كشف 104" icon={<FileSpreadsheet className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (كشف 104).',
                'داخل الصفحة: اختيار السنة + استيراد العملاء + التحقق من البيانات + تصدير PDF/Excel + سجل التاريخ.',
                'الاستخدام: أنشئ كشف السنة → استورد بيانات العملاء → راجع التحقق والأخطاء → صدّر الملفات الرسمية واحتفظ بسجل العملية.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/etat104
            </div>
          </GuideCard>
        ),
      },
      {
        key: 'page-academy',
        node: (
          <GuideCard title="الأكاديمية" icon={<GraduationCap className="w-4 h-4" />}>
            <GuideBullets
              items={[
                'الدخول: الشريط الجانبي → (الأكاديمية).',
                'داخل الصفحة: تبويبات دورات (شرح النظام/التسويق/تيك توك/التجارة الإلكترونية/المتجر/الخدمات...).',
                'الاستخدام: اختر مساراً تدريبياً → افتح الدورة → تابع الدروس بالترتيب لتحسين استخدام النظام والنتائج.',
              ]}
            />
            <div className="mt-2 text-[10px] text-slate-500 font-mono" dir="ltr">
              /dashboard/courses-operations/all
            </div>
          </GuideCard>
        ),
      },
    ],
    [],
  );

  const updateCount = (key: keyof typeof counts) => (count: number) => {
    setCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
  };

  const handlePrint = () => {
    // In booklet mode, ensure imposed spreads are built before printing.
    if (layoutMode === 'booklet') {
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      return;
    }
    window.print();
  };

  const handleDownload = async () => {
    const root = containerRef.current;
    if (!root) return;

    // Export only the original A5 pages (direct children), never the imposed booklet clones.
    const pages = Array.from(root.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .filter((el) => el.matches('section.guide-page'))
      .filter((el) => el.getAttribute('data-export-ignore') !== 'true');
    if (pages.length === 0) return;

    try {
      setIsDownloading(true);
      const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
      await fonts?.ready?.catch(() => {});

      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);

      if (layoutMode === 'booklet') {
        const pdf = new jsPDF({
          orientation: 'l',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        const a5w = 148;
        const a5h = 210;
        const gap = 1;
        const rightX = a5w + gap;

        const toImage = async (el: HTMLElement) => {
          const canvas = await html2canvas(el, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
          });
          return canvas.toDataURL('image/png', 1.0);
        };

        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = 1200;
        blankCanvas.height = 1700;
        const ctx = blankCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
        }
        const blankImg = blankCanvas.toDataURL('image/png', 1.0);

        // Capture all pages once, then impose as booklet (4 pages per sheet) with cover+back fixed.
        const capturedAll: string[] = [];
        for (const el of pages) capturedAll.push(await toImage(el));
        if (capturedAll.length < 2) return;

        const front = capturedAll[0];
        const back = capturedAll[capturedAll.length - 1];
        const interior = capturedAll.slice(1, -1);

        const desiredTotal = Math.ceil((interior.length + 2) / 4) * 4;
        const blanksNeeded = desiredTotal - (interior.length + 2);

        const logical: string[] = [front, ...interior];
        for (let i = 0; i < blanksNeeded; i++) logical.push(blankImg);
        logical.push(back);

        const total = logical.length;
        const imgAt = (pageNumber1Based: number) => logical[pageNumber1Based - 1] ?? blankImg;

        const sheets = total / 4;
        for (let s = 0; s < sheets; s++) {
          const frontLeft = total - 2 * s;
          const frontRight = 1 + 2 * s;
          const backLeft = 2 + 2 * s;
          const backRight = total - (2 * s + 1);

          if (s > 0) pdf.addPage('a4', 'l');
          pdf.addImage(imgAt(frontLeft), 'PNG', 0, 0, a5w, a5h, undefined, 'FAST');
          pdf.addImage(imgAt(frontRight), 'PNG', rightX, 0, a5w, a5h, undefined, 'FAST');

          pdf.addPage('a4', 'l');
          pdf.addImage(imgAt(backLeft), 'PNG', 0, 0, a5w, a5h, undefined, 'FAST');
          pdf.addImage(imgAt(backRight), 'PNG', rightX, 0, a5w, a5h, undefined, 'FAST');
        }

        pdf.save('Stockiha_Guide_A4_Booklet_Imposed.pdf');
      } else {
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a5',
          compress: true,
        });

        const width = 148;
        const height = 210;

        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i], {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
          });

          const imgData = canvas.toDataURL('image/png', 1.0);
          if (i > 0) pdf.addPage('a5', 'p');
          pdf.addImage(imgData, 'PNG', 0, 0, width, height, undefined, 'FAST');
        }

        pdf.save('Stockiha_Guide_A5.pdf');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <POSPureLayout>
      <div className="bg-slate-100 py-8 print:py-0 print:bg-white overflow-y-auto custom-scrollbar h-full">
        <StockihaGuidePrintStyles layout={layoutMode} />

        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 print:hidden">
          <Button
            onClick={() => setLayoutMode((m) => (m === 'a5' ? 'booklet' : 'a5'))}
            className="bg-white text-slate-900 hover:bg-slate-50 shadow-xl border border-slate-200 rounded-full px-6 gap-2"
          >
            {layoutMode === 'a5' ? 'وضع الكتيب A4' : 'وضع الصفحات A5'}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-white text-slate-900 hover:bg-slate-50 shadow-xl border border-slate-200 rounded-full px-6 gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'جاري التحضير...' : layoutMode === 'booklet' ? 'تحميل PDF (A4)' : 'تحميل PDF (A5)'}
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 shadow-xl border border-slate-700 rounded-full px-6 gap-2">
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </Button>
        </div>

        <div className="print:w-full print:m-0 guide-booklet" data-print-layout={layoutMode} ref={containerRef}>
          <GuideCoverPage />
          <TableOfContentsPage pageNumber={pageToc} items={tocItems} />
          <WelcomePage pageNumber={pageWelcome} />

          <PaginatedSection chapter="الوصول" title="البداية والوصول للنظام" startPageNumber={startAccess} blocks={accessBlocks} onPageCount={updateCount('access')} />
          <PaginatedSection chapter="البيع" title="نقطة البيع" startPageNumber={startPOS} blocks={posBlocks} onPageCount={updateCount('pos')} />
          <PaginatedSection chapter="الإدارة" title="المخزون والتقارير" startPageNumber={startInventory} blocks={inventoryBlocks} onPageCount={updateCount('inventory')} />
          <PaginatedSection chapter="الطلبيات" title="الطلبيات" startPageNumber={startOrders} blocks={ordersBlocks} onPageCount={updateCount('orders')} />
          <PaginatedSection chapter="العملاء" title="العملاء" startPageNumber={startCustomers} blocks={customersBlocks} onPageCount={updateCount('customers')} />
          <PaginatedSection chapter="الديون" title="مديونيات العملاء" startPageNumber={startDebts} blocks={debtsBlocks} onPageCount={updateCount('debts')} />
          <PaginatedSection chapter="الإرجاع" title="إرجاعات المنتجات" startPageNumber={startReturns} blocks={returnsBlocks} onPageCount={updateCount('returns')} />
          <PaginatedSection chapter="الخسائر" title="التصريح بالخسائر" startPageNumber={startLosses} blocks={lossesBlocks} onPageCount={updateCount('losses')} />
          <PaginatedSection chapter="الفوترة" title="الفواتير" startPageNumber={startInvoices} blocks={invoicesBlocks} onPageCount={updateCount('invoices')} />
          <PaginatedSection chapter="الدليل" title="دليل الصفحات (داخل النظام)" startPageNumber={startSidebar} blocks={sidebarBlocks} onPageCount={updateCount('sidebar')} />

          <GuideBackCoverPage />

          <BookletImposer enabled={layoutMode === 'booklet'} sourceRef={containerRef as React.RefObject<HTMLElement>} layoutKey={JSON.stringify(counts)} />
        </div>
      </div>
    </POSPureLayout>
  );
}
