import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Save, 
  Clock, 
  FileText, 
  Plus,
  Trash2,
  Copy,
  CheckCircle
} from 'lucide-react';

interface CallNote {
  id: string;
  timestamp: string;
  content: string;
  type: 'general' | 'customer_response' | 'follow_up' | 'issue' | 'success';
  isTemplate?: boolean;
}

interface CallNotesEditorProps {
  orderId: string;
  initialNotes?: CallNote[];
  onSave: (notes: CallNote[]) => void;
  onAutoSave?: (notes: CallNote[]) => void;
  autoSaveInterval?: number; // بالثواني
}

const CallNotesEditor: React.FC<CallNotesEditorProps> = ({
  orderId,
  initialNotes = [],
  onSave,
  onAutoSave,
  autoSaveInterval = 30
}) => {
  const [notes, setNotes] = useState<CallNote[]>(initialNotes);
  const [currentNote, setCurrentNote] = useState('');
  const [selectedType, setSelectedType] = useState<CallNote['type']>('general');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // قوالب الملاحظات الجاهزة
  const noteTemplates = [
    {
      type: 'customer_response' as const,
      title: 'استجابة العميل',
      templates: [
        'العميل مهتم بالشراء ويريد التفكير',
        'العميل يريد تأجيل الطلب لوقت لاحق',
        'العميل يريد تعديل الطلب',
        'العميل يريد إلغاء الطلب',
        'العميل أكد الطلب وسيتم التوصيل'
      ]
    },
    {
      type: 'follow_up' as const,
      title: 'المتابعة',
      templates: [
        'يحتاج متابعة خلال 24 ساعة',
        'يحتاج متابعة خلال أسبوع',
        'العميل طلب الاتصال في وقت محدد',
        'تم تحديد موعد للتوصيل',
        'في انتظار رد العميل'
      ]
    },
    {
      type: 'issue' as const,
      title: 'مشاكل',
      templates: [
        'رقم الهاتف غير صحيح',
        'العنوان غير واضح',
        'العميل غير متاح',
        'مشكلة في المنتج المطلوب',
        'مشكلة في التوصيل'
      ]
    },
    {
      type: 'success' as const,
      title: 'نجاح',
      templates: [
        'تم تأكيد الطلب بنجاح',
        'العميل راضي عن الخدمة',
        'تم حل المشكلة',
        'العميل أوصى بالخدمة لآخرين',
        'طلب إضافي من العميل'
      ]
    }
  ];

  // الحفظ التلقائي
  useEffect(() => {
    if (onAutoSave && notes.length > 0) {
      const interval = setInterval(() => {
        setIsAutoSaving(true);
        onAutoSave(notes);
        setLastSaved(new Date());
        setTimeout(() => setIsAutoSaving(false), 1000);
      }, autoSaveInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [notes, onAutoSave, autoSaveInterval]);

  // إضافة ملاحظة جديدة
  const addNote = () => {
    if (currentNote.trim()) {
      const newNote: CallNote = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        content: currentNote.trim(),
        type: selectedType
      };
      
      setNotes(prev => [...prev, newNote]);
      setCurrentNote('');
    }
  };

  // حذف ملاحظة
  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  // نسخ ملاحظة
  const copyNote = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // استخدام قالب
  const useTemplate = (template: string) => {
    setCurrentNote(template);
  };

  // حفظ يدوي
  const handleManualSave = () => {
    onSave(notes);
    setLastSaved(new Date());
  };

  // الحصول على لون النوع
  const getTypeColor = (type: CallNote['type']) => {
    switch (type) {
      case 'customer_response':
        return 'bg-blue-100 text-blue-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // الحصول على نص النوع
  const getTypeText = (type: CallNote['type']) => {
    switch (type) {
      case 'customer_response':
        return 'استجابة العميل';
      case 'follow_up':
        return 'متابعة';
      case 'issue':
        return 'مشكلة';
      case 'success':
        return 'نجاح';
      default:
        return 'عام';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 space-x-reverse">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            ملاحظات المكالمة - طلب #{orderId}
          </h3>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          {isAutoSaving && (
            <span className="text-sm text-blue-600 flex items-center">
              <Clock className="h-4 w-4 ml-1" />
              جاري الحفظ...
            </span>
          )}
          {lastSaved && (
            <span className="text-sm text-gray-500">
              آخر حفظ: {lastSaved.toLocaleTimeString('ar-SA')}
            </span>
          )}
          <button
            onClick={handleManualSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Save className="h-4 w-4 ml-2" />
            حفظ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* محرر الملاحظة الجديدة */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الملاحظة
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CallNote['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">عام</option>
              <option value="customer_response">استجابة العميل</option>
              <option value="follow_up">متابعة</option>
              <option value="issue">مشكلة</option>
              <option value="success">نجاح</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              محتوى الملاحظة
            </label>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={addNote}
            disabled={!currentNote.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة ملاحظة
          </button>

          {/* قائمة الملاحظات المحفوظة */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-gray-900">الملاحظات المحفوظة ({notes.length})</h4>
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد ملاحظات بعد</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(note.type)}`}>
                        {getTypeText(note.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(note.timestamp).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <button
                        onClick={() => copyNote(note.content)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="نسخ"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-red-400 hover:text-red-600 p-1 rounded"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* القوالب الجاهزة */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <FileText className="h-4 w-4 ml-2" />
            القوالب الجاهزة
          </h4>
          
          {noteTemplates.map((category) => (
            <div key={category.type} className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-3">{category.title}</h5>
              <div className="space-y-2">
                {category.templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => useTemplate(template)}
                    className="w-full text-right p-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 transition-all"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* إحصائيات سريعة */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-3">إحصائيات الملاحظات</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">إجمالي الملاحظات:</span>
                <span className="font-medium text-blue-900">{notes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">استجابات العميل:</span>
                <span className="font-medium text-blue-900">
                  {notes.filter(n => n.type === 'customer_response').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">المتابعات:</span>
                <span className="font-medium text-blue-900">
                  {notes.filter(n => n.type === 'follow_up').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">المشاكل:</span>
                <span className="font-medium text-blue-900">
                  {notes.filter(n => n.type === 'issue').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallNotesEditor;
