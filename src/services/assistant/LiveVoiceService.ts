/**
 * خدمة المحادثة الصوتية المباشرة (Live Voice Chat)
 * تستخدم MediaRecorder + Whisper API للاستماع المستمر
 * الرد الصوتي عبر Web Speech Synthesis
 *
 * @version 2.0 - MediaRecorder Implementation (replaces Web Speech Recognition)
 */

import { AIGateway } from './AIGateway';

export type VoiceLanguage = 'ar' | 'fr' | 'en';

export interface LiveVoiceOptions {
  language?: VoiceLanguage;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
  continuous?: boolean;
  chunkDuration?: number; // مدة كل جزء بالميلي ثانية (افتراضي: 3000)
}

export class LiveVoiceService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: NodeJS.Timeout | null = null;
  private options: LiveVoiceOptions = {};
  private isProcessing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * التحقق من دعم المتصفح للمحادثة الصوتية
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.speechSynthesis);
  }

  /**
   * بدء الاستماع المستمر بواسطة Whisper
   */
  async startListening(options: LiveVoiceOptions = {}): Promise<void> {
    if (this.isListening) {
      return;
    }

    this.options = {
      language: options.language || 'ar',
      chunkDuration: options.chunkDuration || 3000, // 3 ثواني لكل جزء
      continuous: options.continuous !== false,
      ...options,
    };

    try {
      // طلب إذن الميكروفون
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // إعداد MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });

      this.audioChunks = [];

      // جمع البيانات الصوتية
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // معالجة كل جزء عند التوقف
      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0 && !this.isProcessing) {
          await this.processAudioChunk();
        }
      };

      // معالجة الأخطاء
      this.mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('خطأ في التسجيل الصوتي'));
        }
      };

      // بدء التسجيل
      this.isListening = true;
      this.startRecordingChunk();

    } catch (error: any) {
      console.error('Failed to start listening:', error);
      this.isListening = false;

      if (this.options.onError) {
        const errorMessage =
          error.name === 'NotAllowedError'
            ? 'تم رفض إذن الميكروفون'
            : error.name === 'NotFoundError'
            ? 'لم يتم العثور على ميكروفون'
            : 'فشل بدء الاستماع';

        this.options.onError(new Error(errorMessage));
      }

      throw error;
    }
  }

  /**
   * بدء تسجيل جزء جديد
   */
  private startRecordingChunk(): void {
    if (!this.mediaRecorder || !this.isListening) return;

    this.audioChunks = [];
    this.mediaRecorder.start();

    // إيقاف التسجيل بعد المدة المحددة
    const chunkDuration = this.options.chunkDuration || 3000;
    this.recordingInterval = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, chunkDuration);
  }

  /**
   * معالجة الجزء الصوتي باستخدام Whisper
   */
  private async processAudioChunk(): Promise<void> {
    if (this.isProcessing || this.audioChunks.length === 0) return;

    this.isProcessing = true;

    try {
      // إنشاء blob من الأجزاء المسجلة
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      // تحويل الصوت إلى نص باستخدام Whisper
      const transcription = await AIGateway.transcribeAudio(
        audioBlob,
        this.options.language || 'ar'
      );

      // إرسال النص إذا كان موجوداً
      if (transcription.trim() && this.options.onTranscript) {
        this.options.onTranscript(transcription, true);
      }

    } catch (error: any) {
      console.error('Transcription error:', error);
      if (this.options.onError && error.message && !error.message.includes('API key')) {
        this.options.onError(error);
      }
    } finally {
      this.isProcessing = false;

      // الاستمرار في التسجيل إذا كان الوضع مستمر
      if (this.isListening && this.options.continuous) {
        setTimeout(() => {
          this.startRecordingChunk();
        }, 100);
      } else if (this.options.onEnd) {
        this.options.onEnd();
      }
    }
  }

  /**
   * إيقاف الاستماع
   */
  stopListening(): void {
    this.isListening = false;

    if (this.recordingInterval) {
      clearTimeout(this.recordingInterval);
      this.recordingInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.audioChunks = [];
  }

  /**
   * التحقق من حالة الاستماع
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * تحويل النص إلى صوت (فوري)
   */
  async speak(
    text: string,
    language: string = 'ar-SA',
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech Synthesis غير مدعوم في هذا المتصفح');
    }

    // إيقاف أي صوت قيد التشغيل
    this.stopSpeaking();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // إعدادات الصوت
      utterance.lang = language;
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      // محاولة استخدام صوت عربي إذا كانت اللغة عربية
      if (language.startsWith('ar')) {
        const voices = this.synthesis!.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }
      }

      // معالجة الأحداث
      utterance.onend = () => {
        this.currentUtterance = null;
        if (options.onEnd) {
          options.onEnd();
        }
        resolve();
      };

      utterance.onerror = (event: any) => {
        this.currentUtterance = null;
        const error = new Error(`فشل تشغيل الصوت: ${event.error}`);
        if (options.onError) {
          options.onError(error);
        }
        reject(error);
      };

      this.currentUtterance = utterance;
      this.synthesis!.speak(utterance);
    });
  }

  /**
   * إيقاف تشغيل الصوت الحالي
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * التحقق من حالة التشغيل
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  /**
   * إيقاف كل شيء (الاستماع والتشغيل)
   */
  stopAll(): void {
    this.stopListening();
    this.stopSpeaking();
  }

  /**
   * الحصول على قائمة الأصوات المتاحة
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * الحصول على الأصوات العربية المتاحة
   */
  getArabicVoices(): SpeechSynthesisVoice[] {
    return this.getAvailableVoices().filter(v => v.lang.startsWith('ar'));
  }
}

// مثيل واحد للخدمة (Singleton)
let liveVoiceServiceInstance: LiveVoiceService | null = null;

export function getLiveVoiceService(): LiveVoiceService {
  if (!liveVoiceServiceInstance) {
    liveVoiceServiceInstance = new LiveVoiceService();
  }
  return liveVoiceServiceInstance;
}
