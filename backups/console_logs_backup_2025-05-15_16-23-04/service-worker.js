// Nombre del caché para la aplicación
const CACHE_NAME = 'bazaar-console-v1';

// Recursos que queremos cachear para uso offline
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/index.css',
  '/assets/index.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Almacenando en caché archivos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  // Eliminar cachés antiguas
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceptar solicitudes de red
self.addEventListener('fetch', event => {
  // Ignorar solicitudes a API o que no sean GET
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return;
  }

  // Estrategia: intentar red primero, caer en caché si falla
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar la respuesta para almacenarla en caché
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Si la red falla, intentar servir desde caché
        return caches.match(event.request)
          .then(cachedResponse => {
            // Si hay una versión en caché, devolverla
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no hay versión en caché y es una navegación, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Para recursos no disponibles, retornar un response vacío
            return new Response(null, { status: 404 });
          });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en segundo plano cuando se recupera la conexión
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Función para sincronizar datos
async function syncData() {
  console.log('[Service Worker] Sincronizando datos...');
  // Aquí se podría implementar la lógica de sincronización
  // utilizando IndexedDB o el cliente para acceder a la base de datos local

  // Notificar a los clientes que la sincronización está completa
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETED'
    });
  });
}

// Registro para notificaciones push
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Acción al hacer clic en una notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
}); 