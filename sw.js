// CardGift Service Worker
const CACHE_NAME = 'cardgift-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/generator.html',
    '/registration.html',
    '/css/style.css',
    '/js/wallet.js',
    '/js/api.js',
    // Добавьте все ваши HTML файлы
];

// Установка SW и кеширование файлов
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Кеширование файлов CardGift');
                return cache.addAll(urlsToCache);
            })
    );
});

// Перехват запросов и работа офлайн
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Возвращаем из кеша или загружаем из сети
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Обновление кеша
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаление старого кеша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});