/**
 * حلول مشكلة النطاق الجذري (Apex Domain) للتجار
 * يوفر حلول متعددة لجعل النطاق يعمل بدون www
 */

export interface ApexDomainSolution {
  type: 'redirect' | 'cname_flattening' | 'a_record' | 'page_rule';
  title: string;
  description: string;
  instructions: string[];
  priority: number;
  compatibility: string[];
}

export interface DomainConfiguration {
  domain: string;
  hasWwwWorking: boolean;
  hasApexWorking: boolean;
  provider: string;
  cloudflareEnabled: boolean;
}

/**
 * الحصول على أفضل الحلول المناسبة للتاجر
 */
export function getApexDomainSolutions(config: DomainConfiguration): ApexDomainSolution[] {
  const solutions: ApexDomainSolution[] = [
    {
      type: 'redirect',
      title: 'إعادة التوجيه التلقائي (الأفضل)',
      description: 'توجيه النطاق بدون www إلى النطاق مع www تلقائياً',
      instructions: [
        'في إعدادات DNS، أضف CNAME للنطاق الجذري يشير إلى www',
        `Type: CNAME, Name: @, Value: www.${config.domain}`,
        'إذا فشل، استخدم إعادة التوجيه في لوحة تحكم مزود النطاق'
      ],
      priority: 1,
      compatibility: ['GoDaddy', 'Namecheap', 'Cloudflare', 'All']
    },
    {
      type: 'cname_flattening',
      title: 'CNAME Flattening (للمتقدمين)',
      description: 'استخدام ميزة Cloudflare لتحويل CNAME إلى A تلقائياً',
      instructions: [
        'انقل إدارة DNS إلى Cloudflare (مجاني)',
        'أضف CNAME للنطاق الجذري يشير إلى النطاق الوسيط',
        'فعل CNAME Flattening في إعدادات DNS',
        'تأكد من تفعيل Proxy (البرتقالي)'
      ],
      priority: 2,
      compatibility: ['Cloudflare']
    },
    {
      type: 'a_record',
      title: 'A Records (البديل المضمون)',
      description: 'استخدام IP ثابت للنطاق الجذري',
      instructions: [
        'أضف A Record للنطاق الجذري',
        'Type: A, Name: @, Value: 76.76.19.142',
        'أضف A Record ثاني',
        'Type: A, Name: @, Value: 76.223.126.88',
        'احتفظ بـ CNAME للـ www كما هو'
      ],
      priority: 3,
      compatibility: ['GoDaddy', 'Namecheap', 'All']
    },
    {
      type: 'page_rule',
      title: 'Page Rule (Cloudflare القديم)',
      description: 'استخدام Page Rules للتوجيه',
      instructions: [
        'في Cloudflare Dashboard، اذهب إلى Page Rules',
        `URL Pattern: ${config.domain}/*`,
        'Setting: Forwarding URL',
        'Status Code: 301',
        `Destination: https://www.${config.domain}/$1`
      ],
      priority: 4,
      compatibility: ['Cloudflare']
    }
  ];

  // ترتيب الحلول حسب التوافق مع إعداد التاجر
  return solutions
    .filter(solution => {
      if (config.cloudflareEnabled) {
        return true; // جميع الحلول متاحة مع Cloudflare
      }
      return solution.compatibility.includes(config.provider) || 
             solution.compatibility.includes('All');
    })
    .sort((a, b) => a.priority - b.priority);
}

/**
 * فحص حالة النطاق الحالية
 */
export async function checkDomainStatus(domain: string): Promise<{
  wwwWorks: boolean;
  apexWorks: boolean;
  hasRedirect: boolean;
  sslEnabled: boolean;
}> {
  const results = {
    wwwWorks: false,
    apexWorks: false,
    hasRedirect: false,
    sslEnabled: false
  };

  try {
    // فحص النطاق مع www
    const wwwResponse = await fetch(`https://www.${domain}`, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    results.wwwWorks = wwwResponse.ok;
    results.sslEnabled = wwwResponse.url.startsWith('https://');
  } catch (error) {
    
  }

  try {
    // فحص النطاق بدون www
    const apexResponse = await fetch(`https://${domain}`, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    results.apexWorks = apexResponse.ok;
    
    // فحص إعادة التوجيه
    if (apexResponse.redirected && apexResponse.url.includes('www.')) {
      results.hasRedirect = true;
    }
  } catch (error) {
    
  }

  return results;
}

/**
 * إنشاء تعليمات مخصصة للتاجر
 */
export function generateCustomInstructions(
  config: DomainConfiguration,
  preferredSolution: ApexDomainSolution
): {
  title: string;
  steps: string[];
  additionalNotes: string[];
} {
  const intermediateSubdomain = 'abc123.stockiha.com'; // يتم استبداله بالقيمة الفعلية
  
  let steps: string[] = [];
  let additionalNotes: string[] = [];

  switch (preferredSolution.type) {
    case 'redirect':
      steps = [
        `1. اذهب إلى إعدادات DNS في ${config.provider}`,
        `2. أضف CNAME: Name: www, Value: ${intermediateSubdomain}`,
        `3. أضف CNAME: Name: @, Value: www.${config.domain}`,
        '4. احفظ التغييرات وانتظر 5-10 دقائق'
      ];
      additionalNotes = [
        'إذا لم يسمح مزود النطاق بـ CNAME للنطاق الجذري، استخدم A Records',
        'يمكنك أيضاً استخدام إعادة التوجيه المدمجة في لوحة تحكم مزود النطاق'
      ];
      break;

    case 'a_record':
      steps = [
        `1. اذهب إلى إعدادات DNS في ${config.provider}`,
        `2. أضف CNAME: Name: www, Value: ${intermediateSubdomain}`,
        '3. أضف A Record: Name: @, Value: 76.76.19.142',
        '4. أضف A Record: Name: @, Value: 76.223.126.88',
        '5. احفظ التغييرات'
      ];
      additionalNotes = [
        'هذا الحل يعمل مع جميع مزودي النطاق',
        'IP addresses ثابتة ومضمونة من Cloudflare'
      ];
      break;

    case 'cname_flattening':
      steps = [
        '1. انتقل إلى Cloudflare وأضف نطاقك (مجاني)',
        '2. غير nameservers في مزود النطاق إلى Cloudflare',
        `3. في Cloudflare DNS، أضف CNAME: Name: @, Value: ${intermediateSubdomain}`,
        `4. أضف CNAME: Name: www, Value: ${intermediateSubdomain}`,
        '5. فعل CNAME Flattening في DNS Settings',
        '6. تأكد من تفعيل Proxy (🧡) للسجلات'
      ];
      additionalNotes = [
        'Cloudflare مجاني ويوفر حماية وتسريع إضافي',
        'CNAME Flattening يحل المشكلة نهائياً',
        'ستحصل على SSL مجاني وCDN عالمي'
      ];
      break;
  }

  return {
    title: `إعداد ${config.domain} - ${preferredSolution.title}`,
    steps,
    additionalNotes
  };
}

/**
 * التحقق من DNS Records تلقائياً
 */
export async function verifyDNSConfiguration(domain: string): Promise<{
  isValid: boolean;
  records: Array<{
    type: string;
    name: string;
    value: string;
    status: 'correct' | 'incorrect' | 'missing';
  }>;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  const records: Array<{
    type: string;
    name: string;
    value: string;
    status: 'correct' | 'incorrect' | 'missing';
  }> = [];

  try {
    // فحص CNAME للـ www
    const wwwResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=www.${domain}&type=CNAME`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    const wwwData = await wwwResponse.json();

    if (wwwData.Answer && wwwData.Answer.length > 0) {
      const wwwRecord = wwwData.Answer[0];
      records.push({
        type: 'CNAME',
        name: `www.${domain}`,
        value: wwwRecord.data,
        status: wwwRecord.data.includes('stockiha.com') ? 'correct' : 'incorrect'
      });
    } else {
      records.push({
        type: 'CNAME',
        name: `www.${domain}`,
        value: 'غير موجود',
        status: 'missing'
      });
      recommendations.push('أضف CNAME للنطاق مع www');
    }

    // فحص النطاق الجذري
    const apexResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    const apexData = await apexResponse.json();

    if (apexData.Answer && apexData.Answer.length > 0) {
      apexData.Answer.forEach((record: any) => {
        records.push({
          type: record.type === 1 ? 'A' : 'CNAME',
          name: domain,
          value: record.data,
          status: 'correct'
        });
      });
    } else {
      records.push({
        type: 'A',
        name: domain,
        value: 'غير موجود',
        status: 'missing'
      });
      recommendations.push('أضف A Records أو CNAME للنطاق الجذري');
    }

    const isValid = records.every(record => record.status === 'correct');
    
    if (!isValid) {
      recommendations.push('تحقق من إعدادات DNS وتأكد من انتشار التغييرات');
    }

    return {
      isValid,
      records,
      recommendations
    };

  } catch (error) {
    console.error('DNS verification failed:', error);
    return {
      isValid: false,
      records: [],
      recommendations: ['فشل في فحص DNS. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.']
    };
  }
}
