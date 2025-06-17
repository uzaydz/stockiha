import React, { useState } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  CheckCircle, 
  X, 
  Clock, 
  MessageSquare,
  RotateCcw,
  Calendar,
  AlertCircle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Mic,
  MicOff
} from 'lucide-react';

interface QuickCallActionsProps {
  orderId: string;
  customerName: string;
  customerPhone: string;
  isCallActive?: boolean;
  callDuration?: number;
  onStartCall: (orderId: string) => void;
  onEndCall: (orderId: string, outcome: CallOutcome) => void;
  onScheduleCallback: (orderId: string, scheduledTime: Date) => void;
  onAddNote: (orderId: string, note: string) => void;
  onMarkCompleted: (orderId: string) => void;
  onMarkCancelled: (orderId: string) => void;
  disabled?: boolean;
}

type CallOutcome = 'completed' | 'no_answer' | 'busy' | 'wrong_number' | 'callback_requested' | 'cancelled';

const QuickCallActions: React.FC<QuickCallActionsProps> = ({
  orderId,
  customerName,
  customerPhone,
  isCallActive = false,
  callDuration = 0,
  onStartCall,
  onEndCall,
  onScheduleCallback,
  onAddNote,
  onMarkCompleted,
  onMarkCancelled,
  disabled = false
}) => {
  const [showOutcomeMenu, setShowOutcomeMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // تنسيق وقت المكالمة
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // بدء المكالمة
  const handleStartCall = () => {
    onStartCall(orderId);
  };

  // إنهاء المكالمة مع النتيجة
  const handleEndCall = (outcome: CallOutcome) => {
    onEndCall(orderId, outcome);
    setShowOutcomeMenu(false);
  };

  // جدولة معاودة الاتصال
  const handleScheduleCallback = () => {
    if (scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      onScheduleCallback(orderId, scheduledDateTime);
      setShowScheduleModal(false);
      setScheduledDate('');
      setScheduledTime('');
    }
  };

  // إضافة ملاحظة سريعة
  const handleAddQuickNote = () => {
    if (quickNote.trim()) {
      onAddNote(orderId, quickNote.trim());
      setQuickNote('');
      setShowNoteModal(false);
    }
  };

  // قوالب الملاحظات السريعة
  const quickNoteTemplates = [
    'العميل لا يجيب',
    'الخط مشغول',
    'رقم خاطئ',
    'العميل طلب معاودة الاتصال',
    'العميل مهتم بالشراء',
    'العميل يريد إلغاء الطلب',
    'تم تأكيد الطلب',
    'العميل يحتاج وقت للتفكير'
  ];

  // نتائج المكالمة مع الألوان والأيقونات
  const callOutcomes = [
    {
      key: 'completed' as CallOutcome,
      label: 'تم التأكيد',
      icon: CheckCircle,
      color: 'bg-green-600 hover:bg-green-700',
      description: 'تم تأكيد الطلب بنجاح'
    },
    {
      key: 'no_answer' as CallOutcome,
      label: 'لا يجيب',
      icon: PhoneOff,
      color: 'bg-yellow-600 hover:bg-yellow-700',
      description: 'العميل لا يجيب على المكالمة'
    },
    {
      key: 'busy' as CallOutcome,
      label: 'مشغول',
      icon: Phone,
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'الخط مشغول'
    },
    {
      key: 'wrong_number' as CallOutcome,
      label: 'رقم خاطئ',
      icon: AlertCircle,
      color: 'bg-red-600 hover:bg-red-700',
      description: 'رقم الهاتف غير صحيح'
    },
    {
      key: 'callback_requested' as CallOutcome,
      label: 'طلب معاودة',
      icon: RotateCcw,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'العميل طلب معاودة الاتصال'
    },
    {
      key: 'cancelled' as CallOutcome,
      label: 'إلغاء',
      icon: X,
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'إلغاء المكالمة'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* معلومات المكالمة */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{customerName}</h4>
          <p className="text-sm text-gray-600" dir="ltr">{customerPhone}</p>
        </div>
        {isCallActive && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">
              🔴 {formatDuration(callDuration)}
            </span>
          </div>
        )}
      </div>

      {!isCallActive ? (
        /* أزرار ما قبل المكالمة */
        <div className="space-y-3">
          <button
            onClick={handleStartCall}
            disabled={disabled}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <Phone className="h-5 w-5 ml-2" />
            بدء المكالمة
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <Calendar className="h-4 w-4 ml-1" />
              جدولة
            </button>
            <button
              onClick={() => setShowNoteModal(true)}
              disabled={disabled}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <MessageSquare className="h-4 w-4 ml-1" />
              ملاحظة
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onMarkCompleted(orderId)}
              disabled={disabled}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <CheckCircle className="h-4 w-4 ml-1" />
              تأكيد
            </button>
            <button
              onClick={() => onMarkCancelled(orderId)}
              disabled={disabled}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <X className="h-4 w-4 ml-1" />
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        /* أزرار أثناء المكالمة */
        <div className="space-y-3">
          {/* أزرار التحكم في المكالمة */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-lg transition-colors ${
                isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-3 rounded-lg transition-colors ${
                isMicMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isMicMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
            >
              {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setShowNoteModal(true)}
              className="p-3 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              title="إضافة ملاحظة"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowOutcomeMenu(true)}
              className="p-3 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              title="إنهاء المكالمة"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>

          {/* قائمة نتائج المكالمة */}
          {showOutcomeMenu && (
            <div className="grid grid-cols-2 gap-2">
              {callOutcomes.map((outcome) => {
                const Icon = outcome.icon;
                return (
                  <button
                    key={outcome.key}
                    onClick={() => handleEndCall(outcome.key)}
                    className={`${outcome.color} text-white py-2 px-3 rounded-lg flex items-center justify-center text-sm transition-colors`}
                    title={outcome.description}
                  >
                    <Icon className="h-4 w-4 ml-1" />
                    {outcome.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* مودال جدولة معاودة الاتصال */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">جدولة معاودة الاتصال</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوقت</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleScheduleCallback}
                disabled={!scheduledDate || !scheduledTime}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                جدولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال الملاحظة السريعة */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة ملاحظة سريعة</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الملاحظة</label>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">قوالب سريعة</label>
                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                  {quickNoteTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setQuickNote(template)}
                      className="text-right p-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-all"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setQuickNote('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddQuickNote}
                disabled={!quickNote.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickCallActions; 