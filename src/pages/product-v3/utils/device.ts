export const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false;
  const deviceMemory = (navigator as any).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency;
  const connection = (navigator as any).connection;
  // اعتبر الجهاز منخفض الإمكانيات فقط عند توفر مؤشرات فعلية:
  // - ذاكرة جهاز قليلة (<= 2GB)
  // - عدد أنوية منخفض (<= 2)
  // - اتصال شبكة بطيء جداً (2G/slow-2g)
  // لا تعتمد على عرض الشاشة لتجنب تعطيل الأنمايشن على الهواتف الحديثة
  return (
    (typeof deviceMemory === 'number' && deviceMemory <= 2) ||
    (typeof hardwareConcurrency === 'number' && hardwareConcurrency <= 2) ||
    (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'))
  );
};
