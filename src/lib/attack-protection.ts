/**
 * نظام حماية ضد الهجمات والاستخدام المسيء
 * يستهدف حل مشكلة 400,000+ طلب من مستخدم واحد
 */

interface AttackPattern {
  ipAddress: string;
  requestCount: number;
  lastRequest: number;
  firstRequest: number;
  endpoints: Map<string, number>;
  userAgents: Set<string>;
  organizationIds: Set<string>;
  isBlocked: boolean;
  suspiciousScore: number;
}

interface AttackDetectionConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  suspiciousThreshold: number;
  autoBlockThreshold: number;
  whitelist: string[];
  blacklist: string[];
}

class AttackProtectionManager {
  private patterns: Map<string, AttackPattern> = new Map();
  private blockedIPs: Set<string> = new Set();
  
  private config: AttackDetectionConfig = {
    maxRequestsPerMinute: 100,  // زيادة إلى 100 طلب في الدقيقة
    maxRequestsPerHour: 2000,   // زيادة إلى 2000 طلب في الساعة
    maxRequestsPerDay: 20000,   // زيادة إلى 20000 طلب في اليوم
    suspiciousThreshold: 85,    // رفع العتبة المشبوهة
    autoBlockThreshold: 95,     // رفع عتبة الحظر التلقائي
    whitelist: [
      "localhost",
      "127.0.0.1",
      "::1",
      // إضافة IPs موثوقة هنا
    ],
    blacklist: [
      "154.248.47.147", // الـ IP المشبوه من التقرير
    ]
  };

  /**
   * تحليل وتسجيل طلب جديد
   */
  analyzeRequest(
    ipAddress: string,
    endpoint: string,
    userAgent: string,
    organizationId?: string
  ): {
    allowed: boolean;
    reason?: string;
    suspiciousScore: number;
    action: 'allow' | 'throttle' | 'block';
  } {
    
    // فحص القائمة السوداء أولاً
    if (this.config.blacklist.includes(ipAddress) || this.blockedIPs.has(ipAddress)) {
      console.warn(`🚫 [AttackProtection] IP محظور: ${ipAddress}`);
      return {
        allowed: false,
        reason: 'IP في القائمة السوداء أو محظور',
        suspiciousScore: 100,
        action: 'block'
      };
    }

    // فحص القائمة البيضاء
    if (this.config.whitelist.includes(ipAddress)) {
      return {
        allowed: true,
        suspiciousScore: 0,
        action: 'allow'
      };
    }

    // الحصول على أو إنشاء نمط للـ IP
    const pattern = this.getOrCreatePattern(ipAddress);
    
    // تحديث النمط
    this.updatePattern(pattern, endpoint, userAgent, organizationId);
    
    // حساب النتيجة المشبوهة
    const suspiciousScore = this.calculateSuspiciousScore(pattern);
    pattern.suspiciousScore = suspiciousScore;

    // اتخاذ القرار
    const decision = this.makeDecision(pattern, suspiciousScore);
    
    // تسجيل النشاط المشبوه
    if (suspiciousScore > this.config.suspiciousThreshold) {
      this.logSuspiciousActivity(ipAddress, pattern, suspiciousScore);
    }

    // حظر تلقائي إذا تجاوز الحد
    if (suspiciousScore >= this.config.autoBlockThreshold) {
      this.blockIP(ipAddress, `نتيجة مشبوهة: ${suspiciousScore}`);
    }

    return {
      allowed: decision.allowed,
      reason: decision.reason,
      suspiciousScore,
      action: decision.action
    };
  }

  /**
   * حساب النتيجة المشبوهة بناءً على عدة عوامل
   */
  private calculateSuspiciousScore(pattern: AttackPattern): number {
    let score = 0;
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    // عدد الطلبات في الدقيقة الواحدة
    const requestsInLastMinute = this.countRequestsInPeriod(pattern, oneMinute);
    if (requestsInLastMinute > this.config.maxRequestsPerMinute) {
      score += 30;
    }

    // عدد الطلبات في الساعة الواحدة
    const requestsInLastHour = this.countRequestsInPeriod(pattern, oneHour);
    if (requestsInLastHour > this.config.maxRequestsPerHour) {
      score += 25;
    }

    // عدد الطلبات في اليوم الواحد
    if (pattern.requestCount > this.config.maxRequestsPerDay) {
      score += 20;
    }

    // تنوع endpoints (القليل من التنوع = مشبوه)
    if (pattern.endpoints.size === 1 && pattern.requestCount > 100) {
      score += 15; // طلبات متكررة لنفس endpoint
    }

    // تنوع User Agents (عدم التنوع = مشبوه)
    if (pattern.userAgents.size === 1 && pattern.requestCount > 50) {
      score += 10; // نفس User Agent دائماً
    }

    // معدل الطلبات (طلبات سريعة جداً = مشبوه)
    const timeDiff = now - pattern.firstRequest;
    if (timeDiff > 0) {
      const requestsPerSecond = pattern.requestCount / (timeDiff / 1000);
      if (requestsPerSecond > 5) {
        score += 20; // أكثر من 5 طلبات في الثانية
      }
    }

    // تركز على organization واحدة فقط
    if (pattern.organizationIds.size === 1 && pattern.requestCount > 200) {
      score += 10;
    }

    return Math.min(score, 100); // الحد الأقصى 100
  }

  /**
   * عد الطلبات في فترة زمنية محددة
   */
  private countRequestsInPeriod(pattern: AttackPattern, periodMs: number): number {
    // تقدير بسيط - يمكن تحسينه بحفظ timestamps مفصلة
    const now = Date.now();
    if (now - pattern.lastRequest < periodMs) {
      return Math.min(pattern.requestCount, Math.ceil(pattern.requestCount * (periodMs / (now - pattern.firstRequest + 1))));
    }
    return 0;
  }

  /**
   * اتخاذ قرار بناءً على النتيجة المشبوهة
   */
  private makeDecision(pattern: AttackPattern, suspiciousScore: number): {
    allowed: boolean;
    reason?: string;
    action: 'allow' | 'throttle' | 'block';
  } {
    
    if (suspiciousScore >= this.config.autoBlockThreshold) {
      return {
        allowed: false,
        reason: `نشاط مشبوه جداً (${suspiciousScore}/100)`,
        action: 'block'
      };
    }
    
    if (suspiciousScore >= this.config.suspiciousThreshold) {
      return {
        allowed: true, // نسمح لكن مع تقييد
        reason: `نشاط مشبوه (${suspiciousScore}/100) - تقييد الطلبات`,
        action: 'throttle'
      };
    }

    return {
      allowed: true,
      action: 'allow'
    };
  }

  /**
   * الحصول على أو إنشاء نمط لـ IP
   */
  private getOrCreatePattern(ipAddress: string): AttackPattern {
    if (!this.patterns.has(ipAddress)) {
      this.patterns.set(ipAddress, {
        ipAddress,
        requestCount: 0,
        lastRequest: Date.now(),
        firstRequest: Date.now(),
        endpoints: new Map(),
        userAgents: new Set(),
        organizationIds: new Set(),
        isBlocked: false,
        suspiciousScore: 0
      });
    }
    return this.patterns.get(ipAddress)!;
  }

  /**
   * تحديث نمط الـ IP
   */
  private updatePattern(
    pattern: AttackPattern,
    endpoint: string,
    userAgent: string,
    organizationId?: string
  ): void {
    pattern.requestCount++;
    pattern.lastRequest = Date.now();
    
    // تحديث endpoints
    const currentCount = pattern.endpoints.get(endpoint) || 0;
    pattern.endpoints.set(endpoint, currentCount + 1);
    
    // تحديث user agents
    pattern.userAgents.add(userAgent);
    
    // تحديث organization IDs
    if (organizationId) {
      pattern.organizationIds.add(organizationId);
    }
  }

  /**
   * تسجيل النشاط المشبوه
   */
  private logSuspiciousActivity(ipAddress: string, pattern: AttackPattern, score: number): void {
    console.warn(`🚨 [AttackProtection] نشاط مشبوه من IP: ${ipAddress}`, {
      score,
      requestCount: pattern.requestCount,
      endpoints: Array.from(pattern.endpoints.entries()),
      userAgents: Array.from(pattern.userAgents),
      organizationIds: Array.from(pattern.organizationIds),
      duration: pattern.lastRequest - pattern.firstRequest
    });
  }

  /**
   * حظر IP
   */
  blockIP(ipAddress: string, reason: string): void {
    this.blockedIPs.add(ipAddress);
    const pattern = this.patterns.get(ipAddress);
    if (pattern) {
      pattern.isBlocked = true;
    }
    
    console.error(`🚫 [AttackProtection] تم حظر IP: ${ipAddress} - السبب: ${reason}`);
    
    // إشعار المدير
    this.notifyAdmin(ipAddress, reason, pattern);
  }

  /**
   * إلغاء حظر IP
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    const pattern = this.patterns.get(ipAddress);
    if (pattern) {
      pattern.isBlocked = false;
    }
    
  }

  /**
   * إشعار المدير بالنشاط المشبوه
   */
  private notifyAdmin(ipAddress: string, reason: string, pattern?: AttackPattern): void {
    // يمكن إرسال إشعار عبر البريد الإلكتروني أو Slack
    const notification = {
      type: 'SECURITY_ALERT',
      ipAddress,
      reason,
      timestamp: new Date().toISOString(),
      pattern: pattern ? {
        requestCount: pattern.requestCount,
        suspiciousScore: pattern.suspiciousScore,
        endpoints: Array.from(pattern.endpoints.entries()),
        duration: pattern.lastRequest - pattern.firstRequest
      } : null
    };
    
    console.error('🚨 [SECURITY ALERT]', notification);
  }

  /**
   * الحصول على إحصائيات الحماية
   */
  getProtectionStats(): {
    totalIPs: number;
    blockedIPs: number;
    suspiciousIPs: number;
    topOffenders: Array<{ip: string, requests: number, score: number}>;
  } {
    const suspiciousIPs = Array.from(this.patterns.values())
      .filter(p => p.suspiciousScore >= this.config.suspiciousThreshold).length;
    
    const topOffenders = Array.from(this.patterns.values())
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10)
      .map(p => ({
        ip: p.ipAddress,
        requests: p.requestCount,
        score: p.suspiciousScore
      }));

    return {
      totalIPs: this.patterns.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs,
      topOffenders
    };
  }

  /**
   * تنظيف البيانات القديمة
   */
  cleanup(): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const [ip, pattern] of this.patterns.entries()) {
      if (pattern.lastRequest < oneDayAgo && !pattern.isBlocked) {
        this.patterns.delete(ip);
      }
    }
  }
}

// إنشاء مثيل وحيد
export const attackProtectionManager = new AttackProtectionManager();

// تنظيف دوري كل ساعة
setInterval(() => {
  attackProtectionManager.cleanup();
}, 60 * 60 * 1000);

/**
 * Hook للحماية من الهجمات
 */
export function useAttackProtection() {
  return {
    analyzeRequest: attackProtectionManager.analyzeRequest.bind(attackProtectionManager),
    blockIP: attackProtectionManager.blockIP.bind(attackProtectionManager),
    unblockIP: attackProtectionManager.unblockIP.bind(attackProtectionManager),
    getStats: attackProtectionManager.getProtectionStats.bind(attackProtectionManager),
  };
}

// إضافة للـ window للتصحيح والإدارة
if (typeof window !== 'undefined') {
  (window as any).attackProtection = {
    stats: () => attackProtectionManager.getProtectionStats(),
    blockIP: (ip: string, reason: string) => attackProtectionManager.blockIP(ip, reason),
    unblockIP: (ip: string) => attackProtectionManager.unblockIP(ip)
  };
}
