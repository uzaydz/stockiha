import { Separator } from "@/components/ui/separator";
import { FormField as IFormField } from '@/api/form-settings';

interface FieldTypeMenuProps {
  onSelectFieldType: (type: IFormField['type']) => void;
  onAddPresetFields?: () => void;
}

export function FieldTypeMenu({ onSelectFieldType, onAddPresetFields }: FieldTypeMenuProps) {
  return (
    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
      <div className="text-sm font-medium text-muted-foreground mb-2 px-2">اختر نوع الحقل</div>
      <Separator className="mb-2" />
      
      <button
        onClick={() => onSelectFieldType('text')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1 rounded">
          <span className="text-xs">Aa</span>
        </span>
        <span>نص</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('email')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 p-1 rounded">
          <span className="text-xs">@</span>
        </span>
        <span>بريد إلكتروني</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('tel')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 p-1 rounded">
          <span className="text-xs">📞</span>
        </span>
        <span>هاتف</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('select')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 p-1 rounded">
          <span className="text-xs">▼</span>
        </span>
        <span>قائمة منسدلة</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('radio')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-1 rounded">
          <span className="text-xs">◉</span>
        </span>
        <span>اختيار واحد</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('checkbox')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 p-1 rounded">
          <span className="text-xs">✓</span>
        </span>
        <span>اختيار متعدد</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('province')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 p-1 rounded">
          <span className="text-xs">🏢</span>
        </span>
        <span>ولاية</span>
      </button>
      
      <button
        onClick={() => onSelectFieldType('municipality')}
        className="flex items-center gap-2 w-full text-start hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded"
      >
        <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 p-1 rounded">
          <span className="text-xs">🏠</span>
        </span>
        <span>بلدية</span>
      </button>
      
      <Separator className="my-2" />
      
      <button
        onClick={onAddPresetFields}
        className="flex items-center gap-2 w-full text-start bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded font-medium text-blue-700 dark:text-blue-300"
      >
        <span className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 p-1 rounded">
          <span className="text-xs">🚀</span>
        </span>
        <span>إضافة حقول مجهزة مسبقًا</span>
      </button>
    </div>
  );
} 