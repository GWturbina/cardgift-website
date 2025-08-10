// ✅ CardGift Service Worker v2.0 - ИСПРАВЛЕННЫЙ
const CACHE_NAME = 'cardgift-v2.0.1';
const STATIC_CACHE = 'cardgift-static-v2';
const DYNAMIC_CACHE = 'cardgift-dynamic-v2';

// ✅ ПРАВИЛЬНЫЕ ПУТИ К ФАЙЛАМ
const urlsToCache = [
    '/',
    '/index.html',
    '/generator.html',
    '/registration.html',
    '/dashboard.html',
    '/js/wallet-state.js',
    '/api/ping',
    // Манифест и иконки
    '/manifest.json',
    '/favicon.ico',
    // Внешние CDN ресурсы (критичные)
    'https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js',
    'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js'
];

// ✅ ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ ДЛЯ КЕШИРОВАНИЯ
const optionalResources = [
    '/api/user-cards',
    '/api/card/',
    '/api/og-image'
];

// ✅ УСТАНОВКА SERVICE WORKER
self.addEventListener('install', function(event) {
    console.log('🚀 CardGift SW v2.0 installing...');
    
    event.waitUntil(
        Promise.all([
            // Кешируем основные файлы
            caches.open(STATIC_CACHE).then(function(cache) {
                console.log('📦 Caching static files');
                return cache.addAll(urlsToCache).catch(err => {
                    console.warn('⚠️ Some files failed to cache:', err);
                    // Не блокируем установку из-за недоступных файлов
                    return Promise.resolve();
                });
            }),
            
            // Принудительно активируем новый SW
            self.skipWaiting()
        ])
    );
});

// ✅ АКТИВАЦИЯ SERVICE WORKER
self.addEventListener('activate', function(event) {
    console.log('✅ CardGift SW v2.0 activated');
    
    event.waitUntil(
        Promise.all([
            // Очищаем старые кеши
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Сразу контролируем все вкладки
            self.clients.claim()
        ])
    );
});

// ✅ УМНАЯ ОБРАБОТКА ЗАПРОСОВ
self.addEventListener('fetch', function(event) {
    const request = event.request;
    const url = new URL(request.url);
    
    // ✅ СТРАТЕГИЯ КЕШИРОВАНИЯ ПО ТИПУ ЗАПРОСА
    
    // 1. HTML страницы - Network First (всегда свежие)
    if (request.destination === 'document') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // 2. API запросы - Network First с fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithFallback(request));
        return;
    }
    
    // 3. JavaScript файлы - Cache First
    if (request.destination === 'script') {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }
    
    // 4. Изображения и статика - Cache First
    if (request.destination === 'image' || 
        request.destination === 'style' ||
        request.destination === 'font') {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }
    
    // 5. Внешние CDN ресурсы - Cache First
    if (url.origin !== self.location.origin) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }
    
    // 6. Остальное - Network First
    event.respondWith(networkFirstStrategy(request));
});

// ✅ СТРАТЕГИЯ: NETWORK FIRST (свежие данные приоритет)
async function networkFirstStrategy(request) {
    try {
        // Пытаемся загрузить из сети
        const networkResponse = await fetch(request);
        
        // Если успешно - кешируем и возвращаем
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        console.log('🌐 Network failed, trying cache for:', request.url);
        
        // Если сеть недоступна - берем из кеша
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Если и в кеше нет - возвращаем офлайн страницу
        if (request.destination === 'document') {
            return createOfflinePage();
        }
        
        throw error;
    }
}

// ✅ СТРАТЕГИЯ: CACHE FIRST (кеш приоритет)
async function cacheFirstStrategy(request) {
    // Сначала ищем в кеше
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Обновляем кеш в фоне (stale-while-revalidate)
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    // Если в кеше нет - загружаем из сети
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('📦 Cache miss and network failed for:', request.url);
        
        // Возвращаем fallback для изображений
        if (request.destination === 'image') {
            return createPlaceholderImage();
        }
        
        throw error;
    }
}

// ✅ СТРАТЕГИЯ: NETWORK FIRST С FALLBACK ДЛЯ API
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request, {
            // Короткий таймаут для API
            signal: AbortSignal.timeout(5000)
        });
        
        if (networkResponse.ok) {
            // Кешируем только GET запросы
            if (request.method === 'GET') {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }
        
        throw new Error('API response not ok');
        
    } catch (error) {
        console.log('🔌 API failed, trying cache for:', request.url);
        
        // Возвращаем кешированный ответ если есть
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Возвращаем mock ответ для критичных API
        return createMockApiResponse(request);
    }
}

// ✅ ФОНОВОЕ ОБНОВЛЕНИЕ КЕША
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, networkResponse);
            console.log('🔄 Background cache updated for:', request.url);
        }
    } catch (error) {
        console.log('🔄 Background update failed for:', request.url);
    }
}

// ✅ СОЗДАНИЕ ОФЛАЙН СТРАНИЦЫ
function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CardGift - Offline</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #0a0a0a, #1a1a1a);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .offline-container {
                    background: rgba(255,255,255,0.1);
                    border: 2px solid #FFD700;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 500px;
                }
                .offline-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                .offline-title {
                    color: #FFD700;
                    font-size: 24px;
                    margin-bottom: 15px;
                }
                .offline-message {
                    color: #CCC;
                    margin-bottom: 25px;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: linear-gradient(45deg, #FFD700, #FFA500);
                    color: #000;
                    border: none;
                    border-radius: 12px;
                    padding: 15px 30px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1 class="offline-title">You're Offline</h1>
                <p class="offline-message">
                    Don't worry! CardGift works offline too. 
                    Some features may be limited until you reconnect.
                </p>
                <button class="retry-btn" onclick="window.location.reload()">
                    🔄 Try Again
                </button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// ✅ СОЗДАНИЕ PLACEHOLDER ИЗОБРАЖЕНИЯ
function createPlaceholderImage() {
    const svg = `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="200" fill="#333"/>
            <text x="150" y="100" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">
                🖼️ Image Offline
            </text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml' }
    });
}

// ✅ СОЗДАНИЕ MOCK API ОТВЕТА
function createMockApiResponse(request) {
    const url = new URL(request.url);
    
    // Mock ответы для разных API
    const mockResponses = {
        '/api/user-cards': {
            success: true,
            cards: [],
            message: 'Offline mode - no cards available'
        },
        '/api/ping': {
            status: 'offline',
            timestamp: Date.now()
        }
    };
    
    const mockData = mockResponses[url.pathname] || {
        error: 'Service temporarily unavailable',
        offline: true
    };
    
    return new Response(JSON.stringify(mockData), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
    });
}

// ✅ PUSH УВЕДОМЛЕНИЯ (если поддерживаются)
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'CardGift notification',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: 'cardgift-notification',
        data: data.url || '/',
        actions: [
            {
                action: 'open',
                title: 'Open CardGift'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'CardGift', options)
    );
});

// ✅ ОБРАБОТКА КЛИКОВ ПО УВЕДОМЛЕНИЯМ
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

// ✅ ОБРАБОТКА СООБЩЕНИЙ ОТ КЛИЕНТА
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            timestamp: Date.now()
        });
    }
});

// ✅ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ (если поддерживается)
self.addEventListener('sync', function(event) {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Здесь можно добавить логику синхронизации данных
            console.log('🔄 Background sync triggered')
        );
    }
});

console.log('✅ CardGift Service Worker v2.0 loaded successfully');
