/**
 * نظام التحكم في معدل طلبات API ياليدين
 * 
 * حدود طلبات API ياليدين:
 * - 5 طلبات في الثانية
 * - 50 طلباً في الدقيقة
 * - 1000 طلب في الساعة
 * - 10000 طلب في اليوم
 */

interface RateLimitConfig {
  perSecond: number;  // الحد الأقصى للطلبات في الثانية
  perMinute: number;  // الحد الأقصى للطلبات في الدقيقة
  perHour: number;    // الحد الأقصى للطلبات في الساعة
  perDay: number;     // الحد الأقصى للطلبات في اليوم
}

interface RequestCounter {
  counter: number;
  timestamp: number;
  requests: { timestamp: number }[]; // إضافة سجل للطلبات لتتبعها بشكل دقيق
}

/**
 * فئة للتحكم في معدل طلبات API ياليدين
 */
class YalidineRateLimiter {
  private config: RateLimitConfig;
  private secondCounter: RequestCounter;
  private minuteCounter: RequestCounter;
  private hourCounter: RequestCounter;
  private dayCounter: RequestCounter;
  private queue: Array<() => Promise<any>> = [];
  private isProcessing: boolean = false;
  private lastProcessingStartTime: number | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private watchdogTimerDuration = 30000; // تخفيض من دقيقة إلى 30 ثانية
  private stats: { totalRequests: number; lastRequestTime: number } = { totalRequests: 0, lastRequestTime: 0 };
  
  // حد أقصى لعدد محاولات الانتظار المتتالية قبل إلغاء المعالجة
  private maxWaitAttempts: number = 60;
  private currentWaitAttempts: number = 0;
  
  // وظيفة للاشتراك في حدث الإلغاء
  private onCancelListeners: Array<() => void> = [];

  // زيادة الحد الأقصى لوقت الانتظار من أجل تجنب إلغاء المهام
  private MAX_WAIT_TIME = 120000; // زيادة الحد الأقصى لوقت الانتظار إلى 120 ثانية (بدلاً من 60 ثانية)

  constructor(config?: Partial<RateLimitConfig>) {
    // تكوين حدود المعدل الافتراضية - زيادة الحدود لتحسين الأداء
    this.config = {
      perSecond: config?.perSecond || 5, // زيادة من 2 إلى 5 لتسريع المزامنة
      perMinute: config?.perMinute || 50, // زيادة من 40 إلى 50 (حد API ياليدين)
      perHour: config?.perHour || 500, // زيادة من 250 إلى 500 لتحسين الأداء
      perDay: config?.perDay || 5000 // زيادة من 2500 إلى 5000 لتحسين الأداء
    };

    const now = Date.now();
    this.secondCounter = { counter: 0, timestamp: now, requests: [] };
    this.minuteCounter = { counter: 0, timestamp: now, requests: [] };
    this.hourCounter = { counter: 0, timestamp: now, requests: [] };
    this.dayCounter = { counter: 0, timestamp: now, requests: [] };
  }

  /**
   * إعادة تعيين العداد إذا انتهت فترة الوقت
   */
  private resetCountersIfNeeded(): void {
    const now = Date.now();
    
    // إعادة تعيين عداد الثانية بالطريقة الصحيحة
    if (now - this.secondCounter.timestamp >= 1000) {
      // حساب الطلبات النشطة فقط (التي حدثت في آخر ثانية)
      const activeRequests = this.secondCounter.requests.filter(
        req => now - req.timestamp < 1000
      );
      this.secondCounter = { 
        counter: activeRequests.length, 
        timestamp: now,
        requests: activeRequests
      };
    }
    
    // إعادة تعيين عداد الدقيقة
    if (now - this.minuteCounter.timestamp >= 60 * 1000) {
      // حساب الطلبات النشطة فقط (التي حدثت في آخر دقيقة)
      const activeRequests = this.minuteCounter.requests.filter(
        req => now - req.timestamp < 60 * 1000
      );
      this.minuteCounter = { 
        counter: activeRequests.length, 
        timestamp: now,
        requests: activeRequests
      };
    }
    
    // إعادة تعيين عداد الساعة
    if (now - this.hourCounter.timestamp >= 60 * 60 * 1000) {
      // حساب الطلبات النشطة فقط (التي حدثت في آخر ساعة)
      const activeRequests = this.hourCounter.requests.filter(
        req => now - req.timestamp < 60 * 60 * 1000
      );
      this.hourCounter = { 
        counter: activeRequests.length, 
        timestamp: now,
        requests: activeRequests
      };
    }
    
    // إعادة تعيين عداد اليوم
    if (now - this.dayCounter.timestamp >= 24 * 60 * 60 * 1000) {
      // حساب الطلبات النشطة فقط (التي حدثت في آخر يوم)
      const activeRequests = this.dayCounter.requests.filter(
        req => now - req.timestamp < 24 * 60 * 60 * 1000
      );
      this.dayCounter = { 
        counter: activeRequests.length, 
        timestamp: now,
        requests: activeRequests
      };
    }
  }

  /**
   * التحقق مما إذا كان يمكن إجراء طلب آخر
   */
  private async checkCanMakeRequest(): Promise<void> {
    const now = Date.now();
    
    // تنظيف السجلات القديمة
    this.cleanupExpiredRequests();
    
    // التحقق من عدد الطلبات في الثانية والدقيقة والساعة واليوم
    const secondCount = this.getCountForPeriod(now - 1000, now);
    const minuteCount = this.getCountForPeriod(now - 60000, now);
    const hourCount = this.getCountForPeriod(now - 3600000, now);
    const dayCount = this.getCountForPeriod(now - 86400000, now);
    
    // طباعة الإحصائيات للتشخيص
    if (secondCount >= this.config.perSecond || minuteCount >= this.config.perMinute) {
      
    }
    
    let waitTime = 0;
    
    // تحديد وقت الانتظار بناءً على الحد الذي تم تجاوزه
    if (secondCount >= this.config.perSecond) {
      // تجاوز حد الثانية
      const secondWait = Math.max(0, 1100 - (now - this.secondCounter.requests[this.secondCounter.requests.length - this.config.perSecond]?.timestamp || 0));
      waitTime = Math.max(waitTime, secondWait);
      
      if (secondWait > 0) {
        
      }
    }
    
    if (minuteCount >= this.config.perMinute) {
      // تجاوز حد الدقيقة
      const minuteWait = Math.max(0, 60100 - (now - this.minuteCounter.requests[this.minuteCounter.requests.length - this.config.perMinute]?.timestamp || 0));
      waitTime = Math.max(waitTime, minuteWait);
      
      if (minuteWait > 0) {
        
      }
    }
    
    if (hourCount >= this.config.perHour) {
      // تجاوز حد الساعة
      const hourWait = Math.max(0, 3600100 - (now - this.hourCounter.requests[this.hourCounter.requests.length - this.config.perHour]?.timestamp || 0));
      waitTime = Math.max(waitTime, hourWait);
      
      if (hourWait > 0) {
        
      }
    }
    
    if (dayCount >= this.config.perDay) {
      // تجاوز حد اليوم
      const dayWait = Math.max(0, 86400100 - (now - this.dayCounter.requests[this.dayCounter.requests.length - this.config.perDay]?.timestamp || 0));
      waitTime = Math.max(waitTime, dayWait);
      
      if (dayWait > 0) {
        
      }
    }
    
    // إذا كان هناك حاجة للانتظار
    if (waitTime > 0) {
      // تقسيم الانتظار إلى فترات قصيرة للسماح بإظهار تقدم المزامنة
      const maxSingleWait = 1000; // انتظار 1 ثانية كحد أقصى في كل مرة
      let remainingWait = Math.min(waitTime, this.MAX_WAIT_TIME); // لا ننتظر أكثر من MAX_WAIT_TIME
      
      while (remainingWait > 0 && !this.isProcessing) {
        // تحديث مؤقت الانتظار كل ثانية
        const currentWait = Math.min(remainingWait, maxSingleWait);
        await new Promise(resolve => setTimeout(resolve, currentWait));
        remainingWait -= currentWait;
        
        // إظهار حالة الانتظار لفترات الانتظار الطويلة
        if (remainingWait > 0 && remainingWait % 5000 === 0) {
          
        }
      }
      
      // التحقق مرة أخرى بعد الانتظار (إعادة تكرار)
      if (!this.isProcessing) {
        return this.checkCanMakeRequest();
      }
    }
  }

  /**
   * حذف الطلبات المنتهية من السجلات
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    
    // حذف طلبات الثانية القديمة (أقدم من ثانية واحدة)
    this.secondCounter.requests = this.secondCounter.requests.filter(req => {
      return now - req.timestamp < 1000;
    });
    this.secondCounter.counter = this.secondCounter.requests.length;
    
    // حذف طلبات الدقيقة القديمة (أقدم من دقيقة واحدة)
    this.minuteCounter.requests = this.minuteCounter.requests.filter(req => {
      return now - req.timestamp < 60000;
    });
    this.minuteCounter.counter = this.minuteCounter.requests.length;
    
    // حذف طلبات الساعة القديمة (أقدم من ساعة واحدة)
    this.hourCounter.requests = this.hourCounter.requests.filter(req => {
      return now - req.timestamp < 3600000;
    });
    this.hourCounter.counter = this.hourCounter.requests.length;
    
    // حذف طلبات اليوم القديمة (أقدم من يوم واحد)
    this.dayCounter.requests = this.dayCounter.requests.filter(req => {
      return now - req.timestamp < 86400000;
    });
    this.dayCounter.counter = this.dayCounter.requests.length;
    
    // تنظيف سجل الطلبات لتقليل الذاكرة المستخدمة
    // حد العدد الأقصى للطلبات المخزنة
    const MAX_REQUESTS_TO_KEEP = {
      second: 10,
      minute: 100,
      hour: 1000,
      day: 10000
    };
    
    // تحديد ما إذا كان هناك حاجة للتنظيف
    const needsCleanup = 
      this.secondCounter.requests.length > MAX_REQUESTS_TO_KEEP.second ||
      this.minuteCounter.requests.length > MAX_REQUESTS_TO_KEEP.minute ||
      this.hourCounter.requests.length > MAX_REQUESTS_TO_KEEP.hour ||
      this.dayCounter.requests.length > MAX_REQUESTS_TO_KEEP.day;
    
    if (needsCleanup) {
      // اختصار السجلات للحد الأقصى المسموح به
      if (this.secondCounter.requests.length > MAX_REQUESTS_TO_KEEP.second) {
        this.secondCounter.requests = this.secondCounter.requests.slice(-MAX_REQUESTS_TO_KEEP.second);
      }
      
      if (this.minuteCounter.requests.length > MAX_REQUESTS_TO_KEEP.minute) {
        this.minuteCounter.requests = this.minuteCounter.requests.slice(-MAX_REQUESTS_TO_KEEP.minute);
      }
      
      if (this.hourCounter.requests.length > MAX_REQUESTS_TO_KEEP.hour) {
        this.hourCounter.requests = this.hourCounter.requests.slice(-MAX_REQUESTS_TO_KEEP.hour);
      }
      
      if (this.dayCounter.requests.length > MAX_REQUESTS_TO_KEEP.day) {
        this.dayCounter.requests = this.dayCounter.requests.slice(-MAX_REQUESTS_TO_KEEP.day);
      }
      
      
    }
  }

  /**
   * حساب الوقت المتبقي حتى يمكن إجراء الطلب التالي
   */
  private getDelayUntilNextRequest(): number {
    const now = Date.now();
    
    // تنظيف الطلبات القديمة قبل حساب التأخير
    this.cleanupExpiredRequests();
    
    let delay = 0;
    
    if (this.secondCounter.counter >= this.config.perSecond) {
      // البحث عن أقدم طلب في الثانية الحالية
      const oldestRequestInSecond = this.secondCounter.requests[0];
      if (oldestRequestInSecond) {
        delay = Math.max(delay, 1000 - (now - oldestRequestInSecond.timestamp));
      }
    }
    
    if (this.minuteCounter.counter >= this.config.perMinute) {
      // البحث عن أقدم طلب في الدقيقة الحالية
      const oldestRequestInMinute = this.minuteCounter.requests[0];
      if (oldestRequestInMinute) {
        delay = Math.max(delay, 60 * 1000 - (now - oldestRequestInMinute.timestamp));
      }
    }
    
    if (this.hourCounter.counter >= this.config.perHour) {
      // البحث عن أقدم طلب في الساعة الحالية
      const oldestRequestInHour = this.hourCounter.requests[0];
      if (oldestRequestInHour) {
        delay = Math.max(delay, 60 * 60 * 1000 - (now - oldestRequestInHour.timestamp));
      }
    }
    
    if (this.dayCounter.counter >= this.config.perDay) {
      // البحث عن أقدم طلب في اليوم الحالي
      const oldestRequestInDay = this.dayCounter.requests[0];
      if (oldestRequestInDay) {
        delay = Math.max(delay, 24 * 60 * 60 * 1000 - (now - oldestRequestInDay.timestamp));
      }
    }
    
    return delay;
  }

  /**
   * تسجيل طلب جديد في العدادات
   */
  private registerRequest(): void {
    const now = Date.now();
    
    // إضافة سجل الطلب للعدادات
    const requestRecord = { timestamp: now };
    
    // تحديث عدادات الثانية
    this.secondCounter.counter++;
    this.secondCounter.requests.push(requestRecord);
    
    // تحديث عدادات الدقيقة
    this.minuteCounter.counter++;
    this.minuteCounter.requests.push(requestRecord);
    
    // تحديث عدادات الساعة والإحصائيات
    this.hourCounter.counter++;
    this.hourCounter.requests.push(requestRecord);
    
    // تحديث عدادات اليوم والإحصائيات
    this.dayCounter.counter++;
    this.dayCounter.requests.push(requestRecord);
    
    // تحديث الإحصائيات العامة
    this.stats.totalRequests++;
    this.stats.lastRequestTime = now;
    
    // مسح الطلبات القديمة بشكل فوري لضمان الدقة
    this.cleanupExpiredRequests();
  }

  /**
   * إضافة مهمة إلى قائمة الانتظار
   */
  public async schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      
      
      // إعادة تعيين معالجة القائمة إذا كانت عالقة لأكثر من 20 ثانية (تقليل من 30 ثانية)
      const now = Date.now();
      if (this.isProcessing && this.lastProcessingStartTime && now - this.lastProcessingStartTime > 20000) {
        console.warn('[RateLimiter] إعادة تعيين معالجة القائمة - كانت عالقة لأكثر من 20 ثانية');
        this.isProcessing = false;
        this.lastProcessingStartTime = null;
        
        // تنظيف مؤقت المراقبة إذا كان موجوداً
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
      }
      
      // إضافة مهمة جديدة إلى قائمة الانتظار
      this.queue.push(async () => {
        try {
          
          
          // تنفيذ المهمة مع آلية إعادة المحاولة البسيطة
          let result: T;
          let attempts = 0;
          const maxAttempts = 3;
          let lastError: any = null;
          
          while (attempts < maxAttempts) {
            try {
              result = await task();
              
              resolve(result);
              
              // الخروج من الحلقة بعد النجاح
              break;
            } catch (error: any) {
              lastError = error;
              attempts++;
              
              // تحقق ما إذا كان الخطأ هو خطأ شبكة
              if (error && error.code === 'ERR_NETWORK' && attempts < maxAttempts) {
                // حساب فترة الانتظار مع تأخير متزايد
                const retryDelay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
                console.warn(`[RateLimiter] خطأ شبكة، إعادة المحاولة ${attempts}/${maxAttempts} بعد ${retryDelay}ms: ${error.message}`);
                
                // انتظار قبل المحاولة التالية
                await new Promise(resolveRetry => setTimeout(resolveRetry, retryDelay));
              } else {
                // إذا لم يكن خطأ شبكة أو وصلنا للحد الأقصى من المحاولات
                console.error('[RateLimiter] خطأ أثناء تنفيذ المهمة:', error);
                reject(error);
                break;
              }
            }
          }
          
          // إذا استنفدنا جميع المحاولات ولا يزال هناك خطأ
          if (attempts >= maxAttempts && lastError) {
            console.error(`[RateLimiter] فشلت جميع محاولات إعادة المحاولة (${maxAttempts}):`, lastError);
            reject(lastError);
          }
          
          // إزالة التأخير الإضافي بين الطلبات لتسريع المزامنة
          // await new Promise(resolveWait => setTimeout(resolveWait, 25));
          
          // فحص القائمة مرة أخرى بعد إكمال المهمة الحالية
          // هذا يساعد في حالة وجود مهام إضافية وصلت أثناء معالجة المهمة الحالية
          if (this.queue.length > 0) {
            // تأخير صغير لمنع التداخل مع عملية المعالجة الحالية
            setTimeout(() => {
              if (!this.isProcessing && this.queue.length > 0) {
                this.processQueue().catch(console.error);
              }
            }, 5); // تقليل التأخير من 10ms إلى 5ms
          }
        } catch (error) {
          console.error('[RateLimiter] خطأ أثناء تنفيذ المهمة:', error);
          reject(error);
        }
      });
      
      // بدء معالجة قائمة الانتظار إذا لم تكن قيد المعالجة بالفعل
      if (!this.isProcessing) {
        this.processQueue().catch(error => {
          console.error('[RateLimiter] خطأ أثناء معالجة قائمة الانتظار:', error);
          this.isProcessing = false; // إعادة تعيين في حالة حدوث خطأ
          this.lastProcessingStartTime = null; 
          reject(error);
        });
      } else {
        
      }
    });
  }

  /**
   * معالجة قائمة الانتظار
   */
  private async processQueue(): Promise<void> {
    // إذا كانت المعالجة جارية بالفعل أو القائمة فارغة، فلا تفعل شيئًا
    if (this.isProcessing) {
      
      return;
    }
    
    if (this.queue.length === 0) {
      
      return;
    }
    
    
    this.isProcessing = true;
    this.lastProcessingStartTime = Date.now();
    
    // إعداد مؤقت مراقبة لمنع توقف المعالجة - تقصير المدة
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
    
    this.watchdogTimer = setTimeout(() => {
      console.warn('[RateLimiter] تم تشغيل مؤقت مراقبة الحارس - إعادة تعيين حالة المعالجة العالقة');
      this.isProcessing = false;
      this.lastProcessingStartTime = null;
      
      // محاولة إعادة معالجة القائمة
      this.processQueue();
    }, 15000); // تقليل من 30 ثانية إلى 15 ثانية
    
    try {
      // معالجة المهام حتى تصبح القائمة فارغة
      while (this.queue.length > 0) {
        // تنظيف سجلات الطلبات القديمة
        this.cleanupExpiredRequests();
        
        // عدد الطلبات المتاحة لكل فئة زمنية
        const availableSecondSlots = this.config.perSecond - this.secondCounter.counter;
        const availableMinuteSlots = this.config.perMinute - this.minuteCounter.counter;
        
        // الحد الأقصى لعدد المهام المتوازية - زيادة عدد المهام المتوازية لتحسين الأداء
        const maxParallelTasks = 10;
        
        
        
        // تحديد عدد المهام التي يمكن تنفيذها بالتوازي
        const availableSlots = Math.min(
          availableSecondSlots,
          Math.min(availableMinuteSlots, Math.min(maxParallelTasks, this.queue.length))
        );
        
        if (availableSlots > 0) {
          // جمع المهام التي سيتم تنفيذها بالتوازي
          const tasksToExecute = [];
          
          
          
          for (let i = 0; i < availableSlots; i++) {
            if (this.queue.length > 0) {
              const task = this.queue.shift();
              if (task) {
                tasksToExecute.push(task);
                // تسجيل الطلب مباشرة عند أخذه من القائمة
                this.registerRequest();
              }
            }
          }
          
          if (tasksToExecute.length > 0) {
            // تنفيذ المهام بالتوازي بشكل فعلي
            const promises = tasksToExecute.map(task => {
              return task().catch(error => {
                console.error('[RateLimiter] خطأ أثناء تنفيذ المهمة:', error);
              });
            });
            
            // انتظار اكتمال جميع المهام
            await Promise.all(promises);
            
            // إعادة تعيين عداد محاولات الانتظار عند نجاح التنفيذ
            this.currentWaitAttempts = 0;
            
          }
        } else {
          // حساب وقت الانتظار المطلوب
          const delay = this.getDelayUntilNextRequest();
          
          // تحديد نوع القيد - هل هو حد الدقيقة أم حد الثانية
          const isMinuteLimit = this.minuteCounter.counter >= this.config.perMinute;
          const isSecondLimit = this.secondCounter.counter >= this.config.perSecond;
          
          // تعديل وقت الانتظار بناءً على نوع القيد
          let adjustedDelay = delay;
          
          if (isMinuteLimit) {
            // في حالة الوصول إلى حد الدقيقة، ننتظر فترة أطول (على الأقل 1 ثانية)
            // وحتى ربع القيمة الفعلية المتبقية لضمان عدم الدوران المستمر
            adjustedDelay = Math.max(1000, Math.min(15000, delay / 4));
            
          } else if (isSecondLimit) {
            // في حالة الوصول إلى حد الثانية فقط، ننتظر فترة قصيرة نسبيًا
            adjustedDelay = Math.max(100, Math.min(1000, delay / 5));
            
          } else {
            // في حالات أخرى، ننتظر فترة قصيرة جدًا
            adjustedDelay = Math.max(5, Math.min(100, delay / 10));
            
          }
          
          // زيادة عداد محاولات الانتظار
          this.currentWaitAttempts++;
          
          // إذا وصلنا للحد الأقصى من المحاولات، نلغي المعالجة
          if (this.currentWaitAttempts >= this.maxWaitAttempts) {
            this.triggerCancelEvent(`تم تجاوز الحد الأقصى لمحاولات الانتظار (${this.maxWaitAttempts})`);
            break;
          }
          
          // انتظار فترة قصيرة قبل المحاولة مرة أخرى
          await new Promise(resolve => setTimeout(resolve, adjustedDelay));
        }
        
        // تحديث وقت بدء المعالجة لتفادي تنشيط مؤقت المراقبة
        this.lastProcessingStartTime = Date.now();
      }
      
      
    } catch (error) {
      console.error('[RateLimiter] خطأ أثناء معالجة قائمة الانتظار:', error);
    } finally {
      // إلغاء مؤقت المراقبة
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      
      this.isProcessing = false;
      this.lastProcessingStartTime = null;
      
      // التحقق من وجود مهام إضافية في نهاية المعالجة
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  /**
   * الحصول على إحصائيات الاستخدام الحالية
   */
  public getStats(): { perSecond: number; perMinute: number; perHour: number; perDay: number } {
    // تنظيف العدادات قبل إرجاع الإحصائيات
    this.cleanupExpiredRequests();
    
    return {
      perSecond: this.secondCounter.counter,
      perMinute: this.minuteCounter.counter,
      perHour: this.hourCounter.counter,
      perDay: this.dayCounter.counter
    };
  }

  /**
   * الحصول على العدد المتبقي من الطلبات المسموح بها
   */
  public getRemainingRequests(): { perSecond: number; perMinute: number; perHour: number; perDay: number } {
    // تنظيف العدادات قبل حساب العدد المتبقي
    this.cleanupExpiredRequests();
    
    return {
      perSecond: this.config.perSecond - this.secondCounter.counter,
      perMinute: this.config.perMinute - this.minuteCounter.counter,
      perHour: this.config.perHour - this.hourCounter.counter,
      perDay: this.config.perDay - this.dayCounter.counter
    };
  }

  /**
   * إعادة تعيين جميع العدادات والإحصائيات
   */
  public resetStats(): void {
    const now = Date.now();
    this.secondCounter = { counter: 0, timestamp: now, requests: [] };
    this.minuteCounter = { counter: 0, timestamp: now, requests: [] };
    this.hourCounter = { counter: 0, timestamp: now, requests: [] };
    this.dayCounter = { counter: 0, timestamp: now, requests: [] };
    
    // إعادة تعيين حالة المعالجة وقائمة الانتظار
    // هذا مهم لإصلاح الحالات التي قد تتوقف فيها المعالجة
    this.isProcessing = false;
    this.lastProcessingStartTime = null;
    this.queue = [];
    
  }

  /**
   * إلغاء معالجة صف الانتظار وإزالة جميع المهام من القائمة
   * يمكن استخدام هذه الوظيفة عند الحاجة لإيقاف جميع الطلبات المعلقة
   * (على سبيل المثال، عند إيقاف المزامنة يدويًا)
   */
  public cancelProcessing(): void {
    // إيقاف مؤقت المراقبة إذا كان موجوداً
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    
    // إعادة تعيين حالة المعالجة
    this.isProcessing = false;
    this.lastProcessingStartTime = null;
    
    // حفظ المهام المعلقة بدلاً من حذفها مباشرة
    const pendingTasks = [...this.queue];
    const queueLength = this.queue.length;
    this.queue = [];
    
    
    
    // إعادة جدولة المهام بعد فترة انتظار إذا كان هناك مهام معلقة
    if (pendingTasks.length > 0) {
      
      
      // انتظار فترة (2 دقيقة) قبل إعادة جدولة المهام
      setTimeout(() => {
        if (pendingTasks.length > 0) {
          
          
          // إعادة المهام إلى قائمة الانتظار
          this.queue = [...pendingTasks];
          
          // بدء المعالجة من جديد
          if (!this.isProcessing) {
            this.processQueue().catch(console.error);
          }
        }
      }, 120000); // انتظار دقيقتين قبل إعادة المحاولة
    }
  }

  /**
   * تهيئة معدلات طلبات API ياليدين
   * وظيفة جديدة للتحكم الأفضل في حدود الطلبات
   */
  public setRateLimits(config: Partial<RateLimitConfig>): void {
    if (config.perSecond) this.config.perSecond = config.perSecond;
    if (config.perMinute) this.config.perMinute = config.perMinute;
    if (config.perHour) this.config.perHour = config.perHour;
    if (config.perDay) this.config.perDay = config.perDay;
    
  }

  /**
   * الاشتراك في حدث إلغاء معالجة صف الانتظار
   * يمكن استخدام هذا لتنفيذ إجراءات أخرى عند الإلغاء التلقائي
   * (مثل إيقاف المزامنة كليًا)
   */
  public onCancel(callback: () => void): void {
    this.onCancelListeners.push(callback);
  }
  
  /**
   * إطلاق حدث الإلغاء وتنفيذ جميع المستمعين
   */
  private triggerCancelEvent(reason: string): void {
    console.warn(`[RateLimiter] إلغاء المعالجة: ${reason}`);
    this.cancelProcessing();
    this.onCancelListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[RateLimiter] خطأ أثناء تنفيذ مستمع الإلغاء:', error);
      }
    });
  }

  // إضافة طريقة لحساب عدد الطلبات في فترة زمنية محددة
  private getCountForPeriod(start: number, end: number): number {
    // استخدام سجلات الطلبات الموجودة بدلاً من requestHistory غير الموجود
    const allRequests = [
      ...this.secondCounter.requests,
      ...this.minuteCounter.requests,
      ...this.hourCounter.requests,
      ...this.dayCounter.requests
    ];
    
    // إزالة الطلبات المكررة باستخدام مجموعة حسب الطابع الزمني
    const uniqueTimestamps = new Set();
    const uniqueRequests = allRequests.filter(req => {
      if (uniqueTimestamps.has(req.timestamp)) {
        return false;
      }
      uniqueTimestamps.add(req.timestamp);
      return true;
    });
    
    // فلترة الطلبات ضمن النطاق الزمني المحدد
    return uniqueRequests.filter(
      req => req.timestamp >= start && req.timestamp <= end
    ).length;
  }
}

// إنشاء نسخة واحدة للاستخدام في جميع أنحاء التطبيق
export const yalidineRateLimiter = new YalidineRateLimiter();

// تصدير الفئة للاستخدام المباشر
export default YalidineRateLimiter; 