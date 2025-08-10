#!/usr/bin/env node

/**
 * سكريبت لاختبار الاتصال بالهاتف المحمول
 * يستخدم لفحص إعدادات الشبكة والتأكد من عمل الموقع على الهاتف
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const os = require('os');

// الحصول على عنوان IP المحلي
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return '127.0.0.1';
}

// اختبار الاتصال
function testConnection(host, port, protocol = 'http') {
  return new Promise((resolve, reject) => {
    const client = protocol === 'https' ? https : http;
    const url = `${protocol}://${host}:${port}`;
    
    console.log(`🔍 اختبار الاتصال بـ: ${url}`);
    
    const req = client.get(url, (res) => {
      console.log(`✅ الاتصال ناجح! رمز الحالة: ${res.statusCode}`);
      console.log(`📱 يمكن الوصول من الهاتف عبر: ${url}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ فشل الاتصال: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال'));
    });
  });
}

// اختبار منفذ معين
function testPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`✅ المنفذ ${port} متاح`);
      server.close();
      resolve(true);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  المنفذ ${port} مشغول`);
      } else {
        console.log(`❌ خطأ في المنفذ ${port}: ${err.message}`);
      }
      resolve(false);
    });
  });
}

// الحصول على عنوان IP العام (إذا كان متاحاً)
function getPublicIP() {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

// تشغيل الاختبارات
async function runTests() {
  console.log('🚀 بدء اختبارات الاتصال بالهاتف المحمول...\n');
  
  const localIP = getLocalIP();
  console.log(`📍 عنوان IP المحلي: ${localIP}`);
  
  // اختبار المنافذ
  console.log('\n🔌 اختبار المنافذ:');
  await testPort(8080);
  await testPort(3000);
  await testPort(3001);
  
  // اختبار الاتصال المحلي
  console.log('\n🏠 اختبار الاتصال المحلي:');
  try {
    await testConnection(localIP, 8080);
  } catch (err) {
    console.log('❌ فشل الاتصال المحلي - تأكد من تشغيل الخادم');
  }
  
  // اختبار الاتصال العام
  console.log('\n🌐 اختبار الاتصال العام:');
  const publicIP = await getPublicIP();
  if (publicIP) {
    console.log(`🌍 عنوان IP العام: ${publicIP}`);
    console.log(`📱 يمكن الوصول من الهاتف عبر: http://${publicIP}:8080`);
  } else {
    console.log('❌ لا يمكن الحصول على عنوان IP العام');
  }
  
  // نصائح
  console.log('\n💡 نصائح لحل مشاكل الاتصال:');
  console.log('1. تأكد من تشغيل الخادم: npm run dev');
  console.log('2. تأكد من أن الهاتف والحاسوب على نفس الشبكة');
  console.log('3. تحقق من إعدادات الجدار الناري');
  console.log('4. جرب استخدام عنوان IP المحلي بدلاً من localhost');
  console.log('5. تأكد من أن المنفذ 8080 غير محظور');
  
  console.log('\n🔧 أوامر مفيدة:');
  console.log(`- تشغيل الخادم: npm run dev`);
  console.log(`- اختبار الاتصال: curl http://${localIP}:8080`);
  console.log(`- فحص المنافذ: netstat -an | grep 8080`);
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testConnection, getLocalIP, getPublicIP };
