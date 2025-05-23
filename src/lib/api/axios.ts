import axios from 'axios';
import * as Sentry from '@sentry/react';
import { getCurrentHub } from '@sentry/hub';

// إنشاء نسخة من Axios
const api = axios.create({
  baseURL: process.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة معترض للطلبات
api.interceptors.request.use(
  (config) => {
    // إضافة معرف التتبع لـ Sentry
    const trace = getCurrentHub()?.getScope()?.getTransaction();
    if (trace) {
      config.headers['sentry-trace'] = trace.toTraceparent();
    }
    return config;
  },
  (error) => {
    Sentry.captureException(error, {
      tags: {
        type: 'api_request_error',
      },
    });
    return Promise.reject(error);
  }
);

// إضافة معترض للاستجابات
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // الخطأ له استجابة من الخادم
      Sentry.captureException(error, {
        tags: {
          type: 'api_response_error',
          status: error.response.status,
        },
        extra: {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          response: error.response.data,
        },
      });
    } else if (error.request) {
      // الطلب تم إرساله لكن لم يتم استلام استجابة
      Sentry.captureException(error, {
        tags: {
          type: 'api_network_error',
        },
        extra: {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
        },
      });
    } else {
      // حدث خطأ أثناء إعداد الطلب
      Sentry.captureException(error, {
        tags: {
          type: 'api_setup_error',
        },
      });
    }
    return Promise.reject(error);
  }
);

export default api; 