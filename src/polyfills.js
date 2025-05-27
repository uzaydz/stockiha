// polyfills.js - يضمن توفر جميع polyfills اللازمة لتشغيل التطبيق في المتصفح

// العناصر الأساسية
import { Buffer } from 'buffer';
import process from 'process';
window.Buffer = Buffer;
window.process = process;

// وحدات Node.js الأساسية
import stream from 'stream-browserify';
import * as path from 'path-browserify';
import util from 'util';
import assert from 'assert';
import http from 'stream-http';
import https from 'https-browserify';
import os from 'os-browserify/browser';
import { URL } from 'url';
import zlib from 'browserify-zlib';
// Create a simplified crypto polyfill instead of using crypto-browserify
const cryptoModule = {
  createHash: (algorithm) => ({
    update: (data) => ({
      digest: (encoding) => {
        // Simple implementation that returns a dummy hash
        return 'polyfill-hash-' + Math.random().toString(36).substring(2);
      }
    })
  }),
  randomBytes: (size) => {
    const arr = new Uint8Array(size);
    window.crypto.getRandomValues(arr);
    return arr;
  }
};

// إضافة العناصر إلى النافذة العالمية (المتصفح)
window.stream = stream;
window.path = path;
window.util = util;
window.assert = assert;
window.http = http;
window.https = https;
window.os = os;
// Don't override the native URL constructor to prevent recursion
if (!window.URL) {
  window.URL = URL;
}
// Use the global URLSearchParams that's already available in browsers
window.URLSearchParams = window.URLSearchParams || URLSearchParams;
window.zlib = zlib;

// لا يمكننا تعديل window.crypto مباشرة، لذا ننشئ كائن منفصل 
// للوظائف الإضافية من crypto-browserify
window.nodeCrypto = cryptoModule;

// تعريفات Readable class التي تستخدمها axios وغيرها
if (!window.Readable) {
  window.Readable = stream.Readable;
}

// إضافات لتسهيل استخدام وحدات Node.js
window.__dirname = '/';
window.__filename = '/index.js';

// تلميح: هذا الملف يجب استيراده في بداية الملف الرئيسي (main.tsx)
