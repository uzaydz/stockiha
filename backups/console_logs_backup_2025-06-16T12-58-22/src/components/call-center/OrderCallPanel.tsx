import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  User, 
  MapPin, 
  Package, 
  DollarSign,
  MessageSquare,
  CheckCircle,
  X,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  assignedAt: string;
  lastContact?: string;
  notes?: string;
  attempts: number;
  maxAttempts: number;
}

interface OrderCallPanelProps {
  order: Order;
  isVisible: boolean;
  onClose: () => void;
  onCallStart: (orderId: string) => void;
  onCallEnd: (orderId: string, outcome: 'completed' | 'no_answer' | 'busy' | 'cancelled') => void;
  onUpdateNotes: (orderId: string, notes: string) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}

const OrderCallPanel: React.FC<OrderCallPanelProps> = ({
  order,
  isVisible,
  onClose,
  onCallStart,
  onCallEnd,
  onUpdateNotes,
  onUpdateStatus
}) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState(order.notes || '');
  const [isMuted, setIsMuted] = useState(false);
  const [callOutcome, setCallOutcome] = useState<'completed' | 'no_answer' | 'busy' | 'cancelled' | null>(null);

  // مؤقت المكالمة
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // تنسيق وقت المكالمة
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // بدء المكالمة
  const handleStartCall = () => {
    setIsCallActive(true);
    setCallDuration(0);
    onCallStart(order.id);
  };

  // إنهاء المكالمة
  const handleEndCall = (outcome: 'completed' | 'no_answer' | 'busy' | 'cancelled') => {
    setIsCallActive(false);
    setCallOutcome(outcome);
    onCallEnd(order.id, outcome);
    
    // تحديث حالة الطلب حسب النتيجة
    if (outcome === 'completed') {
      onUpdateStatus(order.id, 'completed');
    }
  };

  // حفظ الملاحظات
  const handleSaveNotes = () => {
    onUpdateNotes(order.id, callNotes);
  };

  // إغلاق اللوحة
  const handleClose = () => {
    if (isCallActive) {
      handleEndCall('cancelled');
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="bg-blue-100 p-3 rounded-full">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                مكالمة العميل - طلب #{order.id}
              </h2>
              <p className="text-gray-600">
                {isCallActive ? `جاري الاتصال - ${formatDuration(callDuration)}` : 'جاهز للاتصال'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* معلومات العميل والطلب */}
          <div className="space-y-6">
            {/* معلومات العميل */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 ml-2" />
                معلومات العميل
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">الاسم</label>
                  <p className="text-gray-900 font-medium">{order.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">رقم الهاتف</label>
                  <p className="text-gray-900 font-medium text-lg" dir="ltr">{order.phone}</p>
                </div>
                {order.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">البريد الإلكتروني</label>
                    <p className="text-gray-900">{order.email}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">العنوان</label>
                  <p className="text-gray-900 flex items-start">
                    <MapPin className="h-4 w-4 ml-1 mt-0.5 text-gray-400" />
                    {order.address}
                  </p>
                </div>
              </div>
            </div>

            {/* تفاصيل الطلب */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 ml-2" />
                تفاصيل الطلب
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {(item.price * item.quantity).toLocaleString()} ر.س
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="text-lg font-bold text-gray-900">المجموع الكلي:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {order.totalAmount.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 ml-2" />
                معلومات إضافية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">الأولوية</label>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    order.priority === 'high' ? 'bg-red-100 text-red-800' :
                    order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.priority === 'high' ? 'عالية' : 
                     order.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">المحاولات</label>
                  <p className="text-gray-900">{order.attempts}/{order.maxAttempts}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">تاريخ التخصيص</label>
                  <p className="text-gray-900 text-sm">
                    {new Date(order.assignedAt).toLocaleString('ar-SA')}
                  </p>
                </div>
                {order.lastContact && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">آخر اتصال</label>
                    <p className="text-gray-900 text-sm">
                      {new Date(order.lastContact).toLocaleString('ar-SA')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* لوحة التحكم في المكالمة */}
          <div className="space-y-6">
            {/* أزرار التحكم */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                التحكم في المكالمة
              </h3>
              
              {!isCallActive ? (
                <div className="text-center">
                  <button
                    onClick={handleStartCall}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-colors flex items-center mx-auto"
                  >
                    <Phone className="h-6 w-6 ml-2" />
                    بدء المكالمة
                  </button>
                  <p className="text-gray-600 mt-2">اضغط لبدء الاتصال بالعميل</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* مؤقت المكالمة */}
                  <div className="text-center">
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-block">
                      <span className="text-2xl font-mono">{formatDuration(callDuration)}</span>
                    </div>
                    <p className="text-gray-600 mt-1">مدة المكالمة</p>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-center space-x-4 space-x-reverse">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3 rounded-full transition-colors ${
                        isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}
                      title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* أزرار إنهاء المكالمة */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleEndCall('completed')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 ml-2" />
                      تم التأكيد
                    </button>
                    <button
                      onClick={() => handleEndCall('no_answer')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg flex items-center justify-center"
                    >
                      <PhoneOff className="h-5 w-5 ml-2" />
                      لا يجيب
                    </button>
                    <button
                      onClick={() => handleEndCall('busy')}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg flex items-center justify-center"
                    >
                      <Phone className="h-5 w-5 ml-2" />
                      مشغول
                    </button>
                    <button
                      onClick={() => handleEndCall('cancelled')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center justify-center"
                    >
                      <X className="h-5 w-5 ml-2" />
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ملاحظات المكالمة */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 ml-2" />
                ملاحظات المكالمة
              </h3>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك حول المكالمة هنا..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <button
                onClick={handleSaveNotes}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                حفظ الملاحظات
              </button>
            </div>

            {/* نتيجة المكالمة */}
            {callOutcome && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">نتيجة المكالمة</h3>
                <div className={`p-3 rounded-lg ${
                  callOutcome === 'completed' ? 'bg-green-100 text-green-800' :
                  callOutcome === 'no_answer' ? 'bg-yellow-100 text-yellow-800' :
                  callOutcome === 'busy' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {callOutcome === 'completed' && 'تم تأكيد الطلب بنجاح'}
                  {callOutcome === 'no_answer' && 'العميل لا يجيب'}
                  {callOutcome === 'busy' && 'الخط مشغول'}
                  {callOutcome === 'cancelled' && 'تم إلغاء المكالمة'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 space-x-reverse p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCallPanel;