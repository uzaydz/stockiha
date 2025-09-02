// نظام إدارة أصوات الإشعارات المتطور

export type NotificationSoundType = 
  | 'new_order' 
  | 'low_stock' 
  | 'payment_received' 
  | 'order_status_change' 
  | 'urgent'
  | 'success'
  | 'info'
  | 'warning';

export interface SoundConfig {
  type: NotificationSoundType;
  frequency: number;
  duration: number;
  volume: number;
  pattern: 'single' | 'double' | 'triple' | 'chord' | 'melody';
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

// تكوين الأصوات المتطورة
const SOUND_CONFIGS: Record<NotificationSoundType, SoundConfig> = {
  new_order: {
    type: 'new_order',
    frequency: 523.25, // C5 - نغمة مفرحة
    duration: 300,
    volume: 0.3,
    pattern: 'chord',
    waveType: 'sine'
  },
  payment_received: {
    type: 'payment_received',
    frequency: 659.25, // E5 - نغمة نجاح
    duration: 400,
    volume: 0.35,
    pattern: 'melody',
    waveType: 'sine'
  },
  low_stock: {
    type: 'low_stock',
    frequency: 440, // A4 - نغمة تحذيرية لطيفة
    duration: 200,
    volume: 0.25,
    pattern: 'double',
    waveType: 'triangle'
  },
  order_status_change: {
    type: 'order_status_change',
    frequency: 493.88, // B4 - نغمة معلوماتية
    duration: 250,
    volume: 0.2,
    pattern: 'single',
    waveType: 'sine'
  },
  urgent: {
    type: 'urgent',
    frequency: 783.99, // G5 - نغمة عاجلة لكن لطيفة
    duration: 150,
    volume: 0.4,
    pattern: 'triple',
    waveType: 'sine'
  },
  success: {
    type: 'success',
    frequency: 587.33, // D5
    duration: 350,
    volume: 0.3,
    pattern: 'chord',
    waveType: 'sine'
  },
  info: {
    type: 'info',
    frequency: 466.16, // A#4
    duration: 200,
    volume: 0.2,
    pattern: 'single',
    waveType: 'sine'
  },
  warning: {
    type: 'warning',
    frequency: 554.37, // C#5
    duration: 250,
    volume: 0.3,
    pattern: 'double',
    waveType: 'triangle'
  }
};

class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private isEnabled: boolean = true;
  private lastPlayTime: number = 0;
  private playQueue: Array<{ config: SoundConfig; delay: number }> = [];
  private isInitialized: boolean = false;

  constructor() {
    // لا نقوم بتهيئة AudioContext هنا - سنقوم بذلك عند الحاجة
  }

  private async initializeAudioContext(): Promise<boolean> {
    if (this.isInitialized && this.audioContext) {
      return true;
    }

    try {
      // إنشاء AudioContext مع معالجة التوافق
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // محاولة استئناف AudioContext إذا كان متوقفاً
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  // تشغيل صوت مفرد
  private async playTone(frequency: number, duration: number, volume: number, waveType: OscillatorType) {
    if (!this.isEnabled) return;

    // تهيئة AudioContext إذا لم يكن موجوداً
    if (!await this.initializeAudioContext() || !this.audioContext) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = waveType;

      // تطبيق منحنى تلاشي ناعم
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
    } catch (error) {
    }
  }

  // تشغيل كورد (عدة نغمات معاً)
  private async playChord(baseFreq: number, duration: number, volume: number, waveType: OscillatorType) {
    const chordIntervals = [1, 1.25, 1.5]; // Major chord
    for (let i = 0; i < chordIntervals.length; i++) {
      setTimeout(async () => {
        await this.playTone(baseFreq * chordIntervals[i], duration, volume * 0.7, waveType);
      }, i * 50);
    }
  }

  // تشغيل لحن
  private async playMelody(baseFreq: number, duration: number, volume: number, waveType: OscillatorType) {
    const melodyPattern = [1, 1.125, 1.25, 1.5]; // جميل ومبهج
    for (let i = 0; i < melodyPattern.length; i++) {
      setTimeout(async () => {
        await this.playTone(baseFreq * melodyPattern[i], duration * 0.6, volume * 0.8, waveType);
      }, i * duration * 0.3);
    }
  }

  // تشغيل صوت الإشعار
  public async playNotificationSound(soundType: NotificationSoundType) {
    if (!this.isEnabled) return;

    // تجنب تشغيل الأصوات بسرعة مفرطة
    const now = Date.now();
    if (now - this.lastPlayTime < 200) return;
    this.lastPlayTime = now;

    const config = SOUND_CONFIGS[soundType];
    if (!config) return;

    try {
      switch (config.pattern) {
        case 'single':
          await this.playTone(config.frequency, config.duration, config.volume, config.waveType);
          break;
        
        case 'double':
          await this.playTone(config.frequency, config.duration * 0.7, config.volume, config.waveType);
          setTimeout(async () => {
            await this.playTone(config.frequency * 1.125, config.duration * 0.7, config.volume, config.waveType);
          }, config.duration * 0.8);
          break;
        
        case 'triple':
          for (let i = 0; i < 3; i++) {
            setTimeout(async () => {
              await this.playTone(config.frequency * [1, 1.125, 1.25][i], config.duration * 0.6, config.volume, config.waveType);
            }, i * config.duration * 0.4);
          }
          break;
        
        case 'chord':
          await this.playChord(config.frequency, config.duration, config.volume, config.waveType);
          break;
        
        case 'melody':
          await this.playMelody(config.frequency, config.duration, config.volume, config.waveType);
          break;
      }
    } catch (error) {
    }
  }

  // تشغيل صوت حسب نوع الإشعار
  public async playForNotificationType(notificationType: string, priority: string = 'medium') {
    let soundType: NotificationSoundType;

    switch (notificationType) {
      case 'new_order':
        soundType = priority === 'urgent' ? 'urgent' : 'new_order';
        break;
      case 'payment_received':
        soundType = 'payment_received';
        break;
      case 'low_stock':
        soundType = priority === 'urgent' ? 'urgent' : 'low_stock';
        break;
      case 'order_status_change':
        soundType = 'order_status_change';
        break;
      default:
        soundType = priority === 'urgent' ? 'urgent' : 'info';
    }

    await this.playNotificationSound(soundType);
  }

  // تهيئة AudioContext عند تفاعل المستخدم
  public async initializeOnUserInteraction(): Promise<boolean> {
    return await this.initializeAudioContext();
  }

  // تعديل مستوى الصوت الرئيسي
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  // تفعيل/إيقاف الأصوات
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // التحقق من حالة التفعيل
  public isAudioEnabled(): boolean {
    return this.isEnabled && this.isInitialized;
  }

  // تشغيل صوت اختبار
  public async playTestSound() {
    await this.playNotificationSound('success');
  }

  // تنظيف الموارد
  public dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
    }
  }
}

// دوال عامة للاستخدام المباشر
export const notificationSoundManager = new NotificationSoundManager();

// تهيئة AudioContext عند تفاعل المستخدم
export const initializeNotificationSounds = async (): Promise<boolean> => {
  return await notificationSoundManager.initializeOnUserInteraction();
};

export const playNotificationSound = async (type: NotificationSoundType) => {
  await notificationSoundManager.playNotificationSound(type);
};

export const playNotificationForType = async (notificationType: string, priority: string = 'medium') => {
  await notificationSoundManager.playForNotificationType(notificationType, priority);
};

export const setNotificationVolume = (volume: number) => {
  notificationSoundManager.setMasterVolume(volume);
};

export const enableNotificationSounds = (enabled: boolean) => {
  notificationSoundManager.setEnabled(enabled);
};

export const playTestNotificationSound = async () => {
  await notificationSoundManager.playTestSound();
};
