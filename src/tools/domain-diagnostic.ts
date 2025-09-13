/**
 * أداة تشخيص النطاقات - للمساعدة في حل مشاكل ربط النطاقات المخصصة
 */

interface DomainDiagnosticResult {
  domain: string;
  timestamp: string;
  dnsRecords: {
    hasA: boolean;
    aCurrent?: string[];
    hasCNAME: boolean;
    cnameCurrent?: string[];
    hasCorrectPointing: boolean;
    expectedTarget: string;
  };
  nameservers: {
    current: string[];
    expectedStockiha: string[];
    isUsingStockiha: boolean;
  };
  propagationStatus: {
    estimated: string;
    recommendations: string[];
  };
  issues: string[];
  solutions: string[];
}

/**
 * تشخيص شامل للنطاق
 */
export async function diagnoseDomain(domain: string): Promise<DomainDiagnosticResult> {
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
  
  
  
  const result: DomainDiagnosticResult = {
    domain: cleanDomain,
    timestamp: new Date().toISOString(),
    dnsRecords: {
      hasA: false,
      hasCNAME: false,
      hasCorrectPointing: false,
      expectedTarget: 'stockiha.pages.dev'
    },
    nameservers: {
      current: [],
      expectedStockiha: [
        'ns1.stockiha.com',
        'ns2.stockiha.com'
      ],
      isUsingStockiha: false
    },
    propagationStatus: {
      estimated: 'غير معروف',
      recommendations: []
    },
    issues: [],
    solutions: []
  };

  try {
    // 1. فحص سجلات DNS الحالية
    await checkDNSRecords(cleanDomain, result);
    
    // 2. فحص خوادم الأسماء
    await checkNameservers(cleanDomain, result);
    
    // 3. تحليل المشاكل والحلول
    analyzeIssuesAndSolutions(result);
    
    
    
    
    
  } catch (error) {
    console.error(`❌ خطأ في تشخيص النطاق ${cleanDomain}:`, error);
    result.issues.push('حدث خطأ أثناء التشخيص');
    result.solutions.push('يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني');
  }
  
  return result;
}

/**
 * فحص سجلات DNS
 */
async function checkDNSRecords(domain: string, result: DomainDiagnosticResult): Promise<void> {
  try {
    // فحص سجلات A
    const aRecords = await queryDNS(domain, 'A');
    if (aRecords && aRecords.length > 0) {
      result.dnsRecords.hasA = true;
      result.dnsRecords.aCurrent = aRecords;
    }
    
    // فحص سجلات CNAME
    const cnameRecords = await queryDNS(domain, 'CNAME');
    if (cnameRecords && cnameRecords.length > 0) {
      result.dnsRecords.hasCNAME = true;
      result.dnsRecords.cnameCurrent = cnameRecords;
      
      // التحقق من التوجيه الصحيح
      result.dnsRecords.hasCorrectPointing = cnameRecords.some(record =>
        record.includes('stockiha.pages.dev') || 
        record.includes('stockiha.com')
      );
    }
    
    // فحص www subdomain
    const wwwCnameRecords = await queryDNS(`www.${domain}`, 'CNAME');
    if (wwwCnameRecords && wwwCnameRecords.length > 0) {
      
    }
    
  } catch (error) {
    console.error('خطأ في فحص سجلات DNS:', error);
  }
}

/**
 * فحص خوادم الأسماء
 */
async function checkNameservers(domain: string, result: DomainDiagnosticResult): Promise<void> {
  try {
    const nsRecords = await queryDNS(domain, 'NS');
    if (nsRecords && nsRecords.length > 0) {
      result.nameservers.current = nsRecords;
      
      // التحقق من استخدام خوادم سطوكيها
      result.nameservers.isUsingStockiha = nsRecords.some(ns =>
        ns.includes('stockiha.com') || ns.includes('stockiha')
      );
    }
  } catch (error) {
    console.error('خطأ في فحص خوادم الأسماء:', error);
  }
}

/**
 * تحليل المشاكل والحلول
 */
function analyzeIssuesAndSolutions(result: DomainDiagnosticResult): void {
  const { dnsRecords, nameservers } = result;
  
  // تحليل مشاكل خوادم الأسماء
  if (!nameservers.isUsingStockiha) {
    result.issues.push('النطاق لا يستخدم خوادم الأسماء الخاصة بسطوكيها');
    result.solutions.push('قم بتغيير خوادم الأسماء في مزود النطاق إلى خوادم سطوكيها المحددة');
    result.propagationStatus.estimated = '48-72 ساعة بعد تغيير خوادم الأسماء';
    result.propagationStatus.recommendations.push('انتظر 48-72 ساعة بعد تغيير خوادم الأسماء');
  }
  
  // تحليل مشاكل سجلات DNS
  if (!dnsRecords.hasCNAME && !dnsRecords.hasA) {
    result.issues.push('لا توجد سجلات DNS للنطاق');
    result.solutions.push('تأكد من أن النطاق مُكوّن بشكل صحيح في مزود النطاق');
  } else if (dnsRecords.hasCNAME && !dnsRecords.hasCorrectPointing) {
    result.issues.push('سجل CNAME موجود لكنه لا يشير إلى الهدف الصحيح');
    result.solutions.push(`قم بتحديث سجل CNAME ليشير إلى ${result.dnsRecords.expectedTarget}`);
  } else if (dnsRecords.hasA) {
    result.issues.push('النطاق يستخدم سجل A بدلاً من CNAME');
    result.solutions.push('قم بحذف سجل A وإضافة سجل CNAME يشير إلى stockiha.pages.dev');
  }
  
  // تحليل حالة الانتشار
  if (nameservers.isUsingStockiha && dnsRecords.hasCorrectPointing) {
    result.propagationStatus.estimated = 'مكتمل - يجب أن يعمل النطاق الآن';
    result.propagationStatus.recommendations.push('النطاق مُكوّن بشكل صحيح، جرب الوصول إليه');
  } else if (nameservers.isUsingStockiha) {
    result.propagationStatus.estimated = '5-15 دقيقة للانتشار الكامل';
    result.propagationStatus.recommendations.push('خوادم الأسماء صحيحة، انتظر قليلاً لانتشار سجلات DNS');
  }
  
  // حلول عامة
  if (result.issues.length === 0) {
    result.solutions.push('النطاق مُكوّن بشكل صحيح! إذا كان لا يعمل، جرب مسح ذاكرة المتصفح');
  } else {
    result.solutions.push('بعد تطبيق التغييرات، انتظر 5-15 دقيقة ثم جرب مرة أخرى');
    result.solutions.push('يمكنك استخدام أدوات فحص DNS مثل whatsmydns.net للتحقق من الانتشار');
  }
}

/**
 * استعلام DNS باستخدام Cloudflare DNS over HTTPS
 */
async function queryDNS(domain: string, recordType: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=${recordType}`,
      {
        headers: {
          'Accept': 'application/dns-json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.Answer && Array.isArray(data.Answer)) {
      return data.Answer.map((record: any) => {
        // إزالة النقطة النهائية من النتائج
        return record.data.replace(/\.$/, '');
      });
    }
    
    return [];
  } catch (error) {
    console.error(`خطأ في استعلام DNS للنطاق ${domain} نوع ${recordType}:`, error);
    return [];
  }
}

/**
 * تشخيص سريع - للاستخدام في API
 */
export async function quickDiagnose(domain: string): Promise<{
  isWorking: boolean;
  mainIssue: string;
  quickSolution: string;
  estimatedTime: string;
}> {
  const diagnostic = await diagnoseDomain(domain);
  
  let isWorking = false;
  let mainIssue = 'غير محدد';
  let quickSolution = 'غير محدد';
  let estimatedTime = 'غير معروف';
  
  if (diagnostic.issues.length === 0) {
    isWorking = true;
    mainIssue = 'لا توجد مشاكل';
    quickSolution = 'النطاق يعمل بشكل صحيح';
    estimatedTime = 'فوري';
  } else {
    isWorking = false;
    mainIssue = diagnostic.issues[0];
    quickSolution = diagnostic.solutions[0];
    estimatedTime = diagnostic.propagationStatus.estimated;
  }
  
  return {
    isWorking,
    mainIssue,
    quickSolution,
    estimatedTime
  };
}
