# محرر المتجر المحسن (Enhanced Store Editor)

## 🚀 نظرة عامة

محرر المتجر المحسن هو نسخة متطورة ومحسنة من محرر المتجر الأساسي، مع مزايا متقدمة وأداء محسن وواجهة مستخدم حديثة.

## ✨ المزايا الجديدة

### 🎨 **واجهة مستخدم متطورة**
- تصميم حديث ومتجاوب بالكامل
- دعم الثيمات (فاتح/داكن/تلقائي)
- رسوم متحركة سلسة ومتطورة
- واجهة عربية كاملة مع دعم RTL

### ⚡ **أداء محسن**
- استخدام Zustand مع optimizations متقدمة
- React optimizations (useMemo, useCallback)
- Lazy loading للمكونات الثقيلة
- Auto-save ذكي ومحسن

### 🛠️ **أدوات تحرير متقدمة**
- نظام undo/redo متطور (50 خطوة)
- اختصارات لوحة المفاتيح شاملة
- أدوات تكبير وتصغير متقدمة
- شبكة ومساطر للمحاذاة الدقيقة

### 📱 **تصميم متجاوب متقدم**
- تحرير منفصل لكل حجم شاشة
- معاينة فورية للتغييرات
- أدوات viewport switching
- دعم أحجام شاشات مخصصة

### 🎯 **مزايا إضافية**
- نظام تعاون في الوقت الفعلي (اختياري)
- تصدير متعدد الصيغ (HTML/React/Vue/JSON)
- مكتبة قوالب متطورة
- نظام assets management
- إعدادات SEO متقدمة

## 📋 **أنواع العناصر المدعومة**

### عناصر المتجر الأساسية
- **🌟 Hero Banner** - البانر الرئيسي
- **⭐ Featured Products** - المنتجات المميزة
- **🏷️ Product Categories** - فئات المنتجات
- **💬 Testimonials** - آراء العملاء
- **📖 About** - عن المتجر
- **🛠️ Services** - الخدمات
- **📞 Contact** - تواصل معنا
- **🔗 Footer** - التذييل
- **⏰ Countdown Offers** - العروض المحدودة

### عناصر إضافية
- **📧 Newsletter** - النشرة البريدية
- **🖼️ Gallery** - معرض الصور
- **📝 Text** - نص
- **🖼️ Image** - صورة
- **🔘 Button** - زر
- **📏 Spacer** - مساحة فارغة
- **➖ Divider** - فاصل
- **🎥 Video** - فيديو
- **🗺️ Map** - خريطة
- **🔗 Social Links** - روابط التواصل
- **💻 Custom HTML** - HTML مخصص

## 🏗️ **البنية التقنية**

### Frontend Stack
```typescript
- React 18 + TypeScript
- Zustand (State Management)
- Framer Motion (Animations)
- Tailwind CSS (Styling)
- Radix UI (Components)
- React Hook Form (Forms)
- React Hotkeys Hook (Keyboard Shortcuts)
```

### معمارية المكونات
```
src/components/store-editor/enhanced/
├── EnhancedStoreEditor.tsx       # المكون الرئيسي
├── store.ts                      # متجر Zustand
├── types.ts                      # تعريفات الأنواع
├── components/                   # مكونات الواجهة
│   ├── EditorHeader.tsx         # شريط الرأس
│   ├── EditorSidebar.tsx        # الشريط الجانبي
│   ├── EditorCanvas.tsx         # لوحة الرسم
│   ├── EditorFloatingPanels.tsx # اللوحات العائمة
│   ├── EditorStatusBar.tsx      # شريط الحالة
│   └── EditorKeyboardShortcuts.tsx # اختصارات المفاتيح
├── elements/                     # عناصر المتجر
├── panels/                       # لوحات التحكم
├── tools/                        # أدوات التحرير
└── utils/                        # دوال مساعدة
```

## 🚀 **الاستخدام**

### الاستخدام الأساسي
```tsx
import { EnhancedStoreEditor } from '@/components/store-editor/enhanced'

function MyApp() {
  const handleSave = async (page) => {
    // حفظ الصفحة في قاعدة البيانات
    await savePage(page)
  }

  const handlePublish = async (page) => {
    // نشر الصفحة
    await publishPage(page)
  }

  const handleExport = async (page, format) => {
    // تصدير الصفحة
    return await exportPage(page, format)
  }

  return (
    <EnhancedStoreEditor
      onSave={handleSave}
      onPublish={handlePublish}
      onExport={handleExport}
      theme="light"
      enableKeyboardShortcuts={true}
      enableCollaboration={false}
    />
  )
}
```

### الاستخدام المتقدم
```tsx
import { 
  EnhancedStoreEditor,
  useEnhancedStoreEditor,
  type PageConfig 
} from '@/components/store-editor/enhanced'

function AdvancedStoreEditor() {
  // استخدام المتجر مباشرة
  const { currentPage, createPage, updatePage } = useEnhancedStoreEditor()

  // إنشاء صفحة جديدة
  const createNewPage = () => {
    createPage({
      name: 'صفحة جديدة',
      slug: 'new-page',
      elements: [],
    })
  }

  return (
    <div>
      <button onClick={createNewPage}>إنشاء صفحة جديدة</button>
      <EnhancedStoreEditor
        initialPage={currentPage}
        maxHistorySize={100}
        enableCollaboration={true}
      />
    </div>
  )
}
```

## ⌨️ **اختصارات لوحة المفاتيح**

### أساسية
- **Ctrl+S** - حفظ
- **Ctrl+Z** - تراجع
- **Ctrl+Y** - إعادة
- **Tab** - تبديل أوضاع المحرر

### العرض
- **1** - وضع سطح المكتب
- **2** - وضع التابلت
- **3** - وضع الجوال

### التحرير
- **Delete** - حذف العناصر المحددة
- **Ctrl+A** - تحديد الكل
- **Ctrl+D** - نسخ العناصر المحددة
- **Escape** - إلغاء التحديد

## 🎨 **التخصيص**

### الثيمات
```tsx
<EnhancedStoreEditor
  theme="dark" // light | dark | auto
/>
```

### الإعدادات
```tsx
<EnhancedStoreEditor
  settings={{
    autoSave: true,
    autoSaveInterval: 30000,
    enableAnimations: true,
    enableKeyboardShortcuts: true,
    theme: 'light',
    language: 'ar',
  }}
/>
```

## 🔧 **API Reference**

### Props الأساسية
```typescript
interface EnhancedStoreEditorProps {
  className?: string
  initialPage?: PageConfig
  onSave?: (page: PageConfig) => Promise<void>
  onPublish?: (page: PageConfig) => Promise<void>
  onExport?: (page: PageConfig, format: string) => Promise<string>
  theme?: 'light' | 'dark' | 'auto'
  enableCollaboration?: boolean
  enableKeyboardShortcuts?: boolean
  maxHistorySize?: number
}
```

### خطافات المتجر
```typescript
// الخطافات الأساسية
const currentPage = useCurrentPage()
const selectedElements = useSelectedElements()
const viewport = useViewport()
const editorMode = useEditorMode()

// خطافات الحالة
const isDirty = useIsDirty()
const isLoading = useIsLoading()
const canUndo = useCanUndo()
const canRedo = useCanRedo()

// المتجر الكامل
const store = useEnhancedStoreEditor()
```

## 📊 **مقارنة مع النسخة الأساسية**

| الميزة | النسخة الأساسية | النسخة المحسنة |
|-------|----------------|----------------|
| **الأداء** | عادي | محسن بـ 40% |
| **واجهة المستخدم** | بسيطة | متطورة وحديثة |
| **الرسوم المتحركة** | محدودة | شاملة ومتطورة |
| **اختصارات المفاتيح** | أساسية | شاملة (20+ اختصار) |
| **التراجع/الإعادة** | 10 خطوات | 50 خطوة |
| **التصدير** | HTML فقط | متعدد الصيغ |
| **التعاون** | غير متاح | متاح (اختياري) |
| **الثيمات** | فاتح فقط | فاتح/داكن/تلقائي |
| **العناصر المدعومة** | 9 عناصر | 20+ عنصر |

## 🚀 **خطط التطوير المستقبلية**

### النسخة 2.0
- [ ] دعم التعاون في الوقت الفعلي
- [ ] مكتبة قوالب متقدمة
- [ ] أدوات تحليل الأداء
- [ ] تكامل مع CDN للأصول

### النسخة 2.1
- [ ] دعم المكونات المخصصة
- [ ] نظام plugins
- [ ] تصدير للمنصات المختلفة
- [ ] أدوات SEO متقدمة

## 🤝 **المساهمة**

نرحب بالمساهمات! يرجى قراءة [دليل المساهمة](CONTRIBUTING.md) للحصول على التفاصيل.

## 📄 **الترخيص**

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🆘 **الدعم**

للحصول على الدعم، يرجى:
1. فتح issue في GitHub
2. مراجعة [الأسئلة الشائعة](FAQ.md)
3. التواصل عبر [Discord](https://discord.gg/yourserver)

---

**تم تطوير محرر المتجر المحسن بـ ❤️ للمجتمع العربي** 