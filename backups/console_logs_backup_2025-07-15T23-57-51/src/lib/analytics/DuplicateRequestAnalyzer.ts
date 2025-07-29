/**
 * محلل متطور للطلبات المكررة - يكشف الأنماط ويقترح الحلول
 */

interface DuplicatePattern {
  url: string;
  count: number;
  totalDuration: number;
  wastedTime: number;
  endpoints: string[];
  organization?: string;
  suggestions: string[];
}

interface AnalysisResult {
  totalRequests: number;
  duplicateGroups: DuplicatePattern[];
  wastedBandwidth: number;
  wastedTime: number;
  savings: {
    potentialTimeReduction: number;
    potentialBandwidthSaving: number;
    efficiency: number;
  };
  recommendations: string[];
}

export class DuplicateRequestAnalyzer {
  
  public static analyzeRequests(requests: any[]): AnalysisResult {
    const analysis: AnalysisResult = {
      totalRequests: requests.length,
      duplicateGroups: [],
      wastedBandwidth: 0,
      wastedTime: 0,
      savings: {
        potentialTimeReduction: 0,
        potentialBandwidthSaving: 0,
        efficiency: 0
      },
      recommendations: []
    };

    // تجميع الطلبات حسب endpoint
    const requestGroups = new Map<string, any[]>();
    
    requests.forEach(request => {
      try {
        const url = new URL(request.url);
        const endpoint = this.getEndpointKey(url);
        
        if (!requestGroups.has(endpoint)) {
          requestGroups.set(endpoint, []);
        }
        requestGroups.get(endpoint)!.push(request);
      } catch (error) {
        // تجاهل URLs غير صالحة
      }
    });

    // تحليل كل مجموعة
    requestGroups.forEach((groupRequests, endpoint) => {
      if (groupRequests.length > 1) {
        const pattern = this.analyzeGroup(endpoint, groupRequests);
        analysis.duplicateGroups.push(pattern);
        analysis.wastedTime += pattern.wastedTime;
        analysis.wastedBandwidth += groupRequests.slice(1).reduce((sum, req) => sum + (req.size || 0), 0);
      }
    });

    // حساب المدخرات المحتملة
    analysis.savings = this.calculateSavings(analysis);
    
    // إنشاء التوصيات
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  private static getEndpointKey(url: URL): string {
    // استخراج مفتاح endpoint متطابق مع UltimateRequestController
    let table = url.pathname.split('/').pop() || '';
    
    if (url.pathname.includes('/rest/v1/')) {
      const pathParts = url.pathname.split('/rest/v1/');
      table = pathParts[1]?.split('?')[0] || table;
    }
    
    const params = new URLSearchParams(url.search);
    const orgId = params.get('organization_id');
    
    let baseKey = table;
    
    if (orgId) {
      baseKey += `_org_${orgId}`;
      
      const importantParams = ['status', 'is_active', 'limit'];
      const keyParams: string[] = [];
      
      importantParams.forEach(param => {
        const value = params.get(param);
        if (value) {
          keyParams.push(`${param}=${value}`);
        }
      });
      
      if (keyParams.length > 0) {
        baseKey += `_${keyParams.join('&')}`;
      }
    }
    
    return baseKey;
  }

  private static analyzeGroup(endpoint: string, requests: any[]): DuplicatePattern {
    const totalDuration = requests.reduce((sum, req) => sum + (req.duration || 0), 0);
    const wastedTime = requests.slice(1).reduce((sum, req) => sum + (req.duration || 0), 0);
    
    // استخراج organization من أول طلب
    const firstRequest = requests[0];
    let organization: string | undefined;
    try {
      const url = new URL(firstRequest.url);
      organization = url.searchParams.get('organization_id') || undefined;
    } catch {
      // تجاهل
    }

    // إنشاء suggestions مبنية على نوع endpoint
    const suggestions = this.generateSuggestions(endpoint, requests);

    return {
      url: endpoint,
      count: requests.length,
      totalDuration,
      wastedTime,
      endpoints: requests.map(req => new URL(req.url).pathname),
      organization,
      suggestions
    };
  }

  private static generateSuggestions(endpoint: string, requests: any[]): string[] {
    const suggestions: string[] = [];
    
    if (endpoint.includes('organization_subscriptions')) {
      suggestions.push('استخدم Context لمشاركة بيانات الاشتراك');
      suggestions.push('طبق React Query مع staleTime مناسب');
    }
    
    if (endpoint.includes('organization_settings')) {
      suggestions.push('احفظ الإعدادات في Context عالمي');
      suggestions.push('استخدم localStorage للإعدادات الثابتة');
    }
    
    if (endpoint.includes('product_categories')) {
      suggestions.push('طبق CategoryContext مع cache طويل');
      suggestions.push('استخدم static data للفئات');
    }
    
    if (endpoint.includes('products')) {
      suggestions.push('طبق pagination صحيح');
      suggestions.push('استخدم infinite queries لتجنب إعادة التحميل');
    }
    
    if (requests.length > 2) {
      suggestions.push('⚠️ طلبات مكررة خطيرة - تحتاج حل فوري!');
    }
    
    return suggestions;
  }

  private static calculateSavings(analysis: AnalysisResult): AnalysisResult['savings'] {
    const totalTime = analysis.duplicateGroups.reduce((sum, group) => sum + group.totalDuration, 0);
    const efficiency = analysis.totalRequests > 0 ? 
      ((analysis.totalRequests - analysis.duplicateGroups.length) / analysis.totalRequests) * 100 : 100;

    return {
      potentialTimeReduction: analysis.wastedTime,
      potentialBandwidthSaving: analysis.wastedBandwidth,
      efficiency
    };
  }

  private static generateRecommendations(analysis: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (analysis.wastedTime > 2000) {
      recommendations.push('🚨 هدر وقت خطير (+2 ثانية) - تفعيل UltimateRequestController مطلوب فوراً');
    }
    
    if (analysis.duplicateGroups.length > 5) {
      recommendations.push('📊 استخدم React Query مع Context patterns');
    }
    
    if (analysis.savings.efficiency < 70) {
      recommendations.push('⚡ كفاءة منخفضة - راجع استراتيجية جلب البيانات');
    }
    
    if (analysis.duplicateGroups.some(g => g.count > 3)) {
      recommendations.push('🔄 طلبات مفرطة التكرار - استخدم global state management');
    }
    
    const orgEndpoints = analysis.duplicateGroups.filter(g => g.organization);
    if (orgEndpoints.length > 3) {
      recommendations.push('🏢 طلبات مؤسسة مكررة - طبق OrganizationContext');
    }

    return recommendations;
  }

  // دالة مساعدة لتصدير تقرير مفصل
  public static generateReport(requests: any[]): string {
    const analysis = this.analyzeRequests(requests);
    
    let report = `
📊 تقرير تحليل الطلبات المكررة
=====================================

📈 الإحصائيات العامة:
• إجمالي الطلبات: ${analysis.totalRequests}
• مجموعات مكررة: ${analysis.duplicateGroups.length}
• الوقت المهدر: ${analysis.wastedTime.toFixed(0)}ms
• البيانات المهدرة: ${(analysis.wastedBandwidth / 1024).toFixed(1)}KB
• الكفاءة: ${analysis.savings.efficiency.toFixed(1)}%

🚨 المشاكل المكتشفة:
`;

    analysis.duplicateGroups.forEach((group, index) => {
      report += `
${index + 1}. ${group.url}
   • التكرار: ${group.count} مرة
   • الوقت المهدر: ${group.wastedTime.toFixed(0)}ms
   • المؤسسة: ${group.organization || 'غير محدد'}
   • الاقتراحات:
     ${group.suggestions.map(s => `- ${s}`).join('\n     ')}
`;
    });

    report += `
💡 التوصيات العامة:
${analysis.recommendations.map(r => `• ${r}`).join('\n')}

🔧 الحلول المقترحة:
• تفعيل UltimateRequestController
• استخدام React Query مع Context
• تطبيق cache strategies مناسبة
• مراجعة component architecture
`;

    return report;
  }
}

export default DuplicateRequestAnalyzer;
