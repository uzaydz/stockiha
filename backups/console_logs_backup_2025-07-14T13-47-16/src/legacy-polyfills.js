/**
 * Legacy Polyfills للـ iPad القديم والمتصفحات القديمة
 * يُحمل هذا الملف قبل التطبيق الرئيسي لضمان التوافق
 */

(function() {
  'use strict';
  
  // فحص إذا كان iPad قديم (iOS < 13)
  const isOldIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                   parseFloat(navigator.userAgent.match(/OS (\d+)/)?.[1] || '14') < 13;
  
  const isOldSafari = /Safari/.test(navigator.userAgent) && 
                      !navigator.userAgent.includes('Chrome') &&
                      parseFloat(navigator.userAgent.match(/Version\/(\d+)/)?.[1] || '14') < 13;
  
  console.log('🔧 تحميل Legacy Polyfills...', { isOldIOS, isOldSafari });
  
  // ======================================
  // 1. ES6+ Polyfills للمتصفحات القديمة
  // ======================================
  
  // Object.assign polyfill
  if (!Object.assign) {
    Object.assign = function(target) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        const nextSource = arguments[index];
        if (nextSource != null) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }
  
  // Array.from polyfill
  if (!Array.from) {
    Array.from = function(arrayLike, mapFn, thisArg) {
      const c = Object(arrayLike);
      const len = parseInt(c.length) || 0;
      if (typeof mapFn !== "undefined" && typeof mapFn !== "function") {
        throw new TypeError("Array.from: when provided, the second argument must be a function");
      }
      const a = new Array(len);
      for (let k = 0; k < len; k++) {
        const kValue = c[k];
        if (mapFn) {
          a[k] = typeof thisArg === "undefined" ? mapFn(kValue, k) : mapFn.call(thisArg, kValue, k);
        } else {
          a[k] = kValue;
        }
      }
      return a;
    };
  }
  
  // Array.includes polyfill
  if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      const o = Object(this);
      const len = parseInt(o.length) || 0;
      if (len === 0) return false;
      const n = parseInt(fromIndex) || 0;
      let k = n >= 0 ? n : Math.max(len + n, 0);
      while (k < len) {
        if (o[k] === searchElement) return true;
        k++;
      }
      return false;
    };
  }
  
  // Array.find polyfill
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      const o = Object(this);
      const len = parseInt(o.length) || 0;
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      const thisArg = arguments[1];
      let k = 0;
      while (k < len) {
        const kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        k++;
      }
      return undefined;
    };
  }
  
  // String.includes polyfill
  if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      if (typeof start !== 'number') {
        start = 0;
      }
      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }
  
  // String.startsWith polyfill
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }
  
  // String.endsWith polyfill
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, length) {
      if (length === undefined || length > this.length) {
        length = this.length;
      }
      return this.substring(length - searchString.length, length) === searchString;
    };
  }
  
  // ======================================
  // 2. Promise polyfill للمتصفحات القديمة
  // ======================================
  
  if (typeof Promise === 'undefined') {
    window.Promise = function(executor) {
      const self = this;
      self.state = 'pending';
      self.value = undefined;
      self.handlers = [];
      
      function resolve(result) {
        if (self.state === 'pending') {
          self.state = 'fulfilled';
          self.value = result;
          self.handlers.forEach(handle);
          self.handlers = null;
        }
      }
      
      function reject(error) {
        if (self.state === 'pending') {
          self.state = 'rejected';
          self.value = error;
          self.handlers.forEach(handle);
          self.handlers = null;
        }
      }
      
      function handle(handler) {
        if (self.state === 'pending') {
          self.handlers.push(handler);
        } else {
          if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
            handler.onFulfilled(self.value);
          }
          if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
            handler.onRejected(self.value);
          }
        }
      }
      
      this.then = function(onFulfilled, onRejected) {
        return new Promise(function(resolve, reject) {
          handle({
            onFulfilled: function(result) {
              try {
                resolve(onFulfilled ? onFulfilled(result) : result);
              } catch (ex) {
                reject(ex);
              }
            },
            onRejected: function(error) {
              try {
                resolve(onRejected ? onRejected(error) : Promise.reject(error));
              } catch (ex) {
                reject(ex);
              }
            }
          });
        });
      };
      
      this.catch = function(onRejected) {
        return this.then(null, onRejected);
      };
      
      try {
        executor(resolve, reject);
      } catch (ex) {
        reject(ex);
      }
    };
    
    // Promise.resolve
    Promise.resolve = function(value) {
      return new Promise(function(resolve) {
        resolve(value);
      });
    };
    
    // Promise.reject
    Promise.reject = function(reason) {
      return new Promise(function(resolve, reject) {
        reject(reason);
      });
    };
  }
  
  // ======================================
  // 3. Fetch API polyfill للمتصفحات القديمة
  // ======================================
  
  if (!window.fetch) {
    window.fetch = function(url, options) {
      return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        options = options || {};
        
        xhr.open(options.method || 'GET', url, true);
        
        // إعداد headers
        if (options.headers) {
          for (const key in options.headers) {
            xhr.setRequestHeader(key, options.headers[key]);
          }
        }
        
        xhr.onload = function() {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            json: function() {
              return Promise.resolve(JSON.parse(xhr.responseText));
            },
            text: function() {
              return Promise.resolve(xhr.responseText);
            }
          };
          resolve(response);
        };
        
        xhr.onerror = function() {
          reject(new Error('Network Error'));
        };
        
        xhr.send(options.body || null);
      });
    };
  }
  
  // ======================================
  // 4. URL API polyfill
  // ======================================
  
  if (!window.URL) {
    window.URL = function(url, base) {
      // تطبيق مبسط لـ URL constructor
      const link = document.createElement('a');
      link.href = base ? base + '/' + url : url;
      
      this.href = link.href;
      this.protocol = link.protocol;
      this.host = link.host;
      this.hostname = link.hostname;
      this.port = link.port;
      this.pathname = link.pathname;
      this.search = link.search;
      this.hash = link.hash;
      this.origin = link.protocol + '//' + link.host;
    };
  }
  
  // ======================================
  // 5. CSS Custom Properties polyfill للـ iOS القديم
  // ======================================
  
  if (isOldIOS || isOldSafari) {
    // إضافة دعم متغيرات CSS البسيط
    const cssVariables = {
      '--primary': '#6b21a8',
      '--secondary': '#f3f4f6',
      '--accent': '#10b981',
      '--background': '#ffffff',
      '--foreground': '#000000'
    };
    
    // تطبيق المتغيرات على document
    function applyCSSVariables() {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --primary: #6b21a8;
          --secondary: #f3f4f6;
          --accent: #10b981;
          --background: #ffffff;
          --foreground: #000000;
        }
        .primary { color: #6b21a8; }
        .bg-primary { background-color: #6b21a8; }
        .text-primary { color: #6b21a8; }
      `;
      document.head.appendChild(style);
    }
    
    // تطبيق المتغيرات عند تحميل DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyCSSVariables);
    } else {
      applyCSSVariables();
    }
  }
  
  // ======================================
  // 6. requestAnimationFrame polyfill
  // ======================================
  
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return setTimeout(callback, 1000 / 60);
    };
  }
  
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
  
  // ======================================
  // 7. IntersectionObserver polyfill
  // ======================================
  
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = function(callback, options) {
      this.callback = callback;
      this.options = options || {};
      this.elements = [];
    };
    
    window.IntersectionObserver.prototype.observe = function(element) {
      this.elements.push(element);
      // تطبيق مبسط - نعتبر العنصر visible دائماً
      setTimeout(() => {
        this.callback([{ target: element, isIntersecting: true }]);
      }, 100);
    };
    
    window.IntersectionObserver.prototype.unobserve = function(element) {
      const index = this.elements.indexOf(element);
      if (index > -1) {
        this.elements.splice(index, 1);
      }
    };
    
    window.IntersectionObserver.prototype.disconnect = function() {
      this.elements = [];
    };
  }
  
  // ======================================
  // 8. إصلاح مشاكل الـ Touch Events للـ iPad القديم
  // ======================================
  
  if (isOldIOS) {
    // إضافة دعم pointer events
    if (!window.PointerEvent) {
      document.addEventListener('touchstart', function(e) {
        e.target.dispatchEvent(new Event('pointerdown'));
      });
      
      document.addEventListener('touchmove', function(e) {
        e.target.dispatchEvent(new Event('pointermove'));
      });
      
      document.addEventListener('touchend', function(e) {
        e.target.dispatchEvent(new Event('pointerup'));
      });
    }
    
    // إصلاح مشكلة 300ms delay في النقر
    let lastTouchTime = 0;
    document.addEventListener('touchend', function(e) {
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        e.preventDefault();
        e.target.click();
      }
      lastTouchTime = now;
    });
  }
  
  // ======================================
  // 9. إصلاح مشاكل الذاكرة للـ iPad القديم
  // ======================================
  
  if (isOldIOS) {
    // تنظيف الذاكرة دورياً
    setInterval(function() {
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
      }
    }, 30000); // كل 30 ثانية
    
    // إزالة event listeners غير المستخدمة
    window.addEventListener('beforeunload', function() {
      // تنظيف المتغيرات العالمية
      try {
        if (window.React && window.React._internalRoot) {
          // محاولة تنظيف React
          delete window.React._internalRoot;
        }
      } catch (e) {
        console.warn('تنظيف React فشل:', e);
      }
    });
  }
  
  // ======================================
  // 10. Node.js Globals للتوافق
  // ======================================
  
  // Buffer polyfill مبسط
  if (!window.Buffer) {
    window.Buffer = {
      from: function(data) {
        if (typeof data === 'string') {
          return { data: data, toString: function() { return data; } };
        }
        return { data: data };
      },
      isBuffer: function(obj) {
        return obj && obj.data !== undefined;
      }
    };
  }
  
  // Process polyfill
  if (!window.process) {
    window.process = {
      env: {},
      nextTick: function(callback) {
        setTimeout(callback, 0);
      },
      version: 'v16.0.0',
      platform: 'browser'
    };
  }
  
  // Global polyfill
  if (!window.global) {
    window.global = window;
  }
  
  // ======================================
  // 11. Module System polyfill
  // ======================================
  
  if (!window.module) {
    window.module = { exports: {} };
  }
  
  if (!window.exports) {
    window.exports = window.module.exports;
  }
  
  if (!window.require) {
    window.require = function(name) {
      console.warn('require() polyfill called for:', name);
      return {};
    };
  }
  
  // ======================================
  // إنهاء التحميل
  // ======================================
  
  console.log('✅ Legacy Polyfills تم تحميلها بنجاح!');
  
  // إشارة أن الـ polyfills جاهزة
  window.__LEGACY_POLYFILLS_LOADED__ = true;
  
  // إطلاق حدث مخصص
  try {
    const event = new Event('legacy-polyfills-loaded');
    window.dispatchEvent(event);
  } catch (e) {
    // للمتصفحات القديمة جداً
    const event = document.createEvent('Event');
    event.initEvent('legacy-polyfills-loaded', false, false);
    window.dispatchEvent(event);
  }
  
})(); 