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

    const req = client.get(url, (res) => {
      resolve(true);
    });
    
    req.on('error', (err) => {
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
      server.close();
      resolve(true);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
      } else {
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
  
  const localIP = getLocalIP();
  
  // اختبار المنافذ
  await testPort(8080);
  await testPort(3000);
  await testPort(3001);
  
  // اختبار الاتصال المحلي
  try {
    await testConnection(localIP, 8080);
  } catch (err) {
  }
  
  // اختبار الاتصال العام
  const publicIP = await getPublicIP();
  if (publicIP) {
  } else {
  }
  
  // نصائح
  
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testConnection, getLocalIP, getPublicIP };
