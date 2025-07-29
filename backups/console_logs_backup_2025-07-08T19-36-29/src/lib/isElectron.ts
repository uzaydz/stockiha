/**
 * التحقق من بيئة Electron - معطل لضمان عمل الموقع كموقع ويب فقط
 */
export const isElectron = (): boolean => {
  return false; // دائماً false لضمان عدم تشغيل أي كود خاص بـ Electron
};

export default isElectron;
