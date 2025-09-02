import React from 'react';
import { cn } from '@/lib/utils';
import { Settings, Palette, Type, Image, Layout, Layers, Code, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditorTool } from '../layouts/StoreEditorLayout';

interface PropertiesPanelProps {
  activeTool: EditorTool;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ activeTool }) => {
  const getToolContent = (tool: EditorTool) => {
    switch (tool) {
      case 'design':
        return <DesignProperties />;
      case 'typography':
        return <TypographyProperties />;
      case 'media':
        return <MediaProperties />;
      case 'layout':
        return <LayoutProperties />;
      case 'components':
        return <ComponentsProperties />;
      case 'code':
        return <CodeProperties />;
      case 'effects':
        return <EffectsProperties />;
      default:
        return <div className="p-4 text-gray-500">اختر أداة من شريط الأدوات</div>;
    }
  };

  if (!activeTool) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {getToolContent(activeTool)}
      </div>
    </ScrollArea>
  );
};

// مكونات الخصائص المختلفة
const DesignProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">الألوان الأساسية</h4>
      <div className="grid grid-cols-4 gap-3">
        {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
          <button
            key={color}
            className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform shadow-sm"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">نمط الخلفية</h4>
      <div className="space-y-3">
        {['لون صلب', 'تدرج خطي', 'تدرج دائري', 'صورة خلفية'].map((option) => (
          <label key={option} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input type="radio" name="background" className="text-indigo-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">الشفافية</h4>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue="100"
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
      />
    </div>
  </div>
);

const TypographyProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">عائلة الخط</h4>
      <div className="space-y-2">
        {[
          { name: 'Cairo', preview: 'نص تجريبي بخط Cairo' },
          { name: 'Amiri', preview: 'نص تجريبي بخط Amiri' },
          { name: 'Tajawal', preview: 'نص تجريبي بخط Tajawal' },
          { name: 'IBM Plex Sans Arabic', preview: 'نص تجريبي بخط IBM Plex' }
        ].map((font) => (
          <button
            key={font.name}
            className="w-full p-3 text-right rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ fontFamily: font.name }}
          >
            <div className="font-medium text-gray-900 dark:text-white">{font.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{font.preview}</div>
          </button>
        ))}
      </div>
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">حجم الخط</h4>
      <div className="grid grid-cols-3 gap-2">
        {['صغير', 'متوسط', 'كبير'].map((size) => (
          <button
            key={size}
            className="p-2 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          >
            {size}
          </button>
        ))}
      </div>
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">تنسيق النص</h4>
      <div className="flex gap-2">
        {['عريض', 'مائل', 'تحته خط'].map((style) => (
          <button
            key={style}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const MediaProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">مكتبة الصور</h4>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        ))}
      </div>
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">رفع صورة جديدة</h4>
      <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">اسحب الصورة هنا أو اضغط للاختيار</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, JPG, GIF حتى 10MB</p>
      </div>
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">إعدادات الصورة</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">العرض</label>
          <input
            type="range"
            min="10"
            max="100"
            defaultValue="100"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">الارتفاع</label>
          <input
            type="range"
            min="10"
            max="100"
            defaultValue="100"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>
    </div>
  </div>
);

const LayoutProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">تخطيط الصفحة</h4>
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'عمود واحد', icon: '│' },
          { name: 'عمودين', icon: '││' },
          { name: 'ثلاثة أعمدة', icon: '│││' },
          { name: 'شبكة', icon: '▦' }
        ].map((layout) => (
          <button
            key={layout.name}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition-colors"
          >
            <div className="text-2xl mb-2">{layout.icon}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{layout.name}</div>
          </button>
        ))}
      </div>
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">المسافات والهوامش</h4>
      <div className="space-y-4">
        {['المسافة الداخلية', 'المسافة الخارجية', 'المسافة بين العناصر'].map((spacing) => (
          <div key={spacing}>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">{spacing}</label>
            <input
              type="range"
              min="0"
              max="50"
              defaultValue="10"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        ))}
      </div>
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">المحاذاة</h4>
      <div className="grid grid-cols-3 gap-2">
        {['يسار', 'وسط', 'يمين'].map((align) => (
          <button
            key={align}
            className="p-2 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          >
            {align}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ComponentsProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">مكونات المتجر</h4>
      <div className="space-y-3">
        {[
          { name: 'رأس الصفحة', icon: '🏠', desc: 'شعار وقائمة التنقل' },
          { name: 'قسم البطل', icon: '🎯', desc: 'صورة كبيرة مع نص ترحيبي' },
          { name: 'عرض المنتجات', icon: '🛍️', desc: 'شبكة المنتجات المميزة' },
          { name: 'فئات المنتجات', icon: '📂', desc: 'تصنيفات المتجر' },
          { name: 'آراء العملاء', icon: '⭐', desc: 'تقييمات وتعليقات' },
          { name: 'معلومات الاتصال', icon: '📞', desc: 'بيانات التواصل' },
          { name: 'ذيل الصفحة', icon: '📄', desc: 'روابط ومعلومات إضافية' }
        ].map((component) => (
          <button
            key={component.name}
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-right transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{component.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{component.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{component.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const CodeProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">HTML مخصص</h4>
      <textarea
        className="w-full h-32 p-3 bg-gray-900 text-green-400 font-mono text-sm rounded-lg border border-gray-600 resize-none"
        placeholder="<div class='custom-section'>&#10;  <!-- المحتوى المخصص -->&#10;</div>"
      />
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">CSS مخصص</h4>
      <textarea
        className="w-full h-32 p-3 bg-gray-900 text-blue-400 font-mono text-sm rounded-lg border border-gray-600 resize-none"
        placeholder=".custom-section {&#10;  background: #f0f0f0;&#10;  padding: 20px;&#10;  border-radius: 8px;&#10;}"
      />
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">JavaScript مخصص</h4>
      <textarea
        className="w-full h-32 p-3 bg-gray-900 text-yellow-400 font-mono text-sm rounded-lg border border-gray-600 resize-none"
        placeholder="// كود JavaScript مخصص&#10;document.addEventListener('DOMContentLoaded', function() {&#10;  // الكود هنا&#10;});"
      />
    </div>
  </div>
);

const EffectsProperties: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">تأثيرات الدخول</h4>
      <div className="space-y-2">
        {[
          'بدون تأثير',
          'تلاشي تدريجي',
          'انزلاق من اليمين',
          'انزلاق من اليسار',
          'انزلاق من الأعلى',
          'انزلاق من الأسفل',
          'تكبير تدريجي',
          'دوران مع تكبير'
        ].map((effect) => (
          <button
            key={effect}
            className="w-full p-3 text-right rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{effect}</span>
          </button>
        ))}
      </div>
    </div>
    
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">إعدادات التأثير</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">مدة التأثير (ثانية)</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            defaultValue="0.5"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">تأخير البداية (ثانية)</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            defaultValue="0"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">تأثيرات التفاعل</h4>
      <div className="space-y-2">
        {[
          'تكبير عند التمرير',
          'تغيير اللون عند التمرير',
          'إضافة ظل عند التمرير',
          'دوران طفيف عند التمرير'
        ].map((effect) => (
          <label key={effect} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input type="checkbox" className="text-indigo-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{effect}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

export { PropertiesPanel };
