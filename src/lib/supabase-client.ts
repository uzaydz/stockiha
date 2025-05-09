import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// صلاحيات URL وAPI مأخوذة من متغيرات البيئة
// Read from environment variables with fallback values to prevent errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

console.log('إنشاء عميل Supabase...');
console.log('URL:', supabaseUrl);
console.log('ANON_KEY length:', supabaseAnonKey.length, 'characters');

// Our own custom fetch with real timeout
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> => {
  console.log(`Fetch request to: ${url.substring(0, 50)}...`);
  
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout that will abort the request
  const timeoutId = setTimeout(() => {
    console.error(`Fetch request timed out after ${timeout}ms to ${url.substring(0, 50)}...`);
    controller.abort();
  }, timeout);
  
  // Add the signal to the options
  const fetchOptions = {
    ...options,
    signal
  };
  
  // Start the fetch
  return fetch(url, fetchOptions)
    .then(response => {
      clearTimeout(timeoutId);
      console.log(`Fetch response received from: ${url.substring(0, 50)}...`);
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error(`Fetch aborted: ${url.substring(0, 50)}...`);
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      console.error(`Fetch error: ${error.message}`);
      throw error;
    });
};

// Configure with increased timeout for network requests
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'bazaar-supabase-auth-v2'
  },
  global: {
    headers: {
      'X-Client-Info': 'bazaar-console-connect'
    }
  },
  // Use our custom fetch with timeout
  fetch: fetchWithTimeout
};

// تهيئة عميل Supabase
let supabaseClient;
try {
  console.log('Creating Supabase client with options:', JSON.stringify(supabaseOptions, null, 2));
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, supabaseOptions);
  console.log('تم إنشاء عميل Supabase بنجاح');
  
  // Verify connection by making a simple query
  supabaseClient.from('products').select('count', { count: 'exact', head: true }).then(({ count, error }) => {
    if (error) {
      console.error('Connection test failed:', error);
    } else {
      console.log('Connection test successful. Total products:', count);
    }
  });
} catch (error) {
  console.error('خطأ في إنشاء عميل Supabase:', error);
  // Create a fallback client to prevent app from crashing
  supabaseClient = createClient<Database>(
    'https://wrnssatuvmumsczyldth.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY',
    supabaseOptions
  );
}

// Export the client
export const supabase = supabaseClient;

// دالة للحصول على عميل Supabase لاستخدامه في أي مكان
export const getSupabaseClient = () => {
  return supabase;
};