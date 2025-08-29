import axios from 'axios';

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
    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// إضافة معترض للاستجابات
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      if (error.response) {
        // الخطأ له استجابة من الخادم
        console.error('API Response Error:', {
          status: error.response.status,
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          response: error.response.data,
        });
      } else if (error.request) {
        // الطلب تم إرساله لكن لم يتم استلام استجابة
        console.error('API Network Error:', {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
        });
      } else {
        // حدث خطأ أثناء إعداد الطلب
        console.error('API Setup Error:', error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;