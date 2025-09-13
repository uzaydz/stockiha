import axios from 'axios';

// إنشاء نسخة من Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
      } else if (error.request) {
        // الطلب تم إرساله لكن لم يتم استلام استجابة
      } else {
        // حدث خطأ أثناء إعداد الطلب
      }
    }
    return Promise.reject(error);
  }
);

export default api;
