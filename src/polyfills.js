// polyfills.js - يضمن توفر جميع polyfills اللازمة لتشغيل التطبيق في المتصفح

// العناصر الأساسية
import { Buffer } from 'buffer';
import process from 'process';
window.Buffer = Buffer;
window.process = process;

// وحدات Node.js الأساسية
import stream from 'stream-browserify';
import path from 'path-browserify';
import util from 'util';
import assert from 'assert';
import http from 'stream-http';
import https from 'https-browserify';
import os from 'os-browserify/browser';
import { URL, URLSearchParams } from 'url';
import zlib from 'browserify-zlib';
import cryptoModule from 'crypto-browserify';

// إضافة العناصر إلى النافذة العالمية (المتصفح)
window.stream = stream;
window.path = path;
window.util = util;
window.assert = assert;
window.http = http;
window.https = https;
window.os = os;
window.URL = URL;
window.URLSearchParams = URLSearchParams;
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