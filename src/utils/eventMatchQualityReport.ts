/**
 * تقرير جودة مطابقة الأحداث (Event Match Quality) لـ Facebook Pixel
 * يساعد في مراقبة وتحسين جودة البيانات المرسلة إلى Facebook
 */

interface EventMatchQualityData {
  // البيانات الأساسية المطلوبة
  hasValue: boolean;
  hasCurrency: boolean;
  hasEventId: boolean;
  
  // بيانات العميل المحسنة
  hasFirstName: boolean;
  hasLastName: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasCity: boolean;
  hasState: boolean;
  hasCountry: boolean;
  hasZipCode: boolean;
  
  // معرفات Facebook
  hasFbp: boolean;
  hasFbc: boolean;
  hasClientUserAgent: boolean;
  hasClientIpAddress: boolean;
  
  // معلومات إضافية
  hasExternalId: boolean;
  hasOrderId: boolean;
  hasProductInfo: boolean;
}

interface EventMatchQualityReport {
  score: number;
  improvements: string[];
  currentData: EventMatchQualityData;
  potentialIncrease: number;
  recommendations: string[];
}

export class EventMatchQualityAnalyzer {
  
  /**
   * تحليل جودة مطابقة الأحداث للبيانات المرسلة
   */
  static analyzeEventData(eventData: any, userData?: any): EventMatchQualityReport {
    const data: EventMatchQualityData = {
      // البيانات الأساسية
      hasValue: !!eventData.value,
      hasCurrency: !!eventData.currency,
      hasEventId: !!eventData.eventID,
      
      // بيانات العميل
      hasFirstName: !!(userData?.firstName || userData?.fn),
      hasLastName: !!(userData?.lastName || userData?.ln),
      hasPhone: !!(userData?.phone || userData?.ph),
      hasEmail: !!(userData?.email || userData?.em),
      hasCity: !!(userData?.city || userData?.ct),
      hasState: !!(userData?.state || userData?.st),
      hasCountry: !!(userData?.country),
      hasZipCode: !!(userData?.zipCode || userData?.zp),
      
      // معرفات Facebook
      hasFbp: !!(userData?.fbp),
      hasFbc: !!(userData?.fbc),
      hasClientUserAgent: !!(userData?.client_user_agent),
      hasClientIpAddress: !!(userData?.client_ip_address || userData?.clientIpAddress),
      
      // معلومات إضافية
      hasExternalId: !!(userData?.external_id),
      hasOrderId: !!(eventData.order_id),
      hasProductInfo: !!(eventData.content_ids && eventData.content_ids.length > 0)
    };

    const score = this.calculateScore(data);
    const improvements = this.getImprovements(data);
    const potentialIncrease = this.calculatePotentialIncrease(data);
    const recommendations = this.getRecommendations(data);

    return {
      score,
      improvements,
      currentData: data,
      potentialIncrease,
      recommendations
    };
  }

  /**
   * حساب نقاط جودة المطابقة الحالية
   */
  private static calculateScore(data: EventMatchQualityData): number {
    let score = 0;
    
    // البيانات الأساسية (20 نقطة)
    if (data.hasValue) score += 5;
    if (data.hasCurrency) score += 5;
    if (data.hasEventId) score += 5;
    if (data.hasOrderId) score += 5;
    
    // بيانات العميل الشخصية (30 نقطة)
    if (data.hasFirstName) score += 5;
    if (data.hasLastName) score += 5;
    if (data.hasPhone) score += 10; // أهمية عالية
    if (data.hasEmail) score += 10; // أهمية عالية
    
    // بيانات الموقع (20 نقطة)
    if (data.hasCity) score += 5;
    if (data.hasState) score += 5;
    if (data.hasCountry) score += 5;
    if (data.hasZipCode) score += 5;
    
    // معرفات Facebook (20 نقطة)
    if (data.hasFbp) score += 8;
    if (data.hasFbc) score += 8;
    if (data.hasClientUserAgent) score += 2;
    if (data.hasClientIpAddress) score += 2;
    
    // معلومات إضافية (10 نقاط)
    if (data.hasExternalId) score += 5;
    if (data.hasProductInfo) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * الحصول على قائمة التحسينات المطبقة
   */
  private static getImprovements(data: EventMatchQualityData): string[] {
    const improvements: string[] = [];
    
    if (data.hasFirstName && data.hasLastName) {
      improvements.push('✅ تم تقسيم الاسم الكامل إلى الاسم الأول والأخير');
    }
    
    if (data.hasFbp) {
      improvements.push('✅ تم إضافة Facebook Browser ID (fbp)');
    }
    
    if (data.hasFbc) {
      improvements.push('✅ تم إضافة Facebook Click ID (fbc)');
    }
    
    if (data.hasClientIpAddress) {
      improvements.push('✅ تم إضافة عنوان IP للعميل');
    }
    
    if (data.hasClientUserAgent) {
      improvements.push('✅ تم إضافة User Agent للمتصفح');
    }
    
    if (data.hasCountry) {
      improvements.push('✅ تم إضافة معلومات البلد (الجزائر)');
    }
    
    if (data.hasCity && data.hasState) {
      improvements.push('✅ تم استنتاج معلومات المدينة والولاية من بيانات التوصيل');
    }
    
    if (data.hasExternalId) {
      improvements.push('✅ تم إنشاء معرف خارجي فريد');
    }
    
    return improvements;
  }

  /**
   * حساب الزيادة المحتملة في جودة المطابقة
   */
  private static calculatePotentialIncrease(data: EventMatchQualityData): number {
    let potentialIncrease = 0;
    
    // البيانات المفقودة والزيادة المحتملة بناءً على إحصائيات Facebook
    if (!data.hasEmail) potentialIncrease += 25; // 25% زيادة محتملة
    if (!data.hasFbc) potentialIncrease += 22; // 22% زيادة محتملة
    if (!data.hasClientIpAddress) potentialIncrease += 22; // 22% زيادة محتملة
    if (!data.hasZipCode) potentialIncrease += 11; // 11% زيادة محتملة
    if (!data.hasFirstName) potentialIncrease += 11; // 11% زيادة محتملة
    if (!data.hasLastName) potentialIncrease += 11; // 11% زيادة محتملة
    
    return Math.min(potentialIncrease, 100);
  }

  /**
   * الحصول على توصيات للتحسين
   */
  private static getRecommendations(data: EventMatchQualityData): string[] {
    const recommendations: string[] = [];
    
    if (!data.hasEmail) {
      recommendations.push('🎯 أضف خيار اختياري لجمع البريد الإلكتروني (25% زيادة محتملة)');
    }
    
    if (!data.hasFbc) {
      recommendations.push('🎯 تحسين جمع Facebook Click ID من URL parameters');
    }
    
    if (!data.hasClientIpAddress) {
      recommendations.push('🎯 تحسين جمع عنوان IP للعميل (22% زيادة محتملة)');
    }
    
    if (!data.hasZipCode) {
      recommendations.push('💡 أضف خيار اختياري للرمز البريدي (11% زيادة محتملة)');
    }
    
    if (!data.hasFirstName || !data.hasLastName) {
      recommendations.push('💡 تحسين تقسيم الأسماء المركبة');
    }
    
    if (data.hasPhone && !data.hasEmail) {
      recommendations.push('💰 لديك رقم هاتف، إضافة البريد الإلكتروني ستحسن النتائج بشكل كبير');
    }
    
    // حساب النقاط للتوصيات العامة
    const currentScore = this.calculateScore(data);
    if (currentScore >= 80) {
      recommendations.push('🎉 أداء ممتاز! جودة المطابقة عالية');
    } else if (currentScore >= 60) {
      recommendations.push('👍 أداء جيد، مع إمكانية للتحسين');
    } else {
      recommendations.push('⚠️ يحتاج تحسين - ركز على جمع المزيد من بيانات العملاء');
    }
    
    return recommendations;
  }

  /**
   * إنشاء تقرير مفصل بصيغة نصية
   */
  static generateTextReport(report: EventMatchQualityReport): string {
    const lines: string[] = [];
    
    lines.push('📊 تقرير جودة مطابقة الأحداث (Event Match Quality)');
    lines.push('=' .repeat(50));
    lines.push('');
    
    lines.push(`🎯 النقاط الحالية: ${report.score}/100`);
    lines.push(`📈 زيادة محتملة: +${report.potentialIncrease}%`);
    lines.push('');
    
    if (report.improvements.length > 0) {
      lines.push('✅ التحسينات المطبقة:');
      report.improvements.forEach(improvement => {
        lines.push(`   ${improvement}`);
      });
      lines.push('');
    }
    
    if (report.recommendations.length > 0) {
      lines.push('🔧 توصيات للتحسين:');
      report.recommendations.forEach(recommendation => {
        lines.push(`   ${recommendation}`);
      });
      lines.push('');
    }
    
    lines.push('📋 ملخص البيانات:');
    lines.push(`   - القيمة والعملة: ${report.currentData.hasValue && report.currentData.hasCurrency ? '✅' : '❌'}`);
    lines.push(`   - بيانات العميل الشخصية: ${report.currentData.hasFirstName && report.currentData.hasLastName && report.currentData.hasPhone ? '✅' : '❌'}`);
    lines.push(`   - معرفات Facebook: ${report.currentData.hasFbp && report.currentData.hasFbc ? '✅' : '❌'}`);
    lines.push(`   - معلومات الموقع: ${report.currentData.hasCity && report.currentData.hasState && report.currentData.hasCountry ? '✅' : '❌'}`);
    
    return lines.join('\n');
  }

  /**
   * تسجيل التقرير في وحدة التحكم
   */
  static logReport(eventData: any, userData?: any): void {
    const report = this.analyzeEventData(eventData, userData);
    const textReport = this.generateTextReport(report);
    
    console.groupCollapsed('📋 البيانات التفصيلية');
  }
}

export default EventMatchQualityAnalyzer;
