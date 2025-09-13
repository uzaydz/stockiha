#!/usr/bin/env node
// 🚀 Cloudflare Advanced Setup Script
// تشغيل: node cloudflare-setup.js

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ZONE_ID || !API_TOKEN) {
  console.error('❌ يرجى تعيين CLOUDFLARE_ZONE_ID و CLOUDFLARE_API_TOKEN');
  console.log('مثال:');
  console.log('export CLOUDFLARE_ZONE_ID="your_zone_id"');
  console.log('export CLOUDFLARE_API_TOKEN="your_api_token"');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}${endpoint}`;
  const options = { method, headers };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.errors?.map(e => e.message).join(', ') || 'Unknown error');
    }
    
    return result;
  } catch (error) {
    console.error(`❌ خطأ في ${endpoint}:`, error.message);
    return null;
  }
}

// 🔒 تفعيل إعدادات الأمان
async function enableSecuritySettings() {
  console.log('🔒 تفعيل إعدادات الأمان...');
  
  const securitySettings = [
    { setting: 'security_level', value: 'medium' },
    { setting: 'ssl', value: 'full_strict' },
    { setting: 'always_use_https', value: 'on' },
    { setting: 'automatic_https_rewrites', value: 'on' },
    { setting: 'min_tls_version', value: '1.2' },
    { setting: 'tls_1_3', value: 'on' },
    { setting: 'opportunistic_encryption', value: 'on' },
    { setting: 'browser_check', value: 'on' }
  ];
  
  for (const { setting, value } of securitySettings) {
    const result = await makeRequest(`/settings/${setting}`, 'PATCH', { value });
    if (result) {
      console.log(`✅ ${setting}: ${value}`);
    }
  }
}

// ⚡ تفعيل إعدادات الأداء
async function enablePerformanceSettings() {
  console.log('\n⚡ تفعيل إعدادات الأداء...');
  
  const performanceSettings = [
    { setting: 'brotli', value: 'on' },
    { setting: 'http3', value: 'on' },
    { setting: 'http2', value: 'on' },
    { setting: 'ipv6', value: 'on' },
    { setting: 'websockets', value: 'on' },
    { setting: 'pseudo_ipv4', value: 'add_header' },
    { setting: 'ip_geolocation', value: 'on' },
    { setting: 'rocket_loader', value: 'off' }, // قد يتداخل مع React
    { setting: 'mirage', value: 'off' }, // قد يسبب مشاكل
    { setting: 'polish', value: 'lossy' }
  ];
  
  for (const { setting, value } of performanceSettings) {
    const result = await makeRequest(`/settings/${setting}`, 'PATCH', { value });
    if (result) {
      console.log(`✅ ${setting}: ${value}`);
    }
  }
  
  // إعدادات minify
  const minifyResult = await makeRequest('/settings/minify', 'PATCH', {
    value: { css: 'on', html: 'on', js: 'on' }
  });
  if (minifyResult) {
    console.log('✅ minify: css, html, js enabled');
  }
}

// 🛡️ إنشاء WAF Rules
async function createWAFRules() {
  console.log('\n🛡️ إنشاء WAF Rules...');
  
  const wafRules = [
    {
      description: 'Block common bot user agents',
      expression: '(http.user_agent contains "bot" or http.user_agent contains "crawler" or http.user_agent contains "spider") and not http.user_agent contains "google"',
      action: 'block'
    },
    {
      description: 'Rate limit API endpoints',
      expression: 'http.request.uri.path matches "^/api/"',
      action: 'rate_limit',
      rate_limit: {
        threshold: 100,
        period: 60,
        action: 'challenge'
      }
    },
    {
      description: 'Challenge suspicious requests',
      expression: '(http.user_agent eq "" or http.user_agent contains "curl" or http.user_agent contains "wget")',
      action: 'managed_challenge'
    }
  ];
  
  for (const rule of wafRules) {
    const result = await makeRequest('/firewall/rules', 'POST', rule);
    if (result) {
      console.log(`✅ WAF Rule created: ${rule.description}`);
    }
  }
}

// 📊 إعداد Page Rules
async function createPageRules() {
  console.log('\n📊 إعداد Page Rules...');
  
  const pageRules = [
    {
      targets: [{
        target: 'url',
        constraint: {
          operator: 'matches',
          value: '*stockiha.com/assets/*'
        }
      }],
      actions: [
        { id: 'cache_level', value: 'cache_everything' },
        { id: 'edge_cache_ttl', value: 31536000 },
        { id: 'browser_cache_ttl', value: 31536000 }
      ],
      priority: 1,
      status: 'active'
    },
    {
      targets: [{
        target: 'url',
        constraint: {
          operator: 'matches',
          value: '*stockiha.com/api/*'
        }
      }],
      actions: [
        { id: 'cache_level', value: 'bypass' },
        { id: 'security_level', value: 'high' }
      ],
      priority: 2,
      status: 'active'
    }
  ];
  
  for (const rule of pageRules) {
    const result = await makeRequest('/pagerules', 'POST', rule);
    if (result) {
      console.log(`✅ Page Rule created for: ${rule.targets[0].constraint.value}`);
    }
  }
}

// 📈 عرض إحصائيات الأداء
async function showPerformanceStats() {
  console.log('\n📈 إحصائيات الأداء:');
  
  const analytics = await makeRequest('/analytics/dashboard');
  if (analytics && analytics.result) {
    const stats = analytics.result.totals;
    console.log(`📊 إجمالي الطلبات: ${stats.requests?.all || 'غير متوفر'}`);
    console.log(`🚀 الطلبات المخزنة مؤقتاً: ${stats.requests?.cached || 'غير متوفر'}`);
    console.log(`💾 نسبة التخزين المؤقت: ${stats.requests?.cached && stats.requests?.all ? 
      Math.round((stats.requests.cached / stats.requests.all) * 100) : 'غير متوفر'}%`);
  }
}

// 🚀 تشغيل جميع التحسينات
async function main() {
  console.log('🚀 بدء إعداد Cloudflare المتقدم...\n');
  
  try {
    await enableSecuritySettings();
    await enablePerformanceSettings();
    await createWAFRules();
    await createPageRules();
    await showPerformanceStats();
    
    console.log('\n🎉 تم إعداد Cloudflare بنجاح!');
    console.log('\n📋 الخطوات التالية:');
    console.log('1. تحقق من إعدادات DNS');
    console.log('2. اختبر سرعة الموقع باستخدام GTmetrix أو PageSpeed Insights');
    console.log('3. راقب إحصائيات الأمان في لوحة Cloudflare');
    
  } catch (error) {
    console.error('❌ خطأ في الإعداد:', error.message);
    process.exit(1);
  }
}

// تشغيل السكريبت
if (require.main === module) {
  main();
}

module.exports = {
  enableSecuritySettings,
  enablePerformanceSettings,
  createWAFRules,
  createPageRules
};
